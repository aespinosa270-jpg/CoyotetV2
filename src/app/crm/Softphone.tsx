'use client';

import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import {
  ArrowDownLeft, ArrowUpRight, ChevronDown, Clock,
  Delete, Hash, Keyboard, List, Loader2,
  Mic, MicOff, Music2, Pause, Phone, PhoneCall,
  PhoneForwarded, PhoneIncoming, PhoneOff, PhoneMissed,
  Play, RadioTower, RotateCcw, Settings, Volume2,
  VolumeX, Wifi, WifiOff, X, Zap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ─────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────
type Status      = 'offline' | 'connecting' | 'ready' | 'ringing' | 'on-call' | 'on-hold';
type AgentStatus = 'available' | 'busy' | 'away' | 'dnd';
type Tab         = 'dialpad' | 'history' | 'settings';
type CallDir     = 'in' | 'out' | 'missed';

interface SipConfig {
  wsUri: string; sipDomain: string; dappDomain: string;
  username: string; password: string; callerId?: string | null;
}
interface CallRecord {
  id: string; number: string; direction: CallDir;
  duration: number; timestamp: Date;
}
interface SpeedDial { name: string; number: string }

// ─────────────────────────────────────────────────────────────────
// AUDIO CONTEXT SINGLETON — se desbloquea una vez con gesto usuario
//
// Los browsers exigen que AudioContext se cree/resuma DENTRO
// de un event handler de click/touch. Si lo creamos en respuesta
// a un WebSocket (ring entrante), el contexto queda suspended.
//
// Solución: crearlo la primera vez que el usuario hace click en
// cualquier parte del panel, y reutilizarlo para siempre.
// ─────────────────────────────────────────────────────────────────
let _sharedCtx: AudioContext | null = null;

async function getAudioCtx(): Promise<AudioContext> {
  if (_sharedCtx && _sharedCtx.state !== 'closed') {
    if (_sharedCtx.state === 'suspended') await _sharedCtx.resume();
    return _sharedCtx;
  }
  const Ctx = window.AudioContext || (window as any).webkitAudioContext;
  _sharedCtx = new Ctx();
  if (_sharedCtx.state === 'suspended') await _sharedCtx.resume();
  return _sharedCtx;
}

// Llamar esto en cualquier click del usuario para pre-desbloquear
async function primeAudioCtx() {
  try { await getAudioCtx(); } catch {}
}

// ─────────────────────────────────────────────────────────────────
// MARIMBA RINGER — 66 BPM, 100% Web Audio API, cero archivos
//
// Anatomía del sonido de marimba:
//   • Sine fundamental    — cuerpo/warmth
//   • Triangle 2x freq    — armónico brillante
//   • Sine 4x freq        — click de ataque (corto)
//   • BandPass filter     — hueco resonante de caja de madera
//   • Envelope 4ms / 280ms — percusivo
//   • Delay 90ms + feedback — reverb de sala pequeña
//   • Dos patrones MIDI alternados cada 16 pasos a 66 BPM
// ─────────────────────────────────────────────────────────────────
class MarimbaRinger {
  private masterGain: GainNode | null = null;
  private reverbDelay: DelayNode | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private step = 0;
  private ctx: AudioContext | null = null;

  // Notas MIDI — patrón clásico estilo iOS
  private readonly A = [76, 79, 83, 79, 76, 79, 83, 86];
  private readonly B = [74, 78, 81, 78, 74, 78, 81, 84];

  async start(bpm = 66, volume = 0.32) {
    if (this.running) return;

    // Usar el contexto compartido ya desbloqueado por el usuario
    try {
      this.ctx = await getAudioCtx();
    } catch {
      console.warn('[Ringer] No se pudo obtener AudioContext');
      return;
    }

    this.running = true;
    this.step = 0;

    // Master volume
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(volume, 0);
    this.masterGain.connect(this.ctx.destination);

    // Reverb: delay corto con feedback simula resonancia de caja marimba
    this.reverbDelay = this.ctx.createDelay(0.5);
    this.reverbDelay.delayTime.setValueAtTime(0.09, 0);
    const fbGain = this.ctx.createGain();
    fbGain.gain.setValueAtTime(0.2, 0);
    const wetGain = this.ctx.createGain();
    wetGain.gain.setValueAtTime(0.18, 0);
    this.reverbDelay.connect(fbGain);
    fbGain.connect(this.reverbDelay);
    this.reverbDelay.connect(wetGain);
    wetGain.connect(this.masterGain);

    const stepMs = (60_000 / bpm) / 2; // corchea ≈ 227ms a 66 BPM

    const tick = () => {
      if (!this.running || !this.ctx || !this.masterGain || !this.reverbDelay) return;
      const pattern = Math.floor(this.step / 16) % 2 === 0 ? this.A : this.B;
      const midi    = pattern[this.step % pattern.length];
      const accent  = this.step % 4 === 0 ? 1.0 : 0.68;
      this.strike(midi, accent);
      this.step++;
    };

    tick(); // golpe inmediato
    this.timer = setInterval(tick, stepMs);
  }

  stop() {
    this.running = false;
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    // NO cerramos el ctx compartido — solo desconectamos nuestros nodos
    try { this.masterGain?.disconnect(); } catch {}
    try { this.reverbDelay?.disconnect(); } catch {}
    this.masterGain = null;
    this.reverbDelay = null;
    this.ctx = null;
  }

  private strike(midi: number, accent: number) {
    const ctx = this.ctx;
    const master = this.masterGain;
    const reverb = this.reverbDelay;
    if (!ctx || !master || !reverb) return;

    const now  = ctx.currentTime;
    const freq = 440 * Math.pow(2, (midi - 69) / 12);

    // Osciladores
    const sine  = ctx.createOscillator(); // fundamental
    sine.type   = 'sine';
    sine.frequency.setValueAtTime(freq, now);

    const tri   = ctx.createOscillator(); // armónico 2x
    tri.type    = 'triangle';
    tri.frequency.setValueAtTime(freq * 2, now);

    const click = ctx.createOscillator(); // click 4x (brevísimo)
    click.type  = 'sine';
    click.frequency.setValueAtTime(freq * 4, now);

    // BandPass — da el hueco de madera resonante
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(freq * 1.4, now);
    bp.Q.setValueAtTime(7, now);

    // Ganancias individuales
    const triGain = ctx.createGain();
    triGain.gain.setValueAtTime(0.35, now);

    const clickGain = ctx.createGain();
    clickGain.gain.setValueAtTime(0.0001, now);
    clickGain.gain.exponentialRampToValueAtTime(0.12 * accent, now + 0.002);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);

    // Envelope principal: ataque 4ms, decay natural 280ms
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0.0001, now);
    amp.gain.exponentialRampToValueAtTime(0.88 * accent, now + 0.004);
    amp.gain.exponentialRampToValueAtTime(0.001,         now + 0.32);

    // Grafo de audio
    sine.connect(bp);
    tri.connect(triGain);  triGain.connect(bp);
    click.connect(clickGain); clickGain.connect(bp);

    bp.connect(amp);
    amp.connect(master);       // señal seca
    amp.connect(reverb);       // feed al reverb

    const end = now + 0.35;
    sine.start(now);   tri.start(now);   click.start(now);
    sine.stop(end);    tri.stop(end);    click.stop(end);
  }
}

