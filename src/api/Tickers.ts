import $axiosInstance from '@/axios';
import { TickerInfoFromAllTickers } from '@/types';

export async function getTickets(): Promise<Array<TickerInfoFromAllTickers>> {
  const response = await $axiosInstance.get('/data/all/coinlist?summary=true');
  return Object.values(response.data.Data);
}
