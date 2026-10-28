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

  const MODES = {off: 'Вимкнено', observe: 'Спостереження', on: 'Увімкнено'};

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
      <span v-if="p.presence">{{ away ? 'Нікого вдома' : 'Вдома' }}</span>
      <span v-else>Присутність вимкнена</span>
      <span v-if="phones.length" class="opacity-70">· {{ onWifi }}/{{ phones.length }} у Wi-Fi</span>
      <span v-if="p.mains?.state === 'off'">· світла немає</span>
    </template>

    <template #action>
    </template>

    <template #extended>
      <Section name="Присутність">
        <List>
          <Item label="Стан">
            <span>{{ p.presence ? (away ? 'Нікого вдома' : 'Вдома') : '—' }}</span>
          </Item>
          <Item label="Змінився" v-if="p.presence">
            <LastUpdate :timestamp="p.presenceSince"></LastUpdate>
          </Item>
          <Item label="Режим">
            <span>{{ MODES[p.automations?.presence] ?? '—' }}</span>
          </Item>
          <Item label="Роутер" v-if="p.presence">
            <span :class="p.network ? '' : 'text-[#ff453a]'">{{ p.network ? 'відповідає' : 'не відповідає' }}</span>
          </Item>
        </List>
      </Section>

      <Section name="Телефони" v-if="phones.length">
        <List>
          <Item v-for="phone in phones" :key="phone.name" :label="phone.name">
            <div class="flex flex-col items-end gap-0.5">
              <span class="pill" :class="phone.onWifi ? 'pill-accent' : 'pill-muted'">
                <span class="pill-dot"></span>{{ phone.onWifi === null ? 'ще не бачив' : (phone.onWifi ? 'у Wi-Fi' : 'не в Wi-Fi') }}
              </span>
              <span v-if="phone.since" class="text-xs text-[color:var(--ink-3)]">
                <LastUpdate :timestamp="phone.since"></LastUpdate>
              </span>
              <span v-if="phone.leftGeofenceAt" class="text-xs text-[color:var(--ink-3)]">
                вийшов із зони <LastUpdate :timestamp="phone.leftGeofenceAt"></LastUpdate>
              </span>
            </div>
          </Item>
        </List>
      </Section>

      <Section name="Світло" v-if="p.mains || p.battery">
        <List>
          <Item label="Мережа" v-if="p.mains">
            <span class="pill" :class="p.mains.state === 'on' ? 'pill-accent' : 'pill-muted'">
              <span class="pill-dot"></span>{{ p.mains.state === 'on' ? 'є' : 'немає' }}
            </span>
          </Item>
          <Item label="Змінилось" v-if="p.mains">
            <LastUpdate :timestamp="p.mains.since"></LastUpdate>
          </Item>
          <Item label="Батарея" v-if="p.battery">
            <span>{{ p.battery.soc ?? '—' }}%<template v-if="p.battery.load !== null"> · {{ p.battery.load }} Вт</template></span>
          </Item>
        </List>
      </Section>

      <Section name="Датчики">
        <List>
          <Item label="Останній рух">
            <LastUpdate v-if="p.motionAt" :timestamp="p.motionAt"></LastUpdate>
            <span v-else>—</span>
          </Item>
          <Item label="Двері">
            <span v-if="!p.door" class="text-[color:var(--ink-3)]">датчик не підключено</span>
            <span v-else>{{ p.door.open === null ? '—' : (p.door.open ? 'відчинено' : 'зачинено') }}</span>
          </Item>
          <Item label="Востаннє зачинили" v-if="p.door?.lastClose">
            <LastUpdate :timestamp="p.door.lastClose"></LastUpdate>
          </Item>
        </List>
      </Section>

      <Section name="Автоматизації">
        <List>
          <Item label="Захист від холоду">
            <span>{{ MODES[p.automations?.frost] ?? '—' }}<template v-if="p.frost?.active"> · гріє</template></span>
          </Item>
          <Item label="Найхолодніше" v-if="p.frost?.coldest !== null && p.frost?.coldest !== undefined">
            <span>{{ p.frost.coldest }}°</span>
          </Item>
          <Item label="Нічний кондиціонер">
            <span>{{ MODES[p.automations?.nightAc] ?? '—' }}</span>
          </Item>
          <Item label="Востаннє" v-if="p.nightDone">
            <span>{{ p.nightDone }}</span>
          </Item>
          <Item label="Журнал світла">
            <span>{{ MODES[p.automations?.power] ?? '—' }}</span>
          </Item>
          <Item label="Протікання й батарейки">
            <span>{{ MODES[p.automations?.sensors] ?? '—' }}</span>
          </Item>
          <Item label="Сирена при протіканні">
            <span>{{ MODES[p.automations?.leakSiren] ?? '—' }}</span>
          </Item>
          <Item label="Тепло до приходу">
            <span>{{ MODES[p.automations?.precondition] ?? '—' }}</span>
          </Item>
          <Item label="Автоматика Dyson">
            <span>{{ MODES[p.automations?.humidifier] ?? '—' }}</span>
          </Item>
          <Item label="Поради провітрити">
            <span>{{ MODES[p.automations?.ventilation] ?? '—' }}</span>
          </Item>
          <Item label="Резервна копія Pi">
            <span>{{ MODES[p.automations?.backup] ?? '—' }}<template v-if="p.backupDone"> · {{ p.backupDone.slice(8, 10) }}.{{ p.backupDone.slice(5, 7) }}</template></span>
          </Item>
        </List>
      </Section>
    </template>
  </Device>
</template>

<style scoped>
</style>
