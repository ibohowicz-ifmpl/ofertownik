export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 text-red-800 p-3 text-sm">
      <strong className="mr-1">Błąd:</strong>{message}
    </div>
  );
}
