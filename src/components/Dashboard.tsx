import { useState } from "react";
import { ChatConsole } from "./ChatConsole";
import { PropertySearchResults } from "./PropertySearchResults";
import { ConnectionButton } from "./ConnectButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Home, MessageSquare, TrendingUp, Users, Mic, MicOff } from "lucide-react";
import { 
  usePipecatClientTransportState, 
  usePipecatClientMicControl 
} from "@pipecat-ai/client-react";
import { TransportState } from "@pipecat-ai/client-js";

export function Dashboard() {
  const [searchQuery, setSearchQuery] = useState<string>("");
  
  // Pipecat hooks for status display
  const transportState = usePipecatClientTransportState();
  const { isMicEnabled } = usePipecatClientMicControl();
  
  const isConnected = transportState === TransportState.Connected;
  const isConnecting = transportState === TransportState.Connecting;

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const getConnectionStatusText = () => {
    switch (transportState) {
      case TransportState.Connected:
        return "Connected";
      case TransportState.Connecting:
        return "Connecting...";
      case TransportState.Disconnected:
        return "Disconnected";
      default:
        return "Unknown";
    }
  };

  const getConnectionStatusColor = () => {
    switch (transportState) {
      case TransportState.Connected:
        return "text-green-600 bg-green-50";
      case TransportState.Connecting:
        return "text-yellow-600 bg-yellow-50";
      case TransportState.Disconnected:
        return "text-red-600 bg-red-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
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
                    isConnected ? 'bg-green-500' : 
                    isConnecting ? 'bg-yellow-500 animate-pulse' : 
                    'bg-red-500'
                  }`} />
                  {getConnectionStatusText()}
                </Badge>
                
                {isConnected && (
                  <Badge 
                    variant="outline" 
                    className={`flex items-center gap-1 ${
                      isMicEnabled ? 'text-blue-600 bg-blue-50' : 'text-gray-600 bg-gray-50'
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

              {/* Stats */}
              <div className="flex items-center gap-3">
                <div className="text-center">
                  <div className="text-lg font-semibold text-primary">1,247</div>
                  <div className="text-xs text-muted-foreground">Active Listings</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-accent">89</div>
                  <div className="text-xs text-muted-foreground">New Today</div>
                </div>
              </div>
              
              <Badge variant="outline" className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Market Up 2.3%
              </Badge>
              
              <ConnectionButton />
            </div>
          </div>
          
          {/* Search Status Bar */}
          {searchQuery && (
            <div className="mt-3 pt-3 border-t">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-sm">
                  Current Search: "{searchQuery}"
                </Badge>
                {isConnected && (
                  <Badge variant="outline" className="text-xs">
                    <MessageSquare className="w-3 h-3 mr-1" />
                    Voice Search Active
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
            <PropertySearchResults searchQuery={searchQuery} />
          </div>

          {/* Chat Console */}
          <div className="lg:col-span-1">
            <ChatConsole 
              onSearch={handleSearch}
              pipecatEndpoint={process.env.REACT_APP_PIPECAT_ENDPOINT || "/api/connect"} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}