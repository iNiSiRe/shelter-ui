<script setup>
  import Devices from "./components/Devices.vue";
</script>

<template>
  <suspense>
    <Devices></Devices>
    <template #fallback>
      Loading
    </template>
  </suspense>
</template>

<style scoped>
</style>
