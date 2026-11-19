// Kho dữ liệu: Supabase + bản sao trên máy + hàng chờ khi mất mạng.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

export const configured = !!(SUPABASE_URL && SUPABASE_KEY);
export const sb = configured ? createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null;

const TABLES = ['places','dishes','meals','dish_ratings','place_ratings'];
const KEYS = { place_ratings:['place_id','user_id'], session_votes:['session_id','user_id'], members:['group_id','user_id'] };
const keyOf = t => KEYS[t] || ['id'];
const same = (t, a, b) => keyOf(t).every(k => a[k] === b[k]);

function lsGet(k, d){ try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
function lsSet(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }

export const S = {
  user: null, profile: null, groups: [], members: [], gid: null,
  places: [], dishes: [], meals: [], dish_ratings: [], place_ratings: [],
  online: navigator.onLine, syncing: false, queue: lsGet('hnag2-queue', []), loaded: false, error: null
};
let listeners = [], channel = null, reloadT = null;
export function onChange(fn){ listeners.push(fn); }
function emit(){ listeners.forEach(fn => { try { fn(); } catch (e) { console.error(e); } }); }

export const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }));

function cacheKey(){ return 'hnag2-cache-' + (S.user ? S.user.id : 'anon') + '-' + S.gid; }
function saveCache(){ if (!S.gid) return; const o = { members:S.members, at:Date.now() }; TABLES.forEach(t => o[t] = S[t]); lsSet(cacheKey(), o); }
function loadCache(){ const c = lsGet(cacheKey(), null); if (!c) return false; TABLES.forEach(t => S[t] = c[t] || []); S.members = c.members || []; return true; }

// ---------- đăng nhập ----------
export async function boot(){
  window.addEventListener('online', () => { S.online = true; flush(); emit(); });
  window.addEventListener('offline', () => { S.online = false; emit(); });
  if (!configured){ S.loaded = true; emit(); return; }
  const cached = lsGet('hnag2-session-user', null);
  if (cached && !S.online){ S.user = cached.user; S.profile = cached.profile; S.groups = cached.groups || []; S.gid = lsGet('hnag2-gid', null) || (S.groups[0] && S.groups[0].id); loadCache(); S.loaded = true; emit(); }
  const { data } = await sb.auth.getSession();
  await setUser(data.session ? data.session.user : null);
  sb.auth.onAuthStateChange((ev, session) => {
    const u = session ? session.user : null;
    if ((u && u.id) !== (S.user && S.user.id)) setUser(u);
  });
}

async function setUser(u){
  S.user = u;
  if (!u){ S.profile = null; S.groups = []; S.gid = null; TABLES.forEach(t => S[t] = []); S.loaded = true; if (channel){ sb.removeChannel(channel); channel = null; } emit(); return; }
  try {
    let { data: prof } = await sb.from('profiles').select('*').eq('id', u.id).maybeSingle();
    if (!prof){ const name = (u.user_metadata && u.user_metadata.name) || (u.email || '').split('@')[0]; const r = await sb.from('profiles').upsert({ id:u.id, name, prefs:{} }).select().single(); prof = r.data || { id:u.id, name, prefs:{} }; }
    S.profile = prof;
    await loadGroups();
    if (!S.groups.some(g => g.kind === 'personal')){ await sb.rpc('create_group', { p_name:'Kho cá nhân', p_kind:'personal', p_member_name:S.profile.name }); await loadGroups(); }
    const saved = lsGet('hnag2-gid', null);
    S.gid = S.groups.some(g => g.id === saved) ? saved : (S.groups.find(g => g.kind === 'personal') || S.groups[0]).id;
    lsSet('hnag2-session-user', { user:{ id:u.id, email:u.email }, profile:S.profile, groups:S.groups });
    await openGroup(S.gid);
  } catch (e) {
    console.error(e); S.error = 'Chưa tải được dữ liệu. Kiểm tra mạng rồi thử lại.';
    S.gid = S.gid || lsGet('hnag2-gid', null); loadCache(); S.loaded = true; emit();
  }
}

export async function signIn(email, password){ const { error } = await sb.auth.signInWithPassword({ email, password }); if (error) throw error; }
export async function signUp(email, password, name){
  const { data, error } = await sb.auth.signUp({ email, password, options:{ data:{ name }, emailRedirectTo: location.origin } });
  if (error) throw error; return data;
}
export async function magicLink(email){ const { error } = await sb.auth.signInWithOtp({ email, options:{ emailRedirectTo: location.origin + location.pathname + location.search } }); if (error) throw error; }
export async function resetPassword(email){ const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + '/?reset=1' }); if (error) throw error; }
export async function updatePassword(pw){ const { error } = await sb.auth.updateUser({ password: pw }); if (error) throw error; }
export async function signOut(){ await sb.auth.signOut(); localStorage.removeItem('hnag2-session-user'); }

