// Дім: один дизайн для заблокованого і домашнього екрана.
const API = "http://192.168.0.197:8080/api/v1/devices";
const PULT = "http://192.168.0.197/";
const RESERVE = 12;
const WHITE = Color.white();
const hex = (h, a = 1) => new Color(h, a);

// Кнопка ▶ у застосунку запускає скрипт поза віджетом: показуємо домашній варіант.
const family = config.widgetFamily || "medium";
const isLock = family === "accessoryRectangular";
const isSmall = family === "small";
// Другий віджет на заблокованому екрані: той самий скрипт, у полі Parameter будь-який текст.
const isRight = isLock && Boolean(args.widgetParameter);
const screenSize = Device.screenSize();
const phone = Math.min(screenSize.width, screenSize.height);
const L = isLock
  ? {width: 172, cell: 10, gap: 2.5, rise: 3, title: 13, symbol: 12, time: 11, soc: 25, unit: 14, note: 13}
  : {width: Math.round(phone * (isSmall ? 0.32 : 0.77)), cell: 14, gap: 4, rise: 7,
    title: 15, symbol: 15, time: 12, soc: 36, unit: 19, note: 13.5};

function clock(ms) {
  const d = new Date(ms);
  const pad = (n) => String(n).padStart(2, "0");
  return pad(d.getHours()) + ":" + pad(d.getMinutes());
}

function runtime(b) {
  if (!(b.capacity && b.offgridPower)) return "";
  const hours = b.capacity * Math.max(0, b.soc - RESERVE) / 100 / b.offgridPower;
  if (hours >= 48) return "≈ " + Math.round(hours / 24) + " дн";
  if (hours >= 1) return "≈ " + Math.round(hours) + " год";
  return "≈ " + Math.round(hours * 60) + " хв";
}

function deg(p, key) {
  const n = p && p.available !== false ? parseFloat(p[key]) : NaN;
  return Number.isFinite(n) ? Math.round(n) + "°" : "—";
}

// Останнє відоме значення: у відключення датчики мовчать, а тепло в домі міняється повільно.
function reading(p, key) {
  const n = p ? parseFloat(p[key]) : NaN;
  if (!Number.isFinite(n)) return {text: "—", staleSince: null};
  return {text: Math.round(n) + "°", staleSince: p.available === false ? p.updatedAt : null};
}

function mainsState(guard) {
  const m = guard && guard.mains;
  if (!m) return {icon: "questionmark", title: "Світло: ?", tint: WHITE};
  if (m.state === "on") return {icon: "bolt.fill", title: "Світло є", tint: hex("#30d158")};
  return {icon: "bolt.slash.fill", title: "Немає з " + clock(m.since), tint: hex("#ff9f0a")};
}

async function readState() {
  const req = new Request(API);
  req.timeoutInterval = 10;
  const {data} = await req.loadJSON();
  const props = (id) => {
    const d = data.find((x) => x.id === id);
    return d ? d.properties : null;
  };
  const s = mainsState(props("guard"));
  s.temps = [
    deg(props("cooper_hunter_kitchen"), "indoorTemperature"),
    deg(props("cooper_hunter_bedroom"), "indoorTemperature"),
    deg(props("weather_outdoor"), "temperature"),
  ];
  s.readings = [
    reading(props("cooper_hunter_kitchen"), "indoorTemperature"),
    reading(props("cooper_hunter_bedroom"), "indoorTemperature"),
    reading(props("weather_outdoor"), "temperature"),
  ];
  const b = props("marstek_venus");
  if (!(b && b.available === true && b.soc != null)) {
    s.time = clock(Date.now());
    s.soc = null;
    s.note = "немає зв'язку";
    return s;
  }
  s.time = b.updatedAt ? clock(b.updatedAt) : "";
  s.soc = b.soc;
  s.note = b.ongridPower < 0 ? "заряджається" : runtime(b);
  if (!isLock && !isSmall) {
    const kwh = (b.capacity * b.soc / 100000).toFixed(1).replace(".", ",") + " кВт·год";
    s.note = s.note ? s.note + " · " + kwh : kwh;
  }
  return s;
}

async function loadState() {
  try {
    return await readState();
  } catch (e) {
    const none = {text: "—", staleSince: null};
    return {icon: "wifi.slash", title: "Немає зв'язку", tint: WHITE, note: "", failed: true,
      time: clock(Date.now()), soc: null, temps: ["—", "—", "—"], readings: [none, none, none]};
  }
}

function label(stack, value, font, opacity) {
  const t = stack.addText(value);
  t.font = font;
  t.textColor = WHITE;
  t.textOpacity = opacity;
  t.lineLimit = 1;
  t.minimumScaleFactor = 0.7;
}

