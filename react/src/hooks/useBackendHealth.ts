import React from 'react';

export function useBackendHealth(intervalMs = 15_000) {
  // null = unknown (first check pending), true = online, false = offline
  const [online, setOnline] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    let destroyed = false;

    async function check() {
      if (destroyed) return;
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), 5000);
      try {
        const res = await fetch('/api/health', { signal: ac.signal });
        clearTimeout(timer);
        if (!destroyed) setOnline(res.ok);
      } catch {
        clearTimeout(timer);
        if (!destroyed) setOnline(false);
      }
    }

    check();
    const id = setInterval(check, intervalMs);
    return () => {
      destroyed = true;
      clearInterval(id);
    };
  }, [intervalMs]);

  return { online };
}
