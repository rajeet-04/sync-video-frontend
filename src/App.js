import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";

// ✅ Use the correct backend URL for WebSocket connection
const socket = io("https://sync-video-backend-production.up.railway.app", {
  transports: ["websocket", "polling"], // WebSocket first, fallback to polling
  path: "/socket.io/",
  upgrade: false, // Prevents WebSocket upgrade failures
});

export default function SyncStream() {
  const [gdriveLink, setGdriveLink] = useState("");
  const [videoUrl, setVideoUrl] = useState(null);
  const [roomId, setRoomId] = useState(null);
  const playerRef = useRef(null);

  // ✅ Check if the user joins via a shared link and auto-connect to room
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomIdFromURL = urlParams.get("room");
    if (roomIdFromURL) {
      setRoomId(roomIdFromURL);
      socket.emit("join-room", roomIdFromURL);
    }
  }, []);

  // ✅ Handle WebSocket sync events (Play, Pause, Seek)
  useEffect(() => {
    socket.on("sync", ({ action, time }) => {
      if (playerRef.current) {
        if (action === "play") playerRef.current.play();
        else if (action === "pause") playerRef.current.pause();
        else if (action === "seek") playerRef.current.currentTime = time;
      }
    });

    return () => {
      socket.off("sync");
    };
  }, []);

  // ✅ Generate a new room link
  const handleGenerateLink = () => {
    const id = Math.random().toString(36).substring(7);
    setRoomId(id);
    setVideoUrl(convertGDriveLink(gdriveLink));
    socket.emit("create-room", id);
  };

  // ✅ Handle video play, pause, and seek sync
  const handleVideoEvent = (event) => {
    if (!roomId || !playerRef.current) return;
    const time = playerRef.current.currentTime;
    socket.emit("sync", { roomId, action: event, time });
  };

  return (
      <div>
        <h1>Sync Video Streaming</h1>
        {!roomId ? (
            <>
              <input
                  type="text"
                  placeholder="Paste Google Drive Link"
                  value={gdriveLink}
                  onChange={(e) => setGdriveLink(e.target.value)}
              />
              <button onClick={handleGenerateLink}>Generate Watch Link</button>
            </>
        ) : (
            <>
              <p>Share this link: {window.location.origin}?room={roomId}</p>
              <video
                  src={videoUrl}
                  controls
                  ref={playerRef}
                  onPlay={() => handleVideoEvent("play")}
                  onPause={() => handleVideoEvent("pause")}
                  onSeeked={() => handleVideoEvent("seek")}
              />
            </>
        )}
      </div>
  );
}

// ✅ Convert Google Drive Link to Direct Streaming URL
function convertGDriveLink(link) {
  const match = link.match(/(?:file\/d\/|id=)([a-zA-Z0-9_-]+)/);
  return match ? `https://drive.google.com/uc?id=${match[1]}` : "";
}
