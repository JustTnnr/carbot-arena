import { useEffect, useState } from "react";
import { 
  useGetDashboardSummary, 
  useGetDashboardLeaderboard, 
  useGetDashboardEvents, 
  useGetDashboardTournament, 
  useGetDashboardLive 
} from "@workspace/api-client-react";
import { Activity, Users, Trophy, Zap, Server, ShieldAlert, Crosshair, Goal, Sword, Timer, Play, CircleDot, Flag } from "lucide-react";

// Format numbers nicely
const formatNumber = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

const Countdown = ({ endTime }: { endTime: number }) => {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const update = () => {
      const now = Math.floor(Date.now() / 1000);
      const diff = endTime - now;
      if (diff <= 0) {
        setTimeLeft("0h 0m 0s");
        return;
      }
      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      setTimeLeft(`${h}h ${m}m ${s}s`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [endTime]);

  return <span className="font-mono text-primary text-glow">{timeLeft} remaining</span>;
};

export default function Dashboard() {
  const { data: summary } = useGetDashboardSummary({ query: { refetchInterval: 5000 } });
  const { data: leaderboard } = useGetDashboardLeaderboard({ query: { refetchInterval: 5000 } });
  const { data: events } = useGetDashboardEvents({ query: { refetchInterval: 5000 } });
  const { data: tournament } = useGetDashboardTournament({ query: { refetchInterval: 5000 } });
  const { data: liveState } = useGetDashboardLive({ query: { refetchInterval: 5000 } });

  const botOnline = liveState?.botOnline ?? summary?.botOnline ?? false;

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-6 lg:p-8 font-sans">
      
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-wider text-primary text-glow uppercase flex items-center gap-3">
            <Activity className="w-8 h-8 text-primary" />
            CarBot Command
          </h1>
          <p className="text-muted-foreground text-sm uppercase tracking-widest mt-1">Live Telemetry Ops</p>
        </div>
        
        <div className="flex items-center gap-4 bg-card border border-card-border px-4 py-2 rounded-sm box-glow">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">System Status</span>
          </div>
          <div className="h-4 w-[1px] bg-border mx-2"></div>
          <div className={`flex items-center gap-2 px-2 py-1 rounded-sm ${botOnline ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
            <CircleDot className={`w-4 h-4 ${botOnline ? 'animate-pulse text-primary' : 'text-destructive'}`} />
            <span className="font-display font-bold text-sm tracking-wider uppercase">
              {botOnline ? 'Online - Live' : 'Offline - Halt'}
            </span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* TOP ROW: SUMMARY STATS (Full width, nested grid) */}
        <div className="col-span-1 md:col-span-12 grid grid-cols-2 md:grid-cols-4 gap-4">
          
          <div className="bg-card border-t-2 border-t-primary border-x border-b border-border p-4 flex flex-col gap-2 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-150"></div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="uppercase text-xs font-bold tracking-widest">Total Players</span>
              <Users className="w-4 h-4" />
            </div>
            <div className="text-3xl font-display font-bold text-foreground">
              {summary ? formatNumber(summary.totalPlayers) : '---'}
            </div>
          </div>

          <div className="bg-card border-t-2 border-t-primary border-x border-b border-border p-4 flex flex-col gap-2 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-150"></div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="uppercase text-xs font-bold tracking-widest">Global Score</span>
              <Zap className="w-4 h-4" />
            </div>
            <div className="text-3xl font-display font-bold text-foreground">
              {summary ? formatNumber(summary.totalScore) : '---'}
            </div>
          </div>

          <div className="bg-card border-t-2 border-t-primary border-x border-b border-border p-4 flex flex-col gap-2 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-150"></div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="uppercase text-xs font-bold tracking-widest">Active Events</span>
              <Activity className="w-4 h-4" />
            </div>
            <div className="text-3xl font-display font-bold text-primary text-glow">
              {summary ? summary.activeEvents : '---'}
            </div>
          </div>

          <div className="bg-card border-t-2 border-t-primary border-x border-b border-border p-4 flex flex-col gap-2 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-150"></div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="uppercase text-xs font-bold tracking-widest">Tourney Players</span>
              <Trophy className="w-4 h-4" />
            </div>
            <div className="text-3xl font-display font-bold text-foreground">
              {summary ? formatNumber(summary.tournamentPlayers) : '---'}
            </div>
          </div>

        </div>

        {/* MAIN LEFT: LIVE GAME STATE */}
        <div className="col-span-1 md:col-span-8 flex flex-col gap-6">
          <div className="bg-card border border-border p-5 relative box-glow">
            <div className="flex items-center gap-2 mb-6 border-b border-border pb-3">
              <Activity className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-display font-bold uppercase tracking-wider">Live Game Telemetry</h2>
              <div className="ml-auto flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                </span>
                <span className="text-xs uppercase font-bold tracking-widest text-primary">Live Sync</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              
              {/* Boss Raid */}
              <div className="border border-border bg-background p-4 relative overflow-hidden">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className={`w-5 h-5 ${liveState?.bossRaidActive ? 'text-destructive' : 'text-muted-foreground'}`} />
                    <h3 className="font-display font-bold uppercase tracking-widest">Boss Raid</h3>
                  </div>
                  {liveState?.bossRaidActive ? (
                    <span className="bg-destructive/20 text-destructive text-xs font-bold px-2 py-1 uppercase tracking-widest">Active</span>
                  ) : (
                    <span className="bg-muted text-muted-foreground text-xs font-bold px-2 py-1 uppercase tracking-widest">Inactive</span>
                  )}
                </div>
                
                {liveState?.bossRaidActive ? (
                  <div>
                    <div className="flex justify-between text-sm font-mono mb-2">
                      <span className="text-muted-foreground">HP</span>
                      <span className="text-destructive font-bold">{formatNumber(liveState.bossRaidHp)} / {formatNumber(liveState.bossRaidMaxHp)}</span>
                    </div>
                    <div className="h-4 bg-muted overflow-hidden relative">
                      <div 
                        className="absolute top-0 left-0 h-full bg-destructive transition-all duration-500 ease-out"
                        style={{ width: `${Math.max(0, Math.min(100, (liveState.bossRaidHp / Math.max(1, liveState.bossRaidMaxHp)) * 100))}%` }}
                      ></div>
                    </div>
                  </div>
                ) : (
                  <div className="text-muted-foreground text-sm font-mono opacity-50">No active boss raid detected in sector.</div>
                )}
              </div>

              {/* Tap Race */}
              <div className="border border-border bg-background p-4 relative">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <Crosshair className={`w-5 h-5 ${liveState?.tapRaceActive ? 'text-primary' : 'text-muted-foreground'}`} />
                    <h3 className="font-display font-bold uppercase tracking-widest">Tap Race</h3>
                  </div>
                  {liveState?.tapRaceActive ? (
                    <span className="bg-primary/20 text-primary text-xs font-bold px-2 py-1 uppercase tracking-widest">
                      {liveState.tapRaceStarted ? 'In Progress' : 'Matchmaking'}
                    </span>
                  ) : (
                    <span className="bg-muted text-muted-foreground text-xs font-bold px-2 py-1 uppercase tracking-widest">Inactive</span>
                  )}
                </div>

                {liveState?.tapRaceActive ? (
                  <div className="space-y-4">
                    <div className="text-xs uppercase font-bold text-muted-foreground tracking-widest">Live Taps</div>
                    {Object.entries(liveState.tapRaceTaps || {}).length > 0 ? (
                       Object.entries(liveState.tapRaceTaps).map(([player, taps]) => (
                         <div key={player} className="flex items-center gap-3">
                           <div className="w-16 truncate font-mono text-xs text-muted-foreground">{player}</div>
                           <div className="flex-1 h-2 bg-muted">
                             <div className="h-full bg-primary transition-all duration-200" style={{ width: `${Math.min(100, (taps / 1000) * 100)}%` }}></div>
                           </div>
                           <div className="w-12 text-right font-mono font-bold text-primary">{taps}</div>
                         </div>
                       ))
                    ) : (
                      <div className="text-sm font-mono text-muted-foreground">Awaiting tap data...</div>
                    )}
                  </div>
                ) : (
                  <div className="text-muted-foreground text-sm font-mono opacity-50">No tap race currently running.</div>
                )}
              </div>

              {/* Marathon */}
              <div className="border border-border bg-background p-4 relative flex items-center justify-between">
                 <div className="flex items-center gap-2">
                    <Flag className={`w-5 h-5 ${liveState?.marathonActive ? 'text-chart-3' : 'text-muted-foreground'}`} />
                    <h3 className="font-display font-bold uppercase tracking-widest">Marathon Event</h3>
                  </div>
                  {liveState?.marathonActive ? (
                    <span className="bg-chart-3/20 text-chart-3 text-xs font-bold px-3 py-1 uppercase tracking-widest border border-chart-3/30 animate-pulse">Running</span>
                  ) : (
                    <span className="bg-muted text-muted-foreground text-xs font-bold px-3 py-1 uppercase tracking-widest">Standby</span>
                  )}
              </div>

            </div>
          </div>

          {/* EVENTS & TOURNAMENT */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Events */}
            <div className="bg-card border border-border p-5">
              <div className="flex items-center gap-2 mb-4 border-b border-border pb-3">
                <Goal className="w-5 h-5 text-chart-4" />
                <h2 className="text-lg font-display font-bold uppercase tracking-wider">Active Events</h2>
              </div>
              <div className="space-y-4">
                
                {/* Giveaway */}
                <div className="p-3 border border-border bg-background">
                  <div className="text-xs uppercase font-bold tracking-widest text-muted-foreground mb-1">Giveaway</div>
                  {events?.giveaway?.active ? (
                    <div>
                      <div className="font-display font-bold text-primary mb-1">{events.giveaway.title}</div>
                      <div className="flex justify-between items-end mt-3">
                        <div className="flex flex-col">
                          <span className="text-xs text-muted-foreground uppercase tracking-wider">Prize</span>
                          <span className="font-mono text-sm">{events.giveaway.prize}</span>
                        </div>
                        <div className="text-right">
                          <Countdown endTime={events.giveaway.endTime} />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm font-mono text-muted-foreground opacity-50">No giveaway active</div>
                  )}
                </div>

                {/* Premium */}
                <div className="p-3 border border-border bg-background">
                  <div className="text-xs uppercase font-bold tracking-widest text-muted-foreground mb-1">Premium Event</div>
                  {events?.premium?.active ? (
                    <div>
                      <div className="font-display font-bold text-chart-5 mb-1">{events.premium.title}</div>
                      <div className="flex justify-between items-end mt-3">
                        <div className="flex flex-col">
                          <span className="text-xs text-muted-foreground uppercase tracking-wider">Prize</span>
                          <span className="font-mono text-sm">{events.premium.prize}</span>
                        </div>
                        <div className="text-right">
                          <Countdown endTime={events.premium.endTime} />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm font-mono text-muted-foreground opacity-50">No premium event active</div>
                  )}
                </div>

              </div>
            </div>

            {/* Tournament */}
            <div className="bg-card border border-border p-5">
              <div className="flex items-center gap-2 mb-4 border-b border-border pb-3">
                <Trophy className="w-5 h-5 text-chart-5" />
                <h2 className="text-lg font-display font-bold uppercase tracking-wider">Tournament</h2>
              </div>
              
              {tournament ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border border-border bg-background">
                    <span className="uppercase text-xs font-bold tracking-widest text-muted-foreground">Players Registered</span>
                    <span className="font-mono font-bold text-xl text-primary">{formatNumber(tournament.playerCount)}</span>
                  </div>
                  
                  <div className="p-3 border border-border bg-background">
                     <span className="uppercase text-xs font-bold tracking-widest text-muted-foreground mb-2 block">Recent Winners</span>
                     {tournament.winners.length > 0 ? (
                       <ul className="space-y-2">
                         {tournament.winners.map((winner, idx) => (
                           <li key={idx} className="flex items-center gap-2 text-sm font-mono">
                             <Trophy className="w-3 h-3 text-chart-5" />
                             {winner}
                           </li>
                         ))}
                       </ul>
                     ) : (
                       <div className="text-sm font-mono text-muted-foreground opacity-50">No recent winners</div>
                     )}
                  </div>
                </div>
              ) : (
                <div className="text-sm font-mono text-muted-foreground opacity-50">Loading tournament data...</div>
              )}
            </div>

          </div>

        </div>

        {/* MAIN RIGHT: LEADERBOARD */}
        <div className="col-span-1 md:col-span-4">
          <div className="bg-card border border-border h-full flex flex-col">
            <div className="p-4 border-b border-border bg-card/50">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-display font-bold uppercase tracking-wider">Global Ranks</h2>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto p-0 m-0">
              {leaderboard ? (
                <div className="divide-y divide-border border-b border-border">
                  {leaderboard.map((entry) => (
                    <div key={entry.userId} className="p-3 flex items-center gap-4 hover:bg-white/5 transition-colors">
                      <div className="w-8 h-8 flex items-center justify-center bg-background border border-border text-primary font-display font-bold text-sm">
                        {entry.rank}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-sm truncate text-foreground">{entry.userId}</div>
                      </div>
                      <div className="font-mono font-bold text-primary text-glow">
                        {formatNumber(entry.score)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground font-mono text-sm opacity-50">
                  Initializing leaderboard feed...
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
