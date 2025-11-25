"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Trash2, Mic, MicOff } from "lucide-react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";

interface ChatInterfaceProps {
  userId: string;
  onSearchTriggered: (filters: any, intent: string) => void;
}

export function ChatInterface({ userId, onSearchTriggered }: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const isListeningRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const conversation = useQuery(api.conversations.getConversation, { userId });
  const addMessage = useMutation(api.conversations.addMessage);
  const clearConversation = useMutation(api.conversations.clearConversation);
  const parseQuery = useAction(api.ai.parseSearchQuery);
  const chatWithAI = useAction(api.ai.chatWithAI);

  const messages = conversation?.messages || [];

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = "en-US";

        rec.onresult = (event: any) => {
          let transcript = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          setInput(transcript);
        };

        rec.onerror = (event: any) => {
          if (event.error !== "no-speech") {
            setIsListening(false);
            isListeningRef.current = false;
          }
        };

        rec.onend = () => {
          setTimeout(() => {
            if (isListeningRef.current) {
              try {
                rec.start();
              } catch {
                setIsListening(false);
                isListeningRef.current = false;
              }
            }
          }, 100);
        };

        setRecognition(rec);
      }
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;

    const userMessage = input.trim();
    setInput("");
    setIsProcessing(true);

    try {
      await addMessage({ userId, role: "user", content: userMessage });

      const parseResult = await parseQuery({
        query: userMessage,
        conversationHistory: messages.slice(-6).map((m) => ({
          role: m.role,
          content: m.content,
        })),
      });

      if (parseResult.success && parseResult.result) {
        const { intent, filters, clarifyingQuestions, confidence } = parseResult.result;

        if (confidence >= 0.7) {
          await addMessage({
            userId,
            role: "assistant",
            content: `Looking for ${intent}...`,
            filters,
          });
          onSearchTriggered(filters, intent);
        } else if (clarifyingQuestions.length > 0) {
          await addMessage({
            userId,
            role: "assistant",
            content: clarifyingQuestions.join(" "),
          });
        } else {
          await addMessage({
            userId,
            role: "assistant",
            content: `Searching for ${intent}...`,
            filters,
          });
          onSearchTriggered(filters, intent);
        }
      } else {
        const chatResult = await chatWithAI({
          messages: [
            ...messages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
            { role: "user", content: userMessage },
          ],
        });
        await addMessage({ userId, role: "assistant", content: chatResult.message });
      }
    } catch {
      await addMessage({
        userId,
        role: "assistant",
        content: "Sorry, something went wrong. Could you try again?",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClear = async () => {
    if (confirm("Clear conversation?")) {
      await clearConversation({ userId });
    }
  };

  const toggleVoice = () => {
    if (!recognition) return;

    if (isListening) {
      isListeningRef.current = false;
      recognition.stop();
      setIsListening(false);
    } else {
      setInput("");
      isListeningRef.current = true;
      recognition.start();
      setIsListening(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: 520,
        background: "var(--bg-secondary)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border-light)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "14px 16px",
          borderBottom: "1px solid var(--border-light)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h3 style={{ fontSize: 15, fontWeight: 600 }}>Chat with Where2</h3>
        <button
          onClick={handleClear}
          className="btn btn-ghost btn-icon"
          title="Clear conversation"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {messages.length === 0 && (
          <div style={{ textAlign: "center", color: "var(--text-secondary)", padding: "32px 16px" }}>
            <p style={{ fontSize: 15, fontWeight: 500, marginBottom: 8 }}>Hi! I'm your Dubai guide</p>
            <p style={{ fontSize: 13, marginBottom: 16 }}>Tell me what you're looking for</p>
            <div style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
              <p>"Family cafe with outdoor seating"</p>
              <p>"Waterfront dinner tonight"</p>
              <p>"Budget breakfast near Marina"</p>
            </div>
          </div>
        )}

        {messages.map((message, idx) => (
          <div
            key={idx}
            style={{
              display: "flex",
              justifyContent: message.role === "user" ? "flex-end" : "flex-start",
            }}
          >
            <div
              style={{
                maxWidth: "75%",
                padding: "10px 14px",
                borderRadius: "var(--radius-lg)",
                background: message.role === "user" ? "var(--accent)" : "var(--bg-tertiary)",
                color: message.role === "user" ? "white" : "var(--text-primary)",
                fontSize: 14,
                lineHeight: 1.5,
              }}
            >
              {message.content}
            </div>
          </div>
        ))}

        {isProcessing && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div
              style={{
                padding: "10px 14px",
                borderRadius: "var(--radius-lg)",
                background: "var(--bg-tertiary)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Loader2 size={14} className="animate-spin" />
              <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Thinking...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{ padding: 12, borderTop: "1px solid var(--border-light)" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? "Listening..." : "Type a message..."}
            disabled={isProcessing || isListening}
            rows={1}
            style={{
              flex: 1,
              padding: "10px 14px",
              borderRadius: "var(--radius-md)",
              border: `1px solid ${isListening ? "var(--accent)" : "var(--border-light)"}`,
              outline: "none",
              fontSize: 14,
              resize: "none",
              fontFamily: "inherit",
              background: isListening ? "var(--accent-light)" : "var(--bg-secondary)",
              minHeight: 42,
              maxHeight: 120,
            }}
          />

          <button
            onClick={toggleVoice}
            disabled={isProcessing}
            className="btn btn-icon"
            style={{
              background: isListening ? "var(--error)" : "var(--bg-tertiary)",
              color: isListening ? "white" : "var(--text-secondary)",
              height: 42,
              width: 42,
            }}
            title={isListening ? "Stop" : "Voice input"}
          >
            {isListening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>

          <button
            onClick={handleSend}
            disabled={!input.trim() || isProcessing}
            className="btn btn-primary btn-icon"
            style={{
              height: 42,
              width: 42,
              opacity: !input.trim() || isProcessing ? 0.6 : 1,
            }}
          >
            <Send size={18} />
          </button>
        </div>
        <p style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 8, textAlign: "center" }}>
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
