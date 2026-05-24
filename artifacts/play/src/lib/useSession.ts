import { useEffect, useState, useRef } from "react";
import { getSession, type PlaySessionState } from "./api";

export function useSession(id: string, intervalMs = 700) {
  const [state, setState] = useState<PlaySessionState | null>(null);
  const [error, setError] = useState<string | null>(null);
  // server-time offset = serverTime - clientTimeAtReceive
  const offsetRef = useRef(0);
  const [, forceTick] = useState(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const poll = async () => {
      try {
        const s = await getSession(id);
        if (mounted.current) {
          offsetRef.current = s.serverTime - Date.now();
          setState(s);
          setError(null);
          forceTick((n) => n + 1);
        }
      } catch (e) {
        if (mounted.current) setError(String(e));
      }
      if (mounted.current) {
        timer = setTimeout(poll, intervalMs);
      }
    };
    void poll();
    return () => {
      mounted.current = false;
      if (timer) clearTimeout(timer);
    };
  }, [id, intervalMs]);

  return { state, error, serverOffset: offsetRef.current };
}

// Countdown that uses server time. `target` is the server-clock timestamp.
export function useCountdown(
  target: number | null,
  serverOffset = 0,
): number {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    if (!target) {
      setRemaining(0);
      return;
    }
    const update = () =>
      setRemaining(Math.max(0, target - (Date.now() + serverOffset)));
    update();
    const id = setInterval(update, 100);
    return () => clearInterval(id);
  }, [target, serverOffset]);
  return remaining;
}