export async function saveProfile(patch){
  S.profile = { ...S.profile, ...patch };
  lsSet('hnag2-session-user', { user:{ id:S.user.id, email:S.user.email }, profile:S.profile, groups:S.groups });
  enqueue({ op:'upsert', table:'profiles', row:{ id:S.user.id, name:S.profile.name, prefs:S.profile.prefs } });
  emit();
}

// ---------- nhóm ----------
async function loadGroups(){
  const { data: mem } = await sb.from('members').select('group_id, role, groups(id,name,kind,invite_code,created_by)').eq('user_id', S.user.id);
  S.groups = (mem || []).filter(m => m.groups).map(m => ({ ...m.groups, role:m.role }));
  S.groups.sort((a, b) => (a.kind === 'personal') - (b.kind === 'personal') || a.name.localeCompare(b.name, 'vi'));
}
export async function openGroup(gid){
  S.gid = gid; lsSet('hnag2-gid', gid);
  const hadCache = loadCache(); S.loaded = hadCache; emit();
  await reloadAll(); subscribe();
}
async function reloadAll(){
  if (!S.online){ S.loaded = true; emit(); return; }
  const gid = S.gid;
  const [mem, ...rest] = await Promise.all([
    sb.from('members').select('*').eq('group_id', gid),
    ...TABLES.map(t => sb.from(t).select('*').eq('group_id', gid).limit(5000))
  ]);
  if (gid !== S.gid) return;
  S.members = mem.data || S.members;
  TABLES.forEach((t, i) => { if (!rest[i].error) S[t] = rest[i].data || []; });
  applyQueueLocally();
  S.loaded = true; S.error = null; saveCache(); emit();
}
function subscribe(){
  if (channel){ sb.removeChannel(channel); channel = null; }
  if (!S.gid) return;
  channel = sb.channel('g-' + S.gid);
  const tables = [...TABLES, 'members'];
  tables.forEach(t => {
    channel.on('postgres_changes', { event:'*', schema:'public', table:t, filter:'group_id=eq.' + S.gid }, p => applyRemote(t, p));
    channel.on('postgres_changes', { event:'DELETE', schema:'public', table:t }, p => applyRemote(t, p));
  });
  channel.subscribe();
}
function applyRemote(t, p){
  const arr = S[t === 'members' ? 'members' : t]; if (!arr) return;
  if (p.eventType === 'DELETE'){ const i = arr.findIndex(x => same(t, x, p.old)); if (i >= 0){ arr.splice(i, 1); saveCache(); debouncedEmit(); } return; }
  const row = p.new; const i = arr.findIndex(x => same(t, x, row));
  if (i >= 0) arr[i] = row; else arr.push(row);
  saveCache(); debouncedEmit();
}
function debouncedEmit(){ clearTimeout(reloadT); reloadT = setTimeout(emit, 120); }

export async function createGroup(name){
  const { data, error } = await sb.rpc('create_group', { p_name:name, p_kind:'shared', p_member_name:S.profile.name });
  if (error) throw error; await loadGroups(); await openGroup(data); return data;
}
export async function previewInvite(code){ const { data } = await sb.rpc('group_preview', { p_code:code }); return data && data[0]; }
export async function joinGroup(code){
  const { data, error } = await sb.rpc('join_group', { p_code:code, p_member_name:S.profile.name });
  if (error) throw error; await loadGroups(); await openGroup(data); return data;
}
export async function leaveGroup(gid){
  const { error } = await sb.from('members').delete().match({ group_id:gid, user_id:S.user.id });
  if (error) throw error; await loadGroups();
  await openGroup((S.groups.find(g => g.kind === 'personal') || S.groups[0]).id);
}
export async function renameGroup(gid, name){ const { error } = await sb.from('groups').update({ name }).eq('id', gid); if (error) throw error; await loadGroups(); emit(); }
export async function removeMember(gid, uid){ const { error } = await sb.from('members').delete().match({ group_id:gid, user_id:uid }); if (error) throw error; S.members = S.members.filter(m => m.user_id !== uid); emit(); }

