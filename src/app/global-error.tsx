// src/app/global-error.tsx
"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const msg =
    (error && typeof error.message === "string" && error.message) ||
    "Wystąpił nieoczekiwany błąd.";

  return (
    <html lang="pl">
      <body>
        <div className="p-6">
          <main className="max-w-3xl">
            <h1 className="text-xl font-semibold mb-2">Ups! Coś poszło nie tak</h1>
            <p className="text-gray-600 mb-4">{msg}</p>
            {error?.digest && (
              <p className="text-xs text-gray-400 mb-4">digest: {error.digest}</p>
            )}
            <button
              onClick={() => reset()}
              className="rounded border border-blue-400 bg-blue-50 text-blue-700 px-3 py-1 hover:bg-blue-100"
            >
              Spróbuj ponownie
            </button>
          </main>
        </div>
      </body>
    </html>
  );
}