// ─────────────────────────────────────────────────────────────────
// DTMF — frecuencias RFC 4733 via Web Audio
// ─────────────────────────────────────────────────────────────────
const DTMF_FREQS: Record<string, [number, number]> = {
  '1':[697,1209], '2':[697,1336], '3':[697,1477],
  '4':[770,1209], '5':[770,1336], '6':[770,1477],
  '7':[852,1209], '8':[852,1336], '9':[852,1477],
  '*':[941,1209], '0':[941,1336], '#':[941,1477],
};

async function playDtmf(digit: string, ms = 110, vol = 0.13) {
  const f = DTMF_FREQS[digit]; if (!f) return;
  try {
    const ctx  = await getAudioCtx();
    const now  = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, now);
    gain.connect(ctx.destination);
    f.forEach(freq => {
      const o = ctx.createOscillator();
      o.type = 'sine'; o.frequency.setValueAtTime(freq, now);
      o.connect(gain); o.start(now); o.stop(now + ms / 1000);
    });
    // Desconectar el gain cuando termine
    setTimeout(() => { try { gain.disconnect(); } catch {} }, ms + 150);
  } catch {}
}

// ─────────────────────────────────────────────────────────────────
// REMOTE AUDIO — patrón correcto para JsSIP + SignalWire
//
// El truco: escuchar 'peerconnection' en el session ANTES de answer/call
// para capturar ontrack en cuanto llega el track remoto.
// El <audio autoPlay> es la ruta más estable cross-browser para voz.
// ─────────────────────────────────────────────────────────────────
class RemoteAudio {
  readonly el: HTMLAudioElement;

  constructor() {
    this.el          = document.createElement('audio');
    this.el.autoplay = true;
    this.el.setAttribute('playsinline', 'true');
    this.el.style.cssText = 'position:absolute;width:0;height:0;opacity:0;pointer-events:none';
    document.body.appendChild(this.el);
  }

  // Llamar INMEDIATAMENTE después de crear la session, antes de answer/call
  listenFor(session: any) {
    const attach = (stream: MediaStream) => {
      this.el.srcObject = stream;
      // play() puede fallar si no hay gesto de usuario, pero autoplay=true
      // en elemento de audio (sin video) suele estar permitido
      this.el.play().catch(e => console.warn('[RemoteAudio] play():', e));
    };

    // JsSIP expone el RTCPeerConnection vía evento 'peerconnection'
    session.on('peerconnection', (data: { peerconnection: RTCPeerConnection }) => {
      const pc = data.peerconnection;
      pc.addEventListener('track', (ev: RTCTrackEvent) => {
        if (ev.streams && ev.streams[0]) attach(ev.streams[0]);
      });
    });

    // Fallback: también escuchar 'confirmed' por si el track ya llegó
    session.on('confirmed', () => {
      const pc: RTCPeerConnection = session.connection;
      if (!pc) return;
      const receivers = pc.getReceivers();
      const audioRx   = receivers.find(r => r.track?.kind === 'audio');
      if (audioRx?.track && !this.el.srcObject) {
        const stream = new MediaStream([audioRx.track]);
        attach(stream);
      }
    });
  }

  setVolume(v: number) {
    this.el.volume = Math.max(0, Math.min(1, v));
  }

  detach() {
    this.el.srcObject = null;
    this.el.load(); // reset
  }

  destroy() {
    this.detach();
    this.el.remove();
  }
}

// ─────────────────────────────────────────────────────────────────
// HOOKS
// ─────────────────────────────────────────────────────────────────
function useCallTimer(active: boolean) {
  const [s, setS] = useState(0);
  useEffect(() => {
    if (!active) { setS(0); return; }
    const t = setInterval(() => setS(x => x + 1), 1000);
    return () => clearInterval(t);
  }, [active]);
  const h  = Math.floor(s / 3600).toString().padStart(2, '0');
  const m  = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
  const ss = (s % 60).toString().padStart(2, '0');
  return s >= 3600 ? `${h}:${m}:${ss}` : `${m}:${ss}`;
}

