<script setup>
  import Device from "@/components/Device.vue";
  import Toggle from "@/components/controls/Toggle.vue";
  import List from "@/components/properties/List.vue";
  import Item from "@/components/properties/Item.vue";
  import Section from "@/components/properties/Section.vue";
  import LastUpdate from "@/components/properties/LastUpdate.vue";
  import {registry as Registry} from "@/registry";
  import TemperatureHero from "@/components/controls/TemperatureHero.vue";
  import {computed} from "vue";

  const props = defineProps({
    item: Object,
    device: Object
  });

  const p = computed(() => props.device.properties);
  const online = computed(() => p.value.available !== false);

  const MODES = {'000': 'Авто', '001': 'Охолодження', '100': 'Обігрів', '010': 'Осушення', '011': 'Вентилятор'};
  const indoor = computed(() => {
    const value = parseFloat(p.value.indoorTemperature);
    return Number.isFinite(value) ? value : null;
  });

  // Fan speed (windLevel): '000' = auto, '001'..'110' = level 1..6
  const fanSpeeds = [
    {label: 'Авто', value: '000'},
    {label: '1', value: '001'},
    {label: '2', value: '010'},
    {label: '3', value: '011'},
    {label: '4', value: '100'},
    {label: '5', value: '101'},
    {label: '6', value: '110'},
  ]

  // Vertical louver (SwUpDn) 0..11
  const swingVert = [
    {label: 'Вимк.', value: 0},
    {label: 'Гойдання (повне)', value: 1},
    {label: 'Вгору', value: 2},
    {label: 'Вище', value: 3},
    {label: 'Посередині', value: 4},
    {label: 'Нижче', value: 5},
    {label: 'Вниз', value: 6},
    {label: 'Гойдання внизу', value: 7},
    {label: 'Гойдання нижче', value: 8},
    {label: 'Гойдання посередині', value: 9},
    {label: 'Гойдання вище', value: 10},
    {label: 'Гойдання вгорі', value: 11},
  ]

  // Horizontal louver (SwingLfRig) 0,2..7
  const swingHor = [
    {label: 'Вимк.', value: 0},
    {label: 'Ліворуч', value: 2},
    {label: 'Лівіше центру', value: 3},
    {label: 'По центру', value: 4},
    {label: 'Правіше центру', value: 5},
    {label: 'Праворуч', value: 6},
    {label: 'Гойдання (повне)', value: 7},
  ]

  const bits = (v) => parseInt(v ?? '0', 2)
</script>

