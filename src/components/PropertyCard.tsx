import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ExternalLink, Bed, Bath, MapPin, ImageIcon, Key } from "lucide-react";
import { useState } from "react";

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
  aiAnalysis?: string | null;
}

export function PropertyCard({ property, aiAnalysis }: PropertyCardProps) {
  const { details, metadata, url, images } = property;
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: details.currency,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
  };

  return (
    <Card className="group hover:shadow-[var(--shadow-property-hover)] transition-all duration-300 bg-property-card hover:bg-property-card-hover border-border">
      <div className="relative">
        {/* Image Loading State */}
        {imageLoading && (
          <div className="w-full h-48 bg-muted rounded-t-lg flex items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
              <span className="text-xs">Loading image...</span>
            </div>
          </div>
        )}
        
        {/* Image Error State */}
        {imageError && (
          <div className="w-full h-48 bg-muted rounded-t-lg flex items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <ImageIcon className="w-8 h-8" />
              <span className="text-xs">Image unavailable</span>
            </div>
          </div>
        )}

        {/* Actual Image */}
        <img
          src={images.primary}
          alt={details.address}
          className={`w-full h-48 object-cover rounded-t-lg transition-opacity duration-200 ${
            imageLoading || imageError ? 'opacity-0 absolute' : 'opacity-100'
          }`}
          onLoad={handleImageLoad}
          onError={handleImageError}
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
        
        <div className="mb-3">
          <p className={`text-sm text-muted-foreground ${
            isDescriptionExpanded ? '' : 'line-clamp-2'
          }`}>
            {details.description}
          </p>
          {details.description && details.description.length > 100 && (
            <button
              onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
              className="text-xs text-primary hover:underline mt-1"
            >
              {isDescriptionExpanded ? 'Read less' : 'Read more'}
            </button>
          )}
        </div>
        
        <div className="flex justify-end mt-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                <Key className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>AI Property Analysis</DialogTitle>
              </DialogHeader>
              <div className="max-h-96 overflow-y-auto">
                <p className="text-sm whitespace-pre-wrap">
                  {aiAnalysis || "No AI analysis available for this property."}
                </p>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}