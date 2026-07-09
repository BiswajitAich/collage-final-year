"use client";
import styles from "../assistant.module.css";
import { useState, useCallback, useEffect, useRef } from "react";
import {
    RoomAudioRenderer,
    useLocalParticipant,
    useParticipants,
    useConnectionState,
    useRoomContext,
} from "@livekit/components-react";
import { ConnectionState, DisconnectReason } from "livekit-client";
import { useMicLevel } from "../_hooks/useMikeLevel";
import type { CreateRoomResponse } from "../types";

interface BrowserCallViewProps {
    session: CreateRoomResponse;
    onEndCall: () => void;
    onAgentEndedCall: () => void;
}

export function BrowserCallView({
    session,
    onEndCall,
    onAgentEndedCall,
}: BrowserCallViewProps) {
    const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();
    const allParticipants = useParticipants();
    const connectionState = useConnectionState();
    const room = useRoomContext();

    const remoteParticipants = allParticipants.filter((p) => !p.isLocal);
    const agentConnected = remoteParticipants.length > 0;
    const agentSpeaking = remoteParticipants.some((p) => p.isSpeaking);
    const isConnected = connectionState === ConnectionState.Connected;

    // Publish mic as soon as the room connects
    useEffect(() => {
        if (isConnected) {
            localParticipant.setMicrophoneEnabled(true).catch(console.error);
        }
    }, [isConnected, localParticipant]);

    // Detect agent-initiated disconnect
    useEffect(() => {
        function handleDisconnected(reason?: DisconnectReason) {
            if (
                reason === DisconnectReason.ROOM_DELETED ||
                reason === DisconnectReason.SERVER_SHUTDOWN
            ) {
                onAgentEndedCall();
            }
        }
        room.on("disconnected", handleDisconnected);
        return () => {
            room.off("disconnected", handleDisconnected);
        };
    }, [room, onAgentEndedCall]);

    const micLevel = useMicLevel(isMicrophoneEnabled && isConnected);

    // Call timer — only ticks once the room is actually connected, and stops
    // immediately if the connection drops or errors out.
    const [elapsed, setElapsed] = useState(0);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    useEffect(() => {
        if (!isConnected) return;
        intervalRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isConnected]);
    const formatTime = (s: number) =>
        `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

    const toggleMic = useCallback(async () => {
        try {
            await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
        } catch (err) {
            console.error("Failed to toggle mic:", err);
        }
    }, [localParticipant, isMicrophoneEnabled]);

    const agentLabel = !isConnected
        ? "Connecting to room…"
        : agentConnected
          ? agentSpeaking
              ? "Speaking…"
              : "Listening"
          : "Waiting for agent…";

    const orbClass = agentSpeaking
        ? styles.orbSpeaking
        : agentConnected
          ? styles.orbListening
          : styles.orbWaiting;

    return (
        <div className={styles.callPage}>
            <RoomAudioRenderer />

            {/* Animated orb */}
            <div className={`${styles.orbWrap} ${orbClass}`}>
                <span className={styles.ring1} />
                <span className={styles.ring2} />
                <div className={styles.orbInner}>
                    <svg
                        width="34"
                        height="34"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                    >
                        <circle cx="12" cy="8" r="4" />
                        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                    </svg>
                </div>
            </div>

            {/* Agent status */}
            <div className={styles.agentInfo}>
                <p className={styles.agentName}>AI Assistant</p>
                <p
                    className={`${styles.agentState} ${
                        agentSpeaking
                            ? styles.stateSpeaking
                            : agentConnected
                              ? styles.stateListening
                              : ""
                    }`}
                >
                    <span className={styles.dot} />
                    {agentLabel}
                </p>
            </div>

            {/* Audio waveform */}
            <div
                className={`${styles.wave} ${agentSpeaking ? styles.waveActive : ""}`}
                aria-hidden="true"
            >
                {Array.from({ length: 16 }, (_, i) => (
                    <span
                        key={i}
                        className={styles.bar}
                        style={{ animationDelay: `${(i * 0.06).toFixed(2)}s` }}
                    />
                ))}
            </div>

            <p className={styles.timer}>{formatTime(elapsed)}</p>

            {/* Mic status bar */}
            <div className={styles.micStatus}>
                {!isConnected ? (
                    <span className={styles.micStatusWait}>
                        <span
                            className={`${styles.micDot} ${styles.micDotWait}`}
                        />
                        Connecting…
                    </span>
                ) : isMicrophoneEnabled ? (
                    <span className={styles.micStatusOn}>
                        <span
                            className={`${styles.micDot} ${styles.micDotOn}`}
                        />
                        Mic active
                        <span className={styles.micLevelWrap}>
                            <span
                                className={styles.micLevelFill}
                                style={{ width: `${micLevel}%` }}
                            />
                        </span>
                        {micLevel < 5 && (
                            <span className={styles.micLevelHint}>
                                (speak louder or check mic)
                            </span>
                        )}
                    </span>
                ) : (
                    <span className={styles.micStatusOff}>
                        <span
                            className={`${styles.micDot} ${styles.micDotOff}`}
                        />
                        Muted — agent cannot hear you
                    </span>
                )}
            </div>

            {/* Controls */}
            <div className={styles.controls}>
                <button
                    onClick={toggleMic}
                    className={`${styles.ctrlBtn} ${!isMicrophoneEnabled ? styles.mutedBtn : ""}`}
                    title={isMicrophoneEnabled ? "Mute" : "Unmute"}
                >
                    {isMicrophoneEnabled ? (
                        <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                        >
                            <path d="M12 1a4 4 0 0 1 4 4v7a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm0 2a2 2 0 0 0-2 2v7a2 2 0 0 0 4 0V5a2 2 0 0 0-2-2zM5 11a7 7 0 0 0 14 0h2a9 9 0 0 1-8 8.94V22h-2v-2.06A9 9 0 0 1 3 11H5z" />
                        </svg>
                    ) : (
                        <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                        >
                            <path d="M16 5a4 4 0 0 0-7.91-.75M16 12V5M8 12V8.24M3 3l18 18M5.2 5.2A8.96 8.96 0 0 0 3 11h2a7 7 0 0 0 .41 2.37M12 20.94V23h-2v-2.06A9 9 0 0 1 3 12H1m15.5 3.5A4 4 0 0 1 8 13.7M12 20.94A9 9 0 0 0 19 12h2c0 4.42-3.17 8.1-7.37 8.88" />
                        </svg>
                    )}
                    <span>{isMicrophoneEnabled ? "Mute" : "Unmute"}</span>
                </button>

                <button onClick={onEndCall} className={styles.endBtn}>
                    <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                    >
                        <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.58.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C10.61 21 3 13.39 3 4c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.58.11.35.03.74-.24 1.01L6.6 10.8z" />
                        <line
                            x1="2"
                            y1="2"
                            x2="22"
                            y2="22"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                        />
                    </svg>
                    <span>End call</span>
                </button>
            </div>

            {/* Session metadata */}
            <div className={styles.sessionMeta}>
                <span>
                    Session <code>{session.session_id.slice(0, 16)}…</code>
                </span>
                <span className={styles.metaDivider} />
                <span>
                    Room <code>{session.room_name}</code>
                </span>
            </div>
        </div>
    );
}
