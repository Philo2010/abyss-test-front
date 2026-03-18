<script lang="ts">
  import type { UserModel } from './lib/types';

  let { users }: { users: Map<string, UserModel> } = $props();
</script>

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

<style>
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
