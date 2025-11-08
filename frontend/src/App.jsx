// App.jsx
import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import { Toaster, toast } from "react-hot-toast";
import WaitingScreen from "./components/WaitingScreen";
import ChatBox from "./components/ChatBox";
import NamePrompt from "./components/NamePrompt";
import Header from "./components/Header";
import FaceRecognition from "./components/FaceRecognition";

export default function App() {
  const socketRef = useRef(null);
  const pcRef = useRef(null);

  // State
  const [name, setName] = useState("");
  const [connected, setConnected] = useState(false);
  const [waiting, setWaiting] = useState(true);
  const [messages, setMessages] = useState([]);
  const [partnerName, setPartnerName] = useState(null);
  const [partnerGender, setPartnerGender] = useState(null);
  const [partnerLocation, setPartnerLocation] = useState(null);
  const [roomId, setRoomId] = useState(null);
  const [history, setHistory] = useState([]);
  const [tearingDown, setTearingDown] = useState(false);

  // Video
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [videoActive, setVideoActive] = useState(false);

  // Face Recognition
  const [showFaceScan, setShowFaceScan] = useState(false);
  const [myGender, setMyGender] = useState(null);

  // Location
  const [myLocation, setMyLocation] = useState("Fetching location…");

  /* ---------------- LOCATION FUNCTIONS ---------------- */
  const fetchLocationFromCoords = async (lat, lon) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
      );
      const data = await res.json();
      const city =
        data.address?.city ||
        data.address?.town ||
        data.address?.village ||
        data.address?.state_district;
      const country = data.address?.country;
      if (city && country) return `${city}, ${country}`;
      if (country) return country;
      return "Unknown location";
    } catch {
      return "Unable to fetch location";
    }
  };

  const getLocation = async () => {
    if (!navigator.geolocation) {
      setMyLocation("Geolocation not supported");
      return;
    }

    setMyLocation("Detecting location…");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const loc = await fetchLocationFromCoords(latitude, longitude);
        setMyLocation(loc);
      },
      (err) => {
        console.error("Geolocation error:", err);
        setMyLocation("Location access denied");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  useEffect(() => {
    if (window.innerWidth > 768) getLocation();
    else setMyLocation("Tap to detect location");
  }, []);

  /* ---------------- STEP 1: Handle Face Scan ---------------- */
  const connectSocket = (username) => {
    setName(username);
    setShowFaceScan(true);
  };

  /* ---------------- STEP 2: After Face Verification ---------------- */
  const handleFaceVerified = (detectedGender) => {
    setMyGender(detectedGender);
    setShowFaceScan(false);
    setConnected(true);
  };

  /* ---------------- STUN + TURN ---------------- */
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
  const attachSocketHandlers = (
    s,
    currentName,
    currentGender,
    currentLocation
  ) => {
    s.on("connect", () => {
      s.data = { startTime: Date.now() };
      // ✅ Include location when finding partner
      s.emit("find-partner", {
        name: currentName,
        gender: currentGender,
        location: currentLocation,
      });
    });

    s.on("file-message", (msgObj) => {
      setMessages((prev) => [...prev, msgObj]);
    });

    s.on("waiting", () => {
      setWaiting(true);
      setRoomId(null);
      setPartnerName(null);
      setPartnerGender(null);
      setPartnerLocation(null);
      stopVideo();
    });

    s.on(
      "partner-found",
      ({ roomId, partnerName, partnerGender, partnerLocation }) => {
        s.data.startTime = Date.now();
        setWaiting(false);
        setRoomId(roomId);
        setPartnerName(partnerName);
        setPartnerGender(partnerGender);
        setPartnerLocation(partnerLocation || "Unknown");
        setMessages([]);
        toast.success(`🎉 Connected with ${partnerName} (${partnerGender})`);
      }
    );

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
      setPartnerGender(null);
      setPartnerLocation(null);
      setMessages([]);
      s.emit("find-partner", {
        name: currentName,
        gender: currentGender,
        location: currentLocation,
      });
    });

    // --- WebRTC Signaling (unchanged) ---
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
        await pcRef.current.setRemoteDescription(
          new RTCSessionDescription(sdp)
        );
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
        await pcRef.current?.setRemoteDescription(
          new RTCSessionDescription(sdp)
        );
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

    s.on("stop-video", () => stopVideo());
  };

  /* ---------------- SOCKET INIT ---------------- */
  useEffect(() => {
    if (!connected || !name || !myGender) return;
    const s = io("http://localhost:5000", { transports: ["websocket"] });
    socketRef.current = s;
    attachSocketHandlers(s, name, myGender, myLocation);
    return () => safeDisconnect();
  }, [connected, name, myGender, myLocation]);

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

    pc.ontrack = (e) => setRemoteStream(e.streams[0]);

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
    localStream?.getTracks()?.forEach((t) => t.stop());
    setLocalStream(null);
    setRemoteStream(null);
    setVideoActive(false);
  };

  /* ---------------- CHAT ACTIONS ---------------- */
  const sendMessage = (msg) => {
    if (!msg?.trim() || !roomId) return;
    const m = { from: "me", name, text: msg };
    setMessages((prev) => [...prev, m]);
    socketRef.current.emit("message", { roomId, message: msg, name });
  };

  const sendFileMessage = (fileObj) => {
    if (!roomId) return;
    const m = { from: "me", ...fileObj };
    setMessages((prev) => [...prev, m]);
    socketRef.current.emit("file-message", { roomId, file: fileObj, name });
  };

  const nextChat = () => {
    toast("🔄 Searching for a new partner…", { icon: "🌐" });
    stopVideo();
    socketRef.current?.emit("end");
    socketRef.current?.disconnect();
    socketRef.current = null;
    setWaiting(true);
    setMessages([]);
    setPartnerName(null);
    setPartnerGender(null);
    setPartnerLocation(null);

    setTimeout(() => {
      const newSocket = io("http://localhost:5000", {
        transports: ["websocket"],
      });
      socketRef.current = newSocket;
      attachSocketHandlers(newSocket, name, myGender, myLocation);
      setTearingDown(false);
    }, 300);
  };

  const endChat = () => {
    toast.success("👋 Chat ended successfully!");
    stopVideo();
    safeDisconnect();
    setTimeout(() => {
      setMessages([]);
      setWaiting(true);
      setPartnerName(null);
      setPartnerGender(null);
      setPartnerLocation(null);
      setConnected(false);
      setName("");
      window.location.reload();
    }, 300);
  };

  /* ---------------- RENDER ---------------- */
  return (
    <div
      className="min-h-screen w-full flex flex-col relative"
      style={{ background: "rgb(var(--bg))", color: "rgb(var(--text))" }}
    >
      <Header
        appName="EchoMeet"
        location={myLocation}
        onRefreshLocation={getLocation}
      />

      <main className="flex-1 flex items-center justify-center pb-6 px-3 sm:px-6 md:px-8 pt-16 sm:pt-20">
        {!connected ? (
          showFaceScan ? (
            <FaceRecognition onVerified={handleFaceVerified} />
          ) : (
            <NamePrompt onSubmit={connectSocket} />
          )
        ) : waiting ? (
          <WaitingScreen />
        ) : (
          <ChatBox
            name={name}
            partnerName={partnerName}
            messages={messages}
            onSend={sendMessage}
            onSendFile={sendFileMessage}
            onNext={nextChat}
            onEnd={endChat}
            history={history}
            roomId={roomId}
            localStream={localStream}
            remoteStream={remoteStream}
            videoActive={videoActive}
            onStartVideo={startVideo}
            onStopVideo={stopVideo}
            gender={partnerGender}
            location={partnerLocation}
            sessionStartAt={Date.now()}
          />
        )}
      </main>

      <footer
        className="text-center py-3 text-xs border-t"
        style={{
          color: "rgb(var(--muted))",
          borderColor: "rgb(var(--border))",
        }}
      >
        Built with ❤️ using{" "}
        <span
          className="font-medium"
          style={{ color: "rgb(var(--accent-500))" }}
        >
          EchoMeet
        </span>
      </footer>

      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "rgb(var(--surface))",
            color: "rgb(var(--text))",
            border: "1px solid rgb(var(--border))",
          },
        }}
      />
    </div>
  );
}
