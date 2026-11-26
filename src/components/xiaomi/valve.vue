<script setup>
  // Moes HY-368 radiator valve, reached through the Xiaomi gateway (shelter-xiaomi-module
  // radiatorValve.ts). The valve sleeps between polls, so a change shows up here as soon as it is
  // sent and is confirmed a few seconds later, when the valve echoes it.
  import {computed, ref} from "vue";
  import Device from "@/components/Device.vue";
  import Toggle from "@/components/controls/Toggle.vue";
  import List from "@/components/properties/List.vue";
  import Item from "@/components/properties/Item.vue";
  import Section from "@/components/properties/Section.vue";
  import LastUpdate from "@/components/properties/LastUpdate.vue";
  import TemperatureHero from "@/components/controls/TemperatureHero.vue";
  import {registry as Registry} from "@/registry";
  import {wifiSignal} from "@/format";

  const props = defineProps({
    item: Object,
    device: Object
  });

  const state = computed(() => props.device.properties);
  const online = computed(() => state.value.available === true);
  // Right after a backend restart the valve looks fresh but cannot be written to for up to a minute.
  const controllable = computed(() => online.value && state.value.reachable !== false);

  const ERRORS = {
    'The gateway has not been heard from yet, wait a minute': 'Шлюз ще не відповів — спробуйте за хвилину',
    'The gateway is not connected': 'Немає зв\'язку зі шлюзом',
    'The valve has not been heard from yet': 'Клапан ще не виходив на зв\'язок',
  };

  const error = ref('');

  const call = async (method, params = {}) => {
    const result = await Registry.call(props.device.id, method, params).catch(() => null);
    error.value = result === null ? 'Пульт не відповідає'
        : result.code !== 0 ? (ERRORS[result.data?.error] ?? result.data?.error ?? 'Не вдалося') : '';
  };

  const PRESET_LABELS = {
    manual: 'вручну',
    schedule: 'розклад',
    comfort: 'комфорт',
    eco: 'еко',
    boost: 'буст',
    away: 'відпустка',
    complex: 'складний',
  };

  const PRESETS = [
    {value: 'manual', label: 'Вручну', icon: 'M4 6h16M4 12h16M4 18h16'},
    {value: 'schedule', label: 'Розклад', icon: 'M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 10h18M8 2v4M16 2v4'},
    {value: 'comfort', label: 'Комфорт', icon: 'M12 3v2M12 19v2M5.6 5.6 7 7M17 17l1.4 1.4M3 12h2M19 12h2M5.6 18.4 7 17M17 7l1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z'},
    {value: 'eco', label: 'Еко', icon: 'M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10ZM2 21c0-3 1.85-5.36 5.08-6'},
    {value: 'boost', label: 'Буст', icon: 'M13 2 3 14h9l-1 8 10-12h-9l1-8z'},
    {value: 'away', label: 'Відпустка', icon: 'M4 8h16v12H4zM9 8V5h6v3M4 13h16'},
  ];

  const temp = (value) => value === null || value === undefined ? '—' : `${Number(value).toFixed(value % 1 ? 1 : 0)}°`;

  const preset = computed(() => state.value.targetPreset ?? state.value.preset);
  const presetLabel = computed(() => PRESET_LABELS[preset.value] ?? preset.value ?? '—');

  const caption = computed(() => {
    if (!online.value) {
      return 'Немає зв\'язку';
    }
    if (state.value.heating) {
      return `Гріє · клапан ${state.value.valve}%`;
    }
    return `Тримає · ${presetLabel.value}`;
  });

  const schedules = computed(() => [
    {label: 'Будні', points: state.value.workdays ?? []},
    {label: 'Вихідні', points: state.value.holidays ?? []},
  ].filter(day => day.points.length));
</script>

