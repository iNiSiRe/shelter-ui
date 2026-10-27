<script setup>
  import {computed} from "vue";
  import Device from "../Device.vue";
  import List from "../properties/List.vue";
  import Item from "../properties/Item.vue";
  import Section from "../properties/Section.vue";
  import LastUpdate from "../properties/LastUpdate.vue";

  const props = defineProps({
    item: Object,
    device: Object
  });

  // The battery stops at 12% with the default depth of discharge (88%), which the API cannot read.
  const RESERVE = 12;

  const p = computed(() => props.device.properties);
  const online = computed(() => p.value.available === true);
  const soc = computed(() => p.value.soc);

  const stored = computed(() => soc.value !== null && p.value.capacity
      ? p.value.capacity * soc.value / 100 : null);

  // How long the charge lasts at what the backup socket draws now — the Pi and the router.
  const runtime = computed(() => {
    const load = p.value.offgridPower;
    if (soc.value === null || !p.value.capacity || !load) {
      return null;
    }

    const hours = p.value.capacity * Math.max(0, soc.value - RESERVE) / 100 / load;

    if (hours >= 48) {
      return `≈ ${Math.round(hours / 24)} дн`;
    }
    return hours >= 1 ? `≈ ${Math.round(hours)} год` : `≈ ${Math.round(hours * 60)} хв`;
  });

  // Negative charges, as with the API's own power setpoints.
  const flow = computed(() => {
    const power = p.value.ongridPower;
    if (power === null || power === undefined) {
      return null;
    }
    if (power === 0) {
      return 'простоює';
    }
    return power < 0 ? `заряджається, ${-power} Вт` : `віддає, ${power} Вт`;
  });

  const kwh = (wh) => wh === null || wh === undefined ? '—' : `${(wh / 1000).toFixed(wh >= 10000 ? 0 : 1)} кВт·год`;

  const level = computed(() => soc.value >= 50 ? '163 230 53' : soc.value >= 20 ? '245 158 11' : '251 113 133');

  const signal = computed(() => {
    const rssi = p.value.wifiRssi;
    if (rssi === null || rssi === undefined) {
      return '—';
    }
    const quality = rssi >= -60 ? 'відмінний' : rssi >= -70 ? 'добрий' : rssi >= -80 ? 'середній' : 'слабкий';
    return `${rssi} дБм · ${quality}`;
  });
</script>

<template>
  <Device accent="lime" :active="online && p.ongridPower !== 0 && p.ongridPower !== null">
    <template #icon>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="14" y="10" width="36" height="48" rx="6" fill="#3762cc"/><rect x="24" y="5" width="16" height="7" rx="2" fill="#4671c6"/><rect x="19" y="15" width="26" height="38" rx="3" fill="#eaf0f3"/><rect x="19" y="27" width="26" height="26" rx="3" fill="#7bd88f"/><path fill="#f5c542" d="M35 29 25 42h6l-2 9 10-13h-6z"/></svg>
    </template>

    <template #title>
      {{ item.name }}
    </template>

    <template #status>
      <template v-if="online && soc !== null">
        <span>{{ soc }}%</span>
        <span v-if="runtime" class="opacity-70">· {{ runtime }}</span>
      </template>
      <span v-else>Немає зв'язку</span>
    </template>

    <template #action>
    </template>

    <template #extended>
      <div v-if="soc !== null" class="rounded-[22px] bg-[color:var(--group)] p-4">
        <div class="flex items-end justify-between gap-3">
          <span class="text-[44px] font-light leading-none tracking-tight">{{ soc }}<span class="text-2xl text-[color:var(--ink-2)]">%</span></span>
          <span class="text-[13px] text-[color:var(--ink-2)]">{{ kwh(stored) }} з {{ kwh(p.capacity) }}</span>
        </div>
        <div class="mt-3 h-3 overflow-hidden rounded-full bg-white/10">
          <div class="h-full rounded-full transition-all duration-500"
               :style="{width: `${Math.min(100, Math.max(0, soc))}%`, background: `rgb(${level})`}"></div>
        </div>
        <p class="mt-2 text-[13px] text-[color:var(--ink-3)]">Батарея зупиняється на {{ RESERVE }}%, щоб берегти елементи.</p>
      </div>

      <Section name="Зараз">
        <List>
          <Item label="Резервна розетка">
            <span>{{ p.offgridPower ?? '—' }} Вт</span>
          </Item>
          <Item label="Вистачить">
            <span>{{ runtime ?? '—' }}</span>
          </Item>
          <Item label="Мережевий порт">
            <span>{{ flow ?? '—' }}</span>
          </Item>
          <Item label="Режим">
            <span>{{ p.mode ?? '—' }}</span>
          </Item>
        </List>
      </Section>

      <Section name="Енергія за весь час">
        <List>
          <Item label="Взято з мережі">
            <span>{{ kwh(p.gridInputEnergy) }}</span>
          </Item>
          <Item label="Віддано в мережу">
            <span>{{ kwh(p.gridOutputEnergy) }}</span>
          </Item>
        </List>
      </Section>

      <Section name="Пристрій">
        <List>
          <Item label="Зв'язок">
            <span :class="online ? '' : 'text-[#ff453a]'">{{ online ? 'на зв\'язку' : 'немає зв\'язку' }}</span>
          </Item>
          <Item label="Модель" v-if="p.hardware">
            <span>{{ p.hardware }}<template v-if="p.firmware"> · fw {{ p.firmware }}</template></span>
          </Item>
          <Item label="Wi-Fi">
            <span>{{ signal }}</span>
          </Item>
          <Item label="Оновлено" v-if="p.updatedAt">
            <LastUpdate :timestamp="p.updatedAt"></LastUpdate>
          </Item>
        </List>
      </Section>
    </template>
  </Device>
</template>

<style scoped>
</style>
