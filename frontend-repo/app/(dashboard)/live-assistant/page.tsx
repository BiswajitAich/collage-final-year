'use client';
import styles from './assistant.module.css';
import { useState, useCallback, useEffect, useRef } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useLocalParticipant,
  useParticipants,
  useConnectionState,
  useRoomContext,
} from '@livekit/components-react';
import { ConnectionState, DisconnectReason } from 'livekit-client';
import '@livekit/components-styles';
import { PageHeader } from '@/components/ui/UIComponents';
import { useAuthStore } from '@/stores';

type CreateRoomResponse = {
  session_id: string;
  room_name: string;
  token: string;
  livekit_url: string;
};

type EndReason = 'user' | 'agent' | null;

const FASTAPI_BASE_URL =
  process.env.NEXT_PUBLIC_FASTAPI_BASE_URL || 'http://localhost:8000';

// ─── Mic level hook ─────────────────────────────────────────────────────────

function useMicLevel(active: boolean): number {
  const [level, setLevel] = useState(0);
  const rafRef = useRef<number>(0);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!active) { setLevel(0); return; }
    let cancelled = false;

    async function setup() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        const ctx = new AudioContext();
        ctxRef.current = ctx;
        const analyser = ctx.createAnalyser();
        analyserRef.current = analyser;
        analyser.fftSize = 256;
        ctx.createMediaStreamSource(stream).connect(analyser);
        const buf = new Uint8Array(analyser.fftSize);
        function tick() {
          analyser.getByteTimeDomainData(buf);
          const sum = buf.reduce((a, b) => a + Math.abs(b - 128), 0);
          const avg = sum / buf.length;
          setLevel(Math.min(100, Math.round((avg / 128) * 100)));
          rafRef.current = requestAnimationFrame(tick);
        }
        tick();
      } catch { setLevel(0); }
    }
    setup();
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      ctxRef.current?.close();
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [active]);

  return level;
}

// ─── Active call UI ──────────────────────────────────────────────────────────

