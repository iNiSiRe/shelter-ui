<script setup>
  defineProps({
    value: Boolean
  })

  defineEmits([
      'update:value'
  ])
</script>

<template>
  <button type="button"
      @click="value = !value; $emit('update:value', value)"
      :class="{'bg-indigo-600': value, 'bg-gray-200': !value}"
      class="flex w-8 flex-none cursor-pointer rounded-full p-px ring-1 ring-inset ring-gray-900/5 transition-colors duration-200 ease-in-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600" role="switch" aria-checked="false" aria-labelledby="switch-1-label"
  >
    <span aria-hidden="true" :class="{'translate-x-3.5': value, 'translate-x-0': !value}" class="h-4 w-4 transform rounded-full bg-white shadow-sm ring-1 ring-gray-900/5 transition duration-200 ease-in-out"></span>
  </button>
</template>

<style scoped>

</style>