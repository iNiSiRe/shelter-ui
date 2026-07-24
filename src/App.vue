<script setup>
  import Devices from "./components/Devices.vue";
</script>

<template>
  <suspense>
    <Devices></Devices>
    <template #fallback>
      <div class="flex min-h-screen items-center justify-center gap-3 text-sm text-zinc-500">
        <span class="h-4 w-4 animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-300"></span>
        Loading…
      </div>
    </template>
  </suspense>
</template>

<style scoped>
</style>
