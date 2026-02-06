import { Request, Response } from 'express';
import clientService from '../services/client.service';
import { ClientType } from '../models/Client.model';

export class ClientController {
  /**
   * Create new client
   * POST /api/clients
   */
  async createClient(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const client = await clientService.createClient(req.body, userId);
      res.status(201).json(client);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  /**
   * Get all clients with filters
   * GET /api/clients
   */
  async getAllClients(req: Request, res: Response): Promise<void> {
    try {
      const filters = {
        client_type: req.query.client_type as ClientType,
        is_active: req.query.is_active === 'true' ? true : req.query.is_active === 'false' ? false : undefined,
        search: req.query.search as string,
      };

      const result = await clientService.getAllClients(filters);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * Get active clients (for dropdowns)
   * GET /api/clients/active
   */
  async getActiveClients(req: Request, res: Response): Promise<void> {
    try {
      const clients = await clientService.getActiveClients();
      res.json(clients);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * Get client by ID
   * GET /api/clients/:id
   */
  async getClientById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const client = await clientService.getClientById(id);
      res.json(client);
    } catch (error: any) {
      res.status(404).json({ message: error.message });
    }
  }

  /**
   * Update client
   * PUT /api/clients/:id
   */
  async updateClient(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      const client = await clientService.updateClient(id, req.body, userId);
      res.json(client);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  /**
   * Delete client
   * DELETE /api/clients/:id
   */
  async deleteClient(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      await clientService.deleteClient(id, userId);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  /**
   * Check if NIP exists
   * GET /api/clients/check-nip/:nip
   */
  async checkNipExists(req: Request, res: Response): Promise<void> {
    try {
      const { nip } = req.params;
      const excludeId = req.query.excludeId as string;
      const exists = await clientService.checkNipExists(nip, excludeId);
      res.json({ exists });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
}

export default new ClientController();
