import './assets/main.css'

import {createApp} from 'vue'
import App from './App.vue'
import Weather from "./components/xiaomi/weather.vue";
import Humidifier from "./components/xiaomi/humidifier.vue";
import Magnet from "./components/xiaomi/magnet.vue";
import Motion from "./components/xiaomi/motion.vue";
import HVAC from "./components/cooper_hunter/hvac.vue";
import Thermostat from "./components/terneo/thermostat.vue";
import LGTV from "./components/lg/tv.vue";

const app = createApp(App);

app
    .component('zhimi.humidifier.ca1', Humidifier)
    .component('lumi.sensor_magnet.aq2', Magnet)
    .component('lumi.sensor_motion.aq2', Motion)
    .component('lumi.weather.v1', Weather)
    .component('cooper_hunter.nordic_evo_2', HVAC)
    .component('terneo', Thermostat)
    .component('lgtv', LGTV)
;

app.mount('#app')
