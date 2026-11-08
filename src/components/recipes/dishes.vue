<script setup>
  import {computed, ref, watch} from "vue";
  import Device from "@/components/Device.vue";
  import Section from "@/components/properties/Section.vue";
  import Toggle from "@/components/controls/Toggle.vue";
  import {registry as Registry} from "@/registry";

  const props = defineProps({
    item: Object,
    device: Object
  });

  // The family's cookbook, kept by the Guard (guard/recipes.ts): dishes with their recipes, typed
  // in here, searched here by name, ingredient or tag.
  const CATEGORIES = [
    {key: 'breakfast', name: 'Сніданки', one: 'Сніданок'},
    {key: 'soup', name: 'Супи', one: 'Суп'},
    {key: 'main', name: 'Основне', one: 'Основна страва'},
    {key: 'side', name: 'Гарніри', one: 'Гарнір'},
    {key: 'salad', name: 'Салати', one: 'Салат'},
    {key: 'snack', name: 'Закуски', one: 'Закуска'},
    {key: 'bakery', name: 'Випічка', one: 'Випічка'},
    {key: 'dessert', name: 'Десерти', one: 'Десерт'},
    {key: 'drink', name: 'Напої', one: 'Напій'},
    {key: 'sauce', name: 'Соуси', one: 'Соус'},
    {key: 'other', name: 'Інше', one: 'Інше'},
  ];
  const categoryOf = (key) => CATEGORIES.find(category => category.key === key) ?? CATEGORIES[CATEGORIES.length - 1];

  const pad = (value) => String(value).padStart(2, '0');
  const localDate = (date = new Date()) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const dayNumber = (date) => {
    const [year, month, day] = date.split('-').map(Number);
    return Date.UTC(year, month - 1, day) / 86_400_000;
  };
  const today = ref(localDate());
  const tick = () => today.value = localDate();

  // 1 страва, 2 страви, 5 страв, 21 страва.
  const plural = (count, one, few, many) => {
    const tens = count % 100, ones = count % 10;
    return tens >= 11 && tens <= 14 ? many : ones === 1 ? one : ones >= 2 && ones <= 4 ? few : many;
  };
  const dishesText = (count) => `${count} ${plural(count, 'страва', 'страви', 'страв')}`;
  const servingsText = (count) => `${count} ${plural(count, 'порція', 'порції', 'порцій')}`;
  const timeText = (minutes) => minutes < 60 ? `${minutes} хв`
      : minutes % 60 === 0 ? `${minutes / 60} год` : `${Math.floor(minutes / 60)} год ${minutes % 60} хв`;
  const dayMonth = (date) => {
    const short = `${date.slice(8, 10)}.${date.slice(5, 7)}`;
    return date.slice(0, 4) === today.value.slice(0, 4) ? short : `${short}.${date.slice(0, 4)}`;
  };
  // «сьогодні», «вчора», «5 днів тому», «3 тижні тому», then the date.
  const cookedAgo = (date) => {
    const days = dayNumber(today.value) - dayNumber(date);
    if (days <= 0) return 'сьогодні';
    if (days === 1) return 'вчора';
    if (days < 14) return `${days} ${plural(days, 'день', 'дні', 'днів')} тому`;
    if (days < 60) {
      const weeks = Math.floor(days / 7);
      return `${weeks} ${plural(weeks, 'тиждень', 'тижні', 'тижнів')} тому`;
    }
    return dayMonth(date);
  };
  const hostOf = (link) => {
    try {
      return new URL(link).hostname.replace(/^www\./, '');
    } catch {
      return link;
    }
  };

  const dishes = computed(() => [...(props.device.properties.dishes ?? [])]
      .sort((a, b) => a.name.localeCompare(b.name, 'uk')));
  const count = computed(() => dishes.value.length);
  const favorites = computed(() => dishes.value.filter(dish => dish.favorite).length);
  const latest = computed(() => dishes.value.filter(dish => dish.lastCooked)
      .sort((a, b) => b.lastCooked.localeCompare(a.lastCooked))[0] ?? null);

  // ---- The list: a search, a category, the dishes by category ----
  const query = ref('');
  const filter = ref('all'); // all | favorites | <category>

  const haystack = (dish) => [dish.name, categoryOf(dish.category).name, ...dish.ingredients, ...dish.tags, dish.note ?? '']
      .join('\n').toLowerCase();
  const matches = (dish) => {
    const words = query.value.trim().toLowerCase().split(/\s+/).filter(word => word !== '');
    const text = haystack(dish);
    return words.every(word => text.includes(word));
  };

  const shown = computed(() => dishes.value.filter(dish =>
      (filter.value === 'all' || (filter.value === 'favorites' ? dish.favorite : dish.category === filter.value)) && matches(dish)));

  // The chips: only the categories that hold something.
  const chips = computed(() => [
    {key: 'all', name: 'Усі'},
    ...(favorites.value > 0 ? [{key: 'favorites', name: '★ Улюблені'}] : []),
    ...CATEGORIES.filter(category => dishes.value.some(dish => dish.category === category.key)),
  ]);

  // Without a search the list goes by category, each a section; a search gives one flat list.
  const groups = computed(() => {
    if (query.value.trim() !== '' || (filter.value !== 'all' && filter.value !== 'favorites')) {
      return [{key: 'found', name: '', dishes: shown.value}];
    }
    return CATEGORIES.map(category => ({...category, dishes: shown.value.filter(dish => dish.category === category.key)}))
        .filter(group => group.dishes.length > 0);
  });

  // «Що приготувати?»: one of the dishes not made for the longest time, within the chip chosen.
  const suggestion = ref(null);
  const suggest = () => {
    const pool = [...shown.value].filter(dish => dish.id !== suggestion.value?.id)
        .sort((a, b) => (a.lastCooked ?? '').localeCompare(b.lastCooked ?? ''));
    const candidates = pool.slice(0, Math.max(3, Math.ceil(pool.length / 3)));
    suggestion.value = candidates.length > 0 ? candidates[Math.floor(Math.random() * candidates.length)] : null;
  };
  watch([query, filter], () => suggestion.value = null);

  // ---- The views inside the sheet: the list, one dish, the editor ----
  const view = ref('list');
  const currentId = ref(null);
  const current = computed(() => dishes.value.find(dish => dish.id === currentId.value) ?? null);
  const root = ref(null);

  const show = (next) => {
    view.value = next;
    error.value = null;
    confirming.value = false;
    root.value?.closest('.sheet-scroll')?.scrollTo({top: 0});
  };
  const openDish = (dish) => {
    tick();
    currentId.value = dish.id;
    checked.value = new Set();
    show('detail');
  };
  const back = () => show('list');

  // Ticked ingredients while cooking or shopping, on this screen only.
  const checked = ref(new Set());
  const toggleChecked = (index) => {
    const next = new Set(checked.value);
    next.has(index) ? next.delete(index) : next.add(index);
    checked.value = next;
  };

  // ---- The editor ----
  const EMPTY = {name: '', category: 'main', time: '', servings: '', ingredients: '', steps: '', link: '', tags: '', note: '', favorite: false};
  const draft = ref({...EMPTY});
  const editingId = ref(null);

  const edit = (dish = null) => {
    editingId.value = dish?.id ?? null;
    draft.value = dish === null ? {...EMPTY} : {
      name: dish.name,
      category: dish.category,
      time: dish.time ?? '',
      servings: dish.servings ?? '',
      ingredients: dish.ingredients.join('\n'),
      steps: dish.steps.join('\n'),
      link: dish.link ?? '',
      tags: dish.tags.join(', '),
      note: dish.note ?? '',
      favorite: dish.favorite,
    };
    show('edit');
  };
  const cancelEdit = () => show(editingId.value === null ? 'list' : 'detail');
  const canSave = computed(() => draft.value.name.trim() !== '');

  const busy = ref(false);
  const error = ref(null);
  const confirming = ref(false);

  const ERRORS = {
    'name is required': 'Вкажіть назву',
    'link must start with http:// or https://': 'Посилання має починатися з http:// або https://',
    'unknown dish': 'Такої страви вже немає',
    'date is in the future': 'Дата ще не настала',
  };
  const call = async (method, params) => {
    busy.value = true;
    error.value = null;
    try {
      const result = await Registry.call(props.device.id, method, params);
      if (result.code !== 0) {
        const text = result.data?.error ?? 'помилка';
        error.value = ERRORS[text] ?? (text.includes('at most') ? 'Забагато тексту: ' + text : `Не вдалося: ${text}`);
        return null;
      }
      return result.data ?? {};
    } catch {
      error.value = 'Немає зв\'язку з Pi';
      return null;
    } finally {
      busy.value = false;
    }
  };

  const number = (text) => String(text).trim() === '' ? null : Number(String(text).trim());
  const save = async () => {
    const fields = {
      name: draft.value.name,
      category: draft.value.category,
      time: number(draft.value.time),
      servings: number(draft.value.servings),
      ingredients: draft.value.ingredients,
      steps: draft.value.steps,
      link: draft.value.link.trim() === '' ? null : draft.value.link.trim(),
      tags: draft.value.tags,
      note: draft.value.note,
      favorite: draft.value.favorite,
    };
    const result = editingId.value === null ? await call('add', fields) : await call('update', {id: editingId.value, ...fields});
    if (result === null) {
      return;
    }
    if (editingId.value === null) {
      currentId.value = result.id;
      checked.value = new Set();
    }
    show('detail');
  };

  const setFavorite = (dish, favorite) => call('update', {id: dish.id, favorite});
  const cooked = (dish) => call('cooked', {id: dish.id, date: today.value});
  const uncook = (dish) => call('uncook', {id: dish.id});
  const remove = async (dish) => {
    if (!confirming.value) {
      confirming.value = true;
      return;
    }
    if (await call('remove', {id: dish.id}) !== null) {
      show('list');
    }
  };

  const metaOf = (dish) => [
    categoryOf(dish.category).one,
    dish.time ? timeText(dish.time) : null,
    dish.servings ? servingsText(dish.servings) : null,
  ].filter(part => part !== null).join(' · ');

  const rowLine = (dish) => [
    dish.servings ? servingsText(dish.servings) : null,
    dish.lastCooked ? `готували ${cookedAgo(dish.lastCooked)}` : null,
    dish.tags.length ? dish.tags.join(', ') : null,
  ].filter(part => part !== null).join(' · ');
