"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, Search, Sparkles, Loader2 } from "lucide-react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";

interface AISearchBarProps {
  onSearch: (query: string, aiFilters?: any, intent?: string) => void;
  initialValue?: string;
  useAI?: boolean;
}

export function AISearchBar({
  onSearch,
  initialValue = "",
  useAI = true,
}: AISearchBarProps) {
  const [query, setQuery] = useState(initialValue);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const recognitionRef = useRef<any>(null);

  const parseQuery = useAction(api.ai.parseSearchQuery);

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
        handleSearch(transcript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);

        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          alert("Microphone access denied. Please allow microphone access in your browser settings.");
        }
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

  const handleSearch = async (searchQuery: string) => {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) return;

    if (useAI) {
      setIsProcessing(true);
      try {
        const result = await parseQuery({
          query: trimmedQuery,
        });

        if (result.success && result.result) {
          onSearch(
            trimmedQuery,
            result.result.filters,
            result.result.intent
          );
        } else {
          // Fallback to regular search
          onSearch(trimmedQuery);
        }
      } catch (error) {
        console.error("AI parsing error:", error);
        onSearch(trimmedQuery);
      } finally {
        setIsProcessing(false);
      }
    } else {
      onSearch(trimmedQuery);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(query);
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
          position: "relative",
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
          disabled={isProcessing}
        >
          <Mic size={24} style={{ animation: isListening ? "pulse 1.5s infinite" : "none" }} />
        </button>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            useAI
              ? "Tell me what you're looking for..."
              : "E.g., Family-friendly cafe near Metro..."
          }
          disabled={isProcessing}
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            fontSize: "16px",
            padding: "12px",
          }}
        />

        {useAI && (
          <div
            style={{
              position: "absolute",
              right: "80px",
              top: "50%",
              transform: "translateY(-50%)",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              color: "#667eea",
              fontSize: "12px",
              fontWeight: "600",
              padding: "4px 8px",
              background: "#e0e7ff",
              borderRadius: "8px",
            }}
          >
            <Sparkles size={14} />
            AI
          </div>
        )}

        <button
          type="submit"
          disabled={isProcessing}
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
            opacity: isProcessing ? 0.7 : 1,
          }}
        >
          {isProcessing ? (
            <>
              <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
              Processing...
            </>
          ) : (
            <>
              <Search size={20} />
              Search
            </>
          )}
        </button>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </form>
  );
}
