<script setup>
  import {computed, ref} from "vue";
  import Device from "@/components/Device.vue";
  import Section from "@/components/properties/Section.vue";
  import {registry as Registry} from "@/registry";

  const props = defineProps({
    item: Object,
    device: Object
  });

  // The cartridges are counted by the calendar, by the Guard (guard/filters.ts): each lasts
  // lifeDays from its last replacement.
  const GROUPS = [
    {key: 'drinking', name: 'Питна вода', short: 'питна', place: 'під мийкою'},
    {key: 'main', name: 'Проточна вода', short: 'проточна', place: 'у ванній'},
  ];

  const LIVES = [30, 60, 90, 120, 180, 270, 365, 540, 730, 1095];

  const pad = (value) => String(value).padStart(2, '0');
  const localDate = (date = new Date()) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const dayNumber = (date) => {
    const [year, month, day] = date.split('-').map(Number);
    return Date.UTC(year, month - 1, day) / 86_400_000;
  };

  // A sheet left open overnight still counts from the right day.
  const today = ref(localDate());
  const tick = () => today.value = localDate();

  // 1 день, 2 дні, 5 днів, 21 день.
  const daysText = (count) => {
    const tens = count % 100, ones = count % 10;
    const word = tens >= 11 && tens <= 14 ? 'днів' : ones === 1 ? 'день' : ones >= 2 && ones <= 4 ? 'дні' : 'днів';
    return `${count}\u00a0${word}`;
  };
  const lifeText = (days) => days % 365 === 0 ? (days === 365 ? '12\u00a0міс' : `${days / 365}\u00a0${days / 365 < 5 ? 'роки' : 'років'}`)
      : days % 30 === 0 ? `${days / 30}\u00a0міс` : daysText(days);
  const dayMonth = (date) => {
    const short = `${date.slice(8, 10)}.${date.slice(5, 7)}`;
    return date.slice(0, 4) === today.value.slice(0, 4) ? short : `${short}.${date.slice(0, 4)}`;
  };
  const fullDate = (date) => `${date.slice(8, 10)}.${date.slice(5, 7)}.${date.slice(0, 4)}`;

  // dashboard.yaml may give the tile one group (`group: drinking`); without it the tile has both.
  const single = computed(() => GROUPS.some(group => group.key === props.item.group));

  const filters = computed(() => (props.device.properties.filters ?? [])
      .filter(filter => !single.value || filter.group === props.item.group)
      .map(filter => {
    const left = filter.dueAt ? dayNumber(filter.dueAt) - dayNumber(today.value) : null;
    const state = left === null ? 'unknown' : left <= 0 ? 'due' : left <= 14 ? 'soon' : 'ok';
    return {
      ...filter,
      left,
      state,
      share: left === null ? 0 : Math.min(1, Math.max(0, left / filter.lifeDays)),
    };
  }));

  const groups = computed(() => GROUPS
      .map(group => ({...group, filters: filters.value.filter(filter => filter.group === group.key)}))
      .filter(group => group.filters.length > 0));

  // The nearest replacement, for the tile and the top of the sheet.
  const next = computed(() => filters.value
      .filter(filter => filter.left !== null)
      .sort((a, b) => a.left - b.left)[0] ?? null);
  const nextGroup = computed(() => GROUPS.find(group => group.key === next.value?.group));
  const unknown = computed(() => filters.value.filter(filter => filter.left === null).length);
  const overdue = computed(() => next.value !== null && next.value.left <= 0);

  const COLOURS = {due: '#ff453a', soon: '#ffd60a', ok: '#30d158', unknown: 'transparent'};

  const leftText = (filter) => filter.left === null ? 'дата невідома'
      : filter.left < 0 ? `прострочено ${daysText(-filter.left)}`
      : filter.left === 0 ? 'міняти сьогодні'
      : `ще ${daysText(filter.left)}`;

  // One editor open at a time: a filter's id, or `all:<group>` for the whole group.
  const open = ref(null);
  const date = ref(localDate());
  const draftName = ref('');
  const busy = ref(false);
  const error = ref(null);

  const toggle = (key, filter = null) => {
    tick();
    error.value = null;
    if (open.value === key) {
      open.value = null;
      return;
    }
    open.value = key;
    date.value = today.value;
    draftName.value = filter?.name ?? '';
  };

  const ERRORS = {
    'date is in the future': 'Дата ще не настала',
    'date must be YYYY-MM-DD': 'Невірна дата',
    'unknown filter': 'Такого фільтра немає',
  };

  const send = async (method, params, close = true) => {
    busy.value = true;
    error.value = null;
    try {
      const result = await Registry.call(props.device.id, method, params);
      if (result.code !== 0) {
        error.value = ERRORS[result.data?.error] ?? `Не вдалося: ${result.data?.error ?? 'помилка'}`;
        return;
      }
      if (close) {
        open.value = null;
      }
    } catch {
      error.value = 'Немає зв\'язку з Pi';
    } finally {
      busy.value = false;
    }
  };

  const replace = (ids) => send('replace', {ids, date: date.value});
  const undo = (filter) => send('undo', {id: filter.id}, false);
  const setLife = (filter, days) => send('configure', {id: filter.id, lifeDays: days}, false);
  const rename = (filter) => {
    const name = draftName.value.trim();
    if (name !== '' && name !== filter.name) {
      send('configure', {id: filter.id, name}, false);
    }
  };

  const lives = (filter) => LIVES.includes(filter.lifeDays) ? LIVES : [...LIVES, filter.lifeDays].sort((a, b) => a - b);
  const allLabel = (count) => count === 2 ? 'обидва' : count === 3 ? 'усі три' : `усі ${count}`;
