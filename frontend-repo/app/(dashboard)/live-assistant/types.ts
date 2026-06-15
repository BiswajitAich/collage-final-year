export type CreateRoomResponse = {
  session_id: string;
  room_name: string;
  token: string;
  livekit_url: string;
};

export type EndReason = 'user' | 'agent' | null;
export type CallMode = 'browser' | 'mobile';

export const FASTAPI_BASE_URL = process.env.NEXT_PUBLIC_FASTAPI_BASE_URL || 'http://localhost:8000';