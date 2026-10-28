// The room's air as the Dyson measures it, graded on the Dyson app's own scale: good, fair, poor,
// and very poor above the last limit.
export type AirLevel = {word: string, rgb: string};

export const AIR_LEVELS: AirLevel[] = [
    {word: 'добре', rgb: '48 209 88'},
    {word: 'помірно', rgb: '255 214 10'},
    {word: 'погано', rgb: '255 159 10'},
    {word: 'дуже погано', rgb: '255 69 58'},
];

const METRICS = [
    {key: 'pm25', label: 'PM2.5', unit: 'мкг/м³', limits: [35, 53, 70]},
    {key: 'pm10', label: 'PM10', unit: 'мкг/м³', limits: [50, 75, 100]},
    {key: 'voc', label: 'Леткі органічні', unit: 'індекс', limits: [3, 6, 8]},
    {key: 'no2', label: 'NO₂', unit: 'індекс', limits: [3, 6, 8]},
    {key: 'hcho', label: 'Формальдегід', unit: 'мг/м³', limits: [0.099, 0.299, 0.499]},
];

export type AirMetric = {key: string, label: string, unit: string, value: number, level: AirLevel};

// The readings there are, each with its grade.
export function airMetrics(properties: {[key: string]: any}): AirMetric[] {
    return METRICS
        .filter(metric => typeof properties[metric.key] === 'number')
        .map(metric => {
            const value: number = properties[metric.key];
            return {...metric, value, level: AIR_LEVELS[metric.limits.filter(limit => value > limit).length]};
        });
}

// Outdoors by the European AQI that Open-Meteo's air-quality forecast gives.
const OUTDOOR_LEVELS: Array<[number, AirLevel]> = [
    [20, {word: 'добре', rgb: '48 209 88'}],
    [40, {word: 'задовільно', rgb: '163 230 53'}],
    [60, {word: 'помірно', rgb: '255 214 10'}],
    [80, {word: 'погано', rgb: '255 159 10'}],
    [100, {word: 'дуже погано', rgb: '255 69 58'}],
    [Infinity, {word: 'надзвичайно погано', rgb: '191 90 242'}],
];

export function outdoorAirLevel(aqi: number): AirLevel {
    return OUTDOOR_LEVELS.find(([limit]) => aqi < limit)![1];
}

// The air as good as its worst reading; null without any.
export function airLevel(properties: {[key: string]: any}): AirLevel | null {
    const metrics = airMetrics(properties);
    return metrics.length === 0 ? null
        : AIR_LEVELS[Math.max(...metrics.map(metric => AIR_LEVELS.indexOf(metric.level)))];
}
