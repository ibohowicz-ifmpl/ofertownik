import { MOCK_USERS, type AdminUser, type AdminUserRole } from "@/app/admin/_mocks";

let USERS: AdminUser[] = [...MOCK_USERS];

export function listUsers(): AdminUser[] {
  return USERS;
}

export function createUser(input: { name: string; email: string; role: AdminUserRole }): AdminUser {
  const id = `u_${Date.now()}`;
  const user: AdminUser = { id, ...input };
  USERS = [user, ...USERS];
  return user;
}

export function updateUser(id: string, patch: Partial<Pick<AdminUser, "name" | "email" | "role">>): AdminUser | null {
  const idx = USERS.findIndex((u) => u.id === id);
  if (idx === -1) return null;
  USERS[idx] = { ...USERS[idx], ...patch };
  return USERS[idx];
}

export function removeUser(id: string): boolean {
  const lenBefore = USERS.length;
  USERS = USERS.filter(u => u.id !== id);
  return USERS.length !== lenBefore;
}
