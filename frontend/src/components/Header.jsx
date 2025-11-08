import React from "react";
import { useTheme } from "../theme/ThemeProvider.jsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGlobeAmericas,
  faPalette,
  faTimes,
  faLocationCrosshairs,
} from "@fortawesome/free-solid-svg-icons";

export default function Header({ appName, location, onRefreshLocation }) {
  const [showThemeModal, setShowThemeModal] = React.useState(false);
  const { bg, setBg, accent, setAccent, THEMES, BGTHEMES } = useTheme();

  /* ---------------- SWATCH HELPERS ---------------- */
  const accentSwatch = (t) =>
    t === "azure"
      ? "59 130 246"
      : t === "indigo"
      ? "99 102 241"
      : t === "emerald"
      ? "16 185 129"
      : "236 72 153"; // rose

  const bgSwatch = (t) =>
    t === "dark"
      ? "13 17 23"
      : t === "light"
      ? "250 250 250"
      : t === "neutral"
      ? "245 245 245"
      : "10 10 10"; // black

  return (
    <>
      <header
        className="fixed top-0 left-0 w-full backdrop-blur-lg z-50 border-b"
        style={{
          background: "rgba(var(--bg),0.55)",
          borderColor: "rgb(var(--border))",
        }}
      >
        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex items-center gap-3">
          {/* Brand */}
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="h-8 w-8 rounded-xl"
              style={{ background: "rgb(var(--accent-500))" }}
            />
            <h1 className="text-lg sm:text-xl font-extrabold tracking-tight truncate">
              {appName}
            </h1>
            <span
              className="hidden sm:inline text-xs sm:text-sm ml-2 truncate"
              style={{ color: "rgb(var(--muted))" }}
            >
              Anonymous Video Chat
            </span>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Location */}
          <div
            className="flex items-center gap-2 text-sm mr-2 truncate cursor-pointer"
            style={{ color: "rgb(var(--text))" }}
            onClick={onRefreshLocation}
            title="Click to update location"
          >
            <FontAwesomeIcon
              icon={faGlobeAmericas}
              style={{ color: "rgb(var(--accent-500))" }}
            />
            <span className="truncate max-w-[180px]">{location}</span>
            <FontAwesomeIcon
              icon={faLocationCrosshairs}
              className="sm:hidden text-[rgb(var(--accent-500))]"
            />
          </div>

          {/* Theme Button */}
          <button
            onClick={() => setShowThemeModal(true)}
            className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg border transition hover:scale-105"
            style={{
              borderColor: "rgb(var(--border))",
              background: "rgba(var(--surface),0.7)",
              color: "rgb(var(--text))",
            }}
          >
            <FontAwesomeIcon
              icon={faPalette}
              className="text-[rgb(var(--accent-500))]"
            />
            Theme
          </button>
        </div>
      </header>

      {/* ---------------- THEME MODAL ---------------- */}
      {showThemeModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: "rgba(0,0,0,0.7)" }}
        >
          <div
            className="w-full max-w-sm sm:max-w-md rounded-2xl shadow-xl border p-5 relative"
            style={{
              background: "rgb(var(--surface))",
              borderColor: "rgb(var(--border))",
              color: "rgb(var(--text))",
            }}
          >
            <button
              onClick={() => setShowThemeModal(false)}
              className="absolute top-3 right-3 text-lg"
              style={{ color: "rgb(var(--muted))" }}
              aria-label="Close"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>

            <h2 className="text-lg font-semibold mb-4">Choose Your Theme</h2>

            <div className="space-y-5">
              <div>
                <h3 className="text-sm mb-2 font-medium opacity-80">
                  Background
                </h3>
                <div className="flex items-center gap-3 flex-wrap">
                  {BGTHEMES.map((t) => (
                    <button
                      key={t}
                      onClick={() => setBg(t)}
                      className={`h-10 w-10 rounded-full border-2 transition ${
                        bg === t ? "ring-2 ring-[rgb(var(--accent-500))]" : ""
                      }`}
                      style={{
                        background: `rgb(${bgSwatch(t)})`,
                        borderColor:
                          bg === t
                            ? "rgb(var(--accent-600))"
                            : "rgb(var(--border))",
                      }}
                      title={t}
                    />
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm mb-2 font-medium opacity-80">
                  Accent Color
                </h3>
                <div className="flex items-center gap-3 flex-wrap">
                  {THEMES.map((t) => (
                    <button
                      key={t}
                      onClick={() => setAccent(t)}
                      className={`h-10 w-10 rounded-full border-2 transition ${
                        accent === t ? "ring-2 ring-[rgb(var(--accent-500))]" : ""
                      }`}
                      style={{
                        background: `rgb(${accentSwatch(t)})`,
                        borderColor:
                          accent === t
                            ? "rgb(var(--accent-600))"
                            : "rgb(var(--border))",
                      }}
                      title={t}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 text-center">
              <button
                onClick={() => setShowThemeModal(false)}
                className="px-5 py-2 rounded-lg font-medium text-sm transition"
                style={{
                  background: "rgb(var(--accent-500))",
                  color: "#111",
                }}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
