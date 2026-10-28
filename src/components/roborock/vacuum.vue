<script setup>
  import {computed, ref} from "vue";
  import Device from "@/components/Device.vue";
  import Toggle from "@/components/controls/Toggle.vue";
  import List from "@/components/properties/List.vue";
  import Item from "@/components/properties/Item.vue";
  import Section from "@/components/properties/Section.vue";
  import LastUpdate from "@/components/properties/LastUpdate.vue";
  import {registry as Registry} from "@/registry";

  const props = defineProps({
    item: Object,
    device: Object
  });

  const p = computed(() => props.device.properties);
  const online = computed(() => p.value.available === true);

  // What the last button did not manage, said under the buttons until the next one.
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
  const paused = computed(() => p.value.state === 'paused');
  const problem = computed(() => p.value.errorText ?? p.value.dockErrorText ?? null);
  const capital = (text) => text ? text[0].toUpperCase() + text.slice(1) : text;

  // The tile's button: pause what runs, pick up what is paused, else clean the whole flat.
  const togglePlay = () => cleaning.value || p.value.state === 'returning' ? call('pause') : call('start');

  const level = computed(() => p.value.battery >= 50 ? '163 230 53' : p.value.battery >= 20 ? '255 214 10' : '255 69 58');

  // The Roborock app names rooms in English unless renamed there.
  const ROOM_NAMES = {
    bedroom: 'Спальня', kitchen: 'Кухня', corridor: 'Коридор', hallway: 'Коридор', 'living room': 'Вітальня',
    bathroom: 'Ванна', toilet: 'Туалет', balcony: 'Балкон', study: 'Кабінет', 'dining room': 'Їдальня',
    'kids room': 'Дитяча', "children's room": 'Дитяча', 'guest room': 'Гостьова', storage: 'Комора',
  };
  const roomName = (name) => ROOM_NAMES[name.toLowerCase()] ?? name;

  // Rooms to clean, picked on the sheet; empty means the whole flat.
  const picked = ref([]);
  const pick = (id) => picked.value = picked.value.includes(id) ? picked.value.filter(room => room !== id) : [...picked.value, id];
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
    {value: 'vacuum', label: 'Пилосос'},
    {value: 'both', label: 'Пилосос і швабра'},
    {value: 'mop', label: 'Швабра'},
  ];
  const FAN = [
    {value: 'quiet', label: 'Тихо'},
    {value: 'balanced', label: 'Баланс'},
    {value: 'turbo', label: 'Турбо'},
    {value: 'max', label: 'Макс'},
  ];
  const WATER = [
    {value: 'low', label: 'Мало'},
    {value: 'medium', label: 'Середньо'},
    {value: 'high', label: 'Багато'},
  ];
  const ROUTES = [
    {value: 'fast', label: 'Швидко'},
    {value: 'standard', label: 'Звичайно'},
    {value: 'deep', label: 'Ретельно'},
    {value: 'deep_plus', label: 'Дуже ретельно'},
  ];

  const PARTS = [
    {key: 'mainBrush', label: 'Основна щітка'},
    {key: 'sideBrush', label: 'Бокова щітка'},
    {key: 'filter', label: 'Фільтр'},
    {key: 'sensors', label: 'Датчики', note: 'протерти'},
    {key: 'dockStrainer', label: 'Фільтр станції'},
    {key: 'dockBrush', label: 'Щітка станції'},
  ];
  const parts = computed(() => PARTS.filter(part => typeof p.value.consumables?.[part.key] === 'number'));

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
  <Device accent="emerald" :active="online && busy" :alert="online && problem !== null">
    <template #icon>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="34" r="25" fill="#e9edf2"/><circle cx="32" cy="34" r="25" fill="none" stroke="#9aa5b4" stroke-width="2.5"/><circle cx="32" cy="22" r="7" fill="#5a6b8c"/><circle cx="32" cy="22" r="3" fill="#30d158"/><path d="M14 44a20 20 0 0 0 36 0" fill="none" stroke="#c4ccd6" stroke-width="3" stroke-linecap="round"/></svg>
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
      <button type="button" class="play-btn" :disabled="!online" @click="togglePlay"
              :aria-label="cleaning || p.state === 'returning' ? 'Пауза' : paused ? 'Продовжити' : 'Прибрати'">
        <svg v-if="cleaning || p.state === 'returning'" viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4"><rect x="6" y="5" width="4" height="14" rx="1.2"/><rect x="14" y="5" width="4" height="14" rx="1.2"/></svg>
        <svg v-else viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l11-6.5a1 1 0 0 0 0-1.72l-11-6.5A1 1 0 0 0 8 5.5z"/></svg>
      </button>
    </template>

    <template #extended>
      <div class="hero">
        <p class="text-[13px] font-medium text-[color:var(--ink-2)]">{{ p.name || 'Roborock' }}</p>
        <div class="mt-1 flex items-end justify-between gap-3">
          <span class="text-[34px] font-light leading-tight tracking-tight">{{ online ? stateText : 'Немає зв\'язку' }}</span>
          <span v-if="p.battery !== null" class="pb-1 text-[22px] font-semibold tabular-nums">{{ p.battery }}<span class="text-[14px] text-[color:var(--ink-2)]">%</span></span>
        </div>
        <div class="meter">
          <div class="meter-fill" :style="{width: `${Math.min(100, Math.max(0, p.battery ?? 0))}%`, background: `rgb(${level})`}"></div>
        </div>
        <p v-if="problem" class="problem">{{ capital(problem) }}</p>
        <p v-else-if="cleaning || paused" class="mt-2 text-[13px] text-[color:var(--ink-2)]">
          {{ p.cleanArea ?? '—' }} м² за {{ p.cleanTime ?? '—' }} хв<template v-if="p.cleanPercent"> · {{ p.cleanPercent }}%</template>
        </p>
        <p v-else-if="p.drying" class="mt-2 text-[13px] text-[color:var(--ink-2)]">Станція сушить швабру</p>

        <div class="mt-4 grid grid-cols-3 gap-2">
          <button v-if="cleaning || p.state === 'returning'" type="button" class="act is-main" :disabled="!online" @click="call('pause')">Пауза</button>
          <button v-else type="button" class="act is-main" :disabled="!online" @click="call('start')">{{ paused || p.unfinished ? 'Продовжити' : 'Прибрати все' }}</button>
          <button type="button" class="act" :disabled="!online || p.state === 'returning'" @click="call('dock')">На базу</button>
          <button type="button" class="act" :disabled="!online" @click="call('find')">Знайти</button>
        </div>
        <p v-if="failed" class="mt-2 text-[13px] text-[#ff453a]">Не вийшло: {{ failed }}</p>
      </div>

      <Section v-if="p.rooms?.length" name="Кімнати">
        <div class="flex flex-wrap gap-2">
          <button v-for="room in p.rooms" :key="room.id" type="button" class="room" :class="{'is-sel': picked.includes(room.id)}"
                  :disabled="!online" @click="pick(room.id)">{{ roomName(room.name) }}</button>
        </div>
        <button v-if="picked.length" type="button" class="act is-main mt-3 w-full" :disabled="!online" @click="cleanPicked">
          Прибрати {{ picked.length === 1 ? 'кімнату' : `${picked.length} кімнати` }}
        </button>
      </Section>

      <Section name="Як прибирати">
        <List>
          <li class="field-row block">
            <span class="field-label">Режим</span>
            <div class="seg-grid grid-cols-3">
              <button v-for="option in MODES" :key="option.value" type="button" class="seg-btn" :class="{'is-sel': mode === option.value}"
                      :disabled="!online" @click="setMode(option.value)">{{ option.label }}</button>
            </div>
          </li>
          <li v-if="mode !== 'mop'" class="field-row block">
            <span class="field-label">Потужність</span>
            <div class="seg-grid grid-cols-4">
              <button v-for="option in FAN" :key="option.value" type="button" class="seg-btn" :class="{'is-sel': p.fanPower === option.value}"
                      :disabled="!online" @click="call('setFanPower', {value: option.value})">{{ option.label }}</button>
            </div>
          </li>
          <li v-if="mode !== 'vacuum'" class="field-row block">
            <span class="field-label">Вода</span>
            <div class="seg-grid grid-cols-3">
              <button v-for="option in WATER" :key="option.value" type="button" class="seg-btn" :class="{'is-sel': p.waterMode === option.value}"
                      :disabled="!online" @click="call('setWaterMode', {value: option.value})">{{ option.label }}</button>
            </div>
          </li>
          <li class="field-row block">
            <span class="field-label">Маршрут</span>
            <div class="seg-grid grid-cols-4">
              <button v-for="option in ROUTES" :key="option.value" type="button" class="seg-btn" :class="{'is-sel': p.mopRoute === option.value}"
                      :disabled="!online" @click="call('setMopRoute', {value: option.value})">{{ option.label }}</button>
            </div>
          </li>
        </List>
      </Section>

      <Section name="Станція">
        <List>
          <Item label="Помити швабру">
            <button type="button" class="act-sm" :disabled="!online || busy" @click="call('washMop')">Помити</button>
          </Item>
          <Item label="Вивантажити пил">
            <button type="button" class="act-sm" :disabled="!online || busy" @click="call('emptyBin')">Вивантажити</button>
          </Item>
          <Item label="Сушіння швабри">
            <Toggle @click="call('setDrying', {value: !p.drying})" :value="p.drying"></Toggle>
          </Item>
          <Item label="Чиста вода" v-if="p.cleanWaterEmpty !== null">
            <span :class="p.cleanWaterEmpty ? 'text-[#ff453a]' : ''">{{ p.cleanWaterEmpty ? 'долийте' : 'є' }}</span>
          </Item>
          <Item label="Брудна вода" v-if="p.dirtyWaterFull !== null">
            <span :class="p.dirtyWaterFull ? 'text-[#ff453a]' : ''">{{ p.dirtyWaterFull ? 'злийте' : 'гаразд' }}</span>
          </Item>
          <Item label="Помилка станції" v-if="p.dockErrorText">
            <span class="text-[#ff453a]">{{ p.dockErrorText }}</span>
          </Item>
        </List>
      </Section>

      <Section v-if="parts.length" name="Догляд">
        <List>
          <Item v-for="part in parts" :key="part.key" :label="part.label">
            <span :class="{worn: p.consumables[part.key] <= 10}">{{ p.consumables[part.key] }}%<template v-if="p.consumables[part.key] <= 10"> · {{ part.note ?? 'замінити' }}</template></span>
          </Item>
        </List>
      </Section>

      <Section name="Прибирання">
        <List>
          <Item label="Останнє" v-if="p.lastClean">
            <span>{{ when(p.lastClean.begin) }}<template v-if="!p.lastClean.complete"> · не завершене</template></span>
          </Item>
          <Item label="Прибрано" v-if="p.lastClean">
            <span>{{ p.lastClean.area }} м² за {{ p.lastClean.duration }} хв</span>
          </Item>
          <Item label="Усього" v-if="p.totalCleans !== null">
            <span>{{ p.totalCleans }} разів · {{ p.totalArea ?? '—' }} м² · {{ p.totalTime ?? '—' }} год</span>
          </Item>
        </List>
      </Section>

      <Section name="Пристрій">
        <List>
          <Item label="Зв'язок">
            <span :class="online ? '' : 'text-[#ff453a]'">{{ online ? 'на зв\'язку' : 'немає зв\'язку' }}</span>
          </Item>
          <Item label="Модель" v-if="p.product">
            <span>{{ p.product }}</span>
          </Item>
          <Item label="Оновлено" v-if="p.updatedAt">
            <LastUpdate :timestamp="p.updatedAt"></LastUpdate>
          </Item>
        </List>
      </Section>
    </template>
  </Device>
