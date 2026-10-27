<script setup>
  defineProps({
    value: Boolean
  })

  defineEmits([
      'update:value'
  ])
</script>

<template>
  <button type="button"
      @click="value = !value; $emit('update:value', value)"
      :class="value ? 'toggle is-on' : 'toggle'"
      role="switch" :aria-checked="value"
  >
    <span aria-hidden="true" :class="{'translate-x-5': value, 'translate-x-0': !value}" class="toggle-knob"></span>
  </button>
</template>

<style scoped>
  /* The iOS switch: a pill track with a white knob, the accent when on. */
  .toggle {
    @apply flex h-[31px] w-[51px] flex-none cursor-pointer items-center rounded-full p-[2px] transition-colors duration-200 ease-in-out;
    background: rgba(120, 120, 128, 0.36);
  }
  .toggle.is-on {
    background: rgb(var(--accent-rgb, 48 209 88));
  }
  .toggle-knob {
    @apply h-[27px] w-[27px] transform rounded-full bg-white transition duration-200 ease-in-out;
    box-shadow: 0 3px 8px rgba(0, 0, 0, 0.15), 0 3px 1px rgba(0, 0, 0, 0.06);
  }
</style>
