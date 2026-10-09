<script lang="ts">
  import type { ClimbState } from './lib/proto/ClimbState';
  import type { DefenceTarget } from './lib/proto/DefenceTarget';
  import type { OptionalModelPatch } from './lib/proto/OptionalModelPatch';
  import { create_game, join_game, resume, start_game, submit_scouter, update_value } from './lib/backend';
  import { GameSocket, type ConnectionState } from './lib/net';
  import type { UserModel } from './lib/types';
  import type { Model } from './lib/proto/Model';
  import FuelWidget from './lib/FuelWidget.svelte';
  import AutoTime from './lib/AutoTime.svelte';
  import StarRating from './lib/StarRating.svelte';
  import { format_team, parse_team } from './lib/team';

  enum AppState { Wait, Waiting, User, AdminView, GameOver }

  const Steps = ['Auto', 'Teleop', 'Endgame'] as const;
  const ClimbOptions = ['Nothing', 'Stage1', 'Stage2', 'Stage3'] as const;

  let step = $state(0);
  let state_app = $state(AppState.Wait);
  let code: number | undefined = $state(undefined);
  let is_user: boolean = $state(false);
  let uuid: string | undefined = undefined;
  let username: string = $state('');

  // ── Scout form fields ───────────────────────────────────────────────────
  let fuel_shoot_teleop: number = $state(0);
  let fuel_pass_teleop: number = $state(0);
  let fuel_shoot_auto: number = $state(0);
  let fuel_pass_auto: number = $state(0);
  let climb_end: ClimbState = $state<ClimbState>('Nothing');
  let climb_auto: ClimbState = $state<ClimbState>('Nothing');
  let beach_on_bump: boolean = $state(false);
  let defence_main: boolean = $state(false);
  let defence_target: DefenceTarget | null = $state<DefenceTarget | null>(null);
  let auto_time: number = $state(0);
  let dead: boolean = $state(false);
  let dnf: boolean = $state(false);
  let defence: number = $state(0);
  let comment: string = $state('');

  // Which opposing bot the main defender targeted (falls back to a typed team).
  let target_mode = $state<'alliance' | 'bot'>('alliance');
  let target_team = $state('');

  let station: string = $state('—');
  let users: Map<string, UserModel> = $state(new Map());
  let game_ended: boolean = $state(false);
  let submitted: boolean = $state(false);

  const target_team_error = $derived.by(() => {
    if (!defence_main || target_mode !== 'bot') return null;
    const res = parse_team(target_team);
    return typeof res === 'string' ? res : null;
  });

  const target_missing = $derived(defence_main && target_mode === 'bot' && defence_target == null);
  const stop = $derived(comment.trim() === '' || target_missing);

  // ── Connection ──────────────────────────────────────────────────────────
  const SERVER_URL = 'wss://sophia-subnotochordal-psychologically.ngrok-free.dev';
  const SESSION_KEY = 'abyss.session';

  type Session = { uuid: string; code: number; is_admin: boolean; station: string | null };

  function load_session(): Session | null {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw) as Session;
      if (typeof s?.uuid === 'string' && typeof s?.code === 'number') return s;
    } catch { /* ignore malformed storage */ }
    return null;
  }

  function save_session(session: Session) {
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch { /* ignore */ }
  }

  function clear_session() {
    try { localStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
  }

  let conn_state: ConnectionState = $state('connecting');
  let resuming = false;

  const socket = new GameSocket(SERVER_URL);

  socket.onStateChange = (s) => { conn_state = s; };

  // After (re)connecting, re-attach to a saved session before any buffered
  // updates flush, so the server routes them under the right identity.
  socket.onOpen = () => {
    const session = load_session();
    if (session) {
      resuming = true;
      resume(socket, session.uuid);
    }
  };

  socket.onMessage = (data) => {
    if (data === 'Nop') {
    } else if ('CreateNewGame' in data) {
    } else if ('CreateNewGameReturn' in data) {
      const pkg = data.CreateNewGameReturn;
      uuid = pkg.admin;
      is_user = false;
      code = pkg.code;
      state_app = AppState.AdminView;
      save_session({ uuid: pkg.admin, code: pkg.code, is_admin: true, station: null });
    } else if ('LoginUser' in data) {
    } else if ('LoginUserReturn' in data) {
      const pkg = data.LoginUserReturn;
      station = pkg.station;
      uuid = pkg.uuid;
      is_user = true;
      state_app = AppState.Waiting;
      save_session({ uuid: pkg.uuid, code: code ?? 0, is_admin: false, station: pkg.station });
    } else if ('ResumeReturn' in data) {
      const pkg = data.ResumeReturn;
      resuming = false;
      uuid = pkg.uuid;
      code = pkg.code;
      is_user = !pkg.is_admin;
      if (pkg.is_admin) {
        state_app = AppState.AdminView;
        game_ended = pkg.ended;
        save_session({ uuid: pkg.uuid, code: pkg.code, is_admin: true, station: null });
      } else {
        if (pkg.station) station = pkg.station;
        // Stay on the done screen if we already submitted (e.g. after a drop).
        state_app =
          pkg.ended || submitted
            ? AppState.GameOver
            : pkg.started
              ? AppState.User
              : AppState.Waiting;
        save_session({ uuid: pkg.uuid, code: pkg.code, is_admin: false, station: pkg.station });
      }
    } else if ('LoginUserUpdateAdmin' in data) {
      const pkg = data.LoginUserUpdateAdmin;
      users.set(pkg.uuid, {
        username: pkg.username, station: pkg.station,
        defence_main: false, fuel_shoot_teleop: 0, fuel_pass_teleop: 0,
        fuel_shoot_auto: 0, fuel_pass_auto: 0,
        climb_end: 'Nothing', climb_auto: 'Nothing',
        beach_on_bump: false, defence_target: null, auto_time: 0, dead: false, dnf: false,
        defence: 0, comment: '', submitted: false,
      });
      users = new Map(users);
    } else if ('StartGame' in data) {
    } else if ('StartGameReturn' in data) {
    } else if ('UpdateValue' in data) {
    } else if ('UpdateInformAdmin' in data) {
      const pkg = data.UpdateInformAdmin;
      const user = users.get(pkg.uuid);
      if (user && !user.submitted) {
        const patch = pkg.patch;
        if ('Defence' in patch)       user.defence = patch.Defence;
        else if ('Comment' in patch)  user.comment = patch.Comment;
        else if ('Game' in patch) {
          const p = patch.Game;
          if ('DefenceMain' in p)          user.defence_main = p.DefenceMain;
          else if ('FuelShootTeleop' in p) user.fuel_shoot_teleop = p.FuelShootTeleop;
          else if ('FuelPassTeleop' in p)  user.fuel_pass_teleop = p.FuelPassTeleop;
          else if ('FuelShootAuto' in p)   user.fuel_shoot_auto = p.FuelShootAuto;
          else if ('FuelPassAuto' in p)    user.fuel_pass_auto = p.FuelPassAuto;
          else if ('ClimbEnd' in p)        user.climb_end = p.ClimbEnd;
          else if ('ClimbAuto' in p)       user.climb_auto = p.ClimbAuto;
          else if ('BeachOnBump' in p)     user.beach_on_bump = p.BeachOnBump;
          else if ('DefenceTarget' in p)   user.defence_target = p.DefenceTarget;
          else if ('AutoTime' in p)        user.auto_time = p.AutoTime;
          else if ('Dead' in p)            user.dead = p.Dead;
          else if ('Dnf' in p)             user.dnf = p.Dnf;
        }
        users = new Map(users);
      }
    } else if ('SubmitScouter' in data) {
    } else if ('ReturnForAdmin' in data) {
      const pkg = data.ReturnForAdmin;
      const user = users.get(pkg.user_uuid);
      if (user) {
        user.defence_main = pkg.data.defence_main;
        user.fuel_shoot_teleop = pkg.data.fuel_shoot_teleop;
        user.fuel_pass_teleop = pkg.data.fuel_pass_teleop;
        user.fuel_shoot_auto = pkg.data.fuel_shoot_auto;
        user.fuel_pass_auto = pkg.data.fuel_pass_auto;
        user.climb_end = pkg.data.climb_end;
        user.climb_auto = pkg.data.climb_auto;
        user.beach_on_bump = pkg.data.beach_on_bump;
        user.defence_target = pkg.data.defence_target;
        user.auto_time = pkg.data.auto_time;
        user.dead = pkg.data.dead;
        user.dnf = pkg.data.dnf;
        user.defence = pkg.defence;
        user.comment = pkg.comment;
        user.submitted = true;
        users = new Map(users);
      }
    } else if ('InformGameEnd' in data) {
      if (is_user) state_app = AppState.GameOver;
      else game_ended = true;
    } else if ('InformGameSend' in data) {
      if (is_user) state_app = AppState.User;
    } else if ('Error' in data) {
      if (resuming) {
        // The saved session no longer exists (game ended/cleared): start clean.
        resuming = false;
        clear_session();
        uuid = undefined;
        is_user = false;
        state_app = AppState.Wait;
      }
    }
  };

  // Nudge the socket back to life as soon as the device regains connectivity
  // or the tab becomes visible again (sleeping phones report neither).
  $effect(() => {
    const onOnline = () => socket.kick();
    const onVisible = () => { if (document.visibilityState === 'visible') socket.kick(); };
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisible);
    };
  });

  // ── Live sync ───────────────────────────────────────────────────────────
  // Keep the server's view of this scout in step with the form as it changes.
  function push(patch: OptionalModelPatch) {
    if (typeof code === 'number' && is_user && typeof uuid === 'string')
      update_value(socket, patch, code, uuid);
  }

  // Resolve the defence target from the alliance/bot selection.
  $effect(() => {
    if (!defence_main) { defence_target = null; return; }
    if (target_mode === 'alliance') { defence_target = 'Alliance'; return; }
    const res = parse_team(target_team);
    defence_target =
      typeof res === 'string' ? null : { Bot: { number: res.team_number, is_ab_team: res.is_ab_team } };
  });

  let initialized = false;
  $effect(() => {
    const _ = [fuel_shoot_teleop, fuel_pass_teleop, fuel_shoot_auto, fuel_pass_auto,
               climb_end, climb_auto, beach_on_bump, defence_main, defence_target,
               auto_time, dead, dnf, defence, comment];
    if (!initialized) { initialized = true; return; }
  });

  $effect(() => { const v = fuel_shoot_teleop; if (!initialized) return; push({ Game: { FuelShootTeleop: v } }); });
  $effect(() => { const v = fuel_pass_teleop;  if (!initialized) return; push({ Game: { FuelPassTeleop: v } }); });
  $effect(() => { const v = fuel_shoot_auto;   if (!initialized) return; push({ Game: { FuelShootAuto: v } }); });
  $effect(() => { const v = fuel_pass_auto;    if (!initialized) return; push({ Game: { FuelPassAuto: v } }); });
  $effect(() => { const v = climb_end;         if (!initialized) return; push({ Game: { ClimbEnd: v } }); });
  $effect(() => { const v = climb_auto;        if (!initialized) return; push({ Game: { ClimbAuto: v } }); });
  $effect(() => { const v = beach_on_bump;     if (!initialized) return; push({ Game: { BeachOnBump: v } }); });
  $effect(() => { const v = defence_main;      if (!initialized) return; push({ Game: { DefenceMain: v } }); });
  $effect(() => { const v = defence_target;    if (!initialized) return; push({ Game: { DefenceTarget: v } }); });
  $effect(() => { const v = auto_time;         if (!initialized) return; push({ Game: { AutoTime: v } }); });
  $effect(() => { const v = dead;              if (!initialized) return; push({ Game: { Dead: v } }); });
  $effect(() => { const v = dnf;               if (!initialized) return; push({ Game: { Dnf: v } }); });
  $effect(() => { const v = defence;           if (!initialized) return; push({ Defence: v }); });
  $effect(() => { const v = comment;           if (!initialized) return; push({ Comment: v }); });

  // ── Actions ─────────────────────────────────────────────────────────────
  function submit() {
    const final_model: Model = {
      defence_main, fuel_shoot_teleop, fuel_pass_teleop,
      fuel_shoot_auto, fuel_pass_auto, climb_end, climb_auto, beach_on_bump,
      defence_target, auto_time, dead, dnf,
    };
    if (typeof code === 'number' && typeof uuid === 'string') {
      submit_scouter(socket, final_model, defence, comment, code, uuid);
      // Confirm immediately, like the real app — the game itself may keep
      // running until the other scouts finish.
      submitted = true;
      state_app = AppState.GameOver;
    }
  }

  function join() {
    if (typeof code === 'number') {
      clear_session();
      join_game(socket, username, code);
    }
  }

  function create() {
    clear_session();
    create_game(socket);
  }

  function startGame() {
    if (typeof code === 'number' && typeof uuid === 'string')
      start_game(socket, uuid, code);
  }

  function targetLabel(target: DefenceTarget | null): string {
    if (target == null) return '—';
    if (target === 'Alliance') return 'Alliance';
    return `Bot ${format_team(target.Bot.number, target.Bot.is_ab_team)}`;
  }