// ---------- ghi dữ liệu (lạc quan, có hàng chờ) ----------
function applyLocal(op){
  if (op.table === 'profiles') return;
  const arr = S[op.table]; if (!arr) return;
  if (op.op === 'upsert'){ const i = arr.findIndex(x => same(op.table, x, op.row)); if (i >= 0) arr[i] = { ...arr[i], ...op.row }; else arr.push({ ...op.row }); }
  else { for (let i = arr.length - 1; i >= 0; i--) if (Object.keys(op.match).every(k => arr[i][k] === op.match[k])) arr.splice(i, 1); }
}
function applyQueueLocally(){ S.queue.filter(o => !o.row || !o.row.group_id || o.row.group_id === S.gid).forEach(applyLocal); }
function enqueue(op){ S.queue.push(op); lsSet('hnag2-queue', S.queue); flush(); }
export function upsert(table, row){
  if (table !== 'profiles' && !row.group_id) row.group_id = S.gid;
  const op = { op:'upsert', table, row }; applyLocal(op); saveCache(); emit(); enqueue(op);
}
export function remove(table, match){ const op = { op:'delete', table, match }; applyLocal(op); saveCache(); emit(); enqueue(op); }

let flushing = false;
export async function flush(){
  if (flushing || !configured || !S.user || !S.online || !S.queue.length) return;
  flushing = true; S.syncing = true; emit();
  try {
    while (S.queue.length && S.online){
      const op = S.queue[0]; let res;
      if (op.op === 'upsert') res = await sb.from(op.table).upsert(op.row, { onConflict:keyOf(op.table).join(',') });
      else res = await sb.from(op.table).delete().match(op.match);
      if (res.error){
        const msg = String(res.error.message || '');
        if (/fetch|network|Failed/i.test(msg)) break;
        console.warn('Bỏ thao tác lỗi', op, res.error); S.error = 'Có một thay đổi không lưu được: ' + msg;
      }
      S.queue.shift(); lsSet('hnag2-queue', S.queue);
    }
  } finally { flushing = false; S.syncing = false; emit(); }
}

// ---------- ảnh ----------
export async function uploadPhoto(file, folder){
  if (!S.online) throw new Error('offline');
  const blob = await shrink(file, 1280, 0.82);
  const path = S.gid + '/' + folder + '/' + uuid() + '.jpg';
  const { error } = await sb.storage.from('photos').upload(path, blob, { contentType:'image/jpeg', upsert:false });
  if (error) throw error;
  return sb.storage.from('photos').getPublicUrl(path).data.publicUrl;
}
export function shrink(file, max, q){
  return new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => { const s = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); c.toBlob(b => b ? res(b) : rej(new Error('img')), 'image/jpeg', q); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('img')); };
    img.src = url;
  });
}
export function blobToBase64(b){ return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(b); }); }

// ---------- AI (Gemini qua máy chủ Vercel) ----------
export async function ai(task, payload){
  if (!S.online) { const e = new Error('offline'); e.code = 'offline'; throw e; }
  const { data } = sb ? await sb.auth.getSession() : { data:{} };
  const token = data && data.session ? data.session.access_token : '';
  const r = await fetch('/api/ai', { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:'Bearer ' + token }, body:JSON.stringify({ task, ...payload }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok){ const e = new Error(j.error || 'ai'); e.code = j.error || 'ai'; throw e; }
  return j;
}

// ---------- phiên cùng chọn ----------
export async function createSession(options, filters){
  const id = uuid();
  const { error } = await sb.from('sessions').insert({ id, group_id:S.gid, options, filters, status:'open' });
  if (error) throw error; return id;
}
export async function loadSession(id){
  const [s, v] = await Promise.all([sb.from('sessions').select('*').eq('id', id).maybeSingle(), sb.from('session_votes').select('*').eq('session_id', id)]);
  return { session:s.data, votes:v.data || [] };
}
export function watchSession(id, cb){
  const ch = sb.channel('s-' + id)
    .on('postgres_changes', { event:'*', schema:'public', table:'sessions', filter:'id=eq.' + id }, cb)
    .on('postgres_changes', { event:'*', schema:'public', table:'session_votes', filter:'session_id=eq.' + id }, cb)
    .subscribe();
  return () => sb.removeChannel(ch);
}
export async function vote(sessionId, gid, excluded, done){
  const { error } = await sb.from('session_votes').upsert({ session_id:sessionId, group_id:gid, user_id:S.user.id, name:S.profile.name, excluded, done, updated_at:new Date().toISOString() }, { onConflict:'session_id,user_id' });
  if (error) throw error;
}
export async function setSessionResult(id, result){ const { error } = await sb.from('sessions').update({ result, status:'done' }).eq('id', id); if (error) throw error; }
export async function reopenSession(id){ const { error } = await sb.from('sessions').update({ result:null, status:'open' }).eq('id', id); if (error) throw error; }
