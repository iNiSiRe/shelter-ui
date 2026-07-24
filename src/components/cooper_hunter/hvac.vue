<script setup>
  import Device from "@/components/Device.vue";
  import Toggle from "@/components/controls/Toggle.vue";
  import List from "@/components/properties/List.vue";
  import Item from "@/components/properties/Item.vue";
  import Section from "@/components/properties/Section.vue";
  import LastUpdate from "@/components/properties/LastUpdate.vue";
  import {registry as Registry} from "@/registry";
  import Radio from "@/components/controls/Radio.vue";
  import CounterInput from "@/components/controls/CounterInput.vue";

  const props = defineProps({
    item: Object,
    device: Object
  });

  const modes = {
      auto: '000',
      cool: '001',
      dry: '010',
      wind: '011',
      heat: '100',
      mode101: '101'
  }
</script>

<template>
  <Device accent="cyan" :active="device.properties.enabled">
    <template #icon>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 510.909 510.909" style="enable-background:new 0 0 512 512" xml:space="preserve" class=""><g><path d="M475 324.498H35.91c-15.69 0-28.41-12.719-28.41-28.41V136.396c0-15.69 12.719-28.41 28.41-28.41H475c15.69 0 28.41 12.72 28.41 28.41v159.692c-.001 15.691-12.72 28.41-28.41 28.41z" style="" fill="#e0e0e0" data-original="#e0e0e0" class=""></path><path d="M475 297.498H35.91c-15.69 0-28.41-12.719-28.41-28.41v27c0 15.69 12.719 28.41 28.41 28.41H475c15.69 0 28.41-12.719 28.41-28.41v-27c-.001 15.691-12.72 28.41-28.41 28.41z" style="" fill="#c4c4c4" data-original="#c4c4c4"></path><path d="M61.368 268.13h388.173v56.368H61.368z" style="" fill="#66baea" data-original="#66baea" class=""></path><path d="M61.368 297.498h388.173v27H61.368z" style="" fill="#3aaae4" data-original="#3aaae4" class=""></path><path d="M475 100.486H121.478c-4.142 0-7.5 3.357-7.5 7.5s3.358 7.5 7.5 7.5H475c11.53 0 20.91 9.38 20.91 20.91v159.691c0 11.53-9.38 20.91-20.91 20.91h-17.959V268.13a7.5 7.5 0 0 0-7.5-7.5H61.368a7.5 7.5 0 0 0-7.5 7.5v48.867H35.91c-11.53 0-20.91-9.38-20.91-20.91V136.396c0-11.53 9.38-20.91 20.91-20.91h55.568c4.142 0 7.5-3.357 7.5-7.5s-3.358-7.5-7.5-7.5H35.91c-19.801 0-35.91 16.109-35.91 35.91v159.691c0 19.801 16.109 35.91 35.91 35.91h78.071a7.5 7.5 0 0 0 0-15H68.868v-13.184h298.061a7.5 7.5 0 0 0 7.5-7.5 7.5 7.5 0 0 0-7.5-7.5H68.868v-13.184h373.173v13.184h-45.112a7.5 7.5 0 0 0-7.5 7.5 7.5 7.5 0 0 0 7.5 7.5h45.112v13.184H143.98a7.5 7.5 0 0 0 0 15H475c19.801 0 35.91-16.109 35.91-35.91V136.396c-.001-19.8-16.11-35.91-35.91-35.91z" fill="#000000" opacity="1" data-original="#000000" class=""></path><path d="M449.541 161.467a7.5 7.5 0 0 0 7.5-7.5 7.5 7.5 0 0 0-7.5-7.5H427.36a7.5 7.5 0 0 0-7.5 7.5 7.5 7.5 0 0 0 7.5 7.5h22.181zM393.139 161.467a7.5 7.5 0 0 0 7.5-7.5 7.5 7.5 0 0 0-7.5-7.5H251.183a7.5 7.5 0 0 0-7.5 7.5 7.5 7.5 0 0 0 7.5 7.5h141.956zM141.082 352.064a7.5 7.5 0 0 0-7.5 7.5c0 .223-.241 22.457-21.047 37.245a7.5 7.5 0 0 0 4.352 13.614 7.467 7.467 0 0 0 4.339-1.388c27.046-19.224 27.357-48.246 27.357-49.472a7.5 7.5 0 0 0-7.501-7.499zM194.783 352.064a7.5 7.5 0 0 0-7.5 7.5v43.358a7.5 7.5 0 0 0 7.5 7.5 7.5 7.5 0 0 0 7.5-7.5v-43.358a7.5 7.5 0 0 0-7.5-7.5zM257.564 352.064a7.5 7.5 0 0 0-7.5 7.5v43.358a7.5 7.5 0 0 0 7.5 7.5 7.5 7.5 0 0 0 7.5-7.5v-43.358a7.5 7.5 0 0 0-7.5-7.5zM398.375 396.809c-20.526-14.589-21.036-36.281-21.047-37.279a7.5 7.5 0 0 0-7.5-7.466 7.5 7.5 0 0 0-7.5 7.5c0 1.226.311 30.248 27.357 49.472a7.498 7.498 0 0 0 10.459-1.768 7.502 7.502 0 0 0-1.769-10.459zM316.126 352.064a7.5 7.5 0 0 0-7.5 7.5v43.358a7.5 7.5 0 0 0 7.5 7.5 7.5 7.5 0 0 0 7.5-7.5v-43.358a7.5 7.5 0 0 0-7.5-7.5z" fill="#000000" opacity="1" data-original="#000000" class=""></path></g></svg>
    </template>

    <template #title>
      {{ item.name }}
    </template>

    <template #status>
      {{ device.properties.indoorTemperature }}℃ <span class="text-zinc-600">/</span> {{ device.properties.wdNumber.toFixed(1) }}℃
    </template>

    <template #action>
      <Toggle
          v-on:click="Registry.call(device.id, device.properties.enabled ? 'disable' : 'enable')"
          :value="device.properties.enabled"></Toggle>
    </template>

    <template #extended>
      <Section name="Climate">
        <List>
          <Item label="Power">
            <Toggle
                @click="Registry.call(device.id, device.properties.enabled ? 'disable' : 'enable')"
                :value="device.properties.enabled"></Toggle>
          </Item>
          <Item label="Set temperature">
            <CounterInput v-on:update:value="value => Registry.call(device.id, 'setTemperature', {value: value})" v-model:value="device.properties.wdNumber" :min="15" :max="40"></CounterInput>
          </Item>
          <Item label="Indoor temperature">
            <span>{{ device.properties.indoorTemperature }}℃</span>
          </Item>
          <Item label="Mode">
            <Radio>
              <button type="button" @click="Registry.call(device.id, 'setMode', {value: modes.auto})" class="seg-item" :class="{'is-sel': device.properties.runMode === modes.auto}" aria-label="Auto">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 4v5h-5"/></svg>
              </button>
              <button type="button" @click="Registry.call(device.id, 'setMode', {value: modes.heat})" class="seg-item" :class="{'is-sel': device.properties.runMode === modes.heat}" aria-label="Heat">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5"><path d="M12 23a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5s-3 3.5-3 5.5a7 7 0 0 0 7 7zm0-3a2.5 2.5 0 0 1-2.5-2.5c0-1 .6-1.9 1.5-2.6.3.9 1 1.3 1 1.3s1.5-1 1-3c1 .8 1.5 2 1.5 3.3A2.5 2.5 0 0 1 12 20z"/></svg>
              </button>
              <button type="button" @click="Registry.call(device.id, 'setMode', {value: modes.cool})" class="seg-item" :class="{'is-sel': device.properties.runMode === modes.cool}" aria-label="Cool">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"><path d="M12 2v20M4.2 7l15.6 10M19.8 7 4.2 17"/></svg>
              </button>
            </Radio>
          </Item>
          <Item label="Last update">
            <LastUpdate :timestamp="device.properties.updatedAt"></LastUpdate>
          </Item>
          <Item label="Mute">
            <Toggle
                v-on:click="Registry.call(device.id, device.properties.mute ? 'unmute' : 'mute')"
                :value="device.properties.mute === 1"></Toggle>
          </Item>
        </List>
      </Section>
    </template>
  </Device>
</template>

<style scoped>
  .seg-item {
    @apply grid h-9 w-9 place-items-center rounded-lg text-zinc-400 transition duration-150 active:scale-95;
  }
  .seg-item:hover {
    @apply bg-white/10 text-white;
  }
  .seg-item.is-sel {
    background: rgb(var(--accent-rgb));
    color: #0a0a0d;
  }
</style>
