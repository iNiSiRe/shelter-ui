<script setup>

import List from "../../properties/List.vue";
import Item from "../../properties/Item.vue";
import Section from "../../properties/Section.vue";
import LastUpdate from "../../properties/LastUpdate.vue";

defineProps({
  battery: Object
})

</script>

<template>
  <Section name="Батарейка">
    <List>
      <Item label="Напруга">
        <span>{{ battery.voltage }} В</span>
      </item>
      <Item label="Оновлено">
        <LastUpdate :timestamp="battery.updatedAt"></LastUpdate>
      </item>
    </List>
  </Section>
</template>

<style scoped>

</style>