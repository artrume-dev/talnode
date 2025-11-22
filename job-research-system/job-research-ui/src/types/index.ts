export interface Job {
  id: string;
  job_id: string;
  company: string;
  title: string;
  url: string;
  description?: string;
  requirements?: string;
  tech_stack?: string;
  location?: string;
  remote?: boolean;
  posted_date?: string;
  found_date: string;
  status: 'new' | 'reviewed' | 'applied' | 'rejected' | 'interview' | 'archived';
  priority?: 'high' | 'medium' | 'low';
  alignment_score?: number;
  strong_matches?: string[];
  gaps?: string[];
  notes?: string;
  last_updated?: string;
}

export interface JobAnalysis {
  job_id: string;
  alignment_score: number;
  strong_matches: string[];
  gaps: string[];
  recommendations: string[];
}

export interface ApplicationStats {
  total: number;
  by_status: Record<string, number>;
  by_company: Record<string, number>;
  high_priority: number;
  avg_alignment: number;
}

export interface MCPToolCall {
  tool: string;
  arguments: Record<string, any>;
}

export interface MCPResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  tool_calls?: MCPToolCall[];
  tool_results?: any[];
}