</script>

{#if conn_state !== 'open'}
  <div
    class="conn-banner"
    class:pending={conn_state === 'connecting'}
    class:lost={conn_state === 'reconnecting'}
    class:down={conn_state === 'closed'}
  >
    {#if conn_state === 'connecting'}
      Connecting…
    {:else if conn_state === 'reconnecting'}
      Connection lost — reconnecting…
    {:else}
      Disconnected
    {/if}
  </div>
{/if}

{#if state_app == AppState.Wait}
  <div class="page">
    <header class="page-header">
      <div class="header-accent"></div>
      <h1>SCOUT</h1>
      <p class="subtitle">abyss angel — test</p>
    </header>

    <div class="form-body">
      <section class="field-section">
        <div class="section-label">Username</div>
        <input class="text-input" bind:value={username} placeholder="scout name" />
      </section>

      <section class="field-section">
        <div class="section-label">Game Code</div>
        <input class="text-input" type="number" bind:value={code} placeholder="0000" />
      </section>

      <div class="nav-bar">
        <button type="button" class="nav-btn back" onclick={create}>Create</button>
        <button type="button" class="nav-btn next" onclick={join}>Join</button>
      </div>
    </div>
  </div>

{:else if state_app == AppState.GameOver}
  <div class="done-screen">
    <div class="done-content">
      <div class="done-icon">✓</div>
      <div class="done-title">Submitted</div>
      <div class="done-team">{station}</div>
    </div>
  </div>

{:else if state_app == AppState.Waiting}
  <div class="page">
    <header class="page-header">
      <div class="header-accent"></div>
      <h1>READY</h1>
      <p class="subtitle">waiting for the admin</p>
    </header>

    <div class="waiting">
      <p class="waiting-station station" class:red={station.startsWith('Red')} class:blue={station.startsWith('Blue')}>
        {station}
      </p>
      <p class="waiting-label">Waiting for the admin to start the game…</p>
    </div>
  </div>

{:else if state_app == AppState.User}
  <div class="scout-shell">
    <!-- Header -->
    <header class="scout-header">
      <div class="team-chip">
        <span class="team-name">{username || station}</span>
      </div>
      <div class="step-dots">
        {#each Steps as s, i}
          <button
            type="button"
            class="dot"
            class:active={i === step}
            class:done={i < step}
            onclick={() => (step = i)}
            title={s}
          ></button>
        {/each}
      </div>
    </header>

    <!-- Step label -->
    <div class="step-label">
      <span class="step-name">{Steps[step]}</span>
      <span class="step-count">{step + 1} / {Steps.length}</span>
    </div>

    <form
      class="form-body"
      onsubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {#if step === 0}
        <!-- AUTO -->
        <section class="field-section">
          <div class="section-label">Shoot</div>
          <FuelWidget bind:count={fuel_shoot_auto} />
        </section>

        <section class="field-section">
          <div class="section-label">Pass</div>
          <FuelWidget bind:count={fuel_pass_auto} />
        </section>

        <section class="field-section">
          <div class="section-label">Climb</div>
          <div class="option-grid">
            {#each ClimbOptions as opt}
              <button
                type="button"
                class="option-btn"
                class:selected={climb_auto === opt}
                onclick={() => (climb_auto = opt)}
              >
                {opt === 'Nothing' ? '—' : opt.replace('Stage', 'Stage ')}
              </button>
            {/each}
          </div>
        </section>

        <section class="field-section">
          <div class="section-label">Auto Time</div>
          <AutoTime bind:current_time_in_seconds={auto_time} />
        </section>

      {:else if step === 1}
        <!-- TELEOP -->
        <section class="field-section">
          <div class="section-label">Shoot</div>
          <FuelWidget bind:count={fuel_shoot_teleop} />
        </section>

        <section class="field-section">
          <div class="section-label">Pass</div>
          <FuelWidget bind:count={fuel_pass_teleop} />
        </section>

      {:else}
        <!-- ENDGAME -->
        <section class="field-section">
          <div class="section-label">Climb</div>
          <div class="option-grid">
            {#each ClimbOptions as opt}
              <button
                type="button"
                class="option-btn"
                class:selected={climb_end === opt}
                onclick={() => (climb_end = opt)}
              >
                {opt === 'Nothing' ? '—' : opt.replace('Stage', 'Stage ')}
              </button>
            {/each}
          </div>
        </section>

        <section class="field-section">
          <div class="section-label">Status</div>
          <div class="toggle-row">
            <button type="button" class="toggle-btn" class:on={dead} onclick={() => (dead = !dead)}>
              <span class="toggle-indicator"></span>
              <span>Dead</span>
            </button>
            <button type="button" class="toggle-btn" class:on={dnf} onclick={() => (dnf = !dnf)}>
              <span class="toggle-indicator"></span>
              <span>DNF</span>
            </button>
          </div>
        </section>

        <section class="field-section">
          <div class="section-label">Defence</div>
          <div class="toggle-row">
            <button
              type="button"
              class="toggle-btn"
              class:on={defence_main}
              onclick={() => (defence_main = !defence_main)}
            >
              <span class="toggle-indicator"></span>
              <span>Main defender</span>
            </button>
            <button
              type="button"
              class="toggle-btn"
              class:on={beach_on_bump}
              onclick={() => (beach_on_bump = !beach_on_bump)}
            >
              <span class="toggle-indicator"></span>
              <span>Beach on bump</span>
            </button>
          </div>

          {#if defence_main}
            <div class="target-block">
              <div class="rating-label">Defended</div>
              <div class="option-grid two">
                <button
                  type="button"
                  class="option-btn"
                  class:selected={target_mode === 'alliance'}
                  onclick={() => (target_mode = 'alliance')}
                >Whole alliance</button>
                <button
                  type="button"
                  class="option-btn"
                  class:selected={target_mode === 'bot'}
                  onclick={() => (target_mode = 'bot')}
                >One bot</button>
              </div>
              {#if target_mode === 'bot'}
                <input
                  class="text-input"
                  bind:value={target_team}
                  placeholder="team defended (e.g. 696 or 696B)"
                />
                {#if target_team_error}
                  <span class="target-hint">{target_team_error}</span>
                {:else if target_missing}
                  <span class="target-hint">pick the bot you defended</span>
                {/if}
              {/if}
            </div>
          {/if}

          <div class="defence-rating">
            <div class="rating-label">Defence Rating (0–5)</div>
            <StarRating bind:value={defence} />
          </div>
        </section>

        <section class="field-section">
          <div class="section-label">Comment <span class="required">required</span></div>
          <textarea
            class="text-input"
            bind:value={comment}
            placeholder="Notes about this team…"
            rows="4"
          ></textarea>
        </section>

        <button type="submit" class="submit-btn" disabled={stop}>Submit</button>
      {/if}
    </form>

    <!-- Nav -->
    <div class="nav-bar">
      <button type="button" class="nav-btn back" onclick={() => step--} disabled={step === 0}>← Back</button>
      <button type="button" class="nav-btn next" onclick={() => step++} disabled={step >= 2}>Next →</button>
    </div>
  </div>

{:else if state_app == AppState.AdminView}
  <div class="page admin-page">
    <header class="admin-header">
      <span>Game Code: <strong>{code}</strong></span>
      {#if game_ended}
        <span class="game-ended">Game Over</span>
      {:else}
        <button type="button" class="nav-btn next" onclick={startGame}>Start Game</button>
      {/if}
    </header>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Username</th>
            <th>Station</th>
            <th>Def Main</th>
            <th>Def Target</th>
            <th>Shoot Tele</th>
            <th>Pass Tele</th>
            <th>Shoot Auto</th>
            <th>Pass Auto</th>
            <th>Climb End</th>
            <th>Climb Auto</th>
            <th>Beach/Bump</th>
            <th>Auto Time</th>
            <th>Dead</th>
            <th>DNF</th>
            <th>Defence</th>
            <th>Comment</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {#each [...users.entries()] as [, user]}
            <tr class:submitted={user.submitted}>
              <td class="username">{user.username}</td>
              <td class="station" class:red={user.station.startsWith('Red')} class:blue={user.station.startsWith('Blue')}>
                {user.station}
              </td>
              <td>{user.defence_main ? '✓' : '—'}</td>
              <td>{targetLabel(user.defence_target)}</td>
              <td>{user.fuel_shoot_teleop}</td>
              <td>{user.fuel_pass_teleop}</td>
              <td>{user.fuel_shoot_auto}</td>
              <td>{user.fuel_pass_auto}</td>
              <td>{user.climb_end}</td>
              <td>{user.climb_auto}</td>
              <td>{user.beach_on_bump ? '✓' : '—'}</td>
              <td>{user.auto_time}s</td>
              <td>{user.dead ? '✓' : '—'}</td>
              <td>{user.dnf ? '✓' : '—'}</td>
              <td>{user.defence}</td>
              <td class="comment">{user.comment}</td>
              <td>{user.submitted ? '✅ Done' : '⏳ Scouting'}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
{/if}

<style>
  /* ── Connection banner ───────────────── */
  .conn-banner {
    position: sticky;
    top: 0;
    z-index: 50;
    padding: 0.5rem 1rem;
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-align: center;
    background: #374151;
    color: #e5e7eb;
  }
  .conn-banner.lost { background: #7c2d12; color: #fed7aa; }
  .conn-banner.down { background: #7f1d1d; color: #fecaca; }

  /* ── Scout shell (matches the real scout page) ── */
  .scout-shell {
    display: flex;
    flex-direction: column;
    min-height: 100dvh;
    max-width: 480px;
    margin: 0 auto;
    padding: 0 0 1rem;
  }

  .scout-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.07);
    position: sticky;
    top: 0;
    background: #242424;
    z-index: 10;
  }

  .team-chip { display: flex; align-items: center; gap: 0.5rem; }
  .team-name { font-size: 1rem; font-weight: 700; color: #fff; }

  .step-dots { display: flex; gap: 8px; align-items: center; }

  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    border: none;
    cursor: pointer;
    padding: 0;
    background: rgba(255, 255, 255, 0.15);
    transition: background 0.2s, transform 0.15s;
  }
  .dot.done { background: rgba(60, 179, 113, 0.5); }
  .dot.active { background: #3cb371; transform: scale(1.3); }

  .step-label {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 0.9rem 1rem 0.4rem;
  }
  .step-name { font-size: 1.4rem; font-weight: 800; letter-spacing: 0.06em; color: #fff; }
  .step-count { font-size: 0.65rem; letter-spacing: 0.1em; color: rgba(255, 255, 255, 0.3); }

  .form-body {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    padding: 0.5rem 1rem 1rem;
  }

  .option-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
  .option-grid.two { grid-template-columns: repeat(2, 1fr); }

  .target-block { display: flex; flex-direction: column; gap: 0.4rem; margin-top: 0.75rem; }
  .target-hint { font-size: 0.7rem; color: rgba(255, 200, 90, 0.75); }

  .toggle-row { display: flex; flex-direction: column; gap: 8px; }
  .defence-rating { display: flex; flex-direction: column; gap: 0.4rem; margin-top: 0.5rem; }
  .rating-label { font-size: 0.7rem; color: rgba(255, 255, 255, 0.4); letter-spacing: 0.06em; }

  .required { font-size: 0.55rem; color: #e05555; letter-spacing: 0.08em; }

  textarea.text-input {
    line-height: 1.6;
    resize: vertical;
  }

  .submit-btn {
    padding: 0.9rem;
    border-radius: 10px;
    font-size: 0.9rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    background: rgba(60, 179, 113, 0.15);
    border: 1.5px solid rgba(60, 179, 113, 0.4);
    color: #5dde8a;
    cursor: pointer;
    touch-action: manipulation;
  }
  .submit-btn:hover:not(:disabled) { background: rgba(60, 179, 113, 0.25); }
  .submit-btn:disabled { opacity: 0.25; cursor: not-allowed; }

  .nav-bar {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    padding: 1rem 1rem 0;
    position: sticky;
    bottom: 0;
    background: #242424;
    border-top: 1px solid rgba(255, 255, 255, 0.07);
  }

  .nav-btn {
    padding: 0.9rem;
    border-radius: 10px;
    font-size: 0.9rem;
    font-weight: 700;
    font-family: inherit;
    letter-spacing: 0.05em;
    cursor: pointer;
    transition: all 0.12s;
    touch-action: manipulation;
    border: 1.5px solid rgba(255, 255, 255, 0.1);
  }
  .nav-btn:active:not(:disabled) { transform: scale(0.97); }
  .nav-btn:disabled { opacity: 0.25; cursor: not-allowed; }
  .back { background: #1a1a1a; color: rgba(255, 255, 255, 0.7); }
  .back:hover:not(:disabled) { background: #242424; }
  .next { background: rgba(60, 179, 113, 0.15); border-color: rgba(60, 179, 113, 0.4); color: #5dde8a; }
  .next:hover:not(:disabled) { background: rgba(60, 179, 113, 0.25); }

  /* ── Waiting ─────────────────────────── */
  .waiting {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    margin-top: 2rem;
  }
  .waiting-station { font-size: 2rem; font-weight: 700; }
  .waiting-label { color: rgba(255, 255, 255, 0.35); font-size: 0.8rem; letter-spacing: 0.08em; }

  /* ── Done screen ─────────────────────── */
  .done-screen {
    position: fixed;
    inset: 0;
    background: #242424;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    animation: fadeIn 0.25s ease both;
  }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .done-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    animation: popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s both;
  }
  @keyframes popIn { from { opacity: 0; transform: scale(0.85); } to { opacity: 1; transform: scale(1); } }
  .done-icon {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: rgba(60, 179, 113, 0.15);
    border: 2px solid rgba(60, 179, 113, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2.2rem;
    color: #3cb371;
  }
  .done-title { font-size: 1.5rem; font-weight: 800; letter-spacing: 0.08em; color: #fff; }
  .done-team { font-size: 0.8rem; letter-spacing: 0.12em; color: rgba(255, 255, 255, 0.4); }

  /* ── Admin ───────────────────────────── */
  .admin-page { max-width: 100%; }
  .admin-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
  }
  .game-ended { font-weight: 700; color: #e05555; letter-spacing: 0.08em; }
  .table-wrap { overflow-x: auto; width: 100%; }
  table { border-collapse: collapse; width: 100%; font-size: 0.8rem; text-align: center; }
  th, td { border: 1px solid rgba(255, 255, 255, 0.1); padding: 0.4rem 0.6rem; white-space: nowrap; }
  th {
    background: rgba(255, 255, 255, 0.04);
    font-weight: 600;
    letter-spacing: 0.06em;
  }
  tr.submitted { opacity: 0.5; }
  .username { font-weight: 600; text-align: left; }
  .comment { text-align: left; max-width: 180px; overflow: hidden; text-overflow: ellipsis; }
</style>
