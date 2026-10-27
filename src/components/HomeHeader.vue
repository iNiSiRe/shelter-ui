<script setup>
  import {computed, onMounted, onUnmounted, ref} from "vue";
  import {AIR_LEVELS, airLevel} from "@/air";

  const props = defineProps({
    devices: Array,
    // device id → the name the dashboard gives it, for the alerts
    names: Object,
  });

  const now = ref(Date.now());
  let timer = null;
  onMounted(() => timer = setInterval(() => now.value = Date.now(), 60_000));
  onUnmounted(() => clearInterval(timer));

  const find = (id) => props.devices.find(device => device.id === id)?.properties ?? null;
  const byModel = (model) => props.devices.filter(device => device.model === model);

  const greeting = computed(() => {
    const hour = new Date(now.value).getHours();
    return hour >= 5 && hour < 12 ? 'Доброго ранку'
      : hour < 18 && hour >= 12 ? 'Добрий день'
      : hour < 23 && hour >= 18 ? 'Добрий вечір'
      : 'Доброї ночі';
  });

  // WMO weather codes, as Open-Meteo reports them.
  const SKY = [[0, 'ясно'], [1, 'переважно ясно'], [2, 'мінлива хмарність'], [3, 'хмарно'], [48, 'туман'],
    [57, 'мряка'], [67, 'дощ'], [77, 'сніг'], [82, 'злива'], [86, 'снігопад'], [99, 'гроза']];
  const sky = (code) => code === null || code === undefined ? '' : (SKY.find(([max]) => code <= max) ?? [0, ''])[1];

  const pad = (value) => String(value).padStart(2, '0');
  const clock = (time) => `${pad(new Date(time).getHours())}:${pad(new Date(time).getMinutes())}`;

  const chips = computed(() => {
    const list = [];
    const guard = find('guard');
    const battery = find('marstek_venus');
    const weather = find('weather_outdoor');
    const humidifier = find('dyson_humidifier');

    // Alerts first: they are why anyone looks.
    for (const leak of byModel('lumi.sensor_wleak.aq1')) {
      if (leak.properties.leak?.active) {
        list.push({kind: 'alert', icon: 'drop', text: `Протікання: ${props.names[leak.id] ?? 'датчик'}`});
      }
    }
    if (guard?.mains?.state === 'off') {
      list.push({kind: 'alert', icon: 'bolt', text: `Світла немає з ${clock(guard.mains.since)}`});
    }
    for (const door of byModel('lumi.sensor_magnet.aq2')) {
      if (door.properties.magnet?.open) {
        list.push({kind: 'alert', icon: 'door', text: `${props.names[door.id] ?? 'Двері'}: відчинено`});
      }
    }

    if (guard?.presence) {
      list.push({icon: 'home', text: guard.presence === 'home' ? 'Вдома' : 'Нікого вдома'});
    }
    if (guard?.mains?.state === 'on') {
      list.push({icon: 'bolt', text: 'Світло є'});
    }
    if (battery?.available && battery.soc !== null) {
      const charging = battery.ongridPower !== null && battery.ongridPower < 0;
      list.push({icon: 'battery', text: `${battery.soc}%${charging ? ' · заряджається' : ''}`});
    }
    // Indoors, by the Dyson: the air's grade and the humidity, "сухо" below the Guard's 35 %.
    if (humidifier?.available) {
      const level = airLevel(humidifier);
      const parts = [level === null ? 'Повітря' : `Повітря ${level.word}`];
      if (typeof humidifier.humidity === 'number') {
        parts.push(`${humidifier.humidity}%${humidifier.humidity < 35 ? ' сухо' : ''}`);
      }
      list.push({
        kind: level === AIR_LEVELS[AIR_LEVELS.length - 1] ? 'alert' : undefined,
        icon: 'air', dot: level?.rgb, text: parts.join(' · '),
      });
    }
    if (weather?.temperature !== null && weather?.temperature !== undefined) {
      const t = Math.round(weather.temperature);
      list.push({icon: 'cloud', text: `${t > 0 ? '+' : ''}${t}° ${sky(weather.code)}`});
    }
    if (guard?.automations?.presence && guard.automations.presence !== 'off') {
      list.push({kind: 'muted', icon: 'shield', text: guard.automations.presence === 'on' ? 'Охорона ввімкнена' : 'Охорона: спостереження'});
    }

    const offline = props.devices.filter(device => device.properties?.available === false).length;
    if (offline > 0) {
      list.push({kind: 'muted', icon: 'wifi', text: `${offline} без зв'язку`});
    }

    return list;
  });

  const ICONS = {
    home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
    bolt: 'M13 2 4 14h7l-1 8 9-12h-7z',
    battery: 'M3 8a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM20 10v4',
    cloud: 'M7 18h10a4 4 0 0 0 .5-7.97A6 6 0 0 0 6.1 9.1 4.5 4.5 0 0 0 7 18z',
    shield: 'M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6z',
    drop: 'M12 3s6 6.4 6 11a6 6 0 0 1-12 0c0-4.6 6-11 6-11z',
    door: 'M6 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17M4 21h16M14 12h.01',
    wifi: 'M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 19.5h.01',
    air: 'M3 8h10a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h8',
  };
</script>

<template>
  <header class="pt-2">
    <p class="text-[15px] font-medium text-[color:var(--ink-2)]">{{ greeting }}</p>
    <h1 class="mt-0.5 text-[34px] font-bold leading-tight tracking-tight">Дім</h1>

    <div class="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
      <span v-for="chip in chips" :key="chip.text" class="chip"
            :class="{'chip-alert': chip.kind === 'alert', 'chip-muted': chip.kind === 'muted'}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path :d="ICONS[chip.icon]"/></svg>
        <span v-if="chip.dot && chip.kind !== 'alert'" class="h-2 w-2 flex-none rounded-full" :style="{background: `rgb(${chip.dot})`}"></span>
        {{ chip.text }}
      </span>
    </div>
  </header>
</template>
