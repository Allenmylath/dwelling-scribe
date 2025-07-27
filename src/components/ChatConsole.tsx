import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Send, Bot, User, Search, Clock, Mic, MicOff, Phone, PhoneOff } from "lucide-react";
import { 
  usePipecatClient, 
  useRTVIClientEvent, 
  usePipecatClientMicControl,
  usePipecatClientTransportState 
} from "@pipecat-ai/client-react";
import { RTVIEvent, TransportState } from "@pipecat-ai/client-js";

interface ChatMessage {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  messageType: 'text' | 'transcription' | 'audio';
  final?: boolean;
}

interface ChatConsoleProps {
  onSearch?: (query: string) => void;
  pipecatEndpoint?: string;
}

export function ChatConsole({ 
  onSearch, 
  pipecatEndpoint = "/api/connect" 
}: ChatConsoleProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'bot',
      content: 'Hello! I\'m your real estate assistant. I can help you search for properties. You can speak to me or type your questions!',
      timestamp: new Date(),
      messageType: 'text'
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentUserTranscript, setCurrentUserTranscript] = useState('');
  const [currentBotTranscript, setBotCurrentTranscript] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Pipecat hooks
  const pipecatClient = usePipecatClient();
  const { enableMic, isMicEnabled } = usePipecatClientMicControl();
  const transportState = usePipecatClientTransportState();

  // Helper function to determine connected state (matching ConnectButton logic)
  const isConnectedState = (state: TransportState): boolean => {
    return state === "connected" || state === "ready";
  };

  const isConnected = isConnectedState(transportState);
  const isConnecting = transportState === "connecting" || 
                      transportState === "initializing" || 
                      transportState === "initialized" || 
                      transportState === "authenticating" || 
                      transportState === "authenticated";

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);

  // Handle user speech transcription
  useRTVIClientEvent(
    RTVIEvent.UserTranscript,
    useCallback((transcript: any) => {
      console.log("👤 User transcript:", transcript);
      
      if (transcript.final) {
        // Add final user message
        const userMessage: ChatMessage = {
          id: `user-${Date.now()}`,
          type: 'user',
          content: transcript.text,
          timestamp: new Date(),
          messageType: 'transcription',
          final: true
        };
        
        setMessages(prev => [...prev, userMessage]);
        setCurrentUserTranscript('');
        
        // Trigger search if callback provided
        if (onSearch && transcript.text.trim()) {
          onSearch(transcript.text.trim());
        }
      } else {
        // Show interim transcript
        setCurrentUserTranscript(transcript.text);
      }
    }, [onSearch])
  );

  // Handle bot speech transcription
  useRTVIClientEvent(
    RTVIEvent.BotTranscript,
    useCallback((transcript: any) => {
      console.log("🤖 Bot transcript:", transcript);
      
      if (transcript.final) {
        // Add final bot message
        const botMessage: ChatMessage = {
          id: `bot-${Date.now()}`,
          type: 'bot',
          content: transcript.text,
          timestamp: new Date(),
          messageType: 'transcription',
          final: true
        };
        
        setMessages(prev => [...prev, botMessage]);
        setBotCurrentTranscript('');
        setIsLoading(false);
      } else {
        // Show interim transcript
        setBotCurrentTranscript(transcript.text);
      }
    }, [])
  );

  // Handle bot started speaking
  useRTVIClientEvent(
    RTVIEvent.BotStartedSpeaking,
    useCallback(() => {
      console.log("🤖 Bot started speaking");
      setIsLoading(true);
    }, [])
  );

  // Handle bot stopped speaking
  useRTVIClientEvent(
    RTVIEvent.BotStoppedSpeaking,
    useCallback(() => {
      console.log("🤖 Bot stopped speaking");
      setIsLoading(false);
    }, [])
  );

  // Handle user started speaking
  useRTVIClientEvent(
    RTVIEvent.UserStartedSpeaking,
    useCallback(() => {
      console.log("👤 User started speaking");
    }, [])
  );

  // Handle user stopped speaking
  useRTVIClientEvent(
    RTVIEvent.UserStoppedSpeaking,
    useCallback(() => {
      console.log("👤 User stopped speaking");
    }, [])
  );

  // Handle transport state changes
  useRTVIClientEvent(
    RTVIEvent.TransportStateChanged,
    useCallback((state: TransportState) => {
      console.log("🔄 Transport state changed to:", state);
    }, [])
  );

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

  // Handle typed message
  const handleSendMessage = async () => {
    if (!inputValue.trim() || !isConnected) return;

    const userMessage: ChatMessage = {
      id: `typed-${Date.now()}`,
      type: 'user',
      content: inputValue,
      timestamp: new Date(),
      messageType: 'text'
    };

    setMessages(prev => [...prev, userMessage]);
    const messageText = inputValue;
    setInputValue('');

    // For typed messages, we'll add them to the conversation
    // The voice transcription will be handled automatically by Pipecat
    // when the user speaks, so we don't need to send additional actions
    try {
      // Trigger search if callback provided
      if (onSearch) {
        onSearch(messageText);
      }
      
      // Since this is a typed message for property search, we simulate a response
      // The real AI conversation happens through voice when connected
      setTimeout(() => {
        const botMessage: ChatMessage = {
          id: `bot-typed-${Date.now()}`,
          type: 'bot',
          content: `I'll help you search for properties: "${messageText}". For a full AI conversation experience, please use the voice feature by connecting and speaking naturally.`,
          timestamp: new Date(),
          messageType: 'text'
        };
        setMessages(prev => [...prev, botMessage]);
      }, 1000);
      
    } catch (error) {
      console.error("Error processing message:", error);
      
      // Add error message
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        type: 'bot',
        content: 'Sorry, I encountered an error processing your message. Please try again.',
        timestamp: new Date(),
        messageType: 'text'
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getMessageIcon = (message: ChatMessage) => {
    if (message.messageType === 'transcription') {
      return <Mic size={12} className="opacity-70" />;
    }
    return null;
  };

  const getMessageTypeLabel = (message: ChatMessage) => {
    if (message.type === 'user') {
      return message.messageType === 'transcription' ? 'You (Spoken)' : 'You (Typed)';
    }
    return message.messageType === 'transcription' ? 'AI Assistant (Voice)' : 'AI Assistant';
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

  return (
    <Card className="h-full flex flex-col bg-chat-background">
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
            
            {/* Mic status */}
            {isConnected && (
              <div className="flex items-center gap-1 text-xs">
                <Mic className={`w-3 h-3 ${isMicEnabled ? 'text-primary' : 'text-muted-foreground'}`} />
                <span>{isMicEnabled ? 'Mic On' : 'Mic Off'}</span>
              </div>
            )}
          </div>
        </CardTitle>
        
        {/* Debug Info */}
        <div className="text-xs text-muted-foreground">
          Transport: {transportState} | Mic: {isMicEnabled ? 'On' : 'Off'} | Messages: {messages.length}
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col gap-3 p-3">
        <ScrollArea ref={scrollAreaRef} className="flex-1 pr-3">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex gap-2 max-w-[85%] ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    message.type === 'user' ? 'bg-primary' : 'bg-accent'
                  }`}>
                    {message.type === 'user' ? (
                      <User className="w-4 h-4 text-primary-foreground" />
                    ) : (
                      <Bot className="w-4 h-4 text-accent-foreground" />
                    )}
                  </div>
                  
                  <div className={`p-3 rounded-lg ${
                    message.type === 'user' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-background border'
                  }`}>
                    <div className="flex items-center gap-1 mb-1">
                      {getMessageIcon(message)}
                      <span className="text-xs opacity-70 font-medium">
                        {getMessageTypeLabel(message)}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed">{message.content}</p>
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
              </div>
            ))}
            
            {/* Current user transcript (interim) */}
            {currentUserTranscript && (
              <div className="flex gap-3 justify-end">
                <div className="flex gap-2 max-w-[85%] flex-row-reverse">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/50 flex items-center justify-center">
                    <User className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <div className="p-3 rounded-lg bg-primary/70 text-primary-foreground">
                    <div className="flex items-center gap-1 mb-1">
                      <Mic size={12} className="opacity-70 animate-pulse" />
                      <span className="text-xs opacity-70 font-medium">You (Speaking...)</span>
                    </div>
                    <p className="text-sm leading-relaxed italic">{currentUserTranscript}</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Current bot transcript (interim) */}
            {currentBotTranscript && (
              <div className="flex gap-3 justify-start">
                <div className="flex gap-2 max-w-[85%]">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/50 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-accent-foreground" />
                  </div>
                  <div className="p-3 rounded-lg bg-background/70 border">
                    <div className="flex items-center gap-1 mb-1">
                      <Mic size={12} className="opacity-70 animate-pulse" />
                      <span className="text-xs opacity-70 font-medium">AI Assistant (Speaking...)</span>
                    </div>
                    <p className="text-sm leading-relaxed italic">{currentBotTranscript}</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Loading indicator */}
            {isLoading && !currentBotTranscript && (
              <div className="flex gap-3 justify-start">
                <div className="flex gap-2">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent flex items-center justify-center">
                    <Bot className="w-4 h-4 text-accent-foreground" />
                  </div>
                  <div className="p-3 rounded-lg bg-background border">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        
        {/* Voice and Connection Controls */}
        <div className="flex gap-2 justify-center">
          <Button
            onClick={handleConnectionToggle}
            variant={isConnected ? "destructive" : "default"}
            size="sm"
            className="flex items-center gap-2"
            disabled={isConnecting}
          >
            {isConnected ? (
              <>
                <PhoneOff className="w-4 h-4" />
                Disconnect
              </>
            ) : (
              <>
                <Phone className="w-4 h-4" />
                {isConnecting ? 'Connecting...' : 'Connect'}
              </>
            )}
          </Button>
          
          {isConnected && (
            <Button
              onClick={handleMicToggle}
              variant={isMicEnabled ? "destructive" : "outline"}
              size="sm"
              className="flex items-center gap-2"
            >
              {isMicEnabled ? (
                <>
                  <MicOff className="w-4 h-4" />
                  Mute Mic
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4" />
                  Enable Mic
                </>
              )}
            </Button>
          )}
        </div>
        
        {/* Text Input */}
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isConnected ? "Type a message..." : "Connect to start chatting"}
            className="flex-1"
            disabled={isLoading || !isConnected}
          />
          <Button 
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading || !isConnected}
            size="icon"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Status indicator */}
        <div className="mt-2 text-xs text-muted-foreground text-center">
          {!isConnected ? (
            <span>Click "Connect" to start voice conversation with AI</span>
          ) : isLoading ? (
            <span className="flex items-center justify-center gap-1">
              <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              AI is responding...
            </span>
          ) : currentUserTranscript ? (
            <span className="flex items-center justify-center gap-1">
              <Mic size={12} className="animate-pulse" />
              Listening to your speech...
            </span>
          ) : currentBotTranscript ? (
            <span className="flex items-center justify-center gap-1">
              <Bot size={12} className="animate-pulse" />
              AI is speaking...
            </span>
          ) : isMicEnabled ? (
            <span>🎤 Voice enabled - speak naturally for AI conversation</span>
          ) : (
            <span>Enable microphone for voice chat or type to search properties</span>
          )}
        </div>
        
        {/* Quick action badges */}
        <div className="flex flex-wrap gap-1">
          <Badge 
            variant="outline" 
            className="text-xs cursor-pointer hover:bg-muted"
            onClick={() => setInputValue("Find me a house with good fencing")}
          >
            <Search className="w-3 h-3 mr-1" />
            Good fencing
          </Badge>
          <Badge 
            variant="outline" 
            className="text-xs cursor-pointer hover:bg-muted"
            onClick={() => setInputValue("Properties under $500,000")}
          >
            <Search className="w-3 h-3 mr-1" />
            Under $500k
          </Badge>
          <Badge 
            variant="outline" 
            className="text-xs cursor-pointer hover:bg-muted"
            onClick={() => setInputValue("Show me 3 bedroom homes")}
          >
            <Search className="w-3 h-3 mr-1" />
            3 bedrooms
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}