export type Symbol = "BTC" | "ETH" | "XRP" | "SOL" | "BNB";

export interface TradeResponse {
  stream: string;
  data: {
    c: string; // close price
    E: number; // event time
  };
}