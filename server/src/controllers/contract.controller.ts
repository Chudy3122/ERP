import { Request, Response } from 'express';
import contractService from '../services/contract.service';
import contractPdfService from '../services/contractPdf.service';
import { ContractStatus } from '../models/Contract.model';

export class ContractController {
  /**
   * Create new contract
   * POST /api/contracts
   */
  async createContract(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const contract = await contractService.createContract(req.body, userId);
      res.status(201).json(contract);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  /**
   * Get all contracts with filters
   * GET /api/contracts
   */
  async getAllContracts(req: Request, res: Response): Promise<void> {
    try {
      const filters = {
        status: req.query.status as ContractStatus,
        client_id: req.query.client_id as string,
        search: req.query.search as string,
        start_date: req.query.start_date ? new Date(req.query.start_date as string) : undefined,
        end_date: req.query.end_date ? new Date(req.query.end_date as string) : undefined,
        expiring_within_days: req.query.expiring_within_days
          ? parseInt(req.query.expiring_within_days as string, 10)
          : undefined,
      };

      const contracts = await contractService.getAllContracts(filters);
      res.json(contracts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * Get contract statistics
   * GET /api/contracts/statistics
   */
  async getStatistics(req: Request, res: Response): Promise<void> {
    try {
      const stats = await contractService.getStatistics();
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * Get expiring contracts
   * GET /api/contracts/expiring
   */
  async getExpiringContracts(req: Request, res: Response): Promise<void> {
    try {
      const days = req.query.days ? parseInt(req.query.days as string, 10) : 30;
      const contracts = await contractService.getExpiringContracts(days);
      res.json(contracts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * Get contract by ID
   * GET /api/contracts/:id
   */
  async getContractById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const contract = await contractService.getContractById(id);
      res.json(contract);
    } catch (error: any) {
      res.status(404).json({ message: error.message });
    }
  }

  /**
   * Update contract
   * PUT /api/contracts/:id
   */
  async updateContract(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      const contract = await contractService.updateContract(id, req.body, userId);
      res.json(contract);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  /**
   * Delete contract
   * DELETE /api/contracts/:id
   */
  async deleteContract(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      await contractService.deleteContract(id, userId);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  /**
   * Update contract status
   * PATCH /api/contracts/:id/status
   */
  async updateStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const userId = req.user!.userId;

      if (!status || !Object.values(ContractStatus).includes(status)) {
        res.status(400).json({ message: 'Nieprawidłowy status' });
        return;
      }

      const contract = await contractService.updateStatus(id, status, userId);
      res.json(contract);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  /**
   * Download contract as PDF
   * GET /api/contracts/:id/pdf
   */
  async downloadPdf(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const contract = await contractService.getContractById(id);
      const pdfBuffer = await contractPdfService.generateContractPdf(contract);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${contract.contract_number.replace(/\//g, '-')}.pdf"`
      );
      res.setHeader('Content-Length', pdfBuffer.length);

      res.send(pdfBuffer);
    } catch (error: any) {
      console.error('[PDF] Error generating contract PDF:', error);
      res.status(400).json({ message: error.message });
    }
  }

  // ==================== ATTACHMENTS ====================

  /**
   * Get contract attachments
   * GET /api/contracts/:id/attachments
   */
  async getAttachments(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const attachments = await contractService.getAttachments(id);
      res.json(attachments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * Upload attachment
   * POST /api/contracts/:id/attachments
   */
  async uploadAttachment(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      if (!req.file) {
        res.status(400).json({ message: 'Brak pliku' });
        return;
      }

      const attachment = await contractService.addAttachment(id, req.file, userId);
      res.status(201).json(attachment);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  /**
   * Delete attachment
   * DELETE /api/contracts/:id/attachments/:attachmentId
   */
  async deleteAttachment(req: Request, res: Response): Promise<void> {
    try {
      const { attachmentId } = req.params;
      const userId = req.user!.userId;
      await contractService.deleteAttachment(attachmentId, userId);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  /**
   * Send expiring contract notifications
   * POST /api/contracts/send-expiring-notifications
   */
  async sendExpiringNotifications(req: Request, res: Response): Promise<void> {
    try {
      const count = await contractService.sendExpiringNotifications();
      res.json({ message: 'Powiadomienia wysłane', count });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
}

export default new ContractController();
