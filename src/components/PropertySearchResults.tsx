import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PropertyCard } from "./PropertyCard";
import { Search, Filter, Clock, CheckCircle } from "lucide-react";
import property1 from "@/assets/property-1.jpg";
import property2 from "@/assets/property-2.jpg";

interface SearchResult {
  label: string;
  type: string;
  data: {
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
  };
}

interface PropertySearchResultsProps {
  searchQuery?: string;
}

export function PropertySearchResults({ searchQuery }: PropertySearchResultsProps) {
  // Sample data based on the provided structure
  const [searchResults] = useState<SearchResult>({
    label: "rtvi-ai",
    type: "server-message",
    data: {
      type: "property_search_results",
      timestamp: Date.now() / 1000,
      search_id: "550e8400-e29b-41d4-a716-446655440000",
      query: searchQuery || "Find me a house with good fencing",
      summary: {
        total_found: 15,
        showing: 5,
        execution_time: 2.34,
        search_type: "hybrid"
      },
      filters_applied: {
        min_price: null,
        max_price: null,
        bedrooms: null,
        bathrooms: null,
        property_type: null,
        location_keywords: null,
        mls_genuine: null
      },
      properties: [
        {
          id: "507f1f77bcf86cd799439011",
          url: "https://realtor.com/property/123-main-st",
          images: {
            primary: property1,
            all: [property1]
          },
          details: {
            address: "123 Main Street, Springfield, IL 62701",
            price: 450000,
            currency: "USD",
            bedrooms: "3",
            bathrooms: "2",
            type: "Single Family Home",
            description: "Beautiful home with excellent fencing and well-maintained yard. Features include modern kitchen, spacious living areas, and a large backyard perfect for families."
          },
          metadata: {
            search_score: 0.8945,
            mls_genuine: true,
            status: "active"
          }
        },
        {
          id: "507f1f77bcf86cd799439012", 
          url: "https://realtor.com/property/456-oak-ave",
          images: {
            primary: property2,
            all: [property2]
          },
          details: {
            address: "456 Oak Avenue, Springfield, IL 62702",
            price: 380000,
            currency: "USD",
            bedrooms: "4",
            bathrooms: "3",
            type: "Single Family Home",
            description: "Spacious family home with privacy fencing and large backyard. Updated throughout with modern amenities and excellent curb appeal."
          },
          metadata: {
            search_score: 0.8721,
            mls_genuine: true,
            status: "active"
          }
        }
      ]
    }
  });

  const { data } = searchResults;

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
                <Badge variant="secondary">{data.summary.showing}</Badge>
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
        {data.properties.map((property) => (
          <PropertyCard key={property.id} property={property} />
        ))}
      </div>

      {/* Load More */}
      {data.summary.total_found > data.summary.showing && (
        <div className="flex justify-center">
          <Button variant="outline">
            Load More Properties ({data.summary.total_found - data.summary.showing} remaining)
          </Button>
        </div>
      )}
    </div>
  );
}