<template>
  <Device accent="cyan" :active="online && device.properties.enabled">
    <template #icon>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 510.909 510.909" style="enable-background:new 0 0 512 512" xml:space="preserve" class=""><g><path d="M475 324.498H35.91c-15.69 0-28.41-12.719-28.41-28.41V136.396c0-15.69 12.719-28.41 28.41-28.41H475c15.69 0 28.41 12.72 28.41 28.41v159.692c-.001 15.691-12.72 28.41-28.41 28.41z" style="" fill="#e0e0e0" data-original="#e0e0e0" class=""></path><path d="M475 297.498H35.91c-15.69 0-28.41-12.719-28.41-28.41v27c0 15.69 12.719 28.41 28.41 28.41H475c15.69 0 28.41-12.719 28.41-28.41v-27c-.001 15.691-12.72 28.41-28.41 28.41z" style="" fill="#c4c4c4" data-original="#c4c4c4"></path><path d="M61.368 268.13h388.173v56.368H61.368z" style="" fill="#66baea" data-original="#66baea" class=""></path><path d="M61.368 297.498h388.173v27H61.368z" style="" fill="#3aaae4" data-original="#3aaae4" class=""></path><path d="M475 100.486H121.478c-4.142 0-7.5 3.357-7.5 7.5s3.358 7.5 7.5 7.5H475c11.53 0 20.91 9.38 20.91 20.91v159.691c0 11.53-9.38 20.91-20.91 20.91h-17.959V268.13a7.5 7.5 0 0 0-7.5-7.5H61.368a7.5 7.5 0 0 0-7.5 7.5v48.867H35.91c-11.53 0-20.91-9.38-20.91-20.91V136.396c0-11.53 9.38-20.91 20.91-20.91h55.568c4.142 0 7.5-3.357 7.5-7.5s-3.358-7.5-7.5-7.5H35.91c-19.801 0-35.91 16.109-35.91 35.91v159.691c0 19.801 16.109 35.91 35.91 35.91h78.071a7.5 7.5 0 0 0 0-15H68.868v-13.184h298.061a7.5 7.5 0 0 0 7.5-7.5 7.5 7.5 0 0 0-7.5-7.5H68.868v-13.184h373.173v13.184h-45.112a7.5 7.5 0 0 0-7.5 7.5 7.5 7.5 0 0 0 7.5 7.5h45.112v13.184H143.98a7.5 7.5 0 0 0 0 15H475c19.801 0 35.91-16.109 35.91-35.91V136.396c-.001-19.8-16.11-35.91-35.91-35.91z" fill="#000000" opacity="1" data-original="#000000" class=""></path><path d="M449.541 161.467a7.5 7.5 0 0 0 7.5-7.5 7.5 7.5 0 0 0-7.5-7.5H427.36a7.5 7.5 0 0 0-7.5 7.5 7.5 7.5 0 0 0 7.5 7.5h22.181zM393.139 161.467a7.5 7.5 0 0 0 7.5-7.5 7.5 7.5 0 0 0-7.5-7.5H251.183a7.5 7.5 0 0 0-7.5 7.5 7.5 7.5 0 0 0 7.5 7.5h141.956zM141.082 352.064a7.5 7.5 0 0 0-7.5 7.5c0 .223-.241 22.457-21.047 37.245a7.5 7.5 0 0 0 4.352 13.614 7.467 7.467 0 0 0 4.339-1.388c27.046-19.224 27.357-48.246 27.357-49.472a7.5 7.5 0 0 0-7.501-7.499zM194.783 352.064a7.5 7.5 0 0 0-7.5 7.5v43.358a7.5 7.5 0 0 0 7.5 7.5 7.5 7.5 0 0 0 7.5-7.5v-43.358a7.5 7.5 0 0 0-7.5-7.5zM257.564 352.064a7.5 7.5 0 0 0-7.5 7.5v43.358a7.5 7.5 0 0 0 7.5 7.5 7.5 7.5 0 0 0 7.5-7.5v-43.358a7.5 7.5 0 0 0-7.5-7.5zM398.375 396.809c-20.526-14.589-21.036-36.281-21.047-37.279a7.5 7.5 0 0 0-7.5-7.466 7.5 7.5 0 0 0-7.5 7.5c0 1.226.311 30.248 27.357 49.472a7.498 7.498 0 0 0 10.459-1.768 7.502 7.502 0 0 0-1.769-10.459zM316.126 352.064a7.5 7.5 0 0 0-7.5 7.5v43.358a7.5 7.5 0 0 0 7.5 7.5 7.5 7.5 0 0 0 7.5-7.5v-43.358a7.5 7.5 0 0 0-7.5-7.5z" fill="#000000" opacity="1" data-original="#000000" class=""></path></g></svg>
    </template>

    <template #title>
      {{ item.name }}
    </template>

    <template #status>
      <!-- available is false while the unit is off at the mains or off the network -->
      <span v-if="!online">Немає зв'язку</span>
      <span v-else-if="device.properties.enabled">{{ MODES[device.properties.runMode] ?? 'Увімкнено' }} · {{ device.properties.wdNumber }}°</span>
      <span v-else>Вимкнено<template v-if="indoor !== null"> · {{ indoor }}°</template></span>
    </template>

    <template #action>
      <Toggle
          v-on:click="Registry.call(device.id, device.properties.enabled ? 'disable' : 'enable')"
          :value="device.properties.enabled"></Toggle>
    </template>

    <template #extended>
      <TemperatureHero
          :target="device.properties.wdNumber" :current="indoor" current-label="У кімнаті"
          :caption="device.properties.enabled ? MODES[device.properties.runMode] : 'Вимкнено'"
          :min="16" :max="30" :disabled="!online"
          @update:target="value => Registry.call(device.id, 'setTemperature', {value})"></TemperatureHero>

      <Section>
        <List>
          <Item label="Живлення">
            <Toggle
                @click="Registry.call(device.id, device.properties.enabled ? 'disable' : 'enable')"
                :value="device.properties.enabled"></Toggle>
          </Item>
          <li class="field-row mode-row">
            <span class="field-label">Режим</span>
            <div class="mode-grid">
              <button type="button" @click="Registry.call(device.id, 'setMode', {value: '000'})" class="mode-btn" :class="{'is-sel': device.properties.runMode === '000'}" aria-label="Авто">
                <span class="mode-ico auto-a">A</span>
                <span class="mode-txt">Авто</span>
              </button>
              <button type="button" @click="Registry.call(device.id, 'setMode', {value: '001'})" class="mode-btn" :class="{'is-sel': device.properties.runMode === '001'}" aria-label="Холод">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"><path d="M12 2v20M4.2 6.6l15.6 10.8M19.8 6.6 4.2 17.4"/><path d="M12 5.8 9.8 4.2M12 5.8 14.2 4.2M12 18.2 9.8 19.8M12 18.2 14.2 19.8M6.6 8.2 4 7.5M17.4 8.2 20 7.5M6.6 15.8 4 16.5M17.4 15.8 20 16.5"/></svg>
                <span class="mode-txt">Холод</span>
              </button>
              <button type="button" @click="Registry.call(device.id, 'setMode', {value: '100'})" class="mode-btn" :class="{'is-sel': device.properties.runMode === '100'}" aria-label="Тепло">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6-.5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5Z"/></svg>
                <span class="mode-txt">Тепло</span>
              </button>
              <button type="button" @click="Registry.call(device.id, 'setMode', {value: '010'})" class="mode-btn" :class="{'is-sel': device.properties.runMode === '010'}" aria-label="Осуш.">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
                <span class="mode-txt">Осуш.</span>
              </button>
              <button type="button" @click="Registry.call(device.id, 'setMode', {value: '011'})" class="mode-btn" :class="{'is-sel': device.properties.runMode === '011'}" aria-label="Вентил.">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"><path d="M10.83 16.38a6.08 6.08 0 0 1-8.62-7l5.41 1.45a6.08 6.08 0 0 1 7-8.62l-1.45 5.41a6.08 6.08 0 0 1 8.62 7l-5.41-1.45a6.08 6.08 0 0 1-7 8.62l1.45-5.41Z"/><circle cx="12" cy="12" r="1.6"/></svg>
                <span class="mode-txt">Вентил.</span>
              </button>
            </div>
          </li>
        </List>
      </Section>

      <Section name="Повітря">
        <List>
          <Item label="Швидкість вентилятора">
            <select class="ac-select"
                :value="device.properties.windLevel"
                @change="e => Registry.call(device.id, 'setFanSpeed', {value: e.target.value})">
              <option v-for="f in fanSpeeds" :key="f.value" :value="f.value">{{ f.label }}</option>
            </select>
          </Item>
          <Item label="Жалюзі вертикально">
            <select class="ac-select"
                :value="bits(device.properties.windTB)"
                @change="e => Registry.call(device.id, 'setSwingVert', {value: parseInt(e.target.value)})">
              <option v-for="s in swingVert" :key="s.value" :value="s.value">{{ s.label }}</option>
            </select>
          </Item>
          <Item label="Жалюзі горизонтально">
            <select class="ac-select"
                :value="bits(device.properties.windLR)"
                @change="e => Registry.call(device.id, 'setSwingHor', {value: parseInt(e.target.value)})">
              <option v-for="s in swingHor" :key="s.value" :value="s.value">{{ s.label }}</option>
            </select>
          </Item>
        </List>
      </Section>

      <Section name="Функції">
        <List>
          <Item label="Турбо">
            <Toggle
                v-on:click="Registry.call(device.id, 'setTurbo', {value: device.properties.cpmode ? 0 : 1})"
                :value="device.properties.cpmode === 1"></Toggle>
          </Item>
          <Item label="Тихий режим">
            <Toggle
                v-on:click="Registry.call(device.id, device.properties.mute ? 'unmute' : 'mute')"
                :value="device.properties.mute === 1"></Toggle>
          </Item>
          <Item label="Сон">
            <Toggle
                v-on:click="Registry.call(device.id, 'setSleepMode', {value: device.properties.sleep ? 0 : 1})"
                :value="device.properties.sleep === 1"></Toggle>
          </Item>
          <Item label="Іонізація">
            <Toggle
                v-on:click="Registry.call(device.id, 'setHealthMode', {value: device.properties.healthy ? 0 : 1})"
                :value="device.properties.healthy === 1"></Toggle>
          </Item>
          <Item label="Просушування (X-Fan)">
            <Toggle
                v-on:click="Registry.call(device.id, 'setBlow', {value: device.properties.dryingmode ? 0 : 1})"
                :value="device.properties.dryingmode === 1"></Toggle>
          </Item>
          <Item label="Еко">
            <Toggle
                v-on:click="Registry.call(device.id, 'setPowerSave', {value: device.properties.eco ? 0 : 1})"
                :value="device.properties.eco === 1"></Toggle>
          </Item>
          <Item label="Підсвітка дисплея">
            <Toggle
                v-on:click="Registry.call(device.id, 'setLights', {value: device.properties.lighting ? 0 : 1})"
                :value="device.properties.lighting === 1"></Toggle>
          </Item>
        </List>
      </Section>

      <Section name="Пристрій">
        <List>
          <Item label="Зв'язок">
            <span :class="online ? 'pill pill-accent' : 'pill pill-muted'">
              <span class="pill-dot"></span>{{ online ? 'На зв\'язку' : 'Немає зв\'язку' }}
            </span>
          </Item>
          <Item label="Оновлено">
            <LastUpdate :timestamp="device.properties.updatedAt"></LastUpdate>
          </Item>
        </List>
      </Section>
    </template>
  </Device>
