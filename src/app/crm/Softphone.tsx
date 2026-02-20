'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Loader2, SignalHigh, PhoneCall, Delete } from 'lucide-react';

type Status = 'offline' | 'connecting' | 'ready' | 'ringing' | 'on-call';

type SipConfig = {
  wsUri: string;
  sipDomain: string;
  dappDomain: string;
  username: string;
  password: string;      // DEV: viene del route sip-config
  passwordLen?: number;
  callerId?: string | null;
};

/**
 * Timbre marimba-like 66 BPM (sin archivos).
 * No es el ringtone exacto de Apple.
 */
class MarimbaRinger {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private timer: number | null = null;
  private running = false;

  private patternA = [76, 79, 83, 79, 76, 79, 83, 86];
  private patternB = [74, 78, 81, 78, 74, 78, 81, 84];

  async start({ bpm = 66, volume = 0.28 }: { bpm?: number; volume?: number } = {}) {
    if (this.running) return;
    this.running = true;

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AudioCtx();
    await this.ctx.resume();

    this.master = this.ctx.createGain();
    this.master.gain.value = volume;
    this.master.connect(this.ctx.destination);

    const beatMs = 60000 / bpm;
    const stepMs = beatMs / 2;
    let step = 0;

    const tick = () => {
      if (!this.running || !this.ctx || !this.master) return;
      const pat = Math.floor(step / 16) % 2 === 0 ? this.patternA : this.patternB;
      const midi = pat[step % pat.length];
      const accent = step % 4 === 0 ? 1.0 : 0.75;
      this.hit(midi, accent);
      step++;
    };

    tick();
    this.timer = window.setInterval(tick, stepMs);
  }

  stop() {
    this.running = false;
    if (this.timer) window.clearInterval(this.timer);
    this.timer = null;

    try { this.master?.disconnect(); } catch {}
    try { this.ctx?.close(); } catch {}

    this.master = null;
    this.ctx = null;
  }

  private hit(midi: number, accent: number) {
    if (!this.ctx || !this.master) return;
    const now = this.ctx.currentTime;
    const freq = 440 * Math.pow(2, (midi - 69) / 12);

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    const osc2 = this.ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 2, now);

    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(freq * 1.2, now);
    bp.Q.setValueAtTime(10, now);

    const amp = this.ctx.createGain();
    const peak = 0.9 * accent;
    amp.gain.setValueAtTime(0.0001, now);
    amp.gain.exponentialRampToValueAtTime(peak, now + 0.005);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

    osc.connect(bp);
    osc2.connect(bp);
    bp.connect(amp);
    amp.connect(this.master);

    osc.start(now);
    osc2.start(now);
    osc.stop(now + 0.25);
    osc2.stop(now + 0.25);
  }
}

async function readJsonOrText(res: Response) {
  const ct = res.headers.get('content-type') || '';
  const text = await res.text();
  if (ct.includes('application/json')) {
    try { return { json: JSON.parse(text), text }; } catch { return { json: null, text }; }
  }
  return { json: null, text };
}

function dump(label: string, obj: any) {
  try {
    const names = Object.getOwnPropertyNames(obj || {});
    console.warn(label, 'type=', typeof obj, 'names=', names);

    for (const n of names) {
      let v: any;
      try { v = (obj as any)[n]; } catch (e) { v = `[getter threw: ${String(e)}]`; }

      if (v && typeof v === 'object') {
        const sub = Object.getOwnPropertyNames(v);
        console.warn(`  ${n}: [object] keys=${sub.join(',')}`);
      } else {
        console.warn(`  ${n}:`, String(v));
      }
    }
  } catch (e) {
    console.warn(label, 'dump failed:', String(e));
  }
}