const fmtDur  = (s: number) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;
const fmtTime = (d: Date)   => d.toLocaleTimeString('es-MX', { hour:'2-digit', minute:'2-digit' });

// ─────────────────────────────────────────────────────────────────
// META CONFIGS
// ─────────────────────────────────────────────────────────────────
const AGENT_META: Record<AgentStatus, { label: string; color: string }> = {
  available: { label: 'Disponible',  color: '#22c55e' },
  busy:      { label: 'Ocupado',     color: '#ef4444' },
  away:      { label: 'Ausente',     color: '#f59e0b' },
  dnd:       { label: 'No molestar', color: '#7c3aed' },
};
const CALL_META: Record<Status, { label: string; color: string; pulse: boolean }> = {
  offline:    { label: 'Desconectado',     color: '#525252', pulse: false },
  connecting: { label: 'Enlazando…',       color: '#f59e0b', pulse: true  },
  ready:      { label: 'En línea',         color: '#22c55e', pulse: false },
  ringing:    { label: 'Llamada entrante', color: '#f59e0b', pulse: true  },
  'on-call':  { label: 'En llamada',       color: '#60a5fa', pulse: true  },
  'on-hold':  { label: 'En espera',        color: '#a855f7', pulse: true  },
};
const KEYPAD = ['1','2','3','4','5','6','7','8','9','*','0','#'];

// ─────────────────────────────────────────────────────────────────
// MICRO COMPONENTS
// ─────────────────────────────────────────────────────────────────
function Key({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <motion.button whileTap={{ scale: 0.82 }} onClick={onClick}
      className="h-10 rounded-lg font-mono font-black text-base border bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.06] text-white transition-colors select-none">
      {label}
    </motion.button>
  );
}
function IconBtn({ icon: Icon, onClick, active, title }: {
  icon: any; onClick: () => void; active?: boolean; title?: string;
}) {
  return (
    <motion.button whileTap={{ scale: 0.9 }} onClick={onClick} title={title}
      className={`w-10 h-10 rounded-lg flex items-center justify-center border transition-all
        ${active ? 'bg-[#FDCB02] border-[#FDCB02] text-black'
        : 'bg-white/[0.04] border-white/[0.06] text-neutral-400 hover:text-white hover:bg-white/[0.08]'}`}>
      <Icon size={15} />
    </motion.button>
  );
}
function SLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="text-[8px] font-black uppercase tracking-[0.3em] text-neutral-700">{label}</span>
      <div className="flex-1 h-px bg-white/[0.04]" />
    </div>
  );
}
function Waveform({ active, color }: { active: boolean; color: string }) {
  const heights = [3,6,9,5,8,4,7,5,9,4,6,3];
  return (
    <div className="flex items-center gap-0.5 h-5 mt-0.5">
      {heights.map((h, i) => (
        <motion.div key={i} className="w-0.5 rounded-full" style={{ background: color }}
          animate={active ? { height:[`${h*2}px`,`${(h%4+1)*3}px`,`${h*2}px`] } : { height:'2px' }}
          transition={{ duration: 0.4 + i*0.05, repeat: Infinity, ease:'easeInOut', delay: i*0.06 }} />
      ))}
    </div>
  );
}
function HistoryItem({ r, onCall }: { r: CallRecord; onCall: (n: string) => void }) {
  const DirIcon = r.direction==='missed' ? PhoneMissed : r.direction==='in' ? ArrowDownLeft : ArrowUpRight;
  const c = r.direction==='missed' ? '#ef4444' : r.direction==='in' ? '#22c55e' : '#60a5fa';
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.03] group transition-colors rounded-lg">
      <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 border"
        style={{ borderColor:`${c}25`, background:`${c}08`, color:c }}>
        <DirIcon size={13} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold text-white truncate font-mono">{r.number}</p>
        <p className="text-[8px] text-neutral-700 mt-0.5">{fmtTime(r.timestamp)}</p>
      </div>
      <div className="text-right shrink-0">
        {r.direction !== 'missed' && <p className="font-mono text-[9px] text-neutral-600">{fmtDur(r.duration)}</p>}
        <motion.button whileTap={{ scale:0.9 }} onClick={() => onCall(r.number)}
          className="mt-1 opacity-0 group-hover:opacity-100 w-6 h-6 rounded-md bg-[#FDCB02]/10 border border-[#FDCB02]/20 flex items-center justify-center transition-all">
          <Phone size={10} className="text-[#FDCB02]" />
        </motion.button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// MAIN SOFTPHONE
