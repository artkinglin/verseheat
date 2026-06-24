import { scaleLinear } from 'd3-scale';

const heatScale = scaleLinear()
  .domain([1, 5.5, 10])
  .range(['#d73027', '#fee08b', '#1a9850'])
  .clamp(true);

export function heatColor(score) {
  if (!score) return '#d1d5db';
  return heatScale(score);
}

export function scoreLabel(score) {
  return score ? Number(score).toFixed(1) : 'Unrated';
}

export function referenceLabel(item) {
  if (!item) return '';
  return `${item.bookName || item.name} ${item.chapter}${item.verse ? `:${item.verse}` : ''}`;
}
