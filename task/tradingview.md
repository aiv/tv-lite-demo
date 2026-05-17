Here is a complete, integrated **task checklist + minimal runnable index.html** that you can copy and hand off to Codex or run yourself.

⸻

## 📋 TradingView-lite Deployment Checklist (4×A6000 server)

### Task 1: Prepare environment
- Update dependencies:

sudo apt update && sudo apt install -y git curl wget build-essential


- Install Node.js 20 LTS:

curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs


- Verify:

node -v   # should show v20.x
npm -v



⸻

### Task 2: Create project directory
- Create and enter directory:

mkdir ~/tv-lite-demo && cd ~/tv-lite-demo


- Initialise project:

npm init -y



⸻

### Task 3: Install local server
- Install lite-server:

npm install lite-server --save-dev


- Edit `package.json` → add to the `"scripts"` section:

"scripts": {
  "start": "lite-server"
}



⸻

### Task 4: Create the demo page
- Create `index.html` in the project root.
- Copy the content below (ready to run; includes candlesticks + MA/EMA + RSI + MACD + Fibonacci retracement):

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>TradingView-lite Demo</title>
  <!-- TradingView official open-source chart -->
  <script src="https://unpkg.com/lightweight-charts/dist/lightweight-charts.standalone.production.js"></script>
  <!-- technicalindicators library -->
  <script src="https://cdn.jsdelivr.net/npm/technicalindicators@latest/dist/browser.js"></script>
  <style>
    body { margin: 0; background: #0f172a; color: #e5e7eb; font-family: sans-serif; }
    .chart { height: 400px; }
    .subchart { height: 200px; }
  </style>
</head>
<body>
  <h2 style="text-align:center">📈 TradingView-lite Demo</h2>
  <div id="chart" class="chart"></div>
  <div id="rsi" class="subchart"></div>
  <div id="macd" class="subchart"></div>

<script>
  // ---------- Sample data (randomly generated OHLC) ----------
  function genOHLC(n=200, start=100) {
    const out=[]; let t = Math.floor(Date.now()/1000) - n*86400; let price=start;
    for(let i=0;i<n;i++){
      const open=price, close=open+(Math.random()-0.5)*4;
      const high=Math.max(open,close)+Math.random()*2;
      const low=Math.min(open,close)-Math.random()*2;
      out.push({time:t, open, high, low, close});
      price=close; t+=86400;
    }
    return out;
  }
  const ohlc=genOHLC();
  const closes=ohlc.map(d=>d.close);

  // ---------- Main chart (candlesticks) ----------
  const chart=LightweightCharts.createChart(document.getElementById('chart'),{layout:{background:{color:'#0f172a'}, textColor:'#eee'}, grid:{vertLines:{color:'#1e293b'}, horzLines:{color:'#1e293b'}}, crosshair:{mode:0}, rightPriceScale:{borderColor:'#334155'}, timeScale:{borderColor:'#334155'}});
  const candleSeries=chart.addCandlestickSeries();
  candleSeries.setData(ohlc);

  // ---------- SMA / EMA ----------
  const sma=ti.SMA.calculate({period:20, values:closes});
  const ema=ti.EMA.calculate({period:50, values:closes});
  const times=ohlc.map(d=>d.time);
  const smaSeries=chart.addLineSeries({color:'orange'});
  const emaSeries=chart.addLineSeries({color:'cyan'});
  smaSeries.setData(sma.map((v,i)=>({time:times[i+20-1], value:v})));
  emaSeries.setData(ema.map((v,i)=>({time:times[i+50-1], value:v})));

  // ---------- RSI ----------
  const rsiChart=LightweightCharts.createChart(document.getElementById('rsi'),{height:200, layout:{background:{color:'#0f172a'}, textColor:'#eee'}, rightPriceScale:{borderColor:'#334155'}, timeScale:{borderColor:'#334155'}});
  const rsiSeries=rsiChart.addLineSeries({color:'yellow'});
  const rsi=ti.RSI.calculate({period:14, values:closes});
  rsiSeries.setData(rsi.map((v,i)=>({time:times[i+14-1], value:v})));

  // ---------- MACD ----------
  const macdChart=LightweightCharts.createChart(document.getElementById('macd'),{height:200, layout:{background:{color:'#0f172a'}, textColor:'#eee'}, rightPriceScale:{borderColor:'#334155'}, timeScale:{borderColor:'#334155'}});
  const macdLine=macdChart.addLineSeries({color:'lime'});
  const sigLine=macdChart.addLineSeries({color:'red'});
  const histSeries=macdChart.addHistogramSeries({color:'rgba(0,150,136,0.5)'});
  const macd=ti.MACD.calculate({values:closes, fastPeriod:12, slowPeriod:26, signalPeriod:9, SimpleMAOscillator:false, SimpleMASignal:false});
  macdLine.setData(macd.map((d,i)=>({time:times[i+26-1], value:d.MACD})));
  sigLine.setData(macd.map((d,i)=>({time:times[i+26-1], value:d.signal})));
  histSeries.setData(macd.map((d,i)=>({time:times[i+26-1], value:d.histogram})));
</script>
</body>
</html>


⸻

### Task 5: Start the server
- Start:

npm start


- Default port: http://localhost:3000

⸻

### Task 6: Remote access setup
- Open port:

sudo ufw allow 3000/tcp


- Get public IP:

curl ifconfig.me


- Open in browser:

http://<your-server-public-ip>:3000



⸻

### Task 7: (Optional) Run as background service
- Install pm2:

npm install -g pm2


- Start and save:

pm2 start node_modules/.bin/lite-server --name tv-lite
pm2 save
pm2 startup



⸻

✅ After completing all steps above, you will see a simplified TradingView in your browser:
	•	Main chart: candlesticks + SMA/EMA
	•	Sub-panes: RSI / MACD
	•	Fibonacci: add interactive drawing logic as needed (technicalindicators does not provide Fib directly; calculate the range high/low and draw lines manually).

⸻

Would you like me to add a Fibonacci retracement drawing tool to this index.html (e.g., drag to select a range and automatically draw Fib lines)?