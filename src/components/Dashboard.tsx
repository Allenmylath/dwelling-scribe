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
              pipecatEndpoint={import.meta.env.VITE_PIPECAT_API_URL || "https://https://manjujayamurali--secondbrain-fastapi-app.modal.run/connect"}
            />
          </div>
        </div>
      </div>
    </div>
  );
}