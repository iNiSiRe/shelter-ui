<script setup>
  import {computed, ref} from "vue";
  import Device from "@/components/Device.vue";
  import Section from "@/components/properties/Section.vue";
  import {registry as Registry} from "@/registry";
  import {ago} from "@/format";

  const props = defineProps({
    item: Object,
    device: Object
  });

  // The monthly readings, kept by the Guard (guard/meters.ts): on the 25th it asks in Telegram,
  // and the answer goes to Kyivvodokanal (cold and hot water) and KTE (heat and hot water). The
  // same can be typed here.
  const KINDS = [
    {key: 'heat', name: 'Тепло', cabinets: ['kte']},
    {key: 'cold', name: 'Холодна вода', cabinets: ['vodokanal']},
    {key: 'hot', name: 'Гаряча вода', cabinets: ['vodokanal', 'kte']},
  ];
  const NAMES = {heat: 'тепло', cold: 'холодна вода', hot: 'гаряча вода'};
  const MONTHS = ['Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень', 'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'];
  const ASK_DAY = 25;

  const p = computed(() => props.device.properties ?? {});
  const monthOf = (month) => MONTHS[Number(month.slice(5, 7)) - 1] ?? month;
  const figure = (value) => Number(Number(value).toFixed(4)).toString();
  const dayMonth = (time) => {
    const date = new Date(time);
    return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}`;
  };

  const now = ref(Date.now());
  const tick = () => now.value = Date.now();
  const today = computed(() => new Date(now.value));
  const askDate = computed(() => `${ASK_DAY}.${String(today.value.getMonth() + 1).padStart(2, '0')}`);
  const lastDay = computed(() => new Date(today.value.getFullYear(), today.value.getMonth() + 1, 0).getDate() === today.value.getDate());

  const cabinets = computed(() => Object.entries(p.value.cabinets ?? {}).map(([id, cabinet]) => ({id, ...cabinet})));
  const mode = computed(() => p.value.mode ?? 'off');

  // Each meter once, with the figure its cabinets hold; the hot-water meter sits on both.
  const meters = computed(() => KINDS.map(kind => {
    const found = Object.entries(p.value.meters ?? {})
        .flatMap(([cabinet, list]) => (list ?? []).filter(meter => meter.kind === kind.key).map(meter => ({...meter, cabinet})));
    if (found.length === 0) {
      return null;
    }
    const where = found.map(meter => p.value.cabinets?.[meter.cabinet]?.name ?? meter.cabinet);
    return {...kind, number: found[0].number, unit: found[0].unit, last: Math.max(...found.map(meter => meter.last)), where: where.join(', ')};
  }).filter(meter => meter !== null));
  const last = computed(() => Object.fromEntries(meters.value.map(meter => [meter.key, meter.last])));

  const CABINET_STATUS = {
    idle: 'не подавалось', sending: 'подаю…', done: 'подано', retry: 'не прийняв, спробую ще', confirm: 'питає підтвердження', stopped: 'не подано',
  };
  const trouble = computed(() => cabinets.value.find(cabinet => ['retry', 'confirm', 'stopped'].includes(cabinet.status)) ?? null);
  const allDone = computed(() => cabinets.value.length > 0 && cabinets.value.every(cabinet => cabinet.status === 'done'));
  const sending = computed(() => cabinets.value.some(cabinet => cabinet.status === 'sending'));
  const doneAt = computed(() => Math.max(...cabinets.value.map(cabinet => cabinet.at ?? 0)));
  const waiting = computed(() => p.value.readings == null && today.value.getDate() >= ASK_DAY);

  // Nothing to say about the cabinets before anything went to them, unless a login is missing.
  const showCabinets = computed(() => cabinets.value.some(cabinet => cabinet.status !== 'idle' || cabinet.ready === false));

  // Red only when it needs a person: a failure the Guard retries by itself does not.
  const alert = computed(() => mode.value === 'on'
      && (cabinets.value.some(cabinet => ['confirm', 'stopped'].includes(cabinet.status)) || (lastDay.value && p.value.readings == null)));
  const TROUBLE = {retry: 'не прийняв', confirm: 'питає', stopped: 'не подано'};

  // The big line of the sheet; the cabinets below say which and why.
  const heroText = computed(() => mode.value === 'on' && p.value.readings != null && !sending.value && trouble.value ? 'Не все подано' : statusText.value);

  const statusText = computed(() => {
    if (mode.value === 'off') return 'Вимкнено';
    if (p.value.pending) return 'Чекає підтвердження';
    if (p.value.readings == null) return waiting.value ? 'Чекає показників' : `Подача з ${askDate.value}`;
    if (mode.value !== 'on') return 'Перевірено, не подано';
    if (sending.value) return 'Подаю…';
    if (trouble.value) return `${trouble.value.name} ${TROUBLE[trouble.value.status]}`;
    if (allDone.value) return `Подано ${dayMonth(doneAt.value)}`;
    return 'Подаю…';
  });

  // The form: heat and cold are needed, hot water only if it ever moves.
  const draft = ref({heat: '', cold: '', hot: ''});
  const busy = ref(false);
  const error = ref(null);
  const jumps = ref(null);

  const parse = (text) => {
    const value = Number(String(text).trim().replace(',', '.'));
    return String(text).trim() === '' || !Number.isFinite(value) ? null : value;
  };
  const ready = computed(() => parse(draft.value.heat) !== null && parse(draft.value.cold) !== null
      && (draft.value.hot.trim() === '' || parse(draft.value.hot) !== null));

  const problemText = (problem) => problem.issue === 'less'
      ? `${NAMES[problem.kind]} ${figure(problem.value)} менше за попередні ${figure(problem.last)}`
      : `${NAMES[problem.kind]} +${figure(problem.value - problem.last)} за місяць`;
  const sentence = (parts) => {
    const text = parts.join(', ');
    return text.charAt(0).toUpperCase() + text.slice(1);
  };

  const call = async (method, params) => {
    busy.value = true;
    error.value = null;
    try {
      return await Registry.call(props.device.id, method, params);
    } catch {
      error.value = 'Немає зв\'язку з Pi';
      return null;
    } finally {
      busy.value = false;
    }
  };

  const submit = async (confirm = false) => {
    const params = {heat: parse(draft.value.heat), cold: parse(draft.value.cold), confirm};
    if (parse(draft.value.hot) !== null) {
      params.hot = parse(draft.value.hot);
    }
    const result = await call('submit', params);
    if (result === null) {
      return;
    }
    if (result.code === 0) {
      jumps.value = null;
      draft.value = {heat: '', cold: '', hot: ''};
      return;
    }
    const problems = result.data?.problems ?? [];
    if (result.data?.error === 'jump') {
      jumps.value = sentence(problems.map(problemText));
    } else if (result.data?.error === 'less') {
      error.value = `${sentence(problems.map(problemText))}. Перевірте цифри.`;
    } else {
      error.value = `Не вдалося: ${result.data?.error ?? 'помилка'}`;
    }
  };

  const confirmKte = (confirm) => call('kte', {confirm});

  const cabinetLine = (cabinet) => {
    if (cabinet.status === 'done') {
      const sent = KINDS.filter(kind => cabinet.sent?.[kind.key] !== undefined).map(kind => `${NAMES[kind.key]} ${figure(cabinet.sent[kind.key])}`);
      return `${dayMonth(cabinet.at)} · ${sent.join(', ')}${cabinet.verified === false ? ' · кабінет ще показує старі цифри' : ''}`;
    }
    // «Водоканал: …» under the Водоканал row says its name twice.
    return (cabinet.message ?? '').replace(new RegExp(`^${cabinet.name}:\\s*`), '');
  };

  const history = computed(() => [...(p.value.history ?? [])].reverse().slice(0, 12));
</script>

<template>
  <Device accent="sky" :alert="alert" @open="tick">
    <template #icon>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="26" fill="#c9d3e3"/><circle cx="32" cy="32" r="20" fill="#f4f7fb"/><rect x="17" y="24" width="30" height="10" rx="2" fill="#1c2433"/><path fill="#64d2ff" d="M20 27h3v4h-3zm5 0h3v4h-3zm5 0h3v4h-3zm5 0h3v4h-3z"/><rect x="40" y="27" width="4" height="4" fill="#ff453a"/><path fill="#7d8aa3" d="M32 38l6 6-1.5 1.5-6-6z"/><circle cx="32" cy="40" r="3" fill="#7d8aa3"/></svg>
    </template>

    <template #title>
      {{ item.name }}
    </template>

    <template #status>
      <span :class="{'font-medium': alert || p.pending || waiting}">{{ statusText }}</span>
    </template>

    <template #extended>
      <div class="hero">
        <p class="text-[13px] font-medium text-[color:var(--ink-2)]">Показники за {{ monthOf(p.month ?? '').toLowerCase() }}</p>
        <div class="mt-1 flex items-end justify-between gap-3">
          <span class="text-[34px] font-light leading-none tracking-tight" :class="alert ? 'text-[#ff6961]' : ''">{{ heroText }}</span>
        </div>
        <p v-if="mode === 'observe'" class="mt-2 text-[12px] text-[#ffd60a]">Режим перевірки: Guard питає й перевіряє, але нічого не подає.</p>
      </div>

      <Section v-if="showCabinets" name="Кабінети">
        <ul role="list" class="field-list">
          <li v-for="cabinet in cabinets" :key="cabinet.id" class="px-4 py-3">
            <div class="flex items-baseline justify-between gap-3">
              <span class="text-[15px]">{{ cabinet.name }}</span>
              <span class="text-[13px] font-semibold"
                    :class="{'text-[#30d158]': cabinet.status === 'done', 'text-[#ff6961]': ['retry', 'stopped'].includes(cabinet.status),
                             'text-[#ffd60a]': cabinet.status === 'confirm', 'text-[color:var(--ink-3)]': ['idle', 'sending'].includes(cabinet.status)}">
                {{ cabinet.ready === false ? 'немає логіна' : CABINET_STATUS[cabinet.status] }}
              </span>
            </div>
            <p v-if="cabinetLine(cabinet)" class="mt-1 text-[12px] leading-[1.4] text-[color:var(--ink-3)]">{{ cabinetLine(cabinet) }}</p>
            <div v-if="cabinet.id === 'kte' && cabinet.status === 'confirm'" class="mt-2 flex gap-2">
              <button type="button" class="ctl-btn apply" :disabled="busy" @click="confirmKte(true)">Так, подати</button>
              <button type="button" class="ctl-btn w-full px-3 py-2.5 text-[15px]" :disabled="busy" @click="confirmKte(false)">Ні</button>
            </div>
          </li>
        </ul>
      </Section>

      <Section v-if="mode !== 'off'" :name="p.readings ? 'Подати ще раз' : 'Подати'">
        <ul role="list" class="field-list">
          <li v-for="kind in KINDS" :key="kind.key" class="field-row">
            <label :for="`meter-${kind.key}`" class="field-label">{{ kind.name }}</label>
            <input :id="`meter-${kind.key}`" v-model="draft[kind.key]" type="text" inputmode="decimal" autocomplete="off"
                   class="meter-input" :placeholder="last[kind.key] === undefined ? '' : figure(last[kind.key])"
                   @input="jumps = null; error = null">
          </li>
          <li class="px-4 py-3">
            <button v-if="!jumps" type="button" class="ctl-btn apply" :disabled="busy || !ready" @click="submit(false)">
              {{ mode === 'on' ? 'Подати у Водоканал і КТЕ' : 'Перевірити' }}
            </button>
            <template v-else>
              <p class="mb-2 text-[13px] text-[#ffd60a]">{{ jumps }}, це багато. Так і є?</p>
              <button type="button" class="ctl-btn apply" :disabled="busy" @click="submit(true)">{{ mode === 'on' ? 'Так, подати' : 'Так, перевірити' }}</button>
            </template>
            <p v-if="error" class="mt-2 text-[13px] text-[#ff6961]">{{ error }}</p>
          </li>
        </ul>
      </Section>

      <Section v-if="meters.length" name="Лічильники">
        <ul role="list" class="field-list">
          <li v-for="meter in meters" :key="meter.key" class="field-row">
            <div class="min-w-0">
              <p class="field-label">{{ meter.name }}</p>
              <p class="text-[12px] text-[color:var(--ink-3)]">№{{ meter.number }} · {{ meter.where }}</p>
            </div>
            <span class="field-value tabular-nums">{{ figure(meter.last) }} {{ meter.unit }}</span>
          </li>
        </ul>
        <p v-if="p.metersAt" class="mt-1.5 px-4 text-[12px] text-[color:var(--ink-3)]">З кабінетів {{ ago(p.metersAt, now) }}</p>
      </Section>

      <Section v-if="history.length" name="Попередні місяці">
        <ul role="list" class="field-list">
          <li v-for="past in history" :key="past.month" class="field-row">
            <span class="field-label">{{ monthOf(past.month) }}</span>
            <span class="field-value text-[13px] tabular-nums">
              <template v-if="past.readings">тепло {{ figure(past.readings.heat) }} · вода {{ figure(past.readings.cold) }}</template>
              <template v-else>не подано</template>
              <span class="ml-1.5" :class="past.done?.vodokanal && past.done?.kte ? 'text-[#30d158]' : 'text-[#ff6961]'">
                {{ past.done?.vodokanal && past.done?.kte ? '✓' : '✗' }}
              </span>
            </span>
          </li>
        </ul>
      </Section>

      <p class="px-4 text-[12px] leading-[1.45] text-[color:var(--ink-3)]">
        {{ ASK_DAY }} числа Guard питає в Telegram тепло і холодну воду, а відповідь подає у Водоканал і КТЕ.
        Гаряча вода йде тією цифрою, що вже стоїть у кабінеті, якщо не вписати нову.
      </p>
    </template>
  </Device>
</template>

<style scoped>
  .hero {
    @apply rounded-[18px] px-4 py-3.5;
    background: var(--group);
  }
  .meter-input {
    @apply w-32 rounded-lg px-2.5 py-1.5 text-right text-[15px] tabular-nums outline-none transition duration-150;
    background: rgba(120, 120, 128, 0.24);
    color: var(--ink);
    border: 1px solid transparent;
  }
  .meter-input:focus {
    border-color: rgb(var(--accent-rgb));
  }
  .meter-input::placeholder {
    color: var(--ink-3);
  }
  .apply {
    @apply w-full px-3 py-2.5 text-[15px] font-semibold;
    background: rgb(var(--accent-rgb) / 0.22);
    color: rgb(var(--accent-rgb));
  }
  .apply:disabled {
    @apply opacity-40;
  }
</style>
