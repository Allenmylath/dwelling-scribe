import { useState, useCallback, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Mic, MicOff } from "lucide-react";
import { usePipecatClient, useRTVIClientEvent } from "@pipecat-ai/client-react";
import { RTVIEvent } from "@pipecat-ai/client-js";

interface Message {
  id: string;
  text: string;
  timestamp: Date;
  isOwn: boolean;
  type: 'text' | 'transcription';
  final?: boolean;
}

interface ChatConsoleProps {
  isConnected?: boolean;
}

export function ChatConsole({ isConnected = false }: ChatConsoleProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  const pipecatClient = usePipecatClient();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);

  // Listen to user transcription events (what the user says) - FINAL ONLY
  useRTVIClientEvent(
    RTVIEvent.UserTranscript,
    useCallback((data: any) => {
      console.log("🎤 User transcription event:", JSON.stringify(data, null, 2));
      
      const transcriptText = data?.text || data?.data?.text || "";
      const isFinal = data?.final ?? data?.data?.final ?? false;
      const timestamp = data?.timestamp || data?.data?.timestamp || Date.now();
      
      console.log("Parsed transcript:", { transcriptText, isFinal, timestamp });
      
      // Only process final transcripts
      if (isFinal && transcriptText && transcriptText.trim()) {
        console.log("✅ Adding final user transcript:", transcriptText);
        const message: Message = {
          id: `user-transcript-${Date.now()}-${Math.random()}`,
          text: transcriptText.trim(),
          timestamp: new Date(timestamp),
          isOwn: true,
          type: 'transcription',
          final: true
        };
        setMessages(prev => {
          console.log("Messages before adding user transcript:", prev.length);
          const newMessages = [...prev, message];
          console.log("Messages after adding user transcript:", newMessages.length);
          return newMessages;
        });
      }
    }, [])
  );

  // Listen to bot transcription (what the bot says)
  useRTVIClientEvent(
    RTVIEvent.BotTranscript,
    useCallback((data: any) => {
      console.log("🤖 Bot transcription event:", JSON.stringify(data, null, 2));
      
      const transcriptText = data?.text || data?.data?.text || "";
      
      console.log("Parsed bot transcript:", transcriptText);
      
      // Only add if there's actual text content
      if (transcriptText && transcriptText.trim()) {
        console.log("✅ Adding bot transcript:", transcriptText);
        const message: Message = {
          id: `bot-transcript-${Date.now()}-${Math.random()}`,
          text: transcriptText.trim(),
          timestamp: new Date(),
          isOwn: false,
          type: 'transcription'
        };
        
        setMessages(prev => {
          console.log("Messages before adding bot transcript:", prev.length);
          const newMessages = [...prev, message];
          console.log("Messages after adding bot transcript:", newMessages.length);
          return newMessages;
        });
      }
    }, [])
  );

  // Listen to user started/stopped speaking
  useRTVIClientEvent(
    RTVIEvent.UserStartedSpeaking,
    useCallback(() => {
      console.log("🎙️ User started speaking");
      setIsListening(true);
    }, [])
  );

  useRTVIClientEvent(
    RTVIEvent.UserStoppedSpeaking,
    useCallback(() => {
      console.log("🔇 User stopped speaking");
      setIsListening(false);
    }, [])
  );

  // Send text message through Pipecat
  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim() || !isConnected || !pipecatClient) return;

    const messageText = newMessage.trim();
    
    // Clear the input immediately to allow new typing
    setNewMessage("");

    try {
      // Add the user's typed message to the chat immediately
      const userMessage: Message = {
        id: `user-text-${Date.now()}`,
        text: messageText,
        timestamp: new Date(),
        isOwn: true,
        type: 'text'
      };
      
      setMessages(prev => [...prev, userMessage]);
      
      // Send message to the bot through Pipecat (fire and forget)
      console.log("📤 Sending typed message to bot:", messageText);
      
      pipecatClient.appendToContext({
        role: "user",
        content: messageText,
        run_immediately: true
      }).catch((error) => {
        console.error("❌ appendToContext failed:", error);
        
        // Show error message to user only if it actually fails
        const errorMessage: Message = {
          id: `error-${Date.now()}`,
          text: "Failed to send message. Please try again.",
          timestamp: new Date(),
          isOwn: false,
          type: 'text'
        };
        setMessages(prev => [...prev, errorMessage]);
      });
      
    } catch (error) {
      console.error("❌ Failed to process message:", error);
      
      // Show error message to user
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        text: "Failed to process message. Please try again.",
        timestamp: new Date(),
        isOwn: false,
        type: 'text'
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  }, [newMessage, isConnected, pipecatClient]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getMessageIcon = (message: Message) => {
    if (message.type === 'transcription' && message.isOwn) {
      return <Mic size={12} className="opacity-70" />;
    }
    return null;
  };

  const getMessageTypeLabel = (message: Message) => {
    if (message.type === 'transcription') {
      return message.isOwn ? 'You (Spoken)' : 'Bot Response';
    }
    return message.isOwn ? 'You (Typed)' : 'Bot';
  };

  // Debug info
  useEffect(() => {
    console.log("💬 Current messages count:", messages.length);
    console.log("👂 Is listening:", isListening);
    console.log("🔗 Is connected:", isConnected);
    console.log("📤 Is sending message:", isSendingMessage);
  }, [messages, isListening, isConnected, isSendingMessage]);

  return (
    <Card className="w-80 bg-gradient-card border-border/50 shadow-card flex flex-col h-full">
      {/* Chat Header */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Chat</h3>
          <div className="flex items-center gap-2">
            {isListening && (
              <div className="flex items-center gap-1 text-primary">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                <span className="text-xs">Listening</span>
              </div>
            )}
            {isSendingMessage && (
              <div className="flex items-center gap-1 text-blue-500">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                <span className="text-xs">Sending</span>
              </div>
            )}
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success animate-pulse-glow' : 'bg-muted'}`} />
          </div>
        </div>
        
        {/* Debug Info */}
        <div className="text-xs text-muted-foreground mt-2">
          Messages: {messages.length} | Listening: {isListening ? 'Yes' : 'No'}
        </div>
      </div>
      
      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              {isConnected ? (
                <>
                  <p>Connected! Start speaking or type a message.</p>
                  <p className="text-sm mt-2">The AI will respond in real-time.</p>
                  <p className="text-xs mt-1 opacity-60">Final transcripts only - no interim display</p>
                </>
              ) : (
                <>
                  <p>Connect to start chatting</p>
                  <p className="text-sm">AI-powered conversation awaits!</p>
                </>
              )}
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] p-3 rounded-lg shadow-sm animate-fade-in ${
                    message.isOwn
                      ? 'bg-gradient-button text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground'
                  }`}
                >
                  <div className="flex items-center gap-1 mb-1">
                    {getMessageIcon(message)}
                    <span className="text-xs opacity-70 font-medium">
                      {getMessageTypeLabel(message)}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed">{message.text}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
      
      {/* Message Input */}
      <div className="p-4 border-t border-border/50">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isConnected ? "Type a message..." : "Connect to start chatting"}
            disabled={!isConnected || isSendingMessage}
            className="flex-1 bg-background/50 border-border/50 focus:border-primary/50"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || !isConnected || isSendingMessage}
            size="icon"
            variant="connect"
            className="rounded-full"
          >
            <Send size={16} />
          </Button>
        </div>
        
        {isConnected && (
          <div className="mt-2 text-xs text-muted-foreground text-center">
            {isSendingMessage ? (
              <span className="flex items-center justify-center gap-1">
                <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                Sending message to bot...
              </span>
            ) : isListening ? (
              <span className="flex items-center justify-center gap-1">
                <Mic size={12} className="animate-pulse" />
                Voice detected - processing final transcript
              </span>
            ) : (
              <span>Speak naturally or type your message</span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}