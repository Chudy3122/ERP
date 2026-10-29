import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { RemoteDevice } from '../models/RemoteDevice.model';
import { RemoteSession, RemoteSessionStatus } from '../models/RemoteSession.model';
import { User } from '../models/User.model';
import notificationService from '../services/notification.service';
import { NotificationType, NotificationPriority } from '../models/Notification.model';

const deviceRepo = () => AppDataSource.getRepository(RemoteDevice);
const sessionRepo = () => AppDataSource.getRepository(RemoteSession);
const userRepo = () => AppDataSource.getRepository(User);

const cleanStr = (v: unknown): string | null => {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t.length ? t : null;
};

/** IT support staff = admins, or members of an "IT" department. */
async function isHelper(userId: string): Promise<boolean> {
  const u = await userRepo().findOne({ where: { id: userId }, select: ['id', 'role', 'department'] });
  if (!u) return false;
  if (u.role === 'admin') return true;
  const dept = (u.department || '').toLowerCase();
  return dept === 'it' || dept.includes('informatyk') || /dzia(ł|l)\s*it/.test(dept);
}

async function helperUserIds(): Promise<string[]> {
  const admins = await userRepo().find({ where: { role: 'admin' as any, is_active: true }, select: ['id'] });
  const itDept = await userRepo()
    .createQueryBuilder('u')
    .select('u.id', 'id')
    .where('u.is_active = true')
    .andWhere("(lower(u.department) = 'it' OR lower(u.department) LIKE '%informatyk%' OR lower(u.department) LIKE 'dzia_ it')")
    .getRawMany();
  return [...new Set([...admins.map((a) => a.id), ...itDept.map((d) => d.id)])];
}

class RemoteSupportController {
  /** Tells the frontend whether to show the IT view or the employee view. */
  async getContext(req: Request, res: Response): Promise<void> {
    try {
      const isIt = await isHelper(req.user!.userId);
      res.json({ isIt });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  }

  // ───────────────────────── Devices (IT only) ─────────────────────────
  async listDevices(req: Request, res: Response): Promise<void> {
    try {
      if (!(await isHelper(req.user!.userId))) { res.status(403).json({ message: 'Tylko IT' }); return; }
      const devices = await deviceRepo().find({ relations: ['user'], order: { created_at: 'DESC' } });
      res.json(devices);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  }

  async createDevice(req: Request, res: Response): Promise<void> {
    try {
      if (!(await isHelper(req.user!.userId))) { res.status(403).json({ message: 'Tylko IT' }); return; }
      const user_id = cleanStr(req.body?.user_id);
      const rustdesk_id = cleanStr(req.body?.rustdesk_id);
      if (!user_id || !rustdesk_id) { res.status(400).json({ message: 'Pracownik i ID RustDesk są wymagane' }); return; }
      const device = deviceRepo().create({
        user_id,
        rustdesk_id,
        label: cleanStr(req.body?.label) || 'Komputer',
        access_password: cleanStr(req.body?.access_password),
        notes: cleanStr(req.body?.notes),
      });
      await deviceRepo().save(device);
      const full = await deviceRepo().findOne({ where: { id: device.id }, relations: ['user'] });
      res.status(201).json(full);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  }

  async updateDevice(req: Request, res: Response): Promise<void> {
    try {
      if (!(await isHelper(req.user!.userId))) { res.status(403).json({ message: 'Tylko IT' }); return; }
      const device = await deviceRepo().findOne({ where: { id: req.params.id } });
      if (!device) { res.status(404).json({ message: 'Nie znaleziono' }); return; }
      if (req.body?.user_id !== undefined) device.user_id = cleanStr(req.body.user_id) || device.user_id;
      if (req.body?.rustdesk_id !== undefined) device.rustdesk_id = cleanStr(req.body.rustdesk_id) || device.rustdesk_id;
      if (req.body?.label !== undefined) device.label = cleanStr(req.body.label) || 'Komputer';
      if (req.body?.access_password !== undefined) device.access_password = cleanStr(req.body.access_password);
      if (req.body?.notes !== undefined) device.notes = cleanStr(req.body.notes);
      await deviceRepo().save(device);
      const full = await deviceRepo().findOne({ where: { id: device.id }, relations: ['user'] });
      res.json(full);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  }

  async deleteDevice(req: Request, res: Response): Promise<void> {
    try {
      if (!(await isHelper(req.user!.userId))) { res.status(403).json({ message: 'Tylko IT' }); return; }
      const r = await deviceRepo().delete(req.params.id);
      if (!r.affected) { res.status(404).json({ message: 'Nie znaleziono' }); return; }
      res.json({ success: true });
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  }

  // ───────────────────────── Sessions ─────────────────────────
  /** Employee requests remote help. */
  async requestHelp(req: Request, res: Response): Promise<void> {
    try {
      const requesterId = req.user!.userId;
      const session = sessionRepo().create({
        requester_id: requesterId,
        status: RemoteSessionStatus.REQUESTED,
        reason: cleanStr(req.body?.reason),
        ticket_id: cleanStr(req.body?.ticket_id),
        device_id: cleanStr(req.body?.device_id),
      });
      await sessionRepo().save(session);

      // Notify IT staff.
      try {
        const requester = await userRepo().findOne({ where: { id: requesterId }, select: ['first_name', 'last_name'] });
        const name = requester ? `${requester.first_name} ${requester.last_name}` : 'Pracownik';
        const recipients = await helperUserIds();
        for (const rid of recipients) {
          if (rid === requesterId) continue;
          await notificationService.createNotification({
            userId: rid,
            type: NotificationType.REMOTE_SUPPORT_REQUEST,
            title: 'Prośba o pomoc zdalną',
            message: `${name} prosi o pomoc zdalną${session.reason ? `: ${session.reason}` : ''}`,
            actionUrl: '/remote-support',
            priority: NotificationPriority.HIGH,
            relatedUserId: requesterId,
            relatedEntityType: 'remote_session',
            relatedEntityId: session.id,
          });
        }
      } catch (e) { console.error('Remote support notify error:', e); }

      res.status(201).json(session);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  }

  /** Employee: my own requests/sessions. */
  async mySessions(req: Request, res: Response): Promise<void> {
    try {
      const sessions = await sessionRepo().find({
        where: { requester_id: req.user!.userId },
        relations: ['helper'],
        order: { created_at: 'DESC' },
        take: 20,
      });
      res.json(sessions);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  }

  /** IT: list sessions (open requests + history). */
  async listSessions(req: Request, res: Response): Promise<void> {
    try {
      if (!(await isHelper(req.user!.userId))) { res.status(403).json({ message: 'Tylko IT' }); return; }
      const qb = sessionRepo().createQueryBuilder('s')
        .leftJoinAndSelect('s.requester', 'requester')
        .leftJoinAndSelect('s.helper', 'helper')
        .leftJoinAndSelect('s.device', 'device')
        .orderBy('s.created_at', 'DESC')
        .take(100);
      if (req.query.status) qb.where('s.status = :st', { st: req.query.status });
      res.json(await qb.getMany());
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  }

  /** IT: start a session directly (without a prior request). */
  async startSession(req: Request, res: Response): Promise<void> {
    try {
      const helperId = req.user!.userId;
      if (!(await isHelper(helperId))) { res.status(403).json({ message: 'Tylko IT' }); return; }
      const session = sessionRepo().create({
        helper_id: helperId,
        requester_id: cleanStr(req.body?.requester_id),
        device_id: cleanStr(req.body?.device_id),
        ticket_id: cleanStr(req.body?.ticket_id),
        reason: cleanStr(req.body?.reason),
        status: RemoteSessionStatus.IN_PROGRESS,
        started_at: new Date(),
      });
      await sessionRepo().save(session);
      res.status(201).json(session);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  }

  /** IT: accept a pending request (marks it in progress). */
  async acceptSession(req: Request, res: Response): Promise<void> {
    try {
      const helperId = req.user!.userId;
      if (!(await isHelper(helperId))) { res.status(403).json({ message: 'Tylko IT' }); return; }
      const session = await sessionRepo().findOne({ where: { id: req.params.id } });
      if (!session) { res.status(404).json({ message: 'Nie znaleziono' }); return; }
      session.helper_id = helperId;
      session.status = RemoteSessionStatus.IN_PROGRESS;
      if (!session.started_at) session.started_at = new Date();
      if (req.body?.device_id !== undefined) session.device_id = cleanStr(req.body.device_id);
      await sessionRepo().save(session);
      res.json(session);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  }

  /** IT: close a session with a resolution note. */
  async closeSession(req: Request, res: Response): Promise<void> {
    try {
      if (!(await isHelper(req.user!.userId))) { res.status(403).json({ message: 'Tylko IT' }); return; }
      const session = await sessionRepo().findOne({ where: { id: req.params.id } });
      if (!session) { res.status(404).json({ message: 'Nie znaleziono' }); return; }
      session.status = RemoteSessionStatus.CLOSED;
      session.ended_at = new Date();
      if (req.body?.resolution_note !== undefined) session.resolution_note = cleanStr(req.body.resolution_note);
      await sessionRepo().save(session);
      res.json(session);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  }

  /** Requester cancels their own pending request. */
  async cancelSession(req: Request, res: Response): Promise<void> {
    try {
      const session = await sessionRepo().findOne({ where: { id: req.params.id } });
      if (!session) { res.status(404).json({ message: 'Nie znaleziono' }); return; }
      const me = req.user!.userId;
      if (session.requester_id !== me && !(await isHelper(me))) { res.status(403).json({ message: 'Brak uprawnień' }); return; }
      session.status = RemoteSessionStatus.CANCELLED;
      session.ended_at = new Date();
      await sessionRepo().save(session);
      res.json(session);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  }
}

export default new RemoteSupportController();
