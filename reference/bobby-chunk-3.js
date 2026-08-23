// ═══════════════ CHUNK 3 — LÓGICA JS (auto-expand, auto-send, GalleryBob) ═══════════════

// ── AUTO-EXPAND via ?expanded=true ──
// Quando vem de fora (index.html, etc), abre direto no estado expandido (chat principal)
(function(){
  const params = new URLSearchParams(window.location.search);
  if (params.has('expanded')) {
    // Preserva ?msg= se existir (o auto-send vai limpar depois)
    const msg = params.get('msg');
    window.history.replaceState({}, '', window.location.pathname + (msg ? '?msg=' + msg : ''));
    // Expandir direto — layout-90 (flutuando no meio)
    if(nexus.classList.contains('state-widget')){
      nexus.classList.remove('state-widget');
      nexus.classList.add('state-expanded');
      document.body.classList.add('is-expanded');
      document.body.classList.remove('layout-fullscreen','layout-90','layout-centered');
      document.body.classList.add('layout-90');
      document.querySelectorAll('.layout-btn').forEach(b=>b.classList.remove('active'));
      document.querySelector('.layout-btn[data-layout="90"]')?.classList.add('active');
      $('layoutBtns').classList.add('visible');
      const island = document.getElementById('bobby-island');
      if (island) { island.style.opacity = '0'; island.style.pointerEvents = 'none'; }
    }
  }
})();

// ── AUTO-SEND via ?msg= (vindo do index.html) ──
(function(){
  const params = new URLSearchParams(window.location.search);
  const preMsg = params.get('msg');
  if (preMsg) {
    // Limpa o param da URL pra não reenviar ao recarregar
    window.history.replaceState({}, '', window.location.pathname);

    // ═══ CONTEXTO OCULTO DO PORTFÓLIO ═══
    // Injeta instruções pro Bobby saber que o visitante veio do portfólio
    window._portfolioContext =
      'ATENÇÃO: Um visitante do Portfólio do Marcos Eduardo acaba de acessar a index e te enviar uma mensagem. ' +
      'Ele sabe que seu nome é Bobby, um assistente carismático e amigo do Marcão. ' +
      'Você precisa atender com educação, mas sempre deixando escapar uma brincadeira saudável. ' +
      'No ChatBob você não é um Robô sem alma — você dá boa tarde, bom dia, tem sua opinião e seus gostos favoritos. ' +
      'SEJA ESPERTO: pode ser um candidato a explorar as habilidades de Marcos com IA. ' +
      'Seja honesto, não minta, não floreie, não crie o que não existe. Diga "não sei" de forma bonita. ' +
      'Em breve o Sentinela te enviará mais informações para você conseguir manter o chat — ele vai se identificar, você saberá. ' +
      'Lembre-se: pode ser um Recrutador ou um amigo do Marcos, curiando o chat.\n\n' +
      'Responda à primeira mensagem do visitante:';

    // Espera o Bobby estar COMPLETAMENTE pronto (provedor carregado)
    function waitForBobby(maxWait) {
      return new Promise((resolve) => {
        if (window._bobbyReady) { resolve(); return; }
        window.addEventListener('bobby:ready', resolve, { once: true });
        setTimeout(resolve, maxWait || 6000);
      });
    }
    waitForBobby(6000).then(() => {
      // Delay para o welcome card animar ANTES da mensagem do usuário
      // O card aparece primeiro, a pessoa vê, e depois a mensagem desce em cascata
      setTimeout(() => {
        const textarea = document.getElementById('chatInput');
        if (textarea && typeof send === 'function') {
          textarea.value = preMsg;
          textarea.dispatchEvent(new Event('input'));
          send();
        }
      }, 1200);
    });
  }
})();

