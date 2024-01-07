<script setup>
  defineProps({
    value: String
  })

  defineEmits([
      'update:value'
  ])
</script>

<template>
  <div class="bg-slate-50 gap-1 flex flex-row">
    <slot></slot>
  </div>
</template>

<style scoped>
input[type="radio"]:checked + label {
  @apply bg-red-500;
}
</style>