function ActiveCallView({
  session,
  onEndCall,
  onAgentEndedCall,
}: {
  session: CreateRoomResponse;
  onEndCall: () => void;
  onAgentEndedCall: () => void;
}) {
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();
  const allParticipants = useParticipants();
  const connectionState = useConnectionState();
  const room = useRoomContext();

  const remoteParticipants = allParticipants.filter((p) => !p.isLocal);
  const agentConnected = remoteParticipants.length > 0;
  const agentSpeaking = remoteParticipants.some((p) => p.isSpeaking);
  const isConnected = connectionState === ConnectionState.Connected;

  // ── Ensure mic is published as soon as the room is connected ─────────────
  useEffect(() => {
    if (isConnected) {
      localParticipant.setMicrophoneEnabled(true).catch(console.error);
    }
  }, [isConnected, localParticipant]);

  useEffect(() => {
    function handleDisconnected(reason?: DisconnectReason) {
      if (
        reason === DisconnectReason.ROOM_DELETED ||
        reason === DisconnectReason.SERVER_SHUTDOWN
      ) {
        onAgentEndedCall();
      }
    }
    room.on('disconnected', handleDisconnected);
    return () => { room.off('disconnected', handleDisconnected); };
  }, [room, onAgentEndedCall]);

  const micLevel = useMicLevel(isMicrophoneEnabled && isConnected);

  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    intervalRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const toggleMic = useCallback(async () => {
    try { await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled); }
    catch (err) { console.error('Failed to toggle mic:', err); }
  }, [localParticipant, isMicrophoneEnabled]);

  const agentLabel = !isConnected
    ? 'Connecting to room…'
    : agentConnected
    ? agentSpeaking ? 'Speaking…' : 'Listening'
    : 'Waiting for agent…';

  const orbClass = agentSpeaking
    ? styles.orbSpeaking
    : agentConnected ? styles.orbListening : styles.orbWaiting;

  return (
    <div className={styles.callPage}>
      <RoomAudioRenderer />

      <div className={`${styles.orbWrap} ${orbClass}`}>
        <span className={styles.ring1} />
        <span className={styles.ring2} />
        <div className={styles.orbInner}>
          <svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
          </svg>
        </div>
      </div>

      <div className={styles.agentInfo}>
        <p className={styles.agentName}>AI Assistant</p>
        <p className={`${styles.agentState} ${agentSpeaking ? styles.stateSpeaking : agentConnected ? styles.stateListening : ''}`}>
          <span className={styles.dot} />{agentLabel}
        </p>
      </div>

      <div className={`${styles.wave} ${agentSpeaking ? styles.waveActive : ''}`} aria-hidden="true">
        {Array.from({ length: 16 }, (_, i) => (
          <span key={i} className={styles.bar} style={{ animationDelay: `${(i * 0.06).toFixed(2)}s` }} />
        ))}
      </div>

      <p className={styles.timer}>{formatTime(elapsed)}</p>

      {/* Mic status bar */}
      <div className={styles.micStatus}>
        {!isConnected ? (
          <span className={styles.micStatusWait}>
            <span className={`${styles.micDot} ${styles.micDotWait}`} />Connecting…
          </span>
        ) : isMicrophoneEnabled ? (
          <span className={styles.micStatusOn}>
            <span className={`${styles.micDot} ${styles.micDotOn}`} />
            Mic active
            <span className={styles.micLevelWrap}>
              <span className={styles.micLevelFill} style={{ width: `${micLevel}%` }} />
            </span>
            {micLevel < 5 && (
              <span className={styles.micLevelHint}>(speak louder or check mic)</span>
            )}
          </span>
        ) : (
          <span className={styles.micStatusOff}>
            <span className={`${styles.micDot} ${styles.micDotOff}`} />
            Muted — agent cannot hear you
          </span>
        )}
      </div>

      <div className={styles.controls}>
        <button
          onClick={toggleMic}
          className={`${styles.ctrlBtn} ${!isMicrophoneEnabled ? styles.mutedBtn : ''}`}
          title={isMicrophoneEnabled ? 'Mute' : 'Unmute'}
        >
          {isMicrophoneEnabled ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 1a4 4 0 0 1 4 4v7a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm0 2a2 2 0 0 0-2 2v7a2 2 0 0 0 4 0V5a2 2 0 0 0-2-2zM5 11a7 7 0 0 0 14 0h2a9 9 0 0 1-8 8.94V22h-2v-2.06A9 9 0 0 1 3 11H5z" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16 5a4 4 0 0 0-7.91-.75M16 12V5M8 12V8.24M3 3l18 18M5.2 5.2A8.96 8.96 0 0 0 3 11h2a7 7 0 0 0 .41 2.37M12 20.94V23h-2v-2.06A9 9 0 0 1 3 12H1m15.5 3.5A4 4 0 0 1 8 13.7M12 20.94A9 9 0 0 0 19 12h2c0 4.42-3.17 8.1-7.37 8.88" />
            </svg>
          )}
          <span>{isMicrophoneEnabled ? 'Mute' : 'Unmute'}</span>
        </button>

        <button onClick={onEndCall} className={styles.endBtn}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.58.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C10.61 21 3 13.39 3 4c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.58.11.35.03.74-.24 1.01L6.6 10.8z" />
            <line x1="2" y1="2" x2="22" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span>End call</span>
        </button>
      </div>

      <div className={styles.sessionMeta}>
        <span>Session <code>{session.session_id.slice(0, 16)}…</code></span>
        <span className={styles.metaDivider} />
        <span>Room <code>{session.room_name}</code></span>
      </div>
    </div>
  );
}

// ─── Call ended screen ───────────────────────────────────────────────────────

