<script setup>
  import {computed, nextTick, onUnmounted, ref, watch} from "vue";
  import uPlot from "uplot";
  import "uplot/dist/uPlot.min.css";
  import Device from "../Device.vue";
  import List from "../properties/List.vue";
  import Item from "../properties/Item.vue";
  import Section from "../properties/Section.vue";
  import LastUpdate from "../properties/LastUpdate.vue";

  const props = defineProps({
    item: Object,
    device: Object
  });

  // WMO weather codes, as Open-Meteo reports them.
  const CODES = [
    [0, 'Clear'], [1, 'Mostly clear'], [2, 'Partly cloudy'], [3, 'Overcast'], [48, 'Fog'],
    [57, 'Drizzle'], [67, 'Rain'], [77, 'Snow'], [82, 'Showers'], [86, 'Snow showers'], [99, 'Thunderstorm'],
  ];
  const describe = (code) => code === null || code === undefined ? '—' : (CODES.find(([max]) => code <= max) ?? [0, '—'])[1];

  const p = computed(() => props.device.properties);
  const round = (value) => value === null || value === undefined ? '—' : `${Math.round(value)}°`;
  const range = (day) => day ? `${round(day.min)} … ${round(day.max)}` : '—';

  const pad = (value) => String(value).padStart(2, '0');
  const clock = (time) => `${pad(new Date(time).getHours())}:${pad(new Date(time).getMinutes())}`;

  const extended = ref(false);
  const chartEl = ref(null);
  let chart = null;

  function draw() {
    chart?.destroy();
    chart = null;
    const hourly = p.value.hourly ?? [];
    if (!extended.value || hourly.length === 0) {
      return;
    }

    nextTick(() => {
      if (!chartEl.value) return;
      chart = new uPlot({
        width: Math.max(260, chartEl.value.clientWidth),
        height: 150,
        scales: {x: {time: true}},
        series: [
          {value: (u, v) => v === null ? '—' : clock(v * 1000)},
          {label: 'Outside', stroke: '#199e70', width: 2, points: {show: false}, value: (u, v) => v === null ? '—' : `${v.toFixed(1)}°`},
        ],
        axes: [
          {stroke: '#898781', grid: {stroke: '#2c2c2a', width: 1}, ticks: {stroke: '#383835', width: 1},
            values: (u, ticks) => ticks.map(tick => clock(tick * 1000))},
          {stroke: '#898781', grid: {stroke: '#2c2c2a', width: 1}, ticks: {stroke: '#383835', width: 1}, size: 48, space: 24,
            values: (u, ticks) => ticks.map(tick => `${tick}°`)},
        ],
        cursor: {points: {size: 8, width: 2, stroke: '#121217'}},
        legend: {show: false},
      }, [hourly.map(point => point.t / 1000), hourly.map(point => point.temp)], chartEl.value);
    });
  }

  watch(() => [p.value.hourly, extended.value], draw);
  onUnmounted(() => chart?.destroy());
</script>

<template>
  <Device accent="sky" @open="extended = true" @close="extended = false">
    <template #icon>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="24" cy="24" r="11" fill="#f5c542"/><path fill="#a4c9ff" d="M22 52h26a10 10 0 0 0 0-20 13 13 0 0 0-25-2A10 10 0 0 0 22 52z"/><path fill="#4671c6" d="M22 52h26a10 10 0 0 0 4-19.2A10 10 0 0 1 44 48H22a10 10 0 0 1-7.7-3.6A10 10 0 0 0 22 52z"/></svg>
    </template>

    <template #title>
      {{ item.name }}
    </template>

    <template #status>
      <template v-if="p.temperature !== null && p.temperature !== undefined">
        <span class="pill pill-accent"><span class="pill-dot"></span>{{ round(p.temperature) }}</span>
        <span>{{ describe(p.code) }}</span>
        <span>tomorrow {{ range(p.tomorrow) }}</span>
      </template>
      <span v-else class="pill pill-muted">no forecast</span>
    </template>

    <template #action>
    </template>

    <template #extended>
      <Section name="Now">
        <List>
          <Item label="Temperature"><span>{{ round(p.temperature) }}</span></Item>
          <Item label="Feels like"><span>{{ round(p.feelsLike) }}</span></Item>
          <Item label="Sky"><span>{{ describe(p.code) }}</span></Item>
          <Item label="Humidity"><span>{{ p.humidity ?? '—' }}%</span></Item>
          <Item label="Wind"><span>{{ p.wind ?? '—' }} km/h</span></Item>
        </List>
      </Section>

      <Section name="Next 24 hours">
        <div ref="chartEl" class="w-full"></div>
      </Section>

      <Section name="Days">
        <List>
          <Item label="Today"><span>{{ range(p.today) }} · {{ describe(p.today?.code) }}</span></Item>
          <Item label="Tomorrow"><span>{{ range(p.tomorrow) }} · {{ describe(p.tomorrow?.code) }}</span></Item>
          <Item label="Updated" v-if="p.updatedAt"><LastUpdate :timestamp="p.updatedAt"></LastUpdate></Item>
        </List>
      </Section>
    </template>
  </Device>
</template>

<style scoped>
</style>
