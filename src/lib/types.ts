import type { ClimbState } from './proto/ClimbState';
import type { Stations } from './proto/Stations';

export type UserModel = {
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