// ─────────────────────────────────────────────────────────────────
export default function Softphone() {
  const [isOpen,      setIsOpen]     = useState(false);
  const [status,      setStatus]     = useState<Status>('offline');
  const [agentSt,     setAgentSt]    = useState<AgentStatus>('available');
  const [tab,         setTab]        = useState<Tab>('dialpad');
  const [cfg,         setCfg]        = useState<SipConfig | null>(null);
  const [err,         setErr]        = useState<string | null>(null);
  const [dialTo,      setDialTo]     = useState('');
  const [isMuted,     setMuted]      = useState(false);
  const [isHeld,      setHeld]       = useState(false);
  const [volume,      setVolume]     = useState(0.85);
  const [incomingNum, setIncoming]   = useState<string | null>(null);
  const [showDtmf,    setShowDtmf]   = useState(false);
  const [dtmfStr,     setDtmfStr]    = useState('');
  const [showXfer,    setShowXfer]   = useState(false);
  const [xferTo,      setXferTo]     = useState('');
  const [testRing,    setTestRing]   = useState(false);
  const [history,     setHistory]    = useState<CallRecord[]>([]);
  const [speedDials,  setSpeedDials] = useState<SpeedDial[]>([
    { name: 'Central', number: '+525555000000' },
    { name: 'Soporte', number: '+525555000001' },
  ]);
  const [newSD, setNewSD] = useState({ name: '', number: '' });

  const uaRef        = useRef<any>(null);
  const sessionRef   = useRef<any>(null);
  const incomingRef  = useRef<any>(null);
  const ringerRef    = useRef(new MarimbaRinger());
  const remoteRef    = useRef<RemoteAudio | null>(null);
  const callStartRef = useRef<Date | null>(null);
  const testTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const callTimer = useCallTimer(status === 'on-call');
  const meta      = CALL_META[status];
  const agMeta    = AGENT_META[agentSt];
  const inCall    = status === 'on-call' || status === 'on-hold';

  // ── Init RemoteAudio una vez en el cliente ─────────────────────
  useEffect(() => {
    remoteRef.current = new RemoteAudio();
    return () => {
      ringerRef.current.stop();
      remoteRef.current?.destroy();
      uaRef.current?.stop?.();
      if (testTimerRef.current) clearTimeout(testTimerRef.current);
    };
  }, []);

  // ── Volumen en tiempo real ─────────────────────────────────────
  useEffect(() => { remoteRef.current?.setVolume(volume); }, [volume]);

  // ── Ringer — responde al estado ────────────────────────────────
  useEffect(() => {
    if (status === 'ringing') {
      // El AudioCtx ya fue desbloqueado por el primer click del usuario
      ringerRef.current.start(66, 0.32).catch(e =>
        console.warn('[Ringer] start failed:', e)
      );
    } else if (!testRing) {
      ringerRef.current.stop();
    }
  }, [status, testRing]);

  // ── Keyboard shortcuts ─────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') return;
      if ('0123456789*#'.includes(e.key) && status === 'ready') {
        setDialTo(v => (v + e.key).slice(0, 32)); playDtmf(e.key);
      }
      if (e.key === 'Backspace' && status === 'ready') setDialTo(v => v.slice(0,-1));
      if (e.key === 'Enter'     && status === 'ready' && dialTo) callPstn();
      if (e.key === 'Escape'    && inCall)             hangup();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isOpen, status, dialTo, inCall]);

  // ── History ────────────────────────────────────────────────────
  const addHistory = useCallback((number: string, dir: CallDir, dur: number) => {
    setHistory(p => [{ id: Date.now().toString(), number, direction: dir, duration: dur, timestamp: new Date() }, ...p].slice(0, 50));
  }, []);

  // ── Test ring ──────────────────────────────────────────────────
  const handleTestRing = () => {
    if (testRing) {
      ringerRef.current.stop(); setTestRing(false);
      if (testTimerRef.current) clearTimeout(testTimerRef.current);
      return;
    }
    setTestRing(true);
    ringerRef.current.start(66, 0.32).catch(console.warn);
    testTimerRef.current = setTimeout(() => {
      ringerRef.current.stop(); setTestRing(false);
    }, 7000);
  };

  // ── SIP connect ────────────────────────────────────────────────
  const connect = async () => {
    setErr(null); setStatus('connecting');
    try {
      const res  = await fetch('/api/softphone/sip-config');
      const json = await res.json();
      if (!res.ok || !json?.ok) { setStatus('offline'); setErr(`sip-config error (${res.status})`); return; }
      const config: SipConfig = json; setCfg(config);

      const mod   = await import('jssip');
      const JsSIP = (mod as any).default ?? mod;
      if (process.env.NODE_ENV !== 'development') JsSIP.debug.disable('JsSIP:*');

      const socket = new JsSIP.WebSocketInterface(config.wsUri);
      const ua = new JsSIP.UA({
        sockets:            [socket],
        uri:                `sip:${config.username}@${config.sipDomain}`,
        password:           config.password,
        authorization_user: config.username,
        registrar_server:   `sip:${config.sipDomain}`,
        register:           true,
        register_expires:   300,
        session_timers:     false,
        user_agent:         'CoyoteCRM/3.0 (SignalWire)',
        pcConfig: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.signalwire.com:3478' },
          ],
        },
      });

      ua.on('registered',         () => { setStatus('ready'); setErr(null); });
      ua.on('unregistered',       () => setStatus('offline'));
      ua.on('registrationFailed', (e: any) => {
        setStatus('offline');
        setErr(`Registro falló: ${e?.cause ?? e?.message ?? 'Auth Error'}`);
      });

      ua.on('newRTCSession', (data: any) => {
        const session = data.session;
        const number  = data.originator === 'remote'
          ? (session.remote_identity?.uri?.user ?? 'Desconocido')
          : dialTo;

        // ── Registrar el audio remoto ANTES de answer/call ───────
        // Este es el patrón correcto — 'peerconnection' llega primero
        remoteRef.current?.listenFor(session);

        const cleanup = (dir: CallDir) => () => {
          const dur = callStartRef.current
            ? Math.round((Date.now() - callStartRef.current.getTime()) / 1000) : 0;
          addHistory(number, dir, dur);
          callStartRef.current = null;
          remoteRef.current?.detach();
          incomingRef.current = null; sessionRef.current = null;
          setMuted(false); setHeld(false); setStatus('ready');
          setShowDtmf(false); setShowXfer(false); setDtmfStr('');
          setIncoming(null);
        };

        if (data.originator === 'remote') {
          incomingRef.current = session;
          setIncoming(number); setStatus('ringing'); setIsOpen(true);
          session.on('ended',  cleanup('missed')); // si no contesta = missed
          session.on('failed', cleanup('missed'));
          return;
        }

        // ── Saliente ─────────────────────────────────────────────
        sessionRef.current   = session;
        callStartRef.current = new Date();
        setStatus('on-call');
        session.on('ended',  cleanup('out'));
        session.on('failed', (ev: any) => { cleanup('out')(); setErr(`Llamada falló: ${ev?.cause ?? 'desconocido'}`); });
      });

      ua.start();
      uaRef.current = ua;
    } catch (e: any) {
      setStatus('offline');
      setErr('Error al conectar. Revisa consola.');
      console.error('[Softphone]', e);
    }
  };

  const disconnect = () => {
    try { uaRef.current?.stop?.(); } catch {}
    uaRef.current = null; setStatus('offline'); setErr(null);
  };

  // ── Call actions ───────────────────────────────────────────────
  const callPstn = (override?: string) => {
    setErr(null);
    if (!uaRef.current)   return setErr('Primero conecta SIP.');
    if (!cfg?.dappDomain) return setErr('Falta dappDomain.');
    const raw = (override ?? dialTo).trim();
    if (!raw)             return setErr('Ingresa un número E.164.');
    const target = raw.startsWith('sip:') ? raw : `sip:${raw}@${cfg.dappDomain}`;
    uaRef.current.call(target, {
      mediaConstraints: { audio: true, video: false },
      rtcConstraints:   { optional: [{ DtlsSrtpKeyAgreement: 'true' }] },
    });
    if (override) setDialTo(override);
    setStatus('connecting');
  };

  const accept = () => {
    const s = incomingRef.current; if (!s) return;
    ringerRef.current.stop();
    s.answer({ mediaConstraints: { audio: true, video: false } });
    sessionRef.current   = s;
    incomingRef.current  = null;
    callStartRef.current = new Date();
    // La historia queda como 'in' — sobreescribimos el cleanup 'missed'
    s.removeAllListeners?.('ended');
    s.removeAllListeners?.('failed');
    const cleanup = () => {
      const dur = callStartRef.current
        ? Math.round((Date.now() - callStartRef.current.getTime()) / 1000) : 0;
      addHistory(incomingNum ?? '?', 'in', dur);
      callStartRef.current = null;
      remoteRef.current?.detach();
      sessionRef.current = null;
      setMuted(false); setHeld(false); setStatus('ready');
      setShowDtmf(false); setShowXfer(false); setDtmfStr(''); setIncoming(null);
    };
    s.on('ended', cleanup); s.on('failed', cleanup);
    setStatus('on-call'); setMuted(false); setIncoming(null);
  };

  const reject = () => {
    ringerRef.current.stop();
    incomingRef.current?.terminate();
    addHistory(incomingNum ?? '?', 'missed', 0);
    incomingRef.current = null; setIncoming(null); setStatus('ready');
  };

  const hangup = () => {
    ringerRef.current.stop();
    try { (sessionRef.current || incomingRef.current)?.terminate?.(); } catch {}
    remoteRef.current?.detach();
    sessionRef.current = null; incomingRef.current = null;
    setMuted(false); setHeld(false); setStatus('ready');
    setShowDtmf(false); setShowXfer(false); setDtmfStr('');
  };

  const toggleMute = () => {
    const track = sessionRef.current?.connection?.getSenders?.()
      ?.find((x: any) => x?.track?.kind === 'audio')?.track;
    if (!track) return;
    track.enabled = isMuted; setMuted(!isMuted);
  };

  const toggleHold = async () => {
    const s = sessionRef.current; if (!s) return;
    try {
      if (isHeld) { await s.unhold(); setHeld(false); setStatus('on-call'); }
      else        { await s.hold();   setHeld(true);  setStatus('on-hold'); }
    } catch {}
  };

  const sendDtmf = (d: string) => {
    playDtmf(d);
    setDtmfStr(v => (v + d).slice(0, 16));
    try { sessionRef.current?.sendDTMF?.(d, { duration: 160, interToneGap: 50 }); } catch {}
  };

  const doTransfer = () => {
    const s = sessionRef.current; if (!s || !xferTo.trim() || !cfg) return;
    const target = xferTo.trim().startsWith('sip:') ? xferTo.trim() : `sip:${xferTo.trim()}@${cfg.dappDomain}`;
    try { s.refer(target); setShowXfer(false); setXferTo(''); }
    catch { setErr('Transferencia falló.'); }
  };

  const pushDigit = (d: string) => { setDialTo(v => (v + d).slice(0, 32)); playDtmf(d, 80, 0.08); };

  // ─────────────────────────────────────────────────────────────
  // RENDER — click en el panel = primeAudioCtx
  // ─────────────────────────────────────────────────────────────
  return (
    <>
      {/* FAB */}
      <motion.button
        onClick={(e) => { primeAudioCtx(); setIsOpen(o => !o); }}
        whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.93 }}
        className="absolute bottom-8 right-8 z-[80] flex items-center justify-center border shadow-2xl rounded-xl transition-all"
        style={{
          width: 52, height: 52,
          background:  status !== 'offline' ? meta.color : '#111',
          borderColor: status !== 'offline' ? meta.color : 'rgba(255,255,255,0.08)',
          boxShadow:   status !== 'offline' ? `0 0 32px ${meta.color}50` : undefined,
        }}
        title="Softphone"
      >
        {status === 'ringing'
          ? <motion.span animate={{ rotate:[0,14,-14,0] }} transition={{ repeat:Infinity, duration:0.5 }}>
              <PhoneIncoming size={20} className="text-black" />
            </motion.span>
          : <Phone size={20} className={status !== 'offline' ? 'text-black' : 'text-neutral-500'} />
        }
        {meta.pulse && (
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-[#040404] animate-pulse"
            style={{ background: meta.color }} />
        )}
        <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-[#040404]"
          style={{ background: agMeta.color }} />
      </motion.button>

      {/* PANEL — onClick en el div raíz desbloquea AudioCtx */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            onClick={primeAudioCtx}
            initial={{ opacity:0, y:14, scale:0.96 }}
            animate={{ opacity:1, y:0,  scale:1    }}
            exit={{ opacity:0, y:14, scale:0.96 }}
            transition={{ type:'spring', damping:30, stiffness:340 }}
            className="absolute bottom-[76px] right-8 z-[80] w-[310px] bg-[#070707] border border-white/[0.1] rounded-2xl overflow-hidden shadow-[0_40px_80px_rgba(0,0,0,0.95)]"
          >
            <div className="h-0.5 transition-colors" style={{ background: meta.color }} />

            {/* HEADER */}
            <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
              <div className="relative group">
                <button className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-colors">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: agMeta.color }} />
                  <span className="text-[8px] font-black uppercase tracking-[0.2em] text-neutral-500">{agMeta.label}</span>
                </button>
                <div className="absolute top-full left-0 mt-1 w-36 bg-[#0a0a0a] border border-white/[0.1] rounded-lg overflow-hidden shadow-2xl z-10 hidden group-hover:block">
                  {(Object.entries(AGENT_META) as [AgentStatus, typeof AGENT_META[AgentStatus]][]).map(([k,v]) => (
                    <button key={k} onClick={() => setAgentSt(k)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-[9px] font-bold hover:bg-white/[0.05] transition-colors ${agentSt===k?'text-white':'text-neutral-500'}`}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background:v.color }} />
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {inCall && (
                  <span className="font-mono text-[10px] font-black tabular-nums px-2 py-0.5 rounded-md border"
                    style={{ color:meta.color, borderColor:`${meta.color}30`, background:`${meta.color}08` }}>
                    {callTimer}
                  </span>
                )}
                <motion.button whileTap={{ scale:0.88 }} onClick={handleTestRing} title="Probar timbre marimba"
                  className={`px-2 py-1 rounded-md border flex items-center gap-1 text-[8px] font-black uppercase tracking-wider transition-all ${
                    testRing ? 'bg-[#FDCB02] border-[#FDCB02] text-black' : 'bg-transparent border-white/[0.06] text-neutral-600 hover:text-[#FDCB02] hover:border-[#FDCB02]/20'}`}>
                  <Music2 size={10} className={testRing ? 'animate-pulse' : ''} />
                  {testRing ? 'Stop' : 'Test'}
                </motion.button>
                <button onClick={() => setIsOpen(false)}
                  className="p-1.5 text-neutral-700 hover:text-neutral-300 rounded-md hover:bg-white/[0.04] transition-colors">
                  <ChevronDown size={14} />
                </button>
              </div>
            </div>

            {/* STATUS ROW */}
            <div className="px-4 py-3 border-b border-white/[0.04] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center relative border overflow-hidden"
                  style={{ borderColor:`${meta.color}25`, background:`${meta.color}08`, color:meta.color }}>
                  <div className="absolute inset-0 blur-lg opacity-25" style={{ background:meta.color }} />
                  <span className="relative">
                    {status==='offline'    && <WifiOff size={15} />}
                    {status==='connecting' && <Loader2 size={15} className="animate-spin" />}
                    {status==='ready'      && <Wifi size={15} />}
                    {status==='ringing'    && <motion.span animate={{ scale:[1,1.2,1] }} transition={{ repeat:Infinity, duration:0.7 }}><PhoneIncoming size={15} /></motion.span>}
                    {status==='on-call'    && <PhoneCall size={15} />}
                    {status==='on-hold'    && <Pause size={15} />}
                  </span>
                </div>
                <div>
                  <p className="text-[11px] font-black text-white leading-none">{meta.label}</p>
                  {incomingNum && status==='ringing' && (
                    <p className="font-mono text-[9px] text-neutral-400 mt-0.5">{incomingNum}</p>
                  )}
                  {inCall && <Waveform active={status==='on-call'} color={meta.color} />}
                </div>
              </div>
              {status==='offline'
                ? <motion.button whileTap={{ scale:0.94 }} onClick={connect}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-black font-black text-[9px] uppercase tracking-wider transition-all">
                    <RadioTower size={11} /> Conectar
                  </motion.button>
                : !inCall && status!=='ringing' && status!=='connecting' && (
                  <motion.button whileTap={{ scale:0.94 }} onClick={disconnect}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.04] hover:bg-red-500/10 border border-white/[0.06] hover:border-red-500/20 rounded-lg text-neutral-600 hover:text-red-400 font-black text-[9px] uppercase tracking-wider transition-all">
                    <WifiOff size={11} /> Salir
                  </motion.button>
                )
              }
            </div>

            {/* ERROR */}
            <AnimatePresence>
              {err && (
                <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }} className="overflow-hidden">
                  <div className="mx-4 my-2 text-[10px] text-red-300 bg-red-950/40 border border-red-500/20 rounded-lg px-3 py-2 flex gap-2">
                    <span className="flex-1 leading-relaxed">{err}</span>
                    <button onClick={()=>setErr(null)} className="shrink-0 text-red-500 hover:text-red-300"><X size={12} /></button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* CONNECTING */}
            {status==='connecting' && (
              <div className="flex justify-center gap-1.5 py-4">
                {[0,1,2].map(i=>(
                  <motion.div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background:meta.color }}
                    animate={{ opacity:[0.3,1,0.3] }} transition={{ repeat:Infinity, duration:1, delay:i*0.2 }} />
                ))}
              </div>
            )}

            {/* RINGING */}
            {status==='ringing' && (
              <div className="px-4 py-5 flex flex-col items-center gap-4">
                <motion.div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center"
                  animate={{ scale:[1,1.12,1] }} transition={{ repeat:Infinity, duration:1 }}>
                  <PhoneIncoming size={28} className="text-amber-400" />
                </motion.div>
                <div className="text-center">
                  <p className="text-base font-black text-white">{incomingNum||'Desconocido'}</p>
                  <p className="text-[9px] text-neutral-600 uppercase tracking-widest mt-0.5">Llamada entrante</p>
                </div>
                <div className="flex gap-3 w-full">
                  <motion.button whileTap={{ scale:0.93 }} onClick={accept}
                    className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-black font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20">
                    <Phone size={16} /> Contestar
                  </motion.button>
                  <motion.button whileTap={{ scale:0.93 }} onClick={reject}
                    className="flex-1 h-11 bg-red-600/10 hover:bg-red-600 border border-red-500/20 hover:border-red-600 text-red-400 hover:text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all">
                    <PhoneOff size={16} /> Rechazar
                  </motion.button>
                </div>
              </div>
            )}

            {/* IN CALL */}
            {inCall && (
              <div className="px-4 pt-3 pb-3 space-y-3">
                {/* DTMF */}
                <AnimatePresence>
                  {showDtmf && (
                    <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }} className="overflow-hidden">
                      <div className="bg-black/50 border border-white/[0.06] rounded-xl p-3 mb-2">
                        <div className="font-mono text-sm text-[#FDCB02] text-center min-h-[20px] mb-2 tracking-widest">
                          {dtmfStr || <span className="text-neutral-700">Teclado DTMF</span>}
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          {KEYPAD.map(k => <Key key={k} label={k} onClick={()=>sendDtmf(k)} />)}
                        </div>
                        {dtmfStr && <button onClick={()=>setDtmfStr('')} className="mt-2 w-full text-[8px] font-bold text-neutral-700 hover:text-neutral-400 uppercase tracking-widest transition-colors">Limpiar</button>}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                {/* Transfer */}
                <AnimatePresence>
                  {showXfer && (
                    <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }} className="overflow-hidden">
                      <div className="bg-black/50 border border-white/[0.06] rounded-xl p-3 mb-2 flex gap-2">
                        <input value={xferTo} onChange={e=>setXferTo(e.target.value)}
                          onKeyDown={e=>e.key==='Enter'&&doTransfer()}
                          placeholder="Número destino…"
                          className="flex-1 bg-transparent text-white text-sm font-mono outline-none placeholder:text-neutral-700" />
                        <motion.button whileTap={{ scale:0.9 }} onClick={doTransfer}
                          className="px-3 py-1 bg-[#FDCB02] rounded-lg text-black font-black text-[9px] uppercase tracking-wider">OK</motion.button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                {/* Actions */}
                <div className="flex items-center gap-2">
                  <IconBtn icon={isMuted?MicOff:Mic}       onClick={toggleMute}                               active={isMuted}  title={isMuted?'Activar mic':'Silenciar'} />
                  <IconBtn icon={isHeld?Play:Pause}         onClick={toggleHold}                               active={isHeld}   title={isHeld?'Reanudar':'En espera'} />
                  <IconBtn icon={Hash}                      onClick={()=>{setShowDtmf(v=>!v);setShowXfer(false);}} active={showDtmf} title="DTMF" />
                  <IconBtn icon={PhoneForwarded}            onClick={()=>{setShowXfer(v=>!v);setShowDtmf(false);}} active={showXfer} title="Transferir" />
                  <motion.button whileTap={{ scale:0.93 }} onClick={hangup}
                    className="flex-1 h-10 bg-red-600 hover:bg-red-500 rounded-lg text-white font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-1.5 shadow-lg shadow-red-900/20 transition-all">
                    <PhoneOff size={14} /> Colgar
                  </motion.button>
                </div>
                {/* Volume */}
                <div className="flex items-center gap-2 px-1">
                  <VolumeX size={12} className="text-neutral-700 shrink-0" />
                  <input type="range" min={0} max={1} step={0.02} value={volume}
                    onChange={e=>setVolume(Number(e.target.value))}
                    className="flex-1 h-0.5 appearance-none rounded-full cursor-pointer"
                    style={{ background:`linear-gradient(to right,#FDCB02 ${volume*100}%,rgba(255,255,255,0.08) ${volume*100}%)`, accentColor:'#FDCB02' }} />
                  <Volume2 size={12} className="text-neutral-500 shrink-0" />
                </div>
              </div>
            )}

            {/* TABS */}
            {(status==='ready'||status==='offline') && (
              <>
                <div className="flex border-b border-white/[0.06]">
                  {([['dialpad',Keyboard,'Marcar'],['history',List,'Historial'],['settings',Settings,'Config']] as const).map(([t,Icon,label])=>(
                    <button key={t} onClick={()=>setTab(t)}
                      className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[8px] font-black uppercase tracking-widest border-b-2 transition-all ${tab===t?'border-[#FDCB02] text-[#FDCB02]':'border-transparent text-neutral-600 hover:text-neutral-400'}`}>
                      <Icon size={14} />{label}
                    </button>
                  ))}
                </div>

                {/* DIALPAD */}
                {tab==='dialpad' && (
                  <div className="p-4 space-y-3">
                    <div className="flex items-center gap-2 bg-black border border-white/[0.08] rounded-xl px-3 py-2.5 focus-within:border-[#FDCB02]/30 transition-colors">
                      <input value={dialTo} onChange={e=>setDialTo(e.target.value)}
                        onKeyDown={e=>e.key==='Enter'&&status==='ready'&&callPstn()}
                        placeholder="+5255…"
                        className="flex-1 bg-transparent outline-none text-white font-mono text-base placeholder:text-neutral-700 tracking-wider" />
                      {dialTo && <button onClick={()=>setDialTo(v=>v.slice(0,-1))} className="text-neutral-600 hover:text-neutral-300 transition-colors"><Delete size={14} /></button>}
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {KEYPAD.map(k=><Key key={k} label={k} onClick={()=>pushDigit(k)} />)}
                    </div>
                    <motion.button whileTap={{ scale:0.97 }} onClick={()=>callPstn()}
                      disabled={!dialTo.trim()||status!=='ready'}
                      className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 disabled:bg-white/[0.04] disabled:text-neutral-700 text-black font-black text-[10px] uppercase tracking-[0.2em] rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 disabled:shadow-none transition-all">
                      <Phone size={15} /> Llamar
                    </motion.button>
                    {speedDials.length > 0 && (
                      <div>
                        <SLabel label="Marcado rápido" />
                        {speedDials.map((sd,i)=>(
                          <button key={i} onClick={()=>callPstn(sd.number)} disabled={status!=='ready'}
                            className="w-full flex items-center justify-between px-3 py-2 mb-1 bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] rounded-lg disabled:opacity-40 transition-colors group">
                            <div className="flex items-center gap-2">
                              <Zap size={10} className="text-[#FDCB02]" />
                              <span className="text-[11px] font-bold text-white">{sd.name}</span>
                            </div>
                            <span className="font-mono text-[9px] text-neutral-600 group-hover:text-neutral-400">{sd.number}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* HISTORY */}
                {tab==='history' && (
                  <div className="py-2 max-h-[340px] overflow-y-auto crm-scroll">
                    {history.length===0
                      ? <div className="flex flex-col items-center justify-center py-12 text-neutral-700">
                          <Clock size={28} className="mb-3 opacity-30" />
                          <p className="text-[10px] font-black uppercase tracking-widest">Sin llamadas aún</p>
                        </div>
                      : <>
                          <div className="flex justify-end px-4 mb-1">
                            <button onClick={()=>setHistory([])} className="text-[8px] font-bold text-neutral-700 hover:text-red-400 uppercase tracking-widest transition-colors flex items-center gap-1">
                              <RotateCcw size={9} /> Limpiar
                            </button>
                          </div>
                          {history.map(r=><HistoryItem key={r.id} r={r} onCall={n=>{setDialTo(n);setTab('dialpad');}} />)}
                        </>
                    }
                  </div>
                )}

                {/* SETTINGS */}
                {tab==='settings' && (
                  <div className="p-4 space-y-5 max-h-[340px] overflow-y-auto crm-scroll">
                    {cfg && (
                      <div>
                        <SLabel label="SignalWire · SIP" />
                        {[['Extensión',cfg.username],['Dominio',cfg.sipDomain],['WS',cfg.wsUri]].map(([k,v])=>(
                          <div key={k} className="flex justify-between items-center px-3 py-2 mb-1 bg-white/[0.02] border border-white/[0.04] rounded-lg">
                            <span className="text-[8px] font-black uppercase tracking-widest text-neutral-700">{k}</span>
                            <span className="font-mono text-[9px] text-neutral-500 truncate max-w-[160px]">{v}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div>
                      <SLabel label="Marcado rápido" />
                      {speedDials.map((sd,i)=>(
                        <div key={i} className="flex items-center gap-2 px-3 py-2 mb-1 bg-white/[0.02] border border-white/[0.04] rounded-lg">
                          <Zap size={10} className="text-[#FDCB02] shrink-0" />
                          <span className="text-[10px] font-bold text-white flex-1">{sd.name}</span>
                          <span className="font-mono text-[8px] text-neutral-600">{sd.number}</span>
                          <button onClick={()=>setSpeedDials(p=>p.filter((_,j)=>j!==i))} className="text-neutral-700 hover:text-red-400 transition-colors"><X size={11} /></button>
                        </div>
                      ))}
                      <div className="flex gap-2 mt-2">
                        <input value={newSD.name} onChange={e=>setNewSD(p=>({...p,name:e.target.value}))} placeholder="Nombre"
                          className="flex-1 bg-black border border-white/[0.08] rounded-lg px-2.5 py-2 text-[11px] text-white outline-none placeholder:text-neutral-700 focus:border-[#FDCB02]/30 transition-colors" />
                        <input value={newSD.number} onChange={e=>setNewSD(p=>({...p,number:e.target.value}))} placeholder="+52…"
                          className="flex-1 bg-black border border-white/[0.08] rounded-lg px-2.5 py-2 text-[11px] font-mono text-white outline-none placeholder:text-neutral-700 focus:border-[#FDCB02]/30 transition-colors" />
                        <button onClick={()=>{ if(!newSD.name||!newSD.number)return; setSpeedDials(p=>[...p,{...newSD}].slice(0,8)); setNewSD({name:'',number:''}); }}
                          className="px-3 py-2 bg-[#FDCB02]/10 border border-[#FDCB02]/20 hover:bg-[#FDCB02] hover:text-black text-[#FDCB02] rounded-lg text-[10px] font-black transition-all">+</button>
                      </div>
                    </div>
                    <div>
                      <SLabel label="Atajos de teclado" />
                      {[['0-9 * #','Marcar'],['Enter','Llamar'],['Backspace','Borrar'],['Esc','Colgar']].map(([k,v])=>(
                        <div key={k} className="flex items-center justify-between mb-1.5">
                          <span className="font-mono text-[9px] bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded text-white">{k}</span>
                          <span className="text-[9px] text-neutral-600">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {cfg && (
              <div className="px-4 py-2 border-t border-white/[0.04] flex items-center justify-between">
                <span className="text-[7px] font-black uppercase tracking-widest text-neutral-700">Ext.</span>
                <span className="font-mono text-[8px] text-neutral-700">{cfg.username}@{cfg.sipDomain}</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}