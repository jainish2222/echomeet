import React, { useState } from "react";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faComments } from "@fortawesome/free-solid-svg-icons";

export default function NamePrompt({ onSubmit }) {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  const isValidName = (name) => /^[A-Za-z ]{3,}$/.test(name.trim());

  const handleChange = (e) => {
    const value = e.target.value;
    setInput(value);

    if (!value.trim()) {
      setError("");
    } else if (!/^[A-Za-z ]+$/.test(value)) {
      setError("Only letters and spaces are allowed.");
    } else if (value.trim().length < 3) {
      setError("Name must be at least 3 letters long.");
    } else {
      setError("");
    }
  };

  const handleSubmit = () => {
    if (isValidName(input)) onSubmit(input.trim());
  };

  // Animation variants
  const container = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.12 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="text-center max-w-md w-full"
      >
        {/* Animated Title */}
        <motion.h1
          variants={container}
          initial="hidden"
          animate="visible"
          className="text-4xl sm:text-5xl font-extrabold mb-5 tracking-tight leading-tight"
        >
          {["Welcome", "to", "EchoMeet"].map((word, index) => (
            <motion.span
              key={index}
              variants={item}
              className={
                word === "EchoMeet"
                  ? "text-[rgb(var(--accent-500))] drop-shadow-sm flex items-center justify-center gap-2"
                  : "inline-block mx-1"
              }
            >
              {word === "EchoMeet" ? (
                <>
                  EchoMeet{" "}
                  <FontAwesomeIcon
                    icon={faComments}
                    className="text-[rgb(var(--accent-500))]"
                  />
                </>
              ) : (
                word
              )}
            </motion.span>
          ))}
        </motion.h1>

        {/* Tagline */}
        <p className="text-gray-400 mb-8 text-sm sm:text-base font-light">
          The most{" "}
          <span className="text-[rgb(var(--accent-500))] font-medium">
            secure
          </span>
          ,{" "}
          <span className="text-[rgb(var(--accent-500))] font-medium">
            anonymous
          </span>
          , and{" "}
          <span className="text-[rgb(var(--accent-500))] font-medium">
            simplest
          </span>{" "}
          way to connect instantly with people around the world.
        </p>

        {/* Input Area */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <input
            type="text"
            value={input}
            onChange={handleChange}
            placeholder="Enter your name…"
            className={`input w-64 text-center sm:text-left ${
              error ? "border-red-500 focus:ring-red-500" : ""
            }`}
            onKeyDown={(e) =>
              e.key === "Enter" && isValidName(input) && handleSubmit()
            }
          />
          <button
            onClick={handleSubmit}
            disabled={!isValidName(input)}
            className={`btn w-40 sm:w-auto whitespace-nowrap transition-all duration-200 flex items-center justify-center gap-2 ${
              !isValidName(input)
                ? "opacity-50 cursor-not-allowed"
                : "hover:scale-105"
            }`}
          >
            Start Chatting
          </button>
        </div>

        {/* Validation message */}
        {error && (
          <p className="text-red-400 text-xs mt-3 font-medium">{error}</p>
        )}

        {/* Footer */}
        <p className="text-gray-500 text-xs mt-6">
          No signup · No tracking · Just real conversations
        </p>
      </motion.div>
    </div>
  );
}
