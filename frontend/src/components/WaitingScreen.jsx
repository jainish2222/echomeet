import React from "react";
import { motion } from "framer-motion";

export default function WaitingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, repeat: Infinity, repeatType: "reverse" }}
        className="text-center"
      >
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">
          <span className="text-[rgb(var(--accent-500))]">Searching</span> for a partner…
        </h1>
        <p className="text-gray-400">Please wait, this may take a few seconds</p>
      </motion.div>
    </div>
  );
}
