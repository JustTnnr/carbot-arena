export default function Home() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-md w-full text-center text-white">
        <div className="text-6xl mb-4">🏎️</div>
        <h1 className="text-4xl font-bold mb-3">CarBot Arena</h1>
        <p className="text-purple-200 mb-8">
          Live mini-games for the CarBot Telegram channel. Open a game link
          from the bot to play.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl bg-white/10 backdrop-blur p-4 border border-white/20">
            <div className="text-3xl mb-2">⚡</div>
            <div className="font-semibold">Tap Race</div>
            <div className="text-xs text-purple-200 mt-1">
              Tap fast. Beat the others.
            </div>
          </div>
          <div className="rounded-2xl bg-white/10 backdrop-blur p-4 border border-white/20">
            <div className="text-3xl mb-2">👹</div>
            <div className="font-semibold">Boss Raid</div>
            <div className="text-xs text-purple-200 mt-1">
              Team up. Burn the boss.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
