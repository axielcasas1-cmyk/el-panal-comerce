(function(g){
  function chunkText(text,max){
    max=max||140; const clean=String(text||'').replace(/\s+/g,' ').trim(); if(!clean)return[];
    const out=[]; let part='';
    for(const word of clean.split(' ')){
      const next=(part+' '+word).trim();
      if(next.length>max && part){out.push(part); part=word;} else part=next;
    }
    if(part)out.push(part); return out;
  }
  function clampChapter(i,total){ i=Number(i)||0; total=Math.max(1,Number(total)||1); return Math.max(0,Math.min(total-1,i)); }
  function enqueueMessage(queue,text){ const q=Array.isArray(queue)?queue.slice():[]; q.push({id:'m_'+Date.now()+'_'+Math.random().toString(36).slice(2,7),text:String(text||''),status:'PENDIENTE',at:new Date().toISOString()}); return q; }
  function addReward(state,type){ const s=Object.assign({bones:0,skins:0,tails:0},state||{}); if(type==='skin')s.skins++; else if(type==='tail')s.tails++; else s.bones++; return s; }
  g.DragonCore={chunkText,clampChapter,enqueueMessage,addReward};
})(typeof globalThis!=='undefined'?globalThis:this);