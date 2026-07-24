<script setup>
  const props = defineProps({
    value: Number,
    min: {type: Number, default: -Infinity},
    max: {type: Number, default: Infinity},
  })

  const emit = defineEmits(['update:value'])

  const clamp = (v) => Math.min(props.max, Math.max(props.min, v))
  const step = (delta) => emit('update:value', clamp((props.value ?? 0) + delta))
</script>

<template>
  <div class="flex items-center gap-2">
    <button type="button" @click="step(-1)" class="counter-btn" aria-label="Decrease">
      <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 18 2"><path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M1 1h16"/></svg>
    </button>
    <span class="min-w-[2.5rem] text-center text-sm font-semibold tabular-nums text-white">{{ value }}</span>
    <button type="button" @click="step(1)" class="counter-btn" aria-label="Increase">
      <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 18 18"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 1v16M1 9h16"/></svg>
    </button>
  </div>
</template>

<style scoped>
  .counter-btn {
    @apply grid h-8 w-8 flex-none place-items-center rounded-xl text-white transition duration-150 active:scale-90;
    background: rgb(var(--accent-rgb, 99 102 241) / 0.9);
  }
  .counter-btn:hover {
    filter: brightness(1.12);
  }
</style>
