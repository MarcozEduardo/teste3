/* ══════════════════════════════════════════════════════════════
   JOGOS OCULTOS
   ──────────────────────────────────────────────────────────────
   Só a IA abre. Cada jogo é um módulo independente: para adicionar
   outro, basta registrar aqui com id, nome e o HTML autocontido.
   O jogo roda em iframe sandboxed, sem acesso ao chat.
   ══════════════════════════════════════════════════════════════ */

export interface GameDef {
  id: string;
  name: string;
  tagline: string;
  /** HTML completo, autocontido, sem dependência externa. */
  html: () => string;
}

const shell = (title: string, accent: string, body: string, script: string) => `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',system-ui,sans-serif;background:#1a1526;color:#f2ecff;
  min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:18px}
h1{font-size:15px;font-weight:700;letter-spacing:.04em;color:${accent}}
.status{font-size:12px;color:#b9a9d4;min-height:18px;text-align:center}
button{font-family:inherit;cursor:pointer}
.reset{margin-top:4px;padding:7px 16px;border-radius:99px;border:1px solid ${accent}55;
  background:transparent;color:${accent};font-size:11px;font-weight:700}
.reset:hover{background:${accent}22}
</style></head><body>
${body}
<script>${script}<\/script>
</body></html>`;

export const GAMES: GameDef[] = [
  {
    id: "damas",
    name: "Damas de bolso",
    tagline: "Tabuleiro 6x6. O Bobby joga de roxo e não leva muito a sério.",
    html: () => shell("Damas", "#c4b5fd", `
<h1>DAMAS DE BOLSO</h1>
<div class="status" id="s">Sua vez. Peças claras.</div>
<canvas id="c" width="336" height="336" style="border-radius:12px;box-shadow:0 14px 40px rgba(0,0,0,.5)"></canvas>
<button class="reset" onclick="init()">Recomeçar</button>`, `
const N=6,S=56,cv=document.getElementById('c'),x=cv.getContext('2d'),st=document.getElementById('s');
let b=[],sel=null,turn=1,over=false;
function init(){b=[];over=false;turn=1;sel=null;
 for(let r=0;r<N;r++){b[r]=[];for(let c=0;c<N;c++){
  const dark=(r+c)%2===1;b[r][c]=dark&&r<2?2:dark&&r>N-3?1:0;}}
 st.textContent='Sua vez. Peças claras.';draw();}
function draw(){for(let r=0;r<N;r++)for(let c=0;c<N;c++){
 x.fillStyle=(r+c)%2?'#2d2440':'#3d3355';x.fillRect(c*S,r*S,S,S);
 if(sel&&sel.r===r&&sel.c===c){x.fillStyle='rgba(196,181,253,.35)';x.fillRect(c*S,r*S,S,S);}
 const p=b[r][c];if(!p)continue;
 x.beginPath();x.arc(c*S+S/2,r*S+S/2,S*.34,0,7);
 x.fillStyle=p===1?'#f3ecff':'#8b5cf6';x.fill();
 x.lineWidth=2;x.strokeStyle=p===1?'#c4b5fd':'#4c1d95';x.stroke();}}
function moves(r,c){const p=b[r][c];if(!p)return[];const d=p===1?-1:1;const out=[];
 for(const dc of[-1,1]){const nr=r+d,nc=c+dc;
  if(nr<0||nr>=N||nc<0||nc>=N)continue;
  if(!b[nr][nc])out.push({r:nr,c:nc});
  else if(b[nr][nc]!==p){const jr=nr+d,jc=nc+dc;
   if(jr>=0&&jr<N&&jc>=0&&jc<N&&!b[jr][jc])out.push({r:jr,c:jc,eat:{r:nr,c:nc}});}}
 return out;}
cv.onclick=e=>{if(over||turn!==1)return;
 const rect=cv.getBoundingClientRect();
 const c=Math.floor((e.clientX-rect.left)/(rect.width/N)),r=Math.floor((e.clientY-rect.top)/(rect.height/N));
 if(b[r]&&b[r][c]===1){sel={r,c};draw();return;}
 if(sel){const m=moves(sel.r,sel.c).find(m=>m.r===r&&m.c===c);
  if(m){b[r][c]=1;b[sel.r][sel.c]=0;if(m.eat)b[m.eat.r][m.eat.c]=0;sel=null;turn=2;draw();
   st.textContent='Bobby pensando...';setTimeout(ai,650);}}};
function ai(){const all=[];
 for(let r=0;r<N;r++)for(let c=0;c<N;c++)if(b[r][c]===2)
  moves(r,c).forEach(m=>all.push({from:{r,c},to:m}));
 if(!all.length){st.textContent='Você venceu. Eu exijo revanche.';over=true;return;}
 all.sort((a,b2)=>(b2.to.eat?1:0)-(a.to.eat?1:0));
 const pick=all[0].to.eat?all[0]:all[Math.floor(Math.random()*all.length)];
 b[pick.to.r][pick.to.c]=2;b[pick.from.r][pick.from.c]=0;
 if(pick.to.eat)b[pick.to.eat.r][pick.to.eat.c]=0;
 turn=1;draw();
 const mine=b.flat().filter(v=>v===1).length;
 st.textContent=mine?(pick.to.eat?'Comi uma. Sem ressentimentos.':'Sua vez.'):'Ganhei. Foi sorte, juro.';
 if(!mine)over=true;}
init();`),
  },
  {
    id: "velha",
    name: "Jogo da velha",
    tagline: "Clássico. O Bobby empata de propósito às vezes.",
    html: () => shell("Velha", "#e4c65b", `
<h1>JOGO DA VELHA</h1>
<div class="status" id="s">Você é X.</div>
<div id="g" style="display:grid;grid-template-columns:repeat(3,74px);gap:6px"></div>
<button class="reset" onclick="init()">Recomeçar</button>`, `
const g=document.getElementById('g'),st=document.getElementById('s');let b,over;
function init(){b=Array(9).fill('');over=false;st.textContent='Você é X.';render();}
function render(){g.innerHTML='';b.forEach((v,i)=>{const d=document.createElement('button');
 d.textContent=v;d.style.cssText='height:74px;font-size:28px;font-weight:800;border-radius:12px;border:1px solid #4c3d6b;background:#251d38;color:'+(v==='X'?'#e4c65b':'#c4b5fd');
 d.onclick=()=>play(i);g.appendChild(d);});}
const W=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
function win(p){return W.some(l=>l.every(i=>b[i]===p));}
function play(i){if(over||b[i])return;b[i]='X';render();
 if(win('X')){st.textContent='Você ganhou. Anotei isso.';over=true;return;}
 if(b.every(Boolean)){st.textContent='Deu velha.';over=true;return;}
 setTimeout(()=>{const free=b.map((v,j)=>v?null:j).filter(v=>v!==null);
  const smart=free.find(j=>{b[j]='O';const w=win('O');b[j]='';return w;})
   ?? free.find(j=>{b[j]='X';const w=win('X');b[j]='';return w;})
   ?? free[Math.floor(Math.random()*free.length)];
  b[smart]='O';render();
  if(win('O')){st.textContent='Ganhei. Não se abale.';over=true;}
  else if(b.every(Boolean)){st.textContent='Deu velha de novo.';over=true;}
  else st.textContent='Sua vez.';},420);}
init();`),
  },
];

export function getGame(id?: string): GameDef {
  if (id) return GAMES.find((g) => g.id === id) || GAMES[0];
  return GAMES[Math.floor(Math.random() * GAMES.length)];
}
