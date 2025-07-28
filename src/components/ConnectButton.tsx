import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff } from "lucide-react";
import { usePipecatClient, useRTVIClientEvent } from "@pipecat-ai/client-react";
import { RTVIEvent, TransportState } from "@pipecat-ai/client-js";
import { useToast } from "@/hooks/use-toast";

interface ConnectionButtonProps {
  onConnectionChange?: (isConnected: boolean) => void;
}

export function ConnectionButton({ onConnectionChange }: ConnectionButtonProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [transportState, setTransportState] = useState<TransportState>("disconnected");
  const { toast } = useToast();
  
  const pipecatClient = usePipecatClient();

  // Helper function to determine if we're in a "connected" state
  const isConnectedState = (state: TransportState): boolean => {
    return state === "connected" || state === "ready";
  };

  // Listen to transport state changes
  useRTVIClientEvent(
    RTVIEvent.TransportStateChanged,
    useCallback((state: TransportState) => {
      console.log("🔄 Transport state changed to:", state);
      setTransportState(state);
      
      // Reset connecting state when we reach a final state
      if (state === "connected" || state === "ready" || state === "disconnected" || state === "error") {
        setIsConnecting(false);
      }

      // ✅ FIX: Consider both "connected" AND "ready" as connected
      const connected = isConnectedState(state);
      
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
      
      // Updated to match the simplified backend endpoint
      await pipecatClient.connect({
        endpoint: `${import.meta.env.VITE_PIPECAT_API_URL || "https://manjujayamurali--secondbrain-realestate-fastapi-app.modal.run/connect"}`,
        requestData: {
          // This matches the ConnectData model in the backend
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
    const connected = isConnectedState(transportState);
    if (connected) {
      handleDisconnect();
    } else {
      handleConnect();
    }
  };

  const connected = isConnectedState(transportState);
  const isConnectingOrInitializing = transportState === "connecting" || 
                                    transportState === "initializing" || 
                                    transportState === "initialized" || 
                                    transportState === "authenticating" || 
                                    transportState === "authenticated";
  const isDisabled = isConnecting || isConnectingOrInitializing;

  return (
    <div className="flex flex-col items-center gap-4">
      <Button
        onClick={handleToggleConnection}
        disabled={isDisabled}
        variant={connected ? "disconnect" : "connect"}
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
        ) : connected ? (
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
          {connected 
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