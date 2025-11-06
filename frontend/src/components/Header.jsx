import React, { useEffect, useState } from "react";
import { useTheme } from "../theme/ThemeProvider.jsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGlobeAmericas,
  faCircleHalfStroke,
} from "@fortawesome/free-solid-svg-icons";

export default function Header({ appName }) {
  const [location, setLocation] = useState("Fetching location…");
  const { theme, setTheme, THEMES } = useTheme();

  // Reverse geocode: coordinates -> readable location
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
    } catch (err) {
      console.error("Reverse geocoding error:", err);
      return "Unable to fetch location";
    }
  };

  // 🧭 Fetch user's location when header mounts
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocation("Geolocation not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const loc = await fetchLocationFromCoords(latitude, longitude);
        setLocation(loc);
      },
      (err) => {
        console.error("Geolocation error:", err);
        setLocation("Location access denied");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []); // Run once on mount

  return (
    <header className="fixed top-0 left-0 w-full bg-black/50 backdrop-blur-lg border-b border-gray-800 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
        {/* Brand */}
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="h-8 w-8 rounded-xl"
            style={{ background: "rgb(var(--accent-500))" }}
          />
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight truncate">
            {appName}
          </h1>
          <span className="hidden sm:inline text-xs sm:text-sm text-gray-400 ml-2">
            Anonymous Video Chat
          </span>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Location */}
        <div className="hidden sm:flex items-center gap-2 text-sm text-gray-300 mr-2">
          <FontAwesomeIcon icon={faGlobeAmericas} className="text-accent-500" />
          <span className="truncate max-w-[180px]">{location}</span>
        </div>

        {/* Theme picker */}
        <div className="flex items-center gap-2">
          {THEMES.map((t) => (
            <button
              key={t}
              aria-label={`Switch theme to ${t}`}
              onClick={() => setTheme(t)}
              className={`h-7 w-7 rounded-full border transition focus:outline-none focus:ring-2`}
              style={{
                borderColor:
                  theme === t ? "rgb(var(--accent-600))" : "rgb(55 65 81)",
                boxShadow:
                  theme === t
                    ? "0 0 0 2px rgba(255,255,255,0.15)"
                    : "none",
                background:
                  t === "lime"
                    ? "rgb(132 204 22)"
                    : t === "rose"
                    ? "rgb(244 63 94)"
                    : t === "orange"
                    ? "rgb(249 115 22)"
                    : "rgb(168 85 247)",
              }}
              title={t}
            />
          ))}  
        </div>
      </div>
    </header>
  );
}
