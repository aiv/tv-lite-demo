import React from 'react';

export interface UseBinanceWSParams {
  enabled: boolean;
  symbol: string; // e.g., BTCUSDT (uppercase)
  interval: string; // 1m 5m 15m 1h 4h 1d
  onBar: (bar: { time: number; open: number; high: number; low: number; close: number; volume: number }) => void;
}

export function useBinanceWS({ enabled, symbol, interval, onBar }: UseBinanceWSParams) {
  const wsRef = React.useRef<WebSocket | null>(null);
  const retryTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [connected, setConnected] = React.useState(false);

  React.useEffect(() => {
    if (!enabled) return;
    if (!symbol || !interval) return;

    let destroyed = false;
    let retryDelay = 2000;

    function connect() {
      if (destroyed) return;
      const url = `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_${interval.toLowerCase()}`;
      try {
        const ws = new WebSocket(url);
        wsRef.current = ws;
        ws.onopen = () => {
          if (destroyed) { ws.close(); return; }
          setConnected(true);
          retryDelay = 2000;
        };
        ws.onclose = () => {
          if (destroyed) return;
          setConnected(false);
          retryTimerRef.current = setTimeout(connect, retryDelay);
          retryDelay = Math.min(retryDelay * 2, 30000);
        };
        ws.onmessage = (ev: MessageEvent) => {
          if (destroyed) return;
          try {
            const msg = JSON.parse(ev.data as string);
            const k = msg?.k;
            if (!k) return;
            if (localStorage.getItem('debug') === '1') {
              console.log('[useBinanceWS] raw kline', { symbol, interval, raw: k });
            }
            const bar = {
              time: Math.floor(k.t / 1000),
              open: +k.o,
              high: +k.h,
              low: +k.l,
              close: +k.c,
              volume: +k.v,
            };
            onBar(bar);
          } catch {}
        };
      } catch {}
    }

    connect();

    return () => {
      destroyed = true;
      if (retryTimerRef.current) { clearTimeout(retryTimerRef.current); retryTimerRef.current = null; }
      try { wsRef.current?.close(); } catch {}
      wsRef.current = null;
      // intentionally NOT resetting `connected` here — avoids banner flash on symbol/interval change
    };
  }, [enabled, symbol, interval, onBar]);

  return { connected };
}

