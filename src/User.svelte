<script lang="ts">
  import FuelWidget from "./lib/FuelWidget.svelte";
  import type { ClimbState } from "./lib/proto/ClimbState";
  import StateRating from "./lib/StateRating.svelte";

  enum States {
    Auto = 0,
    Teleop = 1,
    Endgame = 2,
  }

  let form_state = $state(States.Auto);

  let {
    defence_main = $bindable<boolean>(),
    fuel_shoot_teleop = $bindable<number>(),
    fuel_pass_teleop = $bindable<number>(),
    fuel_shoot_auto = $bindable<number>(),
    fuel_pass_auto = $bindable<number>(),
    climb_end = $bindable<ClimbState>(),
    climb_auto = $bindable<ClimbState>(),
    beach_on_bump = $bindable<boolean>(),
    defence = $bindable<number>(),
    comment = $bindable<string>(),
    onsubmit = () => {},
  } = $props();

  export function submit() {
    onsubmit();
  }
</script>

{#if form_state === States.Auto}
  <h1>Auto</h1>
  <h2>Shoot</h2>
  <FuelWidget bind:count={fuel_shoot_auto}></FuelWidget>
  <h2>Pass</h2>
  <FuelWidget bind:count={fuel_pass_auto}></FuelWidget>
  <h2>Climb Auto</h2>
  <select bind:value={climb_auto}>
    <option value={'Nothing'}>Nothing</option>
    <option value={'Stage1'}>Stage 1</option>
    <option value={'Stage2'}>Stage 2</option>
    <option value={'Stage3'}>Stage 3</option>
  </select>
  <button type="button" onclick={() => form_state = States.Teleop}>Next →</button>

{:else if form_state === States.Teleop}
  <h1>Teleop</h1>
  <h2>Shoot</h2>
  <FuelWidget bind:count={fuel_shoot_teleop}></FuelWidget>
  <h2>Pass</h2>
  <FuelWidget bind:count={fuel_pass_teleop}></FuelWidget>
  <button type="button" onclick={() => form_state = States.Auto}>← Back</button>
  <button type="button" onclick={() => form_state = States.Endgame}>Next →</button>

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
  Main: <button
    type="button"
    onclick={() => defence_main = !defence_main}
    class:active={defence_main}>
    {defence_main ? 'True' : 'False'}
  </button>
  Beach On Bump: <button
    type="button"
    onclick={() => beach_on_bump = !beach_on_bump}
    class:active={beach_on_bump}>
    {beach_on_bump ? 'True' : 'False'}
  </button>
  <StateRating bind:value={defence}></StateRating>
  <h2>Comment</h2>
  <textarea bind:value={comment}></textarea>
  <button type="button" onclick={() => form_state = States.Teleop}>← Back</button>
  <button type="button" onclick={submit}>Submit</button>
{/if}