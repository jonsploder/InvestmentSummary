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

function normalizeData(data: ChartData[]): ChartData[] {
  const baseValues: { [key: string]: number } = {};

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
    Object.keys(point).forEach((key) => {
      if (key !== "date" && point[key] !== null && point[key] !== undefined) {
        normalizedPoint[key] = (Number(point[key]) / baseValues[key]) * 100;
      }
    });
    return normalizedPoint;
  });
}

function StockCharts() {
  const [timeRange, setTimeRange] = useState("2y");
  const [activeItem, setActiveItem] = useState("");

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

  const normalizedChartData = normalizeData(chartData || []);

  // Get current prices for portfolio calculations
  const currentPrices: { [key: string]: number } = {};
  queries.forEach((query, index) => {
    if (query.data?.length) {
      const symbol = ETF_LIST[index];
      currentPrices[symbol] = query.data[query.data.length - 1].close;
    }
  });

  return (
    <div className="charts-container">
      <h2>ETF Performance</h2>
      <div className="time-range-selector">
        {["1m", "6m", "1y", "2y", "5y"].map((range) => (
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
        <h3>Relative Performance (Base: 100)</h3>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={normalizedChartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis domain={[60, 140]} />
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
          </LineChart>
        </ResponsiveContainer>
      </div>

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

      <PortfolioManager currentPrices={currentPrices} etfList={ETF_LIST} />
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
