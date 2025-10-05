import { MOCK_MPK, type AdminMpk, type AdminMpkRole } from "@/app/admin/_mocks";

let MPK: AdminMpk[] = [...MOCK_MPK];

export function listMpk(): AdminMpk[] {
    return MPK;
}

export function createMpk(input: { code: string; name: string; defaultRole: AdminMpkRole }): AdminMpk {
    const row: AdminMpk = { ...input };
    MPK = [row, ...MPK];
    return row;
}

export function updateMpk(code: string, patch: Partial<Pick<AdminMpk, "name" | "defaultRole">>): AdminMpk | null {
    const i = MPK.findIndex(m => m.code === code);
    if (i === -1) return null;
    MPK[i] = { ...MPK[i], ...patch };
    return MPK[i];
}

export function removeMpk(code: string): boolean {
    const len = MPK.length;
    MPK = MPK.filter(m => m.code !== code);
    return MPK.length !== len;
}
