<script setup>
  import {ref} from "vue";

  const extended = ref(false);
</script>

<template>
  <div class="flex min-w-0 gap-x-4">
    <div @click="extended = !extended" class="h-12 w-12 flex-none rounded-full">
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

  <div v-show="extended" class="absolute z-10" aria-labelledby="modal-title" role="dialog" aria-modal="true">
    <div class="fixed inset-0 z-10 w-screen overflow-y-auto">

      <div @click="extended = false;" class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>

      <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div class="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg p-4">
          <slot name="extended"></slot>
        </div>
      </div>

    </div>
  </div>

</template>

<style scoped>

</style>