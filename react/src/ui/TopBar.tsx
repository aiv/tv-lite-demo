import React, { useEffect, useRef, useState } from 'react';

export type Source = 'auto' | 'binance' | 'binanceus' | 'yahoo' | 'polygon' | 'twelvedata';
export type Interval = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

export const PRESETS = [
  { label: 'Intel',    value: 'YF:INTC|5m' },
  { label: 'NVIDIA',   value: 'YF:NVDA|5m' },
  { label: 'Broadcom', value: 'YF:AVGO|5m' },
  { label: 'BTCUSDT',  value: 'BINANCE:BTCUSDT|5m' },
  { label: 'ETHUSDT',  value: 'BINANCE:ETHUSDT|5m' },
];

interface Props {
  source: Source;
  symbol: string;
  interval: Interval;
  loading?: boolean;
  indicatorOpen: boolean;
  onChangeSource: (v: Source) => void;
  onChangeSymbol: (v: string) => void;
  onChangeInterval: (v: Interval) => void;
  onPreset: (preset: string) => void;
  onLoad: () => void;
  onToggleIndicator: () => void;
  autoRotate: boolean;
  onToggleAutoRotate: () => void;
}

export const TopBar: React.FC<Props> = (props) => {
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const show = () => {
      setVisible(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setVisible(false), 10_000);
    };
    show();
    document.addEventListener('mousemove', show);
    return () => {
      document.removeEventListener('mousemove', show);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div className="topbar" style={{ opacity: visible ? 1 : 0, pointerEvents: visible ? undefined : 'none' }}>
      <label style={{ opacity: .75, marginRight: 4 }}>Source</label>
      <select className="top-select" value={props.source}
              onChange={e => props.onChangeSource(e.target.value as Source)}>
        <option value="auto">Auto</option>
        <option value="binance">Binance</option>
        <option value="binanceus">Binance US</option>
        <option value="yahoo">Yahoo</option>
        <option value="polygon">Polygon</option>
        <option value="twelvedata">TwelveData</option>
      </select>

      <label style={{ opacity: .75, marginLeft: 8, marginRight: 4 }}>Symbol</label>
      <input className="top-input" style={{ width: 120 }} value={props.symbol}
             onChange={e => props.onChangeSymbol(e.target.value.toUpperCase())} />

      <select className="top-select" defaultValue="" onChange={e => props.onPreset(e.target.value)}>
        <option value="">Presets</option>
        {PRESETS.map(p => (
          <option key={p.value} value={p.value}>{p.label}</option>
        ))}
      </select>

      <select className="top-select" value={props.interval}
              onChange={e => props.onChangeInterval(e.target.value as Interval)}>
        <option value="1d">1d</option>
        <option value="4h">4h</option>
        <option value="1h">1h</option>
        <option value="15m">15m</option>
        <option value="5m">5m</option>
        <option value="1m">1m</option>
      </select>

      <button className="top-btn" onClick={props.onLoad} disabled={props.loading}>
        {props.loading ? 'Loading…' : 'Load'}
      </button>

      <button className="top-btn" data-role="ind-toggle" onClick={props.onToggleIndicator}>
        Indicators{props.indicatorOpen ? '▲' : '▼'}
      </button>

      <label style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 8, cursor: 'pointer', userSelect: 'none', opacity: .85 }}>
        <input
          type="checkbox"
          checked={props.autoRotate}
          onChange={props.onToggleAutoRotate}
          style={{ cursor: 'pointer' }}
        />
        Auto-rotate
      </label>
    </div>
  );
};
