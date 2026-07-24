<script setup>
  defineProps({
    label: String
  })
</script>

<template>
  <li class="field-row">
    <span class="field-label">{{ label }}</span>
    <div class="field-value flex items-center justify-end"><slot></slot></div>
  </li>
</template>

<style scoped>
</style>
