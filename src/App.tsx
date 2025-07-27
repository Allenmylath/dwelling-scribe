import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PipecatClientProvider, PipecatClientAudio } from "@pipecat-ai/client-react";
import { PipecatClient, RTVIEvent } from "@pipecat-ai/client-js";
import { DailyTransport } from "@pipecat-ai/daily-transport";
import { useRTVIClientEvent } from "@pipecat-ai/client-react";
import { useState } from "react";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Create Pipecat client with enhanced configuration
const pipecatClient = new PipecatClient({
  transport: new DailyTransport(),
  enableMic: true,        // Enable microphone by default
  enableCam: false,       // Disable camera for voice-only chat
});

// Optional: Add global event listeners
pipecatClient.on('connected', () => {
  console.log('✅ Pipecat client connected');
});

pipecatClient.on('disconnected', () => {
  console.log('❌ Pipecat client disconnected');
});

pipecatClient.on('error', (error) => {
  console.error('🚨 Pipecat client error:', error);
});

// Property search results state management
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

const AppContent = () => {
  const [searchResults, setSearchResults] = useState<SearchResultData | null>(null);
  const [hasError, setHasError] = useState(false);

  // Listen for RTVI server messages
  useRTVIClientEvent(RTVIEvent.ServerMessage, (message: any) => {
    try {
      // Check if this is a property search result
      if (message?.data?.type === 'property_search_results') {
        console.log('📍 Received property search results:', message.data);
        setSearchResults(message.data);
        setHasError(false);
      } else if (message?.data?.type === 'property_search_error') {
        console.error('❌ Property search error:', message.data.error);
        setHasError(true);
        setSearchResults(null);
      }
    } catch (error) {
      console.error('🚨 Error processing server message:', error);
      setHasError(true);
    }
  });

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/" 
          element={<Index searchResults={searchResults} hasError={hasError} />} 
        />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <PipecatClientProvider client={pipecatClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        {/* Add PipecatClientAudio for bot audio playback */}
        <PipecatClientAudio />
        <AppContent />
      </TooltipProvider>
    </PipecatClientProvider>
  </QueryClientProvider>
);

export default App;