import { useState, useEffect } from 'react';
import { Info, X } from 'lucide-react';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent } from './ui/card';
import api from '../services/api';

interface Domain {
  id: string;
  name: string;
  category: string;
  description: string;
}

interface DomainCategory {
  name: string;
  color: string;
  icon: string;
}

interface DomainSelectorProps {
  selectedDomains: string[];
  onDomainsChange: (domains: string[]) => void;
  showDescription?: boolean;
}

export function DomainSelector({ 
  selectedDomains, 
  onDomainsChange,
  showDescription = true 
}: DomainSelectorProps) {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [categories, setCategories] = useState<Record<string, DomainCategory>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Fetch available domains from backend
    api.get('/domains')
      .then(res => {
        setDomains(res.data.domains);
        setCategories(res.data.categories);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch domains:', err);
        setLoading(false);
      });
  }, []);

  const toggleDomain = (domainId: string) => {
    if (selectedDomains.includes(domainId)) {
      onDomainsChange(selectedDomains.filter(id => id !== domainId));
    } else {
      onDomainsChange([...selectedDomains, domainId]);
    }
  };

  const categoryList = [...new Set(domains.map(d => d.category))];

  const getCategoryIcon = (category: string) => {
    return categories[category]?.icon || '📁';
  };

  const getCategoryColor = (category: string) => {
    return categories[category]?.color || '#6366F1';
  };

  const filteredDomains = domains.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Description */}
      {showDescription && (
        <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg text-sm">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-muted-foreground">
            Select all domains where you have professional experience. This helps us identify domain mismatches and calculate accurate job fit scores.
          </p>
        </div>
      )}

      {/* Search Input */}
      <div>
        <Input
          type="text"
          placeholder="Search domains..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full"
        />
      </div>

      {/* Domain Categories */}
      <div className="space-y-4 max-h-[400px] overflow-y-auto border rounded-lg p-4">
        {categoryList.map(category => {
          const categoryDomains = filteredDomains.filter(d => d.category === category);
          const categoryInfo = categories[category];
          
          if (categoryDomains.length === 0) return null;

          return (
            <div key={category} className="space-y-3">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <span>{getCategoryIcon(category)}</span>
                <span>{categoryInfo?.name || category}</span>
              </h4>
              <div className="space-y-2 pl-2">
                {categoryDomains.map(domain => (
                  <div key={domain.id} className="flex items-start gap-3">
                    <Checkbox
                      id={domain.id}
                      checked={selectedDomains.includes(domain.id)}
                      onCheckedChange={() => toggleDomain(domain.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <Label
                        htmlFor={domain.id}
                        className="font-medium cursor-pointer"
                      >
                        {domain.name}
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {domain.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Domains Display */}
      {selectedDomains.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">
            Selected: {selectedDomains.length} domain{selectedDomains.length > 1 ? 's' : ''}
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedDomains.map(id => {
              const domain = domains.find(d => d.id === id);
              if (!domain) return null;
              
              return (
                <Badge 
                  key={id}
                  variant="secondary"
                  className="gap-2 pr-1"
                  style={{
                    borderLeft: `3px solid ${getCategoryColor(domain.category)}`
                  }}
                >
                  <span>{getCategoryIcon(domain.category)} {domain.name}</span>
                  <button
                    onClick={() => toggleDomain(id)}
                    className="ml-1 hover:text-destructive rounded p-0.5"
                    aria-label={`Remove ${domain.name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              );
            })}
          </div>
        </div>
      )}

      {/* Helpful Tip */}
      {selectedDomains.length > 0 && (
        <div className="text-xs text-muted-foreground">
          💡 Tip: Jobs in domains you haven't selected will be flagged as potential mismatches
        </div>
      )}
    </div>
  );
}

