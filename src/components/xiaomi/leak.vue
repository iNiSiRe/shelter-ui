<script setup>
  import {computed} from "vue";
  import Device from "../Device.vue";
  import List from "../properties/List.vue";
  import Item from "../properties/Item.vue";
  import Section from "../properties/Section.vue";
  import LastUpdate from "../properties/LastUpdate.vue";
  import BatterySection from "./component/BatterySection.vue";

  const props = defineProps({
    item: Object,
    device: Object
  });

  const wet = computed(() => props.device.properties.leak?.active === true);
</script>

<template>
  <Device accent="sky" :alert="wet">
    <template #icon>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path fill="#4671c6" d="M32 6C26 16 16 27 16 38a16 16 0 0 0 32 0C48 27 38 16 32 6z"/><path fill="#a4c9ff" d="M32 6v48a16 16 0 0 0 16-16C48 27 38 16 32 6z"/><path fill="#eaf0f3" d="M24 39a2 2 0 0 1 2 2 6 6 0 0 0 6 6 2 2 0 0 1 0 4 10 10 0 0 1-10-10 2 2 0 0 1 2-2z"/><rect x="14" y="56" width="36" height="4" rx="2" fill="#3762cc"/></svg>
    </template>

    <template #title>
      {{ item.name }}
    </template>

    <template #status>
      <!-- The sensor reports only a change, so after a restart a live sensor (its battery reports
           hourly) without a report of water is dry. -->
      <span v-if="device.properties.leak || device.properties.battery">{{ wet ? 'Протікання!' : 'Сухо' }}</span>
      <span v-else>Чекаю звіту</span>
    </template>

    <template #action>
    </template>

    <template #extended>
      <Section v-if="device.properties.leak">
        <List>
          <Item label="Стан">
            <span :class="wet ? 'font-semibold text-[#ff453a]' : ''">{{ wet ? 'Мокро' : 'Сухо' }}</span>
          </Item>
          <Item label="Останній звіт">
            <LastUpdate :timestamp="device.properties.leak.updatedAt"></LastUpdate>
          </Item>
        </List>
      </Section>

      <BatterySection :battery="device.properties.battery" v-if="device.properties.battery"></BatterySection>
    </template>
  </Device>
</template>

<style scoped>
</style>
