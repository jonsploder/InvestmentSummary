import { useState } from "react";
import {
  QueryClient,
  QueryClientProvider,
  useQueries,
} from "@tanstack/react-query";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { format, fromUnixTime } from "date-fns";
import "./App.css";
import { fetchStockData } from "./services/stockService";
import { PortfolioManager } from "./components/PortfolioManager";

const queryClient = new QueryClient();

const ETF_LIST = [
  "VAS.AX",
  "VGS.AX",
  "VGAD.AX",
  "VAE.AX",
  "VGE.AX",
  "IVE.AX",
  "DJRE.AX",
  "GOLD.AX",
];

const COLORS = [
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#ff7300",
  "#0088fe",
  "#00c49f",
  "#ffbb28",
  "#ff8042",
];

interface ChartData {
  date: string;
  [key: string]: number | string;
}

interface Portfolio {
  holdings: Holding[];
}

interface Holding {
  symbol: string;
  shares: number;
}

function normalizeData(data: ChartData[], portfolio: Portfolio): ChartData[] {
  const baseValues: { [key: string]: number } = {};
  const totalInvestment = portfolio.holdings
    .filter((h) => h.symbol !== "CASH")
    .reduce((sum, h) => sum + h.shares, 0);

  // Get the first valid value for each symbol
  Object.keys(data[0]).forEach((key) => {
    if (key !== "date") {
      for (const point of data) {
        if (point[key] !== null && point[key] !== undefined) {
          baseValues[key] = Number(point[key]);
          break;
        }
      }
    }
  });

  // Create normalized data points
  return data.map((point) => {
    const normalizedPoint: ChartData = { date: point.date };

    // Calculate individual normalized values
    Object.keys(point).forEach((key) => {
      if (key !== "date" && point[key] !== null && point[key] !== undefined) {
        normalizedPoint[key] = (Number(point[key]) / baseValues[key]) * 100;
      }
    });

    // Calculate weighted total
    const weightedTotal = portfolio.holdings
      .filter((h) => h.symbol !== "CASH")
      .reduce((sum, holding) => {
        const symbol = holding.symbol;
        if (normalizedPoint[symbol] !== undefined) {
          const weight = holding.shares / totalInvestment;
          return sum + (normalizedPoint[symbol] as number) * weight;
        }
        return sum;
      }, 0);

    normalizedPoint.TOTAL = weightedTotal;

    return normalizedPoint;
  });
}

function StockCharts() {
  const [timeRange, setTimeRange] = useState("2y");
  const [activeItem, setActiveItem] = useState("");
  const [showAbsolute, setShowAbsolute] = useState(false);
  const [showTotal, setShowTotal] = useState(true);
  const [portfolio, setPortfolio] = useState<Portfolio>(() => {
    const saved = localStorage.getItem("portfolio");
    return saved
      ? JSON.parse(saved)
      : {
          holdings: [
            ...ETF_LIST.map((symbol) => ({
              symbol: symbol.replace(".AX", ""),
              shares: 0,
            })),
            { symbol: "CASH", shares: 0 },
          ],
          lastUpdated: new Date().toISOString(),
        };
  });

  const queries = useQueries({
    queries: ETF_LIST.map((symbol) => ({
      queryKey: ["stockData", symbol, timeRange],
      queryFn: () => fetchStockData(symbol, timeRange),
      staleTime: 5 * 60 * 1000,
    })),
  });

  const isLoading = queries.some((query) => query.isLoading);
  const isError = queries.some((query) => query.isError);

  if (isLoading) {
    return <div className="loading">Loading...</div>;
  }

  if (isError) {
    return <div className="error">Error loading data</div>;
  }

  // Process data for the charts
  const chartData = queries[0].data?.map((item, index) => {
    const dataPoint: ChartData = {
      date: format(fromUnixTime(item.timestamp), "MMM yyyy"),
    };

    queries.forEach((query, queryIndex) => {
      if (query.data?.[index]) {
        const symbol = ETF_LIST[queryIndex].replace(".AX", "");
        dataPoint[symbol] = query.data[index].close;
      }
    });

    return dataPoint;
  });

  const normalizedChartData = normalizeData(chartData || [], portfolio);

  // Get current prices for portfolio calculations
  const currentPrices: { [key: string]: number } = {};
  queries.forEach((query, index) => {
    if (query.data?.length) {
      const symbol = ETF_LIST[index];
      currentPrices[symbol] = query.data[query.data.length - 1].close;
    }
  });

  // Calculate min and max values for the normalized chart
  const yDomain = normalizedChartData.reduce(
    (acc, point) => {
      Object.entries(point).forEach(([key, value]) => {
        if (key !== "date" && typeof value === "number") {
          acc.min = Math.min(acc.min, value);
          acc.max = Math.max(acc.max, value);
        }
      });
      return acc;
    },
    { min: Infinity, max: -Infinity },
  );

  // Round the domain values to nearest integers
  const yMin = Math.floor(yDomain.min);
  const yMax = Math.ceil(yDomain.max);

  return (
    <div className="charts-container">
      <h2>ETF Performance</h2>
      <div className="time-range-selector">
        {["1m", "6m", "1y", "2y", "5y", "10y"].map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={timeRange === range ? "active" : ""}
          >
            {range}
          </button>
        ))}
      </div>

      <div className="chart-wrapper">
        <div className="chart-header">
          <h3>Relative Performance (Base: 100)</h3>
          <label className="total-line-toggle">
            <input
              type="checkbox"
              checked={showTotal}
              onChange={(e) => setShowTotal(e.target.checked)}
            />
            Show Portfolio Total
          </label>
        </div>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={normalizedChartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis domain={[yMin, yMax]} />
            <Tooltip
              formatter={(value: number, name: string) => [
                value.toFixed(2),
                name,
              ]}
            />
            <Legend
              onMouseEnter={(e) => {
                setActiveItem(e.dataKey);
              }}
              onMouseLeave={() => {
                setActiveItem("");
              }}
            />
            {ETF_LIST.map((symbol, index) => {
              const dataKey = symbol.replace(".AX", "");
              return (
                <Line
                  key={symbol}
                  type="monotone"
                  dataKey={dataKey}
                  stroke={COLORS[index]}
                  dot={false}
                  strokeWidth={activeItem === dataKey ? 3 : 1}
                  opacity={activeItem ? (activeItem === dataKey ? 1 : 0.3) : 1}
                />
              );
            })}
            {showTotal && (
              <Line
                type="monotone"
                dataKey="TOTAL"
                stroke="#000000"
                strokeWidth={2}
                dot={false}
                opacity={activeItem ? 0.3 : 1}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="absolute-performance">
        <button
          className="toggle-button"
          onClick={() => setShowAbsolute(!showAbsolute)}
        >
          {showAbsolute ? "Hide" : "Show"} Absolute Performance
        </button>

        {showAbsolute && (
          <div className="chart-wrapper">
            <h3>Absolute Performance</h3>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                {ETF_LIST.map((symbol, index) => (
                  <Line
                    key={symbol}
                    type="monotone"
                    dataKey={symbol.replace(".AX", "")}
                    stroke={COLORS[index]}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <PortfolioManager
        currentPrices={currentPrices}
        etfList={ETF_LIST}
        portfolio={portfolio}
        setPortfolio={setPortfolio}
      />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="dashboard">
        <h1>ETF Portfolio Dashboard</h1>
        <StockCharts />
      </div>
    </QueryClientProvider>
  );
}

export default App;
