<script setup>
  import {ref} from "vue";

  const extended = ref(false);
</script>

<template>
  <div class="flex min-w-0 gap-x-4">
    <div @click="extended = !extended" class="h-12 w-12 flex-none rounded-full cursor-pointer">
      <slot name="icon"></slot>
    </div>
    <div class="min-w-0 flex-auto">
      <p class="text-sm font-semibold leading-6 text-gray-900">
        <slot name="title"></slot>
      </p>
      <p class="mt-1 truncate text-xs leading-5 text-gray-500">
        <slot name="status"></slot>
      </p>
    </div>
  </div>

  <div class="shrink-0 flex flex-col items-end justify-center">
      <slot name="action"></slot>
  </div>

  <div v-show="extended" class="relative z-10" role="dialog" aria-modal="true">
    <!-- Backdrop -->
    <div @click="extended = false" class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity"></div>

    <div class="fixed inset-0 z-10 overflow-y-auto">
      <!-- Edge-to-edge sheet on mobile, centered card on sm:+ -->
      <div class="flex min-h-full justify-center items-stretch sm:items-start sm:p-4">
        <div class="relative flex w-full flex-col min-h-full sm:min-h-0 sm:max-w-[500px] overflow-hidden bg-white text-left shadow-2xl transition-all sm:my-6 sm:rounded-3xl">

          <!-- Frosted close button — legible on light and dark panels -->
          <button type="button" @click="extended = false" aria-label="Close"
                  class="absolute top-3 right-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-gray-700 ring-1 ring-black/10 shadow-sm backdrop-blur transition hover:bg-white active:scale-95">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>

          <div class="flex-1 flex flex-col p-4">
            <slot name="extended"></slot>
          </div>
        </div>
      </div>
    </div>
  </div>

</template>

<style scoped>

</style>