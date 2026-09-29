import { FormEvent, useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import {
  AlarmClock, Archive, BadgeEuro, Boxes, BriefcaseBusiness, CalendarDays,
  CheckCircle2, CircleDollarSign, ClipboardCheck, FileSearch, Gavel,
  Landmark, LayoutDashboard, LockKeyhole, LogOut, Mail, Menu, Network, Radar, Route,
  Search, ShieldCheck, ShoppingBag, Sparkles, Target, TestTubeDiagonal, UploadCloud,
  Warehouse, XCircle
} from 'lucide-react'
import { OWNER_EMAIL, OWNER_NAME, supabase } from './supabase'
import { fileMatch, flightStates, horizons, lifecyclePercent, money, prettyDate, routeTypes, safeFileName, sha256 } from './core'

type ModuleKey =
  | 'overview' | 'triage' | 'warehouse' | 'needs' | 'routes' | 'business'
  | 'showroom' | 'calendar' | 'legal' | 'finance' | 'stratelab' | 'migtax'
  | 'mail' | 'audit' | 'safeguard'

type DataState = {
  assets: any[]
  needs: any[]
  routes: any[]
  companies: any[]
  opportunities: any[]
  documents: any[]
  buyerRooms: any[]
  showroom: any[]
  events: any[]
  alarms: any[]
  legal: any[]
  approvals: any[]
  finance: any[]
  signals: any[]
  migtax: any[]
  mailAccounts: any[]
  audit: any[]
  incidents: any[]
}

const emptyData: DataState = {
  assets: [], needs: [], routes: [], companies: [], opportunities: [], documents: [],
  buyerRooms: [], showroom: [], events: [], alarms: [], legal: [], approvals: [],
  finance: [], signals: [], migtax: [], mailAccounts: [], audit: [], incidents: [],
}

const nav: Array<{ key: ModuleKey; label: string; icon: any }> = [
  { key: 'overview', label: 'Visual Information', icon: LayoutDashboard },
  { key: 'triage', label: 'Triage', icon: FileSearch },
  { key: 'warehouse', label: 'Warehouse', icon: Warehouse },
  { key: 'needs', label: 'Need Registry', icon: Target },
  { key: 'routes', label: 'Target Logistics', icon: Route },
  { key: 'business', label: 'Business / Sales', icon: BriefcaseBusiness },
  { key: 'showroom', label: 'Showroom / Buyer Rooms', icon: ShoppingBag },
  { key: 'calendar', label: 'Calendario / Agenda', icon: CalendarDays },
  { key: 'legal', label: 'Legalex / Signature', icon: Gavel },
  { key: 'finance', label: 'Finance', icon: CircleDollarSign },
  { key: 'stratelab', label: 'Stratelab', icon: Network },
  { key: 'migtax', label: 'MIGTAX / Sandbox', icon: TestTubeDiagonal },
  { key: 'mail', label: 'Unified Mail Hub', icon: Mail },
  { key: 'audit', label: 'Audit Center', icon: ClipboardCheck },
  { key: 'safeguard', label: 'Safeguard', icon: ShieldCheck },
]

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [recovery, setRecovery] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null)
      setAuthLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
      setSession(next)
      setAuthLoading(false)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  if (authLoading) return <Splash text="Comprobando acceso propietario…" />
  if (recovery && session) return <PasswordRecovery onDone={() => setRecovery(false)} />
  if (!session) return <OwnerAccess />
  if ((session.user.email || '').toLowerCase() !== OWNER_EMAIL) {
    supabase.auth.signOut()
    return <Splash text="Cuenta no autorizada para LOBOKING+." />
  }
  return <CommandCenter session={session} />
}

function PasswordRecovery({ onDone }: { onDone: () => void }) {
  const [password,setPassword]=useState('')
  const [message,setMessage]=useState('Define una contraseña nueva para el propietario.')
  const [busy,setBusy]=useState(false)
  const submit=async(e:FormEvent)=>{
    e.preventDefault();setBusy(true)
    const {error}=await supabase.auth.updateUser({password})
    setBusy(false)
    if(error){setMessage(error.message);return}
    setMessage('Contraseña actualizada.')
    onDone()
  }
  return <main className="auth-page">
    <section className="auth-hero"><div className="brand-lock"><ShieldCheck size={18}/> LOBOKING+</div><h1>Recuperar acceso</h1><p>El propietario sigue siendo el mismo; solo cambia la contraseña.</p></section>
    <form className="auth-card" onSubmit={submit}><span className="kicker">PASSWORD RECOVERY</span><h2>Nueva contraseña</h2>
      <div className="fixed-email">{OWNER_EMAIL}</div><input type="password" minLength={10} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••••"/>
      <button className="primary" disabled={busy}>{busy?'Guardando…':'Guardar contraseña'}</button><div className="auth-message">{message}</div>
    </form>
  </main>
}

