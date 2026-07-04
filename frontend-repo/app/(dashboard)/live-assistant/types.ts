export type CreateRoomResponse = {
  session_id: string;
  room_name: string;
  token: string;
  livekit_url: string;
};

export type EndReason = 'user' | 'agent' | null;
export type CallMode = 'browser' | 'mobile';

export const FASTAPI_BASE_URL = process.env.NEXT_PUBLIC_FASTAPI_BASE_URL || 'http://localhost:8000';

export const DEFAULTS = {
  userId: process.env.NEXT_PUBLIC_DEFAULT_USER_ID || 'cmpw8nc79000062uts7fdcn6u',
  customerId: process.env.NEXT_PUBLIC_DEFAULT_CUSTOMER_ID || 'cust-001',
  name: process.env.NEXT_PUBLIC_DEFAULT_NAME || 'Biswajit',
  phoneNumber: process.env.NEXT_PUBLIC_DEFAULT_PHONE_NUMBER || '+919876543210',
} as const;