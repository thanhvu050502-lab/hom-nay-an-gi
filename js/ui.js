// Tiện ích giao diện dùng chung
export const IC = {
  wheel:'<circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18"/>',
  list:'<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  fire:'<path d="M12 3c.5 3.5 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3.2 2-4 .2 1.5 1 2.3 2 2.5C10.5 8.5 11 5.5 12 3z"/>',
  people:'<circle cx="9" cy="9" r="3"/><circle cx="17" cy="10" r="2.5"/><path d="M3 19c0-3 2.7-5 6-5s6 2 6 5M15.5 14.2c2.6.2 4.5 1.9 4.5 4.3"/>',
  bowl:'<path d="M4 12h16a8 8 0 0 1-16 0zM9 8c0-1.5 1-1.5 1-3M14 8c0-1.5 1-1.5 1-3"/>',
  pin:'<path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  x:'<path d="M6 6l12 12M18 6L6 18"/>',
  back:'<path d="M15 5l-7 7 7 7"/>',
  next:'<path d="M9 5l7 7-7 7"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  filter:'<path d="M4 6h16M7 12h10M10 18h4"/>',
  sort:'<path d="M7 5v14M7 19l-3-3M7 19l3-3M17 19V5M17 5l-3 3M17 5l3 3"/>',
  cam:'<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  link:'<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  share:'<path d="M12 3v12M7 8l5-5 5 5M5 14v6h14v-6"/>',
  wifi:'<path d="M2 8.5a15 15 0 0 1 20 0M5 12a10 10 0 0 1 14 0M8.5 15.5a5 5 0 0 1 7 0M12 19h.01"/>',
  nowifi:'<path d="M2 8.5a15 15 0 0 1 20 0M5 12a10 10 0 0 1 14 0M8.5 15.5a5 5 0 0 1 7 0M12 19h.01M3 3l18 18"/>',
  star:'<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  gear:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  rain:'<path d="M7 15a4 4 0 1 1 .5-8A6 6 0 0 1 19 9a3.5 3.5 0 0 1-.5 7H7zM8 19l-1 2M12 19l-1 2M16 19l-1 2"/>'
};
export function ic(n, s = 20, w = 2){ return '<svg aria-hidden="true" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round">' + (IC[n] || '') + '</svg>'; }
export function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])); }
export function fmt(n){ return (Math.round(n * 10) / 10).toFixed(1).replace('.', ','); }
export function money(n){ return n == null || n === '' ? '' : Number(n).toLocaleString('vi-VN') + 'đ'; }
export function chip(t, on, act, val, extra = ''){ return '<button type="button" class="chip' + (on ? ' on' : '') + '" data-act="' + act + '" data-v="' + esc(val) + '" aria-pressed="' + !!on + '" ' + extra + '>' + t + '</button>'; }
export function when(t){
  const d = new Date(t), n = new Date();
  const hm = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
  const dd = Math.floor((new Date(n.getFullYear(), n.getMonth(), n.getDate()) - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 864e5);
  if (dd === 0) return 'Hôm nay ' + hm; if (dd === 1) return 'Hôm qua ' + hm; if (dd < 7) return dd + ' ngày trước';
  return d.getDate() + '/' + (d.getMonth() + 1) + (d.getFullYear() !== n.getFullYear() ? '/' + d.getFullYear() : '');
}
const BLOBS = ['42% 58% 55% 45%/48% 44% 56% 52%','55% 45% 48% 52%/44% 56% 44% 56%','46% 54% 58% 42%/52% 46% 54% 48%','38% 62% 54% 46%/52% 44% 56% 48%'];
export function blob(p, size = 56, i = 0){
  const photo = p && p.photos && p.photos[0];
  const r = BLOBS[i % BLOBS.length], lime = i % 2;
  if (photo) return '<div class="blob" style="width:' + size + 'px;height:' + size + 'px;border-radius:' + r + ';background-image:url(' + esc(photo) + ')" role="img" aria-label="Ảnh ' + esc(p.name) + '"></div>';
  return '<div class="blob' + (lime ? ' l' : '') + '" style="width:' + size + 'px;height:' + size + 'px;border-radius:' + r + '" aria-hidden="true">' + ic('bowl', Math.round(size * 0.42), 1.8) + '</div>';
}
export function stars(n, act, idx, label){
  let h = '<div class="stars" role="group" aria-label="Số sao cho ' + esc(label) + '">';
  for (let i = 1; i <= 5; i++){ const on = i <= n; h += '<button type="button" data-act="' + act + '" data-i="' + esc(idx) + '" data-n="' + i + '" aria-label="' + i + ' sao" aria-pressed="' + (i === n) + '"><svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="' + (on ? '#C6F24E' : 'none') + '" stroke="' + (on ? '#C6F24E' : '#6B6273') + '" stroke-width="1.8" stroke-linejoin="round"><path d="' + 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z' + '"/></svg></button>'; }
  return h + '</div>';
}
export function sheet(label, inner){ return '<div class="scrim" data-act="scrim"><div class="sheet" role="dialog" aria-modal="true" aria-label="' + esc(label) + '"><div class="handle" aria-hidden="true"></div>' + inner + '</div></div>'; }
export function sheetHead(title, sub){ return '<div class="row" style="justify-content:space-between;align-items:flex-start"><div class="col grow" style="gap:2px"><h2 class="big pink">' + title + '</h2>' + (sub ? '<div class="mute">' + sub + '</div>' : '') + '</div><button class="btn icon" data-act="close" aria-label="Đóng">' + ic('x', 20) + '</button></div>'; }
export function readText(f){ return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsText(f); }); }
export function mapsSearch(q){ return 'https://www.google.com/maps/search/' + encodeURIComponent(q); }
export function tiktokSearch(q){ return 'https://www.tiktok.com/search?q=' + encodeURIComponent(q); }
