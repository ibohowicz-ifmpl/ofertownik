"use client";
import { can, type Role as RBACRole, type Resource, type Action } from "@/lib/rbac";

export function Guard({
  role,
  resource,
  action = "view",
  children,
}: {
  role: RBACRole;
  resource: Resource;
  action?: Action;
  children: React.ReactNode;
}) {
  if (!can(role, action, resource)) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 text-red-800 p-4">
        <h3 className="font-semibold mb-1">403 — Brak uprawnień</h3>
        <p>Twoja rola nie pozwala na {action} zasobu <span className="font-mono">{resource}</span>.</p>
      </div>
    );
  }
  return <>{children}</>;
}
