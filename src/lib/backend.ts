import type { GameSocket } from "./net";
import type { Model } from "./proto/Model";
import type { OptionalModelPatch } from "./proto/OptionalModelPatch";
import type { Packages } from "./proto/Packages";

function send(socket: GameSocket, pkg: Packages) {
  socket.send(pkg);
}

/** Re-attach to the identity we had before the connection dropped. */
export function resume(socket: GameSocket, uuid: string) {
  send(socket, { Resume: { uuid } });
}

export function create_game(socket: GameSocket) {
  send(socket, { CreateNewGame: {} });
}

export function join_game(socket: GameSocket, username: string, code: number) {
  send(socket, { LoginUser: { username, code } });
}

export function start_game(socket: GameSocket, admin_uuid: string, code: number) {
  send(socket, { StartGame: { admin: admin_uuid, code } });
}

export function update_value(socket: GameSocket, patch: OptionalModelPatch, code: number, uuid: string) {
  send(socket, { UpdateValue: { patch, code, uuid } });
}

export function submit_scouter(socket: GameSocket, model: Model, defence: number, comment: string, code: number, uuid: string) {
  send(socket, { SubmitScouter: { data: model, defence, comment, game_id: code, user_uuid: uuid } });
}
