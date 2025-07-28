// Updated ConnectionButton.tsx - Simplified transport state logic
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff } from "lucide-react";
import { usePipecatClient, useRTVIClientEvent, usePipecatClientTransportState } from "@pipecat-ai/client-react";
import { RTVIEvent, TransportState } from "@pipecat-ai/client-js";
import { useToast } from "@/hooks/use-toast";

interface ConnectionButtonProps {
  onConnectionChange?: (isConnected: boolean) => void;
}

export function ConnectionButton({ onConnectionChange }: ConnectionButtonProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();
  
  const pipecatClient = usePipecatClient();
  const transportState = usePipecatClientTransportState();

  // ✅ SIMPLIFIED: Direct transport state checks
  const isConnected = transportState === "connected" || transportState === "ready";
  const isConnecting_State = transportState === "connecting" || 
                            transportState === "initializing" || 
                            transportState === "initialized" || 
                            transportState === "authenticating" || 
                            transportState === "authenticated";
  const isDisconnected = transportState === "disconnected";
  const hasError = transportState === "error";

  // Listen to transport state changes
  useRTVIClientEvent(
    RTVIEvent.TransportStateChanged,
    useCallback((state: TransportState) => {
      console.log("🔄 Transport state changed to:", state);
      
      // Reset connecting state when we reach a final state
      if (state === "connected" || state === "ready" || state === "disconnected" || state === "error") {
        setIsConnecting(false);
      }

      // ✅ SIMPLIFIED: Direct state check instead of helper function
      const connected = state === "connected" || state === "ready";
      
      // Notify parent component of connection changes
      if (onConnectionChange) {
        onConnectionChange(connected);
      }

      // Show appropriate toasts
      if (state === "connected") {
        toast({
          title: "Connected!",
          description: "You are now connected to the video call.",
        });
      } else if (state === "ready") {
        toast({
          title: "Ready!",
          description: "Bot is ready for conversation.",
        });
      } else if (state === "disconnected") {
        toast({
          title: "Disconnected",
          description: "You have been disconnected from the call.",
          variant: "destructive",
        });
      } else if (state === "error") {
        toast({
          title: "Connection Error",
          description: "Failed to connect to the call. Please try again.",
          variant: "destructive",
        });
      }
    }, [onConnectionChange, toast])
  );

  // Listen to bot ready event
  useRTVIClientEvent(
    RTVIEvent.BotReady,
    useCallback(() => {
      console.log("🤖 Bot is ready!");
      toast({
        title: "Bot Ready",
        description: "The AI assistant is now ready to chat.",
      });
    }, [toast])
  );

  // Listen to client ready event  
  useRTVIClientEvent(
    RTVIEvent.Connected,
    useCallback(() => {
      console.log("👤 Client is ready!");
    }, [])
  );

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      
      await pipecatClient.connect({
        endpoint: `${import.meta.env.VITE_PIPECAT_API_URL || "https://manjujayamurali--secondbrain-realestate-fastapi-app.modal.run/connect"}`,
        requestData: {
          services: {
            llm: "openai", 
            tts: "cartesia",
          },
        },
      });
    } catch (error) {
      console.error("❌ Connection failed:", error);
      setIsConnecting(false);
      toast({
        title: "Connection Failed",
        description: "Unable to connect to the server. Please check your network and try again.",
        variant: "destructive",
      });
    }
  };

  const handleDisconnect = async () => {
    try {
      await pipecatClient.disconnect();
      toast({
        title: "Call ended",
        description: "You have disconnected from the call.",
        variant: "destructive",
      });
    } catch (error) {
      console.error("❌ Disconnect failed:", error);
      toast({
        title: "Disconnect Error",
        description: "Error while disconnecting. Please refresh the page.",
        variant: "destructive",
      });
    }
  };

  const handleToggleConnection = () => {
    if (isConnected) {
      handleDisconnect();
    } else {
      handleConnect();
    }
  };

  // ✅ SIMPLIFIED: Use direct state checks
  const isDisabled = isConnecting || isConnecting_State;

  return (
    <div className="flex flex-col items-center gap-4">
      <Button
        onClick={handleToggleConnection}
        disabled={isDisabled}
        variant={isConnected ? "disconnect" : "connect"}
        size="lg"
        className="px-8 py-4 text-lg font-semibold rounded-full shadow-elegant hover:shadow-glow transition-all duration-300"
      >
        {isDisabled ? (
          <>
            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            {transportState === "connecting" ? "Connecting..." : 
             transportState === "ready" ? "Getting Ready..." : 
             "Initializing..."}
          </>
        ) : isConnected ? (
          <>
            <PhoneOff size={20} />
            Disconnect
          </>
        ) : (
          <>
            <Phone size={20} />
            Connect
          </>
        )}
      </Button>
      
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          {isConnected 
            ? "Click to end the call" 
            : "Click to start a video call with AI"
          }
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Status: {transportState}
        </p>
      </div>
    </div>
  );
}

