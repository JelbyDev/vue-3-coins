<template>
  <div class="container mx-auto flex flex-col items-center bg-gray-100 p-4">
    <div
      v-if="isAppLoading"
      class="fixed w-100 h-100 opacity-80 bg-purple-800 inset-0 z-50 flex items-center justify-center"
    >
      <svg
        class="animate-spin -ml-1 mr-3 h-12 w-12 text-white"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          class="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          stroke-width="4"
        ></circle>
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
      </svg>
    </div>
    <div class="container">
      <add-ticker
        :all-tickers="allTickers"
        :error-message="errorMessageByAddTicker"
        @add-ticker="addTrackedTicker"
        @change-error-message="changeErrorMessageByAddTicker"
      />
      <hr class="w-full border-t border-gray-600 my-4" />
      <input
        type="text"
        v-model="searchQuery"
        placeholder="Поиск..."
        class="block w-full pr-10 border-gray-300 text-gray-900 focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm rounded-md"
      />
      <hr class="w-full border-t border-gray-600 my-4" />

      <dl v-if="paginatedTickers.length" class="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div
          v-for="ticker in paginatedTickers"
          :key="ticker.name"
          @click="changeSelectedTicker(ticker.name)"
          :class="{
            'border-purple-800': ticker.name === selectedTicker,
          }"
          class="bg-white overflow-hidden shadow rounded-lg border-4 border-transparent border-solid cursor-pointer"
        >
          <div
            class="px-4 py-5 sm:p-6 text-center"
            :class="{
              'bg-red-100': ticker.invalid,
            }"
          >
            <dt class="text-sm font-medium text-gray-500 truncate">{{ ticker.name }} - USD</dt>
            <dd class="mt-1 text-3xl font-semibold text-gray-900">
              {{ formattedPrice(ticker.price) }}
            </dd>
          </div>
          <div class="w-full border-t border-gray-200"></div>
          <button
            @click.stop="removeTrackedTicker(ticker.name)"
            class="flex items-center justify-center font-medium w-full bg-gray-100 px-4 py-4 sm:px-6 text-md text-gray-500 hover:text-gray-600 hover:bg-gray-200 hover:opacity-20 transition-all focus:outline-none"
          >
            <svg
              class="h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="#718096"
              aria-hidden="true"
            >
              <path
                fill-rule="evenodd"
                d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                clip-rule="evenodd"
              ></path>
            </svg>
            Удалить
          </button>
        </div>
      </dl>
      <div v-else class="text-center font-bold mt-5 text-xl">Нет отслеживаемых тикеров</div>
      <hr class="w-full border-t border-gray-600 my-4" />

      <div>
        <button
          v-if="currentPage > 1 && totalPages > 1"
          @click="decrementCurrentPage"
          class="mx-2 inline-flex items-center py-2 px-4 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-full text-white bg-gray-600 hover:bg-gray-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
        >
          Предыдущая страница
        </button>
        <button
          v-if="currentPage < totalPages"
          @click="incrementCurrentPage"
          class="max-2 inline-flex items-center py-2 px-4 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-full text-white bg-gray-600 hover:bg-gray-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
        >
          Следующая страница
        </button>
      </div>

      <chart-prices
        v-if="selectedTicker"
        :selected-ticker="selectedTicker"
        :chart-prices="normalizedChartPrices"
        @close-chart="changeSelectedTicker('')"
        @change-max-chart-elements="changeMaxChartPricesElements"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { getTickets } from '@/api/Tickers';
import { subscribeToTicker, unsubscribeFromTicker } from '@/api/TickerSubscribe';
import { defineComponent } from 'vue';
import { LIMIT_TRACKED_TICKERS_ON_PAGE } from '@/config/constants';
import { TickerInfoFromAllTickers, TrackedTickerInfo } from '@/types';

import { formattedPrice } from '@/utils/formatted';

import AddTicker from '@/components/AddTicker.vue';
import ChartPrices from '@/components/ChartPrices.vue';

