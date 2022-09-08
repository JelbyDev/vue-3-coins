export interface TickerInfoFromAllTickers {
  Id: number;
  ImageUrl: string;
  Symbol: string;
  FullName: string;
}

export interface TrackedTickerInfo {
  name: string;
  price: number;
  invalid: boolean;
}
