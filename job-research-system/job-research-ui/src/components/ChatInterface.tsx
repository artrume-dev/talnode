import { useState, useRef, useEffect } from 'react';
import { useJobStore } from '../store/jobStore';
import { useUserStore } from '../store/userStore';
import { PromptInput } from './PromptInput';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { MessageSquare, X, Sparkles, Briefcase, Filter } from 'lucide-react';
import type { ChatMessage } from '../types';

interface ChatInterfaceProps {
  onClose?: () => void;
}

export function ChatInterface({ onClose }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I can help you find jobs, analyze roles, and optimize your CV. What would you like to do?',
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { jobs, setJobs, setFilters, setSearchQuery } = useJobStore();
  const { activeCVId } = useUserStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handlePromptSubmit = async (prompt: string) => {
    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: prompt,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Parse intent from prompt
      const lowerPrompt = prompt.toLowerCase();
      let responseContent = '';

      // Handle different types of queries
      if (lowerPrompt.includes('find') || lowerPrompt.includes('search') || lowerPrompt.includes('load') || lowerPrompt.includes('jobs')) {
        // Extract keywords for search
        const keywords = prompt
          .toLowerCase()
          .replace(/(find|search|load|all|jobs|for|related|show|me|the|a|an)/g, '')
          .trim();
        
        if (keywords) {
          try {
            // Call backend to search and reload jobs
            const searchResponse = await fetch('http://localhost:3001/api/tools/search_ai_jobs', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ companies: [] }), // Search all companies
            });
            
            if (searchResponse.ok) {
              // Reload jobs from database
              const jobsResponse = await fetch('http://localhost:3001/api/jobs');
              if (jobsResponse.ok) {
                const allJobs = await jobsResponse.json();
                setJobs(allJobs);
                
                // Filter jobs by keywords
                const matchingJobs = allJobs.filter((job: any) => 
                  job.title?.toLowerCase().includes(keywords) ||
                  job.description?.toLowerCase().includes(keywords) ||
                  job.tech_stack?.some((tech: string) => tech.toLowerCase().includes(keywords))
                );
                
                // Set search query to filter in UI
                setSearchQuery(keywords);
                
                responseContent = `✅ Found ${matchingJobs.length} jobs matching "${keywords}" out of ${allJobs.length} total positions. The list has been filtered to show relevant results.`;
              } else {
                throw new Error('Failed to load jobs');
              }
            } else {
              throw new Error('Failed to search jobs');
            }
          } catch (error) {
            console.error('Search error:', error);
            responseContent = `❌ Failed to search for new jobs. Searching existing ${jobs.length} jobs for "${keywords}".`;
            setSearchQuery(keywords);
            const matchingJobs = jobs.filter((job: any) => 
              job.title?.toLowerCase().includes(keywords) ||
              job.description?.toLowerCase().includes(keywords)
            );
            responseContent += ` Found ${matchingJobs.length} matching positions.`;
          }
        } else {
          // Just filter existing jobs
          setSearchQuery(prompt);
          responseContent = `I've updated the search to look for: "${prompt}". The job list now shows matching positions.`;
        }
        
        // Add response for search queries
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: responseContent,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else if (lowerPrompt.includes('analyze') || lowerPrompt.includes('fit')) {
        // Job analysis query
        if (activeCVId) {
          responseContent = 'To analyze job fit, please click on a specific job card and use the "Analyze Fit" button. I can help you understand which jobs match your skills and experience.';
        } else {
          responseContent = 'To analyze job fit, please upload your CV first. This will allow me to match jobs to your skills and experience.';
        }
      } else if (lowerPrompt.includes('optimize') || lowerPrompt.includes('cv') || lowerPrompt.includes('resume')) {
        // CV optimization query
        if (activeCVId) {
          responseContent = 'Click on any job you\'re interested in, and I\'ll generate 3 optimized versions of your CV tailored specifically for that role.';
        } else {
          responseContent = 'Please upload your CV first. Then, select a job you\'re interested in, and I\'ll create optimized versions tailored for that position.';
        }
      } else if (lowerPrompt.includes('clear') || lowerPrompt.includes('reset')) {
        // Clear filters
        setFilters({});
        setSearchQuery('');
        responseContent = 'All filters have been cleared. Showing all available jobs.';
      } else if (lowerPrompt.includes('help')) {
        // Help query
        responseContent = `I can help you with:
        
• **Find jobs**: "Find jobs at Anthropic", "Show me remote positions"
• **Filter jobs**: "High priority jobs", "Remote only", "Jobs in San Francisco"
• **Analyze fit**: "Analyze job fit for Product Manager role"
• **Optimize CV**: "Optimize my CV for this role"
• **Clear filters**: "Reset all filters"

What would you like to do?`;
      } else {
        // Generic response
        responseContent = `I understand you're asking about "${prompt}". I can help you search for jobs, analyze job fit, and optimize your CV. Try asking me to "Find jobs at [company]" or "Show remote positions".`;
      }

      // Add assistant response for non-search queries
      if (!lowerPrompt.includes('find') && !lowerPrompt.includes('search') && !lowerPrompt.includes('load')) {
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: responseContent,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">AI Assistant</CardTitle>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-4 space-y-4 overflow-hidden">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-xs font-semibold">AI Assistant</span>
                  </div>
                )}
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                <p className="text-xs opacity-70 mt-1">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2 py-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePromptSubmit('Find remote jobs')}
            disabled={isLoading}
          >
            <Filter className="h-3 w-3 mr-1" />
            Remote Jobs
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePromptSubmit('Show high priority jobs')}
            disabled={isLoading}
          >
            <Briefcase className="h-3 w-3 mr-1" />
            High Priority
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePromptSubmit('Clear all filters')}
            disabled={isLoading}
          >
            <X className="h-3 w-3 mr-1" />
            Clear Filters
          </Button>
        </div>

        {/* Input Area */}
        <div className="border-t pt-4">
          <PromptInput
            onSubmit={handlePromptSubmit}
            isLoading={isLoading}
            placeholder="Ask me to find jobs, analyze roles, or optimize your CV..."
          />
        </div>
      </CardContent>
    </Card>
  );
}
