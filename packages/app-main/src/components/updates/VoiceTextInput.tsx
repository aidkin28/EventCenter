"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@common/components/ui/Button";
import { Textarea } from "@/src/components/ui/textarea";
import { IconMicrophone, IconMicrophoneOff, IconPlayerStop } from "@tabler/icons-react";
import { cn } from "@/src/lib/utils";

interface VoiceTextInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function VoiceTextInput({
  value,
  onChange,
  placeholder = "Describe your activities today...",
  disabled = false,
  className,
}: VoiceTextInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognitionAPI);

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsListening(true);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      let interim = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      setInterimTranscript(interim);

      if (finalTranscript) {
        onChange(value + (value ? " " : "") + finalTranscript);
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
      setInterimTranscript("");
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript("");
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [value, onChange]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="relative">
        <Textarea
          value={value + (interimTranscript ? ` ${interimTranscript}` : "")}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled || isListening}
          rows={6}
          className={cn(
            "resize-none transition-all",
            isListening && "border-primary ring-2 ring-primary/20"
          )}
        />
        {isListening && (
          <div className="absolute bottom-3 right-3 flex items-center gap-2 text-sm text-primary">
            <span className="animate-pulse">Listening...</span>
            <div className="flex gap-1">
              <span className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {isSupported ? (
          <Button
            type="button"
            variant={isListening ? "destructive" : "outline"}
            size="sm"
            onClick={toggleListening}
            disabled={disabled}
            className="gap-2"
          >
            {isListening ? (
              <>
                <IconPlayerStop className="h-4 w-4" />
                Stop Recording
              </>
            ) : (
              <>
                <IconMicrophone className="h-4 w-4" />
                Voice Input
              </>
            )}
          </Button>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <IconMicrophoneOff className="h-4 w-4" />
            Voice input not supported in this browser
          </div>
        )}

        <span className="text-xs text-muted-foreground">
          {value.length} characters
        </span>
      </div>
    </div>
  );
}
