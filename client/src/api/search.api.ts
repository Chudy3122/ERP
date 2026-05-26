import api from './axios-config';

export interface SearchResult {
  id: string;
  type: 'project' | 'task' | 'ticket' | 'invoice' | 'contract' | 'client' | 'procedure' | 'employee';
  title: string;
  subtitle: string;
  href: string;
}

export interface SearchResponse {
  results: SearchResult[];
}

export const globalSearch = async (q: string): Promise<SearchResult[]> => {
  const { data } = await api.get<SearchResponse>('/search', { params: { q } });
  return data.results;
};