</template>

<style scoped>
  /* Mode selector — full-width, icon + label per mode */
  .mode-row {
    @apply block;
  }
  .mode-grid {
    @apply mt-2.5 grid grid-cols-5 gap-1.5;
  }
  .mode-btn {
    @apply flex flex-col items-center justify-center gap-1 rounded-xl py-2.5 transition duration-150 active:scale-95;
    background: rgba(255, 255, 255, 0.06);
    color: var(--ink-2);
  }
  .mode-btn:hover {
    background: rgba(255, 255, 255, 0.09);
    color: #fff;
  }
  .mode-btn.is-sel {
    background: rgb(var(--accent-rgb));
    border-color: transparent;
    color: #0a0a0d;
    box-shadow: 0 0 14px rgb(var(--accent-rgb) / 0.35);
  }
  .mode-ico {
    @apply grid h-5 w-5 place-items-center;
  }
  .auto-a {
    @apply text-[15px] font-extrabold leading-none;
  }
  .mode-txt {
    @apply text-[10px] font-semibold tracking-wide;
  }
  .ac-select {
    @apply rounded-lg px-2.5 py-1.5 text-[15px] outline-none transition duration-150;
    background: rgba(120, 120, 128, 0.24);
    color: var(--ink);
    max-width: 12rem;
  }
  .ac-select:hover {
    background: rgba(255, 255, 255, 0.1);
  }
  .ac-select:focus {
    border-color: rgb(var(--accent-rgb));
  }
  .ac-select option {
    background: #18181b;
    color: #fff;
  }
</style>
