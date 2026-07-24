<script setup>
  import {computed, ref} from "vue";

  const props = defineProps({
    // Semantic accent per device family.
    accent: {type: String, default: 'slate'},
    // Whether the device is currently "on"/active — drives the accent glow.
    active: {type: Boolean, default: false},
    // TV remote paints its own full-bleed content; skip the generic modal header.
    bareExtended: {type: Boolean, default: false},
  });

  const extended = ref(false);

  const ACCENTS = {
    amber: '245 158 11',
    cyan: '34 211 238',
    sky: '56 189 248',
    emerald: '52 211 153',
    violet: '167 139 250',
    rose: '251 113 133',
    red: '239 68 68',
    slate: '148 163 184',
  };

  const accentRgb = computed(() => ACCENTS[props.accent] ?? ACCENTS.slate);
</script>

<template>
  <div class="card" :class="{'is-active': active}" :style="{'--accent-rgb': accentRgb}">
    <!-- Collapsed card -->
    <div class="card-main" role="button" tabindex="0" @click="extended = true" @keydown.enter="extended = true">
      <div class="card-top">
        <span class="icon-chip"><slot name="icon"></slot></span>
        <div class="flex items-center" @click.stop>
          <slot name="action"></slot>
        </div>
      </div>
      <div class="min-w-0">
        <p class="card-title truncate"><slot name="title"></slot></p>
        <p class="card-status"><slot name="status"></slot></p>
      </div>
    </div>

    <!-- Expanded modal: full-screen on mobile, centered card on sm:+ -->
    <div v-show="extended" class="relative z-10" role="dialog" aria-modal="true">
      <div @click="extended = false" class="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"></div>

      <div class="fixed inset-0 z-10 overflow-y-auto">
        <div class="flex min-h-full justify-center items-stretch sm:items-start sm:p-4">
          <div class="sheet w-full min-h-full sm:min-h-0 sm:max-w-[500px] sm:my-6 sm:rounded-3xl">

            <button type="button" @click="extended = false" aria-label="Close"
                    class="absolute top-3 right-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-gray-800 ring-1 ring-black/10 shadow backdrop-blur transition hover:bg-white active:scale-95">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>

            <div class="flex-1 flex flex-col p-4" :class="{'gap-5': !bareExtended}">
              <!-- Generic modal header (skipped for the TV remote) -->
              <div v-if="!bareExtended" class="flex items-center gap-3 pr-10">
                <span class="icon-chip"><slot name="icon"></slot></span>
                <div class="min-w-0">
                  <p class="card-title truncate"><slot name="title"></slot></p>
                  <p class="card-status"><slot name="status"></slot></p>
                </div>
              </div>

              <slot name="extended"></slot>
            </div>

          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>
