import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  createChart,
  type IChartApi,
  type MouseEventParams,
  CandlestickSeries,
  LineSeries,
} from 'lightweight-charts';
import { useKlines, type Bar } from '../hooks/useKlines';
import { VolumePane } from '../panes/VolumePane';
import { RSIPane } from '../panes/RSIPane';
import { MACDPane } from '../panes/MACDPane';
import { TopBar, PRESETS, type Source, type Interval } from '../ui/TopBar';
import { IndicatorPanel } from '../ui/IndicatorPanel';
import { useBinanceWS } from '../hooks/useBinanceWS';
import { useBackendHealth } from '../hooks/useBackendHealth';
import { FibTool } from '../tools/FibTool';

export const ChartContainer: React.FC = () => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const resizeObsRef = useRef<ResizeObserver | null>(null);
  const candleRef = useRef<ReturnType<IChartApi['addSeries']> | null>(null);
  const closeLineRef = useRef<ReturnType<IChartApi['addSeries']> | null>(null);
  const smaSeriesRef = useRef<ReturnType<IChartApi['addSeries']> | null>(null);
  const emaSeriesRef = useRef<ReturnType<IChartApi['addSeries']> | null>(null);
  const ohlcRef = useRef<Bar[]>([]);
  const [viewData, setViewData] = useState<Bar[] | null>(null);
  const rightPadBars = Number(import.meta.env.VITE_RIGHT_PAD_BARS ?? 10);
  const rightPadBarsRef = useRef(rightPadBars);

  const [source, setSource] = useState<Source>(() => {
    const [ns] = (PRESETS[0]?.value ?? '').split('|');
    const [provider] = ns.split(':');
    return provider === 'BINANCE' ? 'binance' : provider === 'YF' ? 'yahoo' : 'auto';
  });
  const [symbol, setSymbol] = useState<string>(() => {
    const [ns] = (PRESETS[0]?.value ?? '').split('|');
    return ns.split(':')[1] ?? 'BTCUSDT';
  });
  const [interval, setInterval] = useState<Interval>(() => {
    return ((PRESETS[0]?.value ?? '').split('|')[1] as Interval) || '1d';
  });
  const { data, loading, error, reload } = useKlines({ source, symbol, interval, limit: 800, auto: true });
  const [showVolume, setShowVolume] = useState(true);
  const [showRSI, setShowRSI] = useState(false);
  const [showMACD, setShowMACD] = useState(false);
  const [showSMA, setShowSMA] = useState(true);
  const [showEMA, setShowEMA] = useState(true);
  const [indOpen, setIndOpen] = useState(false);

  type LegendBar = { time: number; open: number; high: number; low: number; close: number };
  const [legendData, setLegendData] = useState<LegendBar | null>(null);
  const formatLegendDate = (ts: number) => new Date(ts * 1000).toISOString().slice(0, 10);

  const presetIdxRef = useRef(0);
  const rotationIntervalSec = Number(import.meta.env.VITE_PRESET_ROTATION_INTERVAL ?? 180);
  const [autoRotate, setAutoRotate] = useState(
    () => import.meta.env.VITE_PRESET_ROTATION_ENABLED === 'true'
  );

  useEffect(() => {
    const el = hostRef.current!;
    // Create chart with dark layout to match current app look
    const chart = createChart(el, {
      layout: { background: { color: '#0f172a' }, textColor: '#eee' },
      grid: { vertLines: { color: '#1e293b' }, horzLines: { color: '#1e293b' } },
      rightPriceScale: { borderColor: '#334155' },
      crosshair: { mode: 0 },
      timeScale: { borderColor: '#334155', timeVisible: true, secondsVisible: false, rightOffset: 10 },
    });
    chartRef.current = chart;

    // --- Helpers ---
    function sma(values: number[], p: number) {
      const out: number[] = [];
      let sum = 0;
      for (let i = 0; i < values.length; i++) {
        sum += values[i];
        if (i >= p) sum -= values[i - p];
        if (i >= p - 1) out.push(sum / p);
      }
      return out;
    }
    function ema(values: number[], p: number) {
      const k = 2 / (p + 1);
      const out: number[] = [];
      let prev = values[0] ?? 0;
      for (let i = 0; i < values.length; i++) {
        if (i === 0) {
          out.push(prev);
        } else {
          prev = values[i] * k + prev * (1 - k);
          out.push(prev);
        }
      }
      return out.slice(p - 1);
    }

    // --- Series ---
    const candleSeries = chart.addSeries(CandlestickSeries);
    const closeLine = chart.addSeries(LineSeries, { color: '#7aa2f7', lineWidth: 1 });
    const smaSeries = chart.addSeries(LineSeries, { color: 'orange', lineWidth: 2 });
    const emaSeries = chart.addSeries(LineSeries, { color: 'cyan', lineWidth: 2 });
    candleRef.current = candleSeries;
    closeLineRef.current = closeLine;
    smaSeriesRef.current = smaSeries;
    emaSeriesRef.current = emaSeries;

    // --- Legend ---
    const updateLegend = (param: MouseEventParams) => {
      const validCrosshair =
        param !== undefined &&
        param.time !== undefined &&
        param.point !== undefined &&
        param.point.x >= 0 &&
        param.point.y >= 0;
      let bar: LegendBar | undefined;
      if (validCrosshair) {
        bar = param.seriesData.get(candleSeries) as LegendBar | undefined;
      } else {
        bar = candleSeries.dataByIndex(Number.MAX_SAFE_INTEGER, -1) as LegendBar | undefined;
      }
      if (bar) setLegendData(bar);
    };
    chart.subscribeCrosshairMove(updateLegend);
    // show last bar immediately
    const initBar = candleSeries.dataByIndex(Number.MAX_SAFE_INTEGER, -1) as LegendBar | undefined;
    if (initBar) setLegendData(initBar);

    // Resize handling
    const ro = new ResizeObserver(() => {
      const { clientWidth, clientHeight } = el;
      chart.resize(clientWidth, clientHeight);
    });
    ro.observe(el);
    resizeObsRef.current = ro;

    // Initial size
    chart.resize(el.clientWidth, el.clientHeight);

    return () => {
      resizeObsRef.current?.disconnect();
      resizeObsRef.current = null;
      chartRef.current?.remove();
      chartRef.current = null;
    };
  }, []);

  // --- Range helpers ---
  const defaultWindow = useMemo(() => {
    switch (interval) {
      case '1m':
      case '5m':
      case '15m':
        return 300;
      case '1h':
      case '4h':
        return 400;
      case '1d':
      default:
        return 220;
    }
  }, [interval]);

  useEffect(() => {
    rightPadBarsRef.current = rightPadBars;
    const chart = chartRef.current;
    if (!chart) return;
    // right offset
    chart.timeScale().applyOptions({ rightOffset: rightPadBars });
    // update visible range if data already loaded
    const len = ohlcRef.current.length;
    if (len > 0) {
      const ts = chart.timeScale();
      const r = ts.getVisibleLogicalRange();
      if (r) {
        const width = r.to - r.from;
        const newTo = (len - 1) + rightPadBars;
        ts.setVisibleLogicalRange({ from: newTo - width, to: newTo });
      }
    }
  }, [rightPadBars]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    // clamp right scroll — uses ref so always reads latest rightPadBars
    let clampLock = false;
    const clampRightLimit = () => {
      if (clampLock) return;
      const ts = chart.timeScale();
      const r = ts.getVisibleLogicalRange();
      if (!r) return;
      const len = ohlcRef.current.length;
      if (len === 0) return;
      const maxTo = (len - 1) + rightPadBarsRef.current;
      if (r.to > maxTo) {
        clampLock = true;
        const width = r.to - r.from;
        const newTo = maxTo;
        const newFrom = newTo - width;
        ts.setVisibleLogicalRange({ from: newFrom, to: newTo });
        clampLock = false;
      }
    };
    chart.timeScale().subscribeVisibleLogicalRangeChange(clampRightLimit);
    return () => {
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(clampRightLimit);
    };
  }, []);

  // --- Apply loaded data ---
  useEffect(() => {
    const chart = chartRef.current;
    const candle = candleRef.current;
    const closeLine = closeLineRef.current;
    const smaSeries = smaSeriesRef.current;
    const emaSeries = emaSeriesRef.current;
    if (!chart || !candle || !closeLine || !smaSeries || !emaSeries) return;
    if (!data || data.length === 0) return;

    const preserve = ohlcRef.current.length > 0; // keep current range if already set
    ohlcRef.current = data;
    setViewData(data);
    const times = data.map(d => d.time);
    const closes = data.map(d => d.close);
    candle.setData(data);
    closeLine.setData(data.map(d => ({ time: d.time, value: d.close })));
    // update legend to last bar
    const lastBar = data[data.length - 1];
    if (lastBar) setLegendData(lastBar);

    const sma20 = (function(values: number[]) { return (function(v:number[],p:number){const out:number[]=[];let s=0;for(let i=0;i<v.length;i++){s+=v[i];if(i>=p)s-=v[i-p];if(i>=p-1)out.push(s/p);}return out;})(values,20); })(closes);
    const ema50 = (function(values: number[]){const k=2/(50+1);const out:number[]=[];let prev=values[0]??0;for(let i=0;i<values.length;i++){if(i===0){out.push(prev);}else{prev=values[i]*k+prev*(1-k);out.push(prev);}}return out.slice(50-1);} )(closes);
    smaSeries.setData(sma20.map((v, i) => ({ time: times[i + 20 - 1], value: v })));
    emaSeries.setData(ema50.map((v, i) => ({ time: times[i + 50 - 1], value: v })));

    const ts = chart.timeScale();
    if (preserve) {
      const r = ts.getVisibleLogicalRange();
      if (r) ts.setVisibleLogicalRange(r);
    } else {
      const last = data.length - 1;
      const from = Math.max(0, last - defaultWindow);
      ts.setVisibleLogicalRange({ from, to: last + rightPadBars });
    }
    // force clamp once
    const r = ts.getVisibleLogicalRange();
    if (r) ts.setVisibleLogicalRange(r);
  }, [data, defaultWindow, rightPadBars]);

  // --- Realtime: Binance WS ---
  const clampNow = React.useCallback(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const ts = chart.timeScale();
    const r = ts.getVisibleLogicalRange();
    if (!r) return;
    const len = ohlcRef.current.length;
    if (len === 0) return;
    const maxTo = (len - 1) + rightPadBarsRef.current;
    if (r.to > maxTo) {
      const width = r.to - r.from;
      const newTo = maxTo;
      const newFrom = newTo - width;
      ts.setVisibleLogicalRange({ from: newFrom, to: newTo });
    }
  }, []);

  const onWsBar = React.useCallback((bar: Bar) => {
    const candle = candleRef.current; if (!candle) return;
    const closeLine = closeLineRef.current; const smaS = smaSeriesRef.current; const emaS = emaSeriesRef.current;
    const arr = ohlcRef.current;
    const last = arr[arr.length - 1];
    if (last && last.time === bar.time) {
      arr[arr.length - 1] = bar;
    } else if (!last || bar.time > last.time) {
      arr.push(bar);
    } else {
      return; // ignore out-of-order
    }
    // main series update
    candle.update(bar);
    closeLine?.update({ time: bar.time, value: bar.close });
    // SMA20/EMA50 incremental
    const closes = arr.map(d => d.close);
    // last SMA20
    if (smaS) {
      if (closes.length >= 20) {
        const last20 = closes.slice(-20);
        const smaVal = last20.reduce((a, b) => a + b, 0) / 20;
        smaS.update({ time: bar.time, value: smaVal });
      }
    }
    if (emaS) {
      if (closes.length >= 50) {
        const subset = closes.slice(-50);
        const k = 2 / (50 + 1); let e = subset[0];
        for (let i = 1; i < subset.length; i++) e = subset[i] * k + e * (1 - k);
        emaS.update({ time: bar.time, value: e });
      }
    }
    // trigger UI re-render for pane components
    setViewData([...arr]);
    setLegendData(bar);
    // keep right clamp
    clampNow();
  }, [clampNow]);

  const { connected: wsConnected } = useBinanceWS({ enabled: source === 'binance', symbol, interval, onBar: onWsBar });
  const wsDisconnected = source === 'binance' && !wsConnected;
  const { online: backendOnline } = useBackendHealth();
  const backendOffline = backendOnline === false;

  // toggle visibility for SMA/EMA
  useEffect(() => {
    smaSeriesRef.current?.applyOptions({ visible: showSMA });
  }, [showSMA]);
  useEffect(() => {
    emaSeriesRef.current?.applyOptions({ visible: showEMA });
  }, [showEMA]);

  // Adjust pane stretch factors (relative weights)
  // main=10, volume=2, rsi/macd=4 each
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const panes = chart.panes();
    if (panes.length === 0) return;
    const main = panes[0];
    const activeCount = panes.length - 1;
    if (activeCount <= 0) { main.setStretchFactor(1); return; }
    main.setStretchFactor(10);
    for (let i = 1; i < panes.length; i++) {
      // volume is always moved to pane index 1
      const isVolume = showVolume && i === 1;
      panes[i].setStretchFactor(isVolume ? 2 : 4);
    }
  }, [showVolume, showRSI, showMACD, data]);

  // auto-rotation
  useEffect(() => {
    if (!autoRotate) return;
    const ms = rotationIntervalSec * 1000;
    const id = window.setInterval(() => {
      presetIdxRef.current = (presetIdxRef.current + 1) % PRESETS.length;
      applyPreset(PRESETS[presetIdxRef.current].value);
    }, ms);
    return () => window.clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRotate, rotationIntervalSec]);

  // preset handler
  function applyPreset(v: string) {
    if (!v) return;
    const [ns, iv] = v.split('|');
    const [provider, sym] = ns.split(':');
    const src: Source = provider === 'BINANCE' ? 'binance' : provider === 'YF' ? 'yahoo' : provider === 'NINJAS' ? 'ninjas' : provider === 'FRED' ? 'fred' : provider === 'TWELVEDATA' ? 'twelvedata' : 'binance';
    setSource(src);
    setSymbol(sym);
    setInterval(iv as Interval);
  }

  const paneData = viewData || data || [];

  return (
    <>
      <TopBar
        source={source}
        symbol={symbol}
        interval={interval}
        loading={loading}
        indicatorOpen={indOpen}
        onChangeSource={setSource}
        onChangeSymbol={setSymbol}
        onChangeInterval={setInterval}
        onPreset={applyPreset}
        onLoad={() => { reload(); }}
        onToggleIndicator={() => setIndOpen(v => !v)}
        autoRotate={autoRotate}
        onToggleAutoRotate={() => setAutoRotate(v => !v)}
      />

      <IndicatorPanel
        open={indOpen}
        showSMA={showSMA}
        showEMA={showEMA}
        showVolume={showVolume}
        showRSI={showRSI}
        showMACD={showMACD}
        onChangeSMA={setShowSMA}
        onChangeEMA={setShowEMA}
        onChangeVolume={setShowVolume}
        onChangeRSI={setShowRSI}
        onChangeMACD={setShowMACD}
        onClose={() => setIndOpen(false)}
      />

      {backendOffline && (
        <div className="connection-banner">
          ⚠ Backend offline — chart data unavailable
        </div>
      )}
      {!backendOffline && wsDisconnected && (
        <div className="connection-banner">
          ⚠ No connection to data stream — chart updates paused
        </div>
      )}

      <div ref={hostRef} className="chart-host">
        {legendData && (
          <div className="chart-legend">
            <div className="chart-legend__symbol">{symbol}</div>
            <div className="chart-legend__ohlc">
              <span>O <b>{legendData.open.toFixed(2)}</b></span>
              <span>H <b>{legendData.high.toFixed(2)}</b></span>
              <span>L <b>{legendData.low.toFixed(2)}</b></span>
              <span>C <b>{legendData.close.toFixed(2)}</b></span>
            </div>
            <div className="chart-legend__date">{formatLegendDate(legendData.time)}</div>
          </div>
        )}
        {chartRef.current && paneData && (
          <>
            <VolumePane chart={chartRef.current} data={paneData} visible={showVolume} />
            <RSIPane chart={chartRef.current} data={paneData} visible={showRSI} />
            <MACDPane chart={chartRef.current} data={paneData} visible={showMACD} />
            {candleRef.current && (
              <FibTool chart={chartRef.current} candle={candleRef.current as any} resetKey={`${source}|${symbol}|${interval}`} />
            )}
          </>
        )}
      </div>
    </>
  );
};
