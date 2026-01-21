import { Request, Response } from 'express';
import openaiService, { ChatMessage } from '../services/openai.service';

export class AIController {
  async chat(req: Request, res: Response): Promise<void> {
    try {
      const { messages } = req.body;

      if (!messages || !Array.isArray(messages)) {
        res.status(400).json({
          success: false,
          message: 'Messages array is required',
        });
        return;
      }

      // Validate message format
      const validMessages: ChatMessage[] = messages.map((msg: any) => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: String(msg.content || ''),
      }));

      const response = await openaiService.chat(validMessages);

      res.json({
        success: true,
        data: {
          message: response,
        },
      });
    } catch (error: any) {
      console.error('AI chat error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get AI response',
      });
    }
  }
}

export default new AIController();
