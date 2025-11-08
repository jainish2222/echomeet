import React from "react";
import { motion } from "framer-motion";

export default function WaitingScreen() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 text-center"
      style={{ background: "rgb(var(--bg))", color: "rgb(var(--text))" }}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, repeat: Infinity, repeatType: "reverse" }}
      >
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">
          <span className="text-[rgb(var(--accent-500))]">Searching</span> for a partner…
        </h1>
        <p className="text-sm sm:text-base" style={{ color: "rgb(var(--muted))" }}>
          Please wait, this may take a few seconds
        </p>
      </motion.div>
    </div>
  );
}
