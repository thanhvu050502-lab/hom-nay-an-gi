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

function coordsFrom(text, url){
  const pats = [/center=(-?\d{1,2}\.\d+)%2C(-?\d{1,3}\.\d+)/, /@(-?\d{1,2}\.\d{3,}),(-?\d{1,3}\.\d{3,})/, /!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/, /\[null,null,(-?\d{1,2}\.\d{4,}),(-?\d{1,3}\.\d{4,})\]/];
  for (const re of pats){ const m = (url || '').match(re) || (text || '').match(re); if (m){ const lat = +m[1], lng = +m[2]; if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0)) return { lat, lng }; } }
  return null;
}
const TASKS = {
  // Lấy tọa độ và địa chỉ cho link Google Maps (tối đa 10 link một lần)
  async geo(b){
    const urls = (b.urls || []).filter(u => /^https?:\/\/[^/]*(google\.[^/]+\/maps|goo\.gl|maps\.app)/i.test(u)).slice(0, 10);
    const one = async u => {
      try {
        const r = await fetchText(u, 7000);
        const c = coordsFrom(r.text, r.url);
        let t = meta(r.text, 'og:title'); const parts = t.split(' · ');
        return c ? { url:u, lat:c.lat, lng:c.lng, address:parts.length > 1 ? parts.slice(1).join(' · ').trim() : '' } : { url:u, fail:true, status:r.ok };
      } catch (e) { return { url:u, fail:true, err:e.message }; }
    };
    const out = [];
    for (let i = 0; i < urls.length; i += 5) out.push(...await Promise.all(urls.slice(i, i + 5).map(one)));
    return { items:out };
  },
  async ping(){
    const key = process.env.GEMINI_API_KEY; const t0 = Date.now();
    try {
      const r = await tfetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', { headers:{ 'x-goog-api-key':key } }, 10000);
      const j = await r.json();
      const names = (j.models || []).map(m => m.name.replace('models/', '')).filter(n => /flash/.test(n));
      return { status:r.status, ms:Date.now() - t0, models:names, err:j.error && j.error.message };
    } catch (e) { return { err:e.message, ms:Date.now() - t0 }; }
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
  try { return res.status(200).json(await fn(b, ctx)); }
  catch (e) { console.error(b.task, e.message); return res.status(e.code === 'no_key' ? 503 : e.code === 'quota' ? 429 : 502).json({ error:e.code || 'ai', detail:String(e.message || '').slice(0, 200) }); }
};
