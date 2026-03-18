<script lang="ts">
  import type { ClimbState } from './lib/proto/ClimbState';
  import type { Model } from './lib/proto/Model';
  import type { OptionalModelPatch } from './lib/proto/OptionalModelPatch';
  import type { Stations } from './lib/proto/Stations';

  type UserModel = {
    username: string;
    station: Stations;
    defence_main: boolean;
    fuel_shoot_teleop: number;
    fuel_pass_teleop: number;
    fuel_shoot_auto: number;
    fuel_pass_auto: number;
    climb_end: ClimbState;
    climb_auto: ClimbState;
    beach_on_bump: boolean;
    defence: number;
    comment: string;
    submitted: boolean;
  };

  type AdminAPI = {
    addUser: (uuid: string, username: string, station: Stations) => void;
    applyPatch: (uuid: string, patch: OptionalModelPatch) => void;
    submitUser: (uuid: string, model: Model, defence: number, comment: string) => void;
  };

  let { ref = $bindable(null) }: { ref?: AdminAPI | null } = $props();

  let users: Map<string, UserModel> = $state(new Map());

  function addUser(uuid: string, username: string, station: Stations) {
    users.set(uuid, {
      username,
      station,
      defence_main: false,
      fuel_shoot_teleop: 0,
      fuel_pass_teleop: 0,
      fuel_shoot_auto: 0,
      fuel_pass_auto: 0,
      climb_end: "Nothing",
      climb_auto: "Nothing",
      beach_on_bump: false,
      defence: 0,
      comment: "",
      submitted: false,
    });
    users = new Map(users);
  }

  function applyPatch(uuid: string, patch: OptionalModelPatch) {
    const user = users.get(uuid);
    if (!user || user.submitted) return;

    if ("Defence" in patch) {
      user.defence = patch.Defence;
    } else if ("Comment" in patch) {
      user.comment = patch.Comment;
    } else if ("Game" in patch) {
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

  function submitUser(uuid: string, model: Model, defence: number, comment: string) {
    const user = users.get(uuid);
    if (!user) return;

    user.defence_main = model.defence_main;
    user.fuel_shoot_teleop = model.fuel_shoot_teleop;
    user.fuel_pass_teleop = model.fuel_pass_teleop;
    user.fuel_shoot_auto = model.fuel_shoot_auto;
    user.fuel_pass_auto = model.fuel_pass_auto;
    user.climb_end = model.climb_end;
    user.climb_auto = model.climb_auto;
    user.beach_on_bump = model.beach_on_bump;
    user.defence = defence;
    user.comment = comment;
    user.submitted = true;

    users = new Map(users);
  }

  // Expose API to parent via ref prop
  $effect(() => {
    ref = { addUser, applyPatch, submitUser };
    return () => { ref = null; };
  });
</script>

<table>
  <thead>
    <tr>
      <th>Username</th>
      <th>Station</th>
      <th>Defence Main</th>
      <th>Fuel Shoot Teleop</th>
      <th>Fuel Pass Teleop</th>
      <th>Fuel Shoot Auto</th>
      <th>Fuel Pass Auto</th>
      <th>Climb End</th>
      <th>Climb Auto</th>
      <th>Beach on Bump</th>
      <th>Defence</th>
      <th>Comment</th>
      <th>Submitted</th>
    </tr>
  </thead>
  <tbody>
    {#each [...users.entries()] as [uuid, user]}
      <tr>
        <td>{user.username}</td>
        <td>{user.station}</td>
        <td>{user.defence_main}</td>
        <td>{user.fuel_shoot_teleop}</td>
        <td>{user.fuel_pass_teleop}</td>
        <td>{user.fuel_shoot_auto}</td>
        <td>{user.fuel_pass_auto}</td>
        <td>{user.climb_end}</td>
        <td>{user.climb_auto}</td>
        <td>{user.beach_on_bump}</td>
        <td>{user.defence}</td>
        <td>{user.comment}</td>
        <td>{user.submitted}</td>
      </tr>
    {/each}
  </tbody>
</table>