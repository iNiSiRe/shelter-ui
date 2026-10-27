<script setup>
  // The big set-point control at the top of a climate sheet: the target large between − and +,
  // what the room (or the floor) is at now underneath.
  const props = defineProps({
    target: Number,
    current: Number,
    currentLabel: String,
    caption: String,
    min: {type: Number, default: 5},
    max: {type: Number, default: 45},
    step: {type: Number, default: 1},
    disabled: {type: Boolean, default: false},
  });

  const emit = defineEmits(['update:target']);

  const change = (delta) => {
    const next = Math.min(props.max, Math.max(props.min, (props.target ?? 0) + delta));
    if (next !== props.target) {
      emit('update:target', next);
    }
  };

  const show = (value) => value === null || value === undefined || Number.isNaN(value) ? '—' : Number(value).toFixed(value % 1 ? 1 : 0);
</script>

<template>
  <div class="hero" :class="{'is-disabled': disabled}">
    <div class="flex items-center justify-center gap-6">
      <button type="button" class="hero-btn" aria-label="Холодніше" :disabled="disabled || target <= min" @click="change(-step)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" class="h-6 w-6"><path d="M5 12h14"/></svg>
      </button>
      <div class="min-w-[7.5rem] text-center">
        <p class="hero-target">{{ show(target) }}<span class="hero-unit">°</span></p>
        <p v-if="caption" class="mt-0.5 text-[13px] font-medium text-[color:var(--ink-2)]">{{ caption }}</p>
      </div>
      <button type="button" class="hero-btn" aria-label="Тепліше" :disabled="disabled || target >= max" @click="change(step)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" class="h-6 w-6"><path d="M12 5v14M5 12h14"/></svg>
      </button>
    </div>
    <p v-if="current !== null && current !== undefined" class="mt-3 text-center text-[15px] text-[color:var(--ink-2)]">
      {{ currentLabel }} <span class="font-semibold text-[color:var(--ink)]">{{ show(current) }}°</span>
    </p>
  </div>
</template>

<style scoped>
  .hero {
    @apply rounded-[22px] px-4 py-5;
    background:
      radial-gradient(80% 120% at 50% 0%, rgb(var(--accent-rgb) / 0.22) 0%, rgba(0, 0, 0, 0) 70%),
      var(--group);
  }
  .hero.is-disabled .hero-target {
    color: var(--ink-3);
  }
  .hero-target {
    @apply text-[64px] font-light leading-none tracking-tight tabular-nums;
    color: var(--ink);
  }
  .hero-unit {
    @apply align-top text-[34px] font-light;
    color: var(--ink-2);
  }
  .hero-btn {
    @apply grid h-14 w-14 flex-none place-items-center rounded-full transition duration-150 active:scale-90;
    background: rgba(255, 255, 255, 0.12);
    color: rgb(var(--accent-rgb));
  }
  .hero-btn:hover {
    background: rgba(255, 255, 255, 0.18);
  }
  .hero-btn:disabled {
    @apply cursor-not-allowed opacity-30;
  }
</style>
