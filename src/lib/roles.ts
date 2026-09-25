import type { Role } from "@/db/schema";

export const ROLE_LABEL: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  LEAGUE_ADMIN: "League Administrator",
  COMPETITION_MANAGER: "Competition Manager",
  TEAM_MANAGER: "Team Manager",
  REFEREE: "Referee",
  LIVE_REPORTER: "Live reporter",
  PLAYER: "Player",
  STUDENT_FAN: "Current Student",
  ALUMNI_FAN: "Old Student",
};

export const ALL_ROLES = Object.keys(ROLE_LABEL) as Role[];
export const CONTROL_ROOM_ROLES: Role[] = ["SUPER_ADMIN", "LEAGUE_ADMIN", "COMPETITION_MANAGER"];
export const STAFF_ROLES: Role[] = ["SUPER_ADMIN", "LEAGUE_ADMIN", "COMPETITION_MANAGER", "TEAM_MANAGER", "REFEREE", "LIVE_REPORTER"];

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
  | "payments"
  | "sharing"
  | "perks";

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
  // Super Admin only: the audit trail of everything staff do
  activity: ["SUPER_ADMIN"],
  exports: ["SUPER_ADMIN", "LEAGUE_ADMIN", "COMPETITION_MANAGER"],
  // Super Admin only: vouchers, membership status, member numbers and revenue
  payments: ["SUPER_ADMIN"],
  // Super Admin only: spotting shared member accounts, signing members out, suspending them
  sharing: ["SUPER_ADMIN"],
  perks: ["SUPER_ADMIN", "LEAGUE_ADMIN"],
};

export function can(role: Role | string | undefined | null, perm: Permission) {
  return !!role && MATRIX[perm].includes(role as Role);
}

export function isStaff(role?: string | null) {
  return !!role && STAFF_ROLES.includes(role as Role);
}

/**
 * Accounts a staff member can see and manage in Users & roles. The Super Admin oversees everyone;
 * a League Administrator looks after coaches (team managers), referees and live reporters.
 */
export function manageableRoles(role: Role): Role[] {
  if (role === "SUPER_ADMIN") return ALL_ROLES;
  if (role === "LEAGUE_ADMIN") return ["TEAM_MANAGER", "REFEREE", "LIVE_REPORTER"];
  return [];
}

/** Roles a given admin may assign to other users (the same set they manage). */
export function assignableRoles(role: Role): Role[] {
  return manageableRoles(role);
}

export function homeFor(role: Role) {
  if (CONTROL_ROOM_ROLES.includes(role)) return "/admin";
  if (role === "TEAM_MANAGER") return "/team-panel";
  if (role === "REFEREE") return "/referee";
  if (role === "LIVE_REPORTER") return "/live-desk";
  return "/account";
}
