import React from 'react';
import { ChartContainer } from './chart/ChartContainer';
import { DebugOverlay } from './ui/DebugOverlay';

export default function App() {
  return (
    <div className="app-root">
      <div className="header">TV‑lite React (Steps 1–7 complete: container / main chart / data / panes / UI / WS / Fib)</div>
      <div className="content">
        <ChartContainer />
      </div>
      <DebugOverlay />
    </div>
  );
}
