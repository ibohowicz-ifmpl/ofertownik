import type { Action, Resource, Role, MpkRolesMap } from "@/lib/rbac";
import { can, canOnMpk } from "@/lib/rbac";

/** DEV: wyciąga rolę globalną i mapę MPK z nagłówków.
 *  X-Role: LEADER|MANAGER|PM|VIEWER
 *  X-Mpk-Roles: JSON, np. {"Q22-OPS":"MANAGER","PU-TECH":"VIEWER"}
 */
export function readRequestRoles(req: Request): { role: Role; mpkRoles: MpkRolesMap } {
  const h = (req.headers.get("X-Role") || "LEADER").toUpperCase() as Role;
  let mpk: MpkRolesMap = {};
  const raw = req.headers.get("X-Mpk-Roles");
  if (raw) { try { mpk = JSON.parse(raw) as MpkRolesMap; } catch {} }
  return { role: h, mpkRoles: mpk };
}

export function assertCan(role: Role, action: Action, resource: Resource) {
  if (!can(role, action, resource)) {
    const err = new Error(`Forbidden: ${role} cannot ${action} ${resource}`);
    (err as any).status = 403;
    throw err;
  }
}

export function assertCanOnMpk(mpkRoles: MpkRolesMap, code: string, action: Action) {
  if (!canOnMpk(mpkRoles, code, action)) {
    const err = new Error(`Forbidden: no permission ${action} on MPK ${code}`);
    (err as any).status = 403;
    throw err;
  }
}
