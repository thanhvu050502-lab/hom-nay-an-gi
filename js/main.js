// Hôm nay ăn gì? – ứng dụng chính
import * as D from './store.js';
import { S } from './store.js';
import * as C from './catalog.js';
import * as L from './logic.js';
import { ic, esc, fmt, money, chip, when, blob, stars, sheet, sheetHead, readText, mapsSearch, tiktokSearch } from './ui.js';

const $ = s => document.querySelector(s);
const lsG = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
const lsS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

const U = {
  tab: 'home', seg: 'tim', detail: null, back: null,
  phase: 'idle', cat: null, result: null, backups: [], skip: [], others: 0, commit: null, rot: 0, busy: false, cats: [],
  f: Object.assign(L.defaultFilters(), lsG('hnag2-f', {})),
  sheet: null, q: '', sort: lsG('hnag2-sort', 'near'), menuCat: 'Tất cả',
  draft: null, quick: '', reading: 0, rate: null, scan: null, imp: null, snack: null, work: null, delArm: null,
  hot: lsG('hnag2-hot', { area:'', cat:'', items:null, at:0, fallback:false }), hotBusy: false,
  d: { q:'', group:'', type:'', price:null, sort:'az', n:24, mine:false }, dish: null,
  auth: { mode:'login', email:'', msg:'', busy:false }, toastHide: {}, sess: null, joinCode: null, dismissedSug: {},
  weather: null, occ: C.upcomingOccasion(), pending: false
};
U.f.cuisine = U.f.cuisine || []; U.f.type = U.f.type || []; U.f.group = U.f.group || []; U.f.occasion = U.f.occasion || []; U.f.weather = U.f.weather || []; U.f.forms = U.f.forms || [];
const saveF = () => lsS('hnag2-f', U.f);
const P = id => S.places.find(p => p.id === id);
const isShared = () => { const g = curGroup(); return g && g.kind === 'shared'; };
const curGroup = () => S.groups.find(g => g.id === S.gid);
const memberName = uid => { const m = S.members.find(x => x.user_id === uid); return m ? (m.name || 'Thành viên') : 'Thành viên'; };

// ---------- thông báo nhỏ ----------
let snackT = null;
function snack(t, undo){ U.snack = { t, undo: undo || null }; clearTimeout(snackT); snackT = setTimeout(() => { U.snack = null; soft(); }, undo ? 5000 : 3500); render(); }
function soft(){ const a = document.activeElement; if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) { U.pending = true; return; } if (U.busy) { U.pending = true; return; } render(); }

// ---------- thông tin hiển thị của quán ----------
function metaOf(p, withDist = true){
  const t = L.tagsOf(p), a = [];
  const d = withDist ? L.dist(p) : null; if (d != null) a.push(L.distTxt(d));
  const o = L.openNow(p); if (o === true) a.push('mở đến ' + p.close_time); else if (o === false) a.push('đang đóng');
  if (t.cuisine && t.cuisine !== 'Khác') a.push('Món ' + t.cuisine); else if (t.form) a.push(t.form);
  const pr = L.priceTxt(p); if (pr) a.push(pr);
  return a.join(' · ');
}
function scoreBox(p){
  const m = L.myScore(p), g = L.groupScore(p);
  if (m != null) return '<div class="score"><div class="num">' + fmt(m) + '</div><div class="tiny">bạn' + (L.dist(p) != null ? ' · ' + L.distTxt(L.dist(p)) : '') + '</div></div>';
  if (g && isShared()) return '<div class="score"><div class="num">' + fmt(g.avg) + '</div><div class="tiny">nhóm</div></div>';
  return '<div class="score"><div class="num dim">–</div><div class="tiny">' + (L.visits(p) ? 'chưa chấm' : 'chưa đi') + '</div></div>';
}
function qcard(p, i, sub){ return '<button class="qcard" data-act="open" data-id="' + esc(p.id) + '">' + blob(p, 56, i) + '<span class="col grow" style="gap:3px"><span class="qname">' + esc(p.name) + '</span><span class="mute ell">' + esc(sub || metaOf(p) || 'Chưa gắn tag') + '</span></span>' + scoreBox(p) + '</button>'; }
function stickers(p){
  const a = []; const v = L.visits(p);
  if (L.again(p) === 'yes') a.push('SẼ QUAY LẠI' + (v ? ' · ĐÃ ĐI ' + v + ' LẦN' : ''));
  else if (v) a.push('ĐÃ ĐI ' + v + ' LẦN'); else a.push(p.wish ? 'MUỐN THỬ' : 'CHƯA ĐI');
  return a;
}
function hero(p, h){
  const pr = L.priceTxt(p); const st = stickers(p);
  return '<div class="hero" style="height:' + h + 'px">' + (p.photos && p.photos[0] ? '<div class="heroimg" style="background-image:url(' + esc(p.photos[0]) + ')" role="img" aria-label="Ảnh ' + esc(p.name) + '"></div>' : '<div class="heroimg ph" aria-hidden="true">' + ic('bowl', 40, 1.5) + '</div>') +
    (pr ? '<div class="sticker ink" style="position:absolute;right:0;top:12px;transform:rotate(7deg)">' + esc(pr.toUpperCase()) + ' / NGƯỜI</div>' : '') +
    '<div class="sticker" style="position:absolute;left:4px;bottom:4px;transform:rotate(-5deg)">' + esc(st[0]) + '</div></div>';
}

// ---------- đăng nhập / chào mừng ----------
function authView(){
  const a = U.auth;
  let h = '<div class="welcome"><div class="wheel-mini" aria-hidden="true"></div><h1>HÔM NAY ĂN GÌ?</h1><p class="lead">Quay ra quán hợp mood, hợp túi tiền, từ chính danh sách quán của bạn và nhóm bạn.</p>' +
    '<ul class="feat"><li><span class="sticker">1</span>Lưu quán bằng link Google Maps hoặc TikTok</li><li><span class="sticker">2</span>Quay loại món, app chọn quán theo điểm bạn chấm</li><li><span class="sticker">3</span>Chấm từng món sau bữa ăn, lần sau biết gọi gì</li></ul></div>';
  if (!D.configured) return h + '<div class="card mute">Ứng dụng đang được thiết lập kho dữ liệu. Quay lại sau ít phút nhé.</div>';
  if (a.mode === 'sent') return h + '<div class="card col"><b>Kiểm tra hộp thư ' + esc(a.email) + '</b><div class="mute">' + esc(a.msg) + '</div><button class="btn" data-act="authmode" data-v="login">Quay lại đăng nhập</button></div>';
  if (a.mode === 'newpw') return h + '<form class="card col" data-form="newpw"><b>Đặt mật khẩu mới</b><label class="f">Mật khẩu mới<input type="password" name="pw" minlength="6" required autocomplete="new-password"></label><button class="btn pri" type="submit">Lưu mật khẩu</button>' + (a.msg ? '<div class="mute" role="alert">' + esc(a.msg) + '</div>' : '') + '</form>';
  const up = a.mode === 'signup';
  if (S.anonError && !lsG('hnag2-wantlogin', null)) h += '<div class="card mute">Chế độ khách đang tạm tắt, đăng nhập để dùng.</div>';
  h += '<form class="card col" data-form="auth"><div class="seg">' + [['login','Đăng nhập'],['signup','Tạo tài khoản']].map(x => '<button type="button" data-act="authmode" data-v="' + x[0] + '" class="' + (a.mode === x[0] ? 'on' : '') + '">' + x[1] + '</button>').join('') + '</div>' +
    (up ? '<label class="f">Tên hiển thị trong nhóm<input name="name" required autocomplete="nickname" placeholder="Ví dụ: Vũ"></label>' : '') +
    '<label class="f">Email<input type="email" name="email" required autocomplete="email" value="' + esc(a.email) + '"></label>' +
    '<label class="f">Mật khẩu<input type="password" name="pw" minlength="6" required autocomplete="' + (up ? 'new-password' : 'current-password') + '"></label>' +
    '<button class="btn pri" type="submit"' + (a.busy ? ' disabled' : '') + '>' + (a.busy ? 'Đang xử lý…' : up ? 'Tạo tài khoản' : 'Đăng nhập') + '</button>' +
    (a.msg ? '<div class="mute" role="alert">' + esc(a.msg) + '</div>' : '') +
    (up ? '' : '<div class="row"><button type="button" class="btn sm grow ghost" data-act="magic">Gửi link đăng nhập qua email</button><button type="button" class="btn sm ghost" data-act="forgot">Quên mật khẩu</button></div>') + '</form>';
  if (lsG('hnag2-wantlogin', null)) h += '<button class="btn ghost" data-act="guest">Dùng thử không cần đăng nhập</button>';
  return h;
}

// ---------- HÔM NAY ----------
function dueMeal(){
  const hrs = (L.prefs().remindHours ?? 3); if (L.prefs().remind === false) return null;
  const now = Date.now();
  return S.meals.filter(m => m.created_by === L.me() && !m.rated && !m.dismissed && now - new Date(m.at) > hrs * 36e5 && now - new Date(m.at) < 7 * 864e5).sort((a, b) => new Date(b.at) - new Date(a.at))[0] || null;
}
function reminderToast(){
  const m = dueMeal(); if (!m || U.toastHide[m.id]) return '';
  const at = new Date(m.at);
  return '<div class="toast" role="status">' + blob(P(m.place_id) || { name:m.place_name }, 44, 0) + '<div class="col grow" style="gap:1px;min-width:0"><div class="tiny b" style="letter-spacing:1px;color:#5A4A5C">CHỐT QUÁN LÚC ' + ('0' + at.getHours()).slice(-2) + ':' + ('0' + at.getMinutes()).slice(-2) + (when(m.at).startsWith('Hôm nay') ? '' : ' · ' + esc(when(m.at).toUpperCase())) + '</div><div class="b" style="font-size:13px">Bữa ở ' + esc(m.place_name) + ' thế nào?</div></div><button class="btn sm dark" data-act="rate" data-id="' + esc(m.id) + '">Chấm điểm</button><button class="btn icon plain" data-act="later" data-id="' + esc(m.id) + '" aria-label="Để sau">' + ic('x', 18, 2.2) + '</button></div>';
}
function activeFilters(){
  const f = U.f, a = [];
  if (f.mood) a.push(['mood', f.mood, f.mood]);
  if (f.price != null){ const b = L.foodBands()[f.price]; if (b) a.push(['price', null, C.bandLabel(b)]); }
  if (f.priceMin != null) a.push(['priceMin', null, f.priceMin + '–' + f.priceMax + 'k']);
  ['cuisine','type','group','forms','occasion','weather'].forEach(k => f[k].forEach(v => a.push([k, v, k === 'cuisine' ? 'Món ' + v : v])));
  if (f.who) a.push(['who', f.who, 'Đi ' + f.who.toLowerCase()]);
  if (f.area) a.push(['area', f.area, f.area]);
  if (f.radius) a.push(['radius', null, 'Trong ' + f.radius + ' km']);
  if (f.open && !f.plan) a.push(['open', null, 'Đang mở']);
  if (f.meal) a.push(['meal', null, 'Bữa ' + C.mealNow().toLowerCase()]);
  return a;
}
function unFilter(k, v){ const f = U.f; if (Array.isArray(f[k])) f[k] = f[k].filter(x => x !== v); else if (k === 'priceMin'){ f.priceMin = null; f.priceMax = null; } else if (k === 'open') f.open = false; else if (k === 'meal') f.meal = false; else f[k] = null; saveF(); }
function locChip(){
  const f = U.f;
  const txt = f.area ? f.area : f.radius ? 'Quanh đây · ' + f.radius + ' km' : 'Mọi khu vực';
  return '<button type="button" class="btn sm" data-act="sheet" data-v="loc">' + ic('pin', 18) + esc(txt) + '</button>';
}
function suggestChips(){
  const out = []; const w = U.weather;
  if (w && w.rain && !U.f.weather.includes('Hợp ngày mưa') && !U.dismissedSug.rain) out.push(chip('Đang mưa · bật Hợp ngày mưa?', false, 'sugw', 'Hợp ngày mưa', 'style="border-style:dashed;border-color:var(--mute)"'));
  else if (w && w.hot && !U.f.weather.includes('Hợp ngày nóng') && !U.dismissedSug.hot) out.push(chip('Nóng ' + w.temp + '° · bật Hợp ngày nóng?', false, 'sugw', 'Hợp ngày nóng', 'style="border-style:dashed;border-color:var(--mute)"'));
  const o = U.occ;
  if (o && !U.f.occasion.includes(o.tag) && !U.dismissedSug.occ) out.push(chip((o.days === 0 ? 'Hôm nay ' : o.days === 1 ? 'Mai là ' : 'Sắp tới ') + esc(o.name) + ' · bật Dịp ' + esc(o.tag.toLowerCase()) + '?', false, 'sugo', o.tag, 'style="border-style:dashed;border-color:var(--mute)"'));
  return out.join('');
}
function homeHead(){
  let h = '<h1>HÔM NAY ĂN GÌ?</h1><div class="row wrap">';
  const g = curGroup();
  h += '<button type="button" class="btn sm" data-act="sheet" data-v="groups">' + ic('people', 18) + esc(g ? g.name : 'Kho cá nhân') + '</button>' + locChip();
  if (isShared()) h += '<button type="button" class="btn sm" data-act="newsess">Cùng chọn</button>';
  return h + '</div>';
}
function homeIdle(){
  let h = reminderToast() + homeHead();
  const rd = S.places.filter(L.ready);
  if (!rd.length){
    U.free = true; const cats = C.FREE_WHEEL[C.mealNow()]; U.cats = cats;
    h += '<div class="mute">' + (S.places.length ? 'Quán đã lưu chưa được gắn tag nên vòng quay đang chọn loại món giúp bạn. Duyệt tag ở Hộp chờ để app chọn đúng quán của bạn.' : 'Chưa có quán nào trong danh sách, vòng quay chọn giúp loại món hợp bữa ' + C.mealNow().toLowerCase() + ', rồi bạn tìm quán gần trên Google Maps.') + '</div>';
    h += wheelHTML(cats, cats.length).replace(cats.length + ' LOẠI MÓN CÒN HỢP', 'HỢP BỮA ' + C.mealNow().toUpperCase()) + '<div class="status" id="status" role="status">QUAY LOẠI MÓN</div>';
    h += '<div class="row"><button class="btn sm grow pri" data-act="tab" data-v="luu">' + ic('plus', 16) + (S.places.length ? 'Mở Hộp chờ' : 'Lưu quán quen') + '</button>' + (S.places.length ? '' : '<button class="btn sm grow" data-act="seed">Thêm 6 quán mẫu</button>') + '</div>' + migrateCard();
    return h;
  }
  U.free = false;
  h += '<div class="col g6"><h2 class="lbl">Đi với ai</h2><div class="hscroll">' + C.WHO.map(w => chip(w, U.f.who === w, 'who', w)).join('') + '</div></div>';
  h += '<div class="col g6"><h2 class="lbl">Mood hôm nay</h2><div class="wrap">' + C.MOOD.map(m => chip(m, U.f.mood === m, 'mood', m)).join('') + '</div></div>';
  const af = activeFilters().filter(a => !['mood','price','meal','open'].includes(a[0])).length;
  h += '<div class="col g6"><h2 class="lbl">Ngân sách và bộ lọc</h2><div class="wrap">' + L.foodBands().slice(0, 4).map((b, i) => chip(C.bandLabel(b), U.f.price === i, 'price', i)).join('') + '<button type="button" class="chip' + (af ? ' on' : '') + '" data-act="sheet" data-v="filter">' + ic('filter', 16, 2.2) + 'Tất cả bộ lọc' + (af ? ' · ' + af : '') + '</button>' + suggestChips() + '</div></div>';
  const list = L.candidates(U.f);
  if (!list.length) return h + noMatch();
  const cats = L.formsOf(list); let shown = cats;
  if (cats.length > 8){ const key = cats.join('|'); if (U.ck !== key || !U.cc){ U.ck = key; const s = [...cats].sort(() => Math.random() - 0.5).slice(0, 8); U.cc = s.sort((a, b) => C.FORM.indexOf(a) - C.FORM.indexOf(b)); } shown = U.cc; }
  U.cats = shown;
  if (shown.length < 2) h += '<div class="card col"><div class="mute">Chỉ còn một loại món hợp: <b class="ink">' + esc(shown[0]) + '</b> (' + list.length + ' quán). Không cần quay.</div><button class="btn pri" data-act="skipwheel">Gợi ý quán luôn</button></div>';
  else h += wheelHTML(shown, cats.length) + '<div class="status" id="status" role="status">' + list.length + ' QUÁN ĐANG HỢP</div>' + (cats.length > 8 ? '<button class="btn sm" data-act="reshuffle">Đổi 8 loại món khác lên vòng quay</button>' : '');
  h += '<div class="row"><button class="btn sm grow" data-act="fav">Chọn giúp quán quen</button>' + (shown.length > 1 ? '<button class="btn sm grow" data-act="skipwheel">Bỏ qua vòng quay</button>' : '') + '</div>';
  return h;
}
function wheelHTML(cats, total){
  const n = cats.length, step = 360 / n, pal = ['#FF9BD2','#2E2734','#C6F24E','#2E2734'];
  const cols = cats.map((_, i) => pal[i % 4]); if (n > 2 && cols[n - 1] === cols[0]) cols[n - 1] = cols[0] === '#FF9BD2' ? '#C6F24E' : '#FF9BD2';
  const stops = cols.map((c, i) => c + ' ' + (i * step) + 'deg ' + ((i + 1) * step) + 'deg').join(', ');
  const sp = cats.map((t, i) => { const th = i * step + step / 2, fg = cols[i] === '#2E2734' ? '#F6F0E8' : '#17141A'; const tr = th < 180 ? 'rotate(' + (th - 90) + 'deg) translateX(50px)' : 'rotate(' + (th - 270) + 'deg) translateX(-128px)'; const lb = (C.SHORT[t] || t).toUpperCase(); return '<span data-i="' + i + '" style="color:' + fg + ';font-size:' + (n > 6 || lb.length > 8 ? 13 : 15) + 'px;transform:' + tr + '">' + esc(lb) + '</span>'; }).join('');
  return '<div class="wheelbox"><div id="ptr" aria-hidden="true"></div><div id="disc" style="background:conic-gradient(' + stops + ');transform:rotate(' + U.rot + 'deg)">' + sp + '</div><button type="button" id="spinbtn" data-act="spin">QUAY</button><div class="sticker" style="position:absolute;right:0;bottom:6px;transform:rotate(-7deg)">' + (total > n ? n + ' TRONG ' + total + ' LOẠI MÓN' : n + ' LOẠI MÓN CÒN HỢP') + '</div></div>';
}
function noMatch(){
  const af = activeFilters();
  let h = '<h2 class="big">CHƯA CÓ QUÁN HỢP</h2><div class="mute">Trong ' + S.places.filter(L.ready).length + ' quán, không quán nào khớp cả ' + af.length + ' bộ lọc đang bật. Gỡ bớt một cái:</div><div class="col">';
  af.forEach(a => {
    const ig = {}; let n;
    if (a[1] != null && Array.isArray(U.f[a[0]])){ const keep = U.f[a[0]]; U.f[a[0]] = keep.filter(x => x !== a[1]); n = L.candidates(U.f).length; U.f[a[0]] = keep; }
    else { ig[a[0] === 'priceMin' ? 'price' : a[0]] = true; n = L.candidates(U.f, ig).length; }
    h += '<button class="btn sm between" data-act="unf" data-k="' + a[0] + '" data-v="' + esc(a[1] == null ? '' : a[1]) + '"><span>Bỏ "' + esc(a[2]) + '"</span><span class="lime">còn ' + n + ' quán</span></button>';
  });
  const q = (U.f.cuisine[0] ? 'món ' + U.f.cuisine[0] : U.f.forms[0] || 'quán ăn') + (U.f.area ? ' ' + U.f.area : ' gần đây');
  return h + '</div>' + findNew(q);
}
function findNew(q){ return '<div class="col g6"><a class="btn" target="_blank" rel="noopener" href="' + mapsSearch(q) + '">' + ic('search', 18) + 'Tìm quán mới trên Google Maps</a><a class="btn ghost" target="_blank" rel="noopener" href="' + tiktokSearch(q) + '">' + ic('fire', 18) + 'Xem trên TikTok</a><div class="mute center">Ưng quán nào thì bấm Chia sẻ, dán link về ô Lưu.</div></div>'; }
function summaryLine(n){ const a = activeFilters().filter(x => ['mood','price','priceMin','radius','area'].includes(x[0])).map(x => x[2]); if (n != null) a.push(n + ' quán hợp'); return a.join(' · '); }
function homeFree(){
  const t = U.cat; const dishes = C.CAT.filter(x => x.type === t).sort(() => Math.random() - 0.5).slice(0, 4);
  const mine = S.places.filter(p => L.tagsOf(p).form === t || (p.sug && p.sug.form === t));
  const q = (t === 'Ăn vặt đường phố' ? 'ăn vặt' : t.replace(' & ', ' ')) + (U.f.area ? ' ' + U.f.area : ' gần đây');
  let h = '<h1>QUAY RA: ' + esc((C.SHORT[t] || t).toUpperCase()) + '</h1><div class="mute">Gợi ý vài món loại này, giá tham khảo mỗi phần:</div>';
  h += '<div class="card col pop" style="gap:0;padding:4px 14px">' + dishes.map((d, i) => '<div class="mrow' + (i < dishes.length - 1 ? ' bb' : '') + '"><span class="grow b">' + esc(d.name) + '</span><span class="sm b">~' + d.price + 'k</span></div>').join('') + '</div>';
  if (mine.length) h += '<h2 class="lbl">Quán bạn đã lưu thuộc loại này</h2><div class="col">' + mine.slice(0, 3).map((p, i) => qcard(p, i)).join('') + '</div>';
  h += '<a class="btn pri" target="_blank" rel="noopener" href="' + mapsSearch(q) + '">' + ic('pin', 18) + 'Tìm quán ' + esc((C.SHORT[t] || t).toLowerCase()) + ' gần đây</a><a class="btn" target="_blank" rel="noopener" href="' + tiktokSearch(q) + '">' + ic('fire', 18) + 'Xem review trên TikTok</a><div class="mute center">Ưng quán nào thì bấm Chia sẻ trên Maps, dán link vào tab Lưu. Lần sau vòng quay sẽ chọn đúng quán của bạn.</div>';
  h += '<div class="row"><button class="btn sm grow" data-act="again">Quay lần nữa</button><button class="btn sm grow ghost" data-act="reset">Về vòng quay</button></div>';
  return h;
}
function homeDone(){
  const p = U.result; if (!p) return homeIdle();
  const gd = L.goodDishes(p).slice(0, 2).map(x => x.d.name).join(', ');
  const my = L.myScore(p), g = L.groupScore(p);
  const pool = U.cat ? L.candidates(U.f).filter(x => L.formOf(x) === U.cat) : null;
  let h = '<h1>' + (U.cat ? 'QUAY RA: ' + esc((C.SHORT[U.cat] || U.cat).toUpperCase()) : U.regular ? 'QUÁN QUEN' : 'GỢI Ý CHO BẠN') + '</h1><div class="mute">' + esc(summaryLine(pool ? pool.length : null)) + '</div>';
  h += '<div class="card col pop" style="gap:8px">' + hero(p, 112) + '<button class="linkish big-name" data-act="open" data-id="' + esc(p.id) + '">' + esc(p.name) + '</button><div class="mute">' + esc(metaOf(p)) + '</div>';
  if (my != null || g) h += '<div class="row baseline">' + (my != null ? '<div class="num m">' + fmt(my) + '</div><span class="mute" style="margin-right:10px">bạn chấm</span>' : '') + (g && isShared() ? '<div class="num m">' + fmt(g.avg) + '</div><span class="mute">nhóm chấm</span>' : '') + '</div>';
  if (gd) h += '<div class="row"><span class="tag">NÊN GỌI</span><span class="sm b">' + esc(gd) + '</span></div>';
  h += '<div class="row"><button class="btn pri grow" data-act="commit">Chốt quán này</button><button class="btn" data-act="other">Quán khác</button></div></div>';
  if (U.backups.length) h += '<h2 class="lbl">' + (U.regular ? 'Quán quen khác' : 'Dự phòng') + '</h2><div class="col">' + U.backups.map((b, i) => qcard(b, i + 1)).join('') + '</div>';
  if (U.others >= 3) h += '<div class="card row" style="background:var(--card2)"><div class="grow sm b">Đổi 3 lần chưa ưng? Thử nới bộ lọc.</div><button class="btn sm" data-act="sheet" data-v="filter">Mở bộ lọc</button></div>';
  h += '<div class="row"><button class="btn sm grow" data-act="again">Quay lần nữa</button><button class="btn sm grow ghost" data-act="reset">Về vòng quay</button></div>';
  return h;
}
function homeCommitted(){
  const p = U.result, m = U.commit; if (!p || !m) return homeIdle();
  const gd = L.goodDishes(p).slice(0, 3).map(x => x.d.name).join(', ');
  let h = '<h1>ĐÃ CHỐT, ĐI THÔI!</h1><div class="card col pop" style="gap:8px">' + hero(p, 100) + '<div class="big-name">' + esc(p.name) + '</div><div class="mute">' + esc(metaOf(p)) + '</div>';
  if (gd) h += '<div class="row"><span class="tag">NÊN GỌI</span><span class="sm b">' + esc(gd) + '</span></div>';
  h += '<div class="row"><a class="btn pri grow" target="_blank" rel="noopener" href="' + esc(mapsHref(p)) + '">' + ic('pin', 18) + 'Chỉ đường</a>' + (isShared() || navigator.share ? '<button class="btn" data-act="sharepick">' + ic('share', 18) + (isShared() ? 'Gửi cho nhóm' : 'Gửi') + '</button>' : '') + '</div></div>';
  const all = L.comboFor(p);
  if (all.length){
    const c = U.combo && all.find(x => x.p.id === U.combo) || null;
    const sub = x => (L.formOf(x.p) || '') + (x.d != null ? ' · cách quán ăn ' + L.distTxt(x.d) : '') + (L.again(x.p) === 'yes' ? ' · quán quen' : '');
    h += '<div class="row between"><h2 class="lbl">Ăn xong đi tiếp</h2><span class="sticker">COMBO ĂN + UỐNG</span></div>';
    if (U.comboSpin) h += '<div class="card combo-spin" role="status"><div class="num l ink" id="combospin">' + esc(U.comboSpin) + '</div></div>';
    else if (c) h += '<div class="pop">' + qcard(c.p, 1, sub(c)) + '</div>';
    h += '<button class="btn" data-act="combospin"' + (U.comboSpin ? ' disabled' : '') + '>' + ic('wheel', 18) + (c ? 'Quay chặng hai lần nữa' : 'Quay dessert, đồ uống chặng hai') + '</button>';
    if (!c && !U.comboSpin) h += '<div class="mute">' + all.length + ' quán hợp, ưu tiên gần quán ăn và quán quen.</div>';
  }
  h += '<div class="mute">Khoảng ' + (L.prefs().remindHours ?? 3) + ' giờ nữa, khi bạn mở lại app sẽ có một lời nhắc nhỏ hỏi bữa ăn thế nào. Muốn chấm ngay thì vào Quán › Gần đây.</div>';
  h += '<div class="card row" style="background:var(--card2)"><div class="grow sm b">Chốt nhầm quán?</div><button class="btn sm" data-act="undo">Hoàn tác</button></div><button class="btn sm ghost" data-act="reset">Về màn hình quay</button>';
  return h;
}
function mapsHref(p){ return p.map_url && /^https?:/.test(p.map_url) ? p.map_url : p.lat != null ? 'https://www.google.com/maps/search/?api=1&query=' + p.lat + ',' + p.lng : mapsSearch(p.name + (p.address ? ' ' + p.address : '')); }