function cells(stack, soc) {
  const c = new DrawContext();
  c.size = new Size(L.width, L.cell);
  c.opaque = false;
  c.respectScreenScale = true;
  const width = (L.width - 9 * L.gap) / 10;
  const lit = soc > 0 ? Math.max(1, Math.round(soc / 10)) : 0;
  const level = isLock ? WHITE : hex(soc >= 50 ? "#30d158" : soc >= 20 ? "#ff9f0a" : "#ff453a");
  const empty = hex("#ffffff", isLock ? 0.24 : 0.13);
  for (let i = 0; i < 10; i++) {
    const p = new Path();
    p.addRoundedRect(new Rect(i * (width + L.gap), 0, width, L.cell), L.gap, L.gap);
    c.addPath(p);
    c.setFillColor(i < lit ? level : empty);
    c.fillPath();
  }
  const image = stack.addImage(c.getImage());
  // На заблокованому екрані ширину дає сам віджет, вона залежить від телефона.
  if (!isLock) image.imageSize = new Size(L.width, L.cell);
}

function rooms(root, temps) {
  const row = root.addStack();
  row.layoutHorizontally();
  ["Кухня", "Спальня", "Надворі"].forEach((name, i) => {
    if (i > 0) row.addSpacer();
    const item = row.addStack();
    item.layoutHorizontally();
    item.centerAlignContent();
    item.spacing = 4;
    label(item, name, Font.mediumSystemFont(12), 0.62);
    label(item, temps[i], Font.semiboldRoundedSystemFont(14), 1);
  });
}

function newWidget() {
  const w = new ListWidget();
  w.url = PULT;
  w.refreshAfterDate = new Date(Date.now() + 300000);
  return w;
}

function header(root, s) {
  const top = root.addStack();
  top.layoutHorizontally();
  top.centerAlignContent();
  top.spacing = isLock ? 4 : 5;
  const sym = SFSymbol.named(s.icon);
  sym.applyFont(Font.semiboldSystemFont(L.symbol));
  const icon = top.addImage(sym.image);
  icon.imageSize = new Size(L.symbol, L.symbol);
  icon.tintColor = isLock ? WHITE : s.tint;
  label(top, s.title, Font.semiboldSystemFont(L.title), 1);
  top.addSpacer();
  label(top, s.time, Font.mediumSystemFont(L.time), 0.65);
}

function build(s) {
  const w = newWidget();
  if (isLock) {
    w.setPadding(0, 0, 0, 0);
  } else {
    const g = new LinearGradient();
    g.colors = [hex("#1c2a4a"), hex("#11162a"), hex("#0a0c16")];
    g.locations = [0, 0.6, 1];
    g.startPoint = new Point(0, 0);
    g.endPoint = new Point(1, 1);
    w.backgroundGradient = g;
  }
  const root = w.addStack();
  root.layoutVertically();
  if (!isLock) root.size = new Size(L.width, 0);
  root.spacing = L.rise;

  header(root, s);

  const mid = root.addStack();
  mid.layoutHorizontally();
  mid.bottomAlignContent();
  const has = s.soc !== null;
  label(mid, has ? String(s.soc) : "—", Font.boldRoundedSystemFont(L.soc), 1);
  if (has) label(mid, "%", Font.semiboldRoundedSystemFont(L.unit), 0.85);
  mid.addSpacer();
  label(mid, s.note, Font.mediumSystemFont(L.note), 0.85);

  cells(root, s.soc);
  if (!isLock && !isSmall) rooms(root, s.temps);
  return w;
}

// Те саме розташування, що в лівому віджеті: великі числа на рівні відсотків, підписи на рівні комірок.
function buildRight(s) {
  const w = newWidget();
  w.setPadding(0, 0, 0, 0);
  const root = w.addStack();
  root.layoutVertically();
  root.spacing = L.rise;
  const stale = s.readings.map((r) => r.staleSince).filter(Boolean);
  const time = stale.length ? "до " + clock(Math.max(...stale)) : "";
  header(root, s.failed ? s : {icon: "thermometer.medium", title: "Температура", tint: WHITE, time});
  const row = root.addStack();
  row.layoutHorizontally();
  ["Кухня", "Спальня", "Надворі"].forEach((name, i) => {
    if (i > 0) row.addSpacer();
    const col = row.addStack();
    col.layoutVertically();
    const r = s.readings[i];
    label(col, r.text, Font.boldRoundedSystemFont(L.soc), r.staleSince ? 0.55 : 1);
    label(col, name, Font.mediumSystemFont(L.time), 0.65);
  });
  return w;
}

// Для круглого і рядкового віджетів місця вистачає лише на відсотки.
function tiny(s) {
  const w = newWidget();
  const t = w.addText(s.soc === null ? "—" : s.soc + "%");
  t.font = Font.boldRoundedSystemFont(16);
  t.minimumScaleFactor = 0.7;
  return w;
}

const state = await loadState();
const widget = isRight ? buildRight(state)
  : family.startsWith("accessory") && !isLock ? tiny(state) : build(state);
if (config.runsInApp) await widget.presentMedium();
Script.setWidget(widget);
Script.complete();