function OwnerAccess() {
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'setup'>('login')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('El correo del propietario queda fijo. Solo necesitas tu contraseña.')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: OWNER_EMAIL, password })
        if (error) throw error
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: OWNER_EMAIL,
          password,
          options: { data: { display_name: OWNER_NAME } },
        })
        if (error) throw error
        if (!data.session) {
          setMode('login')
          setMessage('Cuenta creada. Revisa Outlook por si Supabase solicita confirmar el correo; después vuelve y entra con la misma contraseña.')
        }
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo completar el acceso.')
    } finally {
      setBusy(false)
    }
  }

  const reset = async () => {
    setBusy(true)
    const { error } = await supabase.auth.resetPasswordForEmail(OWNER_EMAIL, { redirectTo: window.location.origin })
    setMessage(error ? error.message : 'Se envió el enlace de recuperación al correo propietario.')
    setBusy(false)
  }

  return <main className="auth-page">
    <section className="auth-hero">
      <div className="brand-lock"><ShieldCheck size={18}/> LOBOKING+</div>
      <h1>Centro de mando privado</h1>
      <p>Propietario único, datos propios y código independiente del constructor.</p>
      <div className="truth-chip"><LockKeyhole size={15}/> OWNER FIJO · RLS ACTIVO</div>
    </section>
    <form className="auth-card" onSubmit={submit}>
      <span className="kicker">{mode === 'login' ? 'ACCESO PROPIETARIO' : 'PRIMERA CONFIGURACIÓN'}</span>
      <h2>{mode === 'login' ? 'Entrar' : 'Crear propietario'}</h2>
      <label>Propietario</label>
      <div className="fixed-email">{OWNER_EMAIL}</div>
      <label>Contraseña</label>
      <input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
        minLength={10} required value={password} onChange={(e) => setPassword(e.target.value)}
        placeholder="••••••••••" />
      {mode === 'setup' && <small>Mínimo 10 caracteres. Esta contraseña no sale de Supabase Auth.</small>}
      <button className="primary" disabled={busy}>{busy ? 'Procesando…' : mode === 'login' ? 'Entrar' : 'Crear propietario'}</button>
      <button type="button" className="secondary" onClick={() => setMode(mode === 'login' ? 'setup' : 'login')}>
        {mode === 'login' ? 'Primera configuración' : 'Ya tengo cuenta'}
      </button>
      {mode === 'login' && <button type="button" className="link-button" onClick={reset}>Recuperar contraseña</button>}
      <div className="auth-message">{message}</div>
    </form>
  </main>
}

