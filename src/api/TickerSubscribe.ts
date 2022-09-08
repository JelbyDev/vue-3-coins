import { WEB_SOCKET_URL } from '@/config/constants';

type CallbackFunction = (newPrice: number) => void;

const PRICE_UPDATE_INDEX = '5';
const TICKER_INVALID_INDEX = '500';
let PriceBtcToUsd = 0;
const tickersHandlers = new Map();
const socket = new WebSocket(WEB_SOCKET_URL);

socket.addEventListener('open', () => {
  subscribeToTicker('BTC', (newPrice) => (PriceBtcToUsd = newPrice));
});

socket.addEventListener('message', (e) => {
  const socketDataParse = JSON.parse(e.data);
  const { TYPE: type, MESSAGE: message, PARAMETER: subsName } = socketDataParse;
  let { PRICE: newPrice, FROMSYMBOL: tickerName } = socketDataParse;

  switch (type) {
    case PRICE_UPDATE_INDEX:
      if (newPrice === undefined) return;
      if (subsName && subsName.includes('~BTC')) newPrice *= PriceBtcToUsd;
      break;
    case TICKER_INVALID_INDEX: {
      if (message !== 'INVALID_SUB') return;
      tickerName = getTickerNameFromInvalidSocketMessage(subsName);
      if (subsName.includes('~USD')) {
        unsubscribeFromTickerOnWs(tickerName);
        subscribeToTickerOnWs(tickerName, 'BTC');
        return;
      } else {
        newPrice = 0;
      }
      break;
    }
    default:
      return;
      break;
  }

  const handlers = tickersHandlers.get(tickerName) ?? [];
  handlers.forEach((fn: CallbackFunction) => fn(newPrice));
});

function getTickerNameFromInvalidSocketMessage(subsName: string): string {
  const subsNameArr = subsName.split('~');
  return subsNameArr[2];
}

interface IMessageSentViaWS {
  action: string;
  subs: Array<string>;
}
function sendToWebSocket(message: IMessageSentViaWS) {
  const stringifiedMessage = JSON.stringify(message);

  if (socket.readyState === WebSocket.OPEN) {
    socket.send(stringifiedMessage);
    return;
  }

  socket.addEventListener(
    'open',
    () => {
      socket.send(stringifiedMessage);
    },
    { once: true }
  );
}

function subscribeToTickerOnWs(tickerName: string, currency = 'USD') {
  sendToWebSocket({
    action: 'SubAdd',
    subs: [`5~CCCAGG~${tickerName}~${currency}`],
  });
}

function unsubscribeFromTickerOnWs(tickerName: string, currency = 'USD') {
  sendToWebSocket({
    action: 'SubRemove',
    subs: [`5~CCCAGG~${tickerName}~${currency}`],
  });
}

export const subscribeToTicker = (tickerName: string, cb: CallbackFunction) => {
  const subscribers = tickersHandlers.get(tickerName) || [];
  tickersHandlers.set(tickerName, [...subscribers, cb]);
  subscribeToTickerOnWs(tickerName);
};

export const unsubscribeFromTicker = (tickerName: string) => {
  tickersHandlers.delete(tickerName);
  unsubscribeFromTickerOnWs(tickerName);
};