</script>

<template>
  <Device accent="amber" @open="tick">
    <template #icon>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path fill="#c9d3e3" d="M8 40h48a2 2 0 0 1 2 2v2a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4v-2a2 2 0 0 1 2-2z"/><path fill="#f4f7fb" d="M12 40c0-11 9-19 20-19s20 8 20 19z"/><path fill="#c9d3e3" d="M12 40c0-11 9-19 20-19v19z" opacity=".55"/><rect x="29" y="15" width="6" height="6" rx="3" fill="#ff9f0a"/><path fill="#7d8aa3" d="M20 50h24l-2 5H22z"/></svg>
    </template>

    <template #title>
      {{ item.name }}
    </template>

    <template #status>
      <span v-if="count === 0">Додайте першу страву</span>
      <span v-else>{{ dishesText(count) }}<template v-if="latest"> · {{ latest.name }} {{ cookedAgo(latest.lastCooked) }}</template></span>
    </template>

    <template #extended>
      <div ref="root" class="flex flex-col gap-6">

        <!-- ===== The list ===== -->
        <template v-if="view === 'list'">
          <div class="flex flex-col gap-3">
            <input v-model="query" type="search" enterkeyhint="search" autocomplete="off" class="in w-full"
                   placeholder="Назва, інгредієнт, тег…" aria-label="Пошук страви">

            <div v-if="chips.length > 1" class="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 chips">
              <button v-for="chip in chips" :key="chip.key" type="button" class="chip-btn" :class="{'is-on': filter === chip.key}"
                      @click="filter = chip.key">{{ chip.name }}</button>
            </div>

            <button type="button" class="ctl-btn apply" @click="edit()">Додати страву</button>
          </div>

          <div v-if="count === 0" class="hero text-[14px] leading-[1.5] text-[color:var(--ink-2)]">
            Тут буде ваше меню: страви, які готуєте, з інгредієнтами, кроками й посиланням на рецепт.
            Шукається за назвою, інгредієнтом чи тегом, а «Що приготувати?» підкаже, чого давно не було.
          </div>

          <div v-else-if="shown.length > 0" class="hero">
            <div class="flex items-center justify-between gap-3">
              <p class="text-[15px] font-semibold">Що приготувати?</p>
              <button type="button" class="text-[15px] text-[rgb(var(--accent-rgb))]" @click="suggest">
                {{ suggestion ? 'Іншу' : 'Підказати' }}
              </button>
            </div>
            <button v-if="suggestion" type="button" class="mt-2 block w-full text-left" @click="openDish(suggestion)">
              <span class="text-[22px] font-light leading-tight">{{ suggestion.name }}</span>
              <p class="mt-0.5 text-[13px] text-[color:var(--ink-2)]">
                {{ suggestion.lastCooked ? `готували ${cookedAgo(suggestion.lastCooked)}` : 'ще не готували' }}<template v-if="suggestion.time"> · {{ timeText(suggestion.time) }}</template>
              </p>
            </button>
          </div>

          <p v-if="count > 0 && shown.length === 0" class="px-4 text-center text-[14px] text-[color:var(--ink-3)]">Нічого не знайдено</p>

          <Section v-for="group in groups" :key="group.key" :name="group.name || (query.trim() !== '' ? `Знайдено · ${dishesText(group.dishes.length)}` : '')">
            <ul role="list" class="field-list">
              <li v-for="dish in group.dishes" :key="dish.id">
                <button type="button" class="row" @click="openDish(dish)">
                  <div class="flex items-baseline justify-between gap-3">
                    <span class="min-w-0 truncate text-[15px] text-[color:var(--ink)]">
                      <span v-if="dish.favorite" class="mr-1 text-[#ff9f0a]">★</span>{{ dish.name }}
                    </span>
                    <span v-if="dish.time" class="flex-none text-[13px] tabular-nums text-[color:var(--ink-2)]">{{ timeText(dish.time) }}</span>
                  </div>
                  <p v-if="rowLine(dish)" class="mt-0.5 truncate text-[12px] text-[color:var(--ink-3)]">{{ rowLine(dish) }}</p>
                </button>
              </li>
            </ul>
          </Section>

          <p class="px-4 text-[12px] leading-[1.45] text-[color:var(--ink-3)]">
            Страви лежать на Pi у ~/.shelter-recipes.json і входять у нічну резервну копію.
          </p>
        </template>

        <!-- ===== One dish ===== -->
        <template v-else-if="view === 'detail'">
          <div class="nav">
            <button type="button" class="nav-btn" @click="back">‹ Страви</button>
            <button v-if="current" type="button" class="nav-btn" @click="edit(current)">Змінити</button>
          </div>

          <p v-if="!current" class="px-4 text-center text-[14px] text-[color:var(--ink-3)]">Зберігаю…</p>

          <template v-else>
            <div class="hero">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <h2 class="text-[26px] font-semibold leading-tight tracking-tight">{{ current.name }}</h2>
                  <p class="mt-1 text-[13px] text-[color:var(--ink-2)]">{{ metaOf(current) }}</p>
                </div>
                <button type="button" class="star" :class="{'is-on': current.favorite}" :disabled="busy"
                        :aria-label="current.favorite ? 'Прибрати з улюблених' : 'В улюблені'" :aria-pressed="current.favorite"
                        @click="setFavorite(current, !current.favorite)">★</button>
              </div>
              <div v-if="current.tags.length" class="mt-2.5 flex flex-wrap gap-1.5">
                <span v-for="tag in current.tags" :key="tag" class="pill pill-muted">{{ tag }}</span>
              </div>
            </div>

            <Section v-if="current.ingredients.length" :name="`Інгредієнти · ${current.ingredients.length}`">
              <ul role="list" class="field-list">
                <li v-for="(line, index) in current.ingredients" :key="index">
                  <button type="button" class="row row-check" :aria-pressed="checked.has(index)" @click="toggleChecked(index)">
                    <span class="check" :class="{'is-on': checked.has(index)}">
                      <svg v-if="checked.has(index)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5"><path d="M5 12.5 10 17 19 7"/></svg>
                    </span>
                    <span class="text-[15px]" :class="checked.has(index) ? 'line-through text-[color:var(--ink-3)]' : 'text-[color:var(--ink)]'">{{ line }}</span>
                  </button>
                </li>
              </ul>
              <button v-if="checked.size > 0" type="button" class="mt-1.5 px-4 text-[13px] text-[rgb(var(--accent-rgb))]" @click="checked = new Set()">Зняти позначки</button>
            </Section>

            <Section v-if="current.steps.length" name="Приготування">
              <ol class="field-list">
                <li v-for="(step, index) in current.steps" :key="index" class="flex gap-3 px-4 py-3">
                  <span class="flex-none text-[15px] font-semibold tabular-nums text-[rgb(var(--accent-rgb))]">{{ index + 1 }}</span>
                  <p class="text-[15px] leading-[1.45] text-[color:var(--ink)]">{{ step }}</p>
                </li>
              </ol>
            </Section>

            <Section v-if="current.note || current.link" name="">
              <ul role="list" class="field-list">
                <li v-if="current.note" class="px-4 py-3">
                  <p class="text-[13px] text-[color:var(--ink-3)]">Нотатка</p>
                  <p class="mt-0.5 whitespace-pre-line text-[15px] leading-[1.45]">{{ current.note }}</p>
                </li>
                <li v-if="current.link">
                  <a :href="current.link" target="_blank" rel="noopener noreferrer" class="row row-between">
                    <span class="text-[15px] text-[rgb(var(--accent-rgb))]">Відкрити рецепт</span>
                    <span class="truncate text-[13px] text-[color:var(--ink-3)]">{{ hostOf(current.link) }} ↗</span>
                  </a>
                </li>
              </ul>
            </Section>

            <Section name="Готували">
              <ul role="list" class="field-list">
                <li class="px-4 py-3">
                  <button type="button" class="ctl-btn apply" :disabled="busy || current.lastCooked === today" @click="cooked(current)">
                    {{ current.lastCooked === today ? 'Готували сьогодні ✓' : 'Готували сьогодні' }}
                  </button>
                </li>
                <li v-if="current.cooked.length" class="field-row items-start">
                  <span class="field-label">Коли</span>
                  <div class="flex flex-col items-end gap-1 text-[13px] tabular-nums text-[color:var(--ink-2)]">
                    <span v-for="day in [...current.cooked].reverse().slice(0, 8)" :key="day">{{ dayMonth(day) }} · {{ cookedAgo(day) }}</span>
                    <button type="button" class="mt-1 text-[13px] text-[#ff6961] disabled:opacity-40" :disabled="busy" @click="uncook(current)">Скасувати останню</button>
                  </div>
                </li>
                <li v-else class="field-row">
                  <span class="text-[13px] text-[color:var(--ink-3)]">Ще не готували за цим записом</span>
                </li>
              </ul>
            </Section>

            <div class="px-4">
              <button type="button" class="text-[15px] text-[#ff6961] disabled:opacity-40" :disabled="busy" @click="remove(current)">
                {{ confirming ? 'Так, видалити «' + current.name + '»' : 'Видалити страву' }}
              </button>
              <button v-if="confirming" type="button" class="ml-4 text-[15px] text-[color:var(--ink-2)]" @click="confirming = false">Ні</button>
            </div>

            <p v-if="error" class="px-4 text-[13px] text-[#ff6961]">{{ error }}</p>
          </template>
        </template>

        <!-- ===== The editor ===== -->
        <template v-else>
          <div class="nav">
            <button type="button" class="nav-btn" :disabled="busy" @click="cancelEdit">Скасувати</button>
            <span class="text-[15px] font-semibold">{{ editingId === null ? 'Нова страва' : 'Зміни' }}</span>
            <button type="button" class="nav-btn font-semibold" :disabled="busy || !canSave" @click="save">Зберегти</button>
          </div>

          <Section name="">
            <ul role="list" class="field-list">
              <li class="field-row">
                <label for="dish-name" class="field-label flex-none">Назва</label>
                <input id="dish-name" v-model="draft.name" type="text" maxlength="60" autocomplete="off" class="in w-full text-right" placeholder="Борщ">
              </li>
              <li class="field-row">
                <label for="dish-category" class="field-label flex-none">Категорія</label>
                <select id="dish-category" v-model="draft.category" class="in">
                  <option v-for="category in CATEGORIES" :key="category.key" :value="category.key">{{ category.name }}</option>
                </select>
              </li>
              <li class="field-row">
                <label for="dish-time" class="field-label flex-none">Час, хв</label>
                <input id="dish-time" v-model="draft.time" type="text" inputmode="numeric" autocomplete="off" class="in w-24 text-right" placeholder="—">
              </li>
              <li class="field-row">
                <label for="dish-servings" class="field-label flex-none">Порції</label>
                <input id="dish-servings" v-model="draft.servings" type="text" inputmode="numeric" autocomplete="off" class="in w-24 text-right" placeholder="—">
              </li>
              <li class="field-row">
                <span class="field-label">Улюблена</span>
                <Toggle :value="draft.favorite" @update:value="value => draft.favorite = value"></Toggle>
              </li>
            </ul>
          </Section>

          <Section name="Інгредієнти">
            <textarea v-model="draft.ingredients" rows="6" class="in w-full" placeholder="По одному в рядок:&#10;Буряк — 2 шт&#10;Капуста — 300 г"></textarea>
          </Section>

          <Section name="Приготування">
            <textarea v-model="draft.steps" rows="8" class="in w-full" placeholder="Кожен крок з нового рядка"></textarea>
          </Section>

          <Section name="Ще">
            <ul role="list" class="field-list">
              <li class="field-row">
                <label for="dish-link" class="field-label flex-none">Посилання</label>
                <input id="dish-link" v-model="draft.link" type="url" inputmode="url" autocomplete="off" class="in w-full text-right" placeholder="https://…">
              </li>
              <li class="field-row">
                <label for="dish-tags" class="field-label flex-none">Теги</label>
                <input id="dish-tags" v-model="draft.tags" type="text" autocomplete="off" class="in w-full text-right" placeholder="швидко, пісне">
              </li>
              <li class="px-4 py-3">
                <label for="dish-note" class="field-label block">Нотатка</label>
                <textarea id="dish-note" v-model="draft.note" rows="2" class="in mt-2 w-full" placeholder="Дітям без перцю"></textarea>
              </li>
            </ul>
          </Section>

          <p v-if="error" class="px-4 text-[13px] text-[#ff6961]">{{ error }}</p>

          <button type="button" class="ctl-btn apply" :disabled="busy || !canSave" @click="save">
            {{ editingId === null ? 'Додати страву' : 'Зберегти зміни' }}
          </button>
        </template>
      </div>
    </template>
  </Device>
