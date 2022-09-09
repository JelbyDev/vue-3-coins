import { WEB_SOCKET_URL } from '@/config/constants';

type CallbackFunction = (newPrice: number) => void;

const RESPONSE_INDEX = {
  PRICE_UPDATE: '5',
  INVALID: '500',
};
const MAIN_CURSE_NAME = 'USD';
const RESERVE_CURSE_NAME = 'BTC';
let RESERVE_CURSE_FROM_MAIN_CURSE = 0;

const tickersHandlers = new Map();
const socket = new WebSocket(WEB_SOCKET_URL);

const channel = new BroadcastChannel('socket-channel');
channel.addEventListener('message', (event) => {
  const tickerInfo = JSON.parse(event.data);
  updatedTickerPrice(tickerInfo.tickerName, tickerInfo.newPrice);
});

socket.addEventListener('open', () => {
  subscribeToTicker(RESERVE_CURSE_NAME, (newPrice) => (RESERVE_CURSE_FROM_MAIN_CURSE = newPrice));
});

socket.addEventListener('message', (e) => {
  const socketDataParse = JSON.parse(e.data);
  const { TYPE: type, MESSAGE: message, PARAMETER: subsName, TOSYMBOL: currency } = socketDataParse;
  let { PRICE: newPrice, FROMSYMBOL: tickerName } = socketDataParse;

  switch (type) {
    case RESPONSE_INDEX.PRICE_UPDATE:
      if (newPrice === undefined) return;
      if (currency === RESERVE_CURSE_NAME) newPrice *= RESERVE_CURSE_FROM_MAIN_CURSE;
      break;
    case RESPONSE_INDEX.INVALID: {
      if (message !== 'INVALID_SUB') return;
      tickerName = getTickerNameFromInvalidSocketMessage(subsName);
      if (subsName.includes(`~${MAIN_CURSE_NAME}`)) {
        unsubscribeFromTickerOnWs(tickerName);
        subscribeToTickerOnWs(tickerName, RESERVE_CURSE_NAME);
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

  channel.postMessage(JSON.stringify({ tickerName, newPrice }));
  updatedTickerPrice(tickerName, newPrice);
});

function updatedTickerPrice(tickerName: string, newPrice: number) {
  const handlers = tickersHandlers.get(tickerName) ?? [];
  handlers.forEach((fn: CallbackFunction) => fn(newPrice));
}

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

function subscribeToTickerOnWs(tickerName: string, currency = MAIN_CURSE_NAME) {
  sendToWebSocket({
    action: 'SubAdd',
    subs: [`5~CCCAGG~${tickerName}~${currency}`],
  });
}

function unsubscribeFromTickerOnWs(tickerName: string, currency = MAIN_CURSE_NAME) {
  if (tickerName === RESERVE_CURSE_NAME) return;
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
