<script setup>
  defineProps({
    value: Number
  })
</script>

<template>
  <form class="max-w-xs mx-auto">
      <div class="relative flex items-center">
          <button @click="$emit('update:value', --value)" type="button" id="decrement-button" data-input-counter-decrement="counter-input" class="flex-shrink-0 bg-indigo-600 dark:hover:bg-indigo-400 dark:border-indigo-600 hover:bg-indigo-400 inline-flex items-center justify-center border border-gray-300 rounded-md h-7 w-7">
              <svg class="w-4 h-4 text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 18 2">
                  <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M1 1h16"/>
              </svg>
          </button>
          <input type="text" id="counter-input" data-input-counter class="flex-shrink-0 border-0 bg-transparent text-sm font-normal focus:outline-none focus:ring-0 max-w-[2.5rem] text-center" placeholder="" :value="value" required>
          <button @click="$emit('update:value', ++value)" type="button" id="increment-button" data-input-counter-increment="counter-input" class="flex-shrink-0 bg-indigo-600 dark:hover:bg-indigo-400 dark:border-indigo-600 hover:bg-indigo-400 inline-flex items-center justify-center border border-gray-300 rounded-md h-7 w-7">
              <svg class="w-4 h-4 text-gray-900 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 18 18">
                  <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 1v16M1 9h16"/>
              </svg>
          </button>
      </div>
  </form>
</template>

<style scoped>

</style>