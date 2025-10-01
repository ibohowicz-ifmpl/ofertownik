// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css"; // jeśli masz inny plik globalny, podmień nazwę

export const metadata: Metadata = {
  title: "Ofertownik",
  description: "Aplikacja do ofertowania",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pl">
      <body>{children}</body>
    </html>
  );
}
