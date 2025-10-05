"use client";
import { useEffect } from "react";

export function Modal({
    open,
    onClose,
    title,
    children,
    actions,
}: {
    open: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    actions?: React.ReactNode;
}) {
    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (e.key === "Escape") onClose();
        }
        if (open) document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative w-full max-w-lg rounded-lg border border-gray-200 bg-white shadow-xl">
                <div className="border-b px-4 py-3">
                    <h3 className="text-lg font-semibold">{title}</h3>
                </div>
                <div className="p-4">{children}</div>
                <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
                    <button onClick={onClose} className="rounded border border-gray-300 px-3 py-1 hover:bg-gray-50">
                        Anuluj
                    </button>
                    {actions}
                </div>
            </div>
        </div>
    );
}
