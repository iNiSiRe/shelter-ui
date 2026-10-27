<script setup>
  import {reactive} from "vue";
  import {registry as Registry} from "../registry";
  import {dashboard as Dashboard} from "../dashboard";
  import HomeHeader from "./HomeHeader.vue";

  const state = reactive({
    rooms: [],
    devices: [],
    names: {},
  })

  const rooms = await Dashboard.loadRooms();

  const devices = await Registry.loadDevices();

  state.rooms = rooms.map(room => ({
    name: room.name,
    items: room.items.map(item => {
      // A card that is not a device, the history charts say: `widget: <component>` in dashboard.yaml.
      if (item.widget) {
        return {component: item.widget, name: item.name, wide: !!item.wide, device: {id: item.widget, properties: {}}};
      }

      const device = devices.find(device => device.id === item.device);
      if (!device) {
        return null;
      }

      state.names[device.id] = item.name;
      return {component: device.model, name: item.name, wide: !!item.wide, device};
    }).filter(item => item !== null),
  })).filter(room => room.items.length > 0);

  state.devices = devices;

  Registry.onDeviceUpdate((event) => {
    const device = state.devices.find((device) => device.id === event.deviceId)
    if (device) {
      device.properties = event.properties;
    }
  });

  const number = (value) => {
    const parsed = typeof value === 'number' ? value : parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  // A line under the room's name: the air temperature (an AC or a climate sensor reports it)
  // and the floor's, when a thermostat sits there.
  const roomMeta = (room) => {
    const parts = [];
    const props = room.items.map(item => item.device.properties ?? {});

    const air = props.map(p => number(p.indoorTemperature) ?? (p.humidity !== undefined ? number(p.temperature) : null))
      .find(value => value !== null);
    if (air !== undefined) {
      parts.push(`${Math.round(air * 10) / 10}°`);
    }

    const floor = props.map(p => p.floorTemp !== undefined ? number(p.floorTemp) : null).find(value => value !== null);
    if (floor !== undefined) {
      parts.push(`підлога ${floor.toFixed(1)}°`);
    }

    return parts.join(' · ');
  };
</script>

<template>
  <main class="mx-auto max-w-6xl px-4 pb-16 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-6">
    <HomeHeader :devices="state.devices" :names="state.names"></HomeHeader>

    <!-- Rooms flow into columns on wider screens, each room kept whole. -->
    <div class="mt-8 md:columns-2 md:gap-6 xl:columns-3">
    <section v-for="room in state.rooms" :key="room.name" class="mb-8 break-inside-avoid">
      <header v-if="room.name" class="mb-3 flex items-baseline gap-2 px-0.5">
        <h2 class="room-title">{{ room.name }}</h2>
        <span class="room-meta">{{ roomMeta(room) }}</span>
      </header>

      <div class="grid grid-cols-2 gap-3">
        <div v-for="item in room.items" :key="item.device.id" :class="{'col-span-2': item.wide}">
          <component :is="item.component" :item="item" :device="item.device"></component>
        </div>
      </div>
    </section>
    </div>
  </main>
</template>

<style>
  /* Toggles on a tile sit smaller than in a sheet. */
  .tile-top .toggle {
    transform: scale(0.78);
    transform-origin: right top;
  }
</style>
