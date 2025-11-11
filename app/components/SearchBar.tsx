"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, Search } from "lucide-react";

interface SearchBarProps {
  onSearch: (query: string) => void;
  initialValue?: string;
}

export function SearchBar({ onSearch, initialValue = "" }: SearchBarProps) {
  const [query, setQuery] = useState(initialValue);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Initialize speech recognition
    if (typeof window !== "undefined" && "webkitSpeechRecognition" in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = "en-US";

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setQuery(transcript);
        setIsListening(false);
        onSearch(transcript);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, [onSearch]);

  const handleVoiceSearch = () => {
    if (recognitionRef.current) {
      if (isListening) {
        recognitionRef.current.stop();
        setIsListening(false);
      } else {
        recognitionRef.current.start();
        setIsListening(true);
      }
    } else {
      alert("Voice search is not supported in your browser. Please use Chrome or Safari.");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ width: "100%" }}>
      <div
        style={{
          display: "flex",
          gap: "12px",
          background: "white",
          borderRadius: "12px",
          padding: "8px",
          boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
        }}
      >
        <button
          type="button"
          onClick={handleVoiceSearch}
          style={{
            padding: "12px",
            borderRadius: "8px",
            background: isListening ? "#ef4444" : "#667eea",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: "48px",
            transition: "all 0.2s",
          }}
          aria-label="Voice search"
        >
          <Mic size={24} style={{ animation: isListening ? "pulse 1.5s infinite" : "none" }} />
        </button>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="E.g., Family-friendly cafe near Metro with outdoor seating..."
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            fontSize: "16px",
            padding: "12px",
          }}
        />

        <button
          type="submit"
          style={{
            padding: "12px 24px",
            borderRadius: "8px",
            background: "#667eea",
            color: "white",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontWeight: "600",
            transition: "all 0.2s",
          }}
        >
          <Search size={20} />
          Search
        </button>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </form>
  );
}
