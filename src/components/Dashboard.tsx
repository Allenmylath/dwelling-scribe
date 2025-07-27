import { useState } from "react";
import { ChatConsole } from "./ChatConsole";
import { PropertySearchResults } from "./PropertySearchResults";
import { ConnectionButton } from "./ConnectButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Home, MessageSquare, TrendingUp, Users } from "lucide-react";

export function Dashboard() {
  const [searchQuery, setSearchQuery] = useState<string>("");

  const handleSearch = (query: string) => {
    setSearchQuery(query);
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
            <ChatConsole onSearch={handleSearch} />
          </div>
        </div>
      </div>
    </div>
  );
}