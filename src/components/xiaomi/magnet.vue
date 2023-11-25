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
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500"><g><path fill="#b88f3c" d="M397.379 441.599h-29.504V58.418l29.504-29.487z" opacity="1" data-original="#b88f3c" class=""></path><path fill="#0e1f3e" d="M397.379 445.529h-29.504a3.931 3.931 0 0 1-3.931-3.931V58.418c0-1.042.415-2.043 1.152-2.78L394.6 26.151a3.929 3.929 0 0 1 6.709 2.78v412.667a3.929 3.929 0 0 1-3.93 3.931zm-25.574-7.86h21.645V38.415l-21.645 21.632z" opacity="1" data-original="#0e1f3e" class=""></path><path fill="#b88f3c" d="M102.615 441.599h29.482V58.418l-29.482-29.487z" opacity="1" data-original="#b88f3c" class=""></path><path fill="#0e1f3e" d="M132.097 445.529h-29.481a3.931 3.931 0 0 1-3.931-3.931V28.931a3.93 3.93 0 0 1 6.71-2.778l29.481 29.487a3.93 3.93 0 0 1 1.151 2.779v383.18a3.93 3.93 0 0 1-3.93 3.93zm-25.552-7.86h21.622V60.046L106.545 38.42z" opacity="1" data-original="#0e1f3e" class=""></path><path fill="#b88f3c" d="m367.875 441.599-147.356 29.47V28.931l147.356 29.487z" opacity="1" data-original="#b88f3c" class=""></path><path fill="#0e1f3e" d="M220.519 474.999a3.93 3.93 0 0 1-3.93-3.93V28.931a3.931 3.931 0 0 1 4.701-3.854l147.356 29.487a3.93 3.93 0 0 1 3.158 3.854v383.18a3.93 3.93 0 0 1-3.159 3.854l-147.355 29.47a3.812 3.812 0 0 1-.771.077zm3.93-441.273v432.55l139.495-27.898V61.64z" opacity="1" data-original="#0e1f3e" class=""></path><path fill="#eaf0f3" d="M132.097 58.418h88.416v383.18h-88.416z" opacity="1" data-original="#eaf0f3" class=""></path><path fill="#0e1f3e" d="M220.513 445.529h-88.416a3.93 3.93 0 0 1-3.93-3.931V58.418a3.93 3.93 0 0 1 3.93-3.93h88.416a3.93 3.93 0 0 1 3.931 3.93v383.18a3.931 3.931 0 0 1-3.931 3.931zm-84.486-7.86h80.556V62.349h-80.556z" opacity="1" data-original="#0e1f3e" class=""></path><path fill="#b88f3c" d="M220.519 28.948H102.627l29.47 29.47h88.422z" opacity="1" data-original="#b88f3c" class=""></path><path fill="#0e1f3e" d="M220.519 62.349h-88.422a3.93 3.93 0 0 1-2.779-1.151l-29.47-29.47a3.93 3.93 0 0 1 2.779-6.709h117.892a3.93 3.93 0 0 1 3.931 3.93v29.47a3.932 3.932 0 0 1-3.931 3.93zm-86.794-7.861h82.864v-21.61H112.114z" opacity="1" data-original="#0e1f3e" class=""></path><path fill="#b88f3c" d="m220.553 28.948 147.322 29.47 29.504-29.47z" opacity="1" data-original="#b88f3c" class=""></path><path fill="#0e1f3e" d="M367.875 62.349c-.257 0-.515-.025-.771-.076l-147.322-29.47a3.93 3.93 0 0 1 .77-7.784h176.826a3.932 3.932 0 0 1 2.778 6.711L370.651 61.2a3.93 3.93 0 0 1-2.776 1.149zM260.236 32.878l106.348 21.274 21.299-21.274z" opacity="1" data-original="#0e1f3e" class=""></path><path fill="#a17f33" d="M345.762 53.991v392.035l22.113-4.427V58.418zM261.064 283.166c-2.026 0-3.902.593-5.538 1.549 3.288 1.905 5.51 5.435 5.51 9.521 0 4.064-2.222 7.594-5.51 9.511 1.636.944 3.518 1.537 5.538 1.537 6.114 0 11.02-4.956 11.02-11.048 0-6.113-4.905-11.07-11.02-11.07z" opacity="1" data-original="#a17f33" class=""></path><path fill="#eaf0f3" d="M261.03 294.236c0 6.092-4.916 11.048-11.03 11.048-6.113 0-11.048-4.956-11.048-11.048 0-6.113 4.935-11.07 11.048-11.07 6.114 0 11.03 4.957 11.03 11.07z" opacity="1" data-original="#eaf0f3" class=""></path><path fill="#0e1f3e" d="M250 309.215c-8.259 0-14.978-6.72-14.978-14.979 0-8.271 6.719-15 14.978-15 8.249 0 14.961 6.729 14.961 15 0 8.259-6.712 14.979-14.961 14.979zm0-22.118c-3.925 0-7.117 3.202-7.117 7.14 0 3.925 3.192 7.118 7.117 7.118 3.915 0 7.101-3.193 7.101-7.118 0-3.938-3.186-7.14-7.101-7.14z" opacity="1" data-original="#0e1f3e" class=""></path><path fill="#a17f33" d="M382.624 43.669v397.93h14.755V28.931zM198.412 58.418h22.107V33.353l-22.012-4.405h-.095z" opacity="1" data-original="#a17f33" class=""></path><path fill="#cad0d4" d="M198.412 58.418h22.106v383.18h-22.106z" opacity="1" data-original="#cad0d4" class=""></path><g fill="#0e1f3e"><path d="M397.379 445.529h-29.504a3.931 3.931 0 0 1-3.931-3.931V58.418c0-1.042.415-2.043 1.152-2.78L394.6 26.151a3.929 3.929 0 0 1 6.709 2.78v412.667a3.929 3.929 0 0 1-3.93 3.931zm-25.574-7.86h21.645V38.415l-21.645 21.632z" fill="#0e1f3e" opacity="1" data-original="#0e1f3e" class=""></path><path d="M220.519 474.999a3.93 3.93 0 0 1-3.93-3.93V28.931a3.931 3.931 0 0 1 4.701-3.854l147.356 29.487a3.93 3.93 0 0 1 3.158 3.854v383.18a3.93 3.93 0 0 1-3.159 3.854l-147.355 29.47a3.812 3.812 0 0 1-.771.077zm3.93-441.273v432.55l139.495-27.898V61.64z" fill="#0e1f3e" opacity="1" data-original="#0e1f3e" class=""></path><path d="M220.519 62.349h-88.422a3.93 3.93 0 0 1-2.779-1.151l-29.47-29.47a3.93 3.93 0 0 1 2.779-6.709h117.892a3.93 3.93 0 0 1 3.931 3.93v29.47a3.932 3.932 0 0 1-3.931 3.93zm-86.794-7.861h82.864v-21.61H112.114z" fill="#0e1f3e" opacity="1" data-original="#0e1f3e" class=""></path><path d="M367.875 62.349c-.257 0-.515-.025-.771-.076l-147.322-29.47a3.93 3.93 0 0 1 .77-7.784h176.826a3.932 3.932 0 0 1 2.778 6.711L370.651 61.2a3.93 3.93 0 0 1-2.776 1.149zM260.236 32.878l106.348 21.274 21.299-21.274zM220.515 475a3.918 3.918 0 0 1-2.451-.862 3.907 3.907 0 0 1-1.457-2.685 4.006 4.006 0 0 1-.019-.393l.001-.071V445.53H43.669a3.93 3.93 0 0 1 0-7.861h176.85a3.93 3.93 0 0 1 3.931 3.93v24.677l142.655-28.53c.253-.051.511-.076.771-.076h88.456a3.93 3.93 0 0 1 0 7.861h-88.067L221.37 474.907a3.862 3.862 0 0 1-.47.073c-.129.013-.257.02-.385.02z" fill="#0e1f3e" opacity="1" data-original="#0e1f3e" class=""></path><path d="M220.513 445.529h-88.416a3.93 3.93 0 0 1-3.93-3.931V58.418a3.93 3.93 0 0 1 3.93-3.93h88.416a3.93 3.93 0 0 1 3.931 3.93v383.18a3.931 3.931 0 0 1-3.931 3.931zm-84.486-7.86h80.556V62.349h-80.556z" fill="#0e1f3e" opacity="1" data-original="#0e1f3e" class=""></path></g></g></svg>
    </template>

    <template #title>
      {{ item.name }}
    </template>

    <template #status>
      <span v-if="device.properties.magnet">{{ device.properties.magnet.open ? 'open' : 'closed' }}</span>
    </template>

    <template #action>
    </template>

    <template #extended>
      <Section name="Magnet" v-if="device.properties.magnet">
        <List>
          <Item label="Status">
            <span>{{ device.properties.magnet.open ? 'open' : 'closed' }}</span>
          </Item>
          <Item label="Last update">
            <LastUpdate :timestamp="device.properties.magnet.updatedAt"></LastUpdate>
          </Item>
        </List>
      </Section>

      <BatterySection :battery="device.properties.battery" v-if="device.properties.battery"></BatterySection>
    </template>
  </Device>
</template>

<style scoped>
</style>