import React, { useState, useRef, useEffect, Fragment } from "react";
import * as Tone from "tone"; // 🎧 Enhanced Audio
import VideoBox from "./VideoBox";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faClock,
  faHistory,
  faArrowRightRotate,
  faStop,
  faPaperclip,
  faXmark,
  faPlay,
  faPause,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
const AudioDuration = ({ src }) => {
  const [duration, setDuration] = useState(null);

  useEffect(() => {
    if (!src) return;
    const audio = new Audio(src);
    audio.addEventListener("loadedmetadata", () => {
      const dur = audio.duration;
      if (!isNaN(dur)) setDuration(formatTime(dur));
    });
    return () => {
      audio.remove();
    };
  }, [src]);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60)
      .toString()
      .padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <span
      className="text-xs font-medium"
      style={{
        color: "rgb(var(--muted))",
        minWidth: "32px",
        textAlign: "right",
      }}
    >
      {duration || "0:00"}
    </span>
  );
};

export default function ChatBox({
  name,
  partnerName,
  messages,
  onSend,
  onSendFile,
  onNext,
  onEnd,
  history,
  roomId,
  localStream,
  remoteStream,
  videoActive,
  onStartVideo,
  onStopVideo,
  sessionStartAt,
  gender,
  location,
}) {
  const [msg, setMsg] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [playingAudio, setPlayingAudio] = useState(null);
  const [localHistory, setLocalHistory] = useState([]);
  const fileInputRef = useRef(null);

  // 🎧 Initialize Tone.js once
  useEffect(() => {
    Tone.start().catch(() => {});
  }, []);

  // 🧹 Keep chat history even on reload (don’t clear it)
  useEffect(() => {
    const nav = performance.getEntriesByType("navigation")[0];
    if (nav?.type === "reload") {
      const keep = sessionStorage.getItem("chatHistory");
      sessionStorage.clear();
      if (keep) sessionStorage.setItem("chatHistory", keep);
      console.log("🧹 Session cleared except history");
    }
  }, []);

  // Auto-scroll to bottom on message update
  const messagesEndRef = useRef(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ⏱️ Session timer
  const [sessionElapsedMs, setSessionElapsedMs] = useState(0);
  const sessionStart = sessionStartAt
    ? new Date(sessionStartAt).getTime()
    : Date.now();
  useEffect(() => {
    const base = sessionStart;
    const tick = () => setSessionElapsedMs(Date.now() - base);
    const id = setInterval(tick, 1000);
    tick();
    return () => clearInterval(id);
  }, [sessionStartAt]);

  // 🗂 Load saved history initially
  useEffect(() => {
    const stored = JSON.parse(sessionStorage.getItem("chatHistory") || "[]");
    setLocalHistory(stored);
  }, []);

  // 🗂 Reload history whenever "History" view opens
  useEffect(() => {
    if (showHistory) {
      const stored = JSON.parse(sessionStorage.getItem("chatHistory") || "[]");
      setLocalHistory(stored);
    }
  }, [showHistory]);

  // 💾 Save chat info
  const saveChatHistory = () => {
    if (!partnerName) return;

    const prev = JSON.parse(sessionStorage.getItem("chatHistory") || "[]");

    const newEntry = {
      partnerName: partnerName || "Unknown",
      gender: gender || "Unknown",
      location: location || "Unknown",
      durationMs: sessionElapsedMs,
      endedAt: new Date().toISOString(),
    };

    // Remove duplicates
    const filtered = prev.filter(
      (h) =>
        !(
          h.partnerName === newEntry.partnerName &&
          h.gender === newEntry.gender &&
          Math.abs(new Date(h.endedAt) - new Date(newEntry.endedAt)) < 3000
        )
    );

    const updated = [newEntry, ...filtered].slice(0, 50);
    sessionStorage.setItem("chatHistory", JSON.stringify(updated));
    setLocalHistory(updated);
  };

  // Helpers
  const formatHMS = (ms) => {
    const total = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const getMsgTimestamp = (m) => {
    const t =
      m.timestamp ??
      m.ts ??
      m.at ??
      m.createdAt ??
      m.time ??
      m.date ??
      Date.now();
    return typeof t === "number" ? t : new Date(t).getTime();
  };

  const sameDay = (a, b) => {
    const da = new Date(a);
    const db = new Date(b);
    return (
      da.getFullYear() === db.getFullYear() &&
      da.getMonth() === db.getMonth() &&
      da.getDate() === db.getDate()
    );
  };

  const humanDayLabel = (timeMs) => {
    const d = new Date(timeMs);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (sameDay(d, today)) return "Today";
    if (sameDay(d, yesterday)) return "Yesterday";
    return d.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: d.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
    });
  };

  // 📤 Send Message
  const handleSend = (e) => {
    e.preventDefault();
    if (!msg.trim()) return;
    onSend(msg);
    setMsg("");
  };

  // 📎 Send File
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert("❌ File must be less than 10 MB!");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      let type = "file";
      if (file.type.startsWith("image")) type = "image";
      else if (file.type.startsWith("video")) type = "video";
      else if (file.type.startsWith("audio")) type = "audio";

      onSendFile({
        type,
        data: reader.result,
        name: file.name,
        mime: file.type,
      });
    };
    reader.readAsDataURL(file);
  };

  // 🎧 Enhanced Audio Playback
  const playEnhancedAudio = async (url, msgId) => {
    try {
      await Tone.start();
      if (playingAudio?.msgId === msgId) {
        playingAudio.player.stop();
        setPlayingAudio(null);
        return;
      }

      playingAudio?.player?.stop?.();
      const player = new Tone.Player(url).toDestination();
      const eq = new Tone.EQ3(-3, 4, 5);
      const comp = new Tone.Compressor(-15, 6);
      player.chain(eq, comp, Tone.Destination);

      player.autostart = true;
      setPlayingAudio({ msgId, player });
      player.onstop = () => setPlayingAudio(null);
    } catch (e) {
      console.error("Audio error:", e);
    }
  };

  const closePreview = () => setPreviewFile(null);

  return (
    <div className="w-full max-w-6xl mx-auto sm:pt-20 flex flex-col lg:flex-row gap-4 sm:gap-6 relative">
      <style>
        {`
          @keyframes waveMove {
            0%, 100% { transform: scaleY(0.4); opacity: 0.6; }
            50% { transform: scaleY(1.3); opacity: 1; }
          }
          .animate-wave {
            animation: waveMove 1.2s ease-in-out infinite;
          }
          .paused-wave {
            opacity: 0.4;
            transform: scaleY(0.5);
            animation: none;
          }
        `}
      </style>

      {/* RIGHT: VIDEO BOX */}
      <div
        className="w-full lg:w-[29%] rounded-2xl shadow-lg border flex flex-col items-center p-3 sm:p-4"
        style={{
          background: "rgba(var(--surface),0.8)",
          borderColor: "rgb(var(--border))",
        }}
      >
        <VideoBox
          localStream={localStream}
          remoteStream={remoteStream}
          videoActive={videoActive}
          onStartVideo={onStartVideo}
          onStopVideo={onStopVideo}
          name={name}
          partnerName={partnerName}
        />
      </div>

      {/* LEFT: CHAT */}
      <div
        className="flex-1 flex flex-col rounded-2xl shadow-lg overflow-hidden border"
        style={{
          background: "rgba(var(--surface),0.8)",
          borderColor: "rgb(var(--border))",
        }}
      >
        {/* HEADER SECTION */}
        <div
          className="w-full flex flex-col items-center justify-center text-center border-b sm:px-4 py-2 sm:py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-3 bg-[rgba(var(--surface),0.85)]"
          style={{ borderColor: "rgb(var(--border))" }}
        >
          {/* LEFT SIDE: Partner Info */}
        <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-sm sm:text-base font-semibold truncate text-center">
            {showHistory ? (
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={faHistory} />
                <span>History</span>
              </div>
            ) : (
              <>
                <span className="truncate">
                  Chatting with{" "}
                  <span
                    style={{
                      color:
                        gender === "Female"
                          ? "#db2777"
                          : gender === "Male"
                          ? "#3b82f6"
                          : "rgb(var(--accent-500))",
                    }}
                  >
                    {partnerName || "..."}
                  </span>
                </span>

                {/* Gender Badge */}
                {gender && (
                  <span
                    className="text-[10px] sm:text-xs font-medium uppercase tracking-wide px-2 py-[2px] rounded"
                    style={{
                      background:
                        gender === "Female"
                          ? "rgba(219,39,119,0.15)"
                          : "rgba(59,130,246,0.15)",
                      color: gender === "Female" ? "#db2777" : "#3b82f6",
                    }}
                  >
                    {gender}
                  </span>
                )}

                {/* Location */}
                {location && (
                  <span
                    className="text-[11px] sm:text-xs"
                    style={{ color: "rgb(var(--muted))" }}
                  >
                    📍 {location}
                  </span>
                )}
              </>
            )}
          </div>

          {/* RIGHT SIDE: Controls */}
          <div className="flex flex-wrap justify-end items-center gap-2 sm:gap-3 text-xs sm:text-sm">
            {/* Timer */}
            {!showHistory && (
              <span
                className="flex items-center gap-1 border rounded px-2 py-[2px] sm:py-1"
                style={{
                  background: "rgba(var(--bg),0.45)",
                  borderColor: "rgb(var(--border))",
                  color: "rgb(var(--text))",
                }}
              >
                <FontAwesomeIcon
                  icon={faClock}
                  className="text-[10px] sm:text-xs"
                />
                <span className="font-medium">
                  {formatHMS(sessionElapsedMs)}
                </span>
              </span>
            )}

            {/* History Toggle */}
            <button
              onClick={() => setShowHistory((v) => !v)}
              className="flex items-center gap-1 px-2 py-1 rounded border sm:border-0 sm:btn-ghost text-xs sm:text-sm"
              style={{
                color: "rgb(var(--text))",
                borderColor: "rgb(var(--border))",
              }}
            >
              <FontAwesomeIcon icon={faHistory} />
              {showHistory ? "Hide" : "History"}
            </button>

            {/* Action Buttons */}
            {!showHistory && (
              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  onClick={() => {
                    saveChatHistory();
                    onNext();
                  }}
                  className="px-3 py-1 sm:px-4 sm:py-1 text-xs sm:text-sm rounded bg-[rgb(var(--accent-500))] text-black font-semibold hover:scale-105 transition"
                >
                  <FontAwesomeIcon icon={faArrowRightRotate} className="mr-1" />
                  Next
                </button>
                <button
                  onClick={() => {
                    saveChatHistory();
                    onEnd();
                  }}
                  className="px-3 py-1 sm:px-4 sm:py-1 text-xs sm:text-sm border border-[rgb(var(--border))] rounded text-[rgb(var(--text))] hover:bg-[rgba(var(--bg),0.3)] transition"
                >
                  <FontAwesomeIcon icon={faStop} className="mr-1" />
                  End
                </button>
              </div>
            )}
          </div>
        </div>

        {/* History View */}
        {showHistory ? (
          <div
            className="flex-1 overflow-y-auto px-4 py-4 space-y-3 custom-scrollbar"
            style={{ background: "rgba(var(--bg),0.3)" }}
          >
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold flex items-center">
                <FontAwesomeIcon
                  icon={faHistory}
                  className="mr-2 text-[rgb(var(--accent-500))]"
                />
                Chat History
              </h3>
              {localHistory.length > 0 && (
                <button
                  onClick={() => {
                    sessionStorage.removeItem("chatHistory");
                    setLocalHistory([]);
                  }}
                  className="text-xs font-medium px-3 py-1 border rounded flex items-center gap-2 hover:scale-105 transition"
                  style={{
                    background: "rgba(var(--bg),0.5)",
                    borderColor: "rgb(var(--border))",
                    color: "rgb(var(--text))",
                  }}
                >
                  <FontAwesomeIcon
                    icon={faTrash}
                    className="text-[rgb(var(--accent-500))]"
                  />
                  <span>Clear All</span>
                </button>
              )}
            </div>

            {localHistory?.length === 0 ? (
              <p
                className="text-center italic py-6"
                style={{ color: "rgb(var(--muted))" }}
              >
                No previous chats yet.
              </p>
            ) : (
              localHistory.map((h, i) => (
                <div
                  key={i}
                  className="rounded-xl border px-4 py-3 hover:scale-[1.02] transition"
                  style={{
                    borderColor: "rgb(var(--border))",
                    background: "rgba(var(--surface),0.9)",
                  }}
                >
                  <div className="flex justify-between">
                    <span
                      style={{
                        color:
                          h.gender === "Female"
                            ? "#db2777"
                            : h.gender === "Male"
                            ? "#3b82f6"
                            : "rgb(var(--accent-500))",
                      }}
                      className="font-medium"
                    >
                      {h.partnerName} ({h.gender})
                    </span>
                    <span
                      className="text-xs"
                      style={{ color: "rgb(var(--muted))" }}
                    >
                      {Math.floor(h.durationMs / 60000)}m{" "}
                      {Math.floor((h.durationMs % 60000) / 1000)}s
                    </span>
                  </div>
                  <p
                    className="text-xs mt-1"
                    style={{ color: "rgb(var(--muted))" }}
                  >
                    📍 {h.location} <br />
                    {new Date(h.endedAt).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        ) : (
          <div
            className="flex-1 overflow-y-auto px-4 py-48 space-y-4 custom-scrollbar"
            style={{ maxHeight: "calc(100vh - 320px)" }}
          >
            {messages.length === 0 ? (
              <p
                className="text-center italic mt-10"
                style={{ color: "rgb(var(--muted))" }}
              >
                Say hi to {partnerName || "your partner"} 👋
              </p>
            ) : (
              messages.map((m, i) => {
                const mine = m.from === "me";
                const timeMs = getMsgTimestamp(m);
                const prev = i > 0 ? getMsgTimestamp(messages[i - 1]) : null;
                const showDay = !prev || !sameDay(timeMs, prev);

                return (
                  <Fragment key={i}>
                    {showDay && (
                      <div className="text-center text-[10px] text-[rgb(var(--muted))] my-2">
                        {humanDayLabel(timeMs)}
                      </div>
                    )}

                    <div
                      className={`flex ${
                        mine ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`group max-w-[88%] sm:max-w-[80%] rounded-2xl border text-sm sm:text-base ${
                          m.type === "image" || m.type === "video"
                            ? "border-none p-0"
                            : ""
                        }`}
                        style={{
                          background:
                            m.type === "image" || m.type === "video"
                              ? "transparent"
                              : mine
                              ? "rgb(var(--accent-500))"
                              : "rgba(var(--bg),0.6)",
                          color: mine ? "#111" : "rgb(var(--text))",
                          borderColor:
                            m.type === "image" || m.type === "video"
                              ? "transparent"
                              : mine
                              ? "rgb(var(--accent-600))"
                              : "rgb(var(--border))",
                        }}
                      >
                        <div className="px-3 py-1 space-y-1">
                          {m.type === "image" && (
                            <img
                              src={m.data}
                              alt={m.name}
                              onClick={() => setPreviewFile(m)}
                              className="max-w-[150px] sm:max-w-[200px] rounded-lg cursor-pointer hover:scale-105 transition"
                              style={{ display: "block", objectFit: "cover" }}
                            />
                          )}

                          {m.type === "video" && (
                            <video
                              src={m.data}
                              muted
                              onClick={() => setPreviewFile(m)}
                              className="max-w-[180px] sm:max-w-[240px] rounded-lg cursor-pointer hover:scale-105 transition"
                              style={{ display: "block", objectFit: "cover" }}
                            />
                          )}

                          {m.type === "audio" && (
                            <div
                              className="flex items-center gap-3 px-3 py-2 rounded-lg border w-[170px] sm:w-[220px]"
                              style={{
                                background: mine
                                  ? "rgba(255,255,255,0.25)"
                                  : "rgba(var(--bg),0.5)",
                                borderColor: mine
                                  ? "rgba(255,255,255,0.35)"
                                  : "rgb(var(--border))",
                              }}
                            >
                              <button
                                onClick={() =>
                                  playEnhancedAudio(m.data, m.id || i)
                                }
                                className="p-2 rounded-full flex items-center justify-center"
                                style={{
                                  background: mine
                                    ? "rgba(255,255,255,0.7)"
                                    : "rgb(var(--accent-500))",
                                  color: mine ? "rgb(24,24,24)" : "#111",
                                }}
                              >
                                <FontAwesomeIcon
                                  icon={
                                    playingAudio?.msgId === (m.id || i)
                                      ? faPause
                                      : faPlay
                                  }
                                />
                              </button>

                              <div className="flex-1 flex items-center gap-[2px] h-[20px] relative">
                                {[...Array(20)].map((_, j) => (
                                  <div
                                    key={j}
                                    className={`w-[2px] rounded-full ${
                                      mine
                                        ? "bg-[rgba(255,255,255,0.9)]"
                                        : "bg-[rgb(var(--accent-500))]"
                                    } ${
                                      playingAudio?.msgId === (m.id || i)
                                        ? "animate-wave"
                                        : "paused-wave"
                                    }`}
                                    style={{
                                      height: `${6 + Math.random() * 14}px`,
                                      animationDelay: `${j * 0.05}s`,
                                    }}
                                  />
                                ))}
                              </div>

                              <AudioDuration src={m.data} />
                            </div>
                          )}

                          {m.text && (
                            <span className="whitespace-pre-wrap break-words block">
                              {m.text}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Fragment>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Input */}
        {!showHistory && (
          <form
            onSubmit={handleSend}
            className="flex items-center gap-2 p-3 border-t"
            style={{
              borderColor: "rgb(var(--border))",
              background: "rgba(var(--surface),0.85)",
            }}
          >
            <button
              type="button"
              className="btn-ghost"
              onClick={() => fileInputRef.current.click()}
            >
              <FontAwesomeIcon icon={faPaperclip} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*,audio/*"
              onChange={handleFileChange}
              hidden
            />
            <input
              type="text"
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              placeholder="Type a message…"
              className="input flex-1"
              style={{
                background: "rgba(var(--bg),0.4)",
                color: "rgb(var(--text))",
                border: "1px solid rgb(var(--border))",
              }}
            />
            <button
              type="submit"
              disabled={!msg.trim()}
              className={`btn flex items-center gap-2 ${
                !msg.trim()
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:scale-105"
              }`}
            >
              Send
            </button>
          </form>
        )}
      </div>

      {/* Preview */}
      {previewFile && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: "rgba(0,0,0,0.9)" }}
        >
          <button
            onClick={closePreview}
            className="absolute top-4 right-4 text-3xl text-white"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
          <div className="max-w-4xl max-h-[90vh] overflow-auto">
            {previewFile.type === "image" && (
              <img
                src={previewFile.data}
                alt={previewFile.name}
                className="max-w-full max-h-[90vh] rounded-lg"
              />
            )}
            {previewFile.type === "video" && (
              <video
                controls
                src={previewFile.data}
                className="max-w-full max-h-[90vh] rounded-lg"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
