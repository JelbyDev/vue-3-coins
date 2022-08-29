import { API_KEY } from '@/config';

type CallbackFunction = (newPrice: number) => void;

const AGGREGATE_INDEX = '5';
const tickersHandlers = new Map(); // {}
const socket = new WebSocket(`wss://streamer.cryptocompare.com/v2?api_key=${API_KEY}`);

socket.addEventListener('message', (e) => {
  const { TYPE: type, FROMSYMBOL: currency, PRICE: newPrice } = JSON.parse(e.data);
  if (type !== AGGREGATE_INDEX || newPrice === undefined) {
    return;
  }

  const handlers = tickersHandlers.get(currency) ?? [];
  handlers.forEach((fn: CallbackFunction) => fn(newPrice));
});

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

function subscribeToTickerOnWs(tickerName: string) {
  sendToWebSocket({
    action: 'SubAdd',
    subs: [`5~CCCAGG~${tickerName}~USD`],
  });
}

function unsubscribeFromTickerOnWs(tickerName: string) {
  sendToWebSocket({
    action: 'SubRemove',
    subs: [`5~CCCAGG~${tickerName}~USD`],
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
