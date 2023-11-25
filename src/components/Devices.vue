<script setup>
  import {reactive} from "vue";
  import {registry as Registry} from "./registry";
  import {dashboard as Dashboard} from "./dashboard";

  const state = reactive({
    dashboard: []
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

</script>

<template>
  <div class="container mx-auto px-4">
    <ul role="list" class="divide-y divide-gray-100">
      <li v-for="item in state.dashboard" class="flex justify-between gap-x-6 py-5">
        <component :is="item.component" :item="item" :device="item.device"></component>
      </li>
    </ul>
  </div>
</template>

<style scoped>

</style>