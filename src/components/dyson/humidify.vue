<script setup>
  import {computed} from "vue";
  import Device from "@/components/Device.vue";
  import Toggle from "@/components/controls/Toggle.vue";
  import List from "@/components/properties/List.vue";
  import Item from "@/components/properties/Item.vue";
  import Section from "@/components/properties/Section.vue";
  import LastUpdate from "@/components/properties/LastUpdate.vue";
  import {registry as Registry} from "@/registry";
  import {airLevel, airMetrics} from "@/air";

  const props = defineProps({
    item: Object,
    device: Object
  });

  const p = computed(() => props.device.properties);
  const online = computed(() => p.value.available === true);
  const call = (method, value) => Registry.call(props.device.id, method, value === undefined ? {} : {value});

  // What it aims for: its own pick in auto, the set one otherwise.
  const target = computed(() => p.value.humidifyAuto ? p.value.autoTargetHumidity : p.value.targetHumidity);

  const goal = computed(() => {
    if (!p.value.power) {
      return 'Dyson вимкнений';
    }
    if (!p.value.humidify) {
      return 'Зволоження вимкнене, лише очищення';
    }
    return p.value.humidifyAuto ? `Зволожує до ${target.value}% — сам обрав ціль` : `Зволожує до ${target.value}%`;
  });

  const TARGETS = [30, 40, 50, 60, 70];

  const metrics = computed(() => airMetrics(p.value));
  const air = computed(() => airLevel(p.value));

  const show = (value) => value % 1 === 0 ? value : value < 1 ? value.toFixed(value < 0.1 ? 3 : 1) : value.toFixed(1);

  const FAN = ['auto', 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const fan = computed(() => p.value.fanAuto ? 'auto' : p.value.fanSpeed);
  const setFan = (value) => value === 'auto' ? call('setFanAuto', true) : call('setFanSpeed', parseInt(value));

  // 'CUST' is an angle set in the Dyson app, which this card shows but does not offer.
  const ANGLES = [
    {label: 'Вимк.', value: 'off'},
    {label: '45°', value: '0045'},
    {label: '90°', value: '0090'},
    {label: 'Бриз', value: 'BRZE'},
  ];
  const angle = computed(() => p.value.oscillation ? p.value.oscillationAngle : 'off');
  const setAngle = (value) => value === 'off' ? call('setOscillation', false) : call('setOscillationAngle', value);

  const WARNINGS = {FLTR: 'Пора міняти фільтр'};
  const warning = computed(() => p.value.warning ? WARNINGS[p.value.warning] ?? `Попередження ${p.value.warning}` : null);

  const HARDNESS = {soft: 'м\'яка', medium: 'середня', hard: 'тверда'};

  const deepClean = computed(() => {
    if (p.value.deepCleaning) {
      return `триває, ще ${p.value.deepCleanLeft} хв`;
    }
    const hours = p.value.deepCleanIn;
    if (hours === null || hours === undefined) {
      return '—';
    }
    return hours === 0 ? 'пора' : hours < 48 ? `через ${hours} год` : `через ${Math.round(hours / 24)} дн`;
  });
</script>

<template>
  <Device accent="sky" :active="online && p.power">
    <template #icon>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="17" y="3" width="30" height="36" rx="14" fill="none" stroke="#c9d3e3" stroke-width="6"/><path fill="#3ea7fb" d="M32 12c-4.5 5.4-6.5 8.6-6.5 11.6a6.5 6.5 0 0 0 13 0c0-3-2-6.2-6.5-11.6z"/><rect x="19" y="37" width="26" height="23" rx="6" fill="#5a6b8c"/><rect x="24" y="45" width="16" height="10" rx="2.5" fill="#3ea7fb" opacity=".9"/></svg>
    </template>

    <template #title>
      {{ item.name }}
    </template>

    <template #status>
      <span v-if="!online">Немає зв'язку</span>
      <template v-else>
        <span v-if="warning" class="font-medium">{{ p.humidity ?? '—' }}% · {{ warning.toLowerCase() }}</span>
        <span v-else-if="!p.power">Вимкнено<template v-if="p.humidity !== null"> · {{ p.humidity }}%</template></span>
        <span v-else-if="p.humidify">{{ p.humidity ?? '—' }}% · ціль {{ target }}%</span>
        <span v-else>{{ p.humidity ?? '—' }}% · очищення</span>
      </template>
    </template>

    <template #action>
      <Toggle @click="call(p.power ? 'disable' : 'enable')" :value="p.power"></Toggle>
    </template>

    <template #extended>
      <div class="hero">
        <p class="text-[13px] font-medium text-[color:var(--ink-2)]">Вологість у кімнаті</p>
        <div class="mt-1 flex items-end justify-between gap-3">
          <span class="text-[56px] font-light leading-none tracking-tight tabular-nums">{{ p.humidity ?? '—' }}<span class="text-[28px] text-[color:var(--ink-2)]">%</span></span>
          <div class="pb-1 text-right text-[13px] leading-5 text-[color:var(--ink-2)]">
            <p v-if="p.temperature !== null"><span class="font-semibold text-[color:var(--ink)]">{{ p.temperature }}°</span> у кімнаті</p>
            <p v-if="air" class="inline-flex items-center gap-1.5">
              <span class="dot" :style="{background: `rgb(${air.rgb})`}"></span>повітря {{ air.word }}
            </p>
          </div>
        </div>
        <!-- 0–100 %, the comfortable 40–60 % marked, the tick at what it aims for. -->
        <div class="meter" :class="{'is-idle': !p.power || !p.humidify}">
          <div class="meter-comfort"></div>
          <div class="meter-fill" :style="{width: `${Math.min(100, Math.max(0, p.humidity ?? 0))}%`}"></div>
          <div v-if="p.power && p.humidify && target" class="meter-target" :style="{left: `${target}%`}"></div>
        </div>
        <p class="mt-2 text-[13px] text-[color:var(--ink-3)]">{{ goal }}</p>
      </div>

      <Section name="Зволоження">
        <List>
          <Item label="Зволоження">
            <Toggle @click="call('setHumidify', !(p.power && p.humidify))" :value="p.power && p.humidify"></Toggle>
          </Item>
          <li class="field-row block">
            <span class="field-label">Ціль</span>
            <div class="seg-grid">
              <button type="button" class="seg-btn" :class="{'is-sel': p.power && p.humidify && p.humidifyAuto}"
                      :disabled="!online" @click="call('setHumidifyAuto', true)">Авто</button>
              <button v-for="value in TARGETS" :key="value" type="button" class="seg-btn tabular-nums"
                      :class="{'is-sel': p.power && p.humidify && !p.humidifyAuto && p.targetHumidity === value}"
                      :disabled="!online" @click="call('setTargetHumidity', value)">{{ value }}%</button>
            </div>
          </li>
        </List>
      </Section>

      <Section v-if="metrics.length" name="Якість повітря">
        <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <div v-for="metric in metrics" :key="metric.key" class="aq">
            <p class="truncate text-[13px] text-[color:var(--ink-2)]">{{ metric.label }}</p>
            <p class="mt-0.5 text-[22px] font-semibold leading-tight tabular-nums">{{ show(metric.value) }}
              <span class="text-[12px] font-normal text-[color:var(--ink-3)]">{{ metric.unit }}</span></p>
            <p class="mt-1 inline-flex items-center gap-1.5 text-[12px] text-[color:var(--ink-2)]">
              <span class="dot" :style="{background: `rgb(${metric.level.rgb})`}"></span>{{ metric.level.word }}
            </p>
          </div>
        </div>
      </Section>

      <Section name="Вентилятор">
        <List>
          <Item label="Швидкість">
            <select class="dy-select" :value="fan" :disabled="!online" @change="e => setFan(e.target.value)">
              <option v-for="value in FAN" :key="value" :value="value">{{ value === 'auto' ? 'Авто' : value }}</option>
            </select>
          </Item>
          <Item label="Поворот">
            <select class="dy-select" :value="angle" :disabled="!online" @change="e => setAngle(e.target.value)">
              <option v-for="option in ANGLES" :key="option.value" :value="option.value">{{ option.label }}</option>
              <option v-if="angle === 'CUST'" value="CUST" disabled>Свій кут</option>
            </select>
          </Item>
          <Item label="Нічний режим">
            <Toggle @click="call('setNightMode', !p.nightMode)" :value="p.nightMode"></Toggle>
          </Item>
        </List>
      </Section>

      <Section name="Догляд">
        <List>
          <Item label="Фільтр">
            <span :class="{'pill pill-accent': p.filterLife !== null && p.filterLife <= 10}">{{ p.filterLife ?? '—' }}%</span>
          </Item>
          <Item label="Глибоке чищення">
            <span>{{ deepClean }}</span>
          </Item>
          <Item label="Жорсткість води" v-if="p.waterHardness">
            <span>{{ HARDNESS[p.waterHardness] ?? p.waterHardness }}</span>
          </Item>
          <Item label="Попередження">
            <span :class="warning ? 'text-[#ff453a]' : ''">{{ warning ?? 'немає' }}</span>
          </Item>
        </List>
      </Section>

      <Section name="Пристрій">
        <List>
          <Item label="Зв'язок">
            <span :class="online ? '' : 'text-[#ff453a]'">{{ online ? 'на зв\'язку' : 'немає зв\'язку' }}</span>
          </Item>
          <Item label="Останній код помилки" v-if="p.error">
            <span>{{ p.error }}</span>
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
      radial-gradient(80% 120% at 50% 0%, rgb(var(--accent-rgb) / 0.2) 0%, rgba(0, 0, 0, 0) 70%),
      var(--group);
  }
  .meter {
    @apply relative mt-4 h-3 overflow-hidden rounded-full;
    background: rgba(255, 255, 255, 0.1);
  }
  .meter-comfort {
    @apply absolute inset-y-0;
    left: 40%;
    width: 20%;
    background: rgba(255, 255, 255, 0.1);
  }
  .meter-fill {
    @apply absolute inset-y-0 left-0 rounded-full transition-all duration-500;
    background: rgb(var(--accent-rgb));
  }
  .meter.is-idle .meter-fill {
    background: rgba(255, 255, 255, 0.35);
  }
  .meter-target {
    @apply absolute inset-y-0 w-[3px] -translate-x-1/2 rounded-full;
    background: var(--ink);
    box-shadow: 0 0 0 2px rgba(24, 24, 30, 0.9);
  }
  .dot {
    @apply inline-block h-2 w-2 flex-none rounded-full;
  }
  .aq {
    @apply rounded-[14px] px-3.5 py-3;
    background: var(--group);
  }
  .seg-grid {
    @apply mt-2.5 grid grid-cols-6 gap-1.5;
  }
  .seg-btn {
    @apply rounded-xl py-2.5 text-[13px] font-semibold transition duration-150 active:scale-95;
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
  .dy-select {
    @apply rounded-lg px-2.5 py-1.5 text-[15px] outline-none transition duration-150;
    background: rgba(120, 120, 128, 0.24);
    color: var(--ink);
    max-width: 12rem;
  }
  .dy-select:hover {
    background: rgba(255, 255, 255, 0.1);
  }
  .dy-select option {
    background: #18181b;
    color: #fff;
  }
</style>
