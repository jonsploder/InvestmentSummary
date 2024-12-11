import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Portfolio } from "../types/portfolio";

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

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(value));
};

interface PortfolioManagerProps {
  currentPrices: { [key: string]: number };
  etfList: string[];
}

export function PortfolioManager({
  currentPrices,
  etfList,
}: PortfolioManagerProps) {
  const [portfolio, setPortfolio] = useState<Portfolio>(() => {
    const saved = localStorage.getItem("portfolio");
    return saved
      ? JSON.parse(saved)
      : {
          holdings: [
            ...etfList.map((symbol) => ({
              symbol: symbol.replace(".AX", ""),
              shares: 0,
            })),
            { symbol: "CASH", shares: 0 },
          ],
          lastUpdated: new Date().toISOString(),
        };
  });

  useEffect(() => {
    localStorage.setItem("portfolio", JSON.stringify(portfolio));
  }, [portfolio]);

  const handleSharesChange = (symbol: string, shares: number) => {
    setPortfolio((prev) => ({
      holdings: prev.holdings.map((holding) =>
        holding.symbol === symbol
          ? { ...holding, shares: Math.max(0, shares) }
          : holding,
      ),
      lastUpdated: new Date().toISOString(),
    }));
  };

  const pieData = portfolio.holdings
    .map((holding) => ({
      name: holding.symbol,
      value:
        holding.symbol === "CASH"
          ? holding.shares // For cash, shares = dollars
          : holding.shares * (currentPrices[holding.symbol + ".AX"] || 0),
    }))
    .filter((item) => item.value > 0);

  const totalValue = pieData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="portfolio-manager">
      <h2>Portfolio Management</h2>
      <div className="portfolio-content">
        <div className="holdings-table">
          <table>
            <thead>
              <tr>
                <th>ETF</th>
                <th>Units</th>
                <th>Price</th>
                <th>Value</th>
                <th>Weight</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.holdings.map((holding) => {
                const isCash = holding.symbol === "CASH";
                const currentPrice = isCash
                  ? 1
                  : currentPrices[holding.symbol + ".AX"] || 0;
                const value = holding.shares * currentPrice;
                const weight = totalValue ? (value / totalValue) * 100 : 0;

                return (
                  <tr key={holding.symbol}>
                    <td>{holding.symbol}</td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        value={holding.shares}
                        onChange={(e) =>
                          handleSharesChange(
                            holding.symbol,
                            parseInt(e.target.value) || 0,
                          )
                        }
                      />
                    </td>
                    <td>
                      {isCash ? "$1" : `$${formatCurrency(currentPrice)}`}
                    </td>
                    <td>${formatCurrency(value)}</td>
                    <td>{weight.toFixed(1)}%</td>
                  </tr>
                );
              })}
              <tr className="total-row">
                <td>Total</td>
                <td></td>
                <td></td>
                <td>${formatCurrency(totalValue)}</td>
                <td>100%</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="portfolio-chart">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({
                  cx,
                  cy,
                  midAngle,
                  innerRadius,
                  outerRadius,
                  value,
                  name,
                }) => {
                  const RADIAN = Math.PI / 180;
                  const radius = 25 + innerRadius + (outerRadius - innerRadius);
                  const x = cx + radius * Math.cos(-midAngle * RADIAN);
                  const y = cy + radius * Math.sin(-midAngle * RADIAN);
                  const percent = ((value / totalValue) * 100).toFixed(1);

                  return (
                    <text
                      x={x}
                      y={y}
                      fill="#666"
                      textAnchor={x > cx ? "start" : "end"}
                      dominantBaseline="central"
                    >
                      {`${name} (${percent}%)`}
                    </text>
                  );
                }}
              >
                {pieData.map((entry, index) => (
                  <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => `$${formatCurrency(value)}`}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
