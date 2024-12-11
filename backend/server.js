const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors()); // Enable CORS for all routes by default

// Example route: /api/stockdata?symbol=VAS.AX&range=2y&interval=1wk
app.get("/api/stockdata", async (req, res) => {
  const { symbol, range = "2y", interval = "1wk" } = req.query;

  if (!symbol) {
    return res.status(400).json({ error: "Symbol is required" });
  }

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      symbol,
    )}?range=${encodeURIComponent(range)}&interval=${encodeURIComponent(
      interval,
    )}`;
    const response = await axios.get(url);

    // Extract data
    const result = response.data.chart.result[0];
    const timestamps = result.timestamp;
    const closePrices = result.indicators.quote[0].close;

    const data = timestamps.map((timestamp, index) => ({
      timestamp,
      close: closePrices[index] || null,
    }));

    res.json(data);
  } catch (error) {
    console.error(`Error fetching data for ${symbol}:`, error.message);
    res.status(500).json({ error: "Failed to fetch data" });
  }
});

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Express server running on port ${PORT}`);
});