// ---------- QUÁN ----------
function quanSeg(){ return '<div class="seg">' + [['tim','Tìm kiếm'],['ganday','Gần đây'],['yeuthich','Yêu thích'],['mon','Món']].map(s => '<button data-act="seg" data-v="' + s[0] + '" class="' + (U.seg === s[0] ? 'on' : '') + '"' + (U.seg === s[0] ? ' aria-current="page"' : '') + '>' + s[1] + (s[0] === 'ganday' && unratedCount() ? ' <span class="dot" aria-label="có bữa chưa chấm"></span>' : '') + '</button>').join('') + '</div>'; }
const unratedCount = () => S.meals.filter(m => m.created_by === L.me() && !m.rated).length;
const SORTS = [['near','Gần nhất'],['score','Điểm cao'],['old','Lâu chưa đi'],['new','Mới lưu'],['price','Giá thấp'],['az','Tên A–Z']];
function sortList(list){
  const f = { near:(a, b) => (L.dist(a) ?? 1e9) - (L.dist(b) ?? 1e9), score:(a, b) => ((L.myScore(b) ?? (L.groupScore(b) || {}).avg ?? 0) - (L.myScore(a) ?? (L.groupScore(a) || {}).avg ?? 0)), old:(a, b) => (L.lastVisit(a) || 0) - (L.lastVisit(b) || 0), new:(a, b) => new Date(b.created_at) - new Date(a.created_at), price:(a, b) => (a.pmin ?? 1e9) - (b.pmin ?? 1e9), az:(a, b) => a.name.localeCompare(b.name, 'vi') }[U.sort] || (() => 0);
  return list.sort(f);
}
function searchView(){
  let h = '<h1>QUÁN CỦA TÔI</h1>' + quanSeg();
  h += '<div class="search"><label class="sr" for="q">Tìm quán, món hoặc khu vực</label><span class="sic">' + ic('search', 22) + '</span><input id="q" type="search" data-f="q" value="' + esc(U.q) + '" placeholder="Tìm quán, món, khu vực…"></div>';
  const kw = U.q.trim().toLowerCase();
  const dishTxt = p => L.dishesOf(p).map(d => d.name).join(' ');
  let list = S.places.filter(p => p.status === 'active');
  const af = activeFilters().filter(a => !['meal','open','mood'].includes(a[0]));
  if (af.length) list = list.filter(p => L.matches(p, { ...U.f, mood:null, meal:false, open:false }));
  if (kw) list = list.filter(p => [p.name, p.address, L.tagsOf(p).area, L.tagsOf(p).cuisine, L.formOf(p), L.tagsOf(p).type, dishTxt(p)].join(' ').toLowerCase().includes(kw));
  list = sortList(list);
  h += '<div id="map" class="map" role="img" aria-label="Bản đồ các quán"></div>';
  h += '<div class="wrap"><button class="chip" data-act="sheet" data-v="sort">' + ic('sort', 16, 2.2) + 'Sắp xếp: ' + (SORTS.find(s => s[0] === U.sort) || SORTS[0])[1] + '</button>' + af.map(a => '<button type="button" class="chip on" data-act="unf" data-k="' + a[0] + '" data-v="' + esc(a[1] == null ? '' : a[1]) + '">' + esc(a[2]) + ic('x', 12, 3) + '</button>').join('') + '<button class="chip" data-act="sheet" data-v="filter">' + ic('filter', 16, 2.2) + 'Lọc</button></div>';
  if (!list.length) h += '<div class="card mute">' + (kw ? 'Không quán nào khớp "' + esc(U.q) + '".' : S.places.length ? 'Không quán nào khớp bộ lọc.' : 'Chưa có quán nào. Bấm Lưu ở dưới để thêm.') + '</div>';
  else h += '<div class="col">' + list.slice(0, 200).map((p, i) => qcard(p, i, L.again(p) === 'no' ? 'Không quay lại · đã loại khỏi vòng quay' : null)).join('') + '</div>';
  const inbox = S.places.filter(p => p.status === 'inbox').length;
  if (inbox) h += '<button class="btn sm" data-act="tab" data-v="luu">' + inbox + ' quán đang ở Hộp chờ, mở để gắn tag</button>';
  h += findNew((kw || 'quán ăn') + (U.f.area ? ' ' + U.f.area : ' gần đây'));
  return h;
}
function recentView(){
  let h = '<h1>QUÁN CỦA TÔI</h1>' + quanSeg();
  const mine = S.meals.filter(m => m.created_by === L.me() || (m.with_users || []).includes(L.me()));
  const ms = mine.slice().sort((a, b) => (a.rated - b.rated) || (new Date(b.at) - new Date(a.at))).slice(0, 60);
  if (!ms.length) return h + '<div class="card mute">Chưa có bữa nào. Chốt một quán ở tab Hôm nay, bữa đó sẽ hiện ở đây để bạn chấm điểm.</div>';
  const un = ms.filter(m => !m.rated && m.created_by === L.me());
  if (un.length) h += '<h2 class="lbl">Chưa chấm điểm · ' + un.length + '</h2>';
  h += '<div class="col">' + ms.map((m, i) => {
    const p = P(m.place_id); const mine_ = m.created_by === L.me();
    const sub = when(m.at) + (m.total ? ' · ' + money(m.total) : '') + (m.with_text ? ' · với ' + m.with_text : '') + (!mine_ ? ' · ' + memberName(m.created_by) + ' tạo' : '') + (m.rated ? (m.score ? ' · bạn chấm ' + fmt(m.score) : ' · đã ghi nhận') : '');
    return '<div class="card row" style="padding:12px 14px;gap:12px">' + blob(p || { name:m.place_name }, 48, i) + '<button class="col grow linkish" style="gap:3px;min-width:0;text-align:left" data-act="open" data-id="' + esc(m.place_id || '') + '"><span class="qname">' + esc(m.place_name || (p && p.name) || 'Quán đã xóa') + '</span><span class="mute ell">' + esc(sub) + '</span></button>' + (!m.rated && mine_ ? '<button class="btn sm pri" data-act="rate" data-id="' + esc(m.id) + '">Chấm điểm</button>' : '') + '</div>';
  }).join('') + '</div>';
  return h;
}
function favView(){
  let h = '<h1>QUÁN CỦA TÔI</h1>' + quanSeg();
  const fav = sortList(S.places.filter(p => L.again(p) === 'yes'));
  const wish = sortList(S.places.filter(p => p.wish && !L.visits(p)));
  h += '<div class="row between"><h2 class="big">SẼ QUAY LẠI</h2><span class="sticker">' + fav.length + ' QUÁN</span></div>';
  h += fav.length ? '<div class="col">' + fav.map((p, i) => qcard(p, i)).join('') + '</div>' : '<div class="card mute">Quán bạn gắn "Sẽ quay lại" khi chấm điểm sẽ nằm ở đây.</div>';
  h += '<div class="row between"><h2 class="big">MUỐN THỬ</h2><span class="sticker ink">' + wish.length + ' QUÁN</span></div>';
  h += wish.length ? '<div class="col">' + wish.map((p, i) => qcard(p, i + 1, metaOf(p) || 'Chưa đi')).join('') + '</div>' : '<div class="card mute">Tick "Muốn thử" khi lưu một quán chưa đi, hoặc lưu từ Đang hot.</div>';
  h += '<button class="btn" data-act="mood" data-v="Khám phá" data-go="home">Quay trong các quán chưa đi</button>';
  return h;
}
function dishList(){
  const d = U.d; let out = d.mine ? [] : C.CAT.slice();
  S.places.forEach(p => L.dishesOf(p).forEach(x => { let pr = parseInt(String(x.price || '').replace(/[^\d]/g, ''), 10); if (pr >= 1000) pr = Math.round(pr / 1000); const st = L.dishStats(x); out.push({ name:x.name, type:L.formOf(p), group:C.groupOf(L.formOf(p)), price:pr || null, ptxt:x.price || '', quan:p.name, qid:p.id, score:st.my ?? st.grp ?? 0, src:'mine' }); }));
  const kw = d.q.trim().toLowerCase();
  out = out.filter(x => { if (d.group && x.group !== d.group) return false; if (d.type && x.type !== d.type) return false; if (d.price != null){ const b = C.PB[d.price]; if (x.price == null || x.price < b[0] || x.price >= b[1]) return false; } if (kw && (x.name + ' ' + x.type + ' ' + (x.quan || '')).toLowerCase().indexOf(kw) < 0) return false; return true; });
  return out.sort({ az:(a, b) => a.name.localeCompare(b.name, 'vi'), up:(a, b) => (a.price ?? 1e9) - (b.price ?? 1e9), down:(a, b) => (b.price || 0) - (a.price || 0) }[d.sort]);
}
function dishView(){
  const d = U.d, list = dishList(); U.dl = list; const mc = {}; S.places.forEach(p => { if (L.ready(p) && L.again(p) !== 'no') mc[L.formOf(p)] = (mc[L.formOf(p)] || 0) + 1; });
  let h = '<h1>QUÁN CỦA TÔI</h1>' + quanSeg();
  h += '<div class="search"><label class="sr" for="dq">Tìm món</label><span class="sic">' + ic('search', 22) + '</span><input id="dq" type="search" data-f="dq" value="' + esc(d.q) + '" placeholder="Tìm món…"></div>';
  h += '<div class="wrap">' + chip('Tất cả', !d.group, 'dg', '') + C.GNAMES.map(g => chip(g, d.group === g, 'dg', g)).join('') + '</div>';
  const types = d.group ? C.GROUPS[d.group] : C.FORM;
  h += '<label class="f">Loại món<select data-f="dtype"><option value="">Tất cả loại món</option>' + types.map(t => '<option value="' + esc(t) + '"' + (d.type === t ? ' selected' : '') + '>' + esc(t) + (mc[t] ? ' · ' + mc[t] + ' quán' : '') + '</option>').join('') + '</select></label>';
  h += '<div class="wrap">' + C.PB.map((b, i) => chip(b[2], d.price === i, 'dp', i)).join('') + '</div>';
  h += '<div class="wrap"><span class="mute" style="align-self:center">Sắp xếp</span>' + [['az','Tên A–Z'],['up','Giá tăng'],['down','Giá giảm']].map(x => chip(x[1], d.sort === x[0], 'ds', x[0])).join('') + chip('Chỉ món ở quán của tôi', d.mine, 'dmine', '1') + '</div>';
  h += '<div class="mute" role="status">' + list.length + ' món' + (d.mine ? ' từ menu các quán đã lưu' : ' · giá danh mục là giá tham khảo') + '</div>';
  if (!list.length) h += '<div class="card mute">' + (d.mine ? 'Chưa có món nào. Món vào đây khi bạn chấm điểm sau bữa ăn hoặc chụp menu ở trang quán.' : 'Không món nào khớp. Thử bỏ bớt bộ lọc.') + '</div>';
  else h += '<div class="col">' + list.slice(0, d.n).map((x, i) => '<button class="qcard" data-act="dish" data-i="' + i + '"><span class="col grow" style="gap:2px"><span class="lbl">' + esc(x.type || 'Chưa phân loại') + '</span><span class="qname">' + esc(x.name) + '</span><span class="mute ell">' + esc(x.src === 'mine' ? 'Ở ' + x.quan + (x.score ? ' · ' + fmt(x.score) + ' sao' : ' · chưa thử') : mc[x.type] ? mc[x.type] + ' quán của bạn thuộc loại này' : 'Chưa có quán nào của bạn') + '</span></span><span class="col" style="gap:2px;align-items:flex-end;flex:none">' + (x.price != null ? '<div class="num m ink">' + x.price + 'k</div>' : '') + (x.src === 'mine' ? (x.score >= 4 ? '<span class="tag">NÊN GỌI</span>' : '<span class="tag ink">QUÁN CỦA TÔI</span>') : '') + '</span></button>').join('') + '</div>';
  if (list.length > d.n) h += '<button class="btn" data-act="dmore">Xem thêm ' + Math.min(24, list.length - d.n) + ' món</button>';
  return h;
}

