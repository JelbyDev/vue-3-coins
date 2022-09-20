<template>
  <section>
    <div class="flex">
      <div class="max-w-xs">
        <label for="wallet" class="block text-sm font-medium text-gray-700">Тикер</label>
        <div class="mt-1 relative rounded-md shadow-md">
          <input
            type="text"
            v-model="tickerName"
            @keydown.enter="addTicker"
            @input="changeErrorMessage('')"
            autocomplete="false"
            name="wallet"
            id="wallet"
            class="block w-full pr-10 border-gray-300 text-gray-900 focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm rounded-md"
            placeholder="Например DOGE"
          />
        </div>
        <div
          v-if="autocompletedTickers.length"
          class="flex bg-white shadow-md p-1 rounded-md flex-wrap"
        >
          <span
            v-for="aTicker in autocompletedTickers"
            :key="aTicker"
            @click="clickedOnAutocompleteTicker(aTicker)"
            class="inline-flex items-center px-2 m-1 rounded-md text-xs font-medium bg-gray-300 text-gray-800 cursor-pointer"
          >
            {{ aTicker }}
          </span>
        </div>
        <div v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</div>
      </div>
    </div>
    <button
      @click="addTicker"
      type="button"
      class="my-4 inline-flex items-center py-2 px-4 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-full text-white bg-gray-600 hover:bg-gray-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
    >
      <svg
        class="-ml-0.5 mr-2 h-6 w-6"
        xmlns="http://www.w3.org/2000/svg"
        width="30"
        height="30"
        viewBox="0 0 24 24"
        fill="#ffffff"
      >
        <path
          d="M13 7h-2v4H7v2h4v4h2v-4h4v-2h-4V7zm-1-5C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"
        ></path>
      </svg>
      Добавить
    </button>
  </section>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { TickerInfoFromAllTickers } from '@/types';

export default defineComponent({
  name: 'add-ticker',
  props: {
    allTickers: {
      type: Array,
      required: false,
      default: () => [],
    },
    errorMessage: {
      type: String,
      required: false,
      default: '',
    },
  },
  data() {
    return {
      tickerName: '',
      errorDoubleTicker: false,
    };
  },
  emits: {
    'add-ticker': (value: string) => typeof value === 'string' && value.length > 0,
    'change-error-message': (value: string) => typeof value === 'string',
  },
  methods: {
    addTicker(): void {
      if (this.tickerName.length === 0) return;
      this.$emit('add-ticker', this.tickerName);
      this.tickerName = '';
    },
    clickedOnAutocompleteTicker(tickerName: string): void {
      this.tickerName = tickerName;
      this.addTicker();
    },
    changeErrorMessage(message: string): void {
      this.$emit('change-error-message', message);
    },
  },
  computed: {
    autocompletedTickers(): Array<string> {
      if (!this.tickerName) return [];
      return (this.allTickers as Array<TickerInfoFromAllTickers>)
        .filter(
          (ticker) =>
            ticker.Symbol.toLocaleLowerCase().includes(this.tickerName.toLocaleLowerCase()) ||
            ticker.FullName.toLocaleLowerCase().includes(this.tickerName.toLocaleLowerCase())
        )
        .map((ticker) => ticker.Symbol)
        .slice(0, 4);
    },
  },
});
</script>

<style scoped></style>
