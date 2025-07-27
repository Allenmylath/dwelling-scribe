import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Bed, Bath, MapPin } from "lucide-react";

interface Property {
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
}

interface PropertyCardProps {
  property: Property;
}

export function PropertyCard({ property }: PropertyCardProps) {
  const { details, metadata, url, images } = property;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: details.currency,
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <Card className="group hover:shadow-[var(--shadow-property-hover)] transition-all duration-300 bg-property-card hover:bg-property-card-hover border-border">
      <div className="relative">
        <img
          src={images.primary}
          alt={details.address}
          className="w-full h-48 object-cover rounded-t-lg"
        />
        <div className="absolute top-3 left-3 flex gap-2">
          <Badge 
            variant={metadata.status === 'active' ? 'default' : 'secondary'}
            className={metadata.status === 'active' ? 'bg-status-active hover:bg-status-active' : ''}
          >
            {metadata.status.charAt(0).toUpperCase() + metadata.status.slice(1)}
          </Badge>
          {metadata.mls_genuine && (
            <Badge variant="outline" className="bg-background/90">
              MLS Verified
            </Badge>
          )}
        </div>
        <div className="absolute top-3 right-3">
          <Badge variant="secondary" className="bg-background/90">
            Score: {Math.round(metadata.search_score * 100)}%
          </Badge>
        </div>
      </div>
      
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-lg text-price-highlight">
            {formatPrice(details.price)}
          </h3>
          <Button 
            variant="outline" 
            size="sm"
            asChild
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <a href={url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4" />
            </a>
          </Button>
        </div>
        
        <div className="flex items-center text-muted-foreground mb-2">
          <MapPin className="w-4 h-4 mr-1" />
          <span className="text-sm">{details.address}</span>
        </div>
        
        <div className="flex items-center gap-4 mb-3">
          <div className="flex items-center">
            <Bed className="w-4 h-4 mr-1 text-muted-foreground" />
            <span className="text-sm">{details.bedrooms} bed</span>
          </div>
          <div className="flex items-center">
            <Bath className="w-4 h-4 mr-1 text-muted-foreground" />
            <span className="text-sm">{details.bathrooms} bath</span>
          </div>
          <Badge variant="outline" className="text-xs">
            {details.type}
          </Badge>
        </div>
        
        <p className="text-sm text-muted-foreground line-clamp-2">
          {details.description}
        </p>
      </CardContent>
    </Card>
  );
}