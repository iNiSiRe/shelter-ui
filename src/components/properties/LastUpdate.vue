<script setup>
  import {ago} from "../../format";
  import {onMounted, onUnmounted, ref} from "vue";

  defineProps({
    timestamp: Number
  })

  const now = ref(Date.now());

  let timer = null;

  onMounted(() => {
    timer = setInterval(() => now.value = Date.now(), 5000);
  });

  onUnmounted(() => {
    clearInterval(timer);
  })
</script>

<template>
  <span>{{ ago(timestamp, now) }}</span>
</template>
