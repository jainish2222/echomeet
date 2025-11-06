import React, { useState, useRef, useEffect, Fragment } from "react";
import VideoBox from "./VideoBox";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faClock,
  faRobot,
  faComments,
  faHistory,
  faArrowRightRotate,
  faStop,
} from "@fortawesome/free-solid-svg-icons";

export default function ChatBox({
  name,
  partnerName,
  messages,
  onSend,
  onNext,
  onEnd,
  history,
  roomId,
  localStream,
  remoteStream,
  videoActive,
  onStartVideo,
  onStopVideo,
  botWorking = false,
  sessionStartAt,
}) {
  const [msg, setMsg] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  // ---------- Auto-scroll ----------
  const messagesEndRef = useRef(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ---------- Session timer ----------
  const [sessionElapsedMs, setSessionElapsedMs] = useState(0);
  const sessionStart = sessionStartAt
    ? new Date(sessionStartAt).getTime()
    : Date.now();

  useEffect(() => {
    const base = sessionStart;
    const tick = () => setSessionElapsedMs(Date.now() - base);
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStartAt]);

  // ---------- Bot timer ----------
  const [botStartMs, setBotStartMs] = useState(null);
  const [botElapsedMs, setBotElapsedMs] = useState(0);

  useEffect(() => {
    let id;
    if (botWorking) {
      const start = botStartMs ?? Date.now();
      setBotStartMs(start);
      const tick = () => setBotElapsedMs(Date.now() - start);
      tick();
      id = setInterval(tick, 250);
    } else {
      setBotStartMs(null);
      setBotElapsedMs(0);
    }
    return () => id && clearInterval(id);
  }, [botWorking, botStartMs]);

  // ---------- Helpers ----------
  const formatHMS = (ms) => {
    const total = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const two = (n) => String(n).padStart(2, "0");
    return h > 0 ? `${h}:${two(m)}:${two(s)}` : `${two(m)}:${two(s)}`;
  };

  const getMsgTimestamp = (m) => {
    const candidate =
      m?.timestamp ?? m?.ts ?? m?.at ?? m?.createdAt ?? m?.time ?? m?.date;
    if (candidate == null) return Date.now();
    return typeof candidate === "number"
      ? candidate
      : new Date(candidate).getTime();
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

  const handleSend = (e) => {
    e.preventDefault();
    if (!msg.trim()) return;
    onSend(msg);
    setMsg("");
  };

  return (
    <div className="w-full max-w-6xl mx-auto sm:pt-24 flex flex-col lg:flex-row gap-6">
      {/* RIGHT: VIDEO BOX */}
      <div className="w-full lg:w-[29%] bg-black/40 rounded-2xl shadow-lg border border-gray-800 flex flex-col items-center p-4">
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
      <div className="flex-1 flex flex-col bg-black/40 rounded-2xl shadow-lg overflow-hidden border border-gray-800">
        {/* Header */}
        <div className="px-4 py-3 flex flex-wrap gap-2 justify-between items-center border-b border-gray-800">
          <h2 className="text-lg font-semibold truncate">
            Chatting with{" "}
            <span className="text-[rgb(var(--accent-500))]">
              {partnerName || "..."}
            </span>
          </h2>

          <div className="flex items-center gap-3">
            {/* Live session timer */}
            <span className="text-xs px-2 py-1 rounded bg-gray-900/60 border border-gray-800 flex items-center gap-1">
              <FontAwesomeIcon icon={faClock} />
              {formatHMS(sessionElapsedMs)}
            </span>

            <button
              onClick={() => setShowHistory((prev) => !prev)}
              className="btn-ghost flex items-center gap-1"
            >
              <FontAwesomeIcon icon={faHistory} />
              {showHistory ? "Hide History" : "History"}
            </button>

            <button onClick={onNext} className="btn flex items-center gap-1">
              <FontAwesomeIcon icon={faArrowRightRotate} />
              Next
            </button>

            <button
              onClick={onEnd}
              className="btn-ghost flex items-center gap-1"
            >
              <FontAwesomeIcon icon={faStop} />
              End
            </button>
          </div>
        </div>

        {/* Bot Working Banner */}
        {botWorking && (
          <div className="px-4 py-2 text-xs border-b border-gray-800 bg-gray-900/50 flex items-center gap-2">
            <FontAwesomeIcon
              icon={faRobot}
              className="text-[rgb(var(--accent-500))] animate-pulse"
            />
            <span className="text-gray-300">
              Bot working…{" "}
              <span className="font-mono">{formatHMS(botElapsedMs)}</span>
            </span>
          </div>
        )}

        {/* Messages */}
        <div
          className="flex-1 overflow-y-auto scroll-smooth px-4 py-3 space-y-3 custom-scrollbar"
          style={{
            maxHeight: "calc(100vh - 300px)",
          }}
        >
          {messages.length === 0 ? (
            <div className="text-center text-gray-400 mt-10 italic flex items-center justify-center gap-1">
              Say hi to {partnerName || "your partner"}
              <FontAwesomeIcon
                icon={faComments}
                className="text-[rgb(var(--accent-500))]"
              />
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((m, i) => {
                const mine = m.from === "me";
                const timeMs = getMsgTimestamp(m);
                const prev = i > 0 ? getMsgTimestamp(messages[i - 1]) : null;
                const showDay = !prev || !sameDay(timeMs, prev);

                return (
                  <Fragment key={`frag-${i}`}>
                    {showDay && (
                      <div className="flex items-center gap-2 my-2">
                        <div className="h-px bg-gray-800 flex-1" />
                        <span className="text-[10px] text-gray-400 uppercase tracking-wider">
                          {humanDayLabel(timeMs)}
                        </span>
                        <div className="h-px bg-gray-800 flex-1" />
                      </div>
                    )}

                    <div
                      className={`flex ${
                        mine ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`group max-w-[85%] sm:max-w-[80%] rounded-2xl border text-sm sm:text-base ${
                          mine
                            ? "bg-[rgb(var(--accent-500))] text-gray-900 border-[rgb(var(--accent-600))]"
                            : "bg-gray-800/70 text-gray-100 border-gray-700"
                        }`}
                      >
                        <div className="px-3 text-sm py-1 max-h-48 overflow-y-auto leading-relaxed">
                          <span className="whitespace-pre-wrap break-words block">
                            {m.text}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Fragment>
                );
              })}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={handleSend}
          className="flex items-center gap-2 p-3 border-t border-gray-800 bg-black/40 mt-auto"
        >
          <input
            type="text"
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            placeholder="Type a message…"
            className="input flex-1"
          />
          <button
            type="submit"
            disabled={!msg.trim()} // ✅ disable when empty or whitespace only
            className={`btn flex items-center gap-2 transition-all duration-200 ${
              !msg.trim() ? "opacity-50 cursor-not-allowed" : "hover:scale-105"
            }`}
          >
            Send
          </button>
        </form>

        {/* History */}
        {showHistory && (
          <div className="bg-black/40 border-t border-gray-800 p-3 h-48 overflow-y-auto">
            <h3 className="text-md font-semibold mb-3 flex items-center gap-2">
              <FontAwesomeIcon icon={faClock} />
              Recent Chats
              <span className="badge">Total {history.length}</span>
            </h3>

            {history.length === 0 ? (
              <p className="text-gray-400 text-sm italic">
                No previous chats yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {history.map((chat, i) => (
                  <li
                    key={i}
                    className="flex justify-between items-center px-3 py-2 bg-gray-900/60 rounded-lg border border-gray-800 hover:bg-gray-900 transition"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[rgb(var(--accent-500))]">
                        {chat.partnerName}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(chat.endedAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        • {(chat.durationMs / 1000).toFixed(0)} sec
                      </p>
                    </div>
                    <span className="text-xs text-gray-500">
                      #{history.length - i}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