// Updated Dashboard.tsx - Simplified transport state logic
import { useState } from "react";
import { ChatConsole } from "./ChatConsole";
import { PropertySearchResults } from "./PropertySearchResults";
import { ConnectionButton } from "./ConnectButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Home, MessageSquare, TrendingUp, Users, Mic, MicOff } from "lucide-react";
import { 
  usePipecatClientTransportState, 
  usePipecatClientMicControl,
  useRTVIClientEvent
} from "@pipecat-ai/client-react";
import { TransportState, RTVIEvent } from "@pipecat-ai/client-js";

interface SearchResultData {
  type: string;
  timestamp: number;
  search_id: string;
  query: string;
  summary: {
    total_found: number;
    showing: number;
    execution_time: number;
    search_type: string;
  };
  filters_applied: {
    min_price: number | null;
    max_price: number | null;
    bedrooms: number | null;
    bathrooms: number | null;
    property_type: string | null;
    location_keywords: string | null;
    mls_genuine: boolean | null;
  };
  properties: Array<{
    id: string;
    url: string;
    images: {
      primary: string;
      all: string[];
    };
    details: {
      address: string;
      price: number;
      currency: string;
      bedrooms: string;
      bathrooms: string;
      type: string;
      description: string;
    };
    metadata: {
      search_score: number;
      mls_genuine: boolean;
      status: string;
    };
  }>;
}