// ---------- CHI TIẾT QUÁN ----------
function detailView(){
  const p = P(U.detail); if (!p){ U.detail = null; return quanView(); }
  const t = L.tagsOf(p);
  let h = '<div class="hero big" style="height:190px">' + (p.photos && p.photos[0] ? '<div class="heroimg" style="background-image:url(' + esc(p.photos[0]) + ')" role="img" aria-label="Ảnh ' + esc(p.name) + '"></div>' : '<div class="heroimg ph" aria-hidden="true">' + ic('bowl', 44, 1.5) + '</div>') +
    '<button class="btn icon light" style="position:absolute;left:0;top:0" data-act="back" aria-label="Quay về">' + ic('back', 22, 2.2) + '</button>' +
    (L.priceTxt(p) ? '<div class="sticker ink" style="position:absolute;right:0;top:18px;transform:rotate(8deg)">' + esc(L.priceTxt(p).toUpperCase()) + ' / NGƯỜI</div>' : '') +
    '<div class="sticker" style="position:absolute;left:8px;bottom:6px;transform:rotate(-6deg)">' + esc(stickers(p)[0]) + '</div></div>';
  h += '<div class="col g6"><h1 class="pname">' + esc(p.name) + '</h1><div class="mute">' + esc([p.address || t.area, L.distTxt(L.dist(p)), L.openNow(p) === true ? 'mở đến ' + p.close_time : L.openNow(p) === false ? 'đang đóng · mở ' + p.open_time : ''].filter(Boolean).join(' · ') || 'Chưa có địa chỉ') + '</div>';
  const tg = [t.cuisine ? 'Món ' + t.cuisine : '', t.form, t.type].concat(t.mood || [], (t.who || []).map(w => 'Đi ' + w.toLowerCase()), t.meal || [], t.occasion || [], t.weather || []).filter(Boolean);
  if (tg.length) h += '<div class="wrap">' + tg.map(x => '<span class="pill">' + esc(x) + '</span>').join('') + '</div>';
  h += '</div>';
  if (p.status === 'inbox') h += '<div class="card row" style="background:var(--card2)"><div class="grow sm b">Quán đang ở Hộp chờ, chưa vào vòng quay.</div><button class="btn sm pri" data-act="edit" data-id="' + esc(p.id) + '">Gắn tag</button></div>';
  if (L.again(p) === 'no') h += '<div class="card row" style="background:var(--card2)"><div class="grow sm b">Bạn đã gắn "Không quay lại". Quán bị loại khỏi vòng quay.</div><button class="btn sm" data-act="unban" data-id="' + esc(p.id) + '">Gỡ tag</button></div>';
  // ảnh
  const ph = p.photos || [];
  h += '<div class="col g6"><div class="row between"><h2 class="lbl">Ảnh bạn chụp · ' + ph.length + '</h2><label class="btn sm' + (S.online ? '' : ' dis') + '">' + ic('cam', 16) + 'Thêm ảnh<input type="file" accept="image/*" class="sr" data-f="photo" multiple' + (S.online ? '' : ' disabled') + '></label></div>' + (ph.length ? '<div class="strip">' + ph.map((u, i) => '<button class="thumb" data-act="viewphoto" data-i="' + i + '" style="background-image:url(' + esc(u) + ')" aria-label="Xem ảnh ' + (i + 1) + '"></button>').join('') + '</div>' : '<div class="mute">Chụp món, chụp quán. Ảnh đầu tiên sẽ làm ảnh đại diện.</div>') + '</div>';
  // điểm
  const my = L.myScore(p), g = L.groupScore(p);
  h += '<div class="grid2"><div class="card row baseline"><div class="num l' + (my == null ? ' dim' : '') + '">' + (my != null ? fmt(my) : '–') + '</div><div class="mute">bạn chấm</div></div>' + (isShared() ? '<div class="card row baseline"><div class="num l' + (g ? '' : ' dim') + '">' + (g ? fmt(g.avg) : '–') + '</div><div class="mute">nhóm' + (g ? ' · ' + g.n + ' người' : '') + '</div></div>' : '<div class="card row baseline"><div class="num l ink">' + L.visits(p) + '</div><div class="mute">lần đã đi</div></div>') + '</div>';
  if (isShared()){ const rs = S.place_ratings.filter(r => r.place_id === p.id && (r.stars || r.again)); if (rs.length) h += '<div class="card col" style="gap:6px">' + rs.map(r => '<div class="row between"><span class="sm b">' + esc(r.user_id === L.me() ? 'Bạn' : memberName(r.user_id)) + '</span><span class="mute">' + (r.stars ? fmt(r.stars) + ' sao' : '') + (r.again === 'yes' ? ' · sẽ quay lại' : r.again === 'no' ? ' · không quay lại' : '') + '</span></div>').join('') + '</div>'; }
  // món nên gọi
  const good = L.goodDishes(p);
  if (good.length) h += '<div class="row between baseline"><h2 class="big s">MÓN NÊN GỌI</h2><div class="mute">theo điểm ' + (isShared() ? 'bạn và nhóm' : 'bạn chấm') + '</div></div><div class="grid2">' + good.slice(0, 4).map((x, i) => { const ph_ = (S.dish_ratings.find(r => r.dish_id === x.d.id && r.photo) || {}).photo; return '<div class="card col" style="padding:12px;gap:8px;min-width:0"><div class="dishimg" style="border-radius:' + ['42% 58% 55% 45%/48% 44% 56% 52%','55% 45% 48% 52%/44% 56% 44% 56%'][i % 2] + (ph_ ? ';background-image:url(' + esc(ph_) + ')' : '') + '">' + (ph_ ? '' : ic('bowl', 30, 1.6)) + '<span class="sticker" style="position:absolute;left:-4px;top:-2px;transform:rotate(' + (i % 2 ? 5 : -6) + 'deg)">NÊN GỌI</span><span class="scorepill">' + fmt(x.st.my ?? x.st.grp) + '</span></div><div class="b">' + esc(x.d.name) + '</div><div class="row between baseline"><div class="mute">' + (x.st.my != null ? 'Bạn ' + fmt(x.st.my) : '') + (isShared() && x.st.grp != null ? (x.st.my != null ? ' · ' : '') + 'nhóm ' + fmt(x.st.grp) : '') + '</div><div class="sm b">' + esc(x.d.price || '') + '</div></div></div>'; }).join('') + '</div>';
  // menu
  const ds = L.dishesOf(p).map(d => ({ d, st:L.dishStats(d) })).sort((a, b) => ((b.st.my ?? b.st.grp ?? 0) - (a.st.my ?? a.st.grp ?? 0)));
  const cats = ['Tất cả', ...new Set(ds.map(x => x.d.category).filter(Boolean))];
  if (!cats.includes(U.menuCat)) U.menuCat = 'Tất cả';
  const shown = ds.filter(x => U.menuCat === 'Tất cả' || x.d.category === U.menuCat);
  h += '<div class="row between"><h2 class="big s">MENU' + (ds.length ? ' · ' + ds.length : '') + '</h2><label class="btn sm' + (S.online ? '' : ' dis') + '">' + ic('cam', 16) + (ds.length ? 'Chụp lại menu' : 'Chụp menu') + '<input type="file" accept="image/*" capture="environment" class="sr" data-f="menu"' + (S.online ? '' : ' disabled') + '></label></div>';
  if (U.scan && U.scan.busy && U.scan.pid === p.id) h += '<div class="card mute" role="status">Đang đọc ảnh menu… thường mất 10–30 giây. Bạn cứ dùng app tiếp.</div>';
  if (cats.length > 2) h += '<div class="hscroll">' + cats.map(c => chip(c + (c === 'Tất cả' ? ' · ' + ds.length : ''), U.menuCat === c, 'menucat', c)).join('') + '</div>';
  if (!ds.length) h += '<div class="card mute">Chưa có món nào. Chụp ảnh menu để AI đọc ra danh sách món kèm giá, hoặc gõ tên món khi chấm điểm.</div>';
  else h += '<div class="card" style="padding:4px 14px">' + shown.map((x, i) => { const s = x.st.my ?? x.st.grp; const bad = s != null && s <= 2; return '<div class="mrow' + (i < shown.length - 1 ? ' bb' : '') + '"><div class="col grow" style="gap:3px;min-width:0"><div class="row b' + (bad ? ' dimtxt' : '') + '" style="flex-wrap:wrap">' + esc(x.d.name) + (s >= 4 ? '<span class="tag">NÊN GỌI</span>' : bad ? '<span class="tag out">NÊN TRÁNH</span>' : '') + '</div><div class="mute">' + (x.st.my != null ? 'Bạn chấm ' + fmt(x.st.my) + ' · đã gọi ' + x.st.times + ' lần' : x.st.grp != null ? 'Nhóm chấm ' + fmt(x.st.grp) + ' · bạn chưa thử' : 'Chưa ai thử') + '</div></div><div class="sm b' + (bad ? ' dimtxt' : '') + '">' + esc(x.d.price || '') + '</div></div>'; }).join('') + '</div>';
  h += '<form class="row" data-form="adddish"><label class="sr" for="newdish">Thêm món vào menu</label><input id="newdish" name="n" type="text" placeholder="Thêm món vào menu…" autocomplete="off"><input name="p" type="text" placeholder="Giá" style="width:96px" autocomplete="off"><button class="btn sm" type="submit">Thêm</button></form>';
  // combo
  const nx = L.comboFor(p).slice(0, 2);
  if (nx.length) h += nx.slice(0, 1).map(x => '<button class="card row linkish" style="padding:12px 14px;gap:12px;text-align:left;width:100%" data-act="open" data-id="' + esc(x.p.id) + '">' + blob(x.p, 44, 1) + '<span class="col grow" style="gap:2px"><span class="lbl">Ăn xong đi tiếp</span><span class="b">' + esc(x.p.name) + (x.d != null ? ' · cách ' + L.distTxt(x.d) : '') + '</span></span>' + ic('next', 20, 2.2) + '</button>').join('');
  // lịch sử
  const hist = S.meals.filter(m => m.place_id === p.id).sort((a, b) => new Date(b.at) - new Date(a.at));
  if (hist.length) h += '<h2 class="lbl">Lịch sử đi · ' + hist.length + '</h2><div class="card" style="padding:4px 14px">' + hist.slice(0, 10).map((m, i) => '<div class="mrow' + (i < Math.min(hist.length, 10) - 1 ? ' bb' : '') + '"><div class="col grow" style="gap:2px"><div class="sm b">' + esc(when(m.at)) + (m.created_by !== L.me() ? ' · ' + esc(memberName(m.created_by)) : '') + '</div><div class="mute">' + esc([m.total ? money(m.total) : '', m.with_text ? 'với ' + m.with_text : '', m.note || ''].filter(Boolean).join(' · ') || (m.rated ? 'Đã chấm' : 'Chưa chấm')) + '</div></div>' + (m.score ? '<div class="num m">' + fmt(m.score) + '</div>' : (!m.rated && m.created_by === L.me() ? '<button class="btn sm" data-act="rate" data-id="' + esc(m.id) + '">Chấm</button>' : '')) + '</div>').join('') + '</div>';
  if (p.note) h += '<div class="card mute">Ghi chú: ' + esc(p.note) + '</div>';
  if (p.lat != null) h += '<div id="map" class="map small" role="img" aria-label="Vị trí quán trên bản đồ"></div>';
  h += '<div class="row"><button class="btn sm grow" data-act="edit" data-id="' + esc(p.id) + '">Sửa thông tin và tag</button><button class="btn sm" data-act="wish" data-id="' + esc(p.id) + '">' + (p.wish ? 'Bỏ Muốn thử' : 'Muốn thử') + '</button></div>';
  h += '<button class="btn sm ghost" data-act="del" data-id="' + esc(p.id) + '">' + (U.delArm === p.id ? 'Bấm lần nữa để xóa hẳn quán này' : 'Xóa quán') + '</button>';
  h += '<div class="stickybar"><button class="btn pri grow tall" data-act="commitq" data-id="' + esc(p.id) + '"' + (p.status !== 'active' ? ' disabled' : '') + '>Chốt quán này</button><a class="btn tall" target="_blank" rel="noopener" href="' + esc(mapsHref(p)) + '">' + ic('pin', 18) + 'Chỉ đường</a></div>';
  return h;
}
function quanView(){ if (U.detail) return detailView(); return U.seg === 'ganday' ? recentView() : U.seg === 'yeuthich' ? favView() : U.seg === 'mon' ? dishView() : searchView(); }

// ---------- LƯU NHANH + HỘP CHỜ ----------
function migrateCard(){
  const old = lsG('hnag-db-quan', null);
  if (!old || !Object.keys(old).length || lsG('hnag2-migrated', false)) return '';
  return '<div class="card col"><b>Có ' + Object.keys(old).length + ' quán từ bản dùng thử trên máy này</b><div class="mute">Chuyển sang kho ' + esc((curGroup() || {}).name || '') + ' để dùng tiếp và đồng bộ.</div><button class="btn pri" data-act="migrate">Chuyển dữ liệu sang</button></div>';
}
function luuView(){
  if (U.draft) return editView();
  let h = '<h1>LƯU NHANH</h1>';
  h += '<form class="card col" data-form="quick"><label class="f">Dán link Google Maps, TikTok, Threads… hoặc gõ tên quán<textarea name="v" rows="2" data-f="quick" placeholder="https://maps.app.goo.gl/…  hoặc  Lẩu Thái cô Ba" autocomplete="off">' + esc(U.quick) + '</textarea></label><div class="row"><button class="btn pri grow" type="submit"' + (U.quick.trim() ? '' : ' disabled') + '>Lưu vào Hộp chờ</button><button class="btn" type="button" data-act="paste">Dán</button></div>' + (U.reading ? '<div class="mute" role="status">Đang đọc ' + U.reading + ' link… bạn cứ lưu tiếp.</div>' : '<div class="mute">Đọc link chạy nền. Quán trùng sẽ được báo thay vì lưu hai lần.</div>') + '</form>';
  h += migrateCard();
  const inbox = S.places.filter(p => p.status === 'inbox').sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  h += '<div class="row between"><h2 class="big">HỘP CHỜ</h2>' + (inbox.length ? '<span class="sticker ink">' + inbox.length + ' QUÁN CHỜ GẮN TAG</span>' : '') + '</div>';
  if (!inbox.length) h += '<div class="card mute">Trống. Quán vừa lưu chưa có tag sẽ nằm ở đây; AI đề xuất sẵn tag, bạn duyệt lúc rảnh.</div>';
  else {
    const noSug = inbox.filter(p => !p.sug).length, okn = inbox.filter(p => p.sug && p.sug.food && p.sug.form).length;
    if (noSug) h += '<button class="btn dashed-lime" data-act="suggest"' + (S.online && !U.busyAI ? '' : ' disabled') + '>' + (U.busyAI ? 'AI đang đoán tag…' : 'Nhờ AI gợi ý tag cho ' + Math.min(noSug, 30) + ' quán') + '</button>' + (S.online ? '' : '<div class="mute">Cần mạng để AI gợi ý tag.</div>');
    if (okn > 1) h += '<button class="btn sm" data-act="okall">Duyệt cả ' + okn + ' gợi ý, sửa sau nếu sai</button>';
    h += '<div class="col">' + inbox.slice(0, 80).map(inboxCard).join('') + '</div>';
    if (inbox.length > 80) h += '<div class="mute center">Còn ' + (inbox.length - 80) + ' quán nữa, hiện dần khi bạn duyệt xong các quán trên.</div>';
  }
  h += '<h2 class="lbl">Nhập hàng loạt</h2><div class="card col"><div class="b">Từ Google Maps (Google Takeout)</div><div class="mute">Tải dữ liệu "Đã lưu" từ takeout.google.com, rồi chọn file .zip (hoặc các file .csv bên trong).</div><label class="btn">Chọn file Takeout<input type="file" class="sr" data-f="import" accept=".zip,.csv,.json" multiple></label><div class="sep"></div><div class="b">Từ file sao lưu của bản dùng thử</div><label class="btn ghost">Chọn file .json<input type="file" class="sr" data-f="oldbackup" accept=".json,application/json"></label></div>';
  return h;
}
function inboxCard(p, i){
  const sg = p.sug;
  const head = '<div class="row" style="gap:12px">' + blob(p, 48, i) + '<button class="col grow linkish" style="gap:2px;text-align:left;min-width:0" data-act="open" data-id="' + esc(p.id) + '"><span class="qname">' + esc(p.name) + '</span><span class="mute ell">' + esc(sg ? (sg.food ? 'AI đoán từ tên và link' : 'AI đoán: có vẻ không phải chỗ ăn uống') : p.list ? 'Từ danh sách "' + p.list + '"' : p.address || (p.source_url ? 'Từ ' + hostOf(p.source_url) : 'Chưa vào vòng quay')) + '</span></button></div>';
  if (!sg) return '<div class="card col" style="padding:12px 14px;gap:8px">' + head + '<div class="row"><button class="btn sm pri grow" data-act="edit" data-id="' + esc(p.id) + '">Gắn tag</button><button class="btn sm" data-act="delnow" data-id="' + esc(p.id) + '">Xóa</button></div></div>';
  if (!sg.food) return '<div class="card col" style="padding:12px 14px;gap:8px">' + head + '<div class="row"><button class="btn sm grow" data-act="edit" data-id="' + esc(p.id) + '">Vẫn gắn tag</button><button class="btn sm grow" data-act="delnow" data-id="' + esc(p.id) + '">Xóa</button></div></div>';
  const pills = [sg.form, sg.cuisine ? 'Món ' + sg.cuisine : '', sg.type, ...(sg.mood || [])].filter(Boolean);
  return '<div class="card col" style="padding:12px 14px;gap:8px">' + head + '<div class="wrap">' + pills.map(t => '<span class="pill dashed">' + esc(t) + '</span>').join('') + '</div><div class="row"><button class="btn sm pri grow" data-act="oksug" data-id="' + esc(p.id) + '">Duyệt</button><button class="btn sm grow" data-act="edit" data-id="' + esc(p.id) + '">Sửa</button></div></div>';
}
const hostOf = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return 'link'; } };
function editView(){
  const d = U.draft; const t = d.tags; const sweet = C.SWEET.includes(t.form); const bands = sweet ? L.drinkBands() : L.foodBands();
  const extra = L.prefs().extraTags || {};
  let h = '<div class="row"><button class="btn icon" data-act="canceledit" aria-label="Quay lại">' + ic('back', 22, 2.2) + '</button><h1 class="grow" style="font-size:32px">' + (d.isNew ? 'QUÁN MỚI' : 'SỬA QUÁN') + '</h1></div>';
  h += '<div class="card col"><label class="f">Tên quán<input type="text" data-d="name" value="' + esc(d.name) + '" autocomplete="off"></label><label class="f">Địa chỉ<input type="text" data-d="address" value="' + esc(d.address || '') + '" autocomplete="off"></label><label class="f">Khu vực (quận, phường)<input type="text" data-dt="area" value="' + esc(t.area || '') + '" list="areas" placeholder="Ví dụ: Bình Thạnh" autocomplete="off"></label><datalist id="areas">' + L.areasList().map(a => '<option value="' + esc(a) + '">').join('') + '</datalist><label class="f">Link Google Maps<input type="url" data-d="map_url" value="' + esc(d.map_url || '') + '" placeholder="Dán link để có tọa độ và nút Chỉ đường" autocomplete="off"></label>' + (d.lat != null ? '<div class="mute">Đã có tọa độ ' + d.lat.toFixed(4) + ', ' + d.lng.toFixed(4) + '</div>' : '') + '</div>';
  const sec = (title, arr, key, multi) => '<div class="col g6"><h2 class="lbl">' + title + '</h2><div class="wrap">' + arr.map(v => chip(esc(v), multi ? (t[key] || []).includes(v) : t[key] === v, 'dset', key + '|' + (multi ? 'm' : 's') + '|' + v)).join('') + '</div></div>';
  h += '<div class="col g6"><h2 class="lbl">Loại món · là ô trên vòng quay</h2>' + C.GNAMES.map(g => '<div class="mute" style="margin-top:4px">' + g + '</div><div class="wrap">' + C.GROUPS[g].map(v => chip(esc(v), t.form === v, 'dset', 'form|s|' + v)).join('') + '</div>').join('') + '</div>';
  h += sec('Ẩm thực', [...C.CUISINE, ...(extra.cuisine || [])], 'cuisine') + sec('Loại hình quán', [...C.TYPE, ...(extra.type || [])], 'type') + sec('Hợp với mood', [...C.TAG_MOOD.filter(m => m !== 'Khám phá'), ...(extra.mood || [])], 'mood', true) + sec('Hợp đi với', C.WHO, 'who', true) + sec('Bữa', C.MEAL, 'meal', true) + sec('Dịp', [...C.OCCASION, ...(extra.occasion || [])], 'occasion', true) + sec('Thời tiết', C.WEATHER, 'weather', true);
  h += '<div class="col g6"><h2 class="lbl">Giá mỗi người · thang ' + (sweet ? 'đồ uống, dessert' : 'đồ ăn') + '</h2><div class="wrap">' + bands.map((b, i) => chip(C.bandLabel(b), d.pmin === b[0] && d.pmax === b[1], 'dprice', i)).join('') + '</div><div class="row"><label class="f grow">Từ (nghìn)<input type="number" inputmode="numeric" data-d="pmin" value="' + (d.pmin ?? '') + '"></label><label class="f grow">Đến (nghìn)<input type="number" inputmode="numeric" data-d="pmax" value="' + (d.pmax != null && d.pmax < 9999 ? d.pmax : '') + '"></label></div></div>';
  h += '<div class="row" style="align-items:flex-end"><label class="f grow">Mở cửa<input type="time" data-d="open_time" value="' + esc(d.open_time || '') + '"></label><label class="f grow">Đóng cửa<input type="time" data-d="close_time" value="' + esc(d.close_time || '') + '"></label></div>';
  h += '<label class="f">Ghi chú<input type="text" data-d="note" value="' + esc(d.note || '') + '" autocomplete="off"></label>';
  h += '<label class="row check"><input type="checkbox" data-d="wish"' + (d.wish ? ' checked' : '') + '>Quán chưa đi, cho vào Muốn thử</label>';
  h += '<div class="row"><button class="btn pri grow" data-act="saveedit"' + (d.name.trim() && t.form ? '' : ' disabled') + '>' + (d.status === 'inbox' ? 'Lưu vào vòng quay' : 'Lưu thay đổi') + '</button><button class="btn" data-act="canceledit">Hủy</button></div>';
  if (!(d.name.trim() && t.form)) h += '<div class="mute">Cần tên quán và loại món để vào vòng quay.</div>';
  if (d.status === 'inbox' && d.name.trim()) h += '<button class="btn sm ghost" data-act="saveinbox">Lưu, để lại Hộp chờ</button>';
  return h;
}

