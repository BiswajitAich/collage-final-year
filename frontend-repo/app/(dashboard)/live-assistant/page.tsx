'use client';
import styles from './assistant.module.css';
import { useState } from 'react';
import { LiveKitRoom, RoomAudioRenderer } from '@livekit/components-react';
import '@livekit/components-styles';
import { PageHeader } from '@/components/ui/UIComponents';

type CreateRoomResponse = {
  session_id: string;
  customerId: string;
  room_name: string;
  token: string;
  livekit_url: string;
};

const FASTAPI_BASE_URL =
  process.env.NEXT_PUBLIC_FASTAPI_BASE_URL || 'http://localhost:8000';

export default function LiveAssistantPage() {
  const [session, setSession] = useState<CreateRoomResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState('cmpw8nc79000062uts7fdcn6u');
  const [customerId, setCustomerId] = useState('cust-001');
  const [name, setName] = useState('Biswajit');
  const [phoneNumber, setPhoneNumber] = useState('+919876543210');
  const [error, setError] = useState<string | null>(null);

  async function startCall() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${FASTAPI_BASE_URL}/rooms/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId.trim(),
          customerId: customerId.trim(),
          name: name.trim(),
          phone_number: phoneNumber.trim(),
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Failed to create room (${res.status})`);
      }

      const data: CreateRoomResponse = await res.json();
      setSession(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start call');
    } finally {
      setLoading(false);
    }
  }

  async function endCall() {
    if (!session) return;

    try {
      await fetch(`${FASTAPI_BASE_URL}/rooms/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: session.session_id,
        }),
      });
    } catch {
      // ignore UI-side end errors
    } finally {
      setSession(null);
    }
  }

  return (
    <main className={styles.page}>
      <PageHeader title="Live Assistant" description="Real-time voice session monitoring" />
      {!session ? (
        <div className={styles.grid}>
          <h1 className="text-2xl font-semibold">Live Voice Assistant</h1>
          <p className="mt-2 text-sm text-white/70">
            Start a LiveKit session connected to your FastAPI backend and agent.
          </p>

          <div className={styles.statusCard}>
            <input
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="User ID"
            />
            <input
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              placeholder="Customer ID"
            />
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
            />
            <input
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="Phone number"
            />

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                {error}
              </div>
            )}

            <button
              onClick={startCall}
              disabled={loading}
              className="rounded-xl bg-white px-4 py-3 font-medium text-black disabled:opacity-60"
            >
              {loading ? 'Starting...' : 'Start Call'}
            </button>
          </div>
        </div>
      ) : (
        <LiveKitRoom
          serverUrl={session.livekit_url}
          token={session.token}
          connect={true}
          audio={true}
          onDisconnected={() => setSession(null)}
          className="mx-auto max-w-5xl"
        >
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-xl font-semibold">Connected</h2>
              <p className="mt-2 text-sm text-white/70">
                Session: {session.session_id}
              </p>
              <p className="text-sm text-white/70">
                Room: {session.room_name}
              </p>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={endCall}
                  className="rounded-xl bg-red-500 px-4 py-3 font-medium text-white"
                >
                  End Call
                </button>
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-xl font-semibold">Agent Audio</h2>
              <p className="mt-2 text-sm text-white/70">
                The agent’s room audio is rendered here automatically.
              </p>

              <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
                <RoomAudioRenderer />
                <p className="text-sm text-white/60">
                  Speak after microphone permission is granted.
                </p>
              </div>
            </section>
          </div>
        </LiveKitRoom>
      )}
    </main>
  );
}
