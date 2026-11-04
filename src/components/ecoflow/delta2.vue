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

  const p = computed(() => props.device.properties);
  const online = computed(() => p.value.available === true);
  const soc = computed(() => p.value.soc ?? null);

  const flowing = computed(() => p.value.powerIn > 0 || p.value.powerOut > 0);

  const flow = computed(() => {
    if (p.value.powerIn > 0) {
      return `вхід ${p.value.powerIn} Вт`;
    }
    return p.value.powerOut > 0 ? `вихід ${p.value.powerOut} Вт` : null;
  });

  const duration = (minutes) => {
    if (minutes === null || minutes === undefined) {
      return '—';
    }
    const hours = Math.floor(minutes / 60);
    return hours > 0 ? `${hours} год ${minutes % 60} хв` : `${minutes} хв`;
  };

  const watts = (value) => value === null || value === undefined ? '—' : `${value} Вт`;
  const percent = (value) => value === null || value === undefined ? '—' : `${value}%`;
  const state = (value) => value === null || value === undefined ? '—' : value ? 'увімкнено' : 'вимкнено';

  const level = computed(() => soc.value >= 50 ? '163 230 53' : soc.value >= 20 ? '245 158 11' : '251 113 133');
</script>

<template>
  <Device accent="lime" :active="online && flowing">
    <template #icon>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="8" y="18" width="48" height="36" rx="6" fill="#3a3f47"/><path fill="#7b8088" d="M22 18v-5a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v5h-5v-3H27v3z"/><rect x="14" y="24" width="20" height="12" rx="2" fill="#7bd88f"/><circle cx="44" cy="30" r="5" fill="#eaf0f3"/><rect x="14" y="41" width="9" height="7" rx="2" fill="#eaf0f3"/><rect x="27" y="41" width="9" height="7" rx="2" fill="#eaf0f3"/><rect x="40" y="41" width="10" height="7" rx="2" fill="#eaf0f3"/></svg>
    </template>

    <template #title>
      {{ item.name }}
    </template>

    <template #status>
      <template v-if="online && soc !== null">
        <span>{{ soc }}%</span>
        <span v-if="flow" class="opacity-70">· {{ flow }}</span>
      </template>
      <span v-else>Немає зв'язку</span>
    </template>

    <template #action>
    </template>

    <template #extended>
      <div v-if="soc !== null" class="rounded-[22px] bg-[color:var(--group)] p-4">
        <span class="text-[44px] font-light leading-none tracking-tight">{{ soc }}<span class="text-2xl text-[color:var(--ink-2)]">%</span></span>
        <div class="mt-3 h-3 overflow-hidden rounded-full bg-white/10">
          <div class="h-full rounded-full transition-all duration-500"
               :style="{width: `${Math.min(100, Math.max(0, soc))}%`, background: `rgb(${level})`}"></div>
        </div>
      </div>

      <Section name="Зараз">
        <List>
          <Item label="Вхід">
            <span>{{ watts(p.powerIn) }}</span>
          </Item>
          <Item label="Вихід">
            <span>{{ watts(p.powerOut) }}</span>
          </Item>
          <Item label="До повного заряду" v-if="p.chargeRemain">
            <span>{{ duration(p.chargeRemain) }}</span>
          </Item>
          <Item label="Вистачить" v-if="p.dischargeRemain">
            <span>{{ duration(p.dischargeRemain) }}</span>
          </Item>
        </List>
      </Section>

      <Section name="Порти">
        <List>
          <Item label="Напруга мережі" v-if="p.acInVoltage">
            <span>{{ p.acInVoltage }} В</span>
          </Item>
          <Item label="Вхід AC">
            <span>{{ watts(p.acIn) }}</span>
          </Item>
          <Item label="Вихід AC">
            <span>{{ watts(p.acOut) }} · {{ state(p.acEnabled) }}</span>
          </Item>
          <Item label="12 В">
            <span>{{ watts(p.dcOut) }} · {{ state(p.dcEnabled) }}</span>
          </Item>
          <Item label="USB">
            <span>{{ watts(p.usbOut) }} · {{ state(p.usbEnabled) }}</span>
          </Item>
        </List>
      </Section>

      <Section name="Батарея">
        <List>
          <Item label="Заряджати до">
            <span>{{ percent(p.maxChargeSoc) }}</span>
          </Item>
          <Item label="Розряджати до">
            <span>{{ percent(p.minDischargeSoc) }}</span>
          </Item>
          <Item label="Температура">
            <span>{{ p.batteryTemperature ?? '—' }}°</span>
          </Item>
          <Item label="Стан батареї">
            <span>{{ percent(p.health) }}</span>
          </Item>
          <Item label="Цикли">
            <span>{{ p.cycles ?? '—' }}</span>
          </Item>
        </List>
      </Section>

      <Section name="Пристрій">
        <List>
          <Item label="Зв'язок">
            <span :class="online ? '' : 'text-[#ff453a]'">{{ online ? 'на зв\'язку' : 'немає зв\'язку' }}</span>
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
