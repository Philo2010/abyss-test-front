import type { Packages } from './proto/Packages';

/**
 * A small resilience layer on top of the browser `WebSocket`.
 *
 * It transparently reconnects after a network drop, buffers outgoing messages
 * while offline, and keeps an application-level heartbeat so a half-open
 * connection (phone sleeping, Wi-Fi flap, ngrok tunnel reset) is detected and
 * torn down quickly instead of hanging forever.
 */

export type ConnectionState = 'connecting' | 'open' | 'reconnecting' | 'closed';

const BASE_RECONNECT_DELAY = 500;
const MAX_RECONNECT_DELAY = 15_000;
const HEARTBEAT_INTERVAL = 15_000;
const HEARTBEAT_TIMEOUT = 45_000;

/** Cap on buffered messages. Oldest are dropped; a resume re-syncs full state. */
const MAX_QUEUE = 200;

export class GameSocket {
  private url: string;
  private ws: WebSocket | null = null;
  private queue: string[] = [];
  private attempts = 0;
  private userClosed = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private lastSeen = 0;

  state: ConnectionState = 'connecting';

  /** Called for every decoded server message. */
  onMessage?: (pkg: Packages) => void;
  /** Called whenever the connection state changes. */
  onStateChange?: (state: ConnectionState) => void;
  /**
   * Called after each successful (re)connect, before buffered messages flush.
   * This is where the app should send a `Resume` handshake if it has a session.
   */
  onOpen?: () => void;

  constructor(url: string) {
    this.url = url;
    this.connect();
  }

  private setState(state: ConnectionState) {
    if (this.state === state) return;
    this.state = state;
    this.onStateChange?.(state);
  }

  private connect() {
    if (this.userClosed) return;

    // Drop any previous socket (e.g. one still handshaking after a `kick()`).
    if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
      try {
        this.ws.close();
      } catch {
        /* ignore */
      }
    }

    this.setState(this.attempts === 0 ? 'connecting' : 'reconnecting');

    let ws: WebSocket;
    try {
      ws = new WebSocket(this.url);
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.ws = ws;

    ws.addEventListener('open', () => {
      if (ws !== this.ws) return; // stale socket from a previous attempt
      this.attempts = 0;
      this.lastSeen = Date.now();
      this.setState('open');
      // Let the app re-establish its session before we flush buffered updates,
      // so the server has re-attached the socket to the right identity first.
      this.onOpen?.();
      this.flush();
      this.startHeartbeat();
    });

    ws.addEventListener('message', (event) => {
      if (ws !== this.ws) return;
      this.lastSeen = Date.now();
      let pkg: Packages;
      try {
        pkg = JSON.parse(event.data as string) as Packages;
      } catch {
        return;
      }
      this.onMessage?.(pkg);
    });

    ws.addEventListener('close', () => {
      if (ws !== this.ws) return;
      this.handleDisconnect();
    });
    ws.addEventListener('error', () => {
      // `close` fires right after `error`; nudge it along just in case.
      try {
        ws.close();
      } catch {
        /* ignore */
      }
    });
  }

  private handleDisconnect() {
    this.stopHeartbeat();
    if (this.userClosed) {
      this.setState('closed');
      return;
    }
    this.scheduleReconnect();
  }

  private scheduleReconnect() {
    if (this.userClosed || this.reconnectTimer) return;

    this.setState('reconnecting');

    // Exponential backoff with jitter so many clients don't reconnect in lockstep.
    const ceiling = Math.min(MAX_RECONNECT_DELAY, BASE_RECONNECT_DELAY * 2 ** this.attempts);
    const delay = ceiling / 2 + Math.random() * (ceiling / 2);
    this.attempts += 1;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  /** Force an immediate reconnect attempt (e.g. the browser came back online). */
  kick() {
    if (this.userClosed || this.isOpen()) return;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.attempts = 0;
    this.connect();
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (!this.isOpen()) return;
      if (Date.now() - this.lastSeen > HEARTBEAT_TIMEOUT) {
        // Nothing has arrived for too long: treat the socket as dead and
        // trigger a reconnect instead of waiting on the OS TCP timeout.
        try {
          this.ws?.close();
        } catch {
          /* ignore */
        }
        return;
      }
      this.send('Nop');
    }, HEARTBEAT_INTERVAL);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /** Send a package now if connected, otherwise buffer it for the next connect. */
  send(pkg: Packages) {
    const data = JSON.stringify(pkg);
    if (this.isOpen()) {
      try {
        this.ws!.send(data);
        return;
      } catch {
        /* fall through to buffering */
      }
    }
    if (this.queue.length >= MAX_QUEUE) this.queue.shift();
    this.queue.push(data);
    if (!this.userClosed && (!this.ws || this.ws.readyState === WebSocket.CLOSED)) {
      this.scheduleReconnect();
    }
  }

  private flush() {
    if (!this.isOpen()) return;
    const pending = this.queue;
    this.queue = [];
    for (let i = 0; i < pending.length; i++) {
      try {
        this.ws!.send(pending[i]);
      } catch {
        // Socket died mid-flush: keep the rest for the next attempt.
        this.queue = pending.slice(i);
        this.scheduleReconnect();
        return;
      }
    }
  }

  isOpen(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /** Permanently close the socket and stop reconnecting. */
  close() {
    this.userClosed = true;
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    try {
      this.ws?.close();
    } catch {
      /* ignore */
    }
    this.setState('closed');
  }
}
