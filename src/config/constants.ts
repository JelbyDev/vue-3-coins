export const API_URL = 'https://min-api.cryptocompare.com';
export const API_KEY = process.env.VUE_APP_API_KEY;
export const WEB_SOCKET_URL = `wss://streamer.cryptocompare.com/v2?api_key=${API_KEY}`;
export const LIMIT_TRACKED_TICKERS_ON_PAGE = 10;
