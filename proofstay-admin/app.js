import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const SUPABASE_URL="https://bjpdseqdatxlofwjwaab.supabase.co";
const SUPABASE_KEY="sb_publishable_jKFa00RNUo8VjCcilDaEnA_k9TronbZ";
const supabase=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
const deployment=[["España", 40.46, -3.75, "PD", "country", "Piloto y captación desplegados"], ["Portugal", 39.4, -8.2, "PD", "country", "Piloto y captación desplegados"], ["Estados Unidos", 38, -97, "PD", "country", "Despliegue nacional activo"], ["Canadá", 56.1, -106.3, "PD", "country", "Despliegue nacional activo"], ["México", 23.63, -102.55, "PD", "country", "Piloto y captación desplegados"], ["Colombia", 4.57, -74.3, "PD", "country", "Piloto y captación desplegados"], ["Perú", -9.19, -75.02, "PD", "country", "Piloto y captación desplegados"], ["Costa Rica", 9.75, -83.75, "PD", "country", "Piloto y captación desplegados"], ["República Dominicana", 18.73, -70.16, "PD", "country", "Piloto y captación desplegados"], ["Ecuador", -1.83, -78.18, "PD", "country", "Piloto y captación desplegados"], ["Panamá", 8.54, -80.78, "PD", "country", "Piloto y captación desplegados"], ["Argentina", -38.42, -63.62, "PD", "country", "Piloto y captación desplegados"], ["Brasil", -14.24, -51.93, "PD", "country", "Piloto y captación desplegados"], ["Chile", -35.68, -71.54, "PD", "country", "Piloto y captación desplegados"], ["Uruguay", -32.52, -55.77, "PD", "country", "Piloto y captación desplegados"], ["Guatemala", 15.78, -90.23, "PA", "country", "Nueva oleada de despliegue activada"], ["Bolivia", -16.29, -63.59, "PA", "country", "Nueva oleada de despliegue activada"], ["Paraguay", -23.44, -58.44, "PA", "country", "Nueva oleada de despliegue activada"], ["El Salvador", 13.79, -88.9, "PA", "country", "Nueva oleada de despliegue activada"], ["Honduras", 15.2, -86.24, "PF", "country", "Pendiente de despliegue"], ["Nicaragua", 12.86, -85.21, "PF", "country", "Pendiente de despliegue"], ["Venezuela", 6.42, -66.59, "PF", "country", "Pendiente de despliegue"], ["Belice", 17.19, -88.5, "PF", "country", "Pendiente de despliegue"], ["Madrid", 40.4168, -3.7038, "PD", "city", "España · Comunidad de Madrid"], ["Orlando", 28.5383, -81.3792, "PD", "city", "Estados Unidos · Florida"], ["Miami", 25.7617, -80.1918, "PD", "city", "Estados Unidos · Florida"], ["Austin", 30.2672, -97.7431, "PD", "city", "Estados Unidos · Texas"], ["San Diego", 32.7157, -117.1611, "PD", "city", "Estados Unidos · California"], ["Nashville", 36.1627, -86.7816, "PD", "city", "Estados Unidos · Tennessee"], ["Phoenix", 33.4484, -112.074, "PD", "city", "Estados Unidos · Arizona"], ["Boston", 42.3601, -71.0589, "PD", "city", "Estados Unidos · Massachusetts"], ["Toronto", 43.6532, -79.3832, "PD", "city", "Canadá · Ontario"], ["Montreal", 45.5017, -73.5673, "PD", "city", "Canadá · Québec"], ["Vancouver", 49.2827, -123.1207, "PD", "city", "Canadá · British Columbia"], ["Calgary", 51.0447, -114.0719, "PD", "city", "Canadá · Alberta"], ["Cancún", 21.1619, -86.8515, "PD", "city", "México · Quintana Roo"], ["Medellín", 6.2442, -75.5812, "PD", "city", "Colombia · Antioquia"], ["Cartagena", 10.391, -75.4794, "PD", "city", "Colombia · Bolívar"], ["Lima", -12.0464, -77.0428, "PD", "city", "Perú · Lima"], ["Tamarindo", 10.2993, -85.8371, "PD", "city", "Costa Rica · Guanacaste"], ["Santo Domingo", 18.4861, -69.9312, "PD", "city", "República Dominicana"], ["Quito", -0.1807, -78.4678, "PD", "city", "Ecuador · Pichincha"], ["Ciudad de Panamá", 8.9824, -79.5199, "PD", "city", "Panamá"], ["Buenos Aires", -34.6037, -58.3816, "PD", "city", "Argentina · CABA"], ["Río de Janeiro", -22.9068, -43.1729, "PD", "city", "Brasil · Rio de Janeiro"], ["São Paulo", -23.5505, -46.6333, "PD", "city", "Brasil · São Paulo"], ["Santiago", -33.4489, -70.6693, "PD", "city", "Chile · Región Metropolitana"], ["Montevideo", -34.9011, -56.1645, "PD", "city", "Uruguay"], ["Nueva York", 40.7128, -74.006, "PA", "city", "Estados Unidos · New York"], ["Seattle", 47.6062, -122.3321, "PA", "city", "Estados Unidos · Washington"], ["Ottawa", 45.4215, -75.6972, "PA", "city", "Canadá · Ontario"], ["Ciudad de Guatemala", 14.6349, -90.5069, "PA", "city", "Guatemala · nueva oleada"], ["La Paz", -16.4897, -68.1193, "PA", "city", "Bolivia · nueva oleada"], ["Asunción", -25.2637, -57.5759, "PA", "city", "Paraguay · nueva oleada"], ["San Salvador", 13.6929, -89.2182, "PA", "city", "El Salvador · nueva oleada"], ["Tegucigalpa", 14.0723, -87.1921, "PF", "city", "Honduras"], ["Managua", 12.1149, -86.2362, "PF", "city", "Nicaragua"], ["Caracas", 10.4806, -66.9036, "PF", "city", "Venezuela"], ["Belmopán", 17.251, -88.759, "PF", "city", "Belice"]];
let mode='passport', passportPoints=[], factorId=null, challengeId=null, aal2=false;

const map=L.map('map',{minZoom:2,maxZoom:13,worldCopyJump:true}).setView([18,-45],3);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'}).addTo(map);
const depLayer=L.layerGroup().addTo(map), passLayer=L.layerGroup().addTo(map);
const $=id=>document.getElementById(id);

function depIcon(s){return L.divIcon({className:'proof-marker',html:'<div class="badge '+s.toLowerCase()+'">'+s+'</div>',iconSize:[44,30],iconAnchor:[22,15]})}
function passIcon(s){return L.divIcon({className:'pass-marker',html:'<div class="passPin '+s+'"></div>',iconSize:[22,22],iconAnchor:[11,11]})}
function coord(v,a){const s=a==='lat'?(v>=0?'N':'S'):(v>=0?'E':'O');return Math.abs(v).toFixed(4)+'° '+s}
function classify(row){
 const pass=String(row.passport_status||row.certificate_status||row.status||'').toUpperCase();
 const prop=String(row.property_status||'').toUpperCase();
 const valid=row.valid_until||row.expires_at||null;
 let days=row.days_remaining;
 if(days==null&&valid) days=Math.ceil((new Date(valid).getTime()-Date.now())/86400000);
 if(pass==='EXPIRED'||(typeof days==='number'&&days<0)) return 'expired';
 if(!valid||['PENDING','UNDER_REVIEW','UNKNOWN',''].includes(pass)||['PENDING','UNDER_REVIEW'].includes(prop)) return 'pending';
 if(typeof days==='number'&&days<=30) return 'expiring';
 return 'active';
}
function normalizeRows(data){
 if(!Array.isArray(data)) return [];
 return data.flatMap(r=>{
   const lat=Number(r.latitude),lng=Number(r.longitude);
   if(!Number.isFinite(lat)||!Number.isFinite(lng)) return [];
   return [{...r,latitude:lat,longitude:lng,radarState:classify(r)}];
 });
}
function counts(){
 const c={active:0,expiring:0,expired:0,pending:0};
 passportPoints.forEach(p=>c[p.radarState]++);
 $('nActive').textContent=c.active;$('nExpiring').textContent=c.expiring;$('nExpired').textContent=c.expired;$('nPending').textContent=c.pending;
}
function setMode(next){
 mode=next;
 $('passportCard').classList.toggle('selected',next==='passport');
 $('deploymentCard').classList.toggle('selected',next==='deployment');
 $('viewPassport').classList.toggle('active',next==='passport');
 $('viewDeployment').classList.toggle('active',next==='deployment');
 render();
}
function render(){
 depLayer.clearLayers();passLayer.clearLayers();
 if(mode==='deployment'){
   const city=map.getZoom()>=5;
   deployment.filter(z=>z[4]===(city?'city':'country')).forEach(z=>{
     const m=L.marker([z[1],z[2]],{icon:depIcon(z[3]),title:z[0]}).addTo(depLayer);
     m.bindTooltip('<b>'+z[0]+'</b><br>'+z[3],{direction:'top'});
     m.on('click',()=>{
       $('detail').innerHTML='<span class="ey">GEOLOCALIZACIÓN</span><h3>'+z[0]+'</h3><span class="sw '+z[3].toLowerCase()+'" style="display:inline-grid">'+z[3]+'</span><dl><div><dt>Área</dt><dd>'+z[5]+'</dd></div><div><dt>Coordenadas</dt><dd>'+coord(z[1],'lat')+' · '+coord(z[2],'lon')+'</dd></div></dl>';
     });
   });
 } else {
   passportPoints.forEach(p=>{
     const name=p.display_name||p.public_id||'Alojamiento ProofStay';
     const area=p.public_area||'Área privada';
     const m=L.marker([p.latitude,p.longitude],{icon:passIcon(p.radarState),title:name}).addTo(passLayer);
     m.bindTooltip('<b>'+name+'</b><br>'+area+'<br>'+p.radarState,{direction:'top'});
     m.on('click',()=>{
       $('detail').innerHTML='<span class="ey">ALOJAMIENTO · PASSPORT</span><h3>'+name+'</h3><dl><div><dt>Área</dt><dd>'+area+'</dd></div><div><dt>Estado</dt><dd>'+p.radarState+'</dd></div><div><dt>Passport</dt><dd>'+(p.passport_status||p.certificate_status||p.status||'UNKNOWN')+'</dd></div><div><dt>Vigencia</dt><dd>'+(p.valid_until||p.expires_at||'No registrada')+'</dd></div></dl>';
     });
   });
   if(!passportPoints.length) $('detail').innerHTML='<span class="ey">ALOJAMIENTOS · PASSPORT</span><h3>Sin puntos visibles</h3><p>'+(aal2?'El backend no devolvió coordenadas autorizadas para esta sesión.':'Completa inicio de sesión y AAL2 para consultar los puntos reales.')+'</p>';
 }
}
async function getAal(){
 const {data,error}=await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
 if(error) return false;
 return data?.currentLevel==='aal2';
}
async function loadPassport(){
 if(!aal2) return;
 $('passportHint').textContent='Actualizando puntos autorizados…';
 let res=await supabase.rpc('admin_get_operational_map_points');
 if(res.error){
   const fallback=await supabase.rpc('admin_get_verified_map_points');
   if(fallback.error){
     passportPoints=[];$('passportHint').textContent='El backend rechazó el mapa administrativo: '+fallback.error.message;counts();render();return;
   }
   passportPoints=normalizeRows(fallback.data).map(r=>({...r,property_status:'VERIFIED'}));
   $('passportHint').textContent='Cobertura fallback: puntos VERIFIED autorizados.';
 } else {
   passportPoints=normalizeRows(res.data);
   $('passportHint').textContent='Cobertura operativa completa confirmada por backend.';
 }
 counts();render();
}
async function afterAuth(){
 const {data:{session}}=await supabase.auth.getSession();
 if(!session){aal2=false;$('refresh').disabled=true;$('logout').classList.add('hidden');return;}
 $('logout').classList.remove('hidden');
 aal2=await getAal();
 if(aal2){
   $('authStatus').textContent='Sesión administrativa AAL2 confirmada. Cargando datos reales…';$('authStatus').className='authStatus good';
   $('otpLabel').classList.add('hidden');$('verifyOtp').classList.add('hidden');$('refresh').disabled=false;
   await loadPassport(); return;
 }
 const {data,error}=await supabase.auth.mfa.listFactors();
 if(error){$('authStatus').textContent='No se pudieron consultar factores MFA.';$('authStatus').className='authStatus bad';return;}
 const verified=(data?.totp||[]).find(f=>f.status==='verified');
 if(!verified){$('authStatus').textContent='La cuenta está autenticada, pero no tiene un TOTP verificado para alcanzar AAL2.';$('authStatus').className='authStatus bad';return;}
 factorId=verified.id;
 const ch=await supabase.auth.mfa.challenge({factorId});
 if(ch.error){$('authStatus').textContent='No se pudo iniciar el desafío TOTP.';$('authStatus').className='authStatus bad';return;}
 challengeId=ch.data.id;
 $('otpLabel').classList.remove('hidden');$('verifyOtp').classList.remove('hidden');
 $('authStatus').textContent='Contraseña correcta. Introduce tu código TOTP para alcanzar AAL2.';$('authStatus').className='authStatus';
}
$('login').onclick=async()=>{
 const email=$('email').value.trim(),password=$('password').value;
 $('authStatus').textContent='Validando credenciales…';$('authStatus').className='authStatus';
 const {error}=await supabase.auth.signInWithPassword({email,password});
 $('password').value='';
 if(error){$('authStatus').textContent='Inicio de sesión rechazado: '+error.message;$('authStatus').className='authStatus bad';return;}
 await afterAuth();
};
$('verifyOtp').onclick=async()=>{
 const code=$('otp').value.trim();
 if(!factorId||!challengeId||!code)return;
 const {error}=await supabase.auth.mfa.verify({factorId,challengeId,code});
 $('otp').value='';
 if(error){$('authStatus').textContent='Código TOTP rechazado.';$('authStatus').className='authStatus bad';return;}
 await afterAuth();
};
$('logout').onclick=async()=>{await supabase.auth.signOut();passportPoints=[];aal2=false;counts();render();$('authStatus').textContent='Sesión cerrada.';$('authStatus').className='authStatus';$('logout').classList.add('hidden');$('refresh').disabled=true;};
$('refresh').onclick=()=>loadPassport();
$('viewPassport').onclick=()=>setMode('passport');$('viewDeployment').onclick=()=>setMode('deployment');
$('world').onclick=()=>map.setView([18,-25],2);$('americas').onclick=()=>map.fitBounds([[-57,-170],[68,12]],{padding:[20,20]});$('plus').onclick=()=>map.zoomIn();$('minus').onclick=()=>map.zoomOut();
map.on('zoomend moveend',render);
const dc={PD:0,PA:0,PF:0};deployment.filter(z=>z[4]==='country').forEach(z=>dc[z[3]]++);['PD','PA','PF'].forEach(s=>$('c'+s).textContent=dc[s]);
setMode('passport');afterAuth();
setInterval(()=>{if(aal2&&document.visibilityState==='visible')loadPassport();},60000);
setInterval(()=>{$('clock').textContent=new Date().toLocaleString('es-ES')+' · '+(mode==='passport'?'PASSPORT':'DESPLIEGUE')+' · zoom ×'+map.getZoom();},1000);