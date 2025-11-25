"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, Search, Loader2 } from "lucide-react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";

interface AISearchBarProps {
  onSearch: (query: string, aiFilters?: any, intent?: string) => void;
  initialValue?: string;
}

export function AISearchBar({ onSearch, initialValue = "" }: AISearchBarProps) {
  const [query, setQuery] = useState(initialValue);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const recognitionRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const parseQuery = useAction(api.ai.parseSearchQuery);

  useEffect(() => {
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

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const handleVoiceSearch = () => {
    if (recognitionRef.current) {
      if (isListening) {
        recognitionRef.current.stop();
        setIsListening(false);
      } else {
        recognitionRef.current.start();
        setIsListening(true);
      }
    }
  };

  const handleSearch = async (searchQuery: string) => {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) return;

    setIsProcessing(true);
    try {
      const result = await parseQuery({ query: trimmedQuery });

      if (result.success && result.result) {
        onSearch(trimmedQuery, result.result.filters, result.result.intent);
      } else {
        onSearch(trimmedQuery);
      }
    } catch (error) {
      onSearch(trimmedQuery);
    } finally {
      setIsProcessing(false);
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
          alignItems: "center",
          gap: 8,
          background: "var(--bg-secondary)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border-light)",
          padding: "6px 6px 6px 16px",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <Search size={18} color="var(--text-tertiary)" style={{ flexShrink: 0 }} />

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for cafes, restaurants, or describe what you want..."
          disabled={isProcessing}
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            fontSize: 15,
            padding: "10px 0",
            background: "transparent",
            color: "var(--text-primary)",
            minWidth: 0,
          }}
        />

        {/* Voice Button */}
        <button
          type="button"
          onClick={handleVoiceSearch}
          disabled={isProcessing}
          style={{
            padding: 10,
            borderRadius: "var(--radius-md)",
            background: isListening ? "var(--error)" : "var(--bg-tertiary)",
            color: isListening ? "white" : "var(--text-secondary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
          aria-label="Voice search"
        >
          <Mic size={18} />
        </button>

        {/* Search Button */}
        <button
          type="submit"
          disabled={isProcessing || !query.trim()}
          className="btn btn-primary"
          style={{
            padding: "10px 16px",
            opacity: isProcessing || !query.trim() ? 0.6 : 1,
            flexShrink: 0,
          }}
        >
          {isProcessing ? <Loader2 size={18} className="animate-spin" /> : "Search"}
        </button>
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </form>
  );
}
