<script setup>
  import {computed, reactive} from "vue";
  import {registry as Registry} from "../registry";
  import {dashboard as Dashboard} from "../dashboard";

  const state = reactive({
    dashboard: [],
    devices: []
  })

  const items = await Dashboard.loadItems();

  const devices = await Registry.loadDevices();

  items.forEach(item => {
    const device = devices.find(device => device.id === item.device);

    if (!device) {
      return;
    }

    state.dashboard.push({
      component: device.model,
      name: item.name,
      device: device
    });
  });

  state.devices = devices;

  Registry.onDeviceUpdate((event) => {
    const device = state.devices.find((device) => device.id === event.deviceId)
    device.properties = event.properties;
  });

  const activeCount = computed(() =>
      state.dashboard.filter(d => d.device?.properties?.enabled).length
  );
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-6 sm:py-8">
    <header class="mb-6 flex items-end justify-between gap-4">
      <div>
        <h1 class="text-xl font-semibold tracking-tight text-white">Shelter</h1>
        <p class="mt-0.5 text-sm text-zinc-500">
          {{ state.dashboard.length }} devices<span v-if="activeCount"> · <span class="text-zinc-300">{{ activeCount }} active</span></span>
        </p>
      </div>
      <span class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-400">
        <span class="h-1.5 w-1.5 rounded-full bg-emerald-400"></span> Live
      </span>
    </header>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <component v-for="item in state.dashboard" :is="item.component" :key="item.device.id" :item="item" :device="item.device"></component>
    </div>
  </div>
</template>

<style scoped>
</style>