</template>

<style scoped>
  .hero {
    @apply rounded-[18px] px-4 py-3.5;
    background: var(--group);
  }
  .row {
    @apply block w-full px-4 py-3 text-left transition duration-150;
  }
  .row:active {
    background: rgba(255, 255, 255, 0.05);
  }
  /* Scoped rules outrank Tailwind's utilities, so the flex rows get their own classes. */
  .row-check {
    @apply flex items-center gap-3;
  }
  .row-between {
    @apply flex items-center justify-between gap-3;
  }
  .in {
    @apply min-w-0 rounded-lg px-2.5 py-1.5 text-[15px] outline-none transition duration-150;
    background: rgba(120, 120, 128, 0.24);
    color: var(--ink);
    border: 1px solid transparent;
    color-scheme: dark;
  }
  .in:focus {
    border-color: rgb(var(--accent-rgb));
  }
  .in::placeholder {
    color: var(--ink-3);
  }
  .in option {
    background: #18181b;
    color: #fff;
  }
  textarea.in {
    @apply resize-y leading-[1.45];
  }
  input[type="search"].in {
    -webkit-appearance: none;
    appearance: none;
  }
  .chips {
    scrollbar-width: none;
  }
  .chips::-webkit-scrollbar {
    display: none;
  }
  .chip-btn {
    @apply flex-none rounded-full px-3 py-1.5 text-[13px] font-medium transition duration-150 active:scale-95;
    background: rgba(255, 255, 255, 0.1);
    color: var(--ink-2);
  }
  .chip-btn.is-on {
    background: rgb(var(--accent-rgb) / 0.26);
    color: var(--ink);
  }
  .nav {
    @apply -mb-3 flex min-h-[32px] items-center justify-between gap-3 px-1;
  }
  .nav-btn {
    @apply text-[15px] transition active:opacity-60 disabled:opacity-40;
    color: rgb(var(--accent-rgb));
  }
  .star {
    @apply grid h-10 w-10 flex-none place-items-center rounded-full text-[22px] leading-none transition active:scale-90 disabled:opacity-40;
    background: rgba(255, 255, 255, 0.1);
    color: var(--ink-3);
  }
  .star.is-on {
    background: rgb(var(--accent-rgb) / 0.22);
    color: #ff9f0a;
  }
  .check {
    @apply grid h-[22px] w-[22px] flex-none place-items-center rounded-full border-[1.5px] transition;
    border-color: var(--ink-3);
    color: #fff;
  }
  .check.is-on {
    background: rgb(var(--accent-rgb));
    border-color: rgb(var(--accent-rgb));
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