function CallEndedView({
  reason,
  onStartNew,
}: {
  reason: EndReason;
  onStartNew: () => void;
}) {
  return (
    <div className={styles.center}>
      <div className={styles.setupCard}>
        <div className={styles.setupIcon} style={{ color: reason === 'agent' ? 'var(--color-warning, #f59e0b)' : 'var(--color-success, #22c55e)' }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.58.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C10.61 21 3 13.39 3 4c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.58.11.35.03.74-.24 1.01L6.6 10.8z" />
          </svg>
        </div>
        <div>
          <h2 className={styles.setupTitle}>Call ended</h2>
          <p className={styles.setupDesc}>
            {reason === 'agent'
              ? 'The assistant ended the call.'
              : 'You ended the call.'}
          </p>
        </div>
        <button onClick={onStartNew} className={styles.startBtn}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C11.61 21 4 13.39 4 4c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.24 1.01l-2.21 2.21z" />
          </svg>
          Start new call
        </button>
      </div>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function LiveAssistantPage() {
  const [session, setSession] = useState<CreateRoomResponse | null>(null);
  const [endReason, setEndReason] = useState<EndReason>(null);
  const [loading, setLoading] = useState(false);
  const [micStep, setMicStep] = useState<'idle' | 'requesting' | 'denied'>('idle');
  const [error, setError] = useState<string | null>(null);

  const authUser = useAuthStore((s) => s.user);
  const [userId, setUserId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  useEffect(() => {
    if (authUser?.id) setUserId((prev) => prev || authUser.id);
    if (authUser?.name) setName((prev) => prev || authUser.name);
  }, [authUser?.id, authUser?.name]);

  async function startCall() {
    setLoading(true);
    setError(null);
    setEndReason(null);

    setMicStep('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      setMicStep('denied');
      setError('Microphone access was denied. Allow it in browser settings and try again.');
      setLoading(false);
      return;
    }
    setMicStep('idle');

    try {
      const res = await fetch(`${FASTAPI_BASE_URL}/rooms/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId.trim(),
          customer_id: customerId,
          name: name.trim(),
          phone_number: phoneNumber.trim(),
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Failed to create room (${res.status})`);
      }
      setSession(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start call.');
    } finally {
      setLoading(false);
    }
  }

  async function endCall(reason: EndReason = 'user') {
    if (session) {
      try {
        await fetch(`${FASTAPI_BASE_URL}/rooms/end`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: session.session_id }),
        });
      } catch { /* always clean up */ }
    }
    setSession(null);
    setEndReason(reason);
  }

  // When the room is deleted by the agent (delete_room=True in EndCallTool)
  // the LiveKit SDK fires onDisconnected with reason ROOM_DELETED.
  // We handle that inside ActiveCallView and call this:
  const handleAgentEndedCall = useCallback(() => endCall('agent'), [session]);
  const handleUserEndedCall  = useCallback(() => endCall('user'),  [session]);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (endReason) {
    return (
      <main className={styles.page}>
        <PageHeader title="Live Assistant" description="Real-time voice session monitoring" />
        <CallEndedView reason={endReason} onStartNew={() => setEndReason(null)} />
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <PageHeader title="Live Assistant" description="Real-time voice session monitoring" />

      {!session ? (
        <div className={styles.center}>
          <div className={styles.setupCard}>
            <div className={styles.setupIcon}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 1a4 4 0 0 1 4 4v7a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm0 2a2 2 0 0 0-2 2v7a2 2 0 0 0 4 0V5a2 2 0 0 0-2-2zM5 11a7 7 0 0 0 14 0h2a9 9 0 0 1-8 8.94V22h-2v-2.06A9 9 0 0 1 3 11H5z" />
              </svg>
            </div>
            <div>
              <h2 className={styles.setupTitle}>Start a voice session</h2>
              <p className={styles.setupDesc}>Connect in real-time with your AI assistant</p>
            </div>
            <div className={styles.field}>
              <label htmlFor="customerId">Customer phone or name</label>
              <input id="customerId" value={customerId} onChange={(e) => setCustomerId(e.target.value)} placeholder="e.g. +91… or customer name" autoComplete="off" />
            </div>
            <details className={styles.advancedFields}>
              <summary>Advanced</summary>
              <div className={styles.fieldGrid}>
                <div className={styles.field}>
                  <label htmlFor="userId">Your User ID</label>
                  <input id="userId" value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="User ID" autoComplete="off" />
                </div>
                <div className={styles.field}>
                  <label htmlFor="name">Your Name</label>
                  <input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
                </div>
              </div>
            </details>
            {error && (
              <div className={styles.errorBox} role="alert">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                </svg>
                {error}
              </div>
            )}
            <button onClick={startCall} disabled={loading} className={styles.startBtn}>
              {loading ? (
                <><span className={styles.spinner} aria-hidden="true" />
                  {micStep === 'requesting' ? 'Requesting microphone…' : 'Connecting…'}</>
              ) : (
                <><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C11.61 21 4 13.39 4 4c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.24 1.01l-2.21 2.21z" />
                </svg>Start call</>
              )}
            </button>
            <p className={styles.micNote}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 1a4 4 0 0 1 4 4v7a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm0 2a2 2 0 0 0-2 2v7a2 2 0 0 0 4 0V5a2 2 0 0 0-2-2zM5 11a7 7 0 0 0 14 0h2a9 9 0 0 1-8 8.94V22h-2v-2.06A9 9 0 0 1 3 11H5z" />
              </svg>
              Microphone access will be requested when you start the call
            </p>
          </div>
        </div>
      ) : (
        <LiveKitRoom
          serverUrl={session.livekit_url}
          token={session.token}
          connect={true}
          audio={true}
          video={false}
          onDisconnected={() => {
            endCall('user');
          }}
          className={styles.lkRoom}
        >
          <ActiveCallView
            session={session}
            onEndCall={handleUserEndedCall}
            onAgentEndedCall={handleAgentEndedCall}
          />
        </LiveKitRoom>
      )}
    </main>
  );
}