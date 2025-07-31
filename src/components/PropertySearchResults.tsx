import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PropertyCard } from "./PropertyCard";
import { Search, Filter, Clock, CheckCircle, AlertCircle, Heart } from "lucide-react";

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
    ai_analysis_raw: string | null;
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

interface PropertySearchResultsProps {
  searchResults: SearchResultData | null;
  hasError: boolean;
}

export function PropertySearchResults({ searchResults, hasError }: PropertySearchResultsProps) {
  const [displayCount, setDisplayCount] = useState(6); // Show 6 properties initially
  
  // Show cute error message
  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="w-16 h-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">Oops! Something went wrong</h3>
        <p className="text-muted-foreground mb-4">
          Our property search got a little lost. Maybe try asking again? 🏠✨
        </p>
      </div>
    );
  }

  // Show empty state when no results
  if (!searchResults) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Heart className="w-16 h-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">Ready to find your dream home?</h3>
        <p className="text-muted-foreground">
          Just ask me to search for properties and I'll find the perfect matches! 🏡
        </p>
      </div>
    );
  }

  const { data } = { data: searchResults };
  const propertiesShown = data.properties.slice(0, displayCount);
  const hasMoreProperties = data.properties.length > displayCount;

  const handleLoadMore = () => {
    setDisplayCount(prev => Math.min(prev + 6, data.properties.length));
  };

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Search className="w-5 h-5 text-primary" />
              <CardTitle>Search Results</CardTitle>
            </div>
            <Badge variant="outline" className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              {data.summary.search_type}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium">Query:</span> "{data.query}"
            </p>
            
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Total found:</span>
                <Badge variant="secondary">{data.summary.total_found}</Badge>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Showing:</span>
                <Badge variant="secondary">{displayCount}</Badge>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-muted-foreground" />
                <span className="text-muted-foreground">{data.summary.execution_time}s</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-1" />
                Refine Search
              </Button>
              <Button variant="outline" size="sm">
                Save Search
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Properties Grid */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {propertiesShown.map((property) => (
          <PropertyCard key={property.id} property={property} />
        ))}
      </div>

      {/* Load More */}
      {hasMoreProperties && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={handleLoadMore}>
            Load More Properties ({data.properties.length - displayCount} remaining)
          </Button>
        </div>
      )}
    </div>
  );
}