</script>

<template>
  <Device accent="cyan" @open="tick">
    <template #icon>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="14" y="5" width="36" height="9" rx="3" fill="#7d8aa3"/><path fill="#c9d3e3" d="M18 14h28v36a10 10 0 0 1-10 10h-8a10 10 0 0 1-10-10z"/><path fill="#9fb0c8" d="M38 14h8v36a10 10 0 0 1-8 9.8z"/><path fill="#32ade6" d="M32 24c-5 6-7.5 9.6-7.5 13.2a7.5 7.5 0 0 0 15 0C39.5 33.6 37 30 32 24z"/></svg>
    </template>

    <template #title>
      {{ item.name }}
    </template>

    <template #status>
      <span v-if="!filters.length">—</span>
      <span v-else-if="overdue" class="font-medium">Пора міняти<template v-if="!single"> · {{ nextGroup?.short }}</template></span>
      <span v-else-if="unknown === filters.length">{{ filters.length > 1 ? 'Вкажіть дати замін' : 'Вкажіть дату заміни' }}</span>
      <span v-else-if="next && single">Заміна за {{ daysText(next.left) }}</span>
      <span v-else-if="next">{{ nextGroup?.name.split(' ')[0] }} — за {{ daysText(next.left) }}</span>
    </template>

    <template #extended>
      <div v-if="next" class="hero">
        <p class="text-[13px] font-medium" :class="overdue ? 'text-[#ff6961]' : 'text-[color:var(--ink-2)]'">
          {{ next.left < 0 ? 'Заміна прострочена на' : 'Наступна заміна' }}
        </p>
        <div class="mt-1 flex items-end justify-between gap-3">
          <span v-if="next.left === 0" class="text-[44px] font-light leading-none tracking-tight text-[#ff6961]">Сьогодні</span>
          <span v-else class="text-[56px] font-light leading-none tracking-tight tabular-nums" :class="overdue ? 'text-[#ff6961]' : ''">
            {{ Math.abs(next.left) }}<span class="ml-1.5 text-[22px]" :class="overdue ? '' : 'text-[color:var(--ink-2)]'">{{ daysText(Math.abs(next.left)).split('\u00a0')[1] }}</span>
          </span>
          <div class="pb-1 text-right text-[13px] leading-5 text-[color:var(--ink-2)]">
            <p><span class="font-semibold text-[color:var(--ink)]">{{ nextGroup?.name }}</span></p>
            <p>{{ next.left < 0 ? 'строк був' : 'до' }} {{ dayMonth(next.dueAt) }}</p>
          </div>
        </div>
      </div>

      <Section v-for="group in groups" :key="group.key"
               :name="single ? (group.filters.length > 1 ? `Картриджі · ${group.place}` : '') : `${group.name} · ${group.place}`">
        <ul role="list" class="field-list">
          <li v-for="filter in group.filters" :key="filter.id">
            <button type="button" class="filter-row" :aria-expanded="open === filter.id" @click="toggle(filter.id, filter)">
              <div class="flex items-baseline justify-between gap-3">
                <span class="text-[15px] text-[color:var(--ink)]">{{ filter.name }}</span>
                <span class="text-[13px] font-semibold tabular-nums"
                      :class="{'text-[#ff6961]': filter.state === 'due', 'text-[#ffd60a]': filter.state === 'soon',
                               'text-[color:var(--ink-2)]': filter.state === 'ok', 'text-[color:var(--ink-3)]': filter.state === 'unknown'}">
                  {{ leftText(filter) }}
                </span>
              </div>
              <div class="wear mt-2">
                <div :style="{width: `${filter.state === 'unknown' ? 0 : Math.max(filter.share * 100, 2)}%`, background: COLOURS[filter.state]}"></div>
              </div>
              <p class="mt-1.5 text-[12px] text-[color:var(--ink-3)]">
                <template v-if="filter.replacedAt">замінено {{ dayMonth(filter.replacedAt) }} · до {{ dayMonth(filter.dueAt) }} · ресурс {{ lifeText(filter.lifeDays) }}</template>
                <template v-else>Торкніться, щоб указати дату заміни</template>
              </p>
            </button>

            <div v-if="open === filter.id" class="editor">
              <div class="editor-line">
                <span class="field-label">Дата заміни</span>
                <input type="date" v-model="date" :max="today" class="filter-input" aria-label="Дата заміни">
              </div>
              <div class="editor-action px-4 pb-3">
                <button type="button" class="ctl-btn apply" :disabled="busy || !date" @click="replace([filter.id])">
                  Замінив {{ date === today ? 'сьогодні' : dayMonth(date || today) }}
                </button>
              </div>
              <div class="editor-line">
                <span class="field-label">Ресурс</span>
                <select class="filter-input" :value="filter.lifeDays" :disabled="busy"
                        @change="e => setLife(filter, parseInt(e.target.value))">
                  <option v-for="days in lives(filter)" :key="days" :value="days">{{ lifeText(days) }}</option>
                </select>
              </div>
              <div class="editor-line">
                <span class="field-label">Назва</span>
                <input type="text" v-model="draftName" maxlength="40" class="filter-input w-44 text-right" aria-label="Назва картриджа"
                       @change="rename(filter)" @keydown.enter="e => e.target.blur()">
              </div>
              <div v-if="filter.history.length" class="editor-line items-start">
                <span class="field-label">Заміни</span>
                <div class="flex flex-col items-end gap-1 text-[13px] tabular-nums text-[color:var(--ink-2)]">
                  <span v-for="day in [...filter.history].reverse()" :key="day">{{ fullDate(day) }}</span>
                  <button type="button" class="mt-1 text-[13px] text-[#ff6961] disabled:opacity-40" :disabled="busy" @click="undo(filter)">
                    Скасувати останню
                  </button>
                </div>
              </div>
              <p v-if="error" class="px-4 pb-3 text-[13px] text-[#ff6961]">{{ error }}</p>
            </div>
          </li>

          <li v-if="group.filters.length > 1">
            <button type="button" class="filter-row text-[15px] text-[rgb(var(--accent-rgb))]" @click="toggle(`all:${group.key}`)">
              Замінив {{ allLabel(group.filters.length) }} разом…
            </button>
            <div v-if="open === `all:${group.key}`" class="editor">
              <div class="editor-line">
                <span class="field-label">Дата заміни</span>
                <input type="date" v-model="date" :max="today" class="filter-input" aria-label="Дата заміни">
              </div>
              <div class="editor-action px-4 pb-3">
                <button type="button" class="ctl-btn apply" :disabled="busy || !date" @click="replace(group.filters.map(filter => filter.id))">
                  Замінив {{ allLabel(group.filters.length) }} {{ date === today ? 'сьогодні' : dayMonth(date || today) }}
                </button>
              </div>
              <p v-if="error" class="px-4 pb-3 text-[13px] text-[#ff6961]">{{ error }}</p>
            </div>
          </li>
        </ul>
      </Section>

      <p class="px-4 text-[12px] leading-[1.45] text-[color:var(--ink-3)]">
        Рахується за календарем: від дати заміни до кінця ресурсу. Guard нагадає в Telegram за тиждень і в день заміни,
        з кнопкою «Замінив сьогодні».
      </p>
    </template>
  </Device>
