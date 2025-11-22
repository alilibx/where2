"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Trash2, Sparkles, Mic, MicOff } from "lucide-react";
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
  const isListeningRef = useRef(false); // Track listening state for closures
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const conversation = useQuery(api.conversations.getConversation, { userId });
  const addMessage = useMutation(api.conversations.addMessage);
  const clearConversation = useMutation(api.conversations.clearConversation);
  const parseQuery = useAction(api.ai.parseSearchQuery);
  const chatWithAI = useAction(api.ai.chatWithAI);

  const messages = conversation?.messages || [];

  // Initialize Web Speech API
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognitionInstance = new SpeechRecognition();
        recognitionInstance.continuous = true; // Keep listening until manually stopped
        recognitionInstance.interimResults = true;
        recognitionInstance.lang = "en-US";
        recognitionInstance.maxAlternatives = 1;

        recognitionInstance.onresult = (event: any) => {
          let transcript = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          setInput(transcript);
        };

        recognitionInstance.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);

          // Handle specific errors
          if (event.error === 'no-speech') {
            // Don't stop for no-speech in continuous mode - just log it
            console.log("No speech detected, continuing to listen...");
            return;
          } else if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            setIsListening(false);
            alert("Microphone access denied. Please allow microphone access in your browser settings.");
          } else if (event.error === 'aborted') {
            // User manually stopped, don't restart
            setIsListening(false);
          } else {
            // Other errors - try to continue
            console.log("Recognition error, attempting to continue:", event.error);
          }
        };

        recognitionInstance.onend = () => {
          // Auto-restart if user hasn't manually stopped
          console.log("Recognition ended, checking if should restart...");

          // Check ref instead of state to avoid closure issues
          setTimeout(() => {
            if (isListeningRef.current) {
              try {
                console.log("Restarting recognition...");
                recognitionInstance.start();
              } catch (error) {
                console.error("Failed to restart recognition:", error);
                setIsListening(false);
                isListeningRef.current = false;
              }
            }
          }, 100);
        };

        recognitionInstance.onstart = () => {
          console.log("Speech recognition started");
        };

        setRecognition(recognitionInstance);
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
      // Add user message to conversation
      await addMessage({
        userId,
        role: "user",
        content: userMessage,
      });

      // Parse the query with AI
      const parseResult = await parseQuery({
        query: userMessage,
        conversationHistory: messages.slice(-6).map((m) => ({
          role: m.role,
          content: m.content,
        })),
      });

      if (parseResult.success && parseResult.result) {
        const { intent, filters, clarifyingQuestions, confidence } =
          parseResult.result;

        // If confidence is high, trigger search
        if (confidence >= 0.7) {
          // Add assistant message
          const responseText = `Got it! Looking for ${intent}...`;
          await addMessage({
            userId,
            role: "assistant",
            content: responseText,
            filters,
          });

          // Trigger the search in parent component
          onSearchTriggered(filters, intent);
        } else if (clarifyingQuestions.length > 0) {
          // Ask clarifying questions
          const questionsText = clarifyingQuestions.join(" ");
          await addMessage({
            userId,
            role: "assistant",
            content: questionsText,
          });
        } else {
          // Low confidence but no questions - proceed with best guess
          await addMessage({
            userId,
            role: "assistant",
            content: `Let me search for ${intent}...`,
            filters,
          });
          onSearchTriggered(filters, intent);
        }
      } else {
        // Fallback to general chat
        const chatResult = await chatWithAI({
          messages: [
            ...messages.slice(-6).map((m) => ({
              role: m.role,
              content: m.content,
            })),
            { role: "user", content: userMessage },
          ],
        });

        await addMessage({
          userId,
          role: "assistant",
          content: chatResult.message,
        });
      }
    } catch (error) {
      console.error("Error processing message:", error);
      await addMessage({
        userId,
        role: "assistant",
        content: "Sorry, I had trouble processing that. Could you rephrase?",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClear = async () => {
    if (confirm("Clear conversation history?")) {
      await clearConversation({ userId });
    }
  };

  const toggleVoiceInput = () => {
    if (!recognition) {
      alert("Voice input is not supported in your browser. Please use Chrome or Edge.");
      return;
    }

    if (isListening) {
      try {
        isListeningRef.current = false; // Set ref first to prevent restart
        recognition.stop();
      } catch (error) {
        console.error("Error stopping recognition:", error);
      }
      setIsListening(false);
    } else {
      try {
        setInput(""); // Clear input before starting
        isListeningRef.current = true; // Set ref before starting
        recognition.start();
        setIsListening(true);
      } catch (error) {
        console.error("Error starting recognition:", error);
        setIsListening(false);
        isListeningRef.current = false;
        alert("Failed to start voice input. Please try again.");
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
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
        height: "600px",
        background: "white",
        borderRadius: "16px",
        overflow: "hidden",
        boxShadow: "0 4px 24px rgba(0,0,0,0.1)",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "20px",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Sparkles size={24} />
          <h3 style={{ fontSize: "18px", fontWeight: "600" }}>Chat with Where2</h3>
        </div>
        <button
          onClick={handleClear}
          style={{
            padding: "8px",
            borderRadius: "8px",
            background: "rgba(255,255,255,0.2)",
            color: "white",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
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
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        {messages.length === 0 && (
          <div
            style={{
              textAlign: "center",
              color: "#666",
              padding: "40px 20px",
            }}
          >
            <Sparkles
              size={48}
              style={{ margin: "0 auto 16px", color: "#667eea" }}
            />
            <p style={{ fontSize: "18px", marginBottom: "8px", fontWeight: "600" }}>
              Hi! I'm your Dubai guide
            </p>
            <p style={{ fontSize: "14px" }}>
              Tell me what you're looking for and I'll help you find the perfect spot!
            </p>
            <div
              style={{
                marginTop: "24px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                fontSize: "13px",
              }}
            >
              <p style={{ fontWeight: "600" }}>Try asking:</p>
              <p style={{ fontStyle: "italic" }}>
                "Find me a family cafe with outdoor seating"
              </p>
              <p style={{ fontStyle: "italic" }}>
                "I want waterfront dinner tonight"
              </p>
              <p style={{ fontStyle: "italic" }}>"Cheap breakfast near Marina"</p>
            </div>
          </div>
        )}

        {messages.map((message, idx) => (
          <div
            key={idx}
            style={{
              display: "flex",
              justifyContent:
                message.role === "user" ? "flex-end" : "flex-start",
            }}
          >
            <div
              style={{
                maxWidth: "70%",
                padding: "12px 16px",
                borderRadius: "12px",
                background:
                  message.role === "user"
                    ? "#667eea"
                    : "#f3f4f6",
                color: message.role === "user" ? "white" : "#333",
                fontSize: "15px",
                lineHeight: "1.5",
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
                padding: "12px 16px",
                borderRadius: "12px",
                background: "#f3f4f6",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <Loader2
                size={16}
                style={{ animation: "spin 1s linear infinite" }}
              />
              <span style={{ fontSize: "14px", color: "#666" }}>
                Thinking...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div
        style={{
          padding: "16px",
          borderTop: "1px solid #e5e7eb",
          background: "#fafafa",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "12px",
            alignItems: "flex-end",
          }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isListening ? "Listening..." : "Ask me anything about Dubai venues..."}
            disabled={isProcessing || isListening}
            rows={2}
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: "12px",
              border: `2px solid ${isListening ? "#667eea" : "#e5e7eb"}`,
              outline: "none",
              fontSize: "15px",
              resize: "none",
              fontFamily: "inherit",
              background: isListening ? "#f0f4ff" : "white",
            }}
          />
          <button
            onClick={toggleVoiceInput}
            disabled={isProcessing}
            className="btn"
            style={{
              minWidth: "48px",
              height: "48px",
              padding: "12px",
              background: isListening ? "#ef4444" : "#667eea",
              color: "white",
              borderRadius: "12px",
              border: "none",
              cursor: isProcessing ? "not-allowed" : "pointer",
              opacity: isProcessing ? 0.5 : 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title={isListening ? "Stop recording" : "Start voice input"}
          >
            {isListening ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
          <button
            onClick={handleSend}
            disabled={!input.trim() || isProcessing}
            className="btn btn-primary"
            style={{
              minWidth: "48px",
              height: "48px",
              padding: "12px",
              opacity: !input.trim() || isProcessing ? 0.5 : 1,
            }}
          >
            <Send size={20} />
          </button>
        </div>
        <p
          style={{
            fontSize: "12px",
            color: "#999",
            marginTop: "8px",
            textAlign: "center",
          }}
        >
          Press Enter to send • Shift+Enter for new line • Click mic for voice input
        </p>
      </div>

      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