// ---------- ĐANG HOT ----------
function hotView(){
  const H = U.hot;
  const areas = L.areasList();
  let h = '<h1>ĐANG HOT GÌ?</h1>';
  h += '<div class="hscroll">' + chip(ic('pin', 16) + esc(H.area || 'Quanh TP.HCM'), true, 'sheet', 'hotarea') + ['Món ăn','Dessert','Ăn vặt','Đồ uống','Quán nhậu'].map(c => chip(c, H.cat === c, 'hotcat', c)).join('') + '</div>';
  h += '<div class="row"><button class="btn pri grow" data-act="hotsearch"' + (S.online && !U.hotBusy ? '' : ' disabled') + '>' + (U.hotBusy ? 'Đang tìm trên web…' : H.items ? 'Tìm lại' : 'Tìm món đang hot') + '</button><div class="grow mute">' + (H.at ? 'Tìm lúc ' + when(H.at).replace('Hôm nay ', '') + ' trên web' : 'Chỉ tìm khi bạn bấm') + '</div></div>';
  if (!S.online) h += offlineCard('Đang hot gì? cần mạng để tìm trên web.');
  if (H.items && H.items.length) h += '<div class="col">' + H.items.map((x, i) => '<div class="card col" style="padding:12px 14px;gap:6px"><div class="row" style="gap:12px">' + blob(null, 56, i) + '<div class="col grow" style="gap:2px;min-width:0"><div class="b">' + esc(x.name) + '</div><div class="mute">' + esc([x.dish, x.area].filter(Boolean).join(' · ')) + '</div>' + (x.why ? '<div class="mute">' + esc(x.why) + '</div>' : '') + '</div></div><div class="row">' + (x.url ? '<a class="grow linkmute" target="_blank" rel="noopener" href="' + esc(x.url) + '">' + ic('link', 16) + esc(x.source || hostOf(x.url)) + '</a>' : '<a class="grow linkmute" target="_blank" rel="noopener" href="' + mapsSearch(x.name + ' ' + (x.area || '')) + '">' + ic('pin', 16) + 'Trang Google Maps</a>') + (S.places.some(p => p.name.toLowerCase() === String(x.name).toLowerCase()) ? '<span class="mute">Đã lưu</span>' : '<button class="btn sm" data-act="hotsave" data-i="' + i + '">Lưu vào Muốn thử</button>') + '</div></div>').join('') + '</div>';
  else if (H.items && !H.items.length && !H.fallback) h += '<div class="card mute">Không tìm thấy gì đủ chắc chắn lần này. Thử khu vực hoặc loại khác.</div>';
  if (H.fallback || !H.items){
    const q = (H.cat && H.cat !== 'Món ăn' ? H.cat.toLowerCase() : 'quán ăn') + ' hot ' + (H.area || 'Sài Gòn');
    h += '<div class="card col"><div class="b">' + (H.fallback ? 'Tìm kiếm web của AI chưa dùng được ở gói miễn phí lúc này.' : 'Hoặc tự xem nhanh') + '</div><div class="mute">Mở thẳng kết quả tìm kiếm theo khu vực bạn chọn:</div><a class="btn" target="_blank" rel="noopener" href="' + tiktokSearch(q) + '">' + ic('fire', 18) + 'Xem trên TikTok</a><a class="btn" target="_blank" rel="noopener" href="' + mapsSearch(q.replace(' hot', '')) + '">' + ic('pin', 18) + 'Xem trên Google Maps</a><a class="btn ghost" target="_blank" rel="noopener" href="https://www.threads.net/search?q=' + encodeURIComponent(q) + '">Xem trên Threads</a><div class="mute">Ưng quán nào thì bấm Chia sẻ, dán link về ô Lưu.</div></div>';
  }
  h += '<div class="mute center">Kết quả từ tìm kiếm web nên có thể thiếu. Luôn kèm link gốc để bạn tự kiểm tra.</div>';
  return h;
}
function offlineCard(t){ return '<div class="card col offline">' + ic('nowifi', 22) + '<b>Đang mất mạng</b><div class="mute">' + esc(t) + ' Vòng quay, danh sách quán và chấm điểm vẫn dùng được.</div></div>'; }

// ---------- NHÓM ----------
function nhomView(){
  let h = '<h1>NHÓM</h1><div class="card" style="padding:4px 14px">';
  h += S.groups.map((g, i) => { const cnt = g.id === S.gid ? S.places.length : null; return '<div class="mrow' + (i < S.groups.length - 1 ? ' bb' : '') + '"><div class="col grow" style="gap:2px"><div class="b">' + esc(g.name) + '</div><div class="mute">' + (g.kind === 'personal' ? 'Chỉ mình bạn' : (g.id === S.gid ? S.members.length + ' người' : 'Nhóm chung')) + (cnt != null ? ' · ' + cnt + ' quán' : '') + '</div></div>' + (g.id === S.gid ? '<span class="tag ink">ĐANG DÙNG</span>' : '<button class="btn sm" data-act="switchg" data-id="' + esc(g.id) + '">Chuyển</button>') + '</div>'; }).join('');
  h += '</div><div class="row">' + (isShared() ? '<button class="btn pri grow" data-act="invite">' + ic('link', 18) + 'Mời vào nhóm</button>' : '') + '<button class="btn' + (isShared() ? '' : ' pri grow') + '" data-act="sheet" data-v="newgroup">Tạo nhóm mới</button></div>';
  if (isShared()){
    const g = curGroup(); const admin = g.role === 'admin';
    h += '<h2 class="lbl">Thành viên · ' + esc(g.name) + '</h2><div class="card" style="padding:4px 14px">' + S.members.map((m, i) => '<div class="mrow' + (i < S.members.length - 1 ? ' bb' : '') + '"><div class="row grow"><div class="ava">' + esc((m.name || '?').charAt(0).toUpperCase()) + '</div><div class="col" style="gap:0"><span class="b">' + esc(m.name || 'Thành viên') + (m.user_id === L.me() ? ' (bạn)' : '') + '</span><span class="mute">' + (m.role === 'admin' ? 'Quản trị' : 'Thành viên') + '</span></div></div>' + (admin && m.user_id !== L.me() ? '<button class="btn sm ghost" data-act="kick" data-id="' + esc(m.user_id) + '">Xóa</button>' : '') + '</div>').join('') + '</div>';
    h += '<div class="row">' + (admin ? '<button class="btn sm grow" data-act="sheet" data-v="rename">Đổi tên nhóm</button>' : '') + '<button class="btn sm grow ghost" data-act="leave">' + (U.delArm === 'leave' ? 'Bấm lần nữa để rời nhóm' : 'Rời nhóm') + '</button></div>';
  }
  const pf = L.prefs();
  h += '<h2 class="lbl">Cài đặt</h2><div class="card" style="padding:4px 14px">';
  h += '<label class="mrow bb b"><span class="grow">Nhắc chấm điểm sau khi chốt quán</span><input type="checkbox" role="switch" data-pref="remind"' + (pf.remind !== false ? ' checked' : '') + '></label>';
  h += '<button class="mrow bb linkish" data-act="sheet" data-v="remindh"><span class="grow b">Nhắc sau</span><span class="mute">' + (pf.remindHours ?? 3) + ' giờ</span>' + ic('next', 16, 2.2) + '</button>';
  h += '<button class="mrow bb linkish" data-act="sheet" data-v="bands-food"><span class="grow b">Khung giá đồ ăn</span><span class="mute">' + L.foodBands().length + ' mức</span>' + ic('next', 16, 2.2) + '</button>';
  h += '<button class="mrow bb linkish" data-act="sheet" data-v="bands-drink"><span class="grow b">Khung giá đồ uống, dessert</span><span class="mute">' + L.drinkBands().length + ' mức</span>' + ic('next', 16, 2.2) + '</button>';
  h += '<button class="mrow bb linkish" data-act="sheet" data-v="tags"><span class="grow b">Danh mục tag</span><span class="mute">7 nhóm</span>' + ic('next', 16, 2.2) + '</button>';
  h += '<button class="mrow linkish" data-act="sheet" data-v="combo"><span class="grow b">Bảng ghép combo ăn và uống</span><span class="mute">' + L.comboRules().length + ' cặp</span>' + ic('next', 16, 2.2) + '</button></div>';
  if (D.isAnon()) h += '<h2 class="lbl">Tài khoản</h2><div class="card col"><div class="row between"><div class="col" style="gap:0"><span class="b">' + esc(S.profile ? S.profile.name : '') + '</span><span class="mute">Đang dùng chế độ khách trên máy này</span></div><button class="btn sm" data-act="sheet" data-v="myname">Đổi tên</button></div><div class="mute">Dữ liệu được lưu trên máy chủ nhưng gắn với trình duyệt này. Gắn email để giữ dữ liệu lâu dài và mở được trên điện thoại lẫn máy tính.</div><form class="col" data-form="linkemail"><input type="email" name="email" required placeholder="Email của bạn" autocomplete="email"><button class="btn pri" type="submit">Gắn email, giữ dữ liệu</button></form>' + (U.linkMsg ? '<div class="mute" role="status">' + esc(U.linkMsg) + '</div>' : '') + '<div class="row"><button class="btn sm grow" data-act="export">Tải bản sao lưu</button><button class="btn sm grow ghost" data-act="wantlogin">' + (U.delArm === 'wantlogin' ? 'Bấm lần nữa: rời chế độ khách' : 'Đăng nhập tài khoản có sẵn') + '</button></div>' + (installHint() ? '<div class="mute">' + installHint() + '</div>' : '') + '</div>';
  else h += '<h2 class="lbl">Tài khoản</h2><div class="card col"><div class="row between"><div class="col" style="gap:0"><span class="b">' + esc(S.profile ? S.profile.name : '') + '</span><span class="mute">' + esc(S.user ? S.user.email : '') + '</span></div><button class="btn sm" data-act="sheet" data-v="myname">Đổi tên</button></div><div class="row"><button class="btn sm grow" data-act="export">Tải bản sao lưu</button><button class="btn sm grow ghost" data-act="logout">Đăng xuất</button></div>' + (installHint() ? '<div class="mute">' + installHint() + '</div>' : '') + '</div>';
  h += '<button class="btn sm ghost" data-act="seg" data-v="ganday" data-go="quan">Các bữa đã đi nằm ở Quán › Gần đây</button>';
  return h;
}
function installHint(){ if (matchMedia('(display-mode: standalone)').matches) return ''; return /iphone|ipad/i.test(navigator.userAgent) ? 'Mẹo: Safari › Chia sẻ › Thêm vào MH chính để dùng như app.' : 'Mẹo: menu trình duyệt › Thêm vào màn hình chính để dùng như app.'; }

// ---------- CÙNG CHỌN ----------
function sessView(){
  const s = U.sess; if (!s || !s.session) return '<h1>CÙNG CHỌN</h1><div class="card mute">' + (s && s.err ? esc(s.err) : 'Đang mở phiên…') + '</div><button class="btn" data-act="closesess">Về Hôm nay</button>';
  const ss = s.session, votes = s.votes, mine = votes.find(v => v.user_id === L.me()) || { excluded:[], done:false };
  const opts = ss.options || []; const exAll = new Set(votes.flatMap(v => v.excluded || []));
  const remain = opts.filter(o => !exAll.has(o));
  const members = S.members.length ? S.members : [{ user_id:L.me(), name:S.profile.name }];
  const doneN = members.filter(m => (votes.find(v => v.user_id === m.user_id) || {}).done).length;
  const isOwner = ss.created_by === L.me(); const canSpin = isOwner || doneN >= members.length;
  let h = '<div class="row"><button class="btn icon" data-act="closesess" aria-label="Quay về Hôm nay">' + ic('back', 22, 2.2) + '</button><h1>CÙNG CHỌN</h1></div>';
  if (ss.result){
    const p = P(ss.result.place_id);
    h += '<div class="mute">' + esc(memberName(ss.result.by)) + ' đã quay cho cả nhóm</div><div class="card col pop" style="gap:8px"><div class="lbl">Quay ra: ' + esc(ss.result.form) + '</div>' + (p ? hero(p, 100) + '<div class="big-name">' + esc(p.name) + '</div><div class="mute">' + esc(metaOf(p)) + '</div><div class="row"><button class="btn pri grow" data-act="commitq" data-id="' + esc(p.id) + '">Chốt quán này</button><a class="btn" target="_blank" rel="noopener" href="' + esc(mapsHref(p)) + '">' + ic('pin', 18) + 'Chỉ đường</a></div>' : '<div class="big-name">' + esc(ss.result.place_name) + '</div>') + '</div>' + (isOwner ? '<button class="btn" data-act="sessreopen">Quay lại từ đầu</button>' : '');
    return h;
  }
  h += '<div class="mute">Mỗi người loại món mình không muốn. Đủ phiếu thì quay trên phần còn lại, cả nhóm cùng thấy kết quả.</div>';
  h += '<div class="card col" style="gap:10px"><div class="row between"><div class="b">' + esc((curGroup() || {}).name || 'Nhóm') + '</div><div class="sticker">' + doneN + '/' + members.length + ' ĐÃ VOTE</div></div>' + members.map((m, i) => { const v = votes.find(x => x.user_id === m.user_id); return '<div class="row"><div class="ava">' + esc((m.name || '?').charAt(0).toUpperCase()) + '</div><div class="grow b">' + esc(m.user_id === L.me() ? 'Bạn' : (m.name || 'Thành viên')) + '</div><div class="sm b ' + (v && v.done ? 'lime' : 'mutec') + '">' + (v && v.done ? 'Đã vote' : v ? 'Đang chọn…' : 'Chưa mở') + '</div></div>'; }).join('') + '</div>';
  h += '<div class="col g8"><h2 class="lbl">Loại món, chạm để loại</h2><div class="wrap">' + opts.map(o => { const by = votes.filter(v => (v.excluded || []).includes(o)); const meX = (mine.excluded || []).includes(o); if (!by.length) return chip(esc(o), true, 'sessx', o); return '<button type="button" class="chip struck" data-act="sessx" data-v="' + esc(o) + '" aria-pressed="false"><s>' + esc(o) + '</s> · ' + (meX && by.length === 1 ? 'bạn loại' : by.length + ' người loại') + '</button>'; }).join('') + '</div><div class="mute">Còn ' + remain.length + ' loại món</div></div>';
  h += '<div class="col g8" style="margin-top:auto"><button class="btn pri tall" data-act="sessspin"' + (canSpin && remain.length ? '' : ' disabled') + '>' + (remain.length ? 'Quay cho cả nhóm' : 'Đã loại hết món, gỡ bớt nhé') + '</button><div class="row"><button class="btn grow" data-act="sessshare">' + ic('link', 18) + 'Gửi link mời vote</button><button class="btn" data-act="sessdone">' + (mine.done ? 'Sửa phiếu' : 'Xong phiếu') + '</button></div>' + (!canSpin ? '<div class="mute center">Người tạo phiên quay được bất cứ lúc nào; người khác quay được khi đủ phiếu.</div>' : '') + '</div>';
  return h;
}