export default defineComponent({
  components: { AddTicker, ChartPrices },
  data() {
    return {
      isAppLoading: true,
      allTickers: [] as Array<TickerInfoFromAllTickers>,

      errorMessageByAddTicker: '',

      selectedTicker: '',
      trackedTickers: [] as Array<TrackedTickerInfo>,
      chartPrices: [] as Array<number>,
      maxChartPricesElements: 1,

      searchQuery: '',
      currentPage: 1,
      totalPages: 1,

      formattedPrice: formattedPrice,

      //broadcastChannel: new BroadcastChannel('socket-channel'),
    };
  },
  mounted() {
    const windowSearchParams = Object.fromEntries(
      new URL(window.location.href).searchParams.entries()
    );
    if (windowSearchParams.search) this.searchQuery = windowSearchParams.search;
    if (windowSearchParams.page) this.currentPage = +windowSearchParams.page;

    const localTrackedTickers = window.localStorage.getItem('trackedTickers');
    if (localTrackedTickers) {
      this.trackedTickers = JSON.parse(localTrackedTickers);
      this.trackedTickers.forEach((ticker) => {
        subscribeToTicker(ticker.name, (newPrice: number) => {
          this.updateTrackedTicker(ticker.name, newPrice);
        });
      });
    }

    this.setAllTickers();

    //this.broadcastChannel.addEventListener('message', (event) => {
    //  const trackedTickers = JSON.parse(event.data);
    //  this.trackedTickers = [...trackedTickers];
    //});
    //window.addEventListener('storage', (event) => {
    //  console.log(window.localStorage.getItem('trackedTickers'));
    //});
  },
  methods: {
    addTrackedTicker(tickerName: string): void | boolean {
      if (
        this.trackedTickers.find(
          (element) => element.name.toLocaleLowerCase() === tickerName.toLocaleLowerCase()
        )
      ) {
        this.errorMessageByAddTicker = 'Такой тикер уже добавлен';
        return false;
      }

      const currentTicker = { name: tickerName, price: 0, invalid: false };
      this.trackedTickers = [...this.trackedTickers, currentTicker];

      subscribeToTicker(currentTicker.name, (newPrice: number) =>
        this.updateTrackedTicker(currentTicker.name, newPrice)
      );
    },
    updateTrackedTicker(tickerName: string, price: number) {
      const foundTicker = this.trackedTickers.find((ticker) => tickerName === ticker.name);
      if (foundTicker) {
        foundTicker.price = price;
        if (!price) foundTicker.invalid = true;
        if (this.selectedTicker && this.selectedTicker === foundTicker.name) {
          this.updateChartPrices(price);
        }
      }
    },
    removeTrackedTicker(tickerName: string): void {
      this.trackedTickers = this.trackedTickers.filter((ticker) => ticker.name != tickerName);
      if (this.selectedTicker === tickerName) this.selectedTicker = '';
      unsubscribeFromTicker(tickerName);
    },
    changeSelectedTicker(tickerName: string): void {
      this.selectedTicker = tickerName;
    },
    async setAllTickers() {
      try {
        await getTickets().then((resolve) => (this.allTickers = resolve));
      } catch (error) {
        console.log(error);
      } finally {
        this.isAppLoading = false;
      }
    },
    updateChartPrices(price?: number) {
      if (price) this.chartPrices = [...this.chartPrices, price];

      if (this.chartPrices.length >= this.maxChartPricesElements) {
        const startChartPricesIndex = this.chartPrices.length - this.maxChartPricesElements;
        this.chartPrices = [
          ...this.chartPrices.slice(startChartPricesIndex, this.chartPrices.length),
        ];
      }
    },
    incrementCurrentPage() {
      this.currentPage += 1;
    },
    decrementCurrentPage() {
      this.currentPage -= 1;
    },
    changeTotalPages() {
      this.totalPages = Math.ceil(this.searchedTickers.length / LIMIT_TRACKED_TICKERS_ON_PAGE);
    },
    changeErrorMessageByAddTicker(message: string): void {
      this.errorMessageByAddTicker = message;
    },
    changeMaxChartPricesElements(value: number) {
      this.maxChartPricesElements = value;
    },
  },
  watch: {
    maxChartPricesElements() {
      this.updateChartPrices();
    },
    selectedTicker() {
      this.chartPrices = [];
    },
    urlQueryParams() {
      window.history.pushState(
        null,
        document.title,
        `${window.location.pathname}?search=${this.searchQuery}&page=${this.currentPage}`
      );
    },
    searchQuery() {
      this.currentPage = 1;
    },
    trackedTickers() {
      this.changeTotalPages();
      window.localStorage.setItem('trackedTickers', JSON.stringify(this.trackedTickers));
      //this.broadcastChannel.postMessage(JSON.stringify(this.trackedTickers));
    },
    searchedTickers() {
      this.changeTotalPages();
    },
  },
  computed: {
    urlQueryParams(): { search: string; page: number } {
      return {
        search: this.searchQuery,
        page: this.currentPage,
      };
    },
    searchedTickers(): Array<TrackedTickerInfo> {
      return this.trackedTickers.filter((ticker) =>
        ticker.name.toLocaleLowerCase().includes(this.searchQuery.toLocaleLowerCase())
      );
    },
    paginatedTickers(): Array<TrackedTickerInfo> {
      return this.searchedTickers.slice(this.startPaginatedIndex, this.endPaginatedIndex);
    },
    startPaginatedIndex(): number {
      return (this.currentPage - 1) * LIMIT_TRACKED_TICKERS_ON_PAGE;
    },
    endPaginatedIndex(): number {
      return this.currentPage * LIMIT_TRACKED_TICKERS_ON_PAGE;
    },
    normalizedChartPrices(): Array<number> {
      const maxValue = Math.max(...this.chartPrices);
      const minValue = Math.min(...this.chartPrices);

      if (maxValue === minValue) return this.chartPrices.map(() => 50);

      return this.chartPrices.map((price) => 5 + ((price - minValue) * 95) / (maxValue - minValue));
    },
  },
});
</script>

<style></style>
