import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff } from "lucide-react";

interface ConnectButtonProps {
  onConnect?: (connected: boolean) => void;
  className?: string;
}

export function ConnectButton({ onConnect, className }: ConnectButtonProps) {
  const [isConnected, setIsConnected] = useState(true);

  const handleConnect = () => {
    const newConnectedState = !isConnected;
    setIsConnected(newConnectedState);
    if (onConnect) {
      onConnect(newConnectedState);
    }
  };

  return (
    <Button
      onClick={handleConnect}
      variant={isConnected ? "destructive" : "default"}
      className={className}
    >
      {isConnected ? (
        <>
          <PhoneOff className="w-4 h-4 mr-2" />
          Disconnect
        </>
      ) : (
        <>
          <Phone className="w-4 h-4 mr-2" />
          Connect
        </>
      )}
    </Button>
  );
}