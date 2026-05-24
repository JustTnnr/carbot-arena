import { useEffect, useState, useRef } from "react";
import { getSession, type PlaySessionState } from "./api";

export function useSession(id: string, intervalMs = 700) {
  const [state, setState] = useState<PlaySessionState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const poll = async () => {
      try {
        const s = await getSession(id);
        if (mounted.current) {
          setState(s);
          setError(null);
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

  return { state, error };
}

export function useCountdown(target: number | null): number {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    if (!target) {
      setRemaining(0);
      return;
    }
    const update = () => setRemaining(Math.max(0, target - Date.now()));
    update();
    const id = setInterval(update, 100);
    return () => clearInterval(id);
  }, [target]);
  return remaining;
}
