"use client";
import { createContext, useContext } from "react";
import type { Role } from "@/lib/rbac";
import type { MpkRolesMap } from "@/lib/rbac";


type AdminContext = {
    role: Role;
    mpkRoles: MpkRolesMap;
};

const Ctx = createContext<AdminContext>({ role: "LEADER", mpkRoles: {} });


export function AdminRoleProvider({
    role,
    mpkRoles,
    children,
}: {
    role: Role;
    mpkRoles: MpkRolesMap;
    children: React.ReactNode;
}) {
    return <Ctx.Provider value={{ role, mpkRoles }}>{children}</Ctx.Provider>;
}


export function useAdminRole(): Role {
    return useContext(Ctx).role;
}

export function useAdminMpkRoles(): MpkRolesMap {
    return useContext(Ctx).mpkRoles;
}
