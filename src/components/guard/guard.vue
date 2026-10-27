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

  const MODES = {off: 'Off', observe: 'Observing', on: 'On'};

  const p = computed(() => props.device.properties);
  const away = computed(() => p.value.presence === 'away');
  const phones = computed(() => p.value.phones ?? []);
  const onWifi = computed(() => phones.value.filter(phone => phone.onWifi).length);
</script>

<template>
  <Device accent="emerald" :active="away">
    <template #icon>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path fill="#3762cc" d="M32 4 8 13v17c0 15.4 10.2 26.6 24 30 13.8-3.4 24-14.6 24-30V13z"/><path fill="#4671c6" d="M32 4v56c13.8-3.4 24-14.6 24-30V13z"/><path fill="#eaf0f3" d="M21 34.5V45a1.5 1.5 0 0 0 1.5 1.5h19A1.5 1.5 0 0 0 43 45V34.5L32 25z"/><path fill="#a4c9ff" d="M17.4 34.6 32 21.9l14.6 12.7-2.1 2.4L32 26.1 19.5 37z"/><path fill="#6bdddd" d="M28.5 46.5V39h7v7.5z"/></svg>
    </template>

    <template #title>
      {{ item.name }}
    </template>

    <template #status>
      <span v-if="p.presence" class="pill" :class="away ? 'pill-accent' : 'pill-muted'">
        <span class="pill-dot"></span>{{ away ? 'Away' : 'Home' }}
      </span>
      <span v-else class="pill pill-muted">Presence off</span>
      <span v-if="phones.length">{{ onWifi }}/{{ phones.length }} phones on Wi-Fi</span>
      <span v-if="p.mains?.state === 'off'" class="text-amber-300">no mains power</span>
    </template>

    <template #action>
    </template>

    <template #extended>
      <Section name="Presence">
        <List>
          <Item label="State">
            <span>{{ p.presence ? (away ? 'Away' : 'Home') : '—' }}</span>
          </Item>
          <Item label="Since" v-if="p.presence">
            <LastUpdate :timestamp="p.presenceSince"></LastUpdate>
          </Item>
          <Item label="Mode">
            <span>{{ MODES[p.automations?.presence] ?? '—' }}</span>
          </Item>
          <Item label="Router" v-if="p.presence">
            <span :class="p.network ? '' : 'text-rose-400'">{{ p.network ? 'answers' : 'no answer' }}</span>
          </Item>
        </List>
      </Section>

      <Section name="Phones" v-if="phones.length">
        <List>
          <Item v-for="phone in phones" :key="phone.name" :label="phone.name">
            <div class="flex flex-col items-end gap-0.5">
              <span class="pill" :class="phone.onWifi ? 'pill-accent' : 'pill-muted'">
                <span class="pill-dot"></span>{{ phone.onWifi === null ? 'not seen yet' : (phone.onWifi ? 'on Wi-Fi' : 'off Wi-Fi') }}
              </span>
              <span v-if="phone.since" class="text-xs font-normal text-zinc-500">
                <LastUpdate :timestamp="phone.since"></LastUpdate>
              </span>
              <span v-if="phone.leftGeofenceAt" class="text-xs font-normal text-zinc-500">
                left the area <LastUpdate :timestamp="phone.leftGeofenceAt"></LastUpdate>
              </span>
            </div>
          </Item>
        </List>
      </Section>

      <Section name="Power" v-if="p.mains || p.battery">
        <List>
          <Item label="Mains" v-if="p.mains">
            <span class="pill" :class="p.mains.state === 'on' ? 'pill-accent' : 'pill-muted'">
              <span class="pill-dot"></span>{{ p.mains.state === 'on' ? 'on' : 'off' }}
            </span>
          </Item>
          <Item label="Since" v-if="p.mains">
            <LastUpdate :timestamp="p.mains.since"></LastUpdate>
          </Item>
          <Item label="Battery" v-if="p.battery">
            <span>{{ p.battery.soc ?? '—' }}%<template v-if="p.battery.load !== null"> · {{ p.battery.load }} W</template></span>
          </Item>
        </List>
      </Section>

      <Section name="Sensors">
        <List>
          <Item label="Last motion">
            <LastUpdate v-if="p.motionAt" :timestamp="p.motionAt"></LastUpdate>
            <span v-else>—</span>
          </Item>
          <Item label="Door">
            <span v-if="!p.door" class="text-zinc-500">sensor not connected</span>
            <span v-else>{{ p.door.open === null ? '—' : (p.door.open ? 'open' : 'closed') }}</span>
          </Item>
          <Item label="Last closed" v-if="p.door?.lastClose">
            <LastUpdate :timestamp="p.door.lastClose"></LastUpdate>
          </Item>
        </List>
      </Section>

      <Section name="Automations">
        <List>
          <Item label="Frost protection">
            <span>{{ MODES[p.automations?.frost] ?? '—' }}<template v-if="p.frost?.active"> · heating on</template></span>
          </Item>
          <Item label="Coldest room" v-if="p.frost?.coldest !== null && p.frost?.coldest !== undefined">
            <span>{{ p.frost.coldest }}°</span>
          </Item>
          <Item label="Night AC round">
            <span>{{ MODES[p.automations?.nightAc] ?? '—' }}</span>
          </Item>
          <Item label="Last run" v-if="p.nightDone">
            <span>{{ p.nightDone }}</span>
          </Item>
          <Item label="Power journal">
            <span>{{ MODES[p.automations?.power] ?? '—' }}</span>
          </Item>
          <Item label="Leak & battery alerts">
            <span>{{ MODES[p.automations?.sensors] ?? '—' }}</span>
          </Item>
          <Item label="Siren on a leak">
            <span>{{ MODES[p.automations?.leakSiren] ?? '—' }}</span>
          </Item>
        </List>
      </Section>
    </template>
  </Device>
</template>

<style scoped>
</style>
