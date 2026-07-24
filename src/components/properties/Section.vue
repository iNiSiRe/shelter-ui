<script setup>
  defineProps({
    name: String
  })
</script>

<template>
  <div>
    <h3 v-if="name" class="section-title">{{ name }}</h3>
    <slot></slot>
  </div>
</template>

<style scoped>
</style>
