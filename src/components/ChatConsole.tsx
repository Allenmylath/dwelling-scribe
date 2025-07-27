import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Send, Bot, User, Search, Clock, Mic, MicOff, Phone, PhoneOff } from "lucide-react";
import { usePipecatClient, useRTVIClientEvent, usePipecatClientMicControl, usePipecatClientTransportState } from "@pipecat-ai/client-react";
import { RTVIEvent, TransportState } from "@pipecat-ai/client-js";
interface Message {
  id: string;
  text: string;
  timestamp: Date;
  isOwn: boolean;
  type: 'text' | 'transcription';
}
interface ChatConsoleProps {
  onSearch?: (query: string) => void;
  pipecatEndpoint?: string;
}
export function ChatConsole({
  onSearch,
  pipecatEndpoint = "/api/connect"
}: ChatConsoleProps) {
  const [messages, setMessages] = useState<Message[]>([{
    id: 'welcome-1',
    text: 'Hello! I\'m your real estate assistant. I can help you search for properties. You can speak to me or type your questions!',
    timestamp: new Date(),
    isOwn: false,
    type: 'text'
  }]);
  const [newMessage, setNewMessage] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Pipecat hooks
  const pipecatClient = usePipecatClient();
  const {
    enableMic,
    isMicEnabled
  } = usePipecatClientMicControl();
  const transportState = usePipecatClientTransportState();

  // Helper function to determine connected state
  const isConnectedState = (state: TransportState): boolean => {
    return state === "connected" || state === "ready";
  };
  const isConnected = isConnectedState(transportState);
  const isConnecting = transportState === "connecting" || transportState === "initializing" || transportState === "initialized" || transportState === "authenticating" || transportState === "authenticated";

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const scrollToBottom = () => {
      if (scrollAreaRef.current) {
        const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollElement) {
          // Force scroll to absolute bottom
          scrollElement.scrollTop = scrollElement.scrollHeight;
          // Double-check with requestAnimationFrame for complex layouts
          requestAnimationFrame(() => {
            scrollElement.scrollTop = scrollElement.scrollHeight;
          });
        }
      }
    };

    // Use multiple timeouts to ensure reliable scrolling
    const timeoutId1 = setTimeout(scrollToBottom, 0);
    const timeoutId2 = setTimeout(scrollToBottom, 50);
    const timeoutId3 = setTimeout(scrollToBottom, 100);
    
    return () => {
      clearTimeout(timeoutId1);
      clearTimeout(timeoutId2);
      clearTimeout(timeoutId3);
    };
  }, [messages, isLoading]);

  // Listen to user transcription events - FINAL ONLY
  useRTVIClientEvent(RTVIEvent.UserTranscript, useCallback((data: any) => {
    console.log("🎤 User transcription event:", JSON.stringify(data, null, 2));
    const transcriptText = data?.text || data?.data?.text || "";
    const isFinal = data?.final ?? data?.data?.final ?? false;
    const timestamp = data?.timestamp || data?.data?.timestamp || Date.now();
    console.log("Parsed transcript:", {
      transcriptText,
      isFinal,
      timestamp
    });

    // Only process final transcripts
    if (isFinal && transcriptText && transcriptText.trim()) {
      console.log("✅ Adding final user transcript:", transcriptText);
      const message: Message = {
        id: `user-transcript-${Date.now()}-${Math.random()}`,
        text: transcriptText.trim(),
        timestamp: new Date(timestamp),
        isOwn: true,
        type: 'transcription'
      };
      setMessages(prev => {
        console.log("Messages before adding user transcript:", prev.length);
        const newMessages = [...prev, message];
        console.log("Messages after adding user transcript:", newMessages.length);
        return newMessages;
      });

      // Trigger search if callback provided
      if (onSearch && transcriptText.trim()) {
        onSearch(transcriptText.trim());
      }
    }
  }, [onSearch]));

  // Listen to bot transcription (what the bot says)
  useRTVIClientEvent(RTVIEvent.BotTranscript, useCallback((data: any) => {
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
  }, []));

  // Listen to user started/stopped speaking
  useRTVIClientEvent(RTVIEvent.UserStartedSpeaking, useCallback(() => {
    console.log("🎙️ User started speaking");
    setIsListening(true);
  }, []));
  useRTVIClientEvent(RTVIEvent.UserStoppedSpeaking, useCallback(() => {
    console.log("🔇 User stopped speaking");
    setIsListening(false);
  }, []));

  // Handle bot started speaking
  useRTVIClientEvent(RTVIEvent.BotStartedSpeaking, useCallback(() => {
    console.log("🤖 Bot started speaking");
    setIsLoading(true);
  }, []));

  // Handle bot stopped speaking
  useRTVIClientEvent(RTVIEvent.BotStoppedSpeaking, useCallback(() => {
    console.log("🤖 Bot stopped speaking");
    setIsLoading(false);
  }, []));

  // Handle connection/disconnection
  const handleConnectionToggle = async () => {
    try {
      if (isConnected) {
        await pipecatClient?.disconnect();
      } else {
        setIsLoading(true);
        await pipecatClient?.connect({
          endpoint: pipecatEndpoint,
          requestData: {
            // Add any custom data your endpoint needs
          }
        });
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Connection error:", error);
      setIsLoading(false);
    }
  };

  // Handle microphone toggle
  const handleMicToggle = async () => {
    try {
      await enableMic(!isMicEnabled);
    } catch (error) {
      console.error("Microphone toggle error:", error);
    }
  };

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

      // Trigger search if callback provided
      if (onSearch) {
        onSearch(messageText);
      }

      // Send message to the bot through Pipecat (fire and forget)
      console.log("📤 Sending typed message to bot:", messageText);
      pipecatClient.appendToContext({
        role: "user",
        content: messageText,
        run_immediately: true
      }).catch(error => {
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
  }, [newMessage, isConnected, pipecatClient, onSearch]);
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
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
      return message.isOwn ? 'You (Spoken)' : 'AI Assistant (Voice)';
    }
    return message.isOwn ? 'You (Typed)' : 'AI Assistant';
  };
  const getConnectionStatusColor = () => {
    if (isConnected) return 'bg-green-500';
    if (isConnecting) return 'bg-yellow-500 animate-pulse';
    if (transportState === "disconnected") return 'bg-red-500';
    return 'bg-gray-500';
  };
  const getConnectionStatusText = () => {
    if (isConnected) return 'Connected';
    if (isConnecting) return 'Connecting...';
    if (transportState === "disconnected") return 'Disconnected';
    return transportState || 'Unknown';
  };
  return <Card className="h-full flex flex-col bg-chat-background">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />
            AI Property Assistant
          </div>
          <div className="flex items-center gap-2">
            {/* Connection status */}
            <div className="flex items-center gap-1 text-xs">
              <div className={`w-2 h-2 rounded-full ${getConnectionStatusColor()}`} />
              <span>{getConnectionStatusText()}</span>
            </div>
            
            {/* Listening indicator */}
            {isListening && <div className="flex items-center gap-1 text-xs text-primary">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                <span>Listening</span>
              </div>}
            
            {/* Mic status */}
            {isConnected && <div className="flex items-center gap-1 text-xs">
                <Mic className={`w-3 h-3 ${isMicEnabled ? 'text-primary' : 'text-muted-foreground'}`} />
                <span>{isMicEnabled ? 'Mic On' : 'Mic Off'}</span>
              </div>}
          </div>
        </CardTitle>
        
        {/* Debug Info */}
        <div className="text-xs text-muted-foreground">
          Messages: {messages.length} | Listening: {isListening ? 'Yes' : 'No'} | Transport: {transportState}
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col gap-3 p-3">
        <ScrollArea ref={scrollAreaRef} className="flex-1 pr-3">
          <div className="space-y-4">
            {messages.length <= 1 ? <div className="text-center text-muted-foreground py-8">
                {isConnected ? <>
                    <p>Connected! Start speaking or type a message.</p>
                    <p className="text-sm mt-2">The AI will respond in real-time.</p>
                    <p className="text-xs mt-1 opacity-60">Final transcripts only - no interim display</p>
                  </> : <>
                    <p>Connect to start chatting</p>
                    <p className="text-sm">AI-powered conversation awaits!</p>
                  </>}
              </div> : messages.map(message => <div key={message.id} className={`flex gap-3 ${message.isOwn ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex gap-2 max-w-[85%] ${message.isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${message.isOwn ? 'bg-primary' : 'bg-accent'}`}>
                      {message.isOwn ? <User className="w-4 h-4 text-primary-foreground" /> : <Bot className="w-4 h-4 text-accent-foreground" />}
                    </div>
                    
                    <div className={`p-3 rounded-lg shadow-sm ${message.isOwn ? 'bg-primary text-primary-foreground' : 'bg-background border'}`}>
                      <div className="flex items-center gap-1 mb-1">
                        {getMessageIcon(message)}
                        <span className="text-xs opacity-70 font-medium">
                          {getMessageTypeLabel(message)}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed">{message.text}</p>
                      <div className="flex items-center gap-1 mt-2 opacity-70">
                        <Clock className="w-3 h-3" />
                        <span className="text-xs">
                          {message.timestamp.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>)}
            
            {/* Loading indicator */}
            {isLoading && <div className="flex gap-3 justify-start">
                <div className="flex gap-2">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent flex items-center justify-center">
                    <Bot className="w-4 h-4 text-accent-foreground" />
                  </div>
                  <div className="p-3 rounded-lg bg-background border">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse" style={{
                    animationDelay: '0.2s'
                  }}></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse" style={{
                    animationDelay: '0.4s'
                  }}></div>
                    </div>
                  </div>
                </div>
              </div>}
          </div>
        </ScrollArea>
        
        {/* Voice and Connection Controls */}
        <div className="flex gap-2 justify-center">
          
          
          {isConnected && <Button onClick={handleMicToggle} variant={isMicEnabled ? "destructive" : "outline"} size="sm" className="flex items-center gap-2">
              {isMicEnabled ? <>
                  <MicOff className="w-4 h-4" />
                  Mute Mic
                </> : <>
                  <Mic className="w-4 h-4" />
                  Enable Mic
                </>}
            </Button>}
        </div>
        
        {/* Text Input */}
        <div className="flex gap-2">
          <Input value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyPress={handleKeyPress} placeholder={isConnected ? "Type a message..." : "Connect to start chatting"} className="flex-1" disabled={!isConnected || isLoading} />
          <Button onClick={handleSendMessage} disabled={!newMessage.trim() || !isConnected || isLoading} size="icon">
            <Send className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Status indicator */}
        <div className="mt-2 text-xs text-muted-foreground text-center">
          {!isConnected ? <span>Click "Connect" to start voice conversation with AI</span> : isLoading ? <span className="flex items-center justify-center gap-1">
              <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              AI is responding...
            </span> : isListening ? <span className="flex items-center justify-center gap-1">
              <Mic size={12} className="animate-pulse" />
              Voice detected - processing final transcript
            </span> : isMicEnabled ? <span>🎤 Voice enabled - speak naturally for AI conversation</span> : <span>Enable microphone for voice chat or type to search properties</span>}
        </div>
        
        {/* Quick action badges */}
        <div className="flex flex-wrap gap-1">
          <Badge variant="outline" className="text-xs cursor-pointer hover:bg-muted" onClick={() => setNewMessage("Find me a house with good fencing")}>
            <Search className="w-3 h-3 mr-1" />
            Good fencing
          </Badge>
          <Badge variant="outline" className="text-xs cursor-pointer hover:bg-muted" onClick={() => setNewMessage("Properties under $500,000")}>
            <Search className="w-3 h-3 mr-1" />
            Under $500k
          </Badge>
          <Badge variant="outline" className="text-xs cursor-pointer hover:bg-muted" onClick={() => setNewMessage("Show me 3 bedroom homes")}>
            <Search className="w-3 h-3 mr-1" />
            3 bedrooms
          </Badge>
        </div>
      </CardContent>
    </Card>;
}