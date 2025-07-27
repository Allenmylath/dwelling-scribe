import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Send, Bot, User, Search, Clock, Mic, MicOff } from "lucide-react";

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  messageType: 'text' | 'transcription';
  final?: boolean;
}

interface ChatConsoleProps {
  onSearch?: (query: string) => void;
  isConnected?: boolean;
}

export function ChatConsole({ onSearch, isConnected = true }: ChatConsoleProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'ai',
      content: 'Hello! I\'m your real estate assistant. I can help you search for properties. Try asking me something like "Find me a house with good fencing" or "Show me properties under $500,000".',
      timestamp: new Date(),
      messageType: 'text'
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeechEnabled, setIsSpeechEnabled] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [speechTimeout, setSpeechTimeout] = useState<NodeJS.Timeout | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = 'en-US';

      recognitionInstance.onstart = () => {
        console.log("🎙️ Speech recognition started");
        setIsListening(true);
      };

      recognitionInstance.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        // Update current transcript for display (but don't show interim)
        if (finalTranscript) {
          console.log("✅ Final transcript received:", finalTranscript);
          setCurrentTranscript(finalTranscript.trim());
          
          // Clear any existing timeout
          if (speechTimeout) {
            clearTimeout(speechTimeout);
          }
          
          // Set a timeout to auto-send the message after speech stops
          const timeout = setTimeout(() => {
            handleSpeechMessage(finalTranscript.trim());
          }, 1500); // Wait 1.5 seconds after final transcript
          
          setSpeechTimeout(timeout);
        }
      };

      recognitionInstance.onend = () => {
        console.log("🔇 Speech recognition ended");
        setIsListening(false);
        
        // If we were listening and speech was enabled, restart
        if (isSpeechEnabled) {
          setTimeout(() => {
            if (isSpeechEnabled) {
              recognitionInstance.start();
            }
          }, 100);
        }
      };

      recognitionInstance.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        
        // Don't restart on permission errors
        if (event.error === 'not-allowed') {
          setIsSpeechEnabled(false);
          alert('Microphone permission denied. Please enable microphone access and try again.');
        }
      };

      setRecognition(recognitionInstance);
    }
  }, [speechTimeout, isSpeechEnabled]);

  // Handle speech message (auto-send when speech is complete)
  const handleSpeechMessage = useCallback(async (transcript: string) => {
    if (!transcript.trim()) return;

    console.log("📤 Auto-sending speech message:", transcript);
    
    // Clear current transcript
    setCurrentTranscript('');
    
    // Clear timeout
    if (speechTimeout) {
      clearTimeout(speechTimeout);
      setSpeechTimeout(null);
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: transcript,
      timestamp: new Date(),
      messageType: 'transcription',
      final: true
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Trigger property search
    if (onSearch) {
      onSearch(transcript);
    }

    // Simulate AI response
    setTimeout(() => {
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: `I'm searching for properties based on: "${transcript}". Please check the main area for results. The search will include properties that match your criteria.`,
        timestamp: new Date(),
        messageType: 'text'
      };
      setMessages(prev => [...prev, aiMessage]);
      setIsLoading(false);
    }, 1000);
  }, [onSearch, speechTimeout]);

  // Handle typed message
  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date(),
      messageType: 'text'
    };

    setMessages(prev => [...prev, userMessage]);
    const messageText = inputValue;
    setInputValue('');
    setIsLoading(true);

    // Trigger property search
    if (onSearch) {
      onSearch(messageText);
    }

    // Simulate AI response
    setTimeout(() => {
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: `I'm searching for properties based on: "${messageText}". Please check the main area for results. The search will include properties that match your criteria.`,
        timestamp: new Date(),
        messageType: 'text'
      };
      setMessages(prev => [...prev, aiMessage]);
      setIsLoading(false);
    }, 1000);
  };

  const handleMicToggle = () => {
    if (!recognition) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    if (isSpeechEnabled) {
      // Stop speech recognition
      recognition.stop();
      setIsSpeechEnabled(false);
      setIsListening(false);
      setCurrentTranscript('');
      if (speechTimeout) {
        clearTimeout(speechTimeout);
        setSpeechTimeout(null);
      }
    } else {
      // Start speech recognition
      setIsSpeechEnabled(true);
      recognition.start();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getMessageIcon = (message: ChatMessage) => {
    if (message.messageType === 'transcription' && message.type === 'user') {
      return <Mic size={12} className="opacity-70" />;
    }
    return null;
  };

  const getMessageTypeLabel = (message: ChatMessage) => {
    if (message.type === 'user') {
      return message.messageType === 'transcription' ? 'You (Spoken)' : 'You (Typed)';
    }
    return 'AI Assistant';
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
            {isListening && (
              <div className="flex items-center gap-1 text-primary">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                <span className="text-xs">Listening</span>
              </div>
            )}
            {currentTranscript && (
              <div className="flex items-center gap-1 text-blue-500">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                <span className="text-xs">Processing</span>
              </div>
            )}
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-muted'}`} />
          </div>
        </CardTitle>
        
        {/* Debug Info */}
        <div className="text-xs text-muted-foreground">
          Messages: {messages.length} | Speech: {isSpeechEnabled ? 'On' : 'Off'} | Listening: {isListening ? 'Yes' : 'No'}
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col gap-3 p-3">
        <ScrollArea ref={scrollAreaRef} className="flex-1 pr-3">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <p>Start speaking or type a message to begin!</p>
                <p className="text-sm mt-2">The AI will help you find properties.</p>
              </div>
            ) : (
              messages.map((message) => (
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
              ))
            )}
            
            {isLoading && (
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
        
        {/* Voice Controls */}
        <div className="flex gap-2 justify-center">
          <Button
            onClick={handleMicToggle}
            variant={isSpeechEnabled ? "destructive" : "outline"}
            size="sm"
            className="flex items-center gap-2"
          >
            {isSpeechEnabled ? (
              <>
                <MicOff className="w-4 h-4" />
                Stop Listening
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                Start Listening
              </>
            )}
          </Button>
        </div>
        
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
        {isConnected && (
          <div className="mt-2 text-xs text-muted-foreground text-center">
            {isLoading ? (
              <span className="flex items-center justify-center gap-1">
                <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                Processing your request...
              </span>
            ) : currentTranscript ? (
              <span className="flex items-center justify-center gap-1">
                <Mic size={12} className="animate-pulse" />
                Speech processed - auto-sending message...
              </span>
            ) : isListening ? (
              <span className="flex items-center justify-center gap-1">
                <Mic size={12} className="animate-pulse" />
                Listening for speech...
              </span>
            ) : isSpeechEnabled ? (
              <span>Speech enabled - waiting for voice input</span>
            ) : (
              <span>Click microphone to enable voice input or type your message</span>
            )}
          </div>
        )}
        
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
        </div>
      </CardContent>
    </Card>
  );
}