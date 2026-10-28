<script setup>
  import {computed, ref} from "vue";
  import Device from "@/components/Device.vue";
  import LastUpdate from "@/components/properties/LastUpdate.vue";
  import {registry as Registry} from "@/registry";

  const props = defineProps({
    item: Object,
    device: Object
  });

  const p = computed(() => props.device.properties);
  const online = computed(() => p.value.available === true);

  // What the last button did not manage, said under the controls until the next one.
  const failed = ref(null);
  const call = async (method, params = {}) => {
    failed.value = null;
    const result = await Registry.call(props.device.id, method, params);
    if (result.code !== 0) {
      failed.value = result.data?.error ?? 'пилосос не відповів';
    }
  };

  const STATES = {
    starting: 'Починає', idle: 'Чекає', remote: 'Ручне керування', cleaning: 'Прибирає',
    returning: 'Їде на базу', charging: 'Заряджається', charging_problem: 'Не заряджається',
    paused: 'На паузі', error: 'Помилка', shutting_down: 'Вимикається', updating: 'Оновлюється',
    going_to_target: 'Їде до точки', emptying: 'Вивантажує пил', washing: 'Миє швабру',
    going_to_wash: 'Їде мити швабру', in_call: 'Відеодзвінок', mapping: 'Будує мапу',
    charged: 'На базі', offline: 'Не в мережі', locked: 'Заблокований', drying: 'Сушить швабру',
  };
  // Topped up and still on the charger: the robot keeps saying it charges.
  const stateText = computed(() => p.value.state === 'charging' && p.value.battery >= 100 ? STATES.charged
      : STATES[p.value.state] ?? (p.value.state ? `Стан ${p.value.stateCode}` : '—'));

  const busy = computed(() => ['starting', 'cleaning', 'returning', 'going_to_target', 'going_to_wash', 'mapping'].includes(p.value.state));
  const cleaning = computed(() => ['starting', 'cleaning', 'going_to_target', 'going_to_wash', 'mapping'].includes(p.value.state));
  const running = computed(() => cleaning.value || p.value.state === 'returning');
  const paused = computed(() => p.value.state === 'paused');
  const problem = computed(() => p.value.errorText ?? p.value.dockErrorText ?? null);
  const capital = (text) => text ? text[0].toUpperCase() + text.slice(1) : text;

  // The tile's and the stage's button: pause what runs, pick up what is paused, else clean the whole flat.
  const togglePlay = () => running.value ? call('pause') : call('start');
  const playLabel = computed(() => running.value ? 'Пауза' : paused.value || p.value.unfinished ? 'Продовжити' : 'Прибрати');

  // The stage's mood: what colour the robot's eye, the ring and the glow take.
  const mood = computed(() => !online.value ? 'off' : problem.value ? 'error' : running.value ? 'run'
      : paused.value ? 'pause' : 'rest');
  const MOOD_RGB = {off: '142 142 147', error: '255 69 58', run: '48 209 88', pause: '255 214 10', rest: '100 210 255'};
  const moodRgb = computed(() => MOOD_RGB[mood.value]);

  const battery = computed(() => Math.min(100, Math.max(0, p.value.battery ?? 0)));
  const batteryRgb = computed(() => battery.value >= 50 ? '48 209 88' : battery.value >= 20 ? '255 214 10' : '255 69 58');
  // The ring round the robot: r = 112 in a 240 box.
  const RING = 2 * Math.PI * 112;

  const subline = computed(() => {
    if (!online.value) {
      return 'Пилосос поза мережею';
    }
    if (problem.value) {
      return 'Потрібна допомога: гляньте, що з ним';
    }
    if (cleaning.value) {
      return p.value.cleanPercent ? `Готово на ${p.value.cleanPercent}%` : 'Прибирання триває';
    }
    if (p.value.drying) {
      return 'Станція сушить швабру';
    }
    return p.value.state === 'charging' && battery.value < 100 ? 'Заряджається на базі' : 'Готовий до прибирання';
  });

  // Under way: the clean so far; at rest: the last one.
  const stats = computed(() => {
    const live = cleaning.value || paused.value;
    const last = p.value.lastClean;
    return [
      {label: live ? 'Прибрано' : 'Востаннє', value: live ? p.value.cleanArea : last?.area, unit: 'м²'},
      {label: live ? 'Триває' : 'Тривало', value: live ? p.value.cleanTime : last?.duration, unit: 'хв'},
      {label: 'Заряд', value: p.value.battery, unit: '%'},
    ];
  });

  // The Roborock app names rooms in English unless renamed there.
  const ROOMS = [
    {match: ['bedroom', 'спальня'], name: 'Спальня', icon: 'bed'},
    {match: ['kitchen', 'кухня'], name: 'Кухня', icon: 'pot'},
    {match: ['corridor', 'hallway', 'коридор'], name: 'Коридор', icon: 'door'},
    {match: ['living room', 'вітальня'], name: 'Вітальня', icon: 'sofa'},
    {match: ['bathroom', 'toilet', 'ванна', 'туалет'], name: 'Ванна', icon: 'bath'},
    {match: ['balcony', 'балкон'], name: 'Балкон', icon: 'sun'},
    {match: ['study', 'кабінет'], name: 'Кабінет', icon: 'desk'},
    {match: ['dining room', 'їдальня'], name: 'Їдальня', icon: 'pot'},
    {match: ['kids room', "children's room", 'дитяча'], name: 'Дитяча', icon: 'star'},
  ];
  const rooms = computed(() => (p.value.rooms ?? []).map(room => {
    const known = ROOMS.find(entry => entry.match.includes(room.name.toLowerCase()));
    return {id: room.id, name: known?.name ?? room.name, icon: known?.icon ?? 'square'};
  }));

  // Rooms to clean, in the order picked; empty means the whole flat.
  const picked = ref([]);
  const pick = (id) => picked.value = picked.value.includes(id) ? picked.value.filter(room => room !== id) : [...picked.value, id];
  const pickedNames = computed(() => picked.value.map(id => rooms.value.find(room => room.id === id)?.name).join(', '));
  const cleanPicked = async () => {
    await call('cleanRooms', {value: picked.value});
    if (failed.value === null) {
      picked.value = [];
    }
  };

  // The app's three: vacuum only (the mop lifted), vacuum and mop, mop only (no suction).
  const mode = computed(() => p.value.fanPower === 'off' ? 'mop' : p.value.waterMode === 'off' ? 'vacuum' : 'both');
  const setMode = async (value) => {
    if (value !== 'mop' && p.value.fanPower === 'off') {
      await call('setFanPower', {value: 'balanced'});
    }
    if (value === 'mop') {
      await call('setFanPower', {value: 'off'});
    }
    if (value === 'vacuum') {
      await call('setWaterMode', {value: 'off'});
    } else if (p.value.waterMode === 'off') {
      await call('setWaterMode', {value: 'medium'});
    }
  };
  const MODES = [
    {value: 'vacuum', label: 'Пилосос', icons: ['wind']},
    {value: 'both', label: 'Разом', icons: ['wind', 'drop']},
    {value: 'mop', label: 'Швабра', icons: ['drop']},
  ];
  const FAN = [
    {value: 'quiet', label: 'Тихо', level: 1},
    {value: 'balanced', label: 'Баланс', level: 2},
    {value: 'turbo', label: 'Турбо', level: 3},
    {value: 'max', label: 'Макс', level: 4},
  ];
  const WATER = [
    {value: 'low', label: 'Мало', level: 1},
    {value: 'medium', label: 'Середньо', level: 2},
    {value: 'high', label: 'Багато', level: 3},
  ];
  const ROUTES = [
    {value: 'fast', label: 'Швидко'},
    {value: 'standard', label: 'Звичайно'},
    {value: 'deep', label: 'Ретельно'},
    {value: 'deep_plus', label: 'Глибоко'},
  ];

  const tanks = computed(() => [
    {key: 'clean', label: 'Чиста вода', bad: p.value.cleanWaterEmpty, ok: 'є', alarm: 'долийте', rgb: '100 210 255'},
    {key: 'dirty', label: 'Брудна вода', bad: p.value.dirtyWaterFull, ok: 'гаразд', alarm: 'злийте', rgb: '172 142 104'},
    {key: 'dust', label: 'Мішок', bad: p.value.dustBagMissing, ok: 'гаразд', alarm: 'немає', rgb: '174 174 178'},
  ].filter(tank => tank.bad !== null && tank.bad !== undefined));

  const PARTS = [
    {key: 'mainBrush', label: 'Основна щітка', hint: 'замінити'},
    {key: 'sideBrush', label: 'Бокова щітка', hint: 'замінити'},
    {key: 'filter', label: 'Фільтр', hint: 'замінити'},
    {key: 'sensors', label: 'Датчики', hint: 'протерти'},
    {key: 'dockStrainer', label: 'Фільтр станції', hint: 'почистити'},
    {key: 'dockBrush', label: 'Щітка станції', hint: 'почистити'},
  ];
  const parts = computed(() => PARTS
      .filter(part => typeof p.value.consumables?.[part.key] === 'number')
      .map(part => ({...part, left: p.value.consumables[part.key]})));
  const allWorn = computed(() => parts.value.length > 0 && parts.value.every(part => part.left === 0));

  const thousands = (value) => value === null || value === undefined ? '—'
      : value.toLocaleString('uk-UA').replace(/ /g, ' ');

  const when = (ms) => {
    const date = new Date(ms);
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 3600_000);
    const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    const same = (a, b) => a.toDateString() === b.toDateString();
    const day = same(date, today) ? 'сьогодні' : same(date, yesterday) ? 'вчора'
        : `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}`;
    return `${day} о ${time}`;
  };
