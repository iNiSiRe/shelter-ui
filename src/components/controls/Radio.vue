<script setup>
  defineProps({
    value: String
  })

  defineEmits([
      'update:value'
  ])
</script>

<template>
  <div class="seg">
    <slot></slot>
  </div>
</template>

<style scoped>
  .seg {
    @apply inline-flex items-center gap-1 rounded-xl border p-1;
    border-color: rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.04);
  }
</style>
