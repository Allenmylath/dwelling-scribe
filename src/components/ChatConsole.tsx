import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Send, Bot, User, Search, Clock, Mic, MicOff, Phone, PhoneOff } from "lucide-react";

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  data?: any;
}

interface ChatConsoleProps {
  onSearch?: (query: string) => void;
}

export function ChatConsole({ onSearch }: ChatConsoleProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'ai',
      content: 'Hello! I\'m your real estate assistant. I can help you search for properties. Try asking me something like "Find me a house with good fencing" or "Show me properties under $500,000".',
      timestamp: new Date(),
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [isListening, setIsListening] = useState(true);
  const [recognition, setRecognition] = useState<any>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = 'en-US';

      recognitionInstance.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result: any) => result.transcript)
          .join('');

        setInputValue(transcript);
      };

      recognitionInstance.onend = () => {
        setIsListening(false);
      };

      recognitionInstance.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      setRecognition(recognitionInstance);
      
      // Auto-start listening since microphone is on by default
      recognitionInstance.start();
    }
  }, []);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // Trigger property search
    if (onSearch) {
      onSearch(inputValue);
    }

    // Simulate AI response
    setTimeout(() => {
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: `I'm searching for properties based on: "${inputValue}". Please check the main area for results. The search will include properties that match your criteria.`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMessage]);
      setIsLoading(false);
    }, 1000);
  };

  const handleConnect = () => {
    setIsConnected(!isConnected);
    if (isConnected && isListening) {
      // Stop listening when disconnecting
      handleMicToggle();
    }
  };

  const handleMicToggle = () => {
    if (!recognition) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      if (!isConnected) {
        alert('Please connect first before using the microphone.');
        return;
      }
      recognition.start();
      setIsListening(true);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Card className="h-full flex flex-col bg-chat-background">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          AI Property Assistant
        </CardTitle>
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
            onClick={handleConnect}
            variant={isConnected ? "destructive" : "default"}
            size="sm"
            className="flex items-center gap-2"
          >
            {isConnected ? (
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
          
          <Button
            onClick={handleMicToggle}
            variant={isListening ? "destructive" : "outline"}
            size="sm"
            disabled={!isConnected}
            className="flex items-center gap-2"
          >
            {isListening ? (
              <>
                <MicOff className="w-4 h-4" />
                Stop
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                Listen
              </>
            )}
          </Button>
        </div>
        
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me about properties..."
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