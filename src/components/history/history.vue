<script setup>
  import {computed, nextTick, onMounted, onUnmounted, reactive, ref, watch} from "vue";
  import uPlot from "uplot";
  import "uplot/dist/uPlot.min.css";
  import Device from "../Device.vue";
  import Section from "../properties/Section.vue";

  const props = defineProps({
    item: Object,
    device: Object
  });

  // The Guard samples every 5 min and serves them on its own port.
  const HISTORY_URL = `${location.protocol}//${location.hostname}:8090/history`;
  const REFRESH = 5 * 60_000;

  const RANGES = [
    {hours: 24, label: '24 h'},
    {hours: 72, label: '3 days'},
    {hours: 168, label: '7 days'},
    {hours: 720, label: '30 days'},
  ];

  // One colour per room, whichever chart it shows up in. Validated as sets (dark surface
  // #121217, all pairs): air = blue / orange / aqua, floors = blue / magenta / yellow.
  const COLORS = {
    kitchen: '#3987e5',
    bedroom: '#d95926',
    outdoor: '#199e70',
    bathroom: '#d55181',
    balcony: '#c98500',
    charge: '#008300',
    load: '#9085e9',
  };
  const INK = {secondary: '#c3c2b7', muted: '#898781', grid: '#2c2c2a', axis: '#383835'};
  const MAINS_OFF = '#ec835a';    // status "serious", always with its label

  const AIR = [['room_kitchen', 'Kitchen', COLORS.kitchen], ['room_bedroom', 'Bedroom', COLORS.bedroom], ['outdoor', 'Outside', COLORS.outdoor]];
  const FLOORS = [['kitchen', 'Kitchen', COLORS.kitchen], ['bathroom', 'Bathroom', COLORS.bathroom], ['balcony', 'Balcony', COLORS.balcony]];

  const state = reactive({hours: 24, samples: [], power: {}, loading: false, error: null, table: false});
  const extended = ref(false);

  const charts = [];
  const airEl = ref(null), floorEl = ref(null), chargeEl = ref(null), loadEl = ref(null), lanesEl = ref(null);
  const lanesWidth = ref(320);
  const hover = ref(null);

  async function load() {
    state.loading = true;
    try {
      const response = await fetch(`${HISTORY_URL}?hours=${state.hours}`);
      const body = await response.json();
      state.samples = body.samples ?? [];
      state.power = body.power ?? {};
      state.error = null;
    } catch (error) {
      state.error = 'The Guard does not answer';
    } finally {
      state.loading = false;
    }
  }

  let timer = null;
  onMounted(() => {
    load();
    timer = setInterval(load, REFRESH);
  });
  onUnmounted(() => {
    clearInterval(timer);
    charts.forEach(chart => chart.destroy());
  });

  const series = (key) => state.samples.map(sample => sample[key] ?? null);
  const times = computed(() => state.samples.map(sample => sample.t / 1000));

  // How long each sample stands for: up to the previous one, capped so a gap in the data does
  // not count as heating.
  const spans = computed(() => {
    const samples = state.samples;
    const typical = samples.length > 1 ? (samples[samples.length - 1].t - samples[0].t) / (samples.length - 1) : 5 * 60_000;
    return samples.map((sample, index) => index === 0 ? typical : Math.min(sample.t - samples[index - 1].t, typical * 2));
  });

  const isNight = (time) => {
    const hour = new Date(time).getHours();
    return hour >= 23 || hour < 7;
  };

  // Per floor: hours heated, kWh, and the night-tariff share of those kWh.
  const heating = computed(() => FLOORS.map(([room, label, color]) => {
    let hours = 0, night = 0;
    state.samples.forEach((sample, index) => {
      const heated = (sample[`heat_${room}`] ?? 0) * spans.value[index] / 3_600_000;
      hours += heated;
      if (isNight(sample.t)) {
        night += heated;
      }
    });
    const power = state.power[room] ?? null;
    return {
      room, label, color, hours, power,
      kwh: power === null ? null : hours * power / 1000,
      nightShare: hours > 0 ? night / hours : null,
    };
  }));

  const today = computed(() => {
    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);
    let hours = 0;
    state.samples.forEach((sample, index) => {
      if (sample.t >= midnight.getTime()) {
        FLOORS.forEach(([room]) => hours += (sample[`heat_${room}`] ?? 0) * spans.value[index] / 3_600_000);
      }
    });
    return hours;
  });

  const latest = computed(() => state.samples[state.samples.length - 1] ?? null);

  const format = (value, digits = 1) => value === null || value === undefined ? '—' : value.toFixed(digits);
  const pad = (value) => String(value).padStart(2, '0');
  const clock = (time) => `${pad(new Date(time).getHours())}:${pad(new Date(time).getMinutes())}`;
  const dayClock = (time) => `${new Date(time).toLocaleDateString([], {weekday: 'short'})} ${clock(time)}`;
  const date = (time) => `${pad(new Date(time).getDate())}.${pad(new Date(time).getMonth() + 1)}`;

  // 24-hour time ticks, or dates once the range spans days.
  const timeTicks = (u, ticks) => {
    const span = (u.scales.x.max - u.scales.x.min) * 1000;
    return ticks.map(tick => span > 2 * 24 * 3_600_000 ? date(tick * 1000)
      : new Date(tick * 1000).getHours() === 0 ? date(tick * 1000) : clock(tick * 1000));
  };

  // Out of hover the legend reads the latest values rather than dashes.
  const showLatest = (u) => {
    if (u.cursor.idx === null || u.cursor.idx === undefined) {
      u.setLegend({idx: u.data[0].length - 1});
    }
  };

  function lineChart(el, defs, unit, range) {
    const width = Math.max(260, el.clientWidth);
    return new uPlot({
      width,
      height: 170,
      scales: {x: {time: true}, y: range ? {range} : {}},
      series: [
        {value: (u, v) => v === null ? '—' : dayClock(v * 1000)},
        ...defs.map(([key, label, color]) => ({
          label,
          stroke: color,
          width: 2,
          points: {show: false},
          value: (u, v) => v === null ? '—' : `${v.toFixed(unit === '%' || unit === ' W' ? 0 : 1)}${unit}`,
        })),
      ],
      axes: [
        {stroke: INK.muted, grid: {stroke: INK.grid, width: 1}, ticks: {stroke: INK.axis, width: 1}, values: timeTicks},
        {stroke: INK.muted, grid: {stroke: INK.grid, width: 1}, ticks: {stroke: INK.axis, width: 1}, size: 56,
          values: (u, ticks) => ticks.map(tick => `${tick}${unit}`)},
      ],
      cursor: {sync: {key: 'history'}, points: {size: 8, width: 2, stroke: '#121217'}},
      legend: {live: true},
      hooks: {ready: [showLatest], setCursor: [showLatest]},
    }, [times.value, ...defs.map(([key]) => series(key))], el);
  }

  function draw() {
    charts.forEach(chart => chart.destroy());
    charts.length = 0;
    if (!extended.value || state.samples.length === 0) {
      return;
    }

    nextTick(() => {
      if (airEl.value) charts.push(lineChart(airEl.value, AIR, '°'));
      if (floorEl.value) charts.push(lineChart(floorEl.value, FLOORS.map(([room, label, color]) => [`floor_${room}`, label, color]), '°'));
      if (chargeEl.value) charts.push(lineChart(chargeEl.value, [['soc', 'Charge', COLORS.charge]], '%', [0, 100]));
      if (loadEl.value) charts.push(lineChart(loadEl.value, [['load', 'Backup socket', COLORS.load]], ' W'));
      if (lanesEl.value) lanesWidth.value = Math.max(260, lanesEl.value.clientWidth);
    });
  }

  watch(() => [state.samples, extended.value], draw);

  function onResize() {
    charts.forEach(chart => chart.setSize({width: Math.max(260, chart.root.parentElement.clientWidth), height: 170}));
    if (lanesEl.value) lanesWidth.value = Math.max(260, lanesEl.value.clientWidth);
  }
  onMounted(() => window.addEventListener('resize', onResize));
  onUnmounted(() => window.removeEventListener('resize', onResize));

  function pick(hours) {
    state.hours = hours;
    load();
  }

  // The lanes: when each floor heated, who was home, whether the mains were up.
  const LANE = 22, GAP = 6, LABEL = 76;
  const laneRows = [
    ...FLOORS.map(([room, label, color]) => ({label, kind: 'heat', key: `heat_${room}`, color})),
    {label: 'At home', kind: 'state', key: 'home', color: INK.secondary},
    {label: 'Mains', kind: 'mains', key: 'mains', color: MAINS_OFF},
    {label: 'Motion', kind: 'ticks', key: 'motion', color: INK.muted},
  ];

  const range = computed(() => {
    const samples = state.samples;
    if (samples.length === 0) return null;
    return {from: samples[0].t - spans.value[0], to: samples[samples.length - 1].t};
  });

  const x = (time) => {
    const {from, to} = range.value;
    return LABEL + (time - from) / Math.max(1, to - from) * (lanesWidth.value - LABEL);
  };

  const nightBands = computed(() => {
    if (!range.value) return [];
    const {from, to} = range.value;
    const bands = [];
    const start = new Date(from);
    start.setHours(23, 0, 0, 0);
    start.setDate(start.getDate() - 1);
    for (let night = start.getTime(); night < to; night += 24 * 3_600_000) {
      const a = Math.max(from, night), b = Math.min(to, night + 8 * 3_600_000);
      if (b > a) bands.push({x: x(a), w: x(b) - x(a)});
    }
    return bands;
  });

  const laneMarks = computed(() => laneRows.map((row, index) => {
    const y = index * (LANE + GAP);
    const marks = [];
    state.samples.forEach((sample, i) => {
      const value = sample[row.key];
      if (value === null || value === undefined) return;
      const x1 = x(sample.t - spans.value[i]), x2 = x(sample.t);
      if (row.kind === 'heat' && value > 0) marks.push({x: x1, w: Math.max(1, x2 - x1), opacity: 0.25 + 0.75 * value});
      if (row.kind === 'state' && value >= 0.5) marks.push({x: x1, w: Math.max(1, x2 - x1), opacity: 0.55});
      if (row.kind === 'mains' && value < 0.5) marks.push({x: x1, w: Math.max(1, x2 - x1), opacity: 1});
      if (row.kind === 'ticks' && value > 0) marks.push({x: (x1 + x2) / 2 - 1, w: 2, opacity: Math.min(1, 0.4 + value / 4)});
    });
    return {...row, y, marks};
  }));

  const lanesHeight = computed(() => laneRows.length * (LANE + GAP) + 16);

  function onLanesMove(event) {
    if (!range.value || state.samples.length === 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const px = event.clientX - rect.left;
    if (px < LABEL) {
      hover.value = null;
      return;
    }
    const {from, to} = range.value;
    const time = from + (px - LABEL) / (lanesWidth.value - LABEL) * (to - from);
    let nearest = state.samples[0];
    for (const sample of state.samples) {
      if (Math.abs(sample.t - time) < Math.abs(nearest.t - time)) nearest = sample;
    }
    hover.value = {x: x(nearest.t), sample: nearest};
  }

  const hoverText = computed(() => {
    if (!hover.value) return null;
    const s = hover.value.sample;
    const heat = FLOORS.map(([room, label]) => `${label} ${Math.round((s[`heat_${room}`] ?? 0) * 100)}%`).join(' · ');
    const home = s.home === null || s.home === undefined ? '' : s.home >= 0.5 ? ' · someone home' : ' · nobody home';
    const mains = s.mains === null || s.mains === undefined ? '' : s.mains >= 0.5 ? '' : ' · no mains';
    return `${dayClock(s.t)} — heating ${heat}${home}${mains}`;
  });

  // The table view: one row an hour (or a day past three days), the values the charts show.
  const tableRows = computed(() => {
    const bucket = state.hours > 72 ? 24 * 3_600_000 : 3_600_000;
    const groups = new Map();
    state.samples.forEach((sample, index) => {
      const key = new Date(sample.t);
      key.setMinutes(0, 0, 0);
      if (bucket > 3_600_000) key.setHours(0);
      const id = key.getTime();
      if (!groups.has(id)) groups.set(id, []);
      groups.get(id).push({sample, span: spans.value[index]});
    });
    const avg = (rows, key) => {
      const values = rows.map(row => row.sample[key]).filter(value => typeof value === 'number');
      return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
    };
    return [...groups.entries()].reverse().map(([time, rows]) => ({
      time,
      outdoor: avg(rows, 'outdoor'),
      kitchen: avg(rows, 'room_kitchen'),
      bedroom: avg(rows, 'room_bedroom'),
      floors: FLOORS.map(([room]) => avg(rows, `floor_${room}`)),
      heated: rows.reduce((total, row) => total + FLOORS.reduce((sum, [room]) => sum + (row.sample[`heat_${room}`] ?? 0) * row.span, 0), 0) / 60_000,
      soc: avg(rows, 'soc'),
    }));
  });
</script>

<template>
  <Device accent="sky" @open="extended = true" @close="extended = false">
    <template #icon>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="8" y="10" width="48" height="44" rx="6" fill="#3762cc"/><rect x="12" y="14" width="40" height="36" rx="3" fill="#eaf0f3"/><path d="M15 42 25 31l7 6 12-14 5 4" fill="none" stroke="#4671c6" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="44" cy="23" r="3.5" fill="#6bdddd"/></svg>
    </template>

    <template #title>
      {{ item.name }}
    </template>

    <template #status>
      <template v-if="latest">
        <span v-if="latest.outdoor !== null && latest.outdoor !== undefined">Outside {{ format(latest.outdoor) }}°</span>
        <span>floors heated {{ format(today, 1) }} h today</span>
      </template>
      <span v-else-if="state.error" class="pill pill-muted">{{ state.error }}</span>
      <span v-else class="pill pill-muted">collecting…</span>
    </template>

    <template #action>
    </template>

    <template #extended>
      <div class="flex flex-wrap items-center gap-2" role="group" aria-label="Range">
        <button v-for="range in RANGES" :key="range.hours" type="button" class="pill"
                :class="state.hours === range.hours ? 'pill-accent' : 'pill-muted'" @click="pick(range.hours)">
          {{ range.label }}
        </button>
        <button type="button" class="pill ml-auto" :class="state.table ? 'pill-accent' : 'pill-muted'" @click="state.table = !state.table">
          Table
        </button>
      </div>

      <p v-if="state.samples.length === 0" class="text-sm text-zinc-400">
        {{ state.error ?? 'Collecting the first samples — one every 5 minutes.' }}
      </p>

      <div v-else :style="{opacity: state.loading ? 0.6 : 1}" class="history flex flex-col gap-5">
        <Section name="Air temperature">
          <div ref="airEl" class="chart"></div>
        </Section>

        <Section name="Floor temperature">
          <div ref="floorEl" class="chart"></div>
        </Section>

        <Section name="Floor heating">
          <div ref="lanesEl" class="relative">
            <svg :width="lanesWidth" :height="lanesHeight" class="block" role="img"
                 aria-label="When each floor heated, who was home and whether the mains were up"
                 @pointermove="onLanesMove" @pointerleave="hover = null">
              <rect v-for="(band, i) in nightBands" :key="'n' + i" :x="band.x" y="0" :width="band.w"
                    :height="lanesHeight - 16" fill="rgba(255,255,255,0.05)"/>
              <g v-for="row in laneMarks" :key="row.label">
                <text :x="0" :y="row.y + LANE / 2 + 4" :fill="INK.secondary" font-size="11">{{ row.label }}</text>
                <rect :x="LABEL" :y="row.y + LANE - 1" :width="lanesWidth - LABEL" height="1" :fill="INK.grid"/>
                <rect v-for="(mark, i) in row.marks" :key="i" :x="mark.x" :y="row.y + 3" :width="mark.w"
                      :height="LANE - 6" rx="2" :fill="row.color" :fill-opacity="mark.opacity"/>
              </g>
              <line v-if="hover" :x1="hover.x" :x2="hover.x" y1="0" :y2="lanesHeight - 16" :stroke="INK.secondary" stroke-width="1"/>
              <text :x="LABEL" :y="lanesHeight - 3" :fill="INK.muted" font-size="10">
                {{ range ? dayClock(range.from) : '' }}
              </text>
              <text :x="lanesWidth" :y="lanesHeight - 3" :fill="INK.muted" font-size="10" text-anchor="end">
                {{ range ? dayClock(range.to) : '' }}
              </text>
            </svg>
            <p class="mt-1 min-h-[1.25rem] text-xs text-zinc-400">
              <template v-if="hoverText">{{ hoverText }}</template>
              <template v-else>
                <span class="inline-block h-2.5 w-3 rounded-sm align-middle" style="background: rgba(255,255,255,0.12)"></span>
                night tariff 23:00–07:00 ·
                <span class="inline-block h-2.5 w-3 rounded-sm align-middle" :style="{background: MAINS_OFF}"></span>
                no mains
              </template>
            </p>
          </div>

          <ul role="list" class="field-list mt-3">
            <li v-for="floor in heating" :key="floor.room" class="field-row">
              <span class="field-label flex items-center gap-2">
                <span class="inline-block h-0.5 w-3 rounded" :style="{background: floor.color}"></span>{{ floor.label }}
              </span>
              <span class="field-value">
                {{ format(floor.hours, 1) }} h<template v-if="floor.kwh !== null"> · {{ format(floor.kwh, 1) }} kWh</template>
                <span v-if="floor.nightShare !== null" class="font-normal text-zinc-400"> · {{ Math.round(floor.nightShare * 100) }}% at night</span>
              </span>
            </li>
          </ul>
        </Section>

        <Section name="Battery charge">
          <div ref="chargeEl" class="chart"></div>
        </Section>

        <Section name="Backup socket load">
          <div ref="loadEl" class="chart"></div>
        </Section>

        <Section v-if="state.table" name="Table">
          <div class="overflow-x-auto rounded-2xl border border-white/10">
            <table class="w-full text-xs tabular-nums">
              <thead class="text-zinc-400">
                <tr>
                  <th class="px-2 py-2 text-left font-medium">Time</th>
                  <th class="px-2 py-2 text-right font-medium">Outside</th>
                  <th class="px-2 py-2 text-right font-medium">Kitchen</th>
                  <th class="px-2 py-2 text-right font-medium">Bedroom</th>
                  <th v-for="[room, label] in FLOORS" :key="room" class="px-2 py-2 text-right font-medium">{{ label }} floor</th>
                  <th class="px-2 py-2 text-right font-medium">Heated, min</th>
                  <th class="px-2 py-2 text-right font-medium">Charge</th>
                </tr>
              </thead>
              <tbody class="text-zinc-200">
                <tr v-for="row in tableRows" :key="row.time" class="border-t border-white/5">
                  <td class="px-2 py-1.5 text-left">{{ state.hours > 72 ? date(row.time) : dayClock(row.time) }}</td>
                  <td class="px-2 py-1.5 text-right">{{ format(row.outdoor) }}°</td>
                  <td class="px-2 py-1.5 text-right">{{ format(row.kitchen) }}°</td>
                  <td class="px-2 py-1.5 text-right">{{ format(row.bedroom) }}°</td>
                  <td v-for="(value, i) in row.floors" :key="i" class="px-2 py-1.5 text-right">{{ format(value) }}°</td>
                  <td class="px-2 py-1.5 text-right">{{ Math.round(row.heated) }}</td>
                  <td class="px-2 py-1.5 text-right">{{ format(row.soc, 0) }}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>
      </div>
    </template>
  </Device>
</template>

<style>
  /* uPlot's own legend, recoloured for the dark sheet: values lead, labels follow. */
  .history .u-legend { color: #c3c2b7; font-size: 12px; text-align: left; margin-top: 4px; }
  .history .u-legend .u-series th { font-weight: 400; color: #c3c2b7; }
  .history .u-legend .u-value { color: #f0efec; font-weight: 600; }
  .history .u-legend .u-marker { height: 3px; width: 12px; border-radius: 2px; }
  .history .u-legend tr:first-child .u-marker { display: none; }
  .history .chart { width: 100%; }
</style>
