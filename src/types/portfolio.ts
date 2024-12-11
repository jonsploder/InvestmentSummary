export interface PortfolioHolding {
  symbol: string;
  shares: number;
  currentPrice?: number;
}

export interface Portfolio {
  holdings: PortfolioHolding[];
  lastUpdated: string;
}
