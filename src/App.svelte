<script lang="ts">
  import svelteLogo from './assets/svelte.svg'
  import viteLogo from './assets/vite.svg'
  import heroImg from './assets/hero.png'
  import Counter from './lib/Counter.svelte'
  import type { ClimbState } from './lib/proto/ClimbState';
  import User from './User.svelte';
  import type { Packages } from './lib/proto/Packages';
  import type { Patch } from './lib/proto/Patch';
  import { create_game, join_game, start_game, submit_scouter, update_value } from './lib/backend';
  import type { OptionalModelPatch } from './lib/proto/OptionalModelPatch';
  import Admin from './Admin.svelte';
  import type { Model } from './lib/proto/Model';
  import type { Stations } from './lib/proto/Stations';
  enum AppState {
    Wait,
    User,
    AdminView
  }

    let state_app = $state(AppState.Wait);
    let code: number | undefined = $state(undefined);
    let is_user: boolean = $state(false);
    let uuid: string | undefined = undefined;
    let defence_main: boolean = $state<boolean>(false);
    let fuel_shoot_teleop: number = $state<number>(0);
    let fuel_pass_teleop: number = $state<number>(0);
    let fuel_shoot_auto: number = $state<number>(0);
    let fuel_pass_auto: number = $state<number>(0);
    let climb_end: ClimbState = $state<ClimbState>("Nothing");
    let climb_auto: ClimbState = $state<ClimbState>("Nothing");
    let beach_on_bump: boolean = $state<boolean>(false);
    let defence: number = $state<number>(0);
    let comment: string = $state<string>("");
    let station: string = "ERR: this is the times, i wonder if im worth the breath";
    let table: {
  addUser: (uuid: string, username: string, station: Stations) => void;
  applyPatch: (uuid: string, patch: OptionalModelPatch) => void;
  submitUser: (uuid: string, model: Model, defence: number, comment: string) => void;
} | null = $state(null);
    let game_ended: boolean = $state(false);
    let username: string = $state("");

    const socket = new WebSocket("ws://127.0.0.1:8001");


    socket.addEventListener("message", (event) => {
      console.log(event);
      const data = JSON.parse(event.data) as Packages;
      console.log(data);

      if (data === "Nop") {
        // Nop
      } else if ("CreateNewGame" in data) {
        const pkg = data.CreateNewGame;
        //Nop
      } else if ("CreateNewGameReturn" in data) {
        const pkg = data.CreateNewGameReturn;
        uuid = pkg.admin;
        is_user = false;
        code = pkg.code;
        state_app = AppState.AdminView;
      } else if ("LoginUser" in data) {
        //Nop
        const pkg = data.LoginUser;
      } else if ("LoginUserReturn" in data) {
        const pkg = data.LoginUserReturn;
        station = pkg.station;
        uuid = pkg.uuid;
        is_user = true;
        state_app = AppState.User;
      } else if ("LoginUserUpdateAdmin" in data) {
        const pkg = data.LoginUserUpdateAdmin;
        table?.addUser(pkg.uuid, pkg.username, pkg.station);
      } else if ("StartGame" in data) {
        const pkg = data.StartGame;
        //! TODO make the send (no need to resv)
      } else if ("StartGameReturn" in data) {
        const pkg = data.StartGameReturn;
        //we ment to get this but we do nothing
      } else if ("UpdateValue" in data) {
        const pkg = data.UpdateValue;
        //we send
      } else if ("UpdateInformAdmin" in data) {
        const pkg = data.UpdateInformAdmin;
        table?.applyPatch(pkg.uuid, pkg.patch);
      } else if ("SubmitScouter" in data) {
        //We send
        const pkg = data.SubmitScouter;
      } else if ("ReturnForAdmin" in data) {
        const pkg = data.ReturnForAdmin;
        table?.submitUser(pkg.user_uuid, pkg.data, pkg.defence, pkg.comment);
      } else if ("InformGameEnd" in data) {
        const pkg = data.InformGameEnd;
        game_ended = true;
      } else if ("InformGameSend" in data) {
        const pkg = data.InformGameSend;
        //w
      } else if ("Error" in data) {
        const pkg = data.Error;
        //idc
      }
    });

    let initialized = false;

    $effect(() => {
      // Touch all reactive values to register dependencies before init
      const _ = [defence_main, fuel_shoot_teleop, fuel_pass_teleop, 
                  fuel_shoot_auto, fuel_pass_auto, climb_end, 
                  beach_on_bump, defence, comment];
      if (!initialized) { initialized = true; return; }
      // Never runs on first render
    });

    $effect(() => {
  fuel_shoot_teleop;
  if (!initialized) return;
  if (typeof code === 'number' && is_user && typeof uuid == 'string')
    update_value(socket, { Game: { FuelShootTeleop: fuel_shoot_teleop } }, code, uuid);
});

