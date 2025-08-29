export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface CandleResponse {
  asset: string;
  duration: string;
  startTime: string;
  endTime: string;
  candles: CandleData[];
}

export type TimeFrame = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';