</script>

<template>
  <Device accent="emerald" :active="online && busy" :alert="online && problem !== null" bare-extended>
    <template #icon>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="28" fill="#2c2f37"/><circle cx="32" cy="32" r="28" fill="none" stroke="#8e96a3" stroke-width="3"/><path d="M12 22a24 24 0 0 1 40 0" fill="none" stroke="#c7ced8" stroke-width="4" stroke-linecap="round"/><circle cx="32" cy="24" r="8.5" fill="#15161a" stroke="#6b7380" stroke-width="2"/><circle cx="32" cy="24" r="3.2" fill="#30d158"/><rect x="25" y="42" width="5" height="3" rx="1.5" fill="#8e96a3"/><rect x="34" y="42" width="5" height="3" rx="1.5" fill="#8e96a3"/></svg>
    </template>

    <template #title>
      {{ item.name }}
    </template>

    <template #status>
      <span v-if="!online">Немає зв'язку</span>
      <span v-else-if="problem" class="font-medium">{{ capital(problem) }}</span>
      <template v-else>
        <span>{{ stateText }}</span>
        <span v-if="cleaning && p.cleanArea !== null" class="opacity-70">· {{ p.cleanArea }} м²</span>
        <span v-else-if="p.battery !== null" class="opacity-70">· {{ p.battery }}%</span>
      </template>
    </template>

    <template #action>
      <button type="button" class="play-btn" :disabled="!online" @click="togglePlay" :aria-label="playLabel">
        <svg v-if="running" viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4"><rect x="6" y="5" width="4" height="14" rx="1.2"/><rect x="14" y="5" width="4" height="14" rx="1.2"/></svg>
        <svg v-else viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l11-6.5a1 1 0 0 0 0-1.72l-11-6.5A1 1 0 0 0 8 5.5z"/></svg>
      </button>
    </template>

    <template #extended>
      <!-- shrink-0: an explicit min-height drops the flex item's own min-height:auto (see tv.vue). -->
      <div class="panel flex min-h-[calc(100dvh-env(safe-area-inset-top))] shrink-0 flex-col gap-7 px-5 pb-8 pt-6 text-zinc-200 sm:min-h-0"
           :style="{'--mood': moodRgb}">

        <!-- Header -->
        <div class="pr-10">
          <div class="flex items-center gap-2.5">
            <span class="relative flex h-2.5 w-2.5">
              <span v-if="mood === 'run' || mood === 'error'" class="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" :style="{background: `rgb(${moodRgb})`}"></span>
              <span class="relative inline-flex h-2.5 w-2.5 rounded-full" :style="{background: `rgb(${moodRgb})`}"></span>
            </span>
            <h3 class="truncate text-base font-semibold text-white">{{ item.name }}</h3>
          </div>
          <p class="mt-1 text-xs text-zinc-400">{{ p.name || 'Roborock' }}<template v-if="p.updatedAt"> · оновлено <LastUpdate :timestamp="p.updatedAt"></LastUpdate></template></p>
        </div>

        <!-- The stage: the robot inside its battery ring -->
        <div class="flex flex-col items-center">
          <div class="stage" :class="`is-${mood}`">
            <svg viewBox="0 0 240 240" class="absolute inset-0 h-full w-full -rotate-90">
              <circle cx="120" cy="120" r="112" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="5"/>
              <circle cx="120" cy="120" r="112" fill="none" :stroke="`rgb(${batteryRgb})`" stroke-width="5" stroke-linecap="round"
                      :stroke-dasharray="RING" :stroke-dashoffset="RING * (1 - battery / 100)" class="ring-fill"/>
            </svg>
            <div v-if="mood === 'run'" class="sweep"></div>
            <svg viewBox="0 0 200 200" class="robot">
              <defs>
                <radialGradient id="rr-body" cx="40%" cy="30%" r="80%">
                  <stop offset="0%" stop-color="#4a4e59"/>
                  <stop offset="60%" stop-color="#25272e"/>
                  <stop offset="100%" stop-color="#16171b"/>
                </radialGradient>
                <radialGradient id="rr-turret" cx="45%" cy="35%" r="70%">
                  <stop offset="0%" stop-color="#3a3d45"/>
                  <stop offset="100%" stop-color="#0d0e11"/>
                </radialGradient>
              </defs>
              <ellipse cx="100" cy="186" rx="62" ry="8" fill="rgba(0,0,0,0.45)"/>
              <circle cx="100" cy="100" r="82" fill="url(#rr-body)"/>
              <circle cx="100" cy="100" r="82" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1.5"/>
              <circle cx="100" cy="100" r="70" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
              <path d="M30 70a78 78 0 0 1 140 0" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="5" stroke-linecap="round"/>
              <g class="lidar">
                <circle cx="100" cy="74" r="23" fill="url(#rr-turret)" stroke="rgba(255,255,255,0.14)" stroke-width="1.5"/>
                <path d="M100 74 L100 52 A22 22 0 0 1 119 63 Z" fill="rgb(var(--mood) / 0.28)" class="beam"/>
                <circle cx="100" cy="74" r="6" fill="rgb(var(--mood))" class="eye"/>
              </g>
              <rect x="84" y="128" width="12" height="5" rx="2.5" fill="rgba(255,255,255,0.28)"/>
              <rect x="104" y="128" width="12" height="5" rx="2.5" fill="rgba(255,255,255,0.28)"/>
            </svg>
          </div>
          <p class="mt-5 text-center text-[28px] font-semibold leading-tight tracking-tight text-white">{{ !online ? 'Немає зв\'язку' : problem ? capital(problem) : stateText }}</p>
          <p class="mt-1 text-sm" :class="problem ? 'text-[#ff6961]' : 'text-zinc-400'">{{ subline }}</p>
        </div>

        <!-- Controls -->
        <div class="flex items-start justify-center gap-7">
          <button type="button" class="group flex w-16 flex-col items-center gap-2" :disabled="!online || p.state === 'returning'" @click="call('dock')">
            <span class="round">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-6"><path d="M3 11 12 4l9 7"/><path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9"/></svg>
            </span>
            <span class="text-[11px] font-medium text-zinc-400">На базу</span>
          </button>
          <button type="button" class="group flex w-20 flex-col items-center gap-2" :disabled="!online" @click="togglePlay">
            <span class="play" :class="{'is-running': running}">
              <svg v-if="running" viewBox="0 0 24 24" fill="currentColor" class="h-7 w-7"><rect x="6" y="5" width="4" height="14" rx="1.4"/><rect x="14" y="5" width="4" height="14" rx="1.4"/></svg>
              <svg v-else viewBox="0 0 24 24" fill="currentColor" class="ml-1 h-7 w-7"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l11-6.5a1 1 0 0 0 0-1.72l-11-6.5A1 1 0 0 0 8 5.5z"/></svg>
            </span>
            <span class="text-[11px] font-semibold text-zinc-200">{{ playLabel }}</span>
          </button>
          <button type="button" class="group flex w-16 flex-col items-center gap-2" :disabled="!online" @click="call('find')">
            <span class="round">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-6"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
            </span>
            <span class="text-[11px] font-medium text-zinc-400">Знайти</span>
          </button>
        </div>
        <p v-if="failed" class="-mt-3 text-center text-[13px] text-[#ff6961]">Не вийшло: {{ failed }}</p>

        <!-- The clean -->
        <div class="grid grid-cols-3 gap-2">
          <div v-for="stat in stats" :key="stat.label" class="card px-3 py-3">
            <p class="truncate text-[11px] font-medium uppercase tracking-wide text-zinc-500">{{ stat.label }}</p>
            <p class="mt-1 text-[24px] font-semibold leading-none tabular-nums text-white">{{ stat.value ?? '—' }}<span class="ml-0.5 text-[13px] font-medium text-zinc-400">{{ stat.unit }}</span></p>
          </div>
        </div>

        <!-- Rooms -->
        <section v-if="rooms.length">
          <h4 class="heading">Кімнати</h4>
          <div class="grid grid-cols-3 gap-2">
            <button v-for="room in rooms" :key="room.id" type="button" class="room" :class="{'is-sel': picked.includes(room.id)}"
                    :disabled="!online" @click="pick(room.id)">
              <span v-if="picked.includes(room.id)" class="badge">{{ picked.indexOf(room.id) + 1 }}</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="h-7 w-7">
                <template v-if="room.icon === 'bed'"><path d="M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6"/><path d="M3 15h18"/><path d="M3 18v2M21 18v2"/><path d="M6 10V7a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v3"/></template>
                <template v-else-if="room.icon === 'pot'"><path d="M4 10h16v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M2 10h20"/><path d="M9 7c0-1.2 1.3-2 3-2s3 .8 3 2"/></template>
                <template v-else-if="room.icon === 'door'"><path d="M6 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17"/><path d="M3 21h18"/><path d="M14.5 12.5h.01"/></template>
                <template v-else-if="room.icon === 'sofa'"><path d="M4 11V8a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v3"/><path d="M2 13a2 2 0 0 1 4 0v2h12v-2a2 2 0 0 1 4 0v5H2z"/><path d="M5 18v2M19 18v2"/></template>
                <template v-else-if="room.icon === 'bath'"><path d="M3 12h18v2a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5z"/><path d="M6 12V6a2 2 0 0 1 4 0"/><path d="M7 19l-1 2M17 19l1 2"/></template>
                <template v-else-if="room.icon === 'sun'"><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/></template>
                <template v-else-if="room.icon === 'desk'"><path d="M3 9h18"/><path d="M5 9v11M19 9v11"/><path d="M13 9v5h6"/></template>
                <template v-else-if="room.icon === 'star'"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></template>
                <template v-else><rect x="4" y="4" width="16" height="16" rx="3"/></template>
              </svg>
              <span class="mt-2 truncate text-[13px] font-semibold">{{ room.name }}</span>
            </button>
          </div>
          <button v-if="picked.length" type="button" class="cta mt-3" :disabled="!online" @click="cleanPicked">
            <svg viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4 flex-none"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l11-6.5a1 1 0 0 0 0-1.72l-11-6.5A1 1 0 0 0 8 5.5z"/></svg>
            <span class="truncate">Прибрати: {{ pickedNames }}</span>
          </button>
          <p v-else class="mt-2.5 px-1 text-[12px] text-zinc-500">Виберіть кімнати, щоб прибрати лише їх. Кнопка ▶ прибирає всю квартиру.</p>
        </section>

        <!-- How to clean -->
        <section>
          <h4 class="heading">Як прибирати</h4>
          <div class="grid grid-cols-3 gap-2">
            <button v-for="option in MODES" :key="option.value" type="button" class="mode" :class="{'is-sel': mode === option.value}"
                    :disabled="!online" @click="setMode(option.value)">
              <span class="flex items-center gap-1">
                <svg v-for="icon in option.icons" :key="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-6">
                  <template v-if="icon === 'wind'"><path d="M3 8h11a3 3 0 1 0-3-3"/><path d="M3 12h15a3 3 0 1 1-3 3"/><path d="M3 16h7"/></template>
                  <template v-else><path d="M12 3.5 17.2 9a7 7 0 1 1-10.4 0z"/></template>
                </svg>
              </span>
              <span class="mt-2 text-[13px] font-semibold">{{ option.label }}</span>
            </button>
          </div>

          <div class="card mt-2 divide-y divide-white/5">
            <div v-if="mode !== 'mop'" class="px-4 py-3.5">
              <p class="label">Потужність</p>
              <div class="mt-2.5 grid grid-cols-4 gap-1.5">
                <button v-for="option in FAN" :key="option.value" type="button" class="level" :class="{'is-sel': p.fanPower === option.value}"
                        :disabled="!online" @click="call('setFanPower', {value: option.value})">
                  <span class="flex h-5 items-end gap-[3px]">
                    <span v-for="bar in 4" :key="bar" class="w-[4px] rounded-full" :style="{height: `${6 + bar * 3.5}px`}"
                          :class="bar <= option.level ? 'bg-current' : 'bg-white/10'"></span>
                  </span>
                  <span class="mt-1.5 text-[12px] font-semibold">{{ option.label }}</span>
                </button>
              </div>
            </div>
            <div v-if="mode !== 'vacuum'" class="px-4 py-3.5">
              <p class="label">Вода для швабри</p>
              <div class="mt-2.5 grid grid-cols-3 gap-1.5">
                <button v-for="option in WATER" :key="option.value" type="button" class="level is-water" :class="{'is-sel': p.waterMode === option.value}"
                        :disabled="!online" @click="call('setWaterMode', {value: option.value})">
                  <span class="flex h-5 items-center gap-0.5">
                    <svg v-for="drop in 3" :key="drop" viewBox="0 0 24 24" class="h-4 w-4" :fill="drop <= option.level ? 'currentColor' : 'rgba(255,255,255,0.1)'"><path d="M12 3.5 17.2 9a7 7 0 1 1-10.4 0z"/></svg>
                  </span>
                  <span class="mt-1.5 text-[12px] font-semibold">{{ option.label }}</span>
                </button>
              </div>
            </div>
            <div class="px-4 py-3.5">
              <p class="label">Маршрут</p>
              <div class="seg mt-2.5">
                <button v-for="option in ROUTES" :key="option.value" type="button" :class="{'is-sel': p.mopRoute === option.value}"
                        :disabled="!online" @click="call('setMopRoute', {value: option.value})">{{ option.label }}</button>
              </div>
            </div>
          </div>
        </section>

        <!-- The dock -->
        <section>
          <h4 class="heading">Станція</h4>
          <div v-if="tanks.length" class="grid grid-cols-3 gap-2">
            <div v-for="tank in tanks" :key="tank.key" class="tank" :class="{'is-bad': tank.bad}" :style="{'--tank': tank.rgb}">
              <div class="tank-body">
                <div class="tank-level" :style="{height: tank.key === 'dirty' ? (tank.bad ? '92%' : '22%') : tank.key === 'dust' ? (tank.bad ? '0%' : '30%') : (tank.bad ? '6%' : '70%')}"></div>
              </div>
              <p class="mt-2 w-full truncate text-[12px] text-zinc-400">{{ tank.label }}</p>
              <p class="text-[14px] font-semibold" :class="tank.bad ? 'text-[#ff6961]' : 'text-white'">{{ tank.bad ? tank.alarm : tank.ok }}</p>
            </div>
          </div>
          <div class="mt-2 grid grid-cols-3 gap-2">
            <button type="button" class="dock-act" :disabled="!online || busy" @click="call('washMop')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-6"><path d="M9 6.5 13 11a5.5 5.5 0 1 1-8 0z"/><path d="M17 3v4M15 5h4M19 11v3M17.5 12.5h3"/></svg>
              <span>Помити швабру</span>
            </button>
            <button type="button" class="dock-act" :disabled="!online || busy" @click="call('emptyBin')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-6"><path d="M4 7h16"/><path d="M6 7l1 13h10l1-13"/><path d="M12 3v9"/><path d="M9 9.5 12 12.5l3-3"/></svg>
              <span>Вивантажити пил</span>
            </button>
            <button type="button" class="dock-act" :class="{'is-on': p.drying}" :disabled="!online" @click="call('setDrying', {value: !p.drying})">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-6"><path d="M7 4c-1.5 2 1.5 4 0 6s1.5 4 0 6"/><path d="M12 4c-1.5 2 1.5 4 0 6s1.5 4 0 6"/><path d="M17 4c-1.5 2 1.5 4 0 6s1.5 4 0 6"/><path d="M4 20h16"/></svg>
              <span>{{ p.drying ? 'Сушить' : 'Сушіння' }}</span>
            </button>
          </div>
          <p v-if="p.dockErrorText" class="alert mt-2">{{ capital(p.dockErrorText) }}</p>
        </section>

        <!-- Wear -->
        <section v-if="parts.length">
          <h4 class="heading">Догляд</h4>
          <div class="card divide-y divide-white/5">
            <div v-for="part in parts" :key="part.key" class="px-4 py-3">
              <div class="flex items-baseline justify-between gap-3">
                <span class="text-[14px] text-zinc-200">{{ part.label }}</span>
                <span class="text-[13px] font-semibold tabular-nums" :class="part.left <= 10 ? 'text-[#ff6961]' : 'text-zinc-300'">
                  {{ part.left }}%<template v-if="part.left <= 10"> · {{ part.hint }}</template>
                </span>
              </div>
              <div class="wear mt-2"><div :style="{width: `${Math.max(part.left, 2)}%`, background: part.left <= 10 ? '#ff453a' : part.left <= 30 ? '#ffd60a' : '#30d158'}"></div></div>
            </div>
          </div>
          <p v-if="allWorn" class="mt-2.5 px-1 text-[12px] text-zinc-500">Лічильники ще жодного разу не скидали. Після заміни деталі скиньте її лічильник у застосунку Roborock.</p>
        </section>

        <!-- Over the years -->
        <section>
          <h4 class="heading">Прибирання</h4>
          <div class="grid grid-cols-3 gap-2">
            <div class="card px-3 py-3">
              <p class="text-[22px] font-semibold leading-none tabular-nums text-white">{{ thousands(p.totalCleans) }}</p>
              <p class="mt-1.5 text-[11px] text-zinc-500">прибирань</p>
            </div>
            <div class="card px-3 py-3">
              <p class="text-[22px] font-semibold leading-none tabular-nums text-white">{{ thousands(p.totalArea) }}</p>
              <p class="mt-1.5 text-[11px] text-zinc-500">м² загалом</p>
            </div>
            <div class="card px-3 py-3">
              <p class="text-[22px] font-semibold leading-none tabular-nums text-white">{{ thousands(p.totalTime) }}</p>
              <p class="mt-1.5 text-[11px] text-zinc-500">годин роботи</p>
            </div>
          </div>
          <p v-if="p.lastClean" class="mt-2.5 px-1 text-[12px] text-zinc-500">
            Останнє: {{ when(p.lastClean.begin) }}, {{ p.lastClean.area }} м² за {{ p.lastClean.duration }} хв<template v-if="!p.lastClean.complete">, не завершене</template>.
          </p>
        </section>

        <p class="text-center text-[11px] text-zinc-600">{{ p.product }}<template v-if="!online"> · немає зв'язку</template></p>
      </div>
    </template>
  </Device>
