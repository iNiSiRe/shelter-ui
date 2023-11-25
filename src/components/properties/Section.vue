<script setup>
  defineProps({
    name: String
  })
</script>

<template>
  <div>
    <h3 class="text-base font-semibold leading-7 text-gray-900 mb-2">{{ name }}</h3>
    <slot></slot>
  </div>
</template>

<style scoped>

</style>