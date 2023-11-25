<script setup>
  defineProps({
    label: String
  })
</script>

<template>
  <li class="flex items-center justify-between py-4 pl-4 pr-5 text-sm leading-6">
    <div class="flex w-0 flex-1 items-center">
      <span class="truncate font-medium">{{ label }}</span>
    </div>
    <div class="ml-4 flex-shrink-0 font-medium text-indigo-600">
      <slot></slot>
    </div>
  </li>
</template>

<style scoped>

</style>