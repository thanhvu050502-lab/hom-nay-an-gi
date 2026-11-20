// Logic gợi ý theo Spec mục 4–5: lọc trước, rồi random có trọng số.
import { S } from './store.js';
import { SWEET, DEFAULT_FOOD, DEFAULT_DRINK, DEFAULT_COMBO, groupOf, mealNow, FORM } from './catalog.js';

export const G = { pos: null, posAt: 0, posErr: null };

export const prefs = () => (S.profile && S.profile.prefs) || {};
export const foodBands = () => prefs().food || DEFAULT_FOOD;
export const drinkBands = () => prefs().drink || DEFAULT_DRINK;
export const comboRules = () => prefs().combo || DEFAULT_COMBO;
export const me = () => (S.user ? S.user.id : null);
export const tagsOf = p => p.tags || {};
export const formOf = p => tagsOf(p).form || '';
export const isSweet = p => SWEET.includes(formOf(p));
export const ready = p => p.status === 'active' && !!formOf(p);

export function myRating(p){ return S.place_ratings.find(r => r.place_id === p.id && r.user_id === me()) || null; }
export function groupScore(p){ const r = S.place_ratings.filter(x => x.place_id === p.id && x.stars); if (!r.length) return null; return { avg: r.reduce((a, b) => a + +b.stars, 0) / r.length, n: r.length }; }
export function myScore(p){ const r = myRating(p); return r && r.stars ? +r.stars : null; }
export function again(p){ const r = myRating(p); return r ? r.again : null; }
export function bannedByAnyone(p){ return S.place_ratings.some(x => x.place_id === p.id && x.again === 'no'); }
export function myMeals(p){ return S.meals.filter(m => m.place_id === p.id && m.created_by === me()); }
export function mealCount(p){ return S.meals.filter(m => m.place_id === p.id).filter(m => m.created_by === me() || (m.with_users || []).includes(me())).length; }
export function visits(p){ const n = mealCount(p); return n || ((p.tags || {}).visited ? 1 : 0); }
export function lastVisit(p){ let t = 0; S.meals.forEach(m => { if (m.place_id === p.id && (m.created_by === me() || (m.with_users || []).includes(me()))) t = Math.max(t, +new Date(m.at)); }); return t || null; }
export function daysSince(p){ const t = lastVisit(p); return t ? Math.floor((Date.now() - t) / 864e5) : null; }

export function km(a, b, c, d){ const R = 6371, r = x => x * Math.PI / 180; const dl = r(c - a), dg = r(d - b); const h = Math.sin(dl / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(dg / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); }
export function dist(p, from){ const o = from || G.pos; if (!o || p.lat == null || p.lng == null) return null; return km(o.lat, o.lng, p.lat, p.lng); }
export function distTxt(d){ if (d == null) return ''; return d < 1 ? Math.round(d * 1000 / 50) * 50 + ' m' : (Math.round(d * 10) / 10).toString().replace('.', ',') + ' km'; }

function mins(t){ if (!t) return null; const a = String(t).split(':'); return +a[0] * 60 + +(a[1] || 0); }
export function openNow(p, at = new Date()){
  const o = mins(p.open_time), c = mins(p.close_time); if (o == null || c == null) return null;
  const m = at.getHours() * 60 + at.getMinutes();
  return c <= o ? (m >= o || m < c) : (m >= o && m < c);
}

export function priceTxt(p){
  if (p.pmin == null) return '';
  const bands = isSweet(p) ? drinkBands() : foodBands();
  for (const b of bands) if (b[0] === p.pmin && b[1] === p.pmax) return b[0] === 0 ? 'Dưới ' + b[1] + 'k' : b[1] >= 9999 ? 'Trên ' + b[0] + 'k' : b[0] + '–' + b[1] + 'k';
  return p.pmin + '–' + (p.pmax >= 9999 ? '' : p.pmax) + 'k';
}

export function defaultFilters(){ return { wheel:[], mood:null, price:null, priceMin:null, priceMax:null, cuisine:[], type:[], group:[], forms:[], who:null, area:null, radius:null, open:true, plan:false, meal:true, occasion:[], weather:[] }; }

// ignore: các khóa bộ lọc cần bỏ qua (để đếm "bỏ cái này còn bao nhiêu quán")
export function matches(p, f, ignore = {}, opts = {}){
  if (!ready(p)) return false;
  if (opts.bannedAll ? bannedByAnyone(p) : again(p) === 'no') return false;
  const t = tagsOf(p);
  if (f.mood && !ignore.mood){
    if (f.mood === 'Khám phá'){ if (visits(p) && !p.wish) return false; }
    else if (!(t.mood || []).includes(f.mood)) return false;
  }
  if (!ignore.price){
    let lo = null, hi = null;
    if (f.price != null){ const b = foodBands()[f.price]; if (b){ lo = b[0]; hi = b[1]; } }
    if (f.priceMin != null){ lo = f.priceMin; hi = f.priceMax; }
    if (lo != null){ if (isSweet(p)) { /* đồ uống dùng thang riêng: không loại */ } else if (p.pmin == null || p.pmin >= hi || p.pmax <= lo) return false; }
  }
  if (f.cuisine.length && !ignore.cuisine && !f.cuisine.includes(t.cuisine)) return false;
  if (f.type.length && !ignore.type && !f.type.includes(t.type)) return false;
  if (f.group.length && !ignore.group && !f.group.includes(groupOf(t.form))) return false;
  if (f.forms && f.forms.length && !ignore.forms && !f.forms.includes(t.form)) return false;
  if (f.who && !ignore.who){ const w = t.who || []; if (w.length && !w.includes(f.who)) return false; }
  if (f.area && !ignore.area && (p.address || '').toLowerCase().indexOf(f.area.toLowerCase()) < 0 && (t.area || '') !== f.area) return false;
  if (f.radius && !ignore.radius && G.pos){ const d = dist(p); if (d != null && d > f.radius) return false; }
  if (f.open && !f.plan && !ignore.open && openNow(p) === false) return false;
  if (f.meal && !ignore.meal){ const ms = t.meal || []; if (ms.length && !ms.includes(mealNow())) return false; }
  if (f.occasion.length && !ignore.occasion && !(t.occasion || []).some(x => f.occasion.includes(x))) return false;
  if (f.weather.length && !ignore.weather && !(t.weather || []).some(x => f.weather.includes(x))) return false;
  return true;
}
export const candidates = (f, ignore, opts) => S.places.filter(p => matches(p, f, ignore, opts));

export function weight(p, f, opts = {}){
  let s = opts.scoreOf ? opts.scoreOf(p) : myScore(p);
  if (s == null){ const g = groupScore(p); s = g ? g.avg : (p.g_rating ? Math.max(2.5, Math.min(5, +p.g_rating)) : 3.5); }
  let w = s / 3;
  const d = daysSince(p);
  w *= d == null ? 1.5 : d < 7 ? 0.2 : Math.min(1.5, 0.5 + d / 30);
  const km_ = dist(p);
  if (km_ != null){ const R = (f && f.radius) || 5; w *= Math.max(0.5, 1 - 0.5 * Math.min(1, km_ / R)); } else w *= 0.75;
  const fav = again(p) === 'yes';
  if (f && f.mood === 'Khám phá'){ if (fav) w *= 0.7; if (!visits(p)) w *= 1.5; if (p.wish) w *= 1.5; }
  else if (fav) w *= 1.3;
  return w;
}
export function pick(list, f, skip = [], opts){
  list = list.filter(p => !skip.includes(p.id)); if (!list.length) return null;
  const ws = list.map(p => weight(p, f, opts)); const tot = ws.reduce((a, b) => a + b, 0);
  let r = Math.random() * tot; for (let i = 0; i < list.length; i++){ r -= ws[i]; if (r <= 0) return list[i]; }
  return list[list.length - 1];
}
export function pickN(list, f, n, skip = []){ const out = []; const s = [...skip]; for (let i = 0; i < n; i++){ const p = pick(list, f, s); if (!p) break; out.push(p); s.push(p.id); } return out; }

export function formsOf(list){ const m = {}; list.forEach(p => { m[formOf(p)] = 1; }); return Object.keys(m).sort((a, b) => FORM.indexOf(a) - FORM.indexOf(b)); }

export function regulars(f){
  const now = new Date();
  const list = S.places.filter(p => ready(p) && again(p) === 'yes' && openNow(p, now) !== false);
  return list.sort((a, b) => (myScore(b) || 0) - (myScore(a) || 0)).slice(0, 3);
}

// Ghép combo: quán chặng hai trong ~2 km quanh quán ăn, cộng điểm theo bảng ghép.
export function comboFor(main){
  if (isSweet(main)) return [];
  const t = tagsOf(main);
  let next = [];
  for (const r of comboRules()){
    const w = r.when || {};
    if ((w.form || []).includes(t.form) || (w.cuisine || []).includes(t.cuisine) || (w.type || []).includes(t.type)) next = next.concat(r.next || []);
  }
  const pool = S.places.filter(p => p.id !== main.id && ready(p) && again(p) !== 'no' && (isSweet(p) || next.includes(formOf(p))) && openNow(p) !== false);
  const scored = pool.map(p => {
    let s = weight(p, null);
    if (next.includes(formOf(p))) s *= 2;
    const d = main.lat != null && p.lat != null ? km(main.lat, main.lng, p.lat, p.lng) : null;
    if (d != null){ if (d > 2.5) s *= 0.15; else s *= 1.4 - d / 4; }
    if (again(p) === 'yes') s *= 1.3;
    return { p, s, d };
  }).sort((a, b) => b.s - a.s);
  return scored;
}

// Điểm món: của tôi và trung bình nhóm
export function dishStats(d){
  const all = S.dish_ratings.filter(r => r.dish_id === d.id && r.stars);
  const mine = all.filter(r => r.user_id === me());
  const avg = a => a.length ? a.reduce((x, y) => x + y.stars, 0) / a.length : null;
  return { my: avg(mine), grp: avg(all), times: mine.length, n: all.length };
}
export function dishesOf(p){ return S.dishes.filter(d => d.place_id === p.id && !d.gone); }
export function goodDishes(p){
  return dishesOf(p).map(d => ({ d, st: dishStats(d) })).filter(x => (x.st.my != null ? x.st.my : x.st.grp) >= 4)
    .sort((a, b) => ((b.st.my ?? b.st.grp) - (a.st.my ?? a.st.grp)));
}

export function areasList(){ const m = {}; S.places.forEach(p => { const a = tagsOf(p).area; if (a) m[a] = 1; }); return Object.keys(m).sort((a, b) => a.localeCompare(b, 'vi')); }

export function locate(force){
  return new Promise(res => {
    if (!navigator.geolocation){ G.posErr = 'unsupported'; return res(null); }
    if (!force && G.pos && Date.now() - G.posAt < 5 * 60e3) return res(G.pos);
    navigator.geolocation.getCurrentPosition(
      pos => { G.pos = { lat:pos.coords.latitude, lng:pos.coords.longitude }; G.posAt = Date.now(); G.posErr = null; try { localStorage.setItem('hnag2-pos', JSON.stringify(G.pos)); } catch (e) {} res(G.pos); },
      err => { G.posErr = err.code === 1 ? 'denied' : 'fail'; res(null); },
      { enableHighAccuracy:false, timeout:8000, maximumAge:300000 }
    );
  });
}
try { const p = JSON.parse(localStorage.getItem('hnag2-pos') || 'null'); if (p) G.pos = p; } catch (e) {}

// Thời tiết hiện tại (Open-Meteo, miễn phí, không cần khóa)
export const W = { now:null, at:0 };
export async function weatherNow(){
  if (W.now && Date.now() - W.at < 30 * 60e3) return W.now;
  const o = G.pos || { lat:10.7769, lng:106.7009 };
  try {
    const r = await fetch('https://api.open-meteo.com/v1/forecast?latitude=' + o.lat + '&longitude=' + o.lng + '&current=temperature_2m,precipitation,weather_code&timezone=auto');
    const j = await r.json(); const c = j.current || {};
    const rain = (c.precipitation || 0) > 0.1 || [51,53,55,61,63,65,80,81,82,95,96,99].includes(c.weather_code);
    W.now = { temp: Math.round(c.temperature_2m), rain, hot: c.temperature_2m >= 33 }; W.at = Date.now();
  } catch (e) { W.now = null; }
  return W.now;
}

export function norm(x){ return String(x || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim(); }
// Quán hợp với một ô trên vòng quay: loại món thì theo tag, món cụ thể thì theo tên quán, menu, ghi chú
export function pickPlaces(pick, list){
  if (FORM.includes(pick)) return list.filter(p => formOf(p) === pick);
  const k = norm(pick); if (!k) return [];
  return list.filter(p => norm([p.name, p.note, formOf(p), ...dishesOf(p).map(d => d.name)].join(' ')).includes(k));
}
export function gStars(p){ return p.g_rating ? '★ ' + String(Math.round(p.g_rating * 10) / 10).replace('.', ',') + (p.g_count ? ' (' + (p.g_count >= 1000 ? (Math.round(p.g_count / 100) / 10).toString().replace('.', ',') + 'k' : p.g_count) + ')' : '') : ''; }
