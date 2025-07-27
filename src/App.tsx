import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PipecatClientProvider, PipecatClientAudio } from "@pipecat-ai/client-react";
import { PipecatClient } from "@pipecat-ai/client-js";
import { DailyTransport } from "@pipecat-ai/daily-transport";
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

const AppContent = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
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