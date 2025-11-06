// App.jsx
import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import { Toaster, toast } from "react-hot-toast";
import WaitingScreen from "./components/WaitingScreen";
import ChatBox from "./components/ChatBox";
import NamePrompt from "./components/NamePrompt";
import Header from "./components/Header";

export default function App() {
  const socketRef = useRef(null);
  const pcRef = useRef(null);

  // State
  const [name, setName] = useState("");
  const [connected, setConnected] = useState(false);
  const [waiting, setWaiting] = useState(true);
  const [messages, setMessages] = useState([]);
  const [partnerName, setPartnerName] = useState(null);
  const [roomId, setRoomId] = useState(null);
  const [history, setHistory] = useState([]);
  const [tearingDown, setTearingDown] = useState(false);

  // Video
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [videoActive, setVideoActive] = useState(false);

  // STUN + TURN
  const rtcConfig = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      {
        urls: "turn:relay1.expressturn.com:3478",
        username: "efree",
        credential: "turnpassword",
      },
    ],
  };

  /* ---------------- SAFE SOCKET DISCONNECT ---------------- */
  const safeDisconnect = () => {
    const s = socketRef.current;
    if (!s) return;
    try {
      s.off();
      s.emit("end");
      s.disconnect();
    } catch {}
    socketRef.current = null;
  };

  /* ---------------- SOCKET EVENTS ---------------- */
  const attachSocketHandlers = (s, currentName) => {
    s.on("connect", () => {
      s.data = { startTime: Date.now() };
      s.emit("find-partner", { name: currentName });
    });

    s.on("waiting", () => {
      setWaiting(true);
      setRoomId(null);
      setPartnerName(null);
      stopVideo();
    });

    s.on("partner-found", ({ roomId, partnerName }) => {
      s.data.startTime = Date.now();
      setWaiting(false);
      setRoomId(roomId);
      setPartnerName(partnerName);
      setMessages([]);
      toast.success(`🎉 Connected with ${partnerName}`);
    });

    s.on("message", (msgObj) => {
      setMessages((prev) => [...prev, msgObj]);
    });

    s.on("chat-summary", ({ partnerName, durationMs, endedAt }) => {
      setHistory((prev) =>
        [{ partnerName, durationMs, endedAt }, ...prev].slice(0, 20)
      );
    });

    s.on("partner-left", () => {
      toast("⚠️ Partner left the chat.");
      stopVideo();
      setWaiting(true);
      setPartnerName(null);
      setMessages([]);
      s.emit("find-partner", { name: currentName });
    });

    // --- WebRTC Signaling ---
    s.on("video-start", async ({ roomId: rid, youAreCaller }) => {
      toast("🎥 Your partner started a video call!");
      ensurePeerConnection(rid);
      if (youAreCaller) {
        try {
          const offer = await pcRef.current.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
          });
          await pcRef.current.setLocalDescription(offer);
          socketRef.current.emit("webrtc-offer", { roomId: rid, sdp: offer });
        } catch (err) {
          console.error("createOffer error", err);
        }
      }
    });

    s.on("webrtc-offer", async ({ sdp, roomId: rid }) => {
      ensurePeerConnection(rid || roomId);
      try {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await pcRef.current.createAnswer();
        await pcRef.current.setLocalDescription(answer);
        socketRef.current.emit("webrtc-answer", {
          roomId: rid || roomId,
          sdp: answer,
        });
      } catch (err) {
        console.error("Answer flow error", err);
      }
    });

    s.on("webrtc-answer", async ({ sdp }) => {
      try {
        await pcRef.current?.setRemoteDescription(new RTCSessionDescription(sdp));
      } catch (err) {
        console.error("setRemoteDescription(answer) error", err);
      }
    });

    s.on("webrtc-ice-candidate", async ({ candidate }) => {
      try {
        if (candidate) {
          await pcRef.current?.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (err) {
        console.error("addIceCandidate error", err);
      }
    });

    s.on("stop-video", () => {
      stopVideo();
    });
  };

  /* ---------------- SOCKET INIT ---------------- */
  useEffect(() => {
    if (!connected || !name) return;
    const s = io("https://echomeet-1-3sd1.onrender.com", { transports: ["websocket"] });
    socketRef.current = s;
    attachSocketHandlers(s, name);
    return () => safeDisconnect();
  }, [connected, name]);

  /* ---------------- WEBRTC HANDLERS ---------------- */
  const ensurePeerConnection = (rid) => {
    if (pcRef.current) return pcRef.current;
    const pc = new RTCPeerConnection(rtcConfig);
    pcRef.current = pc;

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socketRef.current.emit("webrtc-ice-candidate", {
          roomId: rid,
          candidate: e.candidate,
        });
      }
    };

    pc.ontrack = (e) => {
      const stream = e.streams[0];
      setRemoteStream(stream);
    };

    pc.onconnectionstatechange = () => {
      if (["disconnected", "failed", "closed"].includes(pc.connectionState)) {
        stopVideo();
      }
    };
    return pc;
  };

  const getLocalMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      setLocalStream(stream);
      return stream;
    } catch (err) {
      console.error("Error accessing media:", err);
      throw err;
    }
  };

  const addLocalTracksIfNeeded = (pc, stream) => {
    const existingTracks = new Set(pc.getSenders().map((s) => s.track));
    stream.getTracks().forEach((t) => {
      if (!existingTracks.has(t)) pc.addTrack(t, stream);
    });
  };

  const startVideo = async () => {
    if (!roomId || videoActive) return;
    try {
      const stream = localStream || (await getLocalMedia());
      const pc = ensurePeerConnection(roomId);
      addLocalTracksIfNeeded(pc, stream);
      socketRef.current.emit("start-video", { roomId });
      setVideoActive(true);
    } catch (err) {
      console.error("startVideo error:", err);
    }
  };

  const stopVideo = () => {
    try {
      socketRef.current?.emit("stop-video", { roomId });
    } catch {}
    try {
      pcRef.current?.getSenders()?.forEach((s) => s.track && s.track.stop());
      pcRef.current?.close();
    } catch {}
    pcRef.current = null;

    try {
      localStream?.getTracks()?.forEach((t) => t.stop());
    } catch {}
    setLocalStream(null);
    setRemoteStream(null);
    setVideoActive(false);
  };

  /* ---------------- CHAT ACTIONS ---------------- */
  const connectSocket = (username) => {
    setName(username);
    setConnected(true);
  };

  const sendMessage = (msg) => {
    if (!msg?.trim() || !roomId) return;
    const m = { from: "me", name, text: msg };
    setMessages((prev) => [...prev, m]);
    socketRef.current.emit("message", { roomId, message: msg, name });
  };

  const saveCurrentChatToHistory = () => {
    if (!partnerName || messages.length === 0) return;
    const endedAt = new Date().toISOString();
    const start = socketRef.current?.data?.startTime || Date.now();
    const durationMs = Date.now() - start;
    setHistory((prev) => [
      { partnerName, durationMs, endedAt, messages },
      ...prev,
    ]);
  };

  const nextChat = () => {
    toast("🔄 Searching for a new partner…", { icon: "🌐" });
    saveCurrentChatToHistory();
    setTearingDown(true);
    stopVideo();
    socketRef.current?.emit("end");
    socketRef.current?.disconnect();
    socketRef.current = null;
    setWaiting(true);
    setMessages([]);
    setPartnerName(null);

    setTimeout(() => {
      const newSocket = io("https://echomeet-1-3sd1.onrender.com", { transports: ["websocket"] });
      socketRef.current = newSocket;
      attachSocketHandlers(newSocket, name);
      setTearingDown(false);
    }, 300);
  };

  const endChat = () => {
    toast.success("👋 Chat ended successfully!");
    saveCurrentChatToHistory();
    setTearingDown(true);
    stopVideo();
    safeDisconnect();
    setTimeout(() => {
      setMessages([]);
      setWaiting(true);
      setPartnerName(null);
      setConnected(false);
      setName("");
      setTearingDown(false);
      window.location.reload();
    }, 300);
  };

  /* ---------------- RENDER ---------------- */
  return (
    <div className="min-h-screen w-full flex flex-col bg-[rgb(var(--bg))] text-[rgb(var(--text))] relative">
      <Header appName="EchoMeet" />

      <main className="flex-1 flex items-center justify-center pb-6 px-4 sm:px-6 md:px-8">
        {!connected ? (
          <NamePrompt onSubmit={connectSocket} />
        ) : tearingDown ? (
          <div className="text-center opacity-80">
            <div className="animate-pulse text-lg text-[rgb(var(--accent-500))]">
              Ending chat…
            </div>
            <div className="text-sm text-gray-400 mt-1">
              Cleaning up connection
            </div>
          </div>
        ) : waiting ? (
          <WaitingScreen />
        ) : (
          <ChatBox
            name={name}
            partnerName={partnerName}
            messages={messages}
            onSend={sendMessage}
            onNext={nextChat}
            onEnd={endChat}
            history={history}
            roomId={roomId}
            localStream={localStream}
            remoteStream={remoteStream}
            videoActive={videoActive}
            onStartVideo={startVideo}
            onStopVideo={stopVideo}
          />
        )}
      </main>

      <footer className="text-center py-3 text-xs text-gray-500 border-t border-gray-800">
        Built with ❤️ using{" "}
        <span className="text-[rgb(var(--accent-500))] font-medium">
          EchoMeet
        </span>
      </footer>

      {/* Global Toaster */}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "#111",
            color: "#fff",
            border: "1px solid #333",
          },
          success: {
            iconTheme: {
              primary: "rgb(var(--accent-500))",
              secondary: "#111",
            },
          },
        }}
      />
    </div>
  );
}