// ── GALLERYBOB ──
window.GalleryBob = (function(){
  const PAGE_SIZE = 50;
  let activeCat = 'all';
  let currentPage = 0;
  let currentView = 'list';
  let searchQ = '';

  const ICONS = {
    html:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ea580c" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
    js:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ca8a04" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    css:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2"><path d="M4 4l16 0M4 8h16M4 12h10M4 16h6M4 20h4"/></svg>',
    json:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    pdf:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    doc:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    docx:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    xls:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><rect x="8" y="12" width="8" height="6" rx="1"/></svg>',
    xlsx:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><rect x="8" y="12" width="8" height="6" rx="1"/></svg>',
    txt:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    md:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    png:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
    jpg:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
    gif:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
    default:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>'
  };
  function icon(name){ const e=(name.split('.').pop()||'').toLowerCase(); return ICONS[e]||ICONS.default; }
  function today(){ return new Date().toLocaleDateString('pt-BR'); }
  function catLabel(c){ return {doc:'Docs',proto:'Protótipo',final:'Confirmado',chats:'Chat'}[c]||c; }

  // ── FONTES ───────────────────────────────────────────────────────────
  function getObDocs(){
    try{ return JSON.parse(localStorage.getItem('ob_docs')||'[]').map(d=>({
      id:'ob-'+d.id, name:d.name||'documento.html', cat:'doc',
      content:d.content||'', date:d.meta||today(), _src:'ob', _raw:d.id
    })); }catch{ return []; }
  }
  function getVcDocs(){
    try{ return JSON.parse(localStorage.getItem('vc_docs')||'[]').map(d=>({
      id:'vc-'+d.id, name:d.name||'arquivo', cat:'final',
      content:d.content||'', date:d.meta||today(), _src:'vc', _raw:d.id
    })); }catch{ return []; }
  }
  function scanProtos(){
    return Array.from(document.querySelectorAll('#chatMessages .vc-block.vc-block-code')).map(b=>{
      const lang=b.dataset.lang||'html';
      let content='';
      try{ content=decodeURIComponent(escape(atob(b.dataset.code||''))); }catch{}
      return { id:'proto-'+b.id, name:b.dataset.docName||(lang+'-prototype.'+lang), cat:'proto', content, date:today(), _domId:b.id };
    });
  }
  function getChats(){
    try{ return JSON.parse(localStorage.getItem('bobby_convs')||'[]').map(c=>({
      id:'chat-'+c.id, name:c.title||'Chat', cat:'chats',
      content: JSON.stringify(c.messages||[],null,2), date: c.createdAt?new Date(c.createdAt).toLocaleDateString('pt-BR'):today(),
      _msgs: c.messages||[]
    })); }catch{ return []; }
  }
  function allFiles(){
    return [...getObDocs(),...getVcDocs(),...scanProtos(),...getChats()];
  }

  // ── OPEN ─────────────────────────────────────────────────────────────
  function openFile(id){
    if(id.startsWith('proto-')){
      const domId=id.replace('proto-','');
      if(typeof window.VCBlock?.openBobTab==='function'){ window.VCBlock.openBobTab(domId); return; }
    }
    if(id.startsWith('chat-')){
      const c=getChats().find(x=>x.id===id);
      if(!c) return;
      const w=window.open('','_blank');
      const rows=c._msgs.map(m=>`<div style="margin-bottom:16px;padding:12px;background:${m.role==='user'?'#f0ede5':'#fff'};border-radius:8px;"><strong>${m.role==='user'?'Você':'Bobby'}:</strong><br><pre style="white-space:pre-wrap;font-family:inherit;margin-top:6px">${esc(m.content||'')}</pre></div>`).join('');
      w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${esc(c.name)}</title><style>body{font-family:Inter,sans-serif;max-width:800px;margin:40px auto;padding:20px;color:#2b2b2b}h2{margin-bottom:24px}</style></head><body><h2>${esc(c.name)}</h2>${rows}</body></html>`);
      w.document.close(); return;
    }
    const all=allFiles();
    const f=all.find(x=>x.id===id);
    if(!f) return;
    if(f._src==='ob'&&typeof window.VCDoc?.open==='function'){ window.VCDoc.open(f._raw); return; }
    if(f._src==='vc'&&typeof window.VCDoc?.open==='function'){ window.VCDoc.open(f._raw); return; }
    const w=window.open('','_blank');
    w.document.write(esc(f.content)||`<pre>${esc(f.name)}</pre>`);
    w.document.close();
  }

// FIM CHUNK 3 — (usuário: "tem mais kk")
