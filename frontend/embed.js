/**
 * PawSOS Embeddable Widget
 * Drop this script on any page to add the PawSOS voice assistant.
 *
 * Usage:
 *   <script src="https://your-cdn.com/embed.js" data-agent-id="agent_xxx"></script>
 *
 * Or with defaults:
 *   <script src="embed.js"></script>
 */
(function () {
  const AGENT_ID =
    document.currentScript?.getAttribute('data-agent-id') ||
    'agent_3601kmdwd356fp9aqn11mbp03d6y';

  // ─── Inject Styles ──────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap');

    #pawsos-widget {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 99999;
      font-family: 'DM Sans', -apple-system, sans-serif;
    }

    #pawsos-panel {
      display: none;
      position: absolute;
      bottom: 80px;
      right: 0;
      width: 360px;
      max-height: 480px;
      background: #0a0f1a;
      border: 1px solid rgba(59,130,246,0.2);
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 12px 48px rgba(0,0,0,0.5);
      flex-direction: column;
      animation: pawsos-slideUp 0.3s cubic-bezier(0.16,1,0.3,1);
    }

    #pawsos-panel.open { display: flex; }

    @keyframes pawsos-slideUp {
      from { transform: translateY(16px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    #pawsos-panel-header {
      padding: 16px 20px 12px;
      border-bottom: 1px solid rgba(59,130,246,0.1);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    #pawsos-panel-header h3 {
      font-size: 0.95rem;
      font-weight: 600;
      color: #f1f5f9;
      margin: 0;
    }

    #pawsos-panel-header span {
      font-size: 0.7rem;
      color: #64748b;
    }

    #pawsos-close {
      background: none;
      border: none;
      color: #64748b;
      font-size: 1.2rem;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 8px;
      transition: background 0.2s;
    }

    #pawsos-close:hover { background: rgba(255,255,255,0.05); }

    #pawsos-transcript {
      flex: 1;
      overflow-y: auto;
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 300px;
      scroll-behavior: smooth;
    }

    #pawsos-transcript::-webkit-scrollbar { width: 3px; }
    #pawsos-transcript::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }

    .pawsos-msg {
      max-width: 82%;
      padding: 8px 12px;
      border-radius: 12px;
      font-size: 0.82rem;
      line-height: 1.45;
      animation: pawsos-fadeIn 0.25s ease;
    }

    .pawsos-msg.agent {
      align-self: flex-start;
      background: #111827;
      border: 1px solid rgba(59,130,246,0.12);
      color: #e2e8f0;
      border-bottom-left-radius: 4px;
    }

    .pawsos-msg.user {
      align-self: flex-end;
      background: rgba(59,130,246,0.12);
      border: 1px solid rgba(59,130,246,0.18);
      color: #e2e8f0;
      border-bottom-right-radius: 4px;
    }

    @keyframes pawsos-fadeIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }

    #pawsos-status {
      padding: 8px 16px 12px;
      text-align: center;
      font-size: 0.72rem;
      color: #64748b;
    }

    #pawsos-orb-wrap {
      width: 64px;
      height: 64px;
      cursor: pointer;
      position: relative;
      margin-left: auto;
    }

    #pawsos-orb-canvas {
      width: 100%;
      height: 100%;
      border-radius: 50%;
    }

    #pawsos-orb-wrap::after {
      content: '';
      position: absolute;
      inset: -4px;
      border-radius: 50%;
      border: 2px solid rgba(59,130,246,0.3);
      animation: pawsos-pulse 2.5s infinite;
      pointer-events: none;
    }

    @keyframes pawsos-pulse {
      0% { transform: scale(0.97); opacity: 0.5; }
      70% { transform: scale(1.12); opacity: 0; }
      100% { transform: scale(0.97); opacity: 0; }
    }

    #pawsos-orb-wrap.active::after { border-color: rgba(239,68,68,0.4); }

    #pawsos-badge {
      display: none;
      position: absolute;
      top: -6px;
      left: -6px;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      font-size: 0.55rem;
      font-weight: 700;
      text-align: center;
      line-height: 18px;
      color: white;
      z-index: 1;
    }

    .pawsos-disclaimer {
      text-align: center;
      font-size: 0.6rem;
      color: #334155;
      padding: 0 16px 10px;
      line-height: 1.4;
    }
  `;
  document.head.appendChild(style);

  // ─── Build DOM ──────────────────────────────────────────
  const widget = document.createElement('div');
  widget.id = 'pawsos-widget';
  widget.innerHTML = `
    <div id="pawsos-panel">
      <div id="pawsos-panel-header">
        <div>
          <h3>PawSOS</h3>
          <span>Pet emergency assistant</span>
        </div>
        <button id="pawsos-close">&times;</button>
      </div>
      <div id="pawsos-transcript"></div>
      <div id="pawsos-status">Tap the orb to start</div>
      <div class="pawsos-disclaimer">Not a replacement for veterinary care.</div>
    </div>
    <div id="pawsos-orb-wrap">
      <div id="pawsos-badge"></div>
      <canvas id="pawsos-orb-canvas" width="128" height="128"></canvas>
    </div>
  `;
  document.body.appendChild(widget);

  // ─── Refs ───────────────────────────────────────────────
  const panel = document.getElementById('pawsos-panel');
  const closeBtn = document.getElementById('pawsos-close');
  const transcript = document.getElementById('pawsos-transcript');
  const statusEl = document.getElementById('pawsos-status');
  const orbWrap = document.getElementById('pawsos-orb-wrap');
  const canvas = document.getElementById('pawsos-orb-canvas');
  const badge = document.getElementById('pawsos-badge');
  const ctx = canvas.getContext('2d');
  const W = 128, H = 128, CX = 64, CY = 64;

  let panelOpen = false;
  let conversation = null;
  let isActive = false;
  let orbMode = 'idle';
  let orbTime = 0;
  let morphProgress = 0;

  // ─── Dog Points (compact) ──────────────────────────────
  const dp = [
    [.35,-.62],[.38,-.58],[.40,-.55],[.42,-.60],[.36,-.67],[.30,-.65],[.28,-.60],[.32,-.55],[.38,-.65],[.34,-.58],[.40,-.62],
    [.46,-.56],[.50,-.54],[.52,-.52],[.48,-.50],[.44,-.52],[.54,-.52],[.38,-.60],
    [.26,-.70],[.24,-.75],[.22,-.78],[.20,-.74],[.23,-.68],
    [.28,-.50],[.24,-.45],[.20,-.40],
    [.22,-.35],[.24,-.28],[.22,-.20],[.20,-.12],[.18,-.05],
    [.16,-.42],[.08,-.44],[.00,-.43],[-.08,-.40],[-.16,-.35],[-.22,-.28],[-.26,-.20],
    [-.28,-.12],[-.28,-.04],[-.26,.04],
    [.10,-.30],[.02,-.28],[-.06,-.25],[-.14,-.20],[.06,-.18],[-.02,-.15],[-.10,-.10],[.10,-.10],[.02,-.05],[-.06,0],[.08,0],[-.16,-.05],
    [.18,.02],[.16,.10],[.16,.18],[.16,.26],[.16,.34],[.14,.38],[.18,.38],[.20,.38],
    [.10,.04],[.08,.12],[.08,.20],[.08,.28],[.08,.34],[.06,.38],[.10,.38],
    [-.22,.08],[-.18,.14],[-.14,.20],[-.12,.26],[-.14,.32],[-.16,.38],[-.12,.38],[-.10,.38],
    [-.24,.10],[-.20,.18],[-.16,.14],
    [.04,.08],[-.04,.12],[-.08,.06],
    [-.30,-.08],[-.34,-.16],[-.36,-.24],[-.38,-.32],[-.36,-.38],[-.32,-.42],[-.28,-.44]
  ];
  const SC = 50;
  const particles = dp.map(([dx,dy]) => {
    const a = Math.random() * Math.PI * 2;
    return {
      x: CX, y: CY,
      orbAngle: a, orbSpeed: .3+Math.random()*.5, orbPhase: Math.random()*Math.PI*2,
      dogX: CX+dx*SC, dogY: CY+dy*SC,
      size: .8+Math.random()*1.2, opacity: .4+Math.random()*.5, offset: Math.random()*Math.PI*2
    };
  });

  // ─── Draw ───────────────────────────────────────────────
  function draw() {
    orbTime += 0.016;
    ctx.clearRect(0,0,W,H);
    const tm = orbMode==='speaking'?1:0;
    morphProgress += (tm-morphProgress)*0.04;
    const oR = orbMode==='listening'?24:18;
    const gA = orbMode==='speaking'?0.15:0.06;
    const gr = ctx.createRadialGradient(CX,CY,0,CX,CY,50);
    gr.addColorStop(0,`rgba(59,130,246,${gA})`);
    gr.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=gr;
    ctx.beginPath();ctx.arc(CX,CY,50,0,Math.PI*2);ctx.fill();

    const tw = orbMode==='speaking'?Math.sin(orbTime*5)*5:0;
    for(let i=0;i<particles.length;i++){
      const p=particles[i];
      p.orbAngle+=p.orbSpeed*0.012;
      const br=Math.sin(orbTime*0.6+p.orbPhase)*4;
      const oX=CX+Math.cos(p.orbAngle)*(oR+br);
      const oY=CY+Math.sin(p.orbAngle)*(oR+br)*0.85;
      let dX=p.dogX, dY=p.dogY+Math.sin(orbTime*1.2)*0.8;
      if(i>=particles.length-7) dX+=tw*(1+(i-(particles.length-7))*0.15);
      if(i<17) dY+=orbMode==='speaking'?Math.sin(orbTime*2.5)*1:0;
      const tX=oX*(1-morphProgress)+dX*morphProgress;
      const tY=oY*(1-morphProgress)+dY*morphProgress;
      p.x+=(tX-p.x)*0.07; p.y+=(tY-p.y)*0.07;
      const al=p.opacity*(orbMode==='speaking'?.75+.25*Math.sin(orbTime*2.5+p.offset):.45+.35*Math.sin(orbTime+p.offset));
      const sz=p.size*(1+morphProgress*0.3);
      ctx.beginPath();ctx.arc(p.x,p.y,sz,0,Math.PI*2);
      ctx.fillStyle=`rgba(${100+morphProgress*40|0},${170+morphProgress*20|0},${245-morphProgress*10|0},${al})`;
      ctx.fill();
    }
    requestAnimationFrame(draw);
  }
  draw();

  // ─── UI Helpers ─────────────────────────────────────────
  function addMsg(role, text) {
    if (!text?.trim()) return;
    const d = document.createElement('div');
    d.className = `pawsos-msg ${role}`;
    d.textContent = text;
    transcript.appendChild(d);
    transcript.scrollTop = transcript.scrollHeight;
  }

  function setStatus(t) { statusEl.textContent = t; }

  function showSeverity(level) {
    badge.style.display = 'block';
    if (level === 'EMERGENCY') { badge.style.background = '#ef4444'; badge.textContent = '!'; }
    else if (level === 'URGENT') { badge.style.background = '#f59e0b'; badge.textContent = '!'; }
    else { badge.style.background = '#10b981'; badge.textContent = '✓'; }
  }

  function parseMsg(text) {
    const l = text.toLowerCase();
    if (l.includes('emergency') || l.includes('immediately') || l.includes('right now')) showSeverity('EMERGENCY');
    else if (l.includes('urgent') || l.includes('today')) showSeverity('URGENT');
    else if (l.includes('monitor') || l.includes('at home')) showSeverity('MONITOR');
  }

  // ─── Toggle Panel ───────────────────────────────────────
  closeBtn.onclick = () => { panel.classList.remove('open'); panelOpen = false; };

  orbWrap.onclick = async () => {
    if (!panelOpen) {
      panel.classList.add('open');
      panelOpen = true;
    }
    if (isActive) {
      if (conversation) await conversation.endSession();
      conversation = null;
      isActive = false;
      orbWrap.classList.remove('active');
      orbMode = 'idle';
      setStatus('Tap the orb to start');
      return;
    }
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setStatus('Connecting...');
      const { Conversation } = await import('https://cdn.jsdelivr.net/npm/@11labs/client@0.2.0/+esm');
      conversation = await Conversation.startSession({
        agentId: AGENT_ID,
        onConnect: () => { isActive = true; orbWrap.classList.add('active'); orbMode = 'listening'; setStatus('Listening...'); },
        onDisconnect: () => { isActive = false; orbWrap.classList.remove('active'); orbMode = 'idle'; setStatus('Session ended'); },
        onMessage: (m) => {
          if (m.source === 'ai') { addMsg('agent', m.message); parseMsg(m.message); }
          else if (m.source === 'user') addMsg('user', m.message);
        },
        onModeChange: (m) => {
          if (m.mode === 'speaking') { orbMode = 'speaking'; setStatus('Speaking...'); }
          else if (m.mode === 'listening') { orbMode = 'listening'; setStatus('Listening...'); }
        },
        onError: (e) => { console.error('PawSOS:', e); setStatus('Error — tap to retry'); isActive = false; orbMode = 'idle'; }
      });
    } catch (e) {
      console.error('PawSOS:', e);
      setStatus(e.name === 'NotAllowedError' ? 'Mic access denied' : 'Error — tap to retry');
    }
  };
})();
