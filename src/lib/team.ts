export type TeamData = {
  team_number: number;
  is_ab_team: boolean;
};

/**
 * Parse a team string like `696` or `696B` into a team number. Returns an error
 * message string when the input is not a valid team.
 */
export function parse_team(team_string: string): TeamData | string {
  let team_number: number;

  if (team_string.length === 0) {
    return 'Please return a vaild team!';
  }

  if (team_string.endsWith('B') || team_string.endsWith('b')) {
    let string_team = team_string.slice(0, -1);
    team_number = Number(string_team);
    if (isNaN(team_number)) {
      return 'Please input a vaild team!';
    }
    return { team_number, is_ab_team: true };
  } else {
    team_number = Number(team_string);
    if (isNaN(team_number)) {
      return 'Please input a vaild team!';
    }
    return { team_number, is_ab_team: false };
  }
}

export function format_team(team: number, is_ab_team: boolean): string {
  let addon = '';
  if (is_ab_team) addon += 'B';
  return String(team) + addon;
}
