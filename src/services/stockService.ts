import axios from "axios";

const BACKEND_URL = "http://localhost:3001/api/stockdata";

export interface StockData {
  timestamp: number;
  close: number;
}

export const fetchStockData = async (
  symbol: string,
  range: string,
): Promise<StockData[]> => {
  const interval = range === "1m" ? "1d" : "1wk";

  try {
    const response = await axios.get(BACKEND_URL, {
      params: { symbol, range, interval },
    });

    return response.data;
  } catch (error) {
    console.error(`Error fetching data for ${symbol}:`, error);
    throw error;
  }
};
