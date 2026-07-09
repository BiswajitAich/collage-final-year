"use client";
import styles from "./assistant.module.css";
import { useState, useCallback, useEffect } from "react";
import { LiveKitRoom } from "@livekit/components-react";
import "@livekit/components-styles";
import { PageHeader } from "@/components/ui/UIComponents";
import { useAuthStore } from "@/stores";

import { FASTAPI_BASE_URL, DEFAULTS } from "./types";
import type { CallMode, CreateRoomResponse, EndReason } from "./types";
import { getUser } from "@/app/(auth)/login/action";
import { CallEndedView } from "./_components/CallEndedView";
import { BrowserCallView } from "./_components/BrowserCallView";
import { MobileCallView } from "./_components/MobileCallView";

// ─── Main page ───────────────────────────────────────────────────────────────

export default function LiveAssistantPage() {
    const [callMode, setCallMode] = useState<CallMode>("browser");
    const [session, setSession] = useState<CreateRoomResponse | null>(null);
    const [endReason, setEndReason] = useState<EndReason>(null);
    const [loading, setLoading] = useState(false);
    // const [micStep, setMicStep] = useState<'idle' | 'requesting' | 'denied'>('idle');
    const [error, setError] = useState<string | null>(null);

    // Form values — adminId is the operator/session owner; customerId is the
    // actual customer identity used by agent tool calls.
    const [adminId, setAdminId] = useState("");
    const [customerId, setCustomerId] = useState(DEFAULTS.customerId);
    const [name, setName] = useState("");
    const [phoneNumber, setPhoneNumber] = useState(DEFAULTS.phoneNumber);

    // Load current user from auth session
    useEffect(() => {
        getUser().then((user) => {
            if (user) {
                setAdminId(user.id);
                setName(user.name || DEFAULTS.name);
                if (!customerId) setCustomerId(user.id);
            } else {
                // fallback to env defaults if not logged in
                setAdminId(DEFAULTS.adminId);
                setName(DEFAULTS.name);
            }
        });
    }, []);

    // ── Start call ─────────────────────────────────────────────────────────────
    async function startCall() {
        if (!customerId.trim()) {
            setError("Customer ID is required to start a session.");
            return;
        }

        setLoading(true);
        setError(null);
        setEndReason(null);

        // // 1. Request mic permission first
        // setMicStep('requesting');
        // try {
        //   const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        //   stream.getTracks().forEach(t => t.stop());
        // } catch {
        //   setMicStep('denied');
        //   setError('Microphone access was denied. Allow it in browser settings and try again.');
        //   setLoading(false);
        //   return;
        // }
        // setMicStep('idle');

        // 2. Create LiveKit room via API
        try {
            const res = await fetch(`${FASTAPI_BASE_URL}/rooms/create`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    admin_id: adminId.trim() || undefined,
                    customer_id: customerId.trim(),
                    name: name.trim(),
                    phone_number: phoneNumber.trim(),
                }),
            });
            if (!res.ok) {
                const text = await res.text();
                throw new Error(
                    text || `Failed to create room (${res.status})`,
                );
            }
            const data: CreateRoomResponse = await res.json();
            setSession(data);

            if (callMode === "mobile") {
                const dialRes = await fetch(
                    `${FASTAPI_BASE_URL}/rooms/outbound-call`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            session_id: data.session_id,
                            phone_number: phoneNumber.trim(),
                            name: name.trim(),
                        }),
                    },
                );

                if (!dialRes.ok) {
                    const text = await dialRes.text();
                    throw new Error(
                        text ||
                            `Failed to start mobile call (${dialRes.status})`,
                    );
                }
            }
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to start call.",
            );
        } finally {
            setLoading(false);
        }
    }

    // ── Connection error (e.g. LiveKit failed to connect/dropped) ────────────────
    function handleConnectionError(err: Error) {
        setError(err.message || "Lost connection to the call.");
        setSession(null);
    }

    // ── End call ───────────────────────────────────────────────────────────────
    async function endCall(reason: EndReason = "user") {
        if (session) {
            try {
                await fetch(`${FASTAPI_BASE_URL}/rooms/end`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ session_id: session.session_id }),
                });
            } catch {
                /* always clean up */
            }
        }
        setSession(null);
        setEndReason(reason);
    }

    const handleAgentEndedCall = useCallback(() => endCall("agent"), [session]);
    const handleUserEndedCall = useCallback(() => endCall("user"), [session]);

    // ── Render ─────────────────────────────────────────────────────────────────

    if (endReason) {
        return (
            <main className={styles.page}>
                <PageHeader
                    title="Live Assistant"
                    description="Real-time voice session monitoring"
                />
                <CallEndedView
                    reason={endReason}
                    onStartNew={() => setEndReason(null)}
                />
            </main>
        );
    }

    return (
        <main className={styles.page}>
            <PageHeader
                title="Live Assistant"
                description="Real-time voice session monitoring"
            />

            {session ? (
                callMode === "browser" ? (
                    <LiveKitRoom
                        serverUrl={session.livekit_url}
                        token={session.token}
                        connect={true}
                        audio={true}
                        video={false}
                        onDisconnected={() => endCall("user")}
                        onError={handleConnectionError}
                        className={styles.lkRoom}
                    >
                        <BrowserCallView
                            session={session}
                            onEndCall={handleUserEndedCall}
                            onAgentEndedCall={handleAgentEndedCall}
                        />
                    </LiveKitRoom>
                ) : (
                    <MobileCallView
                        session={session}
                        onEndCall={handleUserEndedCall}
                        onAgentEndedCall={handleAgentEndedCall}
                    />
                )
            ) : (
                <div className={styles.center}>
                    <div className={styles.setupCard}>
                        <div className={styles.setupIcon}>
                            <svg
                                width="26"
                                height="26"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                            >
                                <path d="M12 1a4 4 0 0 1 4 4v7a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm0 2a2 2 0 0 0-2 2v7a2 2 0 0 0 4 0V5a2 2 0 0 0-2-2zM5 11a7 7 0 0 0 14 0h2a9 9 0 0 1-8 8.94V22h-2v-2.06A9 9 0 0 1 3 11H5z" />
                            </svg>
                        </div>

                        <div>
                            <h2 className={styles.setupTitle}>
                                Start a voice session
                            </h2>
                            <p className={styles.setupDesc}>
                                Connect in real-time with your AI assistant
                            </p>
                        </div>

                        <div className={styles.fieldGrid}>
                            <div className={styles.field}>
                                <label htmlFor="name">Name</label>
                                <input
                                    id="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Your name"
                                />
                            </div>
                            <div className={styles.field}>
                                <label htmlFor="phone">Phone number</label>
                                <input
                                    id="phone"
                                    value={phoneNumber}
                                    onChange={(e) =>
                                        setPhoneNumber(e.target.value)
                                    }
                                    placeholder="+91…"
                                    type="tel"
                                />
                            </div>
                        </div>

                        <details className={styles.advancedFields}>
                            <summary>Advanced options</summary>
                            <div className={styles.fieldGrid}>
                                <div className={styles.field}>
                                    <label htmlFor="adminId">Admin ID</label>
                                    <input
                                        id="adminId"
                                        value={adminId}
                                        // onChange={(e) =>
                                        //     setAdminId(e.target.value)
                                        // }
                                        placeholder="Admin ID"
                                    />
                                </div>
                                <div className={styles.field}>
                                    <label htmlFor="customerId">
                                        Customer ID
                                    </label>
                                    <input
                                        id="customerId"
                                        value={customerId}
                                        onChange={(e) =>
                                            setCustomerId(e.target.value)
                                        }
                                        placeholder="Customer ID"
                                    />
                                </div>
                            </div>
                        </details>

                        {error && (
                            <div className={styles.errorBox} role="alert">
                                <svg
                                    width="15"
                                    height="15"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                >
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                                </svg>
                                {error}
                            </div>
                        )}

                        <button
                            onClick={startCall}
                            disabled={loading}
                            className={styles.startBtn}
                        >
                            {/* {loading ? (
                <>
                  <span className={styles.spinner} aria-hidden="true" />
                  {micStep === 'requesting' ? 'Requesting microphone…' : 'Connecting…'}
                </>
              ) : (
                <> */}
                            <svg
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                            >
                                <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C11.61 21 4 13.39 4 4c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.24 1.01l-2.21 2.21z" />
                            </svg>
                            Start call
                            {/* </>
              )} */}
                        </button>

                        <p className={styles.micNote}>
                            <svg
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                            >
                                <path d="M12 1a4 4 0 0 1 4 4v7a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm0 2a2 2 0 0 0-2 2v7a2 2 0 0 0 4 0V5a2 2 0 0 0-2-2zM5 11a7 7 0 0 0 14 0h2a9 9 0 0 1-8 8.94V22h-2v-2.06A9 9 0 0 1 3 11H5z" />
                            </svg>
                            Microphone access will be requested when you start
                            the call
                        </p>
                    </div>
                </div>
            )}

            <button
                className={styles.endBtn}
                onClick={() =>
                    setCallMode((prev) => {
                        return prev === "browser" ? "mobile" : "browser";
                    })
                }
            >
                {callMode === "mobile"
                    ? "Call through Browser"
                    : "Call through Mobile"}
            </button>
        </main>
    );
}