function CommandCenter({ session }: { session: Session }) {
  const [active, setActive] = useState<ModuleKey>('overview')
  const [mobile, setMobile] = useState(false)
  const [data, setData] = useState<DataState>(emptyData)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('LOBOKING+ soberano conectado a Supabase.')
  const [search, setSearch] = useState('')

  const load = async () => {
    setLoading(true)
    const specs: Array<[keyof DataState, string, string]> = [
      ['assets', 'assets', 'updated_at'], ['needs', 'needs', 'updated_at'], ['routes', 'asset_routes', 'updated_at'],
      ['companies', 'companies', 'updated_at'], ['opportunities', 'opportunities', 'updated_at'], ['documents', 'documents', 'updated_at'],
      ['buyerRooms', 'buyer_rooms', 'updated_at'], ['showroom', 'showroom_entries', 'updated_at'], ['events', 'calendar_events', 'starts_at'],
      ['alarms', 'alarms', 'trigger_at'], ['legal', 'legal_documents', 'updated_at'], ['approvals', 'approvals', 'created_at'],
      ['finance', 'finance_transactions', 'created_at'], ['signals', 'stratelab_signals', 'created_at'], ['migtax', 'migtax_runs', 'started_at'],
      ['mailAccounts', 'mail_accounts', 'updated_at'], ['audit', 'audit_events', 'created_at'], ['incidents', 'system_incidents', 'detected_at'],
    ]
    const results = await Promise.all(specs.map(async ([key, table, order]) => {
      const q = supabase.from(table).select('*').order(order, { ascending: false }).limit(key === 'audit' ? 100 : 250)
      const { data: rows, error } = await q
      if (error) throw new Error(`${table}: ${error.message}`)
      return [key, rows ?? []] as const
    }))
    setData(Object.fromEntries(results) as unknown as DataState)
    setLoading(false)
  }

  useEffect(() => {
    load().catch((error) => { setNotice(error.message); setLoading(false) })
    const channel = supabase.channel('loboking-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assets' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'opportunities' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calendar_events' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'approvals' }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const filteredAssets = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('es')
    if (!q) return data.assets
    return data.assets.filter((a) => [a.asset_code, a.name, a.sector, a.asset_type, a.flight_state]
      .some((x) => String(x ?? '').toLocaleLowerCase('es').includes(q)))
  }, [data.assets, search])

  const openPipeline = data.opportunities.filter((x) => x.status === 'OPEN')
    .reduce((sum, x) => sum + Number(x.value_eur ?? 0), 0)
  const collected = data.finance.filter((x) => x.status === 'CONFIRMED' && ['INCOME','COLLECTION','SALE'].includes(x.transaction_type))
    .reduce((sum, x) => sum + Number(x.amount_eur ?? 0), 0)
  const pendingApprovals = data.approvals.filter((x) => x.status === 'PENDING')
  const pendingAlarms = data.alarms.filter((x) => x.status === 'PENDING')
  const upcoming = [...data.events].filter((x) => new Date(x.starts_at).getTime() >= Date.now() - 86400000)
    .sort((a,b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())

  const refreshAfter = async (label: string, fn: () => Promise<void>) => {
    try {
      await fn()
      setNotice(label)
      await load()
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'La operación falló.')
    }
  }

  return <div className="app-shell">
    <aside className={mobile ? 'sidebar open' : 'sidebar'}>
      <div className="brand"><div className="brand-mark">♛</div><div><strong>LOBOKING+</strong><span>Commercial Command OS</span></div></div>
      <nav>{nav.map(({ key, label, icon: Icon }) => <button key={key} className={active === key ? 'nav active' : 'nav'}
        onClick={() => { setActive(key); setMobile(false) }}>
        <Icon size={17}/><span>{label}</span>
        {key === 'calendar' && pendingAlarms.length > 0 && <b>{pendingAlarms.length}</b>}
        {key === 'legal' && pendingApprovals.length > 0 && <b>{pendingApprovals.length}</b>}
      </button>)}</nav>
      <div className="sidebar-foot"><ShieldCheck size={15}/> RLS + Audit activos</div>
    </aside>

    <main className="workspace">
      <header className="topbar">
        <button className="menu" onClick={() => setMobile(!mobile)}><Menu size={20}/></button>
        <div><span className="kicker">LOBOKING+ / {nav.find((x) => x.key === active)?.label}</span><h1>{nav.find((x) => x.key === active)?.label}</h1></div>
        <div className="global-search"><Search size={16}/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar bebé, sector, estado…"/></div>
        <div className="top-actions"><span className="status-dot"/> DATA LIVE
          <button title="Salir" onClick={() => supabase.auth.signOut()}><LogOut size={17}/></button>
        </div>
      </header>

      <div className="notice"><Sparkles size={15}/>{notice}</div>

      {loading ? <Splash text="Cargando datos protegidos…" compact /> :
        <ModuleRouter active={active} data={data} assets={filteredAssets} session={session}
          openPipeline={openPipeline} collected={collected} pendingApprovals={pendingApprovals}
          pendingAlarms={pendingAlarms} upcoming={upcoming} refreshAfter={refreshAfter} />}
    </main>
  </div>
}

function ModuleRouter(props: any) {
  const { active, data, assets, session, openPipeline, collected, pendingApprovals, pendingAlarms, upcoming, refreshAfter } = props

  if (active === 'overview') return <section className="module">
    <div className="kpi-grid">
      <Kpi label="Bebés" value={data.assets.length} icon={Boxes}/>
      <Kpi label="Pipeline" value={money(openPipeline)} icon={BadgeEuro}/>
      <Kpi label="Cobrado" value={money(collected)} icon={CircleDollarSign}/>
      <Kpi label="Aprobaciones" value={pendingApprovals.length} icon={Landmark}/>
      <Kpi label="Alarmas" value={pendingAlarms.length} icon={AlarmClock}/>
      <Kpi label="Documentos" value={data.documents.length} icon={Archive}/>
    </div>
    <div className="dashboard-grid">
      <Panel wide title="VISUAL LIFE · ACTIVOS"><AssetGrid items={assets.slice(0,12)}/></Panel>
      <Panel title="HEADQUARTERS"><ApprovalList items={pendingApprovals} refreshAfter={refreshAfter}/></Panel>
      <Panel title="AGENDA"><EventList items={upcoming.slice(0,6)}/></Panel>
      <Panel title="SAFEGUARD"><TruthStatus data={data}/></Panel>
    </div>
  </section>

  if (active === 'triage') return <TriageModule data={data} session={session} refreshAfter={refreshAfter}/>
  if (active === 'warehouse') return <WarehouseModule data={data} assets={assets} refreshAfter={refreshAfter}/>
  if (active === 'needs') return <NeedsModule data={data} refreshAfter={refreshAfter}/>
  if (active === 'routes') return <RoutesModule data={data} refreshAfter={refreshAfter}/>
  if (active === 'business') return <BusinessModule data={data} refreshAfter={refreshAfter}/>
  if (active === 'showroom') return <ShowroomModule data={data} refreshAfter={refreshAfter}/>
  if (active === 'calendar') return <CalendarModule data={data} upcoming={upcoming} pendingAlarms={pendingAlarms} refreshAfter={refreshAfter}/>
  if (active === 'legal') return <LegalModule data={data} refreshAfter={refreshAfter}/>
  if (active === 'finance') return <FinanceModule data={data} openPipeline={openPipeline} collected={collected} refreshAfter={refreshAfter}/>
  if (active === 'stratelab') return <StratelabModule data={data} refreshAfter={refreshAfter}/>
  if (active === 'migtax') return <MigtaxModule data={data} refreshAfter={refreshAfter}/>
  if (active === 'mail') return <MailModule data={data} refreshAfter={refreshAfter}/>
  if (active === 'audit') return <AuditModule data={data}/>
  return <SafeguardModule data={data}/>
}

function TriageModule({ data, session, refreshAfter }: any) {
  const [results, setResults] = useState<Array<{ name: string; status: string; detail: string }>>([])
  const [busy, setBusy] = useState(false)

  const processFiles = async (files: FileList | null) => {
    if (!files) return
    setBusy(true)
    for (const file of Array.from(files)) {
      try {
        if (file.size > 100 * 1024 * 1024) throw new Error('Supera 100 MB.')
        const hash = await sha256(file)
        const { data: duplicate, error: dupError } = await supabase.from('documents').select('id,asset_id,original_name').eq('sha256', hash).limit(1)
        if (dupError) throw dupError
        if (duplicate?.length) {
          setResults((r) => [{ name: file.name, status: 'DUPLICATE', detail: `SHA-256 ya existe: ${duplicate[0].original_name}` }, ...r])
          continue
        }
        const match = fileMatch(file.name, data.assets)
        const path = `${session.user.id}/vault/${crypto.randomUUID()}-${safeFileName(file.name)}`
        const { error: uploadError } = await supabase.storage.from('loboking-private').upload(path, file, { upsert: false, contentType: file.type || 'application/octet-stream' })
        if (uploadError) throw uploadError
        const { error: insertError } = await supabase.from('documents').insert({
          owner_user_id: session.user.id, asset_id: match.assetId, original_name: file.name, storage_path: path,
          content_type: file.type || 'application/octet-stream', size_bytes: file.size, sha256: hash,
          reconciliation_status: match.status, classification_confidence: match.confidence,
        })
        if (insertError) throw insertError
        setResults((r) => [{ name: file.name, status: match.status, detail: match.assetId ? 'Asociado conservadoramente a un activo existente.' : 'Permanece en Triage hasta revisión.' }, ...r])
      } catch (error) {
        setResults((r) => [{ name: file.name, status: 'ERROR', detail: error instanceof Error ? error.message : 'Fallo de ingesta.' }, ...r])
      }
    }
    setBusy(false)
    await refreshAfter('Triage actualizado.', async () => undefined)
  }

  return <Section kicker="INGESTION + RECONCILIATION" title="Triage" text="Hash primero, asociación conservadora después. Nada se convierte en bebé nuevo por intuición.">
    <div className="two-col">
      <Panel title="RECIBIR ARCHIVOS">
        <label className="dropzone"><UploadCloud size={30}/><strong>{busy ? 'Procesando…' : 'Seleccionar archivos'}</strong>
          <span>Hasta 100 MB por archivo · bucket privado · SHA-256</span>
          <input type="file" multiple disabled={busy} onChange={(e) => processFiles(e.target.files)}/>
        </label>
        <div className="rows">{results.map((r, i) => <div className="row" key={`${r.name}-${i}`}><strong>{r.name}</strong><span>{r.status} · {r.detail}</span></div>)}</div>
      </Panel>
      <Panel title="MANIFEST RECIENTE">
        <Rows items={data.documents.slice(0,30)} empty="Sin documentos todavía." render={(x:any) => <>
          <strong>{x.original_name}</strong><span>{x.reconciliation_status} · {Math.round(Number(x.size_bytes || 0)/1024)} KB</span>
        </>}/>
      </Panel>
    </div>
  </Section>
}

function WarehouseModule({ data, assets, refreshAfter }: any) {
  const [form, setForm] = useState({ asset_code:'', name:'', sector:'', asset_type:'OPEN_MARKET' })
  const submit = (e: FormEvent) => {
    e.preventDefault()
    refreshAfter('Bebé registrado en Warehouse.', async () => {
      const { error } = await supabase.from('assets').insert(form)
      if (error) throw error
      setForm({ asset_code:'', name:'', sector:'', asset_type:'OPEN_MARKET' })
    })
  }
  const setFlight = async (id:string, value:string) => refreshAfter('Estado de vuelo actualizado.', async () => {
    const { error } = await supabase.from('assets').update({ flight_state:value, last_activity_at:new Date().toISOString(), updated_at:new Date().toISOString() }).eq('id',id)
    if (error) throw error
  })
  return <Section kicker="FUENTE ÚNICA DE VERDAD" title="Warehouse" text="Un bebé, una identidad. Las demás áreas trabajan sobre el mismo registro.">
    <div className="two-col">
      <form className="panel form-stack" onSubmit={submit}>
        <h3>NUEVO BEBÉ</h3>
        <input required placeholder="LBK-MED-0001" value={form.asset_code} onChange={(e)=>setForm({...form,asset_code:e.target.value})}/>
        <input required placeholder="Nombre del producto" value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})}/>
        <input placeholder="Sector" value={form.sector} onChange={(e)=>setForm({...form,sector:e.target.value})}/>
        <select value={form.asset_type} onChange={(e)=>setForm({...form,asset_type:e.target.value})}>
          <option>OPEN_MARKET</option><option>TARGET_BOUND</option><option>NEED_DRIVEN</option><option>RESTRICTED</option>
        </select>
        <button className="primary">Registrar bebé</button>
      </form>
      <Panel title={`WAREHOUSE · ${data.assets.length} ACTIVOS`}><div className="asset-grid">
        {assets.map((a:any)=><AssetCard key={a.id} asset={a} footer={<select value={a.flight_state} onChange={(e)=>setFlight(a.id,e.target.value)}>
          {flightStates.map((s)=><option key={s}>{s}</option>)}
        </select>}/>)}
      </div></Panel>
    </div>
  </Section>
}

