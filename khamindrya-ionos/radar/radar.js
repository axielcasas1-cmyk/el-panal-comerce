(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.KRadar = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  const STORAGE_KEY = 'khamindrya_global_radar_v1';
  const CHANNELS = [
    ['instagram','Instagram','social'],['facebook','Facebook','social'],['tiktok','TikTok','social'],['x','X','social'],
    ['youtube','YouTube','video'],['goodreads','Goodreads','books'],['amazon_books','Amazon Books','store'],
    ['kobo','Kobo','store'],['google_play_books','Google Play Books','store'],['email','Email','direct'],['web','Web oficial','web']
  ];
  function id(prefix='id') { return prefix+'_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8); }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function defaultState() {
    return {
      version: 1,
      channels: CHANNELS.map(([key,name,kind]) => ({id:key,key,name,kind,status:'NOT_CONNECTED',statusDetail:'Sin conector autenticado; sin datos.',handle:'',url:'',verified:false,lastSyncAt:null})),
      campaigns: [{id:'book1-launch',title:'KHAMINDRYA — Libro I — Y el Nacimiento de las Aguas',author:'D’Ax',price:4.99,market:'España / global',status:'PUBLISHED',goal:'Libro II terminado y listo en 30 días o antes',goalDeadline:''}],
      distribution: [
        {id:'dist-amazon',store:'Amazon Books',status:'SUBMITTED',price:4.99,url:'',note:'Publicación declarada por el autor; disponibilidad pública pendiente de verificación.'},
        {id:'dist-kobo',store:'Kobo',status:'SUBMITTED',price:4.99,url:'',note:'Publicación declarada por el autor; disponibilidad pública pendiente de verificación.'},
        {id:'dist-google',store:'Google Play Books',status:'SUBMITTED',price:4.99,url:'',note:'Publicación declarada por el autor; disponibilidad pública pendiente de verificación.'}
      ],
      queue: [], assets: [], markets: [], activity: [],
      settings: {syncIntervalMinutes:60,lastSyncAt:null,watermark:null,watermarkName:'',watermarkOpacity:0.16}
    };
  }
  function normalizeState(raw) {
    const base = defaultState();
    if (!raw || typeof raw !== 'object') return base;
    const state = {...base,...raw};
    state.settings = {...base.settings,...(raw.settings||{})};
    const byKey = new Map((Array.isArray(raw.channels)?raw.channels:[]).map(c=>[c.key,c]));
    state.channels = base.channels.map(c=>({...c,...(byKey.get(c.key)||{})}));
    for (const k of ['campaigns','distribution','queue','assets','markets','activity']) if (!Array.isArray(state[k])) state[k]=[];
    return state;
  }
  function syncState(input, nowValue) {
    const s = normalizeState(clone(input));
    const now = nowValue || new Date().toISOString();
    s.channels = s.channels.map(c => {
      if (c.status === 'ERROR') return {...c,lastSyncAt:now};
      if (c.verified) return {...c,status:'CONNECTED',statusDetail:'Conexión marcada como verificada por el administrador.',lastSyncAt:now};
      return {...c,status:'NOT_CONNECTED',statusDetail:'Sin conector autenticado; sincronización externa no ejecutada.',lastSyncAt:now};
    });
    s.settings.lastSyncAt = now;
    const verified = s.channels.filter(c=>c.verified).length;
    s.activity.unshift({id:id('log'),createdAt:now,level:verified?'info':'warn',action:'SYNC_RUN',message:`Sincronización: ${s.channels.length} canales revisados; ${verified} conexiones verificadas. No se generaron métricas ficticias.`});
    s.activity = s.activity.slice(0,200);
    return s;
  }
  function loadState() {
    try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? normalizeState(JSON.parse(raw)) : defaultState(); }
    catch { return defaultState(); }
  }
  function saveState(state) {
    const normalized = normalizeState(state);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized)); return true; } catch { return false; }
  }
  function resetState(){ const s=defaultState(); saveState(s); return s; }
  return {STORAGE_KEY,defaultState,normalizeState,syncState,loadState,saveState,resetState,id,clone};
});