<template>
  <Device accent="amber" :active="online && state.heating === true">
    <template #icon>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
        <rect x="6" y="14" width="9" height="38" rx="4.5" fill="#fc7e29"/>
        <rect x="18" y="14" width="9" height="38" rx="4.5" fill="#ff9f43"/>
        <rect x="30" y="14" width="9" height="38" rx="4.5" fill="#fc7e29"/>
        <rect x="42" y="14" width="9" height="38" rx="4.5" fill="#ff9f43"/>
        <rect x="4" y="20" width="49" height="4" rx="2" fill="#b54e08"/>
        <rect x="4" y="42" width="49" height="4" rx="2" fill="#b54e08"/>
        <rect x="53" y="40" width="5" height="8" rx="1.5" fill="#9aa0a6"/>
        <rect x="52" y="27" width="9" height="13" rx="3" fill="#eaf0f3"/>
        <rect x="54.5" y="30" width="4" height="5" rx="1" fill="#4671c6"/>
      </svg>
    </template>

    <template #title>
      {{ item.name }}
    </template>

    <template #status>
      <span v-if="!online">Немає зв'язку</span>
      <span v-else-if="state.heating">Гріє · {{ temp(state.localTemperature) }} → {{ temp(state.targetTemperature) }}</span>
      <span v-else>{{ temp(state.localTemperature) }} · {{ presetLabel }}</span>
      <span v-if="online && state.batteryLow" class="pill pill-fault"><span class="pill-dot"></span>батарейки</span>
    </template>

    <template #action>
    </template>

    <template #extended>
      <TemperatureHero
          :target="state.targetTemperature" :current="state.localTemperature" current-label="Біля клапана"
          :caption="caption"
          :min="state.minTemperature ?? 5" :max="state.maxTemperature ?? 35" :step="0.5"
          :disabled="!controllable || state.targetTemperature === null || state.targetTemperature === undefined"
          @update:target="value => call('setTemperature', {value})"></TemperatureHero>

      <p v-if="error" class="-mt-3 px-4 text-center text-[13px] text-[#ff453a]">{{ error }}</p>

      <Section>
        <List>
          <li class="field-row mode-row">
            <span class="field-label">Режим</span>
            <div class="mode-grid">
              <button v-for="option in PRESETS" :key="option.value" type="button"
                  class="mode-btn" :class="{'is-sel': preset === option.value}" :disabled="!controllable"
                  @click="call('setPreset', {value: option.value})">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"><path :d="option.icon"/></svg>
                <span class="mode-txt">{{ option.label }}</span>
              </button>
            </div>
          </li>
          <Item label="Клапан">
            <span :class="state.heating ? 'pill pill-accent' : 'pill pill-muted'">
              <span class="pill-dot"></span>{{ state.valve === null || state.valve === undefined ? '—' : state.heating ? `відкрито ${state.valve}%` : 'закрито' }}
            </span>
          </Item>
          <Item v-if="state.windowOpen" label="Вікно">
            <span class="pill pill-accent"><span class="pill-dot"></span>Відчинене — не гріє</span>
          </Item>
        </List>
      </Section>

      <Section name="Налаштування">
        <List>
          <Item label="Блокування кнопок">
            <Toggle :value="state.childLock === true" @click="call('setChildLock', {value: !state.childLock})"></Toggle>
          </Item>
          <Item label="Відчинене вікно">
            <div class="flex items-center gap-3">
              <span v-if="state.windowTemperature > 0 && state.windowTemperature <= 20" class="text-[13px] text-[color:var(--ink-2)]">−{{ state.windowTemperature }}° за {{ state.windowMinutes }} хв</span>
              <Toggle :value="state.windowDetection === true" @click="call('setWindowDetection', {value: !state.windowDetection})"></Toggle>
            </div>
          </Item>
          <!-- The valve tells these only now and then; until it has, the rows stay out. -->
          <Item v-if="state.comfortTemperature !== null || state.ecoTemperature !== null" label="Комфорт · Еко">
            <span>{{ temp(state.comfortTemperature) }} · {{ temp(state.ecoTemperature) }}</span>
          </Item>
          <Item v-if="state.awayTemperature !== null" label="Відпустка">
            <span>{{ temp(state.awayTemperature) }}<template v-if="state.awayDays"> · {{ state.awayDays }} дн.</template></span>
          </Item>
          <Item v-if="state.boostTime" label="Буст">
            <span>{{ state.boostTime ? `${Math.round(state.boostTime / 60)} хв` : '—' }}</span>
          </Item>
          <Item v-if="state.calibration" label="Поправка датчика">
            <span>{{ state.calibration > 0 ? '+' : '−' }}{{ Math.abs(state.calibration) }}°</span>
          </Item>
        </List>
      </Section>

      <Section v-if="schedules.length" name="Розклад клапана">
        <List>
          <li v-for="day in schedules" :key="day.label" class="field-row block">
            <span class="field-label">{{ day.label }}</span>
            <div class="mt-2 flex flex-wrap gap-1.5">
              <span v-for="(point, index) in day.points" :key="index" class="pill" :class="{'pill-accent': point.current && preset === 'schedule'}">
                {{ point.time }} · {{ point.temperature }}°
              </span>
            </div>
          </li>
        </List>
      </Section>

      <Section name="Пристрій">
        <List>
          <Item label="Зв'язок">
            <span :class="online ? 'pill pill-accent' : 'pill pill-muted'">
              <span class="pill-dot"></span>{{ online ? 'Zigbee' : 'Немає зв\'язку' }}
            </span>
          </Item>
          <Item label="Сигнал">
            <span>{{ wifiSignal(state.rssi) }}</span>
          </Item>
          <Item label="Батарейки">
            <span v-if="state.batteryLow === true" class="pill pill-fault"><span class="pill-dot"></span>Сідають</span>
            <span v-else-if="state.batteryLow === false" class="pill pill-ok"><span class="pill-dot"></span>Гаразд</span>
            <span v-else>—</span>
          </Item>
          <Item label="Оновлено">
            <div class="flex items-center gap-2">
              <LastUpdate :timestamp="state.lastSeen"></LastUpdate>
              <button type="button" class="ctl-btn px-2.5 py-1 text-xs" :disabled="!state.lastSeen" @click="call('refresh')">Оновити</button>
            </div>
          </Item>
        </List>
      </Section>
    </template>
  </Device>
</template>

<style scoped>
  .mode-row {
    @apply block;
  }
  .mode-grid {
    @apply mt-2.5 grid grid-cols-3 gap-1.5;
  }
  .mode-btn {
    @apply flex flex-col items-center justify-center gap-1 rounded-xl py-2.5 transition duration-150 active:scale-95;
    background: rgba(255, 255, 255, 0.06);
    color: var(--ink-2);
  }
  .mode-btn:hover {
    background: rgba(255, 255, 255, 0.09);
    color: #fff;
  }
  .mode-btn:disabled {
    @apply cursor-not-allowed opacity-40;
  }
  .mode-btn.is-sel {
    background: rgb(var(--accent-rgb));
    color: #0a0a0d;
    box-shadow: 0 0 14px rgb(var(--accent-rgb) / 0.35);
  }
  .mode-txt {
    @apply text-[10px] font-semibold tracking-wide;
  }
  .ctl-btn:disabled {
    @apply cursor-not-allowed opacity-40;
  }
  .pill-ok {
    background: rgba(52, 211, 153, 0.16);
    color: #34d399;
  }
  .pill-fault {
    background: rgba(248, 113, 113, 0.16);
    color: #f87171;
  }
</style>
