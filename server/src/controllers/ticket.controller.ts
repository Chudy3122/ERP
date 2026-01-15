import { Request, Response } from 'express';
import ticketService from '../services/ticket.service';
import { TicketType, TicketStatus, TicketPriority } from '../models/Ticket.model';

export class TicketController {
  /**
   * Create new ticket
   * POST /api/tickets
   */
  async createTicket(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const ticket = await ticketService.createTicket(req.body, userId);
      res.status(201).json(ticket);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  /**
   * Get all tickets with filters
   * GET /api/tickets
   */
  async getAllTickets(req: Request, res: Response): Promise<void> {
    try {
      const filters = {
        type: req.query.type as TicketType,
        status: req.query.status as TicketStatus,
        priority: req.query.priority as TicketPriority,
        createdBy: req.query.createdBy as string,
        assignedTo: req.query.assignedTo as string,
        category: req.query.category as string,
        projectId: req.query.projectId as string,
        search: req.query.search as string,
      };

      const result = await ticketService.getAllTickets(filters);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * Get user's tickets
   * GET /api/tickets/my
   */
  async getUserTickets(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const tickets = await ticketService.getUserTickets(userId);
      res.json(tickets);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * Get tickets assigned to user
   * GET /api/tickets/assigned
   */
  async getAssignedTickets(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const tickets = await ticketService.getAssignedTickets(userId);
      res.json(tickets);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * Get ticket by ID
   * GET /api/tickets/:id
   */
  async getTicketById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const ticket = await ticketService.getTicketById(id);
      res.json(ticket);
    } catch (error: any) {
      res.status(404).json({ message: error.message });
    }
  }

  /**
   * Update ticket
   * PUT /api/tickets/:id
   */
  async updateTicket(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      const ticket = await ticketService.updateTicket(id, req.body, userId);
      res.json(ticket);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  /**
   * Assign ticket
   * PUT /api/tickets/:id/assign
   */
  async assignTicket(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { userId: assigneeId } = req.body;
      const assignedBy = req.user!.userId;

      const ticket = await ticketService.assignTicket(id, assigneeId, assignedBy);
      res.json(ticket);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  /**
   * Update ticket status
   * PUT /api/tickets/:id/status
   */
  async updateTicketStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const userId = req.user!.userId;

      const ticket = await ticketService.updateTicketStatus(id, status as TicketStatus, userId);
      res.json(ticket);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  /**
   * Delete ticket
   * DELETE /api/tickets/:id
   */
  async deleteTicket(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      await ticketService.deleteTicket(id, userId);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  /**
   * Add comment to ticket
   * POST /api/tickets/:id/comments
   */
  async addTicketComment(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { content, isInternal } = req.body;
      const userId = req.user!.userId;

      const comment = await ticketService.addTicketComment(id, userId, content, isInternal || false);
      res.status(201).json(comment);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  /**
   * Get ticket comments
   * GET /api/tickets/:id/comments
   */
  async getTicketComments(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const includeInternal = req.query.includeInternal === 'true';

      const comments = await ticketService.getTicketComments(id, includeInternal);
      res.json(comments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * Get ticket statistics
   * GET /api/tickets/statistics
   */
  async getTicketStatistics(req: Request, res: Response): Promise<void> {
    try {
      const stats = await ticketService.getTicketStatistics();
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
}

export default new TicketController();