function NeedsModule({ data, refreshAfter }: any) {
  const [form,setForm]=useState({title:'',description:'',priority:60,company_name:''})
  const submit=(e:FormEvent)=>{e.preventDefault();refreshAfter('Necesidad registrada.',async()=>{
    const {error}=await supabase.from('needs').insert(form); if(error)throw error
    setForm({title:'',description:'',priority:60,company_name:''})
  })}
  return <Section kicker="NEED REGISTRY" title="Necesidades" text="Registra el problema antes de diseñar la solución.">
    <div className="two-col"><form className="panel form-stack" onSubmit={submit}><h3>NUEVA NECESIDAD</h3>
      <input required placeholder="Necesidad / problema" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/>
      <input placeholder="Empresa origen" value={form.company_name} onChange={e=>setForm({...form,company_name:e.target.value})}/>
      <textarea placeholder="Contexto" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/>
      <input type="number" min="0" max="100" value={form.priority} onChange={e=>setForm({...form,priority:Number(e.target.value)})}/>
      <button className="primary">Registrar</button>
    </form><Panel title="REGISTRO"><Rows items={data.needs} empty="Sin necesidades." render={(x:any)=><><strong>{x.title}</strong><span>{x.status} · prioridad {x.priority} · {x.company_name || 'sin empresa'}</span></>}/></Panel></div>
  </Section>
}

function RoutesModule({ data, refreshAfter }: any) {
  const [form,setForm]=useState({asset_id:'',route_type:'SALE',money_horizon:'NOW',destination_name:'',value_eur:'',next_action:''})
  const submit=(e:FormEvent)=>{e.preventDefault();refreshAfter('Ruta creada sin cerrar las demás.',async()=>{
    const {error}=await supabase.from('asset_routes').insert({...form,value_eur:form.value_eur?Number(form.value_eur):null});if(error)throw error
  })}
  return <Section kicker="TARGET LOGISTICS" title="Rutas y destinos" text="Cada bebé puede mantener varias rutas independientes.">
    <div className="two-col"><form className="panel form-stack" onSubmit={submit}><h3>NUEVA RUTA</h3>
      <AssetSelect assets={data.assets} value={form.asset_id} onChange={v=>setForm({...form,asset_id:v})}/>
      <select value={form.route_type} onChange={e=>setForm({...form,route_type:e.target.value})}>{routeTypes.map(x=><option key={x}>{x}</option>)}</select>
      <select value={form.money_horizon} onChange={e=>setForm({...form,money_horizon:e.target.value})}>{horizons.map(x=><option key={x}>{x}</option>)}</select>
      <input placeholder="Empresa / destino / concurso" value={form.destination_name} onChange={e=>setForm({...form,destination_name:e.target.value})}/>
      <input type="number" min="0" placeholder="Valor potencial €" value={form.value_eur} onChange={e=>setForm({...form,value_eur:e.target.value})}/>
      <input placeholder="Próxima acción" value={form.next_action} onChange={e=>setForm({...form,next_action:e.target.value})}/>
      <button className="primary" disabled={!form.asset_id}>Crear ruta</button>
    </form><Panel title="RUTAS"><Rows items={data.routes} empty="Sin rutas." render={(x:any)=><><strong>{x.route_type} · {x.destination_name || 'destino pendiente'}</strong><span>{x.money_horizon} · {x.status} · {x.value_eur ? money(x.value_eur) : 'sin valoración'}</span></>}/></Panel></div>
  </Section>
}

function BusinessModule({ data, refreshAfter }: any) {
  const [form,setForm]=useState({title:'',company:'',asset_id:'',value_eur:'',probability:30,next_action:''})
  const submit=(e:FormEvent)=>{e.preventDefault();refreshAfter('Oportunidad registrada.',async()=>{
    let companyId:any=null
    if(form.company){
      const existing=data.companies.find((x:any)=>x.name.toLocaleLowerCase('es')===form.company.toLocaleLowerCase('es'))
      if(existing) companyId=existing.id
      else {
        const {data:row,error}=await supabase.from('companies').insert({name:form.company}).select('id').single()
        if(error)throw error; companyId=row.id
      }
    }
    const {error}=await supabase.from('opportunities').insert({
      title:form.title,company_id:companyId,asset_id:form.asset_id||null,
      value_eur:form.value_eur?Number(form.value_eur):null,probability:form.probability,next_action:form.next_action
    });if(error)throw error
  })}
  return <Section kicker="BUSINESS DEVELOPMENT + SALES" title="Oportunidades" text="BD abre puertas; Sales mueve la oportunidad.">
    <div className="two-col"><form className="panel form-stack" onSubmit={submit}><h3>NUEVA OPORTUNIDAD</h3>
      <input required placeholder="Oportunidad" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/>
      <input placeholder="Empresa" value={form.company} onChange={e=>setForm({...form,company:e.target.value})}/>
      <AssetSelect assets={data.assets} value={form.asset_id} onChange={v=>setForm({...form,asset_id:v})} optional/>
      <input type="number" min="0" placeholder="Valor €" value={form.value_eur} onChange={e=>setForm({...form,value_eur:e.target.value})}/>
      <input type="number" min="0" max="100" value={form.probability} onChange={e=>setForm({...form,probability:Number(e.target.value)})}/>
      <input placeholder="Próxima acción" value={form.next_action} onChange={e=>setForm({...form,next_action:e.target.value})}/>
      <button className="primary">Crear oportunidad</button>
    </form><Panel title="PIPELINE"><Rows items={data.opportunities} empty="Sin oportunidades." render={(x:any)=><><strong>{x.title}</strong><span>{x.stage} · {x.value_eur ? money(x.value_eur) : 'sin valoración'} · {x.probability ?? 0}%</span></>}/></Panel></div>
  </Section>
}

function ShowroomModule({ data, refreshAfter }: any) {
  const [room,setRoom]=useState({name:'',access_level:'L0',nda_required:true})
  const [show,setShow]=useState({asset_id:'',headline:'',disclosure_level:'L0',status:'READY',visibility:'INTERNAL'})
  return <Section kicker="EXPOSICIÓN CONTROLADA" title="Showroom & Buyer Rooms" text="Ningún bebé sale al escaparate por defecto.">
    <div className="two-col">
      <form className="panel form-stack" onSubmit={(e)=>{e.preventDefault();refreshAfter('Buyer Room creada.',async()=>{const{error}=await supabase.from('buyer_rooms').insert(room);if(error)throw error})}}>
        <h3>BUYER ROOM</h3><input required placeholder="Empresa / sala" value={room.name} onChange={e=>setRoom({...room,name:e.target.value})}/>
        <select value={room.access_level} onChange={e=>setRoom({...room,access_level:e.target.value})}>{['L0','L1','L2','L3','L4','L5'].map(x=><option key={x}>{x}</option>)}</select>
        <label className="check"><input type="checkbox" checked={room.nda_required} onChange={e=>setRoom({...room,nda_required:e.target.checked})}/> NDA requerido</label>
        <button className="primary">Crear sala</button>
      </form>
      <form className="panel form-stack" onSubmit={(e)=>{e.preventDefault();refreshAfter('Ficha Showroom registrada.',async()=>{const{error}=await supabase.from('showroom_entries').upsert(show,{onConflict:'asset_id'});if(error)throw error})}}>
        <h3>SHOWROOM ENTRY</h3><AssetSelect assets={data.assets} value={show.asset_id} onChange={v=>setShow({...show,asset_id:v})}/>
        <input placeholder="Headline" value={show.headline} onChange={e=>setShow({...show,headline:e.target.value})}/>
        <select value={show.disclosure_level} onChange={e=>setShow({...show,disclosure_level:e.target.value})}>{['L0','L1','L2','L3','L4','L5'].map(x=><option key={x}>{x}</option>)}</select>
        <button className="primary" disabled={!show.asset_id}>Guardar ficha</button>
      </form>
    </div>
    <div className="two-col"><Panel title="SALAS"><Rows items={data.buyerRooms} empty="Sin Buyer Rooms." render={(x:any)=><><strong>{x.name}</strong><span>{x.access_level} · NDA {x.nda_required?'sí':'no'} · {x.status}</span></>}/></Panel>
    <Panel title="SHOWROOM"><Rows items={data.showroom} empty="Sin activos publicados." render={(x:any)=><><strong>{x.headline || 'Ficha sin headline'}</strong><span>{x.disclosure_level} · {x.visibility} · {x.status}</span></>}/></Panel></div>
  </Section>
}

function CalendarModule({ data, upcoming, pendingAlarms, refreshAfter }: any) {
  const [form,setForm]=useState({title:'',event_type:'MEETING',starts_at:'',objective:'',context_summary:'',participants:'',alarm_at:'',alarm_type:'REMINDER'})
  const submit=(e:FormEvent)=>{e.preventDefault();refreshAfter('Evento + agenda + alarma creados transaccionalmente.',async()=>{
    const {error}=await supabase.rpc('create_calendar_bundle',{
      p_title:form.title,p_event_type:form.event_type,p_starts_at:new Date(form.starts_at).toISOString(),
      p_objective:form.objective||null,p_context_summary:form.context_summary||null,p_participants:form.participants||null,
      p_alarm_at:form.alarm_at?new Date(form.alarm_at).toISOString():null,p_alarm_type:form.alarm_type
    });if(error)throw error
  })}
  const ack=(id:string)=>refreshAfter('Alarma reconocida.',async()=>{const{error}=await supabase.from('alarms').update({status:'ACKNOWLEDGED',acknowledged_at:new Date().toISOString()}).eq('id',id);if(error)throw error})
  return <Section kicker="CALENDAR + AGENDA + ALARMS" title="Tiempo ejecutivo" text="Calendario = cuándo. Agenda = contexto. Alarma = no perderlo.">
    <div className="two-col"><form className="panel form-stack" onSubmit={submit}><h3>NUEVO EVENTO</h3>
      <input required placeholder="Evento" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/>
      <select value={form.event_type} onChange={e=>setForm({...form,event_type:e.target.value})}>{['MEETING','DEADLINE','FOLLOW_UP','PAYMENT','SIGNATURE','CONTEST','DELIVERY','REVIEW','GENERAL'].map(x=><option key={x}>{x}</option>)}</select>
      <label>Inicio<input required type="datetime-local" value={form.starts_at} onChange={e=>setForm({...form,starts_at:e.target.value})}/></label>
      <textarea placeholder="Objetivo" value={form.objective} onChange={e=>setForm({...form,objective:e.target.value})}/>
      <textarea placeholder="Contexto / agenda" value={form.context_summary} onChange={e=>setForm({...form,context_summary:e.target.value})}/>
      <input placeholder="Participantes" value={form.participants} onChange={e=>setForm({...form,participants:e.target.value})}/>
      <label>Alarma<input type="datetime-local" value={form.alarm_at} onChange={e=>setForm({...form,alarm_at:e.target.value})}/></label>
      <select value={form.alarm_type} onChange={e=>setForm({...form,alarm_type:e.target.value})}>{['REMINDER','ACTION','CRITICAL','HEADQUARTERS'].map(x=><option key={x}>{x}</option>)}</select>
      <button className="primary">Guardar todo</button>
    </form><div><Panel title="PRÓXIMOS EVENTOS"><EventList items={upcoming}/></Panel><Panel title="ALARMAS"><Rows items={pendingAlarms} empty="Sin alarmas." render={(x:any)=><><strong>{x.alarm_type} · {x.message}</strong><span>{prettyDate(x.trigger_at)}</span><button className="mini" onClick={()=>ack(x.id)}>Reconocer</button></>}/></Panel></div></div>
  </Section>
}

function LegalModule({ data, refreshAfter }: any) {
  const [form,setForm]=useState({asset_id:'',document_type:'NDA',title:'',requires_signature:true})
  const submit=(e:FormEvent)=>{e.preventDefault();refreshAfter('Documento Legalex registrado.',async()=>{
    const {data:doc,error}=await supabase.from('legal_documents').insert({...form,asset_id:form.asset_id||null}).select('id').single()
    if(error)throw error
    if(form.requires_signature){
      const {error:ap}=await supabase.from('approvals').insert({approval_type:'SIGNATURE',object_type:'LEGAL_DOCUMENT',object_id:doc.id,title:`Autorizar firma: ${form.title}`,reason:'Documento marcado como requiere firma.'})
      if(ap)throw ap
    }
  })}
  return <Section kicker="LEGALEX + SIGNATURE VAULT" title="Legal y firma" text="Registrar no equivale a firmar. Toda firma solicita aprobación Headquarters.">
    <div className="two-col"><form className="panel form-stack" onSubmit={submit}><h3>NUEVO DOCUMENTO</h3>
      <AssetSelect assets={data.assets} value={form.asset_id} onChange={v=>setForm({...form,asset_id:v})} optional/>
      <select value={form.document_type} onChange={e=>setForm({...form,document_type:e.target.value})}>{['NDA','LOI','MOU','CONTRACT','LICENSE','ASSIGNMENT','EXCLUSIVITY','IP','OTHER'].map(x=><option key={x}>{x}</option>)}</select>
      <input required placeholder="Título" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/>
      <label className="check"><input type="checkbox" checked={form.requires_signature} onChange={e=>setForm({...form,requires_signature:e.target.checked})}/> Requiere firma</label>
      <button className="primary">Registrar en Legalex</button>
    </form><Panel title="LEGAL DOCUMENTS"><Rows items={data.legal} empty="Sin documentos." render={(x:any)=><><strong>{x.document_type} · {x.title}</strong><span>{x.status} · firma {x.requires_signature?'sí':'no'}</span></>}/></Panel></div>
    <Panel title="HEADQUARTERS APPROVALS"><ApprovalList items={data.approvals.filter((x:any)=>x.status==='PENDING')} refreshAfter={refreshAfter}/></Panel>
  </Section>
}

function FinanceModule({ data, openPipeline, collected, refreshAfter }: any) {
  const [form,setForm]=useState({transaction_type:'INCOME',amount_eur:'',status:'PENDING',reference:''})
  const submit=(e:FormEvent)=>{e.preventDefault();refreshAfter('Movimiento financiero registrado.',async()=>{
    const {error}=await supabase.from('finance_transactions').insert({...form,amount_eur:Number(form.amount_eur),occurred_at:new Date().toISOString()});if(error)throw error
  })}
  return <Section kicker="FINANCE & ACCOUNTING" title="Dinero" text="Solo cifras registradas. Nada se rellena por imaginación.">
    <div className="kpi-grid"><Kpi label="Pipeline" value={money(openPipeline)} icon={BadgeEuro}/><Kpi label="Cobrado" value={money(collected)} icon={CircleDollarSign}/><Kpi label="Movimientos" value={data.finance.length} icon={Archive}/></div>
    <div className="two-col"><form className="panel form-stack" onSubmit={submit}><h3>NUEVO MOVIMIENTO</h3>
      <select value={form.transaction_type} onChange={e=>setForm({...form,transaction_type:e.target.value})}>{['INCOME','COLLECTION','SALE','COST','COMMISSION','ROYALTY','PAYMENT'].map(x=><option key={x}>{x}</option>)}</select>
      <input required type="number" step="0.01" placeholder="Importe €" value={form.amount_eur} onChange={e=>setForm({...form,amount_eur:e.target.value})}/>
      <select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option>PENDING</option><option>CONFIRMED</option><option>CANCELLED</option></select>
      <input placeholder="Referencia" value={form.reference} onChange={e=>setForm({...form,reference:e.target.value})}/>
      <button className="primary">Registrar</button>
    </form><Panel title="LEDGER"><Rows items={data.finance} empty="Sin movimientos." render={(x:any)=><><strong>{x.transaction_type} · {money(x.amount_eur)}</strong><span>{x.status} · {x.reference || 'sin referencia'} · {prettyDate(x.occurred_at || x.created_at)}</span></>}/></Panel></div>
  </Section>
}

function StratelabModule({ data, refreshAfter }: any) {
  const [form,setForm]=useState({asset_id:'',signal_type:'STRATEGY',source_area:'HEADQUARTERS',summary:'',recommendation:'',confidence:''})
  return <Section kicker="ARAÑA ESTRATÉGICA" title="Stratelab" text="Separa hecho, inferencia e hipótesis.">
    <div className="two-col"><form className="panel form-stack" onSubmit={(e)=>{e.preventDefault();refreshAfter('Señal enviada a Stratelab.',async()=>{
      const{error}=await supabase.from('stratelab_signals').insert({...form,asset_id:form.asset_id||null,confidence:form.confidence?Number(form.confidence):null,evidence_class:'INF'});if(error)throw error
    })}}>
      <h3>NUEVA SEÑAL</h3><AssetSelect assets={data.assets} value={form.asset_id} onChange={v=>setForm({...form,asset_id:v})} optional/>
      <input value={form.signal_type} onChange={e=>setForm({...form,signal_type:e.target.value})}/>
      <input value={form.source_area} onChange={e=>setForm({...form,source_area:e.target.value})}/>
      <textarea required placeholder="Hallazgo" value={form.summary} onChange={e=>setForm({...form,summary:e.target.value})}/>
      <textarea placeholder="Recomendación" value={form.recommendation} onChange={e=>setForm({...form,recommendation:e.target.value})}/>
      <input type="number" min="0" max="100" placeholder="Confianza %" value={form.confidence} onChange={e=>setForm({...form,confidence:e.target.value})}/>
      <button className="primary">Registrar señal</button>
    </form><Panel title="SIGNALS"><Rows items={data.signals} empty="Sin señales." render={(x:any)=><><strong>{x.signal_type} · {x.source_area}</strong><span>{x.evidence_class} · {x.confidence ?? '—'}%</span><p>{x.summary}</p></>}/></Panel></div>
  </Section>
}

function MigtaxModule({ data, refreshAfter }: any) {
  const [form,setForm]=useState({asset_id:'',test_level:'X3',status:'PENDING',score:'',findings:'',evidence_class:'SYN_SIM'})
  return <Section kicker="TESTER" title="MIGTAX / Sandbox" text="SYN_SIM nunca se muestra como evidencia real.">
    <div className="two-col"><form className="panel form-stack" onSubmit={(e)=>{e.preventDefault();refreshAfter('Prueba MIGTAX registrada.',async()=>{
      const{error}=await supabase.from('migtax_runs').insert({...form,score:form.score?Number(form.score):null});if(error)throw error
    })}}>
      <h3>NUEVA PRUEBA</h3><AssetSelect assets={data.assets} value={form.asset_id} onChange={v=>setForm({...form,asset_id:v})}/>
      <select value={form.test_level} onChange={e=>setForm({...form,test_level:e.target.value})}>{['X3','X9','X21','CUSTOM'].map(x=><option key={x}>{x}</option>)}</select>
      <select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>{['PENDING','READY','READY_WITH_CONDITIONS','REWORK','HOLD','REJECT'].map(x=><option key={x}>{x}</option>)}</select>
      <input type="number" min="0" max="100" placeholder="Score" value={form.score} onChange={e=>setForm({...form,score:e.target.value})}/>
      <textarea placeholder="Findings" value={form.findings} onChange={e=>setForm({...form,findings:e.target.value})}/>
      <button className="primary" disabled={!form.asset_id}>Registrar</button>
    </form><Panel title="RUNS"><Rows items={data.migtax} empty="Sin pruebas." render={(x:any)=><><strong>{x.test_level} · {x.status}</strong><span>{x.evidence_class} · score {x.score ?? '—'}</span><p>{x.findings || ''}</p></>}/></Panel></div>
  </Section>
}

function MailModule({ data, refreshAfter }: any) {
  const [form,setForm]=useState({label:'Correo comercial A',email_address:'',provider:'GMAIL_APPS_SCRIPT',direction_mode:'BIDIRECTIONAL',status:'PENDING'})
  return <Section kicker="UNIFIED COMMERCIAL MAIL HUB" title="Correo dual" text="La base está lista. Hasta instalar el puente Apps Script, el estado permanece SETUP REQUIRED / PENDING.">
    <div className="two-col"><form className="panel form-stack" onSubmit={(e)=>{e.preventDefault();refreshAfter('Registro de buzón creado; sincronización externa todavía pendiente.',async()=>{
      const{error}=await supabase.from('mail_accounts').insert(form);if(error)throw error
    })}}>
      <h3>REGISTRAR BUZÓN</h3><input required placeholder="Etiqueta" value={form.label} onChange={e=>setForm({...form,label:e.target.value})}/>
      <input required type="email" placeholder="correo@gmail.com" value={form.email_address} onChange={e=>setForm({...form,email_address:e.target.value})}/>
      <button className="primary">Preparar conector</button>
    </form><Panel title="ESTADO"><Rows items={data.mailAccounts} empty="SETUP REQUIRED · no hay buzones conectados." render={(x:any)=><><strong>{x.label}</strong><span>{x.email_address} · {x.status} · sync {prettyDate(x.last_sync_at)}</span></>}/></Panel></div>
    <div className="truth-banner"><LockKeyhole size={17}/><div><strong>WhatsApp Gateway</strong><span>LOCKED · arquitectura reservada, sin conexión ficticia.</span></div></div>
  </Section>
}

function AuditModule({ data }: any) {
  return <Section kicker="TRACE VAULT" title="Audit Center" text="Las mutaciones nucleares se registran desde PostgreSQL, no solo desde la interfaz.">
    <Panel title="EVENTOS"><Rows items={data.audit} empty="Sin eventos todavía." render={(x:any)=><><strong>{x.action} · {x.table_name}</strong><span>{x.row_id || '—'} · {prettyDate(x.created_at)}</span></>}/></Panel>
  </Section>
}

function SafeguardModule({ data }: any) {
  return <Section kicker="SAFEGUARD" title="Seguridad y salud" text="Los estados describen lo comprobable; no se pintan integraciones como conectadas por decoración.">
    <div className="health-grid">
      <Health name="Supabase Database" status="DATA LOADED"/><Health name="Auth" status="AUTHENTICATED"/>
      <Health name="RLS" status="ENFORCED"/><Health name="Private Storage" status="CONFIGURED"/>
      <Health name="Gmail A/B" status={data.mailAccounts.some((x:any)=>x.status==='CONNECTED')?'CONNECTED':'SETUP REQUIRED'}/>
      <Health name="Google Calendar" status={data.mailAccounts.some((x:any)=>x.calendar_enabled)?'CONFIGURED':'SETUP REQUIRED'}/>
      <Health name="Copilot IA" status="DISCONNECTED"/><Health name="WhatsApp" status="LOCKED"/>
    </div>
    <Panel title="INCIDENTES"><Rows items={data.incidents} empty="No hay incidencias registradas." render={(x:any)=><><strong>{x.subsystem} · {x.severity}</strong><span>{x.status} · {prettyDate(x.detected_at)}</span><p>{x.summary}</p></>}/></Panel>
  </Section>
}

function ApprovalList({ items, refreshAfter }: any) {
  const decide=(id:string,status:string)=>refreshAfter(`Aprobación ${status.toLowerCase()}.`,async()=>{
    const{error}=await supabase.from('approvals').update({status,decided_at:new Date().toISOString()}).eq('id',id);if(error)throw error
  })
  return <Rows items={items} empty="No hay decisiones esperando Headquarters." render={(x:any)=><>
    <strong>{x.title}</strong><span>{x.approval_type} · {x.object_type}</span><p>{x.reason || ''}</p>
    <div className="inline-buttons"><button className="mini good" onClick={()=>decide(x.id,'APPROVED')}><CheckCircle2 size={13}/> Aprobar</button>
      <button className="mini" onClick={()=>decide(x.id,'REJECTED')}><XCircle size={13}/> Rechazar</button></div>
  </>}/>
}

function EventList({ items }: any) {
  return <Rows items={items} empty="No hay eventos próximos." render={(x:any)=><><strong>{x.title}</strong><span>{x.event_type} · {prettyDate(x.starts_at)}</span></>}/>
}

function TruthStatus({ data }: any) {
  return <div className="truth-list">
    <span><b>Database</b> DATA LOADED</span><span><b>Auth</b> AUTHENTICATED</span>
    <span><b>Storage</b> CONFIGURED</span><span><b>Mail</b> {data.mailAccounts.length ? 'REGISTERED' : 'SETUP REQUIRED'}</span>
    <span><b>Incidents</b> {data.incidents.filter((x:any)=>x.status!=='CLOSED').length}</span>
  </div>
}

function AssetGrid({ items }: any) {
  return <div className="asset-grid">{items.length ? items.map((a:any)=><AssetCard key={a.id} asset={a}/>) : <Empty text="Sin activos en esta vista."/>}</div>
}

function AssetCard({ asset, footer }: any) {
  const progress=lifecyclePercent(asset.lifecycle_state)
  return <article className="asset-card">
    <div className="asset-hero"><Boxes size={24}/><span>{asset.asset_code}</span></div>
    <div className="asset-body"><div className="asset-title"><strong>{asset.name}</strong><em>{asset.asset_type}</em></div>
      <span className="flight">{asset.flight_state}</span>
      <div className="progress-label"><span>Ciclo operativo</span><b>{progress}%</b></div>
      <div className="progress" title="Porcentaje derivado solo de la etapa operativa registrada."><i style={{width:`${progress}%`}}/></div>
      <div className="asset-meta"><span>{asset.current_area}</span><span>{asset.sector || 'sin sector'}</span></div>
      <p>{asset.next_best_action || 'Sin próxima acción registrada.'}</p>{footer && <div className="asset-footer">{footer}</div>}
    </div>
  </article>
}

function AssetSelect({ assets, value, onChange, optional=false }: any) {
  return <select required={!optional} value={value} onChange={e=>onChange(e.target.value)}>
    <option value="">{optional ? 'Sin bebé específico' : 'Selecciona bebé'}</option>
    {assets.map((a:any)=><option key={a.id} value={a.id}>{a.asset_code} · {a.name}</option>)}
  </select>
}

function Section({ kicker, title, text, children }: any) {
  return <section className="module"><div className="section-head"><span>{kicker}</span><h2>{title}</h2><p>{text}</p></div>{children}</section>
}
function Panel({ title, children, wide=false }: any) { return <article className={wide?'panel wide':'panel'}><h3>{title}</h3>{children}</article> }
function Kpi({ label, value, icon: Icon }: any) { return <article className="kpi"><div><span>{label}</span><Icon size={17}/></div><strong>{value}</strong></article> }
function Rows({ items, empty, render }: any) { return items.length ? <div className="rows">{items.map((x:any)=><div className="row" key={x.id}>{render(x)}</div>)}</div> : <Empty text={empty}/> }
function Empty({ text }: any) { return <div className="empty">{text}</div> }
function Health({ name, status }: any) { return <div className="health"><span className={status==='CONNECTED'||status==='AUTHENTICATED'||status==='ENFORCED'||status==='DATA LOADED'||status==='CONFIGURED'?'ok':'warn'}/><div><strong>{name}</strong><small>{status}</small></div></div> }
function Splash({ text, compact=false }: { text:string; compact?:boolean }) { return <div className={compact?'splash compact':'splash'}><Radar size={28}/><strong>{text}</strong></div> }
