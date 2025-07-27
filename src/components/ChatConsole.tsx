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
  threadId: string; // For grouping related messages
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  messageType: 'text' | 'transcription' | 'audio';
  status: 'interim' | 'final';
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
      id: 'welcome-1',
      threadId: 'welcome',
      type: 'bot',
      content: 'Hello! I\'m your real estate assistant. I can help you search for properties. You can speak to me or type your questions!',
      timestamp: new Date(),
      messageType: 'text',
      status: 'final'
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  
  // Refs for scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);

  // Pipecat hooks
  const pipecatClient = usePipecatClient();
  const { enableMic, isMicEnabled } = usePipecatClientMicControl();
  const transportState = usePipecatClientTransportState();

  // Helper function to determine connected state
  const isConnectedState = (state: TransportState): boolean => {
    return state === "connected" || state === "ready";
  };

  const isConnected = isConnectedState(transportState);
  const isConnecting = transportState === "connecting" || 
                      transportState === "initializing" || 
                      transportState === "initialized" || 
                      transportState === "authenticating" || 
                      transportState === "authenticated";

  // Generate unique thread ID
  const generateThreadId = () => `thread-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Scroll to bottom function
  const scrollToBottom = (smooth = true) => {
    if (messagesEndRef.current && isNearBottom) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: smooth ? 'smooth' : 'auto',
        block: 'end'
      });
    }
  };

  // Check if user is near bottom of scroll area
  const handleScroll = useCallback(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        const { scrollTop, scrollHeight, clientHeight } = scrollElement;
        const threshold = 100; // pixels from bottom
        setIsNearBottom(scrollHeight - scrollTop - clientHeight < threshold);
      }
    }
  }, []);

  // Auto-scroll when messages change
  useEffect(() => {
    const timer = setTimeout(() => scrollToBottom(), 100);
    return () => clearTimeout(timer);
  }, [messages]);

  // Add scroll listener
  useEffect(() => {
    const scrollElement = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (scrollElement) {
      scrollElement.addEventListener('scroll', handleScroll);
      return () => scrollElement.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  // Helper function to add or update message
  const addOrUpdateMessage = (newMessage: Omit<ChatMessage, 'timestamp'>) => {
    const messageWithTimestamp = {
      ...newMessage,
      timestamp: new Date()
    };

    setMessages(prev => {
      const existingIndex = prev.findIndex(msg => 
        msg.threadId === newMessage.threadId && 
        msg.type === newMessage.type &&
        msg.messageType === newMessage.messageType
      );

      if (existingIndex !== -1 && newMessage.status === 'final') {
        // Replace interim message with final one
        const updated = [...prev];
        updated[existingIndex] = messageWithTimestamp;
        return updated.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      } else if (existingIndex !== -1 && newMessage.status === 'interim') {
        // Update existing interim message
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], content: newMessage.content };
        return updated;
      } else {
        // Add new message
        return [...prev, messageWithTimestamp].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      }
    });
  };

  // Handle user speech transcription
  useRTVIClientEvent(
    RTVIEvent.UserTranscript,
    useCallback((transcript: any) => {
      console.log("👤 User transcript:", transcript);
      
      if (!currentThreadId) {
        setCurrentThreadId(generateThreadId());
      }

      const threadId = currentThreadId || generateThreadId();
      
      const userMessage: Omit<ChatMessage, 'timestamp'> = {
        id: transcript.final ? `user-final-${Date.now()}` : `user-interim-${threadId}`,
        threadId,
        type: 'user',
        content: transcript.text,
        messageType: 'transcription',
        status: transcript.final ? 'final' : 'interim'
      };
      
      addOrUpdateMessage(userMessage);
      
      if (transcript.final) {
        // Trigger search if callback provided
        if (onSearch && transcript.text.trim()) {
          onSearch(transcript.text.trim());
        }
      }
    }, [currentThreadId, onSearch])
  );

  // Handle bot speech transcription
  useRTVIClientEvent(
    RTVIEvent.BotTranscript,
    useCallback((transcript: any) => {
      console.log("🤖 Bot transcript:", transcript);
      
      if (!currentThreadId) {
        setCurrentThreadId(generateThreadId());
      }

      const threadId = currentThreadId || generateThreadId();
      
      const botMessage: Omit<ChatMessage, 'timestamp'> = {
        id: transcript.final ? `bot-final-${Date.now()}` : `bot-interim-${threadId}`,
        threadId,
        type: 'bot',
        content: transcript.text,
        messageType: 'transcription',
        status: transcript.final ? 'final' : 'interim'
      };
      
      addOrUpdateMessage(botMessage);
      
      if (transcript.final) {
        setIsLoading(false);
        setCurrentThreadId(null); // Reset for next conversation
      }
    }, [currentThreadId])
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
      if (!currentThreadId) {
        setCurrentThreadId(generateThreadId());
      }
    }, [currentThreadId])
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
        setCurrentThreadId(null);
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
    if (!inputValue.trim()) return;

    const threadId = generateThreadId();
    const userMessage: Omit<ChatMessage, 'timestamp'> = {
      id: `typed-${Date.now()}`,
      threadId,
      type: 'user',
      content: inputValue,
      messageType: 'text',
      status: 'final'
    };

    addOrUpdateMessage(userMessage);
    const messageText = inputValue;
    setInputValue('');

    try {
      // Trigger search if callback provided
      if (onSearch) {
        onSearch(messageText);
      }
      
      // Simulate bot response for typed messages
      if (isConnected) {
        setTimeout(() => {
          const botMessage: Omit<ChatMessage, 'timestamp'> = {
            id: `bot-typed-${Date.now()}`,
            threadId,
            type: 'bot',
            content: `I'll help you search for properties: "${messageText}". For a full AI conversation experience, please use the voice feature by speaking naturally.`,
            messageType: 'text',
            status: 'final'
          };
          addOrUpdateMessage(botMessage);
        }, 1000);
      } else {
        setTimeout(() => {
          const botMessage: Omit<ChatMessage, 'timestamp'> = {
            id: `bot-typed-${Date.now()}`,
            threadId,
            type: 'bot',
            content: `I received your message: "${messageText}". Please connect to start the AI conversation.`,
            messageType: 'text',
            status: 'final'
          };
          addOrUpdateMessage(botMessage);
        }, 500);
      }
      
    } catch (error) {
      console.error("Error processing message:", error);
      
      const errorMessage: Omit<ChatMessage, 'timestamp'> = {
        id: `error-${Date.now()}`,
        threadId,
        type: 'bot',
        content: 'Sorry, I encountered an error processing your message. Please try again.',
        messageType: 'text',
        status: 'final'
      };
      addOrUpdateMessage(errorMessage);
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
      return <Mic size={12} className={`opacity-70 ${message.status === 'interim' ? 'animate-pulse' : ''}`} />;
    }
    return null;
  };

  const getMessageTypeLabel = (message: ChatMessage) => {
    const statusText = message.status === 'interim' ? '...' : '';
    if (message.type === 'user') {
      return message.messageType === 'transcription' 
        ? `You (${message.status === 'interim' ? 'Speaking' : 'Spoken'})${statusText}`
        : 'You (Typed)';
    }
    return message.messageType === 'transcription' 
      ? `AI Assistant (${message.status === 'interim' ? 'Speaking' : 'Voice'})${statusText}`
      : 'AI Assistant';
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
          Transport: {transportState} | Mic: {isMicEnabled ? 'On' : 'Off'} | Messages: {messages.length} | Thread: {currentThreadId?.slice(-6) || 'None'}
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
                  } ${message.status === 'interim' ? 'opacity-70' : 'opacity-100'}`}>
                    {message.type === 'user' ? (
                      <User className="w-4 h-4 text-primary-foreground" />
                    ) : (
                      <Bot className="w-4 h-4 text-accent-foreground" />
                    )}
                  </div>
                  
                  <div className={`p-3 rounded-lg ${
                    message.type === 'user' 
                      ? `bg-primary text-primary-foreground ${message.status === 'interim' ? 'opacity-70' : 'opacity-100'}` 
                      : `bg-background border ${message.status === 'interim' ? 'opacity-70 border-dashed' : 'opacity-100'}`
                  }`}>
                    <div className="flex items-center gap-1 mb-1">
                      {getMessageIcon(message)}
                      <span className="text-xs opacity-70 font-medium">
                        {getMessageTypeLabel(message)}
                      </span>
                    </div>
                    <p className={`text-sm leading-relaxed ${message.status === 'interim' ? 'italic' : ''}`}>
                      {message.content}
                    </p>
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
            
            {/* Loading indicator */}
            {isLoading && !messages.some(m => m.status === 'interim' && m.type === 'bot') && (
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
            
            {/* Invisible element for scrolling */}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        
        {/* Scroll to bottom button */}
        {!isNearBottom && (
          <div className="flex justify-center">
            <Button
              onClick={() => scrollToBottom()}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              Scroll to bottom
            </Button>
          </div>
        )}
        
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
            disabled={isLoading}
          />
          <Button 
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            size="icon"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Status indicator */}
        <div className="mt-2 text-xs text-muted-foreground text-center">
          {!isConnected ? (
            <span>Click "Connect" to start voice conversation with AI</span>
          ) : isLoading && !messages.some(m => m.status === 'interim') ? (
            <span className="flex items-center justify-center gap-1">
              <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              AI is responding...
            </span>
          ) : messages.some(m => m.status === 'interim' && m.type === 'user') ? (
            <span className="flex items-center justify-center gap-1">
              <Mic size={12} className="animate-pulse" />
              Listening to your speech...
            </span>
          ) : messages.some(m => m.status === 'interim' && m.type === 'bot') ? (
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