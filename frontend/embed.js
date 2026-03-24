/**
 * PawSOS Embeddable Widget
 * Usage: <script src="embed.js" data-agent-id="agent_xxx"></script>
 */
(function () {
  const AGENT_ID =
    document.currentScript?.getAttribute('data-agent-id') ||
    'agent_3601kmdwd356fp9aqn11mbp03d6y';

  // ─── Styles ─────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&display=swap');

    #pawsos-widget {
      position: fixed;
      bottom: 28px;
      right: 28px;
      z-index: 99999;
      font-family: 'DM Sans', -apple-system, sans-serif;
      -webkit-font-smoothing: antialiased;
    }

    /* ── Floating Orb Button ── */
    #pawsos-orb-wrap {
      width: 80px;
      height: 80px;
      cursor: pointer;
      position: relative;
      margin-left: auto;
      transition: transform 0.3s cubic-bezier(0.16,1,0.3,1);
    }
    #pawsos-orb-wrap:hover { transform: scale(1.06); }
    #pawsos-orb-wrap:active { transform: scale(0.96); }

    #pawsos-orb-canvas {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: #00685A;
    }

    #pawsos-orb-ring {
      position: absolute;
      inset: -6px;
      border-radius: 50%;
      border: 2px solid rgba(0,104,90,0.25);
      animation: pawsos-pulse 3s ease-out infinite;
      pointer-events: none;
    }
    #pawsos-orb-wrap.active #pawsos-orb-ring {
      border-color: rgba(0,134,110,0.35);
    }

    @keyframes pawsos-pulse {
      0% { transform: scale(0.96); opacity: 0.6; }
      70% { transform: scale(1.18); opacity: 0; }
      100% { transform: scale(0.96); opacity: 0; }
    }

    #pawsos-orb-label {
      position: absolute;
      bottom: -22px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 0.6rem;
      font-weight: 600;
      color: rgba(0,104,90,0.7);
      letter-spacing: 0.5px;
      white-space: nowrap;
      pointer-events: none;
    }

    #pawsos-badge {
      display: none;
      position: absolute;
      top: -4px;
      left: -4px;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      font-size: 0.6rem;
      font-weight: 700;
      text-align: center;
      line-height: 20px;
      color: white;
      z-index: 1;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }

    /* ── Panel ── */
    #pawsos-panel {
      display: none;
      position: absolute;
      bottom: 100px;
      right: 0;
      width: 380px;
      max-height: 540px;
      background: #080d16;
      border: 1px solid rgba(0,104,90,0.15);
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 16px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,104,90,0.08);
      flex-direction: column;
      animation: pawsos-slideUp 0.35s cubic-bezier(0.16,1,0.3,1);
    }
    #pawsos-panel.open { display: flex; }

    @keyframes pawsos-slideUp {
      from { transform: translateY(20px) scale(0.97); opacity: 0; }
      to { transform: translateY(0) scale(1); opacity: 1; }
    }

    /* ── Panel Header with Animation ── */
    #pawsos-panel-header {
      padding: 20px 20px 16px;
      display: flex;
      align-items: center;
      gap: 14px;
      border-bottom: 1px solid rgba(0,104,90,0.08);
      background: linear-gradient(180deg, rgba(0,104,90,0.04) 0%, transparent 100%);
    }

    #pawsos-header-canvas {
      width: 44px;
      height: 44px;
      flex-shrink: 0;
    }

    #pawsos-header-info { flex: 1; }

    #pawsos-header-info h3 {
      font-family: 'DM Serif Display', serif;
      font-size: 1.05rem;
      font-weight: 400;
      color: #f1f5f9;
      margin: 0;
      letter-spacing: -0.3px;
    }

    #pawsos-header-status {
      font-size: 0.68rem;
      color: #64748b;
      margin-top: 2px;
      transition: color 0.3s;
    }
    #pawsos-header-status.active { color: #00685A; }

    #pawsos-close {
      background: none;
      border: none;
      color: #475569;
      font-size: 1.3rem;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 8px;
      transition: all 0.2s;
      line-height: 1;
    }
    #pawsos-close:hover { background: rgba(255,255,255,0.05); color: #94a3b8; }

    /* ── Transcript ── */
    #pawsos-transcript {
      flex: 1;
      overflow-y: auto;
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-height: 320px;
      scroll-behavior: smooth;
    }
    #pawsos-transcript::-webkit-scrollbar { width: 3px; }
    #pawsos-transcript::-webkit-scrollbar-track { background: transparent; }
    #pawsos-transcript::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 3px; }

    .pawsos-msg {
      max-width: 84%;
      padding: 10px 14px;
      border-radius: 14px;
      font-size: 0.82rem;
      line-height: 1.5;
      animation: pawsos-fadeIn 0.3s ease;
    }
    .pawsos-msg.agent {
      align-self: flex-start;
      background: #0f1823;
      border: 1px solid rgba(0,104,90,0.1);
      color: #e2e8f0;
      border-bottom-left-radius: 4px;
    }
    .pawsos-msg.user {
      align-self: flex-end;
      background: rgba(0,104,90,0.1);
      border: 1px solid rgba(0,104,90,0.15);
      color: #e2e8f0;
      border-bottom-right-radius: 4px;
    }

    @keyframes pawsos-fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* ── Footer ── */
    #pawsos-footer {
      padding: 10px 16px 14px;
      text-align: center;
      border-top: 1px solid rgba(0,104,90,0.06);
    }
    #pawsos-footer-text {
      font-size: 0.58rem;
      color: #334155;
      line-height: 1.4;
    }

    /* ── Severity Bar ── */
    #pawsos-severity {
      display: none;
      padding: 10px 16px;
      text-align: center;
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.5px;
      animation: pawsos-fadeIn 0.4s ease;
    }
    #pawsos-severity.emergency { display: block; background: rgba(239,68,68,0.1); color: #ef4444; border-bottom: 1px solid rgba(239,68,68,0.15); }
    #pawsos-severity.urgent { display: block; background: rgba(245,158,11,0.1); color: #f59e0b; border-bottom: 1px solid rgba(245,158,11,0.15); }
    #pawsos-severity.monitor { display: block; background: rgba(16,185,129,0.1); color: #10b981; border-bottom: 1px solid rgba(16,185,129,0.15); }

    @media (max-width: 420px) {
      #pawsos-panel { width: calc(100vw - 24px); right: -16px; }
    }
  `;
  document.head.appendChild(style);

  // ─── DOM ────────────────────────────────────────────────
  const widget = document.createElement('div');
  widget.id = 'pawsos-widget';
  widget.innerHTML = `
    <div id="pawsos-panel">
      <div id="pawsos-panel-header">
        <canvas id="pawsos-header-canvas" width="88" height="88"></canvas>
        <div id="pawsos-header-info">
          <h3>PawSOS</h3>
          <div id="pawsos-header-status">Tap the orb to start</div>
        </div>
        <button id="pawsos-close">&times;</button>
      </div>
      <div id="pawsos-severity"></div>
      <div id="pawsos-transcript"></div>
      <div id="pawsos-footer">
        <div id="pawsos-footer-text">Not a replacement for professional veterinary care</div>
      </div>
    </div>
    <div id="pawsos-orb-wrap">
      <div id="pawsos-orb-ring"></div>
      <div id="pawsos-badge"></div>
      <canvas id="pawsos-orb-canvas" width="160" height="160"></canvas>
      <div id="pawsos-orb-label">PawSOS</div>
    </div>
  `;
  document.body.appendChild(widget);

  // ─── Refs ───────────────────────────────────────────────
  const panel = document.getElementById('pawsos-panel');
  const transcript = document.getElementById('pawsos-transcript');
  const statusEl = document.getElementById('pawsos-header-status');
  const orbWrap = document.getElementById('pawsos-orb-wrap');
  const badge = document.getElementById('pawsos-badge');
  const severityBar = document.getElementById('pawsos-severity');

  let panelOpen = false;
  let conversation = null;
  let isActive = false;
  let orbMode = 'idle';
  let orbTime = 0;

  // ─── Dog Points ─────────────────────────────────────────
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

  // Create particle system for a canvas
  function createParticles(cx, cy, scale) {
    return dp.map(([dx, dy]) => ({
      x: cx, y: cy,
      orbAngle: Math.random() * Math.PI * 2,
      orbSpeed: 0.25 + Math.random() * 0.45,
      orbPhase: Math.random() * Math.PI * 2,
      dogX: cx + dx * scale, dogY: cy + dy * scale,
      size: 0.8 + Math.random() * 1.2,
      opacity: 0.35 + Math.random() * 0.55,
      offset: Math.random() * Math.PI * 2
    }));
  }

  // Draw particles on any canvas
  function drawParticles(ctx, w, h, cx, cy, orbR, particles, morph) {
    ctx.clearRect(0, 0, w, h);

    // Glow
    const ga = orbMode === 'speaking' ? 0.14 : 0.06;
    const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.4);
    gr.addColorStop(0, `rgba(255,255,255,${ga})`);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.arc(cx, cy, w * 0.4, 0, Math.PI * 2); ctx.fill();

    const tw = orbMode === 'speaking' ? Math.sin(orbTime * 5) * w * 0.04 : 0;
    const len = particles.length;

    for (let i = 0; i < len; i++) {
      const p = particles[i];
      p.orbAngle += p.orbSpeed * 0.011;
      const br = Math.sin(orbTime * 0.6 + p.orbPhase) * orbR * 0.15;
      const oX = cx + Math.cos(p.orbAngle) * (orbR + br);
      const oY = cy + Math.sin(p.orbAngle) * (orbR + br) * 0.85;
      let dX = p.dogX, dY = p.dogY + Math.sin(orbTime * 1.2) * w * 0.006;
      if (i >= len - 7) dX += tw * (1 + (i - (len - 7)) * 0.15);
      if (i < 17) dY += orbMode === 'speaking' ? Math.sin(orbTime * 2.5) * w * 0.008 : 0;
      const tX = oX * (1 - morph) + dX * morph;
      const tY = oY * (1 - morph) + dY * morph;
      p.x += (tX - p.x) * 0.07;
      p.y += (tY - p.y) * 0.07;
      const al = p.opacity * (orbMode === 'speaking'
        ? 0.75 + 0.25 * Math.sin(orbTime * 2.5 + p.offset)
        : 0.4 + 0.35 * Math.sin(orbTime + p.offset));
      const sz = p.size * (1 + morph * 0.3);
      const r = 255;
      const g = 255;
      const b = 255;
      ctx.beginPath(); ctx.arc(p.x, p.y, sz, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r},${g},${b},${al})`;
      ctx.fill();
      if (morph > 0.5) {
        ctx.beginPath(); ctx.arc(p.x, p.y, sz * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${al * 0.07})`;
        ctx.fill();
      }
    }
  }

  // ─── Two Canvases: Orb + Header ─────────────────────────
  const orbCanvas = document.getElementById('pawsos-orb-canvas');
  const orbCtx = orbCanvas.getContext('2d');
  const orbW = 160, orbCX = 80, orbCY = 80;
  const orbParticles = createParticles(orbCX, orbCY, 60);

  const hdrCanvas = document.getElementById('pawsos-header-canvas');
  const hdrCtx = hdrCanvas.getContext('2d');
  const hdrW = 88, hdrCX = 44, hdrCY = 44;
  const hdrParticles = createParticles(hdrCX, hdrCY, 32);

  let morphProgress = 0;

  function animate() {
    orbTime += 0.016;
    const targetMorph = orbMode === 'speaking' ? 1 : 0;
    morphProgress += (targetMorph - morphProgress) * 0.04;
    const orbR = orbMode === 'listening' ? 28 : 20;
    const hdrR = orbMode === 'listening' ? 16 : 12;

    drawParticles(orbCtx, orbW, orbW, orbCX, orbCY, orbR, orbParticles, morphProgress);
    drawParticles(hdrCtx, hdrW, hdrW, hdrCX, hdrCY, hdrR, hdrParticles, morphProgress);

    requestAnimationFrame(animate);
  }
  animate();

  // ─── UI ─────────────────────────────────────────────────
  function addMsg(role, text) {
    if (!text?.trim()) return;
    const d = document.createElement('div');
    d.className = `pawsos-msg ${role}`;
    d.textContent = text;
    transcript.appendChild(d);
    transcript.scrollTop = transcript.scrollHeight;
  }

  function setStatus(t, active) {
    statusEl.textContent = t;
    statusEl.classList.toggle('active', !!active);
  }

  function showSeverity(level) {
    badge.style.display = 'block';
    severityBar.className = '';
    if (level === 'EMERGENCY') {
      badge.style.background = '#ef4444'; badge.textContent = '!';
      severityBar.className = 'emergency'; severityBar.textContent = 'EMERGENCY — Vet needed now';
    } else if (level === 'URGENT') {
      badge.style.background = '#f59e0b'; badge.textContent = '!';
      severityBar.className = 'urgent'; severityBar.textContent = 'URGENT — See vet today';
    } else {
      badge.style.background = '#10b981'; badge.textContent = '✓';
      severityBar.className = 'monitor'; severityBar.textContent = 'MONITOR — Watch at home';
    }
  }

  function parseMsg(text) {
    const l = text.toLowerCase();
    if (l.includes('emergency') || l.includes('immediately') || l.includes('right now') || l.includes('αμέσως') || l.includes('επείγον')) showSeverity('EMERGENCY');
    else if (l.includes('urgent') || l.includes('today') || l.includes('σήμερα')) showSeverity('URGENT');
    else if (l.includes('monitor') || l.includes('at home') || l.includes('στο σπίτι') || l.includes('παρακολούθ')) showSeverity('MONITOR');
  }

  // ─── Panel Toggle ───────────────────────────────────────
  document.getElementById('pawsos-close').onclick = async () => {
    panel.classList.remove('open'); panelOpen = false;
    if (conversation) { await conversation.endSession(); conversation = null; }
    isActive = false; orbWrap.classList.remove('active'); orbMode = 'idle';
  };

  orbWrap.onclick = async () => {
    if (!panelOpen) { panel.classList.add('open'); panelOpen = true; }

    if (isActive) {
      if (conversation) await conversation.endSession();
      conversation = null; isActive = false;
      orbWrap.classList.remove('active'); orbMode = 'idle';
      setStatus('Tap the orb to start');
      return;
    }

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setStatus('Connecting...', true);

      const { Conversation } = await import('https://cdn.jsdelivr.net/npm/@11labs/client@0.2.0/+esm');
      conversation = await Conversation.startSession({
        agentId: AGENT_ID,
        onConnect: () => {
          isActive = true; orbWrap.classList.add('active');
          orbMode = 'listening'; setStatus('Listening...', true);
        },
        onDisconnect: () => {
          isActive = false; orbWrap.classList.remove('active');
          orbMode = 'idle'; setStatus('Session ended');
        },
        onMessage: (m) => {
          if (m.source === 'ai') { addMsg('agent', m.message); parseMsg(m.message); }
          else if (m.source === 'user') addMsg('user', m.message);
        },
        onModeChange: (m) => {
          if (m.mode === 'speaking') { orbMode = 'speaking'; setStatus('Speaking...', true); }
          else if (m.mode === 'listening') { orbMode = 'listening'; setStatus('Listening...', true); }
        },
        onError: (e) => {
          console.error('PawSOS:', e);
          setStatus('Error — tap to retry');
          isActive = false; orbMode = 'idle';
        }
      });
    } catch (e) {
      console.error('PawSOS:', e);
      setStatus(e.name === 'NotAllowedError' ? 'Mic access denied' : 'Error — tap to retry');
    }
  };
})();
