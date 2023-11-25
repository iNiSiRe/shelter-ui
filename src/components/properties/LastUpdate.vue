<script setup>
  import {prettifyMilliseconds} from "../format";
  import {onMounted, onUnmounted, onUpdated, ref} from "vue";

  const props = defineProps({
    timestamp: Number
  })

  const redrawTrigger = ref(0);

  let timer = null;

  onMounted(() => {
    timer = setInterval(() => {
      redrawTrigger.value = Date.now();
    }, 5000);
  });

  onUpdated(() => {
    console.log('update label');
  });

  onUnmounted(() => {
    clearInterval(timer);
  })
</script>

<template>
  <span style="display: none">{{ redrawTrigger }}</span>
  {{ prettifyMilliseconds(Math.max(0, Date.now() - timestamp)) }} ago
</template>

<style scoped>

</style>