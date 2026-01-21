import apiClient from './axios-config';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  message: string;
}

/**
 * Send message to AI assistant
 */
export const sendMessage = async (messages: ChatMessage[]): Promise<string> => {
  const response = await apiClient.post<{ success: boolean; data: ChatResponse }>('/ai/chat', {
    messages,
  });
  return response.data.data.message;
};

export default {
  sendMessage,
};
