import { useState, useEffect } from 'react';
import { useJobStore } from '../store/jobStore';
import { useUIStore } from '../store/uiStore';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { Plus, Search, X, Building2, RefreshCw } from 'lucide-react';

interface Company {
  id: number;
  company_name: string;
  careers_url: string;
  ats_type: string;
  greenhouse_id?: string;
  lever_id?: string;
  is_active: boolean;
  added_by_user: boolean;
}

export function CompanySelector() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { selectedCompanies, toggleCompany, selectAllCompanies, deselectAllCompanies, loadJobs } = useJobStore();
  const { openAddCompanyModal, closeCompanySelector } = useUIStore();

  // Fetch companies from API
  useEffect(() => {
    fetchCompanies();
  }, []);

  // Filter companies based on search
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredCompanies(companies);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = companies.filter((company) =>
        company.company_name.toLowerCase().includes(query)
      );
      setFilteredCompanies(filtered);
    }
  }, [searchQuery, companies]);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('http://localhost:3001/api/companies');

      if (!response.ok) {
        throw new Error('Failed to fetch companies');
      }

      const data = await response.json();
      setCompanies(data.companies || []);
      setFilteredCompanies(data.companies || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load companies');
      console.error('Error fetching companies:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    const allCompanyNames = companies
      .filter((c) => c.is_active)
      .map((c) => c.company_name);
    selectAllCompanies(allCompanyNames);
  };

  const handleDeselectAll = () => {
    deselectAllCompanies();
  };

  const handleToggleCompany = (companyName: string) => {
    toggleCompany(companyName);
  };

  const isAllSelected = companies.length > 0 &&
    selectedCompanies.length === companies.filter((c) => c.is_active).length;

  const handleAddCustomCompany = () => {
    openAddCompanyModal();
  };

  const handleFindJobs = async () => {
    try {
      setScraping(true);
      setError(null);
      
      // Get company IDs from selected company names
      const selectedCompanyIds = companies
        .filter((c) => selectedCompanies.includes(c.company_name))
        .map((c) => c.id);

      const response = await fetch('http://localhost:3001/api/companies/find-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_ids: selectedCompanyIds }),
      });

      if (!response.ok) {
        throw new Error('Failed to find jobs');
      }

      const data = await response.json();
      
      // Reload jobs to show new results
      await loadJobs();
      
      // Show success message (you could add a toast notification here)
      console.log(data.message);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to find jobs');
      console.error('Error finding jobs:', err);
    } finally {
      setScraping(false);
    }
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Select Companies</CardTitle>
          <CardDescription>Loading companies...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Select Companies</CardTitle>
          <CardDescription className="text-red-500">{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={fetchCompanies} variant="outline">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Select Companies
            </CardTitle>
            <CardDescription>
              Choose from {companies.length} AI companies or add your own
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={closeCompanySelector}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search and Actions */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search companies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={isAllSelected ? handleDeselectAll : handleSelectAll}
          >
            {isAllSelected ? 'Deselect All' : 'Select All'}
          </Button>
        </div>

        {/* Selected Count */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {selectedCompanies.length} selected
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={handleFindJobs}
              disabled={selectedCompanies.length === 0 || scraping}
              className="gap-1"
            >
              {scraping ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Finding Jobs...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  Find Jobs
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddCustomCompany}
              className="gap-1"
            >
              <Plus className="h-4 w-4" />
              Add Custom Company
            </Button>
          </div>
        </div>

        {/* Companies Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
          {filteredCompanies.length === 0 ? (
            <div className="col-span-full text-center py-8 text-muted-foreground">
              No companies found matching "{searchQuery}"
            </div>
          ) : (
            filteredCompanies.map((company) => {
              const isSelected = selectedCompanies.includes(company.company_name);

              return (
                <label
                  key={company.id}
                  className={`
                    flex items-start gap-3 p-3 rounded-lg border cursor-pointer
                    transition-all hover:border-primary hover:bg-accent
                    ${isSelected ? 'border-primary bg-accent' : 'border-border'}
                    ${!company.is_active ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => handleToggleCompany(company.company_name)}
                    disabled={!company.is_active}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {company.company_name}
                    </div>
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        {company.ats_type}
                      </Badge>
                      {company.added_by_user && (
                        <Badge variant="secondary" className="text-xs">
                          Custom
                        </Badge>
                      )}
                    </div>
                  </div>
                </label>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            Select companies to search for jobs
          </p>
          <Button onClick={closeCompanySelector}>
            Done
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