// ---------- SHEETS ----------
function filterSheet(){
  const f = U.f, n = L.candidates(f).length, ar = L.areasList();
  const sec = (t, arr, key) => '<div class="col g6"><h2 class="lbl">' + t + '</h2><div class="wrap">' + arr.map(v => chip(esc(v), f[key].includes(v), 'fmulti', key + '|' + v)).join('') + '</div></div>';
  let h = sheetHead('TẤT CẢ BỘ LỌC', 'Lựa chọn được nhớ cho lần sau');
  h += '<div class="col g6"><h2 class="lbl">Đi với ai</h2><div class="wrap">' + C.WHO.map(w => chip(w, f.who === w, 'who', w)).join('') + '</div><div class="mute">Quán chưa gắn "Hợp đi với" vẫn được tính là hợp.</div></div>';
  h += sec('Nhóm món', C.GNAMES, 'group') + sec('Loại món', C.FORM, 'forms') + sec('Ẩm thực', C.CUISINE, 'cuisine') + sec('Loại hình quán', C.TYPE, 'type') + sec('Dịp', C.OCCASION, 'occasion') + sec('Thời tiết', C.WEATHER, 'weather');
  h += '<div class="col g6"><h2 class="lbl">Ngân sách mỗi người · khoảng tùy ý</h2><div class="row"><label class="f grow">Từ (nghìn)<input type="number" inputmode="numeric" data-ff="priceMin" value="' + (f.priceMin ?? '') + '"></label><label class="f grow">Đến (nghìn)<input type="number" inputmode="numeric" data-ff="priceMax" value="' + (f.priceMax ?? '') + '"></label></div></div>';
  if (ar.length) h += '<div class="col g6"><h2 class="lbl">Khu vực</h2><div class="wrap">' + ar.map(a => chip(esc(a), f.area === a, 'farea', a)).join('') + '</div></div>';
  h += '<div class="col g6"><h2 class="lbl">Giờ và bữa</h2><div class="wrap">' + chip('Chỉ quán đang mở', f.open && !f.plan, 'fopen', '1') + chip('Lên kế hoạch ngày khác', f.plan, 'fplan', '1') + chip('Hợp bữa ' + C.mealNow().toLowerCase(), f.meal, 'fmeal', '1') + '</div><div class="mute">Quán chưa nhập giờ hoặc bữa vẫn được tính là hợp.</div></div>';
  h += '<div class="row stickyb"><button class="btn pri grow" data-act="close">Xem ' + n + ' quán hợp</button><button class="btn" data-act="fclear">Xóa hết</button></div>';
  return sheet('Tất cả bộ lọc', h);
}
function locSheet(){
  const f = U.f; const ar = L.areasList();
  let h = sheetHead('KHU VỰC', L.G.posErr === 'denied' ? 'Trình duyệt chưa cho dùng vị trí, chọn khu vực bên dưới.' : L.G.pos ? 'Đang dùng vị trí hiện tại' : 'Cho phép vị trí để lọc theo bán kính');
  h += '<div class="col g6"><h2 class="lbl">Quanh đây</h2><div class="wrap">' + C.RADII.map(r => chip(r + ' km', f.radius === r && !f.area, 'radius', r)).join('') + chip('Mọi khoảng cách', !f.radius && !f.area, 'radius', '') + '</div></div>';
  if (ar.length) h += '<div class="col g6"><h2 class="lbl">Hẹn ở khu vực</h2><div class="wrap">' + ar.map(a => chip(esc(a), f.area === a, 'farea', a)).join('') + '</div></div>';
  else h += '<div class="mute">Gắn "Khu vực" cho quán khi sửa tag để chọn theo quận.</div>';
  const noPos = S.places.filter(p => L.ready(p) && p.lat == null).length;
  if (noPos && f.radius) h += '<div class="mute">' + noPos + ' quán chưa có tọa độ vẫn được tính. Dán link Google Maps khi sửa quán để có tọa độ.</div>';
  return sheet('Khu vực', h + '<button class="btn pri" data-act="close">Xong</button>');
}
function sortSheet(){ return sheet('Sắp xếp', sheetHead('SẮP XẾP') + '<div class="col">' + SORTS.map(s => '<button class="btn between' + (U.sort === s[0] ? ' pri' : '') + '" data-act="sortby" data-v="' + s[0] + '">' + s[1] + (U.sort === s[0] ? ic('star', 16) : '') + '</button>').join('') + '</div>'); }
function groupsSheet(){ return sheet('Đổi nhóm', sheetHead('ĐANG CHỌN CHO', 'Quán và điểm theo từng nhóm') + '<div class="col">' + S.groups.map(g => '<button class="btn between' + (g.id === S.gid ? ' pri' : '') + '" data-act="switchg" data-id="' + esc(g.id) + '"><span>' + esc(g.name) + '</span><span class="sm">' + (g.kind === 'personal' ? 'Cá nhân' : 'Nhóm') + '</span></button>').join('') + '</div><button class="btn ghost" data-act="sheet" data-v="newgroup">Tạo nhóm mới</button>'); }
function rateSheet(){
  const r = U.rate; const p = P(r.place_id); const avg = rateAvg(); const sc = r.manual || avg;
  let h = sheetHead('BỮA VỪA RỒI THẾ NÀO?', esc((p && p.name) || r.place_name) + ' · ' + esc(when(r.at)));
  h += '<h2 class="lbl">Chạm sao cho món đã ăn · chạm lại để bỏ</h2><div class="card" style="padding:2px 14px">' + r.dishes.map((d, i) => '<div class="col bb" style="gap:0;padding:8px 0 2px"><div class="row between"><div class="b">' + esc(d.name) + (d.stars ? '' : '<span class="mute"> · chưa chấm</span>') + '</div><label class="btn icon plain' + (S.online ? '' : ' dis') + '" aria-label="Thêm ảnh món ' + esc(d.name) + '">' + (d.photo ? '<span class="thumb sm" style="background-image:url(' + esc(d.photo) + ')"></span>' : ic('cam', 18)) + '<input type="file" accept="image/*" class="sr" data-f="dishphoto" data-i="' + i + '"' + (S.online ? '' : ' disabled') + '></label></div>' + stars(d.stars, 'dstar', i, d.name) + '</div>').join('') + '<form class="row" style="padding:10px 0" data-form="ratedish"><label class="sr" for="nd">Thêm món đã ăn</label><input id="nd" name="n" type="text" placeholder="Thêm món đã ăn…" autocomplete="off"><button class="btn sm" type="submit">Thêm</button></form></div>';
  h += '<div class="card col"><div class="row" style="gap:12px"><div class="num xl' + (sc ? '' : ' dim') + '">' + (sc ? fmt(sc) : '–') + '</div><div class="col grow" style="gap:0"><div class="b">Điểm quán</div><div class="mute">' + (r.manual ? 'Bạn tự chấm' : avg ? 'Trung bình các món, sửa được' : 'Chấm món, hoặc chạm sao bên dưới') + '</div></div></div>' + stars(Math.round(sc || 0), 'qstar', 0, 'quán') + '<div class="row">' + chip('Sẽ quay lại', r.again === 'yes', 'ragain', 'yes') + chip('Không quay lại', r.again === 'no', 'ragain', 'no') + '</div>' + (r.again === 'no' ? '<div class="mute">Quán sẽ bị loại khỏi mọi gợi ý. Gỡ được ở trang quán.</div>' : '') + '</div>';
  h += '<div class="card col"><label class="f">Tổng tiền (đồng)<input type="number" inputmode="numeric" data-r="total" value="' + (r.total ?? '') + '" placeholder="Không bắt buộc"></label>';
  if (isShared() && S.members.length > 1) h += '<div class="col g6"><div class="f" style="font-size:13px;font-weight:600">Đi với ai</div><div class="wrap">' + S.members.filter(m => m.user_id !== L.me()).map(m => chip(esc(m.name || 'Thành viên'), r.with_users.includes(m.user_id), 'rwith', m.user_id)).join('') + '</div></div>';
  h += '<label class="f">' + (isShared() ? 'Người khác (ngoài nhóm)' : 'Đi với ai') + '<input type="text" data-r="with_text" value="' + esc(r.with_text || '') + '" placeholder="Ví dụ: gia đình"></label><label class="f">Ghi chú<input type="text" data-r="note" value="' + esc(r.note || '') + '"></label></div>';
  h += '<div class="mute center">Không bắt buộc. Chấm một món thôi cũng được. Đóng giữa chừng thì nháp được giữ.</div><div class="row stickyb"><button class="btn pri grow" data-act="saverate">Lưu đánh giá</button><button class="btn" data-act="close">Để sau</button></div>';
  return sheet('Chấm điểm nhanh', h);
}
function rateAvg(){ const a = U.rate.dishes.filter(d => d.stars); return a.length ? a.reduce((x, y) => x + y.stars, 0) / a.length : 0; }
function scanSheet(){
  const s = U.scan; const p = P(s.pid);
  const exist = L.dishesOf(p); const names = new Set(s.items.map(x => x.name.toLowerCase()));
  const missing = exist.filter(d => !names.has(d.name.toLowerCase()));
  let h = sheetHead('MÓN ĐỌC TỪ ẢNH', 'Bỏ tick món đọc sai. AI có thể nhầm tên hoặc giá với ảnh mờ.');
  h += '<div class="card" style="padding:2px 14px">' + s.items.map((d, i) => { const e = exist.find(x => x.name.toLowerCase() === d.name.toLowerCase()); const tag = !e ? '<span class="tag">MỚI</span>' : (d.price && e.price !== d.price ? '<span class="tag ink">GIÁ ĐỔI ' + esc(e.price || '?') + ' → ' + esc(d.price) + '</span>' : ''); return '<label class="mrow bb"><input type="checkbox" data-f="scan" data-i="' + i + '"' + (d.on ? ' checked' : '') + '><span class="col grow" style="gap:2px"><span class="b">' + esc(d.name) + ' ' + tag + '</span>' + (d.category ? '<span class="mute">' + esc(d.category) + '</span>' : '') + '</span><span class="mute">' + esc(d.price || '') + '</span></label>'; }).join('') + '</div>';
  if (missing.length) h += '<h2 class="lbl">Không còn thấy trên menu · tick để ẩn</h2><div class="card" style="padding:2px 14px">' + missing.map(d => '<label class="mrow bb"><input type="checkbox" data-f="scangone" data-id="' + esc(d.id) + '"' + (s.gone.includes(d.id) ? ' checked' : '') + '><span class="grow b">' + esc(d.name) + '</span><span class="mute">' + esc(d.price || '') + '</span></label>').join('') + '</div>';
  h += '<div class="mute">Gộp với menu cũ theo tên món, điểm đã chấm được giữ nguyên.</div><div class="row stickyb"><button class="btn pri grow" data-act="savescan">Lưu vào menu</button><button class="btn" data-act="close">Bỏ</button></div>';
  return sheet('Món đọc từ ảnh menu', h);
}
function impSheet(){
  const im = U.imp; const lists = {}; im.items.forEach(x => { lists[x.list] = lists[x.list] || { n:0, on:0 }; lists[x.list].n++; if (x.on) lists[x.list].on++; });
  const on = im.items.filter(x => x.on).length, dup = im.items.filter(x => x.dup).length;
  let h = sheetHead('NHẬP TỪ GOOGLE MAPS', 'Tìm thấy ' + im.items.length + ' địa điểm trong ' + Object.keys(lists).length + ' danh sách' + (dup ? ' · ' + dup + ' đã có nên bỏ tick' : ''));
  if (im.skipped.length) h += '<div class="mute">Bỏ qua: ' + esc(im.skipped.join('; ')) + '</div>';
  h += '<div class="wrap">' + Object.keys(lists).map(k => chip(esc(k) + ' · ' + lists[k].on + '/' + lists[k].n, lists[k].on > 0, 'implist', k)).join('') + '</div>';
  h += '<div class="card" style="padding:2px 14px;max-height:38vh;overflow:auto">' + im.items.map((x, i) => '<label class="mrow bb"><input type="checkbox" data-f="imp" data-i="' + i + '"' + (x.on ? ' checked' : '') + '><span class="col grow" style="gap:0;min-width:0"><span class="ell b">' + esc(x.name) + '</span><span class="mute ell" style="font-size:11px">' + esc(x.list) + (x.dup ? ' · đã có' : '') + (x.note ? ' · ' + esc(x.note) : '') + '</span></span></label>').join('') + '</div>';
  h += '<div class="mute">Quán nhập vào nằm trong Hộp chờ, kèm link để chỉ đường. Nhờ AI gợi ý tag ở Hộp chờ cho nhanh.</div><div class="row stickyb"><button class="btn pri grow" data-act="impsave"' + (on ? '' : ' disabled') + '>Nhập ' + on + ' quán</button><button class="btn" data-act="close">Bỏ</button></div>';
  return sheet('Nhập từ Google Maps', h);
}
function dishSheet(){
  const x = U.dish; const mine = S.places.filter(p => L.formOf(p) === x.type && L.again(p) !== 'no' && L.ready(p)).sort((a, b) => L.weight(b, U.f) - L.weight(a, U.f)).slice(0, 5);
  let h = sheetHead(esc(x.name.toUpperCase()), esc(x.type || '') + ' · ' + (x.src === 'mine' ? 'Ở ' + esc(x.quan) + (x.ptxt ? ' · ' + esc(x.ptxt) : '') : 'giá tham khảo khoảng ' + x.price + 'k'));
  if (x.src === 'mine') h += '<button class="btn pri" data-act="open" data-id="' + esc(x.qid) + '">Mở trang quán</button>';
  h += '<h2 class="lbl">Quán của bạn thuộc loại ' + esc(x.type || 'này') + '</h2>' + (mine.length ? '<div class="col">' + mine.map((p, i) => qcard(p, i)).join('') + '</div>' : '<div class="card mute">Chưa lưu quán nào thuộc loại này.</div>');
  return sheet(x.name, h + findNew(x.name + ' gần đây'));
}
function bandsSheet(kind){
  const bands = kind === 'food' ? L.foodBands() : L.drinkBands();
  let h = sheetHead(kind === 'food' ? 'KHUNG GIÁ ĐỒ ĂN' : 'KHUNG GIÁ ĐỒ UỐNG', 'Nghìn đồng mỗi người. Dữ liệu cũ không bị sai khi đổi khung.');
  h += '<div class="col">' + bands.map((b, i) => '<div class="row"><input type="number" inputmode="numeric" data-band="' + kind + '|' + i + '|0" value="' + b[0] + '" aria-label="Từ"><span>–</span><input type="number" inputmode="numeric" data-band="' + kind + '|' + i + '|1" value="' + (b[1] >= 9999 ? '' : b[1]) + '" placeholder="trở lên" aria-label="Đến"><button class="btn icon" data-act="bandrm" data-v="' + kind + '|' + i + '" aria-label="Xóa mức">' + ic('x', 18) + '</button></div>').join('') + '</div>';
  h += '<div class="row"><button class="btn grow" data-act="bandadd" data-v="' + kind + '">Thêm mức</button><button class="btn ghost" data-act="bandreset" data-v="' + kind + '">Về mặc định</button></div><button class="btn pri" data-act="close">Xong</button>';
  return sheet('Khung giá', h);
}
function tagsSheet(){
  const ex = L.prefs().extraTags || {};
  const grp = [['mood','Mood',C.TAG_MOOD],['cuisine','Ẩm thực',C.CUISINE],['type','Loại hình quán',C.TYPE],['occasion','Dịp',C.OCCASION]];
  let h = sheetHead('DANH MỤC TAG', 'Thêm tag riêng của bạn. Loại món, bữa và thời tiết cố định để vòng quay và gợi ý chạy đúng.');
  grp.forEach(g => { h += '<div class="col g6"><h2 class="lbl">' + g[1] + '</h2><div class="wrap">' + g[2].map(v => '<span class="pill">' + esc(v) + '</span>').join('') + (ex[g[0]] || []).map(v => '<button class="chip on" data-act="tagrm" data-v="' + g[0] + '|' + esc(v) + '">' + esc(v) + ic('x', 12, 3) + '</button>').join('') + '</div><form class="row" data-form="tagadd" data-k="' + g[0] + '"><input name="t" type="text" placeholder="Thêm tag ' + g[1].toLowerCase() + '…" autocomplete="off"><button class="btn sm" type="submit">Thêm</button></form></div>'; });
  h += '<div class="col g6"><h2 class="lbl">Loại món</h2><div class="wrap">' + C.FORM.map(v => '<span class="pill">' + esc(v) + '</span>').join('') + '</div></div>';
  return sheet('Danh mục tag', h + '<button class="btn pri" data-act="close">Xong</button>');
}
function comboSheet(){
  const rules = L.comboRules();
  let h = sheetHead('GHÉP COMBO', 'Ăn món bên trái xong, app gợi ý chặng hai bên phải, trong khoảng 2 km.');
  h += rules.map((r, i) => '<div class="card col" style="gap:8px"><div class="row between"><div class="b">' + esc(r.label) + '</div><button class="btn icon" data-act="comborm" data-v="' + i + '" aria-label="Xóa cặp này">' + ic('x', 18) + '</button></div><div class="mute">Khi ăn: ' + esc([...(r.when.form || []), ...(r.when.cuisine || []).map(c => 'món ' + c), ...(r.when.type || [])].join(', ')) + '</div><div class="wrap">' + C.SWEET.concat(['Xôi & cháo','Mì & hủ tiếu']).map(f => chip(esc(f), (r.next || []).includes(f), 'combonext', i + '|' + f)).join('') + '</div></div>').join('');
  h += '<form class="card col" data-form="comboadd"><div class="b">Thêm cặp mới</div><label class="f">Khi ăn loại món<select name="form">' + C.FORM.map(f => '<option>' + esc(f) + '</option>').join('') + '</select></label><label class="f">Thì gợi ý<select name="next">' + C.SWEET.concat(['Xôi & cháo','Mì & hủ tiếu']).map(f => '<option>' + esc(f) + '</option>').join('') + '</select></label><button class="btn" type="submit">Thêm cặp</button></form>';
  return sheet('Ghép combo', h + '<div class="row"><button class="btn grow" data-act="comboreset">Về mặc định</button><button class="btn pri grow" data-act="close">Xong</button></div>');
}
function simpleInputSheet(title, label, key, val, act){ return sheet(title, sheetHead(title) + '<form class="col" data-form="' + act + '"><label class="f">' + label + '<input name="v" type="text" value="' + esc(val || '') + '" required autocomplete="off"></label><button class="btn pri" type="submit">Lưu</button></form>'); }
function remindSheet(){ const v = L.prefs().remindHours ?? 3; return sheet('Nhắc sau', sheetHead('NHẮC CHẤM ĐIỂM SAU') + '<div class="wrap">' + [1,2,3,4,5,6].map(n => chip(n + ' giờ', v === n, 'remindh', n)).join('') + '</div><button class="btn pri" data-act="close">Xong</button>'); }
function joinSheet(){ const j = U.join; return sheet('Tham gia nhóm', sheetHead('THAM GIA NHÓM') + (j.preview ? '<div class="card col"><div class="b">' + esc(j.preview.name) + '</div><div class="mute">' + j.preview.member_count + ' thành viên</div></div><button class="btn pri" data-act="dojoin">Tham gia nhóm</button>' : '<div class="card mute">' + (j.err ? esc(j.err) : 'Đang kiểm tra link mời…') + '</div>') + '<button class="btn ghost" data-act="close">Để sau</button>'); }
function photoSheet(){ const p = P(U.detail); const i = U.photoI; const u = p.photos[i]; return sheet('Ảnh', '<div class="row between"><span class="mute">' + (i + 1) + '/' + p.photos.length + '</span><button class="btn icon" data-act="close" aria-label="Đóng">' + ic('x', 20) + '</button></div><img src="' + esc(u) + '" alt="Ảnh ' + esc(p.name) + '" style="width:100%;border-radius:22px">' + '<div class="row">' + (i ? '<button class="btn sm grow" data-act="setcover" data-i="' + i + '">Đặt làm ảnh đại diện</button>' : '') + '<button class="btn sm ghost" data-act="rmphoto" data-i="' + i + '">Xóa ảnh</button></div>'); }
function hotAreaSheet(){ const ar = L.areasList(); return sheet('Khu vực', sheetHead('TÌM Ở ĐÂU?') + '<form class="col" data-form="hotarea"><input name="v" type="text" value="' + esc(U.hot.area) + '" placeholder="Ví dụ: Quận 1, Bình Thạnh" list="hotareas" autocomplete="off"><datalist id="hotareas">' + ar.map(a => '<option value="' + esc(a) + '">').join('') + '</datalist><button class="btn pri" type="submit">Dùng khu vực này</button></form>' + (ar.length ? '<div class="wrap">' + ar.map(a => chip(esc(a), U.hot.area === a, 'hotareapick', a)).join('') + '</div>' : '')); }

// ---------- RENDER ----------
let map = null;
function render(){
  U.pending = false;
  const v = $('#view'), nav = $('#nav'), layer = $('#layer'), bar = $('#netbar');
  // thanh trạng thái mạng
  bar.innerHTML = !S.online ? '<div class="netbar">' + ic('nowifi', 16) + 'Đang mất mạng · dùng dữ liệu trên máy' + (S.queue.length ? ' · ' + S.queue.length + ' thay đổi chờ gửi' : '') + '</div>' : S.queue.length && S.syncing ? '<div class="netbar ok">' + ic('wifi', 16) + 'Có mạng lại · đang gửi ' + S.queue.length + ' thay đổi</div>' : S.error ? '<div class="netbar" role="alert">' + esc(S.error) + ' <button class="linkish b" data-act="dismisserr">Đóng</button></div>' : '';
  if (S.user && U.auth.mode === 'newpw'){ nav.innerHTML = ''; v.innerHTML = authView(); layer.innerHTML = ''; return; }
  if (!S.user){ nav.innerHTML = ''; v.innerHTML = S.loaded || !D.configured ? authView() : '<h1>HÔM NAY ĂN GÌ?</h1><p class="mute" role="status">Đang tải…</p>'; layer.innerHTML = ''; document.body.classList.add('noauth'); return; }
  document.body.classList.remove('noauth');
  let h = '';
  if (!S.loaded) h = '<h1>HÔM NAY ĂN GÌ?</h1><p class="mute" role="status">Đang tải dữ liệu…</p>';
  else if (U.sess) h = sessView();
  else if (U.tab === 'home') h = U.phase === 'free' ? homeFree() : U.phase === 'done' ? homeDone() : U.phase === 'committed' ? homeCommitted() : homeIdle();
  else if (U.tab === 'quan') h = quanView();
  else if (U.tab === 'luu') h = luuView();
  else if (U.tab === 'hot') h = hotView();
  else h = nhomView();
  v.innerHTML = h;
  const dot = unratedCount() && dueMeal() && U.tab !== 'quan';
  nav.innerHTML = [['home','wheel','Hôm nay'],['quan','list','Quán'],['luu','plus','Lưu'],['hot','fire','Đang hot'],['nhom','people','Nhóm']].map(t => { const on = U.tab === t[0] && !U.sess; return '<button data-act="tab" data-v="' + t[0] + '" class="' + (on ? 'on ' : '') + (t[0] === 'luu' ? 'add' : '') + '"' + (on ? ' aria-current="page"' : '') + '><span class="c">' + ic(t[1], 22, t[0] === 'luu' ? 2.2 : 2) + (t[0] === 'quan' && dot ? '<i class="ndot" aria-label="có bữa chờ chấm"></i>' : '') + '</span>' + t[2] + '</button>'; }).join('');
  let Lh = '';
  const sh = U.sheet;
  if (sh === 'filter') Lh = filterSheet(); else if (sh === 'loc') Lh = locSheet(); else if (sh === 'sort') Lh = sortSheet(); else if (sh === 'groups') Lh = groupsSheet();
  else if (sh === 'rate' && U.rate) Lh = rateSheet(); else if (sh === 'scan' && U.scan && U.scan.items) Lh = scanSheet(); else if (sh === 'imp' && U.imp) Lh = impSheet(); else if (sh === 'dish' && U.dish) Lh = dishSheet();
  else if (sh === 'bands-food') Lh = bandsSheet('food'); else if (sh === 'bands-drink') Lh = bandsSheet('drink'); else if (sh === 'tags') Lh = tagsSheet(); else if (sh === 'combo') Lh = comboSheet();
  else if (sh === 'newgroup') Lh = simpleInputSheet('NHÓM MỚI', 'Tên nhóm', 'g', '', 'newgroup'); else if (sh === 'rename') Lh = simpleInputSheet('ĐỔI TÊN NHÓM', 'Tên nhóm', 'g', (curGroup() || {}).name, 'rename'); else if (sh === 'myname') Lh = simpleInputSheet('TÊN CỦA BẠN', 'Tên hiển thị trong nhóm', 'n', S.profile.name, 'myname');
  else if (sh === 'remindh') Lh = remindSheet(); else if (sh === 'join' && U.join) Lh = joinSheet(); else if (sh === 'photo' && U.detail) Lh = photoSheet(); else if (sh === 'hotarea') Lh = hotAreaSheet();
  if (U.work) Lh += '<div class="snack" role="status" style="bottom:150px"><span class="grow" id="work">' + esc(U.work) + '</span></div>';
  if (U.snack) Lh += '<div class="snack" role="status"><span class="grow">' + esc(U.snack.t) + '</span>' + (U.snack.undo ? '<button class="btn sm" data-act="snackundo">Hoàn tác</button>' : '') + '</div>';
  layer.innerHTML = Lh;
  drawMap();
  const t = document.querySelector('.toast'); if (t){ const m = dueMeal(); clearTimeout(U.toastT); U.toastT = setTimeout(() => { if (m){ U.toastHide[m.id] = 1; soft(); } }, 8000); }
}
function drawMap(){
  const el = document.getElementById('map');
  if (map){ try { map.remove(); } catch (e) {} map = null; }
  if (!el || !window.L) return;
  const pts = (U.detail ? [P(U.detail)] : S.places.filter(p => p.status === 'active')).filter(p => p && p.lat != null);
  const center = U.detail && pts[0] ? [pts[0].lat, pts[0].lng] : L.G.pos ? [L.G.pos.lat, L.G.pos.lng] : pts[0] ? [pts[0].lat, pts[0].lng] : [10.7769, 106.7009];
  map = window.L.map(el, { zoomControl:false, attributionControl:true }).setView(center, U.detail ? 16 : 14);
  window.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom:19, attribution:'© OpenStreetMap © CARTO' }).addTo(map);
  const icon = window.L.divIcon({ className:'mpin', html:'<span>' + ic('bowl', 16, 2) + '</span>', iconSize:[34, 34], iconAnchor:[17, 17] });
  pts.slice(0, 300).forEach(p => window.L.marker([p.lat, p.lng], { icon, title:p.name }).addTo(map).on('click', () => { if (!U.detail) openPlace(p.id); }).bindTooltip(p.name, { direction:'top', offset:[0, -14] }));
  if (L.G.pos) window.L.circleMarker([L.G.pos.lat, L.G.pos.lng], { radius:7, color:'#6FA8FF', weight:4, fillColor:'#F6F0E8', fillOpacity:1 }).addTo(map);
  if (!U.detail && pts.length > 1 && !L.G.pos) map.fitBounds(pts.map(p => [p.lat, p.lng]), { padding:[24, 24], maxZoom:15 });
}

// ---------- HÀNH ĐỘNG ----------
function openPlace(id){ U.back = { tab:U.tab, seg:U.seg }; U.sheet = null; U.tab = 'quan'; U.detail = id; U.delArm = null; render(); scrollTo(0, 0); }
function resetSpin(){ U.combo = null; U.comboSpin = null; U.phase = 'idle'; U.result = null; U.cat = null; U.commit = null; U.backups = []; U.skip = []; U.others = 0; U.regular = false; }
function showResult(p, cat){ U.result = p; U.cat = cat; U.phase = p ? 'done' : 'idle'; const pool = cat ? L.candidates(U.f).filter(x => L.formOf(x) === cat) : L.candidates(U.f); U.backups = p ? L.pickN(pool, U.f, 2, [...U.skip, p.id]) : []; }
function spin(){
  if (U.busy || !U.cats || U.cats.length < 2) return;
  const disc = $('#disc'), ptr = $('#ptr'), st = $('#status'); if (!disc) return;
  U.busy = true; const n = U.cats.length, step = 360 / n, i = Math.floor(Math.random() * n); const jit = (Math.random() - 0.5) * step * 0.6;
  U.rot = Math.ceil(U.rot / 360) * 360 + 1800 + (360 - (i * step + step / 2)) + jit;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, ms = reduce ? 0 : 2600;
  disc.style.transition = 'transform ' + ms + 'ms cubic-bezier(0.12,0.7,0.1,1)'; disc.style.transform = 'rotate(' + U.rot + 'deg)';
  if (!reduce){ ptr.style.animation = 'tick 130ms ease-in-out 18'; if (navigator.vibrate) navigator.vibrate([8,90,8,90,8,110,8,140,8,190,8,260]); }
  if (st) st.textContent = 'ĐANG QUAY…';
  const cat = U.cats[i];
  setTimeout(() => { const sp = disc.querySelector('span[data-i="' + i + '"]'); if (sp) sp.classList.add('hit'); }, ms);
  if (U.free){ setTimeout(() => { U.busy = false; U.cat = cat; U.phase = 'free'; render(); scrollTo(0, 0); }, ms + 350); return; }
  setTimeout(() => { U.busy = false; U.skip = []; U.others = 0; U.regular = false; showResult(L.pick(L.candidates(U.f).filter(q => L.formOf(q) === cat), U.f), cat); render(); }, ms + 350);
}
function commit(p){
  const m = { id:D.uuid(), group_id:S.gid, place_id:p.id, place_name:p.name, at:new Date().toISOString(), created_by:L.me(), rated:false, dismissed:false, with_users:[] };
  D.upsert('meals', m); U.result = p; U.commit = m; U.combo = null; U.phase = 'committed'; U.tab = 'home'; U.detail = null; U.sess = U.sess && null;
  history.replaceState(null, '', location.pathname);
  if (!lsG('hnag2-asked-notif', false) && 'Notification' in window && Notification.permission === 'default'){ lsS('hnag2-asked-notif', true); setTimeout(() => Notification.requestPermission().catch(() => {}), 1200); }
  scheduleNotif(m); render(); scrollTo(0, 0);
}
function scheduleNotif(m){
  if (!('Notification' in window) || Notification.permission !== 'granted' || L.prefs().remind === false) return;
  const ms = (L.prefs().remindHours ?? 3) * 36e5; if (ms > 2 ** 31 - 1) return;
  setTimeout(() => { const cur = S.meals.find(x => x.id === m.id); if (cur && !cur.rated && !cur.dismissed){ try { navigator.serviceWorker && navigator.serviceWorker.ready.then(r => r.showNotification('Bữa ở ' + m.place_name + ' thế nào?', { body:'Chấm nhanh vài món để lần sau biết gọi gì.', icon:'/icon.svg', tag:m.id })); } catch (e) {} } }, ms);
}
function openRate(m){
  const p = P(m.place_id); const draft = lsG('hnag2-rate-' + m.id, null);
  if (draft){ U.rate = draft; U.sheet = 'rate'; render(); return; }
  const mr = p ? L.myRating(p) : null;
  U.rate = { meal_id:m.id, place_id:m.place_id, place_name:m.place_name, at:m.at, dishes:(p ? L.dishesOf(p) : []).map(d => ({ id:d.id, name:d.name, stars:0, photo:null })), manual:0, again:null, total:m.total ?? null, with_text:m.with_text || '', with_users:m.with_users || [], note:m.note || '' };
  void mr; U.sheet = 'rate'; render();
}
function saveRateDraft(){ if (U.rate) lsS('hnag2-rate-' + U.rate.meal_id, U.rate); }
function saveRate(){
  const r = U.rate; const p = P(r.place_id); const m = S.meals.find(x => x.id === r.meal_id); const sc = r.manual || rateAvg();
  if (p){
    r.dishes.forEach(d => {
      if (!d.stars) return;
      let dish = S.dishes.find(x => x.place_id === p.id && x.name.toLowerCase() === d.name.toLowerCase());
      if (!dish){ dish = { id:D.uuid(), place_id:p.id, group_id:p.group_id, name:d.name, price:null, category:null, gone:false }; D.upsert('dishes', dish); }
      const old = S.dish_ratings.find(x => x.dish_id === dish.id && x.meal_id === r.meal_id && x.user_id === L.me());
      D.upsert('dish_ratings', { id:old ? old.id : D.uuid(), group_id:p.group_id, dish_id:dish.id, meal_id:r.meal_id, user_id:L.me(), stars:d.stars, photo:d.photo || null });
      if (d.photo && !(p.photos || []).includes(d.photo)) D.upsert('places', { ...p, photos:[...(p.photos || []), d.photo] });
    });
    const myOld = L.myRating(p);
    const myMeals = S.meals.filter(x => x.place_id === p.id && x.created_by === L.me() && x.rated && x.score);
    let stars_ = myOld && myOld.stars ? +myOld.stars : null;
    if (sc){ const n = myMeals.length; stars_ = stars_ != null && n ? Math.round(((stars_ * n) + sc) / (n + 1) * 10) / 10 : Math.round(sc * 10) / 10; }
    D.upsert('place_ratings', { place_id:p.id, user_id:L.me(), group_id:p.group_id, stars:stars_, again:r.again || (myOld ? myOld.again : null), note:myOld ? myOld.note : null, updated_at:new Date().toISOString() });
    if (p.wish) D.upsert('places', { ...P(p.id), wish:false });
  }
  if (m) D.upsert('meals', { ...m, rated:true, score:sc ? Math.round(sc * 10) / 10 : null, total:r.total ? +r.total : null, with_text:r.with_text || null, with_users:r.with_users, note:r.note || null });
  localStorage.removeItem('hnag2-rate-' + r.meal_id);
  U.sheet = null; U.rate = null; if (U.phase === 'committed') resetSpin();
  if (r.again === 'no' && p){ const prev = L.myRating(p); snack('Đã lưu. ' + p.name + ' bị loại khỏi vòng quay.', () => D.upsert('place_ratings', { ...prev, again:null })); }
  else snack(r.again === 'yes' ? 'Đã lưu. Quán vào Yêu thích.' : 'Đã lưu đánh giá.');
}
function seed(){
  const S_ = [['Lẩu Thái (mẫu)','Bình Thạnh','Thái','Lẩu','Quán ăn',['Muốn quẩy'],200,350,'16:00','23:00',10.8031,106.7106],['Bún bò (mẫu)','Quận 1','Việt','Bún & phở','Vỉa hè',['Ăn nhẹ'],0,100,'06:00','21:00',10.7765,106.7009],['Cơm tấm (mẫu)','Bình Thạnh','Việt','Cơm','Quán ăn',['Ăn nhẹ','Chill'],0,100,'17:00','23:30',10.8013,106.7091],['Nướng Hàn (mẫu)','Quận 3','Hàn','Nướng','Nhà hàng',['Muốn quẩy'],200,350,'11:00','22:00',10.7843,106.6844],['Ramen (mẫu)','Quận 1','Nhật','Mì & hủ tiếu','Nhà hàng',['Chill'],100,200,'11:00','22:00',10.7797,106.7036],['Tiệm chè (mẫu)','Bình Thạnh','Việt','Chè & kem','Tiệm dessert',['Chill'],0,50,'14:00','22:30',10.8035,106.7119]];
  S_.forEach(s => D.upsert('places', { id:D.uuid(), group_id:S.gid, name:s[0], address:s[1], lat:s[10], lng:s[11], status:'active', wish:false, tags:{ area:s[1], cuisine:s[2], form:s[3], type:s[4], mood:s[5] }, pmin:s[6], pmax:s[7], open_time:s[8], close_time:s[9], photos:[], created_by:L.me(), created_at:new Date().toISOString() }));
  snack('Đã thêm 6 quán mẫu. Xóa được ở trang quán.');
}

// Lưu nhanh: đọc link Google Maps, link mạng xã hội, hoặc tên gõ tay
function parseMapsUrl(u){
  let m = u.match(/\/maps\/place\/([^\/]+)\/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (m){ try { return { name:decodeURIComponent(m[1].replace(/\+/g, ' ')), lat:+m[2], lng:+m[3] }; } catch (e) {} }
  m = u.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/); const n = u.match(/\/maps\/place\/([^\/@?]+)/);
  if (m) return { name:n ? decodeURIComponent(n[1].replace(/\+/g, ' ')) : '', lat:+m[1], lng:+m[2] };
  m = u.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/); if (m) return { name:'', lat:+m[1], lng:+m[2] };
  m = u.match(/[?&]q=([^&]+)/); if (m) return { name:decodeURIComponent(m[1].replace(/\+/g, ' ')), lat:null, lng:null };
  return null;
}
const isMaps = u => /google\.[^\/]+\/maps|maps\.app\.goo\.gl|goo\.gl\/maps|maps\.google\./i.test(u);
function dupOf(name, url){ const n = (name || '').trim().toLowerCase(); return S.places.find(p => (n && p.name.toLowerCase() === n) || (url && (p.map_url === url || p.source_url === url))); }
async function quickSave(raw){
  const lines = raw.split(/\n+/).map(s => s.trim()).filter(Boolean);
  for (const v of lines){
    const urlM = v.match(/https?:\/\/\S+/); const url = urlM ? urlM[0] : null;
    if (!url){ const d = dupOf(v); if (d){ snack('"' + d.name + '" đã có trong danh sách.'); continue; } D.upsert('places', newPlace({ name:v.slice(0, 80) })); snack('Đã lưu "' + v.slice(0, 40) + '" vào Hộp chờ.'); continue; }
    if (dupOf(null, url)){ snack('Link này đã lưu rồi.'); continue; }
    if (isMaps(url)){
      const pm = parseMapsUrl(url);
      if (pm && pm.name){ const d = dupOf(pm.name); if (d){ snack('"' + d.name + '" đã có trong danh sách.'); continue; } D.upsert('places', newPlace({ name:pm.name, lat:pm.lat, lng:pm.lng, map_url:url })); snack('Đã lưu "' + pm.name + '".'); continue; }
      const p = newPlace({ name:'Đang đọc link…', map_url:url }); D.upsert('places', p); readLinkBg(p.id, url, 'resolve'); continue;
    }
    const p = newPlace({ name:'Đang đọc link…', source_url:url }); D.upsert('places', p); readLinkBg(p.id, url, 'link');
  }
}
function newPlace(o){ return { id:D.uuid(), group_id:S.gid, name:o.name, address:o.address || null, lat:o.lat ?? null, lng:o.lng ?? null, map_url:o.map_url || null, source_url:o.source_url || null, status:'inbox', wish:!!o.wish, tags:o.tags || {}, sug:o.sug || null, note:o.note || null, list:o.list || null, photos:[], created_by:L.me(), created_at:new Date().toISOString() }; }
async function readLinkBg(id, url, task){
  U.reading++; render();
  const fail = msg => { const p = P(id); if (p && p.name === 'Đang đọc link…') D.upsert('places', { ...p, name:'Quán từ ' + hostOf(url), note:msg }); };
  try {
    if (!S.online) throw Object.assign(new Error('offline'), { code:'offline' });
    const r = await D.ai(task, { url });
    const p = P(id); if (!p) return;
    if (task === 'resolve'){
      const pm = parseMapsUrl(r.url || '') || {};
      const name = pm.name || r.name;
      if (!name){ fail('Link không chứa tên quán. Gõ tên giúp mình, link vẫn được giữ để chỉ đường.'); return; }
      const d = dupOf(name); if (d && d.id !== id){ D.remove('places', { id }); snack('"' + d.name + '" đã có trong danh sách.'); return; }
      D.upsert('places', { ...p, name, lat:pm.lat ?? p.lat, lng:pm.lng ?? p.lng, map_url:r.url || url });
    } else {
      if (!r.name){ fail('Chưa đọc ra tên quán từ link này. Gõ tên giúp mình, link gốc vẫn được giữ.'); return; }
      const d = dupOf(r.name); if (d && d.id !== id){ D.remove('places', { id }); snack('"' + d.name + '" đã có trong danh sách.'); return; }
      D.upsert('places', { ...p, name:r.name.slice(0, 80), address:r.address || p.address, note:r.dish ? 'Món được nhắc: ' + r.dish : p.note, sug:r.form ? { food:true, form:C.FORM.includes(r.form) ? r.form : '', cuisine:C.CUISINE.includes(r.cuisine) ? r.cuisine : '', type:C.TYPE.includes(r.type) ? r.type : '', area:r.area || '' } : null, tags:{ ...(p.tags || {}), area:r.area || (p.tags || {}).area } });
    }
  } catch (e) {
    fail(e.code === 'offline' ? 'Lưu lúc mất mạng. Mở quán để gõ tên, hoặc dán lại link khi có mạng.' : e.code === 'no_key' ? 'AI chưa được bật. Gõ tên quán giúp mình.' : 'Chưa đọc được link. Gõ tên quán giúp mình, link vẫn được giữ.');
  } finally { U.reading = Math.max(0, U.reading - 1); soft(); }
}
async function suggestTags(){
  const todo = S.places.filter(p => p.status === 'inbox' && !p.sug).slice(0, 30); if (!todo.length) return;
  U.busyAI = true; render();
  try {
    const r = await D.ai('tags', { places:todo.map((p, i) => ({ i, name:p.name, note:p.note || '', list:p.list || '', address:p.address || '' })), forms:C.FORM, cuisines:C.CUISINE, types:C.TYPE, moods:C.TAG_MOOD.filter(m => m !== 'Khám phá') });
    let n = 0;
    (r.items || []).forEach(x => { const p = todo[x.i]; if (!p) return; const sg = { food:x.food !== false, form:C.FORM.includes(x.form) ? x.form : '', cuisine:C.CUISINE.includes(x.cuisine) ? x.cuisine : '', type:C.TYPE.includes(x.type) ? x.type : '', mood:(x.mood || []).filter(m => C.TAG_MOOD.includes(m)), area:x.area || '' }; if (sg.food && !sg.form) return; D.upsert('places', { ...P(p.id), sug:sg }); n++; });
    snack(n ? 'Đã có gợi ý cho ' + n + ' quán. Duyệt hoặc sửa từng quán.' : 'AI chưa đưa ra được gợi ý nào. Thử lại sau, hoặc gắn tag bằng tay.');
  } catch (e) { snack(aiErr(e)); }
  finally { U.busyAI = false; soft(); }
}
function aiErr(e){ return e.code === 'offline' ? 'Cần mạng để dùng AI.' : e.code === 'no_key' ? 'AI chưa được bật trên máy chủ (thiếu khóa Gemini).' : e.code === 'quota' ? 'Hết lượt AI miễn phí hôm nay, thử lại sau.' : e.code === 'auth' ? 'Phiên đăng nhập hết hạn, đăng nhập lại nhé.' : 'AI chưa trả lời được. Thử lại sau ít phút.'; }
function applySug(p){ const sg = p.sug || {}; const t = { ...(p.tags || {}), form:sg.form, cuisine:sg.cuisine || (p.tags || {}).cuisine || '', type:sg.type || (p.tags || {}).type || '', mood:(sg.mood && sg.mood.length ? sg.mood : (p.tags || {}).mood) || [] }; if (sg.area && !t.area) t.area = sg.area; return { ...p, tags:t, sug:null, status:'active' }; }
async function scanMenu(file, pid){
  U.scan = { busy:true, pid }; render();
  try {
    const blob_ = await D.shrink(file, 1600, 0.85); const b64 = await D.blobToBase64(blob_);
    const r = await D.ai('menu', { image:b64, mime:'image/jpeg' });
    const items = (r.items || []).filter(x => x && x.name).slice(0, 80).map(x => ({ name:String(x.name).trim().slice(0, 80), price:String(x.price || '').slice(0, 20), category:String(x.category || '').slice(0, 30), on:true }));
    if (!items.length){ U.scan = null; snack('Không đọc được món nào. Thử ảnh rõ hơn, hoặc gõ tên món khi chấm điểm.'); return; }
    U.scan = { busy:false, pid, items, gone:[] }; U.sheet = 'scan'; render();
    D.uploadPhoto(file, 'menu').catch(() => {});
  } catch (e) { U.scan = null; snack(aiErr(e)); }
}
function saveScan(){
  const s = U.scan; const p = P(s.pid); if (!p) return; let add = 0, upd = 0;
  s.items.filter(x => x.on).forEach(it => {
    const e = S.dishes.find(d => d.place_id === p.id && d.name.toLowerCase() === it.name.toLowerCase());
    if (e){ if ((it.price && e.price !== it.price) || (it.category && !e.category) || e.gone){ D.upsert('dishes', { ...e, price:it.price || e.price, category:e.category || it.category || null, gone:false }); upd++; } }
    else { D.upsert('dishes', { id:D.uuid(), place_id:p.id, group_id:p.group_id, name:it.name, price:it.price || null, category:it.category || null, gone:false }); add++; }
  });
  s.gone.forEach(id => { const d = S.dishes.find(x => x.id === id); if (d) D.upsert('dishes', { ...d, gone:true }); });
  U.sheet = null; U.scan = null; snack('Thêm ' + add + ' món, cập nhật ' + upd + ' món. Điểm đã chấm được giữ nguyên.');
}
async function addPhotos(files, pid){
  const arr = Array.from(files || []); if (!arr.length) return;
  U.work = 'Đang tải ' + arr.length + ' ảnh…'; render();
  try { const urls = []; for (const f of arr) urls.push(await D.uploadPhoto(f, pid)); const p = P(pid); D.upsert('places', { ...p, photos:[...(p.photos || []), ...urls] }); U.work = null; snack('Đã thêm ' + urls.length + ' ảnh.'); }
  catch (e) { U.work = null; snack(e.message === 'offline' ? 'Cần mạng để tải ảnh lên.' : 'Chưa tải được ảnh. Thử lại.'); }
}
async function hotSearch(){
  U.hotBusy = true; render();
  try {
    const r = await D.ai('hot', { area:U.hot.area || 'TP.HCM', category:U.hot.cat || 'Món ăn' });
    U.hot = { ...U.hot, items:(r.items || []).slice(0, 8), at:Date.now(), fallback:!!r.fallback };
  } catch (e) { U.hot = { ...U.hot, fallback:true, items:U.hot.items || null, at:Date.now() }; if (e.code !== 'quota' && e.code !== 'no_search') snack(aiErr(e)); }
  finally { U.hotBusy = false; lsS('hnag2-hot', U.hot); soft(); }
}

// Takeout
function parseCSV(t){ t = t.replace(/^﻿/, ''); const rows = []; let row = [], cur = '', q = false; for (let i = 0; i < t.length; i++){ const c = t[i]; if (q){ if (c === '"'){ if (t[i + 1] === '"'){ cur += '"'; i++; } else q = false; } else cur += c; } else if (c === '"') q = true; else if (c === ','){ row.push(cur); cur = ''; } else if (c === '\n'){ row.push(cur); rows.push(row); row = []; cur = ''; } else if (c !== '\r') cur += c; } if (cur || row.length){ row.push(cur); rows.push(row); } return rows; }
function fromCSV(text, list){ const rows = parseCSV(text).filter(r => r.some(c => c && c.trim())); if (rows.length < 2) return []; let hi = 0; for (let i = 0; i < Math.min(6, rows.length); i++) if (rows[i].some(c => /^\s*url\s*$/i.test(c))){ hi = i; break; } const head = rows[hi].map(c => (c || '').trim().toLowerCase()), data = rows.slice(hi + 1); let ti = head.findIndex(c => /title|tiêu đề|^tên/.test(c)); if (ti < 0) ti = 0; const ni = head.findIndex(c => /note|ghi chú/.test(c)); let ui = -1, best = 0; for (let c = 0; c < head.length; c++){ let n = 0; data.forEach(r => { if (/^https?:\/\//i.test((r[c] || '').trim())) n++; }); if (n > best){ best = n; ui = c; } } return data.map(r => ({ name:(r[ti] || '').trim(), map_url:ui >= 0 ? (r[ui] || '').trim() : '', note:ni >= 0 ? (r[ni] || '').trim() : '', list })).filter(x => x.name && !/^https?:\/\//i.test(x.name)); }
function fromJSON(text, list){ let j; try { j = JSON.parse(text); } catch (e) { return []; } const fs = j && j.features; if (!Array.isArray(fs)) return []; return fs.map(f => { const p = f.properties || {}, loc = p.location || {}, g = f.geometry && f.geometry.coordinates; return { name:String(loc.name || p.Title || p.name || '').trim(), map_url:String(p['Google Maps URL'] || p.google_maps_url || ''), note:String(loc.address || ''), address:String(loc.address || ''), list, lat:g ? g[1] : null, lng:g ? g[0] : null }; }).filter(x => x.name); }
const baseName = p => p.split('/').pop().replace(/\.(csv|json)$/i, '');
async function handleImport(files){
  const arr = Array.from(files || []); if (!arr.length) return; U.work = 'Đang đọc file…'; render();
  let out = []; const skipped = [];
  for (const f of arr){
    const nm = f.name || '';
    try {
      if (/\.zip$/i.test(nm)){ if (!window.JSZip){ skipped.push(nm + ' (giải nén rồi chọn các file .csv)'); continue; } const z = await window.JSZip.loadAsync(f); const ps = []; z.forEach((path, e) => { if (e.dir) return; if (/(^|\/)(Saved|Đã lưu)\/[^\/]+\.csv$/i.test(path)) ps.push(e.async('string').then(t => { out = out.concat(fromCSV(t, baseName(path))); })); else if (/Saved Places\.json$|Địa điểm đã lưu\.json$/i.test(path)) ps.push(e.async('string').then(t => { out = out.concat(fromJSON(t, 'Đã gắn sao')); })); }); await Promise.all(ps); }
      else if (/\.csv$/i.test(nm)) out = out.concat(fromCSV(await readText(f), baseName(nm)));
      else if (/\.json$/i.test(nm)) out = out.concat(fromJSON(await readText(f), baseName(nm)));
      else skipped.push(nm);
    } catch (e) { skipped.push(nm + ' (không đọc được)'); }
  }
  U.work = null;
  const seen = {}; const items = [];
  out.forEach(x => { const k = (x.map_url || x.name).toLowerCase(); if (seen[k]) return; seen[k] = 1; x.name = x.name.slice(0, 80); const pm = x.map_url ? parseMapsUrl(x.map_url) : null; if (pm && pm.lat != null && x.lat == null){ x.lat = pm.lat; x.lng = pm.lng; } x.dup = !!dupOf(x.name, x.map_url); x.on = !x.dup; items.push(x); });
  if (!items.length){ snack(skipped.length ? 'Không đọc được: ' + skipped.join('; ') : 'Không tìm thấy địa điểm nào. Chọn file .zip của Takeout hoặc các file .csv trong thư mục Saved.'); return; }
  U.imp = { items:items.slice(0, 800), skipped }; U.sheet = 'imp'; render();
}
function impSave(){ const items = U.imp.items.filter(x => x.on); U.sheet = null; U.imp = null; items.forEach(x => D.upsert('places', newPlace({ name:x.name, map_url:x.map_url, note:x.note, list:x.list, address:x.address, lat:x.lat, lng:x.lng }))); U.tab = 'luu'; snack('Đã nhập ' + items.length + ' quán vào Hộp chờ.'); }

// Chuyển dữ liệu từ bản dùng thử (localStorage hoặc file sao lưu)
function migrateFrom(quanMap, buaMap){
  const idMap = {}; let n = 0;
  Object.entries(quanMap || {}).forEach(([oid, q]) => {
    if (!q || !q.name) return; if (dupOf(q.name, q.mapUrl)) return;
    const form = C.OLDF[q.form] || q.form || '';
    const p = newPlace({ name:q.name, map_url:q.mapUrl || null, note:q.note || null, list:q.list || null, lat:q.lat, lng:q.lng, wish:!!q.wish, tags:{ area:q.area || '', cuisine:q.cuisine || '', form, type:q.type || '', mood:q.moods || [] } });
    p.pmin = q.pmin ?? null; p.pmax = q.pmax ?? null; p.open_time = q.open || null; p.close_time = q.close || null; p.status = form ? 'active' : 'inbox';
    if (q.created) p.created_at = new Date(q.created).toISOString();
    D.upsert('places', p); idMap[oid] = p.id; n++;
    (q.dishes || []).forEach(d => { const did = D.uuid(); D.upsert('dishes', { id:did, place_id:p.id, group_id:S.gid, name:d.name, price:d.price || null, category:null, gone:false }); if (d.score) D.upsert('dish_ratings', { id:D.uuid(), group_id:S.gid, dish_id:did, meal_id:null, user_id:L.me(), stars:Math.max(1, Math.min(5, Math.round(d.score))) }); });
    if (q.score || q.again) D.upsert('place_ratings', { place_id:p.id, user_id:L.me(), group_id:S.gid, stars:q.score || null, again:q.again === 'yes' || q.again === 'no' ? q.again : null });
  });
  Object.values(buaMap || {}).forEach(b => { if (!b || !idMap[b.quanId]) return; D.upsert('meals', { id:D.uuid(), group_id:S.gid, place_id:idMap[b.quanId], place_name:b.quanName, at:new Date(b.at).toISOString(), rated:!!b.rated, dismissed:!!b.dismissed, score:b.score || null, created_by:L.me(), with_users:[] }); });
  return n;
}
function exportData(){
  const data = { app:'hom-nay-an-gi', v:2, at:Date.now(), group:curGroup() && curGroup().name, places:S.places, dishes:S.dishes, meals:S.meals, dish_ratings:S.dish_ratings, place_ratings:S.place_ratings };
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data)], { type:'application/json' })); const d = new Date();
  a.download = 'hom-nay-an-gi-' + d.getFullYear() + ('0' + (d.getMonth() + 1)).slice(-2) + ('0' + d.getDate()).slice(-2) + '.json'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

// Cùng chọn
async function newSession(){
  const list = L.candidates(U.f, {}, { bannedAll:true }); const opts = L.formsOf(list);
  if (opts.length < 2){ snack('Cần ít nhất 2 loại món còn quán hợp để cùng chọn. Gỡ bớt bộ lọc nhé.'); return; }
  if (!S.online){ snack('Cùng chọn cần mạng.'); return; }
  try { const id = await D.createSession(opts, U.f); openSession(id); shareSession(id); } catch (e) { snack('Chưa tạo được phiên. Thử lại.'); }
}
async function openSession(id){
  if (U.sess && U.sess.unsub) U.sess.unsub();
  U.sess = { id, session:null, votes:[] }; U.tab = 'home'; history.replaceState(null, '', '?s=' + id); render();
  const load = async () => { try { const r = await D.loadSession(id); if (!U.sess || U.sess.id !== id) return; if (!r.session){ U.sess.err = 'Phiên này không còn, hoặc bạn chưa ở trong nhóm.'; render(); return; } if (r.session.group_id !== S.gid && S.groups.some(g => g.id === r.session.group_id)) await D.openGroup(r.session.group_id); U.sess.session = r.session; U.sess.votes = r.votes; if (!r.votes.some(v => v.user_id === L.me())) await D.vote(id, r.session.group_id, [], false).catch(() => {}); soft(); } catch (e) { U.sess.err = 'Chưa mở được phiên. Kiểm tra mạng.'; render(); } };
  await load(); if (U.sess && U.sess.id === id) U.sess.unsub = D.watchSession(id, load);
}
function closeSession(){ if (U.sess && U.sess.unsub) U.sess.unsub(); U.sess = null; history.replaceState(null, '', location.pathname); render(); }
function shareSession(id){ const url = location.origin + '/?s=' + id; shareText('Cùng chọn quán ăn với nhóm: loại món bạn không muốn rồi quay nhé!', url); }
function shareText(text, url){ if (navigator.share) navigator.share({ title:'Hôm nay ăn gì?', text, url }).catch(() => {}); else { navigator.clipboard && navigator.clipboard.writeText(text + ' ' + url).then(() => snack('Đã chép link, dán vào nhóm chat nhé.')).catch(() => snack(url)); } }
async function sessSpin(){
  const s = U.sess; const ss = s.session; const ex = new Set(s.votes.flatMap(v => v.excluded || []));
  const remain = (ss.options || []).filter(o => !ex.has(o)); if (!remain.length) return;
  const form = remain[Math.floor(Math.random() * remain.length)];
  const present = new Set(S.members.map(m => m.user_id));
  const scoreOf = p => { const r = S.place_ratings.filter(x => x.place_id === p.id && x.stars && present.has(x.user_id)); return r.length ? r.reduce((a, b) => a + +b.stars, 0) / r.length : null; };
  const pool = L.candidates(ss.filters && Object.keys(ss.filters).length ? { ...L.defaultFilters(), ...ss.filters } : U.f, {}, { bannedAll:true }).filter(p => L.formOf(p) === form);
  const p = L.pick(pool, U.f, [], { scoreOf }) || L.pick(S.places.filter(x => L.ready(x) && L.formOf(x) === form), U.f);
  try { await D.setSessionResult(ss.id, { form, place_id:p ? p.id : null, place_name:p ? p.name : 'Chưa có quán', by:L.me() }); } catch (e) { snack('Chưa quay được. Thử lại.'); }
}

// Mời nhóm
async function invite(){ const g = curGroup(); shareText('Vào nhóm "' + g.name + '" trên Hôm nay ăn gì? để cùng lưu quán và chọn chỗ ăn nhé!', location.origin + '/?join=' + g.invite_code); }
async function checkJoin(code){ U.join = { code, preview:null }; U.sheet = 'join'; render(); try { const p = await D.previewInvite(code); U.join.preview = p || null; if (!p) U.join.err = 'Link mời không còn hiệu lực.'; else if (S.groups.some(g => g.id === p.id)){ U.sheet = null; await D.openGroup(p.id); snack('Bạn đã ở trong nhóm ' + p.name + '.'); history.replaceState(null, '', location.pathname); } } catch (e) { U.join.err = 'Chưa kiểm tra được link mời.'; } render(); }

function setPref(patch){ D.saveProfile({ prefs:{ ...L.prefs(), ...patch } }); }

// ---------- SỰ KIỆN ----------
document.addEventListener('click', async ev => {
  const el = ev.target.closest('[data-act]'); if (!el) return;
  const a = el.dataset.act, v = el.dataset.v, id = el.dataset.id;
  if (a === 'scrim'){ if (ev.target === el){ if (U.sheet === 'rate') saveRateDraft(); U.sheet = null; U.imp = null; if (U.scan && !U.scan.busy) U.scan = null; render(); } return; }
  if (a !== 'del' && a !== 'leave' && a !== 'wantlogin') U.delArm = null;
  switch (a){
    case 'tab': if (U.sess) closeSession(); U.tab = v; U.detail = null; if (v !== 'luu') U.draft = null; render(); scrollTo(0, 0); if (v === 'home') refreshEnv(); break;
    case 'seg': U.seg = v; U.detail = null; if (el.dataset.go){ U.tab = el.dataset.go; } render(); scrollTo(0, 0); break;
    case 'authmode': U.auth.mode = v; U.auth.msg = ''; render(); break;
    case 'magic': { const em = (document.querySelector('[name=email]') || {}).value || U.auth.email; if (!em){ U.auth.msg = 'Nhập email trước.'; render(); break; } U.auth.email = em; try { await D.magicLink(em); U.auth.mode = 'sent'; U.auth.msg = 'Mở link trong email trên máy này để đăng nhập.'; } catch (e) { U.auth.msg = authErr(e); } render(); break; }
    case 'forgot': { const em = (document.querySelector('[name=email]') || {}).value || U.auth.email; if (!em){ U.auth.msg = 'Nhập email trước, rồi bấm Quên mật khẩu.'; render(); break; } U.auth.email = em; try { await D.resetPassword(em); U.auth.mode = 'sent'; U.auth.msg = 'Mở link trong email để đặt mật khẩu mới.'; } catch (e) { U.auth.msg = authErr(e); } render(); break; }
    case 'mood': U.f.mood = U.f.mood === v && !el.dataset.go ? null : v; saveF(); if (el.dataset.go){ U.tab = el.dataset.go; U.detail = null; resetSpin(); } render(); break;
    case 'price': U.f.price = U.f.price === +v ? null : +v; U.f.priceMin = null; U.f.priceMax = null; saveF(); render(); break;
    case 'sheet': U.sheet = v; if (v === 'loc') L.locate(true).then(() => soft()); render(); break;
    case 'close': if (U.sheet === 'rate') saveRateDraft(); if (U.sheet === 'scan') U.scan = null; if (U.sheet === 'imp') U.imp = null; if (U.sheet === 'join') history.replaceState(null, '', location.pathname); U.sheet = null; render(); break;
    case 'sugw': U.f.weather = [...new Set([...U.f.weather, v])]; saveF(); render(); break;
    case 'sugo': U.f.occasion = [...new Set([...U.f.occasion, v])]; saveF(); render(); break;
    case 'fmulti': { const [k, val] = v.split('|'); const arr = U.f[k]; const i = arr.indexOf(val); if (i < 0) arr.push(val); else arr.splice(i, 1); saveF(); render(); break; }
    case 'farea': U.f.area = U.f.area === v ? null : v; if (U.f.area) U.f.radius = null; saveF(); render(); break;
    case 'radius': U.f.radius = v ? +v : null; U.f.area = null; saveF(); if (U.f.radius && !L.G.pos) L.locate(true).then(() => soft()); render(); break;
    case 'fopen': U.f.open = !(U.f.open && !U.f.plan); U.f.plan = false; saveF(); render(); break;
    case 'fplan': U.f.plan = !U.f.plan; saveF(); render(); break;
    case 'fmeal': U.f.meal = !U.f.meal; saveF(); render(); break;
    case 'fclear': Object.assign(U.f, { who:null, cuisine:[], type:[], group:[], forms:[], occasion:[], weather:[], area:null, radius:null, priceMin:null, priceMax:null, open:true, plan:false, meal:true }); saveF(); render(); break;
    case 'unf': unFilter(el.dataset.k, v); render(); break;
    case 'spin': spin(); break;
    case 'reshuffle': U.ck = null; render(); break;
    case 'skipwheel': U.skip = []; U.others = 0; U.regular = false; { const p = L.pick(L.candidates(U.f), U.f); showResult(p, null); } render(); break;
    case 'fav': { const r = L.regulars(U.f); if (!r.length){ snack('Chưa có quán quen nào đang mở. Gắn "Sẽ quay lại" khi chấm điểm để có.'); break; } U.regular = true; U.cat = null; U.skip = []; U.result = r[0]; U.backups = r.slice(1); U.phase = 'done'; render(); break; }
    case 'other': { if (U.result) U.skip.push(U.result.id); U.others++; const pool = U.regular ? L.regulars(U.f) : U.cat ? L.candidates(U.f).filter(q => L.formOf(q) === U.cat) : L.candidates(U.f); const nx = L.pick(pool, U.f, U.skip); if (nx){ const keep = U.regular; showResult(nx, U.cat); U.regular = keep; if (keep) U.backups = pool.filter(p => p.id !== nx.id && !U.skip.includes(p.id)).slice(0, 2); render(); } else snack('Hết quán khác trong nhóm này. Thử Quay lần nữa.'); break; }
    case 'again': resetSpin(); render(); scrollTo(0, 0); setTimeout(spin, 80); break;
    case 'reset': resetSpin(); render(); break;
    case 'commit': if (U.result) commit(U.result); break;
    case 'commitq': { const p = P(id); if (p){ U.cat = null; U.backups = []; if (U.sess) closeSession(); commit(p); } break; }
    case 'undo': if (U.commit){ D.remove('meals', { id:U.commit.id }); U.commit = null; U.phase = U.result ? 'done' : 'idle'; render(); } break;
    case 'combospin': { const all = L.comboFor(U.result); if (!all.length) break; const tot = all.reduce((a, x) => a + x.s, 0); let r = Math.random() * tot, win = all[all.length - 1]; for (const x of all){ r -= x.s; if (r <= 0){ win = x; break; } } const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches; if (reduce){ U.combo = win.p.id; render(); break; } let n = 0; const steps = 14; U.comboSpin = all[0].p.name; render(); const tick = () => { n++; const el = $('#combospin'); const x = n >= steps ? win : all[Math.floor(Math.random() * all.length)]; U.comboSpin = x.p.name; if (el) el.textContent = x.p.name; if (navigator.vibrate) navigator.vibrate(6); if (n >= steps){ setTimeout(() => { U.comboSpin = null; U.combo = win.p.id; render(); }, 350); } else setTimeout(tick, 60 + n * 18); }; setTimeout(tick, 60); break; }
    case 'who': U.f.who = U.f.who === v ? null : v; saveF(); render(); break;
    case 'sharepick': { const p = U.result; shareText('Tối nay ăn ' + p.name + ' nhé!', mapsHref(p)); break; }
    case 'rate': { const m = S.meals.find(x => x.id === id); if (m) openRate(m); break; }
    case 'later': { const m = S.meals.find(x => x.id === id); if (m) D.upsert('meals', { ...m, dismissed:true }); break; }
    case 'dstar': { const i = +el.dataset.i, n = +el.dataset.n; const d = U.rate.dishes[i]; d.stars = d.stars === n ? 0 : n; saveRateDraft(); render(); break; }
    case 'qstar': { const n = +el.dataset.n; U.rate.manual = U.rate.manual === n ? 0 : n; saveRateDraft(); render(); break; }
    case 'ragain': U.rate.again = U.rate.again === v ? null : v; saveRateDraft(); render(); break;
    case 'rwith': { const w = U.rate.with_users; const i = w.indexOf(v); if (i < 0) w.push(v); else w.splice(i, 1); saveRateDraft(); render(); break; }
    case 'saverate': saveRate(); break;
    case 'open': if (id) openPlace(id); break;
    case 'back': U.detail = null; if (U.back){ U.tab = U.back.tab; U.seg = U.back.seg; U.back = null; } render(); break;
    case 'sortby': U.sort = v; lsS('hnag2-sort', v); U.sheet = null; if (v === 'near') L.locate().then(() => soft()); render(); break;
    case 'menucat': U.menuCat = v; render(); break;
    case 'viewphoto': U.photoI = +el.dataset.i; U.sheet = 'photo'; render(); break;
    case 'setcover': { const p = P(U.detail); const ph = [...p.photos]; const [x] = ph.splice(+el.dataset.i, 1); ph.unshift(x); D.upsert('places', { ...p, photos:ph }); U.sheet = null; break; }
    case 'rmphoto': { const p = P(U.detail); const ph = [...p.photos]; ph.splice(+el.dataset.i, 1); D.upsert('places', { ...p, photos:ph }); U.sheet = null; break; }
    case 'unban': { const p = P(id); const r = L.myRating(p); if (r) D.upsert('place_ratings', { ...r, again:null }); snack('Quán đã quay lại vòng quay.'); break; }
    case 'wish': { const p = P(id); D.upsert('places', { ...p, wish:!p.wish }); break; }
    case 'del': if (U.delArm === id){ const p = P(id); D.remove('places', { id }); U.delArm = null; U.detail = null; snack('Đã xóa "' + (p ? p.name : 'quán') + '".'); } else { U.delArm = id; render(); } break;
    case 'delnow': { const p = P(id); D.remove('places', { id }); snack('Đã xóa "' + (p ? p.name : 'quán') + '".', () => D.upsert('places', p)); break; }
    case 'edit': { const p = P(id); if (!p) break; const d = JSON.parse(JSON.stringify(p)); d.tags = d.tags || {}; ['mood','meal','occasion','weather','who'].forEach(k => d.tags[k] = d.tags[k] || []); if (d.sug && d.sug.food){ d.tags.form = d.tags.form || d.sug.form; d.tags.cuisine = d.tags.cuisine || d.sug.cuisine; d.tags.type = d.tags.type || d.sug.type; if (!d.tags.mood.length) d.tags.mood = d.sug.mood || []; if (!d.tags.area && d.sug.area) d.tags.area = d.sug.area; } if (d.name === 'Đang đọc link…') d.name = ''; U.draft = d; U.tab = 'luu'; U.detail = null; render(); scrollTo(0, 0); break; }
    case 'dset': { const [k, mode, val] = v.split('|'); const t = U.draft.tags; if (mode === 'm'){ t[k] = t[k] || []; const i = t[k].indexOf(val); if (i < 0) t[k].push(val); else t[k].splice(i, 1); } else { t[k] = t[k] === val ? '' : val; if (k === 'form' && C.SWEET.includes(val) !== C.SWEET.includes(U.draft._prevForm || '')){ U.draft.pmin = null; U.draft.pmax = null; } U.draft._prevForm = val; } render(); break; }
    case 'dprice': { const bs = C.SWEET.includes(U.draft.tags.form) ? L.drinkBands() : L.foodBands(); const b = bs[+v]; if (U.draft.pmin === b[0] && U.draft.pmax === b[1]){ U.draft.pmin = null; U.draft.pmax = null; } else { U.draft.pmin = b[0]; U.draft.pmax = b[1]; } render(); break; }
    case 'saveedit': case 'saveinbox': { const d = U.draft; const row = { ...d }; delete row._prevForm; delete row.isNew; row.name = row.name.trim().slice(0, 80); if (a === 'saveedit') { row.status = 'active'; row.sug = null; } if (row.map_url && row.lat == null){ const pm = parseMapsUrl(row.map_url); if (pm && pm.lat != null){ row.lat = pm.lat; row.lng = pm.lng; } } if (row.pmin != null && row.pmin !== '') row.pmin = +row.pmin; else row.pmin = null; if (row.pmax != null && row.pmax !== '') row.pmax = +row.pmax; else row.pmax = row.pmin != null ? 9999 : null; D.upsert('places', row); U.draft = null; if (a === 'saveedit' && d.status === 'inbox'){ snack('"' + row.name + '" đã vào vòng quay.'); } else { U.tab = 'quan'; U.detail = row.id; snack('Đã lưu thay đổi.'); } render(); break; }
    case 'canceledit': { const bid = U.draft && U.draft.id; const wasInbox = U.draft && U.draft.status === 'inbox'; U.draft = null; if (!wasInbox && bid){ U.tab = 'quan'; U.detail = bid; } render(); break; }
    case 'paste': try { const t = await navigator.clipboard.readText(); U.quick = (U.quick ? U.quick + '\n' : '') + t; render(); } catch (e) { snack('Trình duyệt chưa cho đọc bộ nhớ tạm. Nhấn giữ ô nhập để dán.'); } break;
    case 'suggest': suggestTags(); break;
    case 'oksug': { const p = P(id); if (p) D.upsert('places', applySug(p)); break; }
    case 'okall': { const al = S.places.filter(p => p.status === 'inbox' && p.sug && p.sug.food && p.sug.form); al.forEach(p => D.upsert('places', applySug(p))); snack('Đã đưa ' + al.length + ' quán vào vòng quay.'); break; }
    case 'implist': { const any = U.imp.items.some(x => x.list === v && x.on); U.imp.items.forEach(x => { if (x.list === v) x.on = !any; }); render(); break; }
    case 'impsave': impSave(); break;
    case 'migrate': { const n = migrateFrom(lsG('hnag-db-quan', {}), lsG('hnag-db-bua', {})); lsS('hnag2-migrated', true); snack('Đã chuyển ' + n + ' quán từ bản dùng thử.'); break; }
    case 'savescan': saveScan(); break;
    case 'dg': U.d.group = v; U.d.type = ''; U.d.n = 24; render(); break;
    case 'dp': U.d.price = U.d.price === +v ? null : +v; U.d.n = 24; render(); break;
    case 'ds': U.d.sort = v; render(); break;
    case 'dmine': U.d.mine = !U.d.mine; U.d.n = 24; render(); break;
    case 'dmore': U.d.n += 24; render(); break;
    case 'dish': U.dish = U.dl && U.dl[+el.dataset.i]; if (U.dish){ U.sheet = 'dish'; render(); } break;
    case 'hotcat': U.hot.cat = U.hot.cat === v ? '' : v; lsS('hnag2-hot', U.hot); render(); break;
    case 'hotareapick': U.hot.area = v; U.sheet = null; lsS('hnag2-hot', U.hot); render(); break;
    case 'hotsearch': hotSearch(); break;
    case 'hotsave': { const x = U.hot.items[+el.dataset.i]; D.upsert('places', newPlace({ name:String(x.name).slice(0, 80), source_url:x.url || null, wish:true, note:x.dish ? 'Món được nhắc: ' + x.dish : null, tags:{ area:x.area || '' }, sug:x.form ? { food:true, form:C.FORM.includes(x.form) ? x.form : '', cuisine:C.CUISINE.includes(x.cuisine) ? x.cuisine : '', type:'', area:x.area || '' } : null })); snack('Đã lưu "' + x.name + '" vào Muốn thử và Hộp chờ.'); break; }
    case 'switchg': U.sheet = null; resetSpin(); U.detail = null; await D.openGroup(id); snack('Đang dùng: ' + (curGroup() || {}).name); break;
    case 'invite': invite(); break;
    case 'dojoin': try { await D.joinGroup(U.join.code); U.sheet = null; history.replaceState(null, '', location.pathname); snack('Đã vào nhóm ' + U.join.preview.name + '.'); U.tab = 'home'; } catch (e) { U.join.err = 'Chưa vào được nhóm. Thử lại.'; render(); } break;
    case 'kick': try { await D.removeMember(S.gid, id); snack('Đã xóa thành viên.'); } catch (e) { snack('Chưa xóa được.'); } break;
    case 'leave': if (U.delArm === 'leave'){ try { await D.leaveGroup(S.gid); snack('Đã rời nhóm.'); } catch (e) { snack('Chưa rời được nhóm.'); } U.delArm = null; } else { U.delArm = 'leave'; render(); } break;
    case 'remindh': setPref({ remindHours:+v }); break;
    case 'bandadd': { const k = v; const b = (k === 'food' ? L.foodBands() : L.drinkBands()).map(x => [...x]); const last = b[b.length - 1]; b.push([last ? (last[1] >= 9999 ? last[0] + 100 : last[1]) : 0, 9999]); setPref({ [k]:b }); break; }
    case 'bandrm': { const [k, i] = v.split('|'); const b = (k === 'food' ? L.foodBands() : L.drinkBands()).map(x => [...x]); b.splice(+i, 1); if (b.length) setPref({ [k]:b }); break; }
    case 'bandreset': setPref({ [v]:null }); break;
    case 'tagrm': { const [k, t] = v.split('|'); const ex = { ...(L.prefs().extraTags || {}) }; ex[k] = (ex[k] || []).filter(x => x !== t); setPref({ extraTags:ex }); break; }
    case 'combonext': { const [i, f] = v.split('|'); const r = JSON.parse(JSON.stringify(L.comboRules())); const n = r[+i].next || []; const j = n.indexOf(f); if (j < 0) n.push(f); else n.splice(j, 1); r[+i].next = n; setPref({ combo:r }); break; }
    case 'comborm': { const r = JSON.parse(JSON.stringify(L.comboRules())); r.splice(+v, 1); setPref({ combo:r }); break; }
    case 'comboreset': setPref({ combo:null }); break;
    case 'export': exportData(); break;
    case 'logout': await D.signOut(); localStorage.setItem('hnag2-wantlogin', '1'); U.tab = 'home'; resetSpin(); render(); break;
    case 'wantlogin': if (U.delArm === 'wantlogin'){ U.delArm = null; await D.wantLogin(); U.tab = 'home'; resetSpin(); render(); } else { U.delArm = 'wantlogin'; snack('Quán đã lưu ở chế độ khách sẽ không theo sang tài khoản kia. Gắn email nếu muốn giữ.'); } break;
    case 'guest': try { await D.backToGuest(); } catch (e) { U.auth.msg = 'Chế độ khách đang tạm tắt.'; render(); } break;
    case 'newsess': newSession(); break;
    case 'closesess': closeSession(); break;
    case 'sessx': { const s = U.sess; const mine = s.votes.find(x => x.user_id === L.me()) || { excluded:[], done:false }; const ex = [...(mine.excluded || [])]; const i = ex.indexOf(v); if (i < 0) ex.push(v); else ex.splice(i, 1); const vv = s.votes.find(x => x.user_id === L.me()); if (vv) vv.excluded = ex; else s.votes.push({ user_id:L.me(), excluded:ex, done:false }); render(); D.vote(s.id, s.session.group_id, ex, mine.done).catch(() => snack('Chưa gửi được phiếu.')); break; }
    case 'sessdone': { const s = U.sess; const mine = s.votes.find(x => x.user_id === L.me()) || { excluded:[] }; D.vote(s.id, s.session.group_id, mine.excluded || [], !mine.done).catch(() => snack('Chưa gửi được phiếu.')); break; }
    case 'sessspin': sessSpin(); break;
    case 'sessshare': shareSession(U.sess.id); break;
    case 'sessreopen': D.reopenSession(U.sess.id).catch(() => {}); break;
    case 'snackundo': if (U.snack && U.snack.undo){ U.snack.undo(); U.snack = null; render(); } break;
    case 'seed': seed(); break;
    case 'dismisserr': S.error = null; render(); break;
  }
});
function authErr(e){ const m = String(e && e.message || ''); if (/Invalid login/i.test(m)) return 'Sai email hoặc mật khẩu.'; if (/not confirmed/i.test(m)) return 'Email chưa được xác nhận. Mở link trong email trước.'; if (/already registered/i.test(m)) return 'Email này đã có tài khoản. Chuyển sang Đăng nhập.'; if (/rate limit|too many/i.test(m)) return 'Gửi email hơi nhiều, đợi ít phút rồi thử lại.'; if (/fetch/i.test(m)) return 'Không kết nối được. Kiểm tra mạng.'; return m || 'Có lỗi, thử lại.'; }

document.addEventListener('submit', async ev => {
  const fm = ev.target.closest('[data-form]'); if (!fm) return; ev.preventDefault();
  const k = fm.dataset.form, fd = new FormData(fm);
  if (k === 'auth'){
    const email = String(fd.get('email') || '').trim(), pw = String(fd.get('pw') || ''); U.auth.email = email; U.auth.busy = true; U.auth.msg = ''; render();
    try {
      if (U.auth.mode === 'signup'){ const r = await D.signUp(email, pw, String(fd.get('name') || '').trim()); if (!r.session){ U.auth.mode = 'sent'; U.auth.msg = 'Mở link xác nhận trong email, rồi quay lại đây đăng nhập.'; } }
      else await D.signIn(email, pw);
    } catch (e) { U.auth.msg = authErr(e); }
    U.auth.busy = false; render(); return;
  }
  if (k === 'newpw'){ try { await D.updatePassword(String(fd.get('pw'))); U.auth.mode = 'login'; history.replaceState(null, '', '/'); snack('Đã đổi mật khẩu.'); } catch (e) { U.auth.msg = authErr(e); } render(); return; }
  if (k === 'linkemail'){ const em = String(fd.get('email') || '').trim(); try { await D.linkEmail(em); U.linkMsg = 'Đã gửi email xác nhận tới ' + em + '. Bấm link trong email là xong; lần sau dùng "Gửi link đăng nhập qua email" để mở trên máy khác.'; } catch (e) { U.linkMsg = /already|registered|exists/i.test(e.message || '') ? 'Email này đã có tài khoản khác.' : authErr(e); } render(); return; }
  if (k === 'quick'){ const v = U.quick.trim(); if (!v) return; U.quick = ''; render(); quickSave(v); return; }
  if (k === 'adddish'){ const n = String(fd.get('n') || '').trim(); if (!n) return; const p = P(U.detail); D.upsert('dishes', { id:D.uuid(), place_id:p.id, group_id:p.group_id, name:n.slice(0, 80), price:String(fd.get('p') || '').trim() || null, category:null, gone:false }); return; }
  if (k === 'ratedish'){ const n = String(fd.get('n') || '').trim(); if (!n) return; U.rate.dishes.push({ id:null, name:n.slice(0, 80), stars:0, photo:null }); saveRateDraft(); render(); const ni = $('#nd'); if (ni) ni.focus(); return; }
  if (k === 'newgroup'){ const n = String(fd.get('v')).trim(); if (!n) return; U.sheet = null; try { await D.createGroup(n); resetSpin(); snack('Đã tạo nhóm ' + n + '. Bấm Mời vào nhóm để gửi link.'); U.tab = 'nhom'; } catch (e) { snack('Chưa tạo được nhóm.'); } render(); return; }
  if (k === 'rename'){ const n = String(fd.get('v')).trim(); U.sheet = null; try { await D.renameGroup(S.gid, n); } catch (e) { snack('Chưa đổi được tên.'); } render(); return; }
  if (k === 'myname'){ const n = String(fd.get('v')).trim(); U.sheet = null; D.saveProfile({ name:n }); S.members.forEach(m => { if (m.user_id === L.me()) m.name = n; }); D.sb.from('members').update({ name:n }).eq('user_id', L.me()).then(() => {}); render(); return; }
  if (k === 'tagadd'){ const t = String(fd.get('t') || '').trim(); if (!t) return; const key = fm.dataset.k; const ex = { ...(L.prefs().extraTags || {}) }; ex[key] = [...new Set([...(ex[key] || []), t])]; setPref({ extraTags:ex }); return; }
  if (k === 'comboadd'){ const r = JSON.parse(JSON.stringify(L.comboRules())); r.push({ id:'c' + Date.now(), label:fd.get('form') + ' → ' + fd.get('next'), when:{ form:[fd.get('form')] }, next:[fd.get('next')] }); setPref({ combo:r }); return; }
  if (k === 'hotarea'){ U.hot.area = String(fd.get('v') || '').trim(); U.sheet = null; lsS('hnag2-hot', U.hot); render(); return; }
});

document.addEventListener('input', ev => {
  const el = ev.target;
  if (el.dataset.f === 'q'){ U.q = el.value; clearTimeout(U.qt); U.qt = setTimeout(() => { const pos = el.selectionStart; render(); const n = $('#q'); if (n){ n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) {} } }, 280); return; }
  if (el.dataset.f === 'dq'){ U.d.q = el.value; U.d.n = 24; clearTimeout(U.qt); U.qt = setTimeout(() => { const pos = el.selectionStart; render(); const n = $('#dq'); if (n){ n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) {} } }, 280); return; }
  if (el.dataset.f === 'dtype'){ U.d.type = el.value; U.d.n = 24; render(); return; }
  if (el.dataset.f === 'quick'){ const had = !!U.quick.trim(); U.quick = el.value; if (had !== !!U.quick.trim()){ const b = document.querySelector('[data-form=quick] [type=submit]'); if (b) b.disabled = !U.quick.trim(); } return; }
  if (el.dataset.d && U.draft){ if (el.type === 'checkbox') U.draft[el.dataset.d] = el.checked; else U.draft[el.dataset.d] = el.value; if (el.dataset.d === 'name'){ const b = document.querySelector('[data-act=saveedit]'); if (b) b.disabled = !(el.value.trim() && U.draft.tags.form); } if (el.dataset.d === 'map_url'){ const pm = parseMapsUrl(el.value); if (pm && pm.lat != null){ U.draft.lat = pm.lat; U.draft.lng = pm.lng; if (!U.draft.name && pm.name) U.draft.name = pm.name; } } return; }
  if (el.dataset.dt && U.draft){ U.draft.tags[el.dataset.dt] = el.value; return; }
  if (el.dataset.r && U.rate){ U.rate[el.dataset.r] = el.value; saveRateDraft(); return; }
  if (el.dataset.ff){ const v = el.value === '' ? null : +el.value; U.f[el.dataset.ff] = v; if (U.f.priceMin != null && U.f.priceMax == null) U.f.priceMax = 9999; if (U.f.priceMin == null) U.f.priceMax = null; U.f.price = null; saveF(); return; }
  if (el.dataset.band){ const [k, i, j] = el.dataset.band.split('|'); const b = (k === 'food' ? L.foodBands() : L.drinkBands()).map(x => [...x]); b[+i][+j] = el.value === '' ? (+j ? 9999 : 0) : +el.value; clearTimeout(U.bt); U.bt = setTimeout(() => setPref({ [k]:b }), 600); return; }
  if (el.dataset.f === 'scan'){ U.scan.items[+el.dataset.i].on = el.checked; return; }
  if (el.dataset.f === 'scangone'){ const g = U.scan.gone; const i = g.indexOf(el.dataset.id); if (el.checked && i < 0) g.push(el.dataset.id); if (!el.checked && i >= 0) g.splice(i, 1); return; }
  if (el.dataset.f === 'imp'){ U.imp.items[+el.dataset.i].on = el.checked; const b = document.querySelector('[data-act=impsave]'); if (b){ const c = U.imp.items.filter(x => x.on).length; b.textContent = 'Nhập ' + c + ' quán'; b.disabled = !c; } return; }
  if (el.dataset.pref){ setPref({ [el.dataset.pref]:el.checked }); return; }
});
document.addEventListener('change', async ev => {
  const el = ev.target, f = el.dataset && el.dataset.f;
  if (f === 'import' && el.files.length) handleImport(el.files);
  if (f === 'oldbackup' && el.files[0]){ try { const j = JSON.parse(await readText(el.files[0])); if (!j || j.app !== 'hom-nay-an-gi') throw 0; if (j.v === 2){ snack('File này là bản sao lưu của app mới; dữ liệu đã nằm trên tài khoản của bạn.'); return; } const qm = {}; (j.quan || []).forEach(q => qm[q.id] = q); const bm = {}; (j.bua || []).forEach(b => bm[b.id] = b); const n = migrateFrom(qm, bm); snack('Đã chuyển ' + n + ' quán từ file sao lưu.'); } catch (e) { snack('File này không phải file sao lưu của Hôm nay ăn gì?.'); } }
  if (f === 'menu' && el.files[0]) scanMenu(el.files[0], U.detail);
  if (f === 'photo' && el.files.length) addPhotos(el.files, U.detail);
  if (f === 'dishphoto' && el.files[0]){ const i = +el.dataset.i; U.work = 'Đang tải ảnh…'; render(); try { const url = await D.uploadPhoto(el.files[0], U.rate.place_id || 'meal'); U.rate.dishes[i].photo = url; if (!U.rate.dishes[i].stars) U.rate.dishes[i].stars = 0; saveRateDraft(); } catch (e) { snack('Chưa tải được ảnh.'); } U.work = null; render(); }
});
document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && U.sheet){ if (U.sheet === 'rate') saveRateDraft(); U.sheet = null; render(); } });
document.addEventListener('focusout', () => setTimeout(() => { if (U.pending) soft(); }, 0));

async function refreshEnv(){
  if (U.f.radius || U.sort === 'near') await L.locate();
  if (S.online){ const w = await L.weatherNow(); if (JSON.stringify(w) !== JSON.stringify(U.weather)){ U.weather = w; soft(); } }
}

// ---------- KHỞI ĐỘNG ----------
D.onChange(() => {
  if (U.result) U.result = P(U.result.id) || U.result;
  if (U.sess && U.sess.session && !S.groups.length) closeSession();
  soft();
});
(async function start(){
  render();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
  const qs = new URLSearchParams(location.search);
  if (/type=recovery/.test(location.hash) || qs.get('reset')) U.auth.mode = 'newpw';
  await D.boot();
  if (U.auth.mode === 'newpw' && S.user){ U.tab = 'nhom'; U.sheet = null; }
  if (S.user){
    if (qs.get('join')) checkJoin(qs.get('join'));
    if (qs.get('s')) openSession(qs.get('s'));
    refreshEnv();
  } else if (qs.get('join')) U.auth.msg = 'Đăng nhập để vào nhóm được mời.';
  render();
  let lastUser = S.user && S.user.id;
  D.onChange(() => { const u = S.user && S.user.id; if (u && u !== lastUser){ lastUser = u; const q = new URLSearchParams(location.search); if (q.get('join')) checkJoin(q.get('join')); if (q.get('s')) openSession(q.get('s')); refreshEnv(); } if (!u) lastUser = null; });
  setInterval(() => { if (S.user) soft(); }, 60e3);
})();
