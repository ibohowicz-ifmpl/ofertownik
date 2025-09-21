"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ClientRedirect({ ms, href }: { ms: number; href: string }) {
  const router = useRouter();
  useEffect(() => {
    if (!ms || ms <= 0) return;
    const id = setTimeout(() => router.push(href), ms);
    return () => clearTimeout(id);
  }, [ms, href, router]);
  return null;
}
