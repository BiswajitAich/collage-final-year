'use client'
import { useEffect, useState } from "react";
import { CreateRoomResponse } from "../types";
interface MobileCallViewProps {
  session: CreateRoomResponse;
  onEndCall: () => void;
  onAgentEndedCall: () => void;
}
export function MobileCallView({
  session,
  onEndCall,
}: MobileCallViewProps) {

  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setElapsed(v => v + 1);
    }, 1000);

    return () => clearInterval(id);
  }, []);

  return (
    <div>
      <h2>Calling mobile phone...</h2>

      <p>{session.room_name}</p>

      <p>
        Duration: {elapsed}s
      </p>

      <button onClick={onEndCall}>
        End Call
      </button>
    </div>
  );
}