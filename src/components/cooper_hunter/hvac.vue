<script setup>
  import Device from "@/components/Device.vue";
  import Toggle from "@/components/controls/Toggle.vue";
  import List from "@/components/properties/List.vue";
  import Item from "@/components/properties/Item.vue";
  import Section from "@/components/properties/Section.vue";
  import LastUpdate from "@/components/properties/LastUpdate.vue";
  import {registry as Registry} from "@/registry";
  import {bus as Bus} from "@/bus";
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
  <Device>
    <template #icon>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 510.909 510.909" style="enable-background:new 0 0 512 512" xml:space="preserve" class=""><g><path d="M475 324.498H35.91c-15.69 0-28.41-12.719-28.41-28.41V136.396c0-15.69 12.719-28.41 28.41-28.41H475c15.69 0 28.41 12.72 28.41 28.41v159.692c-.001 15.691-12.72 28.41-28.41 28.41z" style="" fill="#e0e0e0" data-original="#e0e0e0" class=""></path><path d="M475 297.498H35.91c-15.69 0-28.41-12.719-28.41-28.41v27c0 15.69 12.719 28.41 28.41 28.41H475c15.69 0 28.41-12.719 28.41-28.41v-27c-.001 15.691-12.72 28.41-28.41 28.41z" style="" fill="#c4c4c4" data-original="#c4c4c4"></path><path d="M61.368 268.13h388.173v56.368H61.368z" style="" fill="#66baea" data-original="#66baea" class=""></path><path d="M61.368 297.498h388.173v27H61.368z" style="" fill="#3aaae4" data-original="#3aaae4" class=""></path><path d="M475 100.486H121.478c-4.142 0-7.5 3.357-7.5 7.5s3.358 7.5 7.5 7.5H475c11.53 0 20.91 9.38 20.91 20.91v159.691c0 11.53-9.38 20.91-20.91 20.91h-17.959V268.13a7.5 7.5 0 0 0-7.5-7.5H61.368a7.5 7.5 0 0 0-7.5 7.5v48.867H35.91c-11.53 0-20.91-9.38-20.91-20.91V136.396c0-11.53 9.38-20.91 20.91-20.91h55.568c4.142 0 7.5-3.357 7.5-7.5s-3.358-7.5-7.5-7.5H35.91c-19.801 0-35.91 16.109-35.91 35.91v159.691c0 19.801 16.109 35.91 35.91 35.91h78.071a7.5 7.5 0 0 0 0-15H68.868v-13.184h298.061a7.5 7.5 0 0 0 7.5-7.5 7.5 7.5 0 0 0-7.5-7.5H68.868v-13.184h373.173v13.184h-45.112a7.5 7.5 0 0 0-7.5 7.5 7.5 7.5 0 0 0 7.5 7.5h45.112v13.184H143.98a7.5 7.5 0 0 0 0 15H475c19.801 0 35.91-16.109 35.91-35.91V136.396c-.001-19.8-16.11-35.91-35.91-35.91z" fill="#000000" opacity="1" data-original="#000000" class=""></path><path d="M449.541 161.467a7.5 7.5 0 0 0 7.5-7.5 7.5 7.5 0 0 0-7.5-7.5H427.36a7.5 7.5 0 0 0-7.5 7.5 7.5 7.5 0 0 0 7.5 7.5h22.181zM393.139 161.467a7.5 7.5 0 0 0 7.5-7.5 7.5 7.5 0 0 0-7.5-7.5H251.183a7.5 7.5 0 0 0-7.5 7.5 7.5 7.5 0 0 0 7.5 7.5h141.956zM141.082 352.064a7.5 7.5 0 0 0-7.5 7.5c0 .223-.241 22.457-21.047 37.245a7.5 7.5 0 0 0 4.352 13.614 7.467 7.467 0 0 0 4.339-1.388c27.046-19.224 27.357-48.246 27.357-49.472a7.5 7.5 0 0 0-7.501-7.499zM194.783 352.064a7.5 7.5 0 0 0-7.5 7.5v43.358a7.5 7.5 0 0 0 7.5 7.5 7.5 7.5 0 0 0 7.5-7.5v-43.358a7.5 7.5 0 0 0-7.5-7.5zM257.564 352.064a7.5 7.5 0 0 0-7.5 7.5v43.358a7.5 7.5 0 0 0 7.5 7.5 7.5 7.5 0 0 0 7.5-7.5v-43.358a7.5 7.5 0 0 0-7.5-7.5zM398.375 396.809c-20.526-14.589-21.036-36.281-21.047-37.279a7.5 7.5 0 0 0-7.5-7.466 7.5 7.5 0 0 0-7.5 7.5c0 1.226.311 30.248 27.357 49.472a7.498 7.498 0 0 0 10.459-1.768 7.502 7.502 0 0 0-1.769-10.459zM316.126 352.064a7.5 7.5 0 0 0-7.5 7.5v43.358a7.5 7.5 0 0 0 7.5 7.5 7.5 7.5 0 0 0 7.5-7.5v-43.358a7.5 7.5 0 0 0-7.5-7.5z" fill="#000000" opacity="1" data-original="#000000" class=""></path></g></svg>
    </template>

    <template #title>
      {{ item.name }}
    </template>

    <template #status>
      {{ device.properties.indoorTemperature }}℃ / {{ device.properties.wdNumber.toFixed(1) }}℃
    </template>

    <template #action>
      <Toggle
          v-on:click="Registry.call(device.id, device.properties.enabled ? 'disable' : 'enable')"
          :value="device.properties.enabled"></Toggle>
    </template>

    <template #extended>
      <Section name="HVAC">
        <List>
          <Item label="Enabled">
            <Toggle
                @click="Registry.call(device.id, device.properties.enabled ? 'disable' : 'enable')"
                :value="device.properties.enabled"></Toggle>
          </Item>
          <Item label="Set Temperature">
            <CounterInput v-on:update:value="value => Registry.call(device.id, 'setTemperature', {value: value})" v-model:value="device.properties.wdNumber" :min="15" :max="40"></CounterInput>
          </Item>
          <Item label="Indoor Temperature">
            <span>{{ device.properties.indoorTemperature }}℃</span>
          </Item>
          <Item label="Mode">
            <Radio>
              <button @click.once="Registry.call(device.id, 'setMode', {value: modes.auto})" class="text-white flex">
                <label :class="[{'bg-indigo-400': device.properties.runMode !== modes.auto, 'bg-indigo-600': device.properties.runMode === modes.auto}, 'px-2', 'py-1']">
                  <input class="hidden" type="radio" name="mode" />
                  <svg xmlns="http://www.w3.org/2000/svg" height="30" width="30" viewBox="0 0 682.667 682.667" style="filter: invert(100%) sepia(95%) saturate(0%) hue-rotate(128deg) brightness(104%) contrast(105%);" xml:space="preserve" class=""><g><defs><clipPath id="a" clipPathUnits="userSpaceOnUse"><path d="M0 512h512V0H0Z" fill="#000000" opacity="1" data-original="#000000"></path></clipPath></defs><g clip-path="url(#a)" transform="matrix(1.33333 0 0 -1.33333 0 682.667)"><path d="M0 0a32.11 32.11 0 0 1-9.415 22.722 32.122 32.122 0 0 1-22.719 9.411h-417.732a32.122 32.122 0 0 1-22.719-9.411A32.11 32.11 0 0 1-482 0v-224.934a32.106 32.106 0 0 1 9.415-22.721 32.118 32.118 0 0 1 22.719-9.411h417.732a32.118 32.118 0 0 1 22.719 9.411A32.106 32.106 0 0 1 0-224.934z" style="stroke-width:30;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-dasharray:none;stroke-opacity:1" transform="translate(497 368.467)" fill="none" stroke="#000000" stroke-width="30" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="10" stroke-dasharray="none" stroke-opacity="" data-original="#000000" class=""></path><path d="M0 0v68.3a32.112 32.112 0 0 0 9.407 22.71 32.126 32.126 0 0 0 22.71 9.407h.016c17.746 0 32.134-14.387 32.134-32.134V0" style="stroke-width:30;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-dasharray:none;stroke-opacity:1" transform="translate(63.2 207.8)" fill="none" stroke="#000000" stroke-width="30" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="10" stroke-dasharray="none" stroke-opacity="" data-original="#000000" class=""></path><path d="M0 0v-68.3a32.112 32.112 0 0 1 9.407-22.71 32.126 32.126 0 0 1 22.71-9.407h.016c17.746 0 32.134 14.387 32.134 32.134V0" style="stroke-width:30;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-dasharray:none;stroke-opacity:1" transform="translate(175.667 304.2)" fill="none" stroke="#000000" stroke-width="30" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="10" stroke-dasharray="none" stroke-opacity="" data-original="#000000" class=""></path><path d="M0 0a32.116 32.116 0 0 1-32.117-32.117v-40.199A32.12 32.12 0 0 1 0-104.434h.017a32.117 32.117 0 0 1 22.717 9.413A32.1 32.1 0 0 1 32.149-72.3v40.166a32.103 32.103 0 0 1-9.415 22.722A32.12 32.12 0 0 1 .017 0Z" style="stroke-width:30;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-dasharray:none;stroke-opacity:1" transform="translate(416.65 308.217)" fill="none" stroke="#000000" stroke-width="30" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="10" stroke-dasharray="none" stroke-opacity="" data-original="#000000" class=""></path><path d="M0 0h64.267" style="stroke-width:30;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-dasharray:none;stroke-opacity:1" transform="translate(280.1 304.2)" fill="none" stroke="#000000" stroke-width="30" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="10" stroke-dasharray="none" stroke-opacity="" data-original="#000000" class=""></path><path d="M0 0v-96.4" style="stroke-width:30;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-dasharray:none;stroke-opacity:1" transform="translate(312.233 304.2)" fill="none" stroke="#000000" stroke-width="30" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="10" stroke-dasharray="none" stroke-opacity="" data-original="#000000" class=""></path><path d="M0 0h64.267" style="stroke-width:30;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-dasharray:none;stroke-opacity:1" transform="translate(63.2 239.934)" fill="none" stroke="#000000" stroke-width="30" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="10" stroke-dasharray="none" stroke-opacity="" data-original="#000000" class=""></path></g></g></svg>
                </label>
              </button>
              <button @click.once="Registry.call(device.id, 'setMode', {value: modes.heat})" class="text-white flex">
                <label :class="[{'bg-indigo-400': device.properties.runMode !== modes.heat, 'bg-indigo-600': device.properties.runMode === modes.heat}, 'px-2', 'py-1']">
                  <input class="hidden" type="radio" name="mode" />
                  <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 48 48" style="filter: invert(100%) sepia(95%) saturate(0%) hue-rotate(128deg) brightness(104%) contrast(105%);" xml:space="preserve" class=""><g><path d="M14.919 7.394a1 1 0 0 0-1.433-1.251C7.94 9.47 5.893 18.023 9.106 24.447c2.989 5.977 4.793 9.584 1.976 16.159a1 1 0 0 0 1.433 1.251c5.544-3.327 7.591-11.88 4.379-18.307-2.988-5.976-4.792-9.583-1.975-16.156zm11 0a1 1 0 0 0-1.433-1.251c-5.545 3.327-7.592 11.881-4.38 18.305 2.989 5.977 4.793 9.584 1.976 16.159a1 1 0 0 0 1.433 1.251c5.544-3.327 7.591-11.88 4.379-18.307-2.988-5.977-4.792-9.584-1.975-16.157zm12.975 16.157c-2.988-5.977-4.792-9.584-1.975-16.157a1 1 0 0 0-1.433-1.251c-5.545 3.327-7.592 11.881-4.38 18.305 2.989 5.977 4.793 9.584 1.976 16.159a1 1 0 0 0 1.433 1.251c5.544-3.327 7.591-11.881 4.379-18.307z" fill="#000000" opacity="1" data-original="#000000" class=""></path></g></svg>
                </label>
              </button>
              <button @click.once="Registry.call(device.id, 'setMode', {value: modes.cool})" class="text-white flex">
                <label :class="[{'bg-indigo-400': device.properties.runMode !== modes.cool, 'bg-indigo-600': device.properties.runMode === modes.cool}, 'px-2', 'py-1']">
                  <input class="hidden" type="radio" name="mode" />
                  <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 32 32" style="filter: invert(100%) sepia(95%) saturate(0%) hue-rotate(128deg) brightness(104%) contrast(105%);" xml:space="preserve" class=""><g><path d="M16.001 2c-.505 0-1.01.34-1 1.016v3.129l-1.838-1.84a1 1 0 1 0-1.414 1.414l3.252 3.252v5.298l-4.59-2.648c-.397-1.481-.792-2.962-1.19-4.443a1.001 1.001 0 1 0-1.93.517l.673 2.512-2.71-1.564a.998.998 0 1 0-1 1.73l2.708 1.564-2.51.672a1 1 0 1 0 .518 1.932l4.441-1.19 4.59 2.65-4.59 2.65-4.44-1.19a1 1 0 1 0-.518 1.932l2.511.671-2.71 1.565a.998.998 0 1 0 1 1.73l2.71-1.564-.674 2.512a1.001 1.001 0 1 0 1.932.518c.397-1.482.792-2.963 1.19-4.444L15 17.732v5.3l-3.252 3.251a1 1 0 1 0 1.414 1.414l1.838-1.838v3.127A.997.997 0 0 0 16.009 30c.557-.01 1-.462.992-1.014v-3.123l1.836 1.834a1 1 0 1 0 1.414-1.414L17 23.033v-5.299l4.588 2.649 1.191 4.441a1.001 1.001 0 1 0 1.932-.517l-.672-2.51 2.707 1.562c1.161.693 2.18-1.072 1-1.732l-2.707-1.563 2.508-.671a1 1 0 1 0-.518-1.932l-4.44 1.19L18 16l4.59-2.65 4.44 1.19a1 1 0 1 0 .518-1.932l-2.508-.672 2.707-1.562c1.18-.66.161-2.425-1-1.732l-2.71 1.564.675-2.512a1.001 1.001 0 1 0-1.932-.518l-1.191 4.444L17 14.269v-5.3l3.25-3.25a1 1 0 1 0-1.414-1.414L17 6.14V3.016C17.01 2.339 16.506 2 16 2z" fill="#000000" opacity="1" data-original="#000000" class=""></path></g></svg>
                </label>
              </button>
            </Radio>
          </Item>
          <Item label="Last update">
            <LastUpdate :timestamp="device.properties.updatedAt"></LastUpdate>
          </item>
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

</style>