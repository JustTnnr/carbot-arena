export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-900 text-white p-6">
      <div className="text-center">
        <div className="text-6xl mb-3">🤖</div>
        <h1 className="text-2xl font-bold">Page not found</h1>
        <p className="text-slate-400 mt-2 text-sm">
          Open a game link from the CarBot Telegram channel.
        </p>
      </div>
    </div>
  );
}