$effect(() => {
  fuel_pass_teleop;
  if (!initialized) return;
  if (typeof code === 'number' && is_user && typeof uuid == 'string')
    update_value(socket, { Game: { FuelPassTeleop: fuel_pass_teleop } }, code, uuid);
});

$effect(() => {
  defence_main;
  if (!initialized) return;
  if (typeof code === 'number' && is_user && typeof uuid == 'string')
    update_value(socket, { Game: { DefenceMain: defence_main } }, code, uuid);
});

$effect(() => {
  fuel_shoot_auto;
  if (!initialized) return;
  if (typeof code === 'number' && is_user && typeof uuid == 'string')
    update_value(socket, { Game: { FuelShootAuto: fuel_shoot_auto } }, code, uuid);
});

$effect(() => {
  fuel_pass_auto;
  if (!initialized) return;
  if (typeof code === 'number' && is_user && typeof uuid == 'string')
    update_value(socket, { Game: { FuelPassAuto: fuel_pass_auto } }, code, uuid);
});

$effect(() => {
  climb_end;
  if (!initialized) return;
  if (typeof code === 'number' && is_user && typeof uuid == 'string')
    update_value(socket, { Game: { ClimbEnd: climb_end } }, code, uuid);
});

$effect(() => {
  climb_auto;
  if (!initialized) return;
  if (typeof code === 'number' && is_user && typeof uuid == 'string')
    update_value(socket, { Game: { ClimbAuto: climb_auto } }, code, uuid);
});

$effect(() => {
  beach_on_bump;
  if (!initialized) return;
  if (typeof code === 'number' && is_user && typeof uuid == 'string')
    update_value(socket, { Game: { BeachOnBump: beach_on_bump } }, code, uuid);
});

$effect(() => {
  defence;
  if (!initialized) return;
  if (typeof code === 'number' && is_user && typeof uuid == 'string')
    update_value(socket, { Defence: defence }, code, uuid);
});

$effect(() => {
  comment;
  if (!initialized) return;
  if (typeof code === 'number' && is_user && typeof uuid == 'string')
    update_value(socket, { Comment: comment }, code, uuid);
});

function submit() {
  let final_model: Model = {
    defence_main: defence_main,
    fuel_shoot_teleop: fuel_shoot_teleop,
    fuel_pass_teleop: fuel_pass_teleop,
    fuel_shoot_auto: fuel_shoot_auto,
    fuel_pass_auto: fuel_pass_auto,
    climb_end: climb_end,
    climb_auto: climb_auto,
    beach_on_bump: beach_on_bump
  };

  if (typeof(code) == 'number' && typeof(uuid) == 'string') {
    submit_scouter(socket, final_model, defence, comment, code, uuid);
  }
}

function join() {
  if (typeof(code) == 'number') {
    join_game(socket, username, code);
  }
}

function create() {
  create_game(socket);
}

</script>


{#if state_app == AppState.Wait}
  <!--Main code for selecting a match-->
  <p>Username:</p>
  <input bind:value={username}>
  <p>Code:</p>
  <input type="number" bind:value={code}>
  <br>  
  <br>
  <button onclick={join}>Join</button>
  <button onclick={create}>Create</button>
{:else if state_app == AppState.User}
  <User
    bind:defence_main={defence_main}
    bind:fuel_shoot_teleop={fuel_shoot_teleop}
    bind:fuel_pass_teleop={fuel_pass_teleop}
    bind:fuel_shoot_auto={fuel_shoot_auto}
    bind:fuel_pass_auto={fuel_pass_auto}
    bind:climb_end={climb_end}
    bind:climb_auto={climb_auto}
    bind:beach_on_bump={beach_on_bump}
    bind:defence={defence}
    bind:comment={comment}
    onsubmit={submit}
  ></User>
{:else if state_app == AppState.AdminView}
  <div class="admin-header">
    <span>Game Code: <strong>{code}</strong></span>
    {#if game_ended}
      <span class="game-ended">Game Over</span>
    {:else}
      <button onclick={() => { if (typeof code === 'number' && typeof uuid === 'string') start_game(socket, uuid, code); }}>
        Start Game
      </button>
    {/if}
  </div>
  <Admin bind:ref={table}/>
{/if}