export function Dashboard() {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isConnected, setIsConnected] = useState(false);
  
  // RTVI property search state
  const [searchResults, setSearchResults] = useState<SearchResultData | null>(null);
  const [hasError, setHasError] = useState(false);
  
  // Pipecat hooks for status display
  const transportState = usePipecatClientTransportState();
  const { isMicEnabled } = usePipecatClientMicControl();
  
  // Listen for RTVI server messages
  useRTVIClientEvent(RTVIEvent.ServerMessage, (message: any) => {
    try {
      if (message?.type === 'property_search_results') {
        console.log('📍 Received property search results:', message);
        setSearchResults(message);
        setSearchQuery(message.query);
        setHasError(false);
      } else if (message?.type === 'property_search_error') {
        console.error('❌ Property search error:', message.error);
        setHasError(true);
        setSearchResults(null);
      }
    } catch (error) {
      console.error('🚨 Error processing server message:', error);
      setHasError(true);
    }
  });
  
  // ✅ SIMPLIFIED: Direct transport state checks
  const connected = transportState === "connected" || transportState === "ready";
  const isConnecting = transportState === "connecting" || 
                      transportState === "initializing" || 
                      transportState === "initialized" || 
                      transportState === "authenticating" || 
                      transportState === "authenticated";
  const isDisconnected = transportState === "disconnected";
  const hasConnectionError = transportState === "error";

  // Handle connection state changes from ConnectButton
  const handleConnectionChange = (connectionState: boolean) => {
    setIsConnected(connectionState);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  // ✅ SIMPLIFIED: Direct status functions using transport state
  const getConnectionStatusText = () => {
    if (connected) return "Connected";
    if (isConnecting) return "Connecting...";
    if (hasConnectionError) return "Error";
    if (isDisconnected) return "Disconnected";
    return transportState || "Unknown";
  };

  const getConnectionStatusColor = () => {
    if (connected) return "text-green-600 bg-green-50 border-green-200";
    if (isConnecting) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    if (hasConnectionError) return "text-red-600 bg-red-50 border-red-200";
    if (isDisconnected) return "text-red-600 bg-red-50 border-red-200";
    return "text-gray-600 bg-gray-50 border-gray-200";
  };

  // Dynamic stats based on search results
  const getActiveListings = () => {
    return searchResults?.summary?.total_found || 1247;
  };

  const getNewToday = () => {
    return searchResults ? Math.floor(searchResults.summary.total_found * 0.1) : 89;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Home className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">RealEstate AI</h1>
                <p className="text-sm text-muted-foreground">Intelligent Property Search Dashboard</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Voice Status Indicators */}
              <div className="flex items-center gap-3">
                <Badge 
                  variant="outline" 
                  className={`flex items-center gap-1 ${getConnectionStatusColor()}`}
                >
                  <div className={`w-2 h-2 rounded-full ${
                    connected ? 'bg-green-500' : 
                    isConnecting ? 'bg-yellow-500 animate-pulse' : 
                    hasConnectionError ? 'bg-red-500 animate-pulse' :
                    'bg-red-500'
                  }`} />
                  {getConnectionStatusText()}
                </Badge>
                
                {connected && (
                  <Badge 
                    variant="outline" 
                    className={`flex items-center gap-1 ${
                      isMicEnabled ? 'text-blue-600 bg-blue-50 border-blue-200' : 'text-gray-600 bg-gray-50 border-gray-200'
                    }`}
                  >
                    {isMicEnabled ? (
                      <>
                        <Mic className="w-3 h-3" />
                        Voice Active
                      </>
                    ) : (
                      <>
                        <MicOff className="w-3 h-3" />
                        Voice Off
                      </>
                    )}
                  </Badge>
                )}
              </div>

              {/* Dynamic Stats */}
              <div className="flex items-center gap-3">
                <div className="text-center">
                  <div className="text-lg font-semibold text-primary">{getActiveListings().toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">
                    {searchResults ? 'Found Properties' : 'Active Listings'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-accent">{getNewToday()}</div>
                  <div className="text-xs text-muted-foreground">
                    {searchResults ? 'High Score' : 'New Today'}
                  </div>
                </div>
              </div>
              
              <Badge variant="outline" className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Market Up 2.3%
              </Badge>
              
              <ConnectionButton onConnectionChange={handleConnectionChange} />
            </div>
          </div>
          
          {/* Search Status Bar */}
          {searchQuery && (
            <div className="mt-3 pt-3 border-t">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-sm">
                  Current Search: "{searchQuery}"
                </Badge>
                {connected && (
                  <Badge variant="outline" className="text-xs">
                    <MessageSquare className="w-3 h-3 mr-1" />
                    Voice Search Active
                  </Badge>
                )}
                {searchResults && (
                  <Badge variant="outline" className="text-xs">
                    🎯 {searchResults.summary.execution_time}s search time
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-140px)]">
          {/* Main Content Area */}
          <div className="lg:col-span-3 overflow-auto">
            <PropertySearchResults 
              searchResults={searchResults} 
              hasError={hasError} 
            />
          </div>

          {/* Chat Console */}
          <div className="lg:col-span-1">
            <ChatConsole 
              onSearch={handleSearch}
              pipecatEndpoint={import.meta.env.VITE_PIPECAT_API_URL || "https://manjujayamurali--pipecat-modal-fastapi-app.modal.run/connect"}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
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
  const { enableMic, isMicEnabled } = usePipecatClientMicControl();
  const transportState = usePipecatClientTransportState();

  // ✅ SIMPLIFIED: Direct transport state checks
  const isConnected = transportState === "connected" || transportState === "ready";
  const isConnecting = transportState === "connecting" || 
                      transportState === "initializing" || 
                      transportState === "initialized" || 
                      transportState === "authenticating" || 
                      transportState === "authenticated";
  const isDisconnected = transportState === "disconnected";
  const hasError = transportState === "error";

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const scrollToBottom = () => {
      if (scrollAreaRef.current) {
        const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollElement) {
          scrollElement.scrollTop = scrollElement.scrollHeight;
          requestAnimationFrame(() => {
            scrollElement.scrollTop = scrollElement.scrollHeight;
          });
        }
      }
    };

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
    
    console.log("Parsed transcript:", { transcriptText, isFinal, timestamp });

    if (isFinal && transcriptText && transcriptText.trim()) {
      console.log("✅ Adding final user transcript:", transcriptText);
      const message: Message = {
        id: `user-transcript-${Date.now()}-${Math.random()}`,
        text: transcriptText.trim(),
        timestamp: new Date(timestamp),
        isOwn: true,
        type: 'transcription'
      };
      setMessages(prev => [...prev, message]);

      if (onSearch && transcriptText.trim()) {
        onSearch(transcriptText.trim());
      }
    }
  }, [onSearch]));

  // Listen to bot transcription
  useRTVIClientEvent(RTVIEvent.BotTranscript, useCallback((data: any) => {
    console.log("🤖 Bot transcription event:", JSON.stringify(data, null, 2));
    const transcriptText = data?.text || data?.data?.text || "";
    
    if (transcriptText && transcriptText.trim()) {
      console.log("✅ Adding bot transcript:", transcriptText);
      const message: Message = {
        id: `bot-transcript-${Date.now()}-${Math.random()}`,
        text: transcriptText.trim(),
        timestamp: new Date(),
        isOwn: false,
        type: 'transcription'
      };
      setMessages(prev => [...prev, message]);
    }
  }, []));

  // Listen to user speaking events
  useRTVIClientEvent(RTVIEvent.UserStartedSpeaking, useCallback(() => {
    console.log("🎙️ User started speaking");
    setIsListening(true);
  }, []));

  useRTVIClientEvent(RTVIEvent.UserStoppedSpeaking, useCallback(() => {
    console.log("🔇 User stopped speaking");
    setIsListening(false);
  }, []));

  // Listen to bot speaking events
  useRTVIClientEvent(RTVIEvent.BotStartedSpeaking, useCallback(() => {
    console.log("🤖 Bot started speaking");
    setIsLoading(true);
  }, []));

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
          requestData: {}
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

    setNewMessage("");
    try {
      const userMessage: Message = {
        id: `user-text-${Date.now()}`,
        text: messageText,
        timestamp: new Date(),
        isOwn: true,
        type: 'text'
      };
      setMessages(prev => [...prev, userMessage]);

      if (onSearch) {
        onSearch(messageText);
      }

      console.log("📤 Sending typed message to bot:", messageText);
      pipecatClient.appendToContext({
        role: "user",
        content: messageText,
        run_immediately: true
      }).catch(error => {
        console.error("❌ appendToContext failed:", error);
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

  // ✅ SIMPLIFIED: Direct status functions using transport state
  const getConnectionStatusColor = () => {
    if (isConnected) return 'bg-green-500';
    if (isConnecting) return 'bg-yellow-500 animate-pulse';
    if (hasError) return 'bg-red-500 animate-pulse';
    if (isDisconnected) return 'bg-red-500';
    return 'bg-gray-500';
  };

  const getConnectionStatusText = () => {
    if (isConnected) return 'Connected';
    if (isConnecting) return 'Connecting...';
    if (hasError) return 'Error';
    if (isDisconnected) return 'Disconnected';
    return transportState || 'Unknown';
  };

  return (
    <Card className="h-[50vh] md:h-[60vh] lg:h-[70vh] flex flex-col bg-chat-background">
      <CardHeader className="pb-3 flex-shrink-0">
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
            {isListening && (
              <div className="flex items-center gap-1 text-xs text-primary">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                <span>Listening</span>
              </div>
            )}
            
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
          Messages: {messages.length} | Listening: {isListening ? 'Yes' : 'No'} | Transport: {transportState}
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col gap-3 p-3 min-h-0">
        <ScrollArea ref={scrollAreaRef} className="flex-1 pr-3 min-h-0">
          <div className="space-y-4">
            {messages.length <= 1 ? (
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
              messages.map(message => (
                <div key={message.id} className={`flex gap-3 ${message.isOwn ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex gap-2 max-w-[85%] ${message.isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      message.isOwn ? 'bg-primary' : 'bg-accent'
                    }`}>
                      {message.isOwn ? (
                        <User className="w-4 h-4 text-primary-foreground" />
                      ) : (
                        <Bot className="w-4 h-4 text-accent-foreground" />
                      )}
                    </div>
                    
                    <div className={`p-3 rounded-lg shadow-sm ${
                      message.isOwn ? 'bg-primary text-primary-foreground' : 'bg-background border'
                    }`}>
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
                </div>
              ))
            )}
            
            {/* Loading indicator */}
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="flex gap-2">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent flex items-center justify-center">
                    <Bot className="w-4 h-4 text-accent-foreground" />
                  </div>
                  <div className="p-3 rounded-lg bg-background border">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
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
            disabled={isConnecting}
            variant={isConnected ? "destructive" : "default"}
            size="sm"
            className="flex items-center gap-2"
          >
            {isConnecting ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Connecting...
              </>
            ) : isConnected ? (
              <>
                <PhoneOff className="w-4 h-4" />
                Disconnect
              </>
            ) : (
              <>
                <Phone className="w-4 h-4" />
                Connect
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
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isConnected ? "Type a message..." : "Connect to start chatting"}
            className="flex-1"
            disabled={!isConnected || isLoading}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || !isConnected || isLoading}
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
          ) : isListening ? (
            <span className="flex items-center justify-center gap-1">
              <Mic size={12} className="animate-pulse" />
              Voice detected - processing final transcript
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
            onClick={() => setNewMessage("Find me a house with good fencing")}
          >
            <Search className="w-3 h-3 mr-1" />
            Good fencing
          </Badge>
          <Badge
            variant="outline"
            className="text-xs cursor-pointer hover:bg-muted"
            onClick={() => setNewMessage("Properties under $500,000")}
          >
            <Search className="w-3 h-3 mr-1" />
            Under $500k
          </Badge>
          <Badge
            variant="outline"
            className="text-xs cursor-pointer hover:bg-muted"
            onClick={() => setNewMessage("Show me 3 bedroom homes")}
          >
            <Search className="w-3 h-3 mr-1" />
            3 bedrooms
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}