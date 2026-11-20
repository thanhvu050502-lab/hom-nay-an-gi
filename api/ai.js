// Máy chủ AI cho "Hôm nay ăn gì?" – chạy trên Vercel, gọi Gemini (gói miễn phí).
// Khóa GEMINI_API_KEY nằm trong biến môi trường của Vercel, không bao giờ gửi xuống trình duyệt.
const CFG = require('./_config.js');

function tfetch(url, opts = {}, ms = 10000){ const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), ms); return fetch(url, { ...opts, signal:ctl.signal }).finally(() => clearTimeout(t)); }
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

async function checkUser(req){
  const url = process.env.SUPABASE_URL || CFG.SUPABASE_URL, key = process.env.SUPABASE_ANON_KEY || CFG.SUPABASE_KEY;
  if (!url || !key) return true;
  const auth = req.headers.authorization || '';
  if (!/^Bearer .{20,}/.test(auth)) return false;
  try { const r = await tfetch(url + '/auth/v1/user', { headers:{ Authorization:auth, apikey:key } }, 8000); console.log('auth', r.status); return r.ok; } catch (e) { console.log('auth err', e.message); return false; }
}

const MODELS = (process.env.GEMINI_MODEL ? [process.env.GEMINI_MODEL] : []).concat(['gemini-flash-lite-latest', 'gemini-3.5-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest']);
async function gemini(parts, opts = {}){
  const key = process.env.GEMINI_API_KEY;
  if (!key){ const e = new Error('no_key'); e.code = 'no_key'; throw e; }
  const body = { contents:[{ role:'user', parts }], generationConfig:{ temperature:0.2 } };
  if (opts.search) body.tools = [{ google_search:{} }];
  else body.generationConfig.responseMimeType = 'application/json';
  let last = null;
  for (const model of [...new Set(MODELS)]){
    const t0 = Date.now(); let r;
    try { r = await tfetch('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent', { method:'POST', headers:{ 'Content-Type':'application/json', 'x-goog-api-key':key }, body:JSON.stringify(body) }, opts.ms || 18000); }
    catch (e) { console.log('gemini', model, 'timeout', Date.now() - t0); last = Object.assign(new Error('timeout ' + model), { code:'ai' }); continue; }
    const j = await r.json().catch(() => ({}));
    console.log('gemini', model, r.status, Date.now() - t0, 'ms');
    if (!r.ok){
      const msg = (j.error && j.error.message) || ('HTTP ' + r.status);
      last = Object.assign(new Error(msg), { code: r.status === 429 ? 'quota' : (opts.search && (r.status === 400 || r.status === 403)) ? 'no_search' : 'ai' });
      if (r.status === 400 && opts.search) throw last;
      continue;
    }
    const c = (j.candidates || [])[0] || {};
    const text = ((c.content || {}).parts || []).filter(p => !p.thought).map(p => p.text || '').join('');
    const chunks = ((c.groundingMetadata || {}).groundingChunks || []).map(g => g.web).filter(Boolean);
    return { text, chunks, model };
  }
  throw last || Object.assign(new Error('ai'), { code:'ai' });
}
function parseJSON(t){
  if (!t) return null;
  try { return JSON.parse(t); } catch (e) {}
  const a = Math.min(...['[','{'].map(ch => { const i = t.indexOf(ch); return i < 0 ? 1e9 : i; }));
  const z = Math.max(t.lastIndexOf(']'), t.lastIndexOf('}'));
  if (a < z){ try { return JSON.parse(t.slice(a, z + 1)); } catch (e) {} }
  return null;
}
function meta(html, prop){
  const re = new RegExp('<meta[^>]+(?:property|name)=["\']' + prop + '["\'][^>]*content=["\']([^"\']*)["\']', 'i');
  const re2 = new RegExp('<meta[^>]+content=["\']([^"\']*)["\'][^>]*(?:property|name)=["\']' + prop + '["\']', 'i');
  const m = html.match(re) || html.match(re2); return m ? decode(m[1]) : '';
}
function decode(s){ return String(s).replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)); }
async function fetchText(url, ms = 8000){
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), ms);
  try { const r = await fetch(url, { redirect:'follow', signal:ctl.signal, headers:{ 'User-Agent':UA, 'Accept-Language':'vi,en;q=0.8' } }); const text = await r.text(); return { url:r.url, text:text.slice(0, 400000), ok:r.ok }; }
  finally { clearTimeout(t); }
}

function norm(s){ return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim(); }
function nameScore(a, b){
  const A = norm(a).split(' ').filter(w => w.length > 1), B = new Set(norm(b).split(' ').filter(w => w.length > 1));
  if (!A.length || !B.size) return 0; const hit = A.filter(w => B.has(w)).length; return hit / Math.min(A.length, B.size);
}
// Tra tên quán trên OpenStreetMap (Nominatim), chỉ nhận kết quả trong vùng TP.HCM và tên khớp
async function osmGeocode(name, area){
  const q = name.replace(/\s*[-–|·].*$/, '').trim() || name;
  const url = 'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=vn&viewbox=106.35,11.2,107.05,10.35&bounded=1&accept-language=vi&q=' + encodeURIComponent(q + (area ? ', ' + area : ''));
  const r = await tfetch(url, { headers:{ 'User-Agent':'HomNayAnGi/1.0 (github.com/thanhvu050502-lab/hom-nay-an-gi)', 'Accept-Language':'vi' } }, 8000);
  const arr = await r.json().catch(() => []);
  let best = null;
  for (const x of arr){ const nm = x.name || x.display_name.split(',')[0]; if (!nm || nm.length > 70) continue; const sc = Math.min(nameScore(q, nm), nameScore(nm, q) + 0.25); if (sc >= 0.75 && (!best || sc > best.sc)) best = { sc, lat:+x.lat, lng:+x.lon, address:x.display_name.split(',').slice(1, 4).join(',').trim(), osm:x.name }; }
  return best;
}
// ---------- Google Places (gói miễn phí, có đếm lượt) ----------
const SB = () => ({ url:process.env.SUPABASE_URL || CFG.SUPABASE_URL, key:process.env.SUPABASE_ANON_KEY || CFG.SUPABASE_KEY });
async function sbRpc(auth, fn, args){ const { url, key } = SB(); const r = await tfetch(url + '/rest/v1/rpc/' + fn, { method:'POST', headers:{ apikey:key, Authorization:auth, 'Content-Type':'application/json' }, body:JSON.stringify(args || {}) }, 6000); return r.ok ? r.json() : null; }
async function cacheGet(auth, k){ const { url, key } = SB(); try { const r = await tfetch(url + '/rest/v1/search_cache?select=data&key=eq.' + encodeURIComponent(k), { headers:{ apikey:key, Authorization:auth } }, 5000); const j = await r.json(); return j && j[0] ? j[0].data : null; } catch (e) { return null; } }
async function cachePut(auth, k, data){ const { url, key } = SB(); try { await tfetch(url + '/rest/v1/search_cache', { method:'POST', headers:{ apikey:key, Authorization:auth, 'Content-Type':'application/json', Prefer:'resolution=merge-duplicates' }, body:JSON.stringify({ key:k, data, at:new Date().toISOString() }) }, 5000); } catch (e) {} }
const HCM = { latitude:10.7769, longitude:106.7009 };
const FIELDS = 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.googleMapsUri,places.currentOpeningHours.openNow,places.priceLevel,places.primaryTypeDisplayName';
async function placesSearch(textQuery, center, radius, max){
  const key = process.env.GOOGLE_PLACES_KEY;
  const r = await tfetch('https://places.googleapis.com/v1/places:searchText', { method:'POST', headers:{ 'Content-Type':'application/json', 'X-Goog-Api-Key':key, 'X-Goog-FieldMask':FIELDS }, body:JSON.stringify({ textQuery, languageCode:'vi', regionCode:'VN', maxResultCount:max || 10, locationBias:{ circle:{ center:center || HCM, radius:radius || 5000 } } }) }, 10000);
  const j = await r.json().catch(() => ({}));
  if (!r.ok){ console.log('places', r.status, j.error && j.error.message); const e = new Error((j.error && j.error.message) || 'places'); e.code = r.status === 429 ? 'limit' : 'places'; throw e; }
  return (j.places || []).map(x => ({ id:x.id, name:(x.displayName || {}).text || '', address:x.formattedAddress || '', lat:x.location && x.location.latitude, lng:x.location && x.location.longitude, rating:x.rating ?? null, count:x.userRatingCount ?? 0, url:x.googleMapsUri || '', open:x.currentOpeningHours ? x.currentOpeningHours.openNow : null, price:x.priceLevel || null, kind:(x.primaryTypeDisplayName || {}).text || '' }));
}

const TASKS = {
  // Tìm quán cho một món (Google), mỗi khóa tìm ghi nhớ trong ngày
  async gsearch(b, ctx, req){
    if (!process.env.GOOGLE_PLACES_KEY) return { nokey:true, items:[] };
    const q = String(b.q || '').slice(0, 80).trim(); if (!q) return { items:[] };
    const hasPos = typeof b.lat === 'number' && typeof b.lng === 'number';
    const day = new Date().toISOString().slice(0, 10);
    const k = 'g|' + norm(q) + '|' + (hasPos ? b.lat.toFixed(2) + ',' + b.lng.toFixed(2) : 'hcm') + '|' + day;
    const auth = req.headers.authorization;
    const hit = await cacheGet(auth, k); if (hit) return { items:hit, cached:true };
    const ok = await sbRpc(auth, 'use_google', { p_kind:'search' }); if (ok !== true) return { limit:true, items:[] };
    let items;
    try { items = await placesSearch(q + (hasPos ? '' : ' Thành phố Hồ Chí Minh'), hasPos ? { latitude:b.lat, longitude:b.lng } : HCM, hasPos ? 4000 : 12000, 12); }
    catch (e) { if (e.code === 'limit') return { limit:true, items:[] }; throw e; }
    await cachePut(auth, k, items);
    return { items };
  },
  // Lấy vị trí và điểm Google cho quán đã lưu (tối đa 5 quán mỗi lần)
  async genrich(b, ctx, req){
    if (!process.env.GOOGLE_PLACES_KEY) return { nokey:true, items:[] };
    const auth = req.headers.authorization; const out = [];
    for (const it of (b.items || []).slice(0, 5)){
      const ok = await sbRpc(auth, 'use_google', { p_kind:'enrich' }); if (ok !== true) return { limit:true, items:out };
      try {
        const center = typeof it.lat === 'number' ? { latitude:it.lat, longitude:it.lng } : HCM;
        const r = await placesSearch(String(it.name || '').slice(0, 80) + (it.area ? ' ' + it.area : '') + ' Hồ Chí Minh', center, typeof it.lat === 'number' ? 2000 : 30000, 3);
        let best = null; for (const x of r){ const sc = Math.max(nameScore(it.name, x.name), nameScore(x.name, it.name)); if (sc >= 0.5 && (!best || sc > best.sc)) best = { ...x, sc }; }
        out.push(best ? { id:it.id, g_place_id:best.id, lat:best.lat, lng:best.lng, rating:best.rating, count:best.count, url:best.url, address:best.address } : { id:it.id, none:true });
      } catch (e) { if (e.code === 'limit') return { limit:true, items:out }; out.push({ id:it.id, err:true }); }
    }
    return { items:out };
  },
  async gusage(b, ctx, req){ const n = await sbRpc(req.headers.authorization, 'google_usage', {}); return { used:typeof n === 'number' ? n : null, limit:900, enabled:!!process.env.GOOGLE_PLACES_KEY }; },
  // Tra vị trí theo tên quán trên OpenStreetMap (tối đa 8 quán, 1 lượt/giây theo quy định của Nominatim)
  async geoname(b){
    const items = (b.items || []).slice(0, 8); const out = [];
    for (let i = 0; i < items.length; i++){
      const it = items[i];
      try { const g = await osmGeocode(String(it.name || '').slice(0, 80), String(it.area || '').slice(0, 40)); out.push(g ? { id:it.id, lat:g.lat, lng:g.lng, address:g.address } : { id:it.id, none:true }); }
      catch (e) { out.push({ id:it.id, err:true }); }
      if (i < items.length - 1) await new Promise(r => setTimeout(r, 1100));
    }
    return { items:out };
  },
  // Mở link rút gọn Google Maps để lấy link đầy đủ (có tên quán và tọa độ)
  async resolve(b){
    const r = await fetchText(b.url);
    let name = meta(r.text, 'og:title');
    if (name) name = name.split(' · ')[0].replace(/ - Google Maps$/i, '').trim();
    let url = r.url;
    const m = r.text.match(/https:\/\/www\.google\.[^"'\\\s]+\/maps\/place\/[^"'\\\s]+/);
    if (!/\/maps\/place\//.test(url) && m) url = decode(m[0]);
    return { url, name:/^Google Maps$/i.test(name) ? '' : name };
  },
  // Đọc link TikTok, Threads, Facebook, Instagram: lấy chú thích rồi nhờ AI tìm tên quán
  async link(b, ctx){
    let caption = '', author = '';
    try {
      if (/tiktok\.com/i.test(b.url)){ const r = await tfetch('https://www.tiktok.com/oembed?url=' + encodeURIComponent(b.url), { headers:{ 'User-Agent':UA } }); const j = await r.json(); caption = j.title || ''; author = j.author_name || ''; }
      if (!caption){ const r = await fetchText(b.url); caption = [meta(r.text, 'og:title'), meta(r.text, 'og:description'), meta(r.text, 'description'), (r.text.match(/<title>([^<]*)<\/title>/i) || [])[1] || ''].filter(Boolean).join('\n'); }
    } catch (e) {}
    if (!caption.trim()) return { name:'' };
    const prompt = 'Đây là chú thích của một bài đăng mạng xã hội về ăn uống ở Việt Nam (thường là TP.HCM).\n' +
      'Hãy tìm TÊN QUÁN được giới thiệu. Chỉ trả về JSON một object: {"name":"tên quán, rỗng nếu không chắc","dish":"món được nhắc","address":"địa chỉ nếu có","area":"quận/khu vực nếu có","form":"một trong: ' + ctx.forms.join(', ') + '","cuisine":"một trong: ' + ctx.cuisines.join(', ') + '","type":"một trong: ' + ctx.types.join(', ') + '"}. Không bịa tên quán; nếu chú thích không nêu tên quán thì name là chuỗi rỗng.\n\nTài khoản: ' + author + '\nChú thích:\n' + caption.slice(0, 4000);
    const r = await gemini([{ text:prompt }]);
    const j = parseJSON(r.text) || {};
    return { name:String(j.name || '').trim(), dish:j.dish || '', address:j.address || '', area:j.area || '', form:j.form || '', cuisine:j.cuisine || '', type:j.type || '' };
  },
  // Gợi ý tag cho quán trong Hộp chờ
  async tags(b){
    const places = (b.places || []).slice(0, 30);
    const prompt = 'Dưới đây là danh sách địa điểm một người ở TP.HCM đã lưu (JSON: i, name, note, list, address). Với mỗi địa điểm, đoán từ tên xem có phải chỗ ăn uống không và thuộc nhóm nào.\n' +
      'Chỉ trả về JSON dạng {"items":[{"i":số,"food":true|false,"form":"...","cuisine":"...","type":"...","mood":["..."],"area":"quận nếu đoán được từ địa chỉ"}]}.\n' +
      '"form" là một trong: ' + (b.forms || []).join(', ') + '.\n"cuisine" là một trong: ' + (b.cuisines || []).join(', ') + '.\n"type" là một trong: ' + (b.types || []).join(', ') + '.\n"mood" chọn 0–2 trong: ' + (b.moods || []).join(', ') + '.\n' +
      'Nếu không phải chỗ ăn uống (khách sạn, cửa hàng, điểm tham quan…) thì food=false và để các trường khác rỗng. Không chắc thì chọn phương án hợp lý nhất theo tên.\n' + JSON.stringify(places);
    const r = await gemini([{ text:prompt }]);
    const j = parseJSON(r.text) || {};
    return { items:Array.isArray(j) ? j : (j.items || []) };
  },
  // Đọc ảnh menu
  async menu(b){
    if (!b.image) return { items:[] };
    const prompt = 'Đây là ảnh menu của một quán ăn ở Việt Nam. Đọc và liệt kê các món. Chỉ trả về JSON dạng {"items":[{"name":"tên món đúng như trên menu","price":"giá viết gọn như 45k, rỗng nếu không thấy","category":"nhóm món trên menu như Khai vị, Lẩu, Đồ uống; rỗng nếu không có"}]}. Tối đa 80 món. Không bịa món không có trên ảnh. Nếu ảnh không phải menu, trả về {"items":[]}.';
    const r = await gemini([{ text:prompt }, { inline_data:{ mime_type:b.mime || 'image/jpeg', data:b.image } }]);
    const j = parseJSON(r.text) || {};
    return { items:Array.isArray(j) ? j : (j.items || []) };
  },
  // Đang hot gì? – tìm kiếm web có nguồn
  async hot(b){
    const area = String(b.area || 'TP.HCM').slice(0, 60), cat = String(b.category || 'Món ăn').slice(0, 30);
    const prompt = 'Tìm trên web (ưu tiên TikTok và Google Maps; Threads, Facebook, Instagram là nguồn phụ) những quán ' + cat.toLowerCase() + ' đang được nhắc nhiều gần đây ở ' + area + ', Việt Nam.\n' +
      'Chỉ trả về JSON là một mảng tối đa 6 phần tử, không thêm chữ nào khác: [{"name":"tên quán","dish":"món đang được nhắc","area":"quận","why":"một câu ngắn vì sao đang hot","url":"link nguồn gốc nếu có","source":"TikTok/Google Maps/...","form":"loại món"}]. Chỉ đưa quán có thật xuất hiện trong kết quả tìm kiếm; không bịa.';
    let r;
    try { r = await gemini([{ text:prompt }], { search:true }); }
    catch (e) { if (e.code === 'no_search' || e.code === 'quota') return { fallback:true, items:[], reason:e.code }; throw e; }
    const arr = parseJSON(r.text);
    const items = (Array.isArray(arr) ? arr : (arr && arr.items) || []).filter(x => x && x.name).slice(0, 6);
    items.forEach((x, i) => { if (!x.url && r.chunks[i]){ x.url = r.chunks[i].uri; x.source = x.source || r.chunks[i].title; } });
    if (!r.chunks.length && items.length) items.forEach(x => { x.why = (x.why ? x.why + ' · ' : '') + 'chưa có nguồn, kiểm tra lại'; });
    return { items, fallback:!items.length && !r.chunks.length };
  }
};

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  console.log('start', req.method, typeof req.body, process.env.GEMINI_API_KEY ? 'key ok' : 'no key');
  if (req.method !== 'POST') return res.status(405).json({ error:'method' });
  if (!(await checkUser(req))) return res.status(401).json({ error:'auth' });
  const b = req.body || {};
  const fn = TASKS[b.task];
  if (!fn) return res.status(400).json({ error:'task' });
  if ((b.task === 'resolve' || b.task === 'link') && !/^https?:\/\//i.test(String(b.url || ''))) return res.status(400).json({ error:'url' });
  const ctx = {
    forms:['Cơm','Xôi & cháo','Bún & phở','Mì & hủ tiếu','Bánh mì','Bánh & cuốn','Lẩu','Nướng','Hải sản','Món gà & vịt','Sushi & món Nhật','Pizza & mì Ý','Món chay','Ăn vặt đường phố','Chiên & xiên','Bánh ngọt','Chè & kem','Cà phê','Trà sữa','Trà & nước ép','Sinh tố & đá xay','Mồi nhậu','Ốc','Bia & cocktail'],
    cuisines:['Việt','Nhật','Hàn','Trung','Thái','Âu','Ấn','Khác'], types:['Vỉa hè','Quán ăn','Quán nhậu','Nhà hàng','Cà phê','Bar','Tiệm dessert']
  };
  try { return res.status(200).json(await fn(b, ctx, req)); }
  catch (e) { console.error(b.task, e.message); return res.status(e.code === 'no_key' ? 503 : e.code === 'quota' ? 429 : 502).json({ error:e.code || 'ai', detail:String(e.message || '').slice(0, 200) }); }
};
