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
  <!-- The iOS stepper: − value + in one rounded segment. -->
  <div class="stepper">
    <button type="button" @click="step(-1)" class="stepper-btn" aria-label="Менше" :disabled="value <= min">
      <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 18 2"><path stroke="currentColor" stroke-linecap="round" stroke-width="2.4" d="M1 1h16"/></svg>
    </button>
    <span class="min-w-[2.5rem] text-center text-[15px] font-semibold tabular-nums text-[color:var(--ink)]">{{ value }}</span>
    <button type="button" @click="step(1)" class="stepper-btn" aria-label="Більше" :disabled="value >= max">
      <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 18 18"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.4" d="M9 1v16M1 9h16"/></svg>
    </button>
  </div>
</template>

<style scoped>
  .stepper {
    @apply flex items-center gap-1 rounded-[10px] p-0.5;
    background: rgba(120, 120, 128, 0.24);
  }
  .stepper-btn {
    @apply grid h-8 w-9 flex-none place-items-center rounded-lg transition duration-150 active:scale-90;
    color: rgb(var(--accent-rgb, 10 132 255));
  }
  .stepper-btn:hover {
    background: rgba(255, 255, 255, 0.08);
  }
  .stepper-btn:disabled {
    @apply cursor-not-allowed opacity-30;
  }
</style>
