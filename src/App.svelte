<script lang="ts">
  import type { ClimbState } from './lib/proto/ClimbState';
  import type { Packages } from './lib/proto/Packages';
  import type { Patch } from './lib/proto/Patch';
  import { create_game, join_game, start_game, submit_scouter, update_value } from './lib/backend';
  import type { OptionalModelPatch } from './lib/proto/OptionalModelPatch';
  import type { UserModel } from './lib/types';
  import type { Model } from './lib/proto/Model';
  import type { Stations } from './lib/proto/Stations';
  enum AppState { Wait, Waiting, User, AdminView, GameOver }
  enum FormState { Auto, Teleop, Endgame }
  let form_state = $state(FormState.Auto);

  function fuel_add(field: 'shoot_auto' | 'pass_auto' | 'shoot_teleop' | 'pass_teleop', amount: number) {
    if (field === 'shoot_auto')   fuel_shoot_auto   = Math.max(0, fuel_shoot_auto   + amount);
    if (field === 'pass_auto')    fuel_pass_auto    = Math.max(0, fuel_pass_auto    + amount);
    if (field === 'shoot_teleop') fuel_shoot_teleop = Math.max(0, fuel_shoot_teleop + amount);
    if (field === 'pass_teleop')  fuel_pass_teleop  = Math.max(0, fuel_pass_teleop  + amount);
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
  let users: Map<string, UserModel> = $state(new Map());
  let game_ended: boolean = $state(false);
  let username: string = $state("");

  const socket = new WebSocket("wss://sophia-subnotochordal-psychologically.ngrok-free.dev");
  socket.addEventListener("message", (event) => {
    console.log(event);
    const data = JSON.parse(event.data) as Packages;
    console.log(data);

    if (data === "Nop") {
    } else if ("CreateNewGame" in data) {
    } else if ("CreateNewGameReturn" in data) {
      const pkg = data.CreateNewGameReturn;
      uuid = pkg.admin;
      is_user = false;
      code = pkg.code;
      state_app = AppState.AdminView;
    } else if ("LoginUser" in data) {
    } else if ("LoginUserReturn" in data) {
      const pkg = data.LoginUserReturn;
      station = pkg.station;
      uuid = pkg.uuid;
      is_user = true;
      state_app = AppState.Waiting;
    } else if ("LoginUserUpdateAdmin" in data) {
      const pkg = data.LoginUserUpdateAdmin;
      users.set(pkg.uuid, {
        username: pkg.username, station: pkg.station,
        defence_main: false, fuel_shoot_teleop: 0, fuel_pass_teleop: 0,
        fuel_shoot_auto: 0, fuel_pass_auto: 0,
        climb_end: "Nothing", climb_auto: "Nothing",
        beach_on_bump: false, defence: 0, comment: "", submitted: false,
      });
      users = new Map(users);
    } else if ("StartGame" in data) {
    } else if ("StartGameReturn" in data) {
    } else if ("UpdateValue" in data) {
    } else if ("UpdateInformAdmin" in data) {
      const pkg = data.UpdateInformAdmin;
      const user = users.get(pkg.uuid);
      if (user && !user.submitted) {
        const patch = pkg.patch;
        if ("Defence" in patch)       user.defence = patch.Defence;
        else if ("Comment" in patch)  user.comment = patch.Comment;
        else if ("Game" in patch) {
          const p = patch.Game;
          if ("DefenceMain" in p)          user.defence_main = p.DefenceMain;
          else if ("FuelShootTeleop" in p) user.fuel_shoot_teleop = p.FuelShootTeleop;
          else if ("FuelPassTeleop" in p)  user.fuel_pass_teleop = p.FuelPassTeleop;
          else if ("FuelShootAuto" in p)   user.fuel_shoot_auto = p.FuelShootAuto;
          else if ("FuelPassAuto" in p)    user.fuel_pass_auto = p.FuelPassAuto;
          else if ("ClimbEnd" in p)        user.climb_end = p.ClimbEnd;
          else if ("ClimbAuto" in p)       user.climb_auto = p.ClimbAuto;
          else if ("BeachOnBump" in p)     user.beach_on_bump = p.BeachOnBump;
        }
        users = new Map(users);
      }
    } else if ("SubmitScouter" in data) {
    } else if ("ReturnForAdmin" in data) {
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
        user.defence = pkg.defence;
        user.comment = pkg.comment;
        user.submitted = true;
        users = new Map(users);
      }
    } else if ("InformGameEnd" in data) {
      if (is_user) state_app = AppState.GameOver;
      else game_ended = true;
    } else if ("InformGameSend" in data) {
      if (is_user) state_app = AppState.User;
    } else if ("Error" in data) {
    }
  });

  let initialized = false;

  $effect(() => {
    const _ = [defence_main, fuel_shoot_teleop, fuel_pass_teleop,
                fuel_shoot_auto, fuel_pass_auto, climb_end,
                beach_on_bump, defence, comment];
    if (!initialized) { initialized = true; return; }
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
    const final_model: Model = {
      defence_main, fuel_shoot_teleop, fuel_pass_teleop,
      fuel_shoot_auto, fuel_pass_auto, climb_end, climb_auto, beach_on_bump
    };
    if (typeof code == 'number' && typeof uuid == 'string')
      submit_scouter(socket, final_model, defence, comment, code, uuid);
  }

  function join() {
    if (typeof code == 'number') join_game(socket, username, code);
  }

  function create() {
    create_game(socket);
  }

  function startGame() {
    if (typeof code === 'number' && typeof uuid === 'string')
      start_game(socket, uuid, code);
  }
</script>


{#if state_app == AppState.Wait}
  <p>Username:</p>
  <input bind:value={username}>
  <p>Code:</p>
  <input type="number" bind:value={code}>
  <br>
  <br>
  <button onclick={join}>Join</button>
  <button onclick={create}>Create</button>

{:else if state_app == AppState.GameOver}
  <div class="waiting">
    <p class="waiting-station">Done!</p>
    <p class="waiting-label">Your data has been submitted. Thanks for scouting.</p>
  </div>

{:else if state_app == AppState.Waiting}
  <div class="waiting">
    <p class="waiting-station" class:red={station.startsWith('Red')} class:blue={station.startsWith('Blue')}>{station}</p>
    <p class="waiting-label">Waiting for the admin to start the game...</p>
  </div>

{:else if state_app == AppState.User}
  {#if form_state === FormState.Auto}
    <h1>Auto</h1>
    <h2>Shoot</h2>
    <div class="fuel-grid">
      <button type="button" onclick={() => fuel_add('shoot_auto', 10)}>+10</button><div></div><button type="button" onclick={() => fuel_add('shoot_auto', -10)}>-10</button>
      <button type="button" onclick={() => fuel_add('shoot_auto', 5)}>+5</button><div class="fuel-display">{fuel_shoot_auto}</div><button type="button" onclick={() => fuel_add('shoot_auto', -5)}>-5</button>
      <button type="button" onclick={() => fuel_add('shoot_auto', 1)}>+1</button><div></div><button type="button" onclick={() => fuel_add('shoot_auto', -1)}>-1</button>
    </div>
    <h2>Pass</h2>
    <div class="fuel-grid">
      <button type="button" onclick={() => fuel_add('pass_auto', 10)}>+10</button><div></div><button type="button" onclick={() => fuel_add('pass_auto', -10)}>-10</button>
      <button type="button" onclick={() => fuel_add('pass_auto', 5)}>+5</button><div class="fuel-display">{fuel_pass_auto}</div><button type="button" onclick={() => fuel_add('pass_auto', -5)}>-5</button>
      <button type="button" onclick={() => fuel_add('pass_auto', 1)}>+1</button><div></div><button type="button" onclick={() => fuel_add('pass_auto', -1)}>-1</button>
    </div>
    <h2>Climb Auto</h2>
    <select bind:value={climb_auto}>
      <option value={'Nothing'}>Nothing</option>
      <option value={'Stage1'}>Stage 1</option>
      <option value={'Stage2'}>Stage 2</option>
      <option value={'Stage3'}>Stage 3</option>
    </select>
    <br><button type="button" onclick={() => form_state = FormState.Teleop}>Next →</button>

  {:else if form_state === FormState.Teleop}
    <h1>Teleop</h1>
    <h2>Shoot</h2>
    <div class="fuel-grid">
      <button type="button" onclick={() => fuel_add('shoot_teleop', 10)}>+10</button><div></div><button type="button" onclick={() => fuel_add('shoot_teleop', -10)}>-10</button>
      <button type="button" onclick={() => fuel_add('shoot_teleop', 5)}>+5</button><div class="fuel-display">{fuel_shoot_teleop}</div><button type="button" onclick={() => fuel_add('shoot_teleop', -5)}>-5</button>
      <button type="button" onclick={() => fuel_add('shoot_teleop', 1)}>+1</button><div></div><button type="button" onclick={() => fuel_add('shoot_teleop', -1)}>-1</button>
    </div>
    <h2>Pass</h2>
    <div class="fuel-grid">
      <button type="button" onclick={() => fuel_add('pass_teleop', 10)}>+10</button><div></div><button type="button" onclick={() => fuel_add('pass_teleop', -10)}>-10</button>
      <button type="button" onclick={() => fuel_add('pass_teleop', 5)}>+5</button><div class="fuel-display">{fuel_pass_teleop}</div><button type="button" onclick={() => fuel_add('pass_teleop', -5)}>-5</button>
      <button type="button" onclick={() => fuel_add('pass_teleop', 1)}>+1</button><div></div><button type="button" onclick={() => fuel_add('pass_teleop', -1)}>-1</button>
    </div>
    <br>
    <button type="button" onclick={() => form_state = FormState.Auto}>← Back</button>
    <button type="button" onclick={() => form_state = FormState.Endgame}>Next →</button>

  {:else}
    <h1>Endgame</h1>
    <h2>Climb</h2>
    <select bind:value={climb_end}>
      <option value={'Nothing'}>Nothing</option>
      <option value={'Stage1'}>Stage 1</option>
      <option value={'Stage2'}>Stage 2</option>
      <option value={'Stage3'}>Stage 3</option>
    </select>
    <h2>Defence</h2>
    Main: <button type="button" onclick={() => {
      defence_main = !defence_main;
      if (typeof code === 'number' && is_user && typeof uuid === 'string')
        update_value(socket, { Game: { DefenceMain: defence_main } }, code, uuid);
    }} class:active={defence_main}>
      {defence_main ? 'True' : 'False'}
    </button>
    Beach On Bump: <button type="button" onclick={() => {
      beach_on_bump = !beach_on_bump;
      if (typeof code === 'number' && is_user && typeof uuid === 'string')
        update_value(socket, { Game: { BeachOnBump: beach_on_bump } }, code, uuid);
    }} class:active={beach_on_bump}>
      {beach_on_bump ? 'True' : 'False'}
    </button>
    <div class="slider-wrap">
      <input type="range" min="0" max="5" step="1" bind:value={defence} />
      <div class="ticks">{#each Array(6) as _, i}<span>{i}</span>{/each}</div>
    </div>
    <h2>Comment</h2>
    <textarea bind:value={comment}></textarea>
    <br>
    <button type="button" onclick={() => form_state = FormState.Teleop}>← Back</button>
    <button type="button" onclick={submit}>Submit</button>
  {/if}

{:else if state_app == AppState.AdminView}
  <div class="admin-header">
    <span>Game Code: <strong>{code}</strong></span>
    {#if game_ended}
      <span class="game-ended">Game Over</span>
    {:else}
      <button onclick={startGame}>
        Start Game
      </button>
    {/if}
  </div>
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Username</th>
          <th>Station</th>
          <th>Def Main</th>
          <th>Shoot Teleop</th>
          <th>Pass Teleop</th>
          <th>Shoot Auto</th>
          <th>Pass Auto</th>
          <th>Climb End</th>
          <th>Climb Auto</th>
          <th>Beach/Bump</th>
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
            <td>{user.fuel_shoot_teleop}</td>
            <td>{user.fuel_pass_teleop}</td>
            <td>{user.fuel_shoot_auto}</td>
            <td>{user.fuel_pass_auto}</td>
            <td>{user.climb_end}</td>
            <td>{user.climb_auto}</td>
            <td>{user.beach_on_bump ? '✓' : '—'}</td>
            <td>{user.defence}</td>
            <td class="comment">{user.comment}</td>
            <td>{user.submitted ? '✅ Done' : '⏳ Scouting'}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}

<style>
  .fuel-grid {
    display: grid;
    grid-template-columns: 50px 50px 50px;
    gap: 5px;
    justify-content: center;
    margin-bottom: 0.5rem;
  }
  .fuel-grid button, .fuel-display {
    height: 50px;
    width: 50px;
    border-radius: 3%;
    background-color: darkslategrey;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .slider-wrap {
    width: 300px;
    max-width: 100%;
    margin: 1rem auto;
  }
  .slider-wrap input[type="range"] { width: 100%; }
  .ticks {
    display: flex;
    justify-content: space-between;
    font-size: 14px;
    padding-top: 5px;
  }
  .waiting {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    margin-top: 4rem;
  }
  .waiting-station {
    font-size: 2rem;
    font-weight: 700;
  }
  .waiting-station.red { color: #f87171; }
  .waiting-station.blue { color: #60a5fa; }
  .waiting-label {
    color: #888;
  }
  .admin-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
  }
  .game-ended {
    font-weight: 700;
    color: #f87171;
  }
  .table-wrap {
    overflow-x: auto;
    width: 100%;
  }
  table {
    border-collapse: collapse;
    width: 100%;
    font-size: 0.875rem;
    text-align: center;
  }
  th, td {
    border: 1px solid #444;
    padding: 0.4rem 0.6rem;
    white-space: nowrap;
  }
  th {
    background: #2a2a2a;
    font-weight: 600;
  }
  tr.submitted {
    opacity: 0.6;
  }
  .username {
    font-weight: 600;
    text-align: left;
  }
  .station.red {
    color: #f87171;
    font-weight: 700;
  }
  .station.blue {
    color: #60a5fa;
    font-weight: 700;
  }
  .comment {
    text-align: left;
    max-width: 180px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
