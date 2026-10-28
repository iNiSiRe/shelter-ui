<script setup>
  import {computed, nextTick, onUnmounted, ref, watch} from "vue";
  import uPlot from "uplot";
  import "uplot/dist/uPlot.min.css";
  import Device from "../Device.vue";
  import List from "../properties/List.vue";
  import Item from "../properties/Item.vue";
  import Section from "../properties/Section.vue";
  import LastUpdate from "../properties/LastUpdate.vue";
  import {outdoorAirLevel} from "../../air";

  const props = defineProps({
    item: Object,
    device: Object
  });

  // WMO weather codes, as Open-Meteo reports them.
  const CODES = [
    [0, 'Ясно'], [1, 'Переважно ясно'], [2, 'Мінлива хмарність'], [3, 'Хмарно'], [48, 'Туман'],
    [57, 'Мряка'], [67, 'Дощ'], [77, 'Сніг'], [82, 'Злива'], [86, 'Снігопад'], [99, 'Гроза'],
  ];
  const describe = (code) => code === null || code === undefined ? '—' : (CODES.find(([max]) => code <= max) ?? [0, '—'])[1];

  const p = computed(() => props.device.properties);
  const air = computed(() => p.value.air ? outdoorAirLevel(p.value.air.aqi) : null);
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
          {label: 'Час', value: (u, v) => v === null ? '—' : clock(v * 1000)},
          {label: 'Надворі', stroke: '#199e70', width: 2, points: {show: false}, value: (u, v) => v === null ? '—' : `${v.toFixed(1)}°`},
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
        <span>{{ round(p.temperature) }}</span>
        <span class="opacity-70">· {{ describe(p.code) }}</span>
      </template>
      <span v-else>Немає прогнозу</span>
    </template>

    <template #action>
    </template>

    <template #extended>
      <div v-if="p.temperature !== null && p.temperature !== undefined" class="rounded-[22px] bg-[color:var(--group)] px-5 py-4">
        <div class="flex items-end justify-between gap-3">
          <span class="text-[56px] font-light leading-none tracking-tight">{{ round(p.temperature) }}</span>
          <div class="pb-1 text-right text-[15px] leading-snug">
            <p class="font-semibold">{{ describe(p.code) }}</p>
            <p class="text-[color:var(--ink-2)]">відчувається {{ round(p.feelsLike) }}</p>
            <p class="text-[color:var(--ink-2)]">сьогодні {{ range(p.today) }}</p>
          </div>
        </div>
      </div>

      <Section name="Зараз">
        <List>
          <Item label="Вологість"><span>{{ p.humidity ?? '—' }}%</span></Item>
          <Item label="Вітер"><span>{{ p.wind ?? '—' }} км/год</span></Item>
        </List>
      </Section>

      <Section v-if="p.air" name="Повітря надворі">
        <List>
          <Item label="Якість">
            <span class="inline-flex items-center gap-1.5">
              <span class="h-2 w-2 flex-none rounded-full" :style="{background: `rgb(${air.rgb})`}"></span>{{ air.word }} · індекс {{ p.air.aqi }}
            </span>
          </Item>
          <Item label="PM2.5"><span>{{ Math.round(p.air.pm25) }} мкг/м³</span></Item>
          <Item label="PM10"><span>{{ Math.round(p.air.pm10) }} мкг/м³</span></Item>
        </List>
        <p class="mt-1.5 px-4 text-[12px] text-[color:var(--ink-3)]">Оцінка моделі CAMS для району, не вимір біля будинку.</p>
      </Section>

      <Section name="Наступні 24 години">
        <div ref="chartEl" class="w-full"></div>
      </Section>

      <Section name="Дні">
        <List>
          <Item label="Сьогодні"><span class="whitespace-nowrap">{{ range(p.today) }} · {{ describe(p.today?.code) }}</span></Item>
          <Item label="Завтра"><span class="whitespace-nowrap">{{ range(p.tomorrow) }} · {{ describe(p.tomorrow?.code) }}</span></Item>
          <Item label="Оновлено" v-if="p.updatedAt"><LastUpdate :timestamp="p.updatedAt"></LastUpdate></Item>
        </List>
      </Section>
    </template>
  </Device>
</template>

<style scoped>
</style>
