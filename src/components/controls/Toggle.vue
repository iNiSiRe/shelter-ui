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
    <span aria-hidden="true" :class="{'translate-x-4': value, 'translate-x-0': !value}" class="toggle-knob"></span>
  </button>
</template>

<style scoped>
  .toggle {
    @apply flex h-5 w-9 flex-none cursor-pointer items-center rounded-full p-0.5 ring-1 ring-inset ring-white/10 transition-colors duration-200 ease-in-out;
    background: rgba(255, 255, 255, 0.12);
  }
  .toggle.is-on {
    background: rgb(var(--accent-rgb, 99 102 241));
    box-shadow: 0 0 12px rgb(var(--accent-rgb, 99 102 241) / 0.55);
  }
  .toggle-knob {
    @apply h-4 w-4 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out;
  }
</style>
