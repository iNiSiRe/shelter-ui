<script setup>
  import {computed, onUnmounted, ref, watch} from "vue";

  const props = defineProps({
    // Semantic accent per device family.
    accent: {type: String, default: 'slate'},
    // The accessory is on — the tile lights up, as in Apple Home.
    active: {type: Boolean, default: false},
    // Something wants attention (water on the floor): the tile turns red.
    alert: {type: Boolean, default: false},
    // TV remote paints its own full-bleed content; skip the generic sheet header.
    bareExtended: {type: Boolean, default: false},
  });

  const extended = ref(false);

  // For cards that draw only while their sheet is on screen (charts need a visible width).
  const emit = defineEmits(['open', 'close']);

  const close = () => extended.value = false;
  const onKey = (event) => {
    if (event.key === 'Escape') {
      close();
    }
  };

  // The page behind a sheet must not scroll along with it.
  watch(extended, value => {
    emit(value ? 'open' : 'close');
    document.body.style.overflow = value ? 'hidden' : '';
    value ? window.addEventListener('keydown', onKey) : window.removeEventListener('keydown', onKey);
  });

  onUnmounted(() => {
    if (extended.value) {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    }
  });

  const ACCENTS = {
    amber: '255 159 10',
    cyan: '50 173 230',
    sky: '100 210 255',
    emerald: '48 209 88',
    lime: '163 230 53',
    violet: '191 90 242',
    rose: '255 55 95',
    red: '255 69 58',
    slate: '152 152 157',
  };

  const accentRgb = computed(() => ACCENTS[props.accent] ?? ACCENTS.slate);
</script>

<template>
  <div class="tile" :class="{'is-on': active && !alert, 'is-alert': alert}" :style="{'--accent-rgb': accentRgb}">
    <div class="tile-main" role="button" tabindex="0" @click="extended = true" @keydown.enter="extended = true">
      <div class="tile-top">
        <span class="tile-icon"><slot name="icon"></slot></span>
        <div class="flex items-center" @click.stop>
          <slot name="action"></slot>
        </div>
      </div>
      <div class="min-w-0">
        <p class="tile-name"><slot name="title"></slot></p>
        <div class="tile-state"><slot name="status"></slot></div>
      </div>
    </div>

    <Teleport to="body">
      <Transition name="fade">
        <div v-show="extended" class="sheet-backdrop" @click="close"></div>
      </Transition>
      <Transition name="sheet">
        <div v-show="extended" class="sheet" role="dialog" aria-modal="true" :style="{'--accent-rgb': accentRgb}">
          <div class="sheet-handle"></div>

          <div v-if="!bareExtended" class="flex items-center gap-3 px-4 pb-3 pt-2 sm:pt-4">
            <span class="sheet-icon"><slot name="icon"></slot></span>
            <div class="min-w-0 flex-1">
              <p class="truncate text-[17px] font-semibold leading-tight"><slot name="title"></slot></p>
              <div class="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[13px] text-[color:var(--ink-2)]"><slot name="status"></slot></div>
            </div>
            <button type="button" class="sheet-close" aria-label="Закрити" @click="close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" class="h-4 w-4"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <button v-else type="button" class="sheet-close absolute right-3 top-3 z-20" aria-label="Закрити" @click="close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" class="h-4 w-4"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>

          <div class="sheet-scroll flex flex-col" :class="bareExtended ? 'px-0 pb-0' : 'gap-6 pt-1'">
            <slot name="extended"></slot>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style>
  .fade-enter-active, .fade-leave-active { transition: opacity 0.22s ease; }
  .fade-enter-from, .fade-leave-to { opacity: 0; }

  .sheet-enter-active, .sheet-leave-active { transition: transform 0.32s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.2s ease; }
  .sheet-enter-from, .sheet-leave-to { transform: translateY(100%); }
  @media (min-width: 640px) {
    .sheet-enter-from, .sheet-leave-to { transform: translate(-50%, -46%) scale(0.96); opacity: 0; }
  }
</style>