</template>

<style scoped>
  .hero {
    @apply rounded-[22px] p-4;
    background:
      radial-gradient(80% 120% at 50% 0%, rgb(var(--accent-rgb) / 0.18) 0%, rgba(0, 0, 0, 0) 70%),
      var(--group);
  }
  .meter {
    @apply relative mt-3 h-2 overflow-hidden rounded-full;
    background: rgba(255, 255, 255, 0.1);
  }
  .meter-fill {
    @apply absolute inset-y-0 left-0 rounded-full transition-all duration-500;
  }
  .problem {
    @apply mt-3 rounded-xl px-3 py-2 text-[14px] font-medium;
    background: rgba(255, 69, 58, 0.16);
    color: #ff6961;
  }
  .worn {
    color: #ff6961;
  }
  .play-btn {
    @apply flex h-[31px] w-[31px] flex-none items-center justify-center rounded-full transition duration-150 active:scale-90;
    background: rgba(120, 120, 128, 0.36);
    color: #fff;
  }
  .tile.is-on .play-btn {
    background: rgb(var(--accent-rgb));
    color: #0a0a0d;
  }
  .play-btn:disabled, .act:disabled, .act-sm:disabled, .room:disabled {
    @apply cursor-not-allowed opacity-40;
  }
  .act {
    @apply rounded-xl py-2.5 text-[14px] font-semibold transition duration-150 active:scale-95;
    background: rgba(255, 255, 255, 0.08);
    color: var(--ink);
  }
  .act.is-main {
    background: rgb(var(--accent-rgb));
    color: #0a0a0d;
  }
  .act-sm {
    @apply rounded-lg px-3 py-1.5 text-[14px] font-semibold transition duration-150 active:scale-95;
    background: rgba(120, 120, 128, 0.24);
    color: var(--ink);
  }
  .room {
    @apply rounded-full px-3.5 py-2 text-[14px] font-medium transition duration-150 active:scale-95;
    background: var(--group);
    color: var(--ink-2);
  }
  .room.is-sel {
    background: rgb(var(--accent-rgb));
    color: #0a0a0d;
  }
  .seg-grid {
    @apply mt-2.5 grid gap-1.5;
  }
  .seg-btn {
    @apply rounded-xl px-1 py-2.5 text-[13px] font-semibold transition duration-150 active:scale-95;
    background: rgba(255, 255, 255, 0.06);
    color: var(--ink-2);
  }
  .seg-btn:hover {
    background: rgba(255, 255, 255, 0.09);
    color: #fff;
  }
  .seg-btn.is-sel {
    background: rgb(var(--accent-rgb));
    color: #0a0a0d;
    box-shadow: 0 0 14px rgb(var(--accent-rgb) / 0.35);
  }
  .seg-btn:disabled {
    @apply cursor-not-allowed opacity-40;
  }
</style>