export default function Softphone() {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<Status>('offline');
  const [cfg, setCfg] = useState<SipConfig | null>(null);

  const [dialTo, setDialTo] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const uaRef = useRef<any>(null);
  const sessionRef = useRef<any>(null);
  const incomingRef = useRef<any>(null);

  const ringerRef = useRef<MarimbaRinger | null>(null);
  if (!ringerRef.current) ringerRef.current = new MarimbaRinger();

  const keypad = useMemo(() => ['1','2','3','4','5','6','7','8','9','*','0','#'], []);

  // Timbre automático
  useEffect(() => {
    const r = ringerRef.current!;
    if (status === 'ringing') r.start({ bpm: 66, volume: 0.28 }).catch(() => {});
    else r.stop();
    return () => r.stop();
  }, [status]);

  // Cleanup
  useEffect(() => {
    return () => {
      try { ringerRef.current?.stop(); } catch {}
      try { uaRef.current?.stop?.(); } catch {}
    };
  }, []);

  const connect = async () => {
    setErr(null);

    try {
      setStatus('connecting');

      const res = await fetch('/api/softphone/sip-config', { method: 'GET' });
      const { json, text } = await readJsonOrText(res);

      if (!res.ok || !json?.ok) {
        console.error('sip-config error:', res.status, json ?? text);
        setStatus('offline');
        setErr(`sip-config falló (${res.status}).`);
        return;
      }

      const config: SipConfig = json;
      setCfg(config);

      const JsSIPmod = await import('jssip');
      const JsSIP = (JsSIPmod as any).default ?? JsSIPmod;

      JsSIP.debug.enable('JsSIP:*');

      const socket = new JsSIP.WebSocketInterface(config.wsUri);
      const uri = `sip:${config.username}@${config.sipDomain}`;

      const ua = new JsSIP.UA({
        sockets: [socket],
        uri,
        password: config.password,
        authorization_user: config.username,
        registrar_server: `sip:${config.sipDomain}`,
        register: true,
        register_expires: 300,
        session_timers: false,
        pcConfig: { iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }] }
      });

      ua.on('registered', () => {
        console.log('🟢 SIP Registered OK');
        setStatus('ready');
        setErr(null);
      });

      ua.on('registrationFailed', (e: any) => {
        dump('registrationFailed EVENT', e);
        const cause = e?.cause ?? e?.message ?? e?.reason ?? 'Authentication Error';
        setStatus('offline');
        setErr(`Registro SIP falló: ${String(cause)}`);
      });

      ua.on('newRTCSession', (data: any) => {
        const session = data.session;

        // Entrante
        if (data.originator === 'remote') {
          incomingRef.current = session;
          setStatus('ringing');
          setIsOpen(true);

          session.on('ended', () => {
            incomingRef.current = null;
            sessionRef.current = null;
            setIsMuted(false);
            setStatus('ready');
          });
          session.on('failed', () => {
            incomingRef.current = null;
            sessionRef.current = null;
            setIsMuted(false);
            setStatus('ready');
          });
          return;
        }

        // Saliente
        sessionRef.current = session;
        setStatus('on-call');

        session.on('ended', () => {
          sessionRef.current = null;
          setIsMuted(false);
          setStatus('ready');
        });

        session.on('failed', (ev: any) => {
          sessionRef.current = null;
          setIsMuted(false);
          setStatus('ready');
          setErr(`Llamada falló: ${ev?.cause || 'unknown'}`);
        });
      });

      ua.start();
      uaRef.current = ua;

    } catch (e: any) {
      console.error('connect crash:', e?.message || e, e);
      setStatus('offline');
      setErr('Error conectando SIP. Revisa consola.');
    }
  };

  const accept = () => {
    const session = incomingRef.current;
    if (!session) return;
    ringerRef.current?.stop();
    session.answer({ mediaConstraints: { audio: true, video: false } });
    sessionRef.current = session;
    incomingRef.current = null;
    setStatus('on-call');
    setIsMuted(false);
  };

  const reject = () => {
    const session = incomingRef.current;
    if (!session) return;
    ringerRef.current?.stop();
    session.terminate();
    incomingRef.current = null;
    setStatus('ready');
  };

  const hangup = () => {
    ringerRef.current?.stop();
    const s = sessionRef.current || incomingRef.current;
    try { s?.terminate?.(); } catch {}
    sessionRef.current = null;
    incomingRef.current = null;
    setIsMuted(false);
    setStatus('ready');
  };

  const toggleMute = () => {
    const session = sessionRef.current;
    if (!session?.connection?.getSenders) return;
    const senders = session.connection.getSenders();
    const audioSender = senders.find((x: any) => x?.track?.kind === 'audio');
    if (!audioSender?.track) return;
    audioSender.track.enabled = isMuted;
    setIsMuted(!isMuted);
  };

  const callPstn = () => {
    setErr(null);
    const ua = uaRef.current;
    if (!ua) return setErr('Primero conecta SIP.');
    if (!cfg?.dappDomain) return setErr('Falta DAPP domain en config.');

    const raw = dialTo.trim();
    if (!raw) return setErr('Pon un número (E.164), ej: +5255...');

    const target = raw.startsWith('sip:') ? raw : `sip:${raw}@${cfg.dappDomain}`;
    ua.call(target, { mediaConstraints: { audio: true, video: false } });
    setStatus('connecting');
  };

  const pushDigit = (d: string) => setDialTo((v) => (v + d).slice(0, 32));
  const backspace = () => setDialTo((v) => v.slice(0, -1));
  const clearDial = () => setDialTo('');

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="absolute bottom-8 right-8 w-16 h-16 bg-[#FDCB02] hover:bg-yellow-400 text-black rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(253,203,2,0.3)] transition-transform hover:scale-105 z-50"
      >
        <Phone size={24} className={status === 'ringing' ? 'animate-bounce' : ''} />
        {status === 'ready' && <span className="absolute top-0 right-0 w-4 h-4 bg-green-500 border-2 border-black rounded-full" />}
      </button>

      {isOpen && (
        <div className="absolute bottom-28 right-8 w-80 bg-[#0A0A0A] border border-white/10 rounded-3xl p-6 shadow-2xl z-50 flex flex-col items-center">
          <div className="w-full flex justify-between items-center mb-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500 flex items-center gap-2">
              <SignalHigh size={12} className={status === 'ready' ? 'text-green-500' : 'text-neutral-500'} />
              Coyote Softphone (PSTN)
            </span>
          </div>

          <div className="w-20 h-20 rounded-full bg-neutral-900 border border-white/5 flex items-center justify-center mb-3">
            {status === 'offline' && <PhoneOff size={28} className="text-neutral-600" />}
            {status === 'connecting' && <Loader2 size={28} className="text-[#FDCB02] animate-spin" />}
            {status === 'ready' && <Phone size={28} className="text-green-500" />}
            {status === 'ringing' && <Phone size={28} className="text-yellow-500 animate-pulse" />}
            {status === 'on-call' && <PhoneCall size={28} className="text-blue-500" />}
          </div>

          <h3 className="text-base font-bold text-white mb-2 uppercase tracking-widest text-center">
            {status === 'offline' ? 'Desconectado' : status === 'connecting' ? 'Enlazando...' : status === 'ready' ? 'En línea' : status === 'ringing' ? 'Llamada entrante' : 'Llamada activa'}
          </h3>

          {err && <div className="w-full text-xs text-red-300 bg-red-950/40 border border-red-500/20 rounded-xl p-2 mb-3">{err}</div>}

          <div className="w-full space-y-3">
            {status === 'offline' && (
              <button onClick={connect} className="w-full py-3 bg-green-600 hover:bg-green-500 rounded-xl text-white font-bold text-xs uppercase tracking-widest transition-colors">
                Conectar SIP
              </button>
            )}

            {status === 'ready' && (
              <div className="w-full space-y-3">
                <div className="w-full flex items-center gap-2 bg-neutral-900/60 border border-white/10 rounded-2xl px-3 py-2">
                  <input value={dialTo} onChange={(e) => setDialTo(e.target.value)} placeholder="+5255..." className="flex-1 bg-transparent outline-none text-white text-sm placeholder:text-neutral-500" />
                  <button onClick={backspace} className="p-2 text-neutral-300 hover:text-white"><Delete size={18} /></button>
                  <button onClick={clearDial} className="p-2 text-neutral-300 hover:text-white">✕</button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {keypad.map((k) => (
                    <button key={k} onClick={() => pushDigit(k)} className="py-3 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold">{k}</button>
                  ))}
                </div>

                <button onClick={callPstn} className="w-full py-3 bg-[#FDCB02] hover:bg-yellow-400 rounded-xl text-black font-black text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-2">
                  <Phone size={16} /> Llamar
                </button>
              </div>
            )}

            {status === 'ringing' && (
              <div className="flex gap-2 w-full">
                <button onClick={accept} className="flex-1 py-3 bg-green-600 hover:bg-green-500 rounded-xl text-white font-bold flex justify-center items-center transition-colors"><Phone size={18} /></button>
                <button onClick={reject} className="flex-1 py-3 bg-red-600 hover:bg-red-500 rounded-xl text-white font-bold flex justify-center items-center transition-colors"><PhoneOff size={18} /></button>
              </div>
            )}

            {status === 'on-call' && (
              <div className="flex gap-2 w-full">
                <button onClick={toggleMute} className={`flex-1 py-3 rounded-xl font-bold flex justify-center items-center transition-colors ${isMuted ? 'bg-yellow-500 text-black' : 'bg-neutral-800 hover:bg-neutral-700 text-white'}`}>
                  {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                </button>
                <button onClick={hangup} className="flex-[2] py-3 bg-red-600 hover:bg-red-500 rounded-xl text-white font-bold flex justify-center items-center transition-colors"><PhoneOff size={18} /></button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

