import type { Role } from "@/db/schema";

export const ROLE_LABEL: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  LEAGUE_ADMIN: "League Administrator",
  COMPETITION_MANAGER: "Competition Manager",
  TEAM_MANAGER: "Team Manager",
  REFEREE: "Referee",
  PLAYER: "Player",
  STUDENT_FAN: "Student Fan",
  ALUMNI_FAN: "Alumni Fan",
};

export const ALL_ROLES = Object.keys(ROLE_LABEL) as Role[];
export const CONTROL_ROOM_ROLES: Role[] = ["SUPER_ADMIN", "LEAGUE_ADMIN", "COMPETITION_MANAGER"];
export const STAFF_ROLES: Role[] = ["SUPER_ADMIN", "LEAGUE_ADMIN", "COMPETITION_MANAGER", "TEAM_MANAGER", "REFEREE"];

export type Permission =
  | "teams"
  | "players"
  | "competitions"
  | "fixtures"
  | "results"
  | "news"
  | "rules"
  | "users"
  | "settings"
  | "activity"
  | "exports"
  | "payments";

const MATRIX: Record<Permission, Role[]> = {
  teams: ["SUPER_ADMIN", "LEAGUE_ADMIN"],
  players: ["SUPER_ADMIN", "LEAGUE_ADMIN"],
  competitions: ["SUPER_ADMIN", "LEAGUE_ADMIN", "COMPETITION_MANAGER"],
  fixtures: ["SUPER_ADMIN", "LEAGUE_ADMIN", "COMPETITION_MANAGER"],
  results: ["SUPER_ADMIN", "LEAGUE_ADMIN", "COMPETITION_MANAGER"],
  news: ["SUPER_ADMIN", "LEAGUE_ADMIN", "COMPETITION_MANAGER"],
  rules: ["SUPER_ADMIN", "LEAGUE_ADMIN", "COMPETITION_MANAGER"],
  users: ["SUPER_ADMIN", "LEAGUE_ADMIN"],
  settings: ["SUPER_ADMIN"],
  activity: ["SUPER_ADMIN", "LEAGUE_ADMIN", "COMPETITION_MANAGER"],
  exports: ["SUPER_ADMIN", "LEAGUE_ADMIN", "COMPETITION_MANAGER"],
  payments: ["SUPER_ADMIN", "LEAGUE_ADMIN"],
};

export function can(role: Role | string | undefined | null, perm: Permission) {
  return !!role && MATRIX[perm].includes(role as Role);
}

export function isStaff(role?: string | null) {
  return !!role && STAFF_ROLES.includes(role as Role);
}

/** Roles a given admin may assign to other users */
export function assignableRoles(role: Role): Role[] {
  if (role === "SUPER_ADMIN") return ALL_ROLES;
  if (role === "LEAGUE_ADMIN") return ["COMPETITION_MANAGER", "TEAM_MANAGER", "REFEREE", "PLAYER", "STUDENT_FAN", "ALUMNI_FAN"];
  return [];
}

export function homeFor(role: Role) {
  if (CONTROL_ROOM_ROLES.includes(role)) return "/admin";
  if (role === "TEAM_MANAGER") return "/team-panel";
  if (role === "REFEREE") return "/referee";
  return "/account";
}
