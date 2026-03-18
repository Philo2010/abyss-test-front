<script lang="ts">
  enum AppState {
    Wait,
    User,
    Admin
  }

  import svelteLogo from './assets/svelte.svg'
  import viteLogo from './assets/vite.svg'
  import heroImg from './assets/hero.png'
  import Counter from './lib/Counter.svelte'
  import type { ClimbState } from './lib/proto/ClimbState';
  import User from './User.svelte';
  import type { Packages } from './lib/proto/Packages';
  import type { Patch } from './lib/proto/Patch';
  import { update_value } from './lib/backend';
  import type { OptionalModelPatch } from './lib/proto/OptionalModelPatch';
  import Admin from './Admin.svelte';

    let state_app = AppState.Wait;
    let code: number | undefined = undefined;
    let is_user: boolean = false;
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
    let table: ReturnType<typeof Admin>;

    const socket = new WebSocket("ws://127.0.0.1:8001");


    socket.addEventListener("message", (event) => {
      const data = JSON.parse(event.data) as Packages;

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
        state_app = AppState.Admin;
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
        add
      } else if ("StartGame" in data) {
        const pkg = data.StartGame;
      } else if ("StartGameReturn" in data) {
        const pkg = data.StartGameReturn;
      } else if ("UpdateValue" in data) {
        const pkg = data.UpdateValue;
      } else if ("UpdateInformAdmin" in data) {
        const pkg = data.UpdateInformAdmin;
      } else if ("SubmitScouter" in data) {
        const pkg = data.SubmitScouter;
      } else if ("ReturnForAdmin" in data) {
        const pkg = data.ReturnForAdmin;
      } else if ("InformGameEnd" in data) {
        const pkg = data.InformGameEnd;
      } else if ("InformGameSend" in data) {
        const pkg = data.InformGameSend;
      } else if ("Error" in data) {
        const pkg = data.Error;
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
  fuel_pass_teleop;
  if (!initialized) return;
  if (typeof code === 'number' && is_user && typeof uuid == 'string')
    update_value(socket, { Game: { FuelPassTeleop: fuel_pass_teleop } }, code, uuid);
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

</script>


{#if state_app == AppState.Wait}
  <!--Main code for selecting a match-->
  <input type="number" bind:value={code}>
  <button>Join</button>
  <button>Create</button>
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
  ></User>
{:else}
  <Admin bind:this={table}></Admin>
{/if}
