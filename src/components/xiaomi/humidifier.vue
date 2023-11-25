<script setup>
  import Device from "@/components/Device.vue";
  import Toggle from "@/components/controls/Toggle.vue";
  import List from "@/components/properties/List.vue";
  import Item from "@/components/properties/Item.vue";
  import Section from "@/components/properties/Section.vue";
  import LastUpdate from "@/components/properties/LastUpdate.vue";
  import {registry as Registry} from "@/registry";
  import {bus as Bus} from "@/bus";

  const props = defineProps({
    item: Object,
    device: Object
  });
</script>

<template>
  <Device>
    <template #icon>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><g><path fill="#dddde3" d="M34 111.846h60v9.654H34z" opacity="1" data-original="#dddde3"></path><path fill="#3ea7fb" d="M36.575 115.5a12 12 0 0 1-11.909-10.528 62.768 62.768 0 0 1 1.285-22.451l9.613-39.752a9 9 0 0 1 8.747-6.884h39.378a9 9 0 0 1 8.747 6.884l9.613 39.752a62.768 62.768 0 0 1 1.285 22.451 12 12 0 0 1-11.91 10.528z" opacity="1" data-original="#3ea7fb" class=""></path><path fill="#0f89cc" d="M34.944 72.615a1.726 1.726 0 0 1-.413-.049 1.75 1.75 0 0 1-1.29-2.112l1.328-5.492a1.75 1.75 0 0 1 3.4.822l-1.328 5.492a1.751 1.751 0 0 1-1.697 1.339zM68.5 40.865v60h-9v-60z" opacity="1" data-original="#0f89cc"></path><path fill="#ededf9" d="M93.68 47.88H34.32l1.24-5.11a9.014 9.014 0 0 1 8.75-6.89h39.38a9.014 9.014 0 0 1 8.75 6.89zM103.33 104.97a12 12 0 0 1-11.91 10.53H36.58a12 12 0 0 1-11.91-10.53 62.5 62.5 0 0 1-.48-7.72q0-2.88.27-5.75h79.08a61.93 61.93 0 0 1-.21 13.47z" opacity="1" data-original="#ededf9" class=""></path><circle cx="64" cy="103.5" r="4.5" fill="#3ea7fb" opacity="1" data-original="#3ea7fb" class=""></circle><g fill="#ededf9"><path d="M57 26.25a1.75 1.75 0 0 1-1.75-1.75 3.064 3.064 0 0 0-.706-2.03 6.742 6.742 0 0 1 0-7.943 3.064 3.064 0 0 0 .706-2.03 3.059 3.059 0 0 0-.706-2.027A6.476 6.476 0 0 1 53.25 6.5a1.75 1.75 0 0 1 3.5 0 3.06 3.06 0 0 0 .706 2.028A6.473 6.473 0 0 1 58.75 12.5a6.483 6.483 0 0 1-1.294 3.972 3.27 3.27 0 0 0 0 4.059A6.483 6.483 0 0 1 58.75 24.5 1.75 1.75 0 0 1 57 26.25zM71 26.25a1.75 1.75 0 0 1-1.75-1.75 6.483 6.483 0 0 1 1.294-3.972 3.27 3.27 0 0 0 0-4.059A6.483 6.483 0 0 1 69.25 12.5a6.473 6.473 0 0 1 1.294-3.969A3.06 3.06 0 0 0 71.25 6.5a1.75 1.75 0 0 1 3.5 0 6.476 6.476 0 0 1-1.294 3.97 3.059 3.059 0 0 0-.706 2.03 3.064 3.064 0 0 0 .706 2.03 6.742 6.742 0 0 1 0 7.943 3.064 3.064 0 0 0-.706 2.03A1.75 1.75 0 0 1 71 26.25zM64 26.25a1.75 1.75 0 0 1-1.75-1.75v-18a1.75 1.75 0 0 1 3.5 0v18A1.75 1.75 0 0 1 64 26.25z" fill="#ededf9" opacity="1" data-original="#ededf9" class=""></path></g></g></svg>
    </template>

    <template #title>
      {{ item.name }} ({{ device.properties.waterLevel.toFixed(2) }}%)
    </template>

    <template #status>
      {{ device.properties.temperature }}℃, {{ device.properties.humidity }}%
    </template>

    <template #action>
      <Toggle
          v-on:click="Registry.call(device.id, device.properties.enabled ? 'disable' : 'enable')"
          :value="device.properties.enabled"></Toggle>
    </template>

    <template #extended>
      <Section name="Humidifier">
        <List>
          <Item label="Enabled">
            <Toggle
                v-on:click="Bus.execute(device.id, device.properties.enabled ? 'disable' : 'enable')"
                :value="device.properties.enabled"></Toggle>
          </Item>
          <Item label="Mode">
            <span>{{ device.properties.mode }}</span>
          </Item>
          <Item label="Temperature">
            <span>{{ device.properties.temperature }}℃</span>
          </Item>
          <Item label="Humidity">
            <span>{{ device.properties.humidity }}%</span>
          </Item>
          <Item label="Water level">
            <span>{{ device.properties.waterLevel.toFixed(2) }}%</span>
          </Item>
          <Item label="Last update">
            <LastUpdate :timestamp="device.properties.updatedAt"></LastUpdate>
          </item>
        </List>
      </Section>
    </template>
  </Device>
</template>

<style scoped>

</style>