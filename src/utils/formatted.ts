export function formattedPrice(price: number) {
  if (price === 0) return price;
  return price > 1 ? price.toFixed(2) : price.toPrecision(2);
}
