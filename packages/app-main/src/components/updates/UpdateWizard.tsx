"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { Card, CardContent } from "@/src/components/ui/card";
import { Button } from "@common/components/ui/Button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select";
import { Textarea } from "@/src/components/ui/textarea";
import { ExtractedActivitiesPreview, type ExtractedActivity } from "./ExtractedActivitiesPreview";
import { IconSend, IconLoader2, IconCheck, IconMicrophone, IconPlayerStop, IconRefresh, IconVolume, IconVolumeOff } from "@tabler/icons-react";
import { cn } from "@/src/lib/utils";
import { RotatingBorder } from "@common/components/ui/ShineBorder";
import { toast } from "@common/components/ui/sonner";

type UpdatePeriod = "morning" | "afternoon" | "evening" | "full_day";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface UpdateWizardProps {
  className?: string;
  onDateChange?: (date: string) => void;
  initialSessionId?: string | null;
}

export function UpdateWizard({ className, onDateChange, initialSessionId }: UpdateWizardProps) {
  const router = useRouter();
  const [sessionId, setSessionId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [updatePeriod, setUpdatePeriod] = useState<UpdatePeriod>("full_day");
  const [periodDate, setPeriodDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [extractedActivities, setExtractedActivities] = useState<ExtractedActivity[]>([]);
  const [rawSummary, setRawSummary] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [sessionStartedAt, setSessionStartedAt] = useState<Date | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isVoiceSupported, setIsVoiceSupported] = useState(false);
  const [isTtsEnabled, setIsTtsEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [countdownActive, setCountdownActive] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(3);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasSpokenWordsRef = useRef(false);
  const lastInputWasVoiceRef = useRef(false);
  const startListeningRef = useRef<(() => void) | null>(null);

  // Text-to-speech function using Web Speech API (built-in, free, local, mobile-friendly)
  const speakText = useCallback((text: string) => {
    if (!isTtsEnabled || typeof window === "undefined" || !window.speechSynthesis) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    // Clean text for better speech (remove markdown)
    const cleanText = text
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .replace(/•/g, "")
      .replace(/\n+/g, ". ");

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Try to get a good voice (prefer natural sounding ones)
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      (v) => v.lang.startsWith("en") && (v.name.includes("Natural") || v.name.includes("Enhanced"))
    ) || voices.find((v) => v.lang.startsWith("en"));
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      // Restart listening after TTS ends if last input was voice
      if (lastInputWasVoiceRef.current && startListeningRef.current) {
        startListeningRef.current();
      }
    };
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, [isTtsEnabled]);

  // Stop speech and optionally restart listening
  const stopSpeaking = useCallback((restartListening = false) => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      // Restart listening immediately if requested and last input was voice
      if (restartListening && lastInputWasVoiceRef.current && startListeningRef.current) {
        startListeningRef.current();
      }
    }
  }, []);

  // Track if we've initialized to prevent infinite loops from URL updates
  const hasInitializedRef = useRef(false);

  // Update URL with session ID (without triggering navigation)
  const updateUrlWithSession = useCallback((newSessionId: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("session", newSessionId);
    window.history.replaceState({}, "", url.toString());
  }, []);

  // Initialize client-side values after hydration (runs once)
  useEffect(() => {
    // Prevent re-running if we've already initialized
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    const initSession = async () => {
      setIsVoiceSupported(!!(window.SpeechRecognition || window.webkitSpeechRecognition));

      // Try to load existing session if initialSessionId provided
      if (initialSessionId) {
        try {
          const response = await fetch(`/api/updates/sessions?sessionId=${encodeURIComponent(initialSessionId)}`);
          if (response.ok) {
            const data = await response.json();
            if (data.session) {
              // Restore session state
              setSessionId(data.session.sessionId);
              setPeriodDate(data.session.periodDate);
              onDateChange?.(data.session.periodDate);
              setUpdatePeriod(data.session.updatePeriod);
              setSessionStartedAt(new Date(data.session.startedAt));

              // Restore messages (filter out any that are just the initial greeting if we have real messages)
              if (data.session.messages.length > 0) {
                setMessages(data.session.messages.map((m: { role: "user" | "assistant"; content: string }) => ({
                  role: m.role,
                  content: m.content,
                })));
              } else {
                setMessages([{
                  role: "assistant",
                  content: "Hi there! Tell me about what you accomplished today. I'll help you track your activities like experiments, mentoring sessions, presentations, learning, and more. Be as specific as you can!",
                }]);
              }

              // Always restore extracted activities (regardless of session status)
              if (data.session.extractedActivities?.length > 0) {
                setExtractedActivities(data.session.extractedActivities);
                setIsSaved(true); // Mark as saved since activities exist
              }

              setIsHydrated(true);
              return;
            }
          }
        } catch (error) {
          console.error("Failed to load session:", error);
        }
      }

      // No existing session or load failed - create new session
      const newSessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setSessionId(newSessionId);
      updateUrlWithSession(newSessionId);
      setSessionStartedAt(new Date());

      const today = new Date().toISOString().split("T")[0];
      setPeriodDate(today);
      onDateChange?.(today);
      setMessages([
        {
          role: "assistant",
          content: "Hi there! Tell me about what you accomplished today. I'll help you track your activities like experiments, mentoring sessions, presentations, learning, and more. Be as specific as you can!",
        },
      ]);
      setIsHydrated(true);
    };

    initSession();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-send when countdown reaches 0
  useEffect(() => {
    if (countdownActive && countdownSeconds <= 0 && inputValue.trim()) {
      // Stop listening and countdown
      recognitionRef.current?.stop();
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      setCountdownActive(false);
      setCountdownSeconds(3);
      setIsListening(false);
      hasSpokenWordsRef.current = false;

      // Mark that this input was via voice (for auto-restart listening after TTS)
      lastInputWasVoiceRef.current = true;

      // Trigger send (need to use a timeout to avoid state update during render)
      const currentInput = inputValue.trim();
      setInputValue("");
      setMessages((prev) => [...prev, { role: "user", content: currentInput }]);
      setIsLoading(true);

      fetch("/api/updates/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          message: currentInput,
          updatePeriod,
          periodDate,
        }),
      })
        .then(async (response) => {
          const data = await response.json();
          if (!response.ok) {
            const errorMessage = data?.message || "Failed to send message";
            toast({ title: "Error", message: errorMessage, type: "error" });
            throw new Error(errorMessage);
          }
          return data;
        })
        .then((data) => {
          setMessages((prev) => [...prev, { role: "assistant", content: data.assistant_message }]);
          if (isTtsEnabled && data.assistant_message) {
            speakText(data.assistant_message);
          }
          if (data.saved && data.extractedActivities?.length > 0) {
            setExtractedActivities(
              data.extractedActivities.map((a: ExtractedActivity) => ({
                ...a,
                activityType: a.activityType,
              }))
            );
            setRawSummary(data.raw_summary || "");
            setIsSaved(true);
          }
        })
        .catch(() => {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: "Sorry, something went wrong. Please try again." },
          ]);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [countdownActive, countdownSeconds, inputValue, sessionId, updatePeriod, periodDate, isTtsEnabled, speakText]);

  // Cancel any pending countdowns
  const cancelCountdown = useCallback(() => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setCountdownActive(false);
    setCountdownSeconds(3);
  }, []);

  // Voice input handling
  const startListening = useCallback(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;

    // Enable TTS when voice input is activated
    setIsTtsEnabled(true);
    hasSpokenWordsRef.current = false;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      let hasInterimResults = false;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          // Interim result detected - user is speaking
          hasInterimResults = true;
        }
      }

      // Cancel countdown immediately when user starts speaking (interim results)
      if (hasInterimResults) {
        cancelCountdown();
      }

      if (finalTranscript) {
        setInputValue((prev) => prev + (prev ? " " : "") + finalTranscript);
        hasSpokenWordsRef.current = true;

        // Reset/cancel any existing countdown (in case interim didn't fire)
        cancelCountdown();

        // Start 3-second silence detection
        silenceTimeoutRef.current = setTimeout(() => {
          // Words were spoken, now silence - start visible countdown
          setCountdownActive(true);
          setCountdownSeconds(3);

          countdownIntervalRef.current = setInterval(() => {
            setCountdownSeconds((prev) => {
              if (prev <= 0.1) {
                // Countdown finished - will auto-send via effect
                return 0;
              }
              return prev - 0.1;
            });
          }, 100); // Update every 100ms for smooth animation
        }, 3000); // Wait 3 seconds of silence before showing countdown
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [cancelCountdown]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    cancelCountdown();
    hasSpokenWordsRef.current = false;
  }, [cancelCountdown]);

  // Store startListening in ref for use in callbacks (avoids stale closures)
  useEffect(() => {
    startListeningRef.current = startListening;
  }, [startListening]);

  // Toggle TTS on/off
  const toggleTts = useCallback(() => {
    if (isTtsEnabled) {
      stopSpeaking();
    }
    setIsTtsEnabled((prev) => !prev);
  }, [isTtsEnabled, stopSpeaking]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    // Mark that this input was manual (don't auto-restart listening after TTS)
    lastInputWasVoiceRef.current = false;

    const userMessage = inputValue.trim();
    setInputValue("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/updates/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          message: userMessage,
          updatePeriod,
          periodDate,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data?.message || "Failed to send message";
        toast({ title: "Error", message: errorMessage, type: "error" });
        throw new Error(errorMessage);
      }

      // Add assistant message
      setMessages((prev) => [...prev, { role: "assistant", content: data.assistant_message }]);

      // Speak the assistant's response if TTS is enabled
      if (isTtsEnabled && data.assistant_message) {
        speakText(data.assistant_message);
      }

      // If activities were extracted and saved
      if (data.saved && data.extractedActivities?.length > 0) {
        setExtractedActivities(
          data.extractedActivities.map((a: ExtractedActivity) => ({
            ...a,
            activityType: a.activityType,
          }))
        );
        setRawSummary(data.raw_summary || "");
        setIsSaved(true);
      } else if (!data.needs_clarification && data.activities?.length > 0) {
        // Activities extracted but not saved (maybe duplicate period)
        setExtractedActivities(
          data.activities.map((a: { activity_type: string; quantity: number; summary: string; activity_date: string }, i: number) => ({
            id: `temp-${i}`,
            activityType: a.activity_type,
            quantity: a.quantity,
            summary: a.summary,
            activityDate: a.activity_date,
          }))
        );
        setRawSummary(data.raw_summary || "");
        if (data.error) {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: `Note: ${data.error}. The activities were extracted but not saved.` },
          ]);
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, something went wrong. Please try again." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleNewSession = async () => {
    // Clear session on backend
    await fetch(`/api/updates/chat?sessionId=${sessionId}`, { method: "DELETE" }).catch(() => {});

    // Create new session ID and update URL
    const newSessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setSessionId(newSessionId);
    updateUrlWithSession(newSessionId);
    setSessionStartedAt(new Date());

    // Reset local state
    setMessages([
      {
        role: "assistant",
        content: "Hi there! Tell me about what you accomplished today. I'll help you track your activities like experiments, mentoring sessions, presentations, learning, and more. Be as specific as you can!",
      },
    ]);
    setExtractedActivities([]);
    setRawSummary("");
    setIsSaved(false);
  };

  const handleDone = () => {
    router.push("/home");
  };

  // Show loading state until hydrated to prevent hydration mismatch
  if (!isHydrated) {
    return (
      <div className={cn("max-w-2xl mx-auto", className)}>
        <Card className="mb-4">
          <CardContent className="py-3 px-4">
            <div className="h-8 bg-muted animate-pulse rounded" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-0">
            <div className="h-[400px] flex items-center justify-center">
              <div className="text-muted-foreground">Loading...</div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if session is within 12 hours (can continue chatting)
  const canContinueChat = sessionStartedAt
    ? (Date.now() - sessionStartedAt.getTime()) < 12 * 60 * 60 * 1000
    : true; // New sessions can always chat

  return (
    <div className={cn("max-w-2xl mx-auto", className)}>
      {/* Settings bar */}
      <Card className="mb-4">
        <CardContent className="px-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-muted-foreground">Date:</label>
              <input
                type="date"
                value={periodDate}
                onChange={(e) => {
                  setPeriodDate(e.target.value);
                  onDateChange?.(e.target.value);
                }}
                disabled={isSaved}
                className="h-8 rounded-md border border-input bg-background px-2 text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-muted-foreground">Period:</label>
              <Select
                value={updatePeriod}
                onValueChange={(v) => setUpdatePeriod(v as UpdatePeriod)}
                disabled={isSaved}
              >
                <SelectTrigger className="h-8 w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">Morning</SelectItem>
                  <SelectItem value="afternoon">Afternoon</SelectItem>
                  <SelectItem value="evening">Evening</SelectItem>
                  <SelectItem value="full_day">Full Day</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {isSaved && (
              <Button variant="outline" size="sm" onClick={handleNewSession} className="ml-auto gap-2">
                <IconRefresh className="h-4 w-4" />
                New Update
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Chat area */}
      <Card className="mb-4">
        <CardContent className="p-0">
          {/* Messages */}
          <div className="h-[400px] overflow-y-auto p-4 space-y-4 relative">
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  "flex",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-lg px-4 py-2",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  <div
                    className={cn(
                      "text-sm prose prose-sm max-w-none",
                      message.role === "user"
                        ? "prose-invert"
                        : "prose-neutral dark:prose-invert",
                      "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
                      "[&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5",
                      "[&_strong]:font-semibold [&_code]:bg-black/10 [&_code]:px-1 [&_code]:rounded"
                    )}
                  >
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-4 py-2">
                  <div className="flex items-center gap-2">
                    <IconLoader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />

            {/* Voice countdown overlay */}
            {countdownActive && (
              <div className="sticky bottom-2 flex justify-center pointer-events-none">
                <div className="w-12 h-12 rounded-xl bg-background/90 backdrop-blur-sm flex flex-col items-center justify-center shadow-lg border pointer-events-auto">
                  {/* Rotating pie countdown */}
                  <svg className="w-7 h-7" viewBox="0 0 24 24">
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-muted"
                    />
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeDasharray={`${(countdownSeconds / 3) * 62.83} 62.83`}
                      strokeLinecap="round"
                      className="text-primary -rotate-90 origin-center transition-all duration-100"
                      style={{ transformOrigin: "center" }}
                    />
                  </svg>
                  <span className="text-[10px] text-muted-foreground mt-0.5 font-medium">
                    {countdownSeconds.toFixed(1)}s
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Input area - available if session is within 12 hours */}
          {canContinueChat && (
            <div className="border-t p-4">
              <div className="flex gap-2">
                <RotatingBorder
                  borderRadius={16}
                  borderWidth={2}
                  colors={["#6792bf"]}
                  rotationSpeed={0.15}
                  colorSpread={0.2}
                  gapColor="#2d68e8"
                  className="flex-1"
                >
                    <Textarea
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Describe what you did today..."
                      disabled={isLoading}
                      rows={2}
                      className={cn(
                        "transition-all duration-200 resize-none pr-12 min-h-[80px] border-0 rounded-[14px] focus-visible:ring-2 focus-visible:ring-offset-2",
                        isListening && "ring-2 ring-primary/20"
                      )}
                    />
                    {/* Voice controls inside textarea */}
                    <div className="absolute bottom-2 right-2 flex items-center gap-1">
                      {/* TTS toggle */}
                      {isVoiceSupported && (
                        <button
                          type="button"
                          onClick={isSpeaking ? () => stopSpeaking(true) : toggleTts}
                          className={cn(
                            "p-1.5 rounded-md transition-colors",
                            isTtsEnabled
                              ? isSpeaking
                                ? "bg-primary text-primary-foreground animate-pulse"
                                : "bg-primary/20 text-primary"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted"
                          )}
                          title={isSpeaking ? "Stop speaking" : isTtsEnabled ? "TTS enabled" : "Enable TTS"}
                        >
                          {isTtsEnabled ? (
                            <IconVolume className="h-4 w-4" />
                          ) : (
                            <IconVolumeOff className="h-4 w-4" />
                          )}
                        </button>
                      )}
                      {/* Mic button */}
                      {isVoiceSupported && (
                        <button
                          type="button"
                          onClick={isListening ? stopListening : startListening}
                          disabled={isLoading}
                          className={cn(
                            "p-1.5 rounded-md transition-colors",
                            isListening
                              ? "bg-destructive text-destructive-foreground"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted"
                          )}
                          title={isListening ? "Stop listening" : "Start voice input"}
                        >
                          {isListening ? (
                            <IconPlayerStop className="h-4 w-4" />
                          ) : (
                            <IconMicrophone className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </div>
                    {isListening && (
                      <div className="absolute bottom-2.5 right-20 flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                      </div>
                    )}
                </RotatingBorder>
                <button
                  type="button"
                  onClick={handleSendMessage}
                  disabled={isLoading || !inputValue.trim()}
                  className={cn(
                    "min-h-[80px] w-12 shrink-0 rounded-md border-2 border-primary flex items-center justify-center transition-colors",
                    "text-foreground hover:bg-primary hover:text-white",
                    "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-foreground"
                  )}
                >
                  <IconSend className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Extracted activities preview */}
      {extractedActivities.length > 0 && (
        <div className="space-y-4">
          <ExtractedActivitiesPreview
            activities={extractedActivities}
            rawSummary={rawSummary}
          />

          {isSaved && canContinueChat && (
            <div className="flex justify-between">
              <Button variant="outline" onClick={handleNewSession} className="gap-2">
                <IconRefresh className="h-4 w-4" />
                Add Another Update
              </Button>
              <Button onClick={handleDone} className="gap-2">
                <IconCheck className="h-4 w-4" />
                Done
              </Button>
            </div>
          )}
          {!canContinueChat && (
            <div className="flex justify-between">
              <p className="text-sm text-muted-foreground">
                This session has expired. Start a new session to add more activities.
              </p>
              <Button onClick={handleNewSession} className="gap-2">
                <IconRefresh className="h-4 w-4" />
                Start New Session
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