</template>

<style scoped>
  .hero {
    @apply rounded-[18px] px-4 py-3.5;
    background: var(--group);
  }
  .filter-row {
    @apply block w-full px-4 py-3 text-left transition duration-150;
  }
  .filter-row:active {
    background: rgba(255, 255, 255, 0.05);
  }
  .wear {
    @apply h-1.5 overflow-hidden rounded-full;
    background: rgba(255, 255, 255, 0.08);
  }
  .wear div {
    @apply h-full rounded-full;
  }
  .editor {
    box-shadow: inset 0 1px 0 var(--hairline);
    background: rgba(255, 255, 255, 0.03);
  }
  .editor-line {
    @apply flex min-h-[46px] items-center justify-between gap-4 px-4 py-2 text-[15px];
  }
  .editor-line + .editor-line,
  .editor-action + .editor-line {
    box-shadow: inset 0 1px 0 var(--hairline);
  }
  .filter-input {
    @apply rounded-lg px-2.5 py-1.5 text-[15px] outline-none transition duration-150;
    background: rgba(120, 120, 128, 0.24);
    color: var(--ink);
    border: 1px solid transparent;
    color-scheme: dark;
  }
  .filter-input:focus {
    border-color: rgb(var(--accent-rgb));
  }
  .filter-input option {
    background: #18181b;
    color: #fff;
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
