import type { Model } from "./proto/Model";
import type { OptionalModelPatch } from "./proto/OptionalModelPatch";
import type { Packages } from "./proto/Packages";

export function create_game(socket: WebSocket) {
  const pkg: Packages = {
    CreateNewGame: {}
  };

  socket.send(JSON.stringify(pkg));
}

export function join_game(socket: WebSocket, username: string, code: number) {
    const pkg: Packages = {
        LoginUser: {
            username: username,
            code: code
        }
    };

    socket.send(JSON.stringify(pkg));
}

export function start_game(socket: WebSocket, admin_uuid: string, code: number) {
    const pkg: Packages = {
        StartGame: {
            admin: admin_uuid,
            code: code
        }
    }

    socket.send(JSON.stringify(pkg));
}

export function update_value(socket: WebSocket, patch: OptionalModelPatch, code: number, uuid: string) {
    const pkg: Packages = {
        UpdateValue: {
            patch: patch,
            code: code,
            uuid: uuid
        }
    };

    socket.send(JSON.stringify(pkg));
}

export function submit_scouter(socket: WebSocket, model: Model, defence: number, comment: string, code: number, uuid: string) {
    const pkg: Packages = {
        SubmitScouter: {
            data: model,
            defence: defence,
            comment: comment,
            game_id: code,
            user_uuid: uuid
        }
    };

    socket.send(JSON.stringify(pkg));
}

