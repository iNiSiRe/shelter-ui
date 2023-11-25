<script setup>
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
</script>

<template>
  <Device>
    <template #icon>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 70 70" xml:space="preserve"><g><path fill="#c9eaf5" d="M42.3 52.8c0 8.4-7.3 15.11-15.87 14.1-6.6-.77-11.88-6.23-12.45-12.86a14.143 14.143 0 0 1 6.57-13.23c.96-.6 1.58-1.62 1.58-2.75V8.99c0-3.31 2.68-5.99 5.99-5.99s5.99 2.68 5.99 5.99v29.08c0 1.12.6 2.13 1.55 2.73 3.99 2.5 6.64 6.94 6.64 12z" opacity="1" data-original="#c9eaf5" class=""></path><path fill="#a9dcea" d="M42.3 52.8c0 8.4-7.29 15.11-15.87 14.1l-.22-.03c6.92-.92 12.28-6.88 12.28-14.07 0-5.07-2.65-9.49-6.63-12-.95-.59-1.55-1.6-1.55-2.73V8.99c0-1.66-.67-3.15-1.76-4.24a5.979 5.979 0 0 0-2.33-1.44c.59-.2 1.23-.31 1.9-.31 1.66 0 3.15.67 4.24 1.76A5.986 5.986 0 0 1 34.12 9v29.08c0 1.13.6 2.14 1.54 2.73 3.99 2.49 6.64 6.92 6.64 11.99z" opacity="1" data-original="#a9dcea" class=""></path><path fill="#ffffff" d="M26.27 63.78h-.05c-4.91-.58-8.78-4.57-9.2-9.5-.02-.21.14-.4.35-.42s.4.14.42.35c.39 4.57 3.97 8.27 8.52 8.8.21.03.36.22.34.43-.02.19-.19.34-.38.34zM35.33 52.81c0 4.03-3.31 7.3-7.35 7.22-3.86-.07-7.09-3.37-7.08-7.23 0-2.27 1.05-4.28 2.68-5.6a5.482 5.482 0 0 0 2.07-4.27V10.17a2.469 2.469 0 1 1 4.94 0v32.75c0 1.71.84 3.26 2.16 4.35a7.224 7.224 0 0 1 2.58 5.54z" opacity="1" data-original="#ffffff" class=""></path><path fill="#e5e8f9" d="M35.33 52.81c0 4.03-3.31 7.3-7.36 7.22-.36-.01-.7-.04-1.05-.11 3.38-.6 5.94-3.57 5.94-7.11 0-2.23-1.01-4.23-2.59-5.55-1.31-1.08-2.16-2.64-2.16-4.35V10.17c0-.68-.28-1.3-.72-1.74-.15-.15-.31-.28-.5-.39a2.403 2.403 0 0 1 2.96.39c.45.45.73 1.06.73 1.74v32.74c0 1.71.84 3.27 2.16 4.35a7.189 7.189 0 0 1 2.59 5.55z" opacity="1" data-original="#e5e8f9" class=""></path><path fill="#77e244" d="M32.74 47.26c-1.31-1.09-2.16-2.64-2.16-4.35V26.68h-4.93v16.25c0 1.67-.77 3.23-2.07 4.27a7.137 7.137 0 0 0-2.68 5.6c0 3.86 3.22 7.16 7.08 7.23 4.05.08 7.35-3.19 7.35-7.22 0-2.23-1.01-4.22-2.59-5.55z" opacity="1" data-original="#77e244" class=""></path><path fill="#62d333" d="M35.33 52.81c0 4.03-3.31 7.3-7.36 7.22-.36-.01-.7-.04-1.05-.11 3.38-.6 5.94-3.57 5.94-7.11 0-2.23-1.01-4.23-2.59-5.55-1.31-1.08-2.16-2.64-2.16-4.35V26.69h2.47v16.23c0 1.71.84 3.27 2.16 4.35a7.153 7.153 0 0 1 2.59 5.54z" opacity="1" data-original="#62d333" class=""></path><path fill="#77e244" d="M48.15 21.9c0 4.69-4.37 8.47-4.37 8.47s-4.37-3.79-4.37-8.47 4.37-8.49 4.37-8.49 4.37 3.8 4.37 8.49z" opacity="1" data-original="#77e244" class=""></path><path fill="#62d333" d="M48.15 21.9c0 4.68-4.37 8.47-4.37 8.47s-.82-.71-1.77-1.91c1.28-1.43 3.37-4.24 3.37-7.47 0-2.65-1.38-5.01-2.6-6.57.58-.63 1-1 1-1s4.37 3.79 4.37 8.48z" opacity="1" data-original="#62d333" class=""></path><path fill="#57c624" d="M43.78 31.14a.77.77 0 0 1-.77-.77v-9.4a.77.77 0 0 1 1.54 0v9.4c0 .43-.35.77-.77.77z" opacity="1" data-original="#57c624" class=""></path><path fill="#77e244" d="M54.13 27.06c-3.78 3.78-10.35 3.31-10.35 3.31s-.47-6.57 3.31-10.35 10.36-3.32 10.36-3.32.45 6.59-3.32 10.36z" opacity="1" data-original="#77e244" class=""></path><path fill="#62d333" d="M54.13 27.06c-3.77 3.77-10.35 3.31-10.35 3.31s-.09-1.24.11-2.97c2.18-.11 6.13-.7 8.74-3.31 2.13-2.13 2.92-5.15 3.2-7.38.98-.04 1.61 0 1.61 0s.46 6.58-3.31 10.35z" opacity="1" data-original="#62d333" class=""></path><path fill="#57c624" d="M43.78 31.14c-.2 0-.39-.08-.54-.23-.3-.3-.3-.79 0-1.09l7.58-7.58c.3-.3.79-.3 1.09 0s.3.79 0 1.09l-7.58 7.58c-.16.15-.35.23-.55.23z" opacity="1" data-original="#57c624" class=""></path><path fill="#666666" d="M18.6 34.67h-3.76a.77.77 0 0 1 0-1.54h3.76a.77.77 0 0 1 0 1.54zM18.6 29.97h-5.3a.77.77 0 0 1 0-1.54h5.29c.42 0 .77.34.77.77.01.42-.34.77-.76.77zM18.6 25.27h-3.76a.77.77 0 0 1 0-1.54h3.76a.77.77 0 0 1 0 1.54zM18.6 20.56h-5.3a.77.77 0 0 1 0-1.54h5.29c.42 0 .77.34.77.77s-.34.77-.76.77zM18.6 15.86h-3.76a.77.77 0 0 1 0-1.54h3.76a.77.77 0 0 1 0 1.54zM18.6 11.16h-5.3a.77.77 0 0 1 0-1.54h5.29c.42 0 .77.34.77.77.01.43-.34.77-.76.77z" opacity="1" data-original="#666666" class=""></path></g></svg>
    </template>

    <template #title>
      {{ item.name }}
    </template>

    <template #status>
      {{ device.properties.temperature }}℃, {{ device.properties.humidity }}%
    </template>

    <template #action>
    </template>

    <template #extended>
      <Section name="Weather">
        <List>
          <Item label="Temperature">
            <span>{{ device.properties.temperature }}℃</span>
          </item>
          <Item label="Humidity">
            <span>{{ device.properties.humidity }}%</span>
          </item>
          <Item label="Pressure">
            <span>{{ device.properties.pressure }}</span>
          </item>
          <Item label="Last update">
            <LastUpdate :timestamp="device.properties.updatedAt"></LastUpdate>
          </item>
        </List>
      </Section>

      <BatterySection :battery="device.properties.battery" v-if="device.properties.battery"></BatterySection>
    </template>
  </Device>
</template>

<style scoped>

</style>