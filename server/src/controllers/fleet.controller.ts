import { Request, Response } from 'express';
import fs from 'fs';
import fleetService from '../services/fleet.service';
import notificationService from '../services/notification.service';
import { AppDataSource } from '../config/database';
import { User } from '../models/User.model';
import { cloudinary } from '../config/cloudinary';

/** Upload an optional vehicle photo to Cloudinary; returns the secure URL or undefined. */
async function uploadVehicleImage(file?: Express.Multer.File): Promise<string | undefined> {
  if (!file) return undefined;
  try {
    const result = await cloudinary.uploader.upload(file.path, {
      folder: 'erp-vehicles',
      transformation: [
        { width: 1200, height: 900, crop: 'limit' },
        { quality: 'auto', fetch_format: 'auto' },
      ],
    });
    return result.secure_url;
  } finally {
    try { fs.unlinkSync(file.path); } catch { /* ignore */ }
  }
}

function parseIntOrNull(v: any): number | null {
  if (v === undefined || v === null || v === '') return null;
  const n = parseInt(String(v), 10);
  return isNaN(n) ? null : n;
}

export class FleetController {
  /** GET /api/fleet/context — what the current user can do + the vehicle list */
  getContext = async (req: Request, res: Response): Promise<void> => {
    try {
      const canManage = await fleetService.canManage(req.user!.userId, req.user!.role);
      const vehicles = await fleetService.listVehicles();
      res.json({ canManage, vehicles });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  };

  /** GET /api/fleet/requests — managers: all (optional ?status); others: own */
  listRequests = async (req: Request, res: Response): Promise<void> => {
    try {
      const canManage = await fleetService.canManage(req.user!.userId, req.user!.role);
      const data = canManage
        ? await fleetService.getAll(req.query.status as string | undefined)
        : await fleetService.getMine(req.user!.userId);
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ message: e.message || 'Błąd pobierania zapotrzebowań' });
    }
  };

  createRequest = async (req: Request, res: Response): Promise<void> => {
    try {
      const request = await fleetService.create(req.body, req.user!.userId);

      // Notify fleet managers (admins + flagged) except the requester.
      try {
        const userRepo = AppDataSource.getRepository(User);
        const requester = await userRepo.findOne({ where: { id: req.user!.userId }, select: ['id', 'first_name', 'last_name'] });
        const requesterName = requester ? `${requester.first_name} ${requester.last_name}` : 'Pracownik';
        const managers = await fleetService.getManagers();
        for (const m of managers) {
          if (m.id === req.user!.userId) continue;
          await notificationService.notifyNewVehicleRequest(m.id, requesterName, request.destination, request.id, req.user!.userId);
        }
      } catch (e) {
        console.error('Fleet notify error:', e);
      }

      res.status(201).json(request);
    } catch (e: any) {
      res.status(400).json({ message: e.message || 'Błąd tworzenia zapotrzebowania' });
    }
  };

  assign = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!(await fleetService.canManage(req.user!.userId, req.user!.role))) {
        res.status(403).json({ message: 'Brak uprawnień do przydzielania pojazdów' });
        return;
      }
      const { vehicleId, notes } = req.body;
      if (!vehicleId) { res.status(400).json({ message: 'Wybierz pojazd' }); return; }
      const request = await fleetService.assign(req.params.id, vehicleId, req.user!.userId, notes);
      try {
        if (request.user_id !== req.user!.userId) {
          await notificationService.notifyVehicleRequestDecision(
            request.user_id, true, request.destination, request.vehicle?.name ?? null, request.id, req.user!.userId,
          );
        }
      } catch (e) { console.error('Fleet decision notify error:', e); }
      res.json(request);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  };

  reject = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!(await fleetService.canManage(req.user!.userId, req.user!.role))) {
        res.status(403).json({ message: 'Brak uprawnień' });
        return;
      }
      const request = await fleetService.reject(req.params.id, req.user!.userId, req.body?.notes);
      try {
        if (request.user_id !== req.user!.userId) {
          await notificationService.notifyVehicleRequestDecision(
            request.user_id, false, request.destination, null, request.id, req.user!.userId,
          );
        }
      } catch (e) { console.error('Fleet decision notify error:', e); }
      res.json(request);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  };

  deleteRequest = async (req: Request, res: Response): Promise<void> => {
    try {
      const isManager = await fleetService.canManage(req.user!.userId, req.user!.role);
      await fleetService.delete(req.params.id, req.user!.userId, isManager);
      res.status(204).send();
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  };

  // ── Vehicles (admin) ────────────────────────────────────────────────────────
  createVehicle = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!(await fleetService.canManage(req.user!.userId, req.user!.role))) { res.status(403).json({ message: 'Brak uprawnień' }); return; }
      const image_url = await uploadVehicleImage(req.file);
      const vehicle = await fleetService.createVehicle({
        name: req.body?.name,
        registration: req.body?.registration,
        year: parseIntOrNull(req.body?.year),
        seats: parseIntOrNull(req.body?.seats),
        fuel_type: req.body?.fuel_type,
        notes: req.body?.notes,
        image_url,
      });
      res.status(201).json(vehicle);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  };

  updateVehicle = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!(await fleetService.canManage(req.user!.userId, req.user!.role))) { res.status(403).json({ message: 'Brak uprawnień' }); return; }
      const image_url = await uploadVehicleImage(req.file);
      const vehicle = await fleetService.updateVehicle(req.params.id, {
        name: req.body?.name,
        registration: req.body?.registration,
        year: parseIntOrNull(req.body?.year),
        seats: parseIntOrNull(req.body?.seats),
        fuel_type: req.body?.fuel_type,
        notes: req.body?.notes,
        image_url,
      });
      res.json(vehicle);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  };

  deleteVehicle = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!(await fleetService.canManage(req.user!.userId, req.user!.role))) { res.status(403).json({ message: 'Brak uprawnień' }); return; }
      await fleetService.deleteVehicle(req.params.id);
      res.status(204).send();
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  };

  // ── Reminders ─────────────────────────────────────────────────────────────--
  private async requireManager(req: Request, res: Response): Promise<boolean> {
    if (await fleetService.canManage(req.user!.userId, req.user!.role)) return true;
    res.status(403).json({ message: 'Brak uprawnień' });
    return false;
  }

  listReminders = async (req: Request, res: Response): Promise<void> => {
    try { res.json(await fleetService.listReminders(req.params.id)); }
    catch (e: any) { res.status(400).json({ message: e.message }); }
  };

  addReminder = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!(await this.requireManager(req, res))) return;
      res.status(201).json(await fleetService.addReminder(req.params.id, req.body));
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  };

  deleteReminder = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!(await this.requireManager(req, res))) return;
      await fleetService.deleteReminder(req.params.id);
      res.status(204).send();
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  };

  // ── Service / expense log ─────────────────────────────────────────────────--
  listLog = async (req: Request, res: Response): Promise<void> => {
    try { res.json(await fleetService.listLog(req.params.id)); }
    catch (e: any) { res.status(400).json({ message: e.message }); }
  };

  addLogEntry = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!(await this.requireManager(req, res))) return;
      res.status(201).json(await fleetService.addLogEntry(req.params.id, req.body, req.user!.userId));
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  };

  deleteLogEntry = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!(await this.requireManager(req, res))) return;
      await fleetService.deleteLogEntry(req.params.id);
      res.status(204).send();
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  };
}

export default new FleetController();