</template>

<style scoped>
  .panel {
    background:
      radial-gradient(90% 55% at 50% 12%, rgb(var(--mood) / 0.16) 0%, rgba(20, 20, 26, 0) 60%),
      linear-gradient(180deg, #17171c 0%, #0d0d11 100%);
    transition: background 0.6s ease;
  }

  /* The stage */
  .stage {
    @apply relative grid place-items-center;
    width: 240px;
    height: 240px;
  }
  .ring-fill {
    transition: stroke-dashoffset 0.8s ease;
  }
  .robot {
    width: 184px;
    height: 184px;
    filter: drop-shadow(0 18px 30px rgba(0, 0, 0, 0.55));
  }
  .eye {
    filter: drop-shadow(0 0 6px rgb(var(--mood)));
  }
  .beam {
    opacity: 0;
  }
  .stage.is-run .beam {
    opacity: 1;
    transform-origin: 100px 74px;
    animation: spin 1.6s linear infinite;
  }
  .stage.is-error .eye {
    animation: blink 1.2s ease-in-out infinite;
  }
  .stage.is-rest .eye {
    animation: breathe 3.2s ease-in-out infinite;
  }
  /* A radar sweep round the robot while it cleans. */
  .sweep {
    @apply absolute rounded-full;
    inset: 8px;
    background: conic-gradient(from 0deg, rgba(48, 209, 88, 0) 0deg, rgba(48, 209, 88, 0.16) 70deg, rgba(48, 209, 88, 0) 72deg);
    animation: spin 3.2s linear infinite;
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  @keyframes blink {
    50% { opacity: 0.25; }
  }
  @keyframes breathe {
    50% { opacity: 0.55; }
  }
  @media (prefers-reduced-motion: reduce) {
    .sweep, .stage.is-run .beam, .stage.is-error .eye, .stage.is-rest .eye {
      animation: none;
    }
  }

  /* Controls */
  .round {
    @apply flex h-14 w-14 items-center justify-center rounded-full text-zinc-200 transition duration-150;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: radial-gradient(circle at 50% 30%, #2c2c34 0%, #18181d 80%);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 8px 18px rgba(0, 0, 0, 0.45);
  }
  .group:hover .round {
    color: #fff;
    border-color: rgba(255, 255, 255, 0.2);
  }
  .group:active .round, .group:active .play {
    transform: scale(0.94);
  }
  /* The one light thing on the panel, the way Apple draws its play button; while the robot runs,
     a thin ring in the colour of what it does. */
  .play {
    @apply flex h-[72px] w-[72px] items-center justify-center rounded-full transition duration-200;
    color: #111114;
    background: radial-gradient(circle at 50% 28%, #ffffff 0%, #ededf0 58%, #d2d2d8 100%);
    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.55), inset 0 -2px 5px rgba(0, 0, 0, 0.12), inset 0 1px 0 #ffffff;
  }
  .play.is-running {
    box-shadow: 0 0 0 4px #0d0d11, 0 0 0 6px rgb(var(--mood) / 0.7), 0 12px 28px rgba(0, 0, 0, 0.55),
      inset 0 -2px 5px rgba(0, 0, 0, 0.12), inset 0 1px 0 #ffffff;
  }
  button:disabled {
    @apply cursor-not-allowed opacity-40;
  }

  /* Cards and sections */
  .card {
    @apply rounded-2xl;
    border: 1px solid rgba(255, 255, 255, 0.06);
    background: rgba(255, 255, 255, 0.04);
  }
  .heading {
    @apply mb-2.5 px-1 text-[12px] font-semibold uppercase tracking-wider text-zinc-500;
  }
  .label {
    @apply text-[13px] font-medium text-zinc-400;
  }
  .alert {
    @apply rounded-xl px-3 py-2 text-[13px] font-medium;
    background: rgba(255, 69, 58, 0.14);
    color: #ff6961;
  }

  /* Rooms */
  .room {
    @apply relative flex min-w-0 flex-col items-center rounded-2xl px-2 py-4 text-zinc-300 transition duration-150 active:scale-95;
    border: 1px solid rgba(255, 255, 255, 0.07);
    background: radial-gradient(circle at 50% 0%, #26262d 0%, #17171c 85%);
  }
  .room.is-sel {
    color: #fff;
    border-color: rgba(48, 209, 88, 0.6);
    background: radial-gradient(circle at 50% 0%, rgba(48, 209, 88, 0.28) 0%, rgba(48, 209, 88, 0.06) 85%);
    box-shadow: 0 0 22px rgba(48, 209, 88, 0.2);
  }
  .badge {
    @apply absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold;
    background: #30d158;
    color: #06240f;
  }
  .cta {
    @apply flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-[15px] font-semibold transition duration-150 active:scale-[0.98];
    color: #111114;
    background: linear-gradient(180deg, #ffffff 0%, #e4e4e9 100%);
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.5), inset 0 1px 0 #ffffff;
  }

  /* How to clean */
  .mode {
    @apply flex flex-col items-center rounded-2xl px-2 py-4 text-zinc-400 transition duration-150 active:scale-95;
    border: 1px solid rgba(255, 255, 255, 0.07);
    background: rgba(255, 255, 255, 0.04);
  }
  .mode.is-sel {
    color: #fff;
    border-color: rgba(100, 210, 255, 0.55);
    background: radial-gradient(circle at 50% 0%, rgba(100, 210, 255, 0.24) 0%, rgba(100, 210, 255, 0.05) 85%);
    box-shadow: 0 0 22px rgba(100, 210, 255, 0.16);
  }
  .level {
    @apply flex flex-col items-center rounded-xl py-2.5 text-zinc-500 transition duration-150 active:scale-95;
    background: rgba(255, 255, 255, 0.04);
  }
  .level.is-sel {
    color: #30d158;
    background: rgba(48, 209, 88, 0.14);
    box-shadow: inset 0 0 0 1px rgba(48, 209, 88, 0.45);
  }
  .level.is-water.is-sel {
    color: #64d2ff;
    background: rgba(100, 210, 255, 0.14);
    box-shadow: inset 0 0 0 1px rgba(100, 210, 255, 0.45);
  }
  .seg {
    @apply grid grid-cols-4 gap-1 rounded-xl p-1;
    background: rgba(0, 0, 0, 0.35);
  }
  .seg button {
    @apply truncate rounded-lg px-1 py-2 text-[12px] font-semibold text-zinc-400 transition duration-150;
  }
  .seg button.is-sel {
    color: #fff;
    background: rgba(255, 255, 255, 0.14);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
  }

  /* The dock */
  .tank {
    @apply flex min-w-0 flex-col items-center rounded-2xl px-2 pb-3 pt-4 text-center;
    border: 1px solid rgba(255, 255, 255, 0.06);
    background: rgba(255, 255, 255, 0.04);
  }
  .tank.is-bad {
    border-color: rgba(255, 69, 58, 0.45);
    background: rgba(255, 69, 58, 0.08);
  }
  .tank-body {
    @apply relative h-14 w-10 overflow-hidden rounded-[10px];
    border: 2px solid rgba(255, 255, 255, 0.16);
    background: rgba(0, 0, 0, 0.3);
  }
  .tank-level {
    @apply absolute inset-x-0 bottom-0 transition-all duration-700;
    background: linear-gradient(180deg, rgb(var(--tank) / 0.85) 0%, rgb(var(--tank) / 0.55) 100%);
  }
  .dock-act {
    @apply flex flex-col items-center gap-2 rounded-2xl px-2 py-3.5 text-center text-[12px] font-semibold leading-tight text-zinc-300 transition duration-150 active:scale-95;
    border: 1px solid rgba(255, 255, 255, 0.07);
    background: radial-gradient(circle at 50% 0%, #26262d 0%, #17171c 85%);
  }
  .dock-act:hover {
    color: #fff;
  }
  .dock-act.is-on {
    color: #ffd60a;
    border-color: rgba(255, 214, 10, 0.45);
    background: radial-gradient(circle at 50% 0%, rgba(255, 214, 10, 0.2) 0%, rgba(255, 214, 10, 0.04) 85%);
  }

  /* Wear */
  .wear {
    @apply h-1.5 overflow-hidden rounded-full;
    background: rgba(255, 255, 255, 0.08);
  }
  .wear div {
    @apply h-full rounded-full;
  }

  /* The tile's own button */
  .play-btn {
    @apply flex h-[31px] w-[31px] flex-none items-center justify-center rounded-full transition duration-150 active:scale-90;
    background: rgba(120, 120, 128, 0.36);
    color: #fff;
  }
  .tile.is-on .play-btn {
    background: rgb(var(--accent-rgb));
    color: #0a0a0d;
  }
</style>
