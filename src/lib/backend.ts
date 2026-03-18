import type { Model } from "./proto/Model";
import type { OptionalModelPatch } from "./proto/OptionalModelPatch";
import type { Packages } from "./proto/Packages";

function send(socket: WebSocket, pkg: Packages) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(pkg));
  } else {
    socket.addEventListener("open", () => {
      socket.send(JSON.stringify(pkg));
    }, { once: true });
  }
}

export function create_game(socket: WebSocket) {
  send(socket, { CreateNewGame: {} as Record<symbol, never> });
}

export function join_game(socket: WebSocket, username: string, code: number) {
  send(socket, { LoginUser: { username, code } });
}

export function start_game(socket: WebSocket, admin_uuid: string, code: number) {
  send(socket, { StartGame: { admin: admin_uuid, code } });
}

export function update_value(socket: WebSocket, patch: OptionalModelPatch, code: number, uuid: string) {
  send(socket, { UpdateValue: { patch, code, uuid } });
}

export function submit_scouter(socket: WebSocket, model: Model, defence: number, comment: string, code: number, uuid: string) {
  send(socket, { SubmitScouter: { data: model, defence, comment, game_id: code, user_uuid: uuid } });
}