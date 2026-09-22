import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { CrmProjectRecord } from '../models/CrmProjectRecord.model';
import { CrmProjectParticipant } from '../models/CrmProjectParticipant.model';

const recordRepo = () => AppDataSource.getRepository(CrmProjectRecord);
const participantRepo = () => AppDataSource.getRepository(CrmProjectParticipant);

const cleanStr = (v: unknown): string | null => {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t.length ? t : null;
};

class CrmProjectController {
  /** GET /crm/records — all project records with their participants. */
  async listRecords(_req: Request, res: Response): Promise<void> {
    try {
      const records = await recordRepo().find({
        relations: ['participants'],
        order: { created_at: 'DESC' },
      });
      // Keep each project's participants in a stable, oldest-first order.
      records.forEach((r) =>
        r.participants?.sort((a, b) => a.created_at.getTime() - b.created_at.getTime()),
      );
      res.json(records);
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Błąd pobierania danych projektowych' });
    }
  }

  /** POST /crm/records — create a record for a project (upsert by project_id). */
  async createRecord(req: Request, res: Response): Promise<void> {
    try {
      const name = cleanStr(req.body?.name);
      if (!name) { res.status(400).json({ message: 'Nazwa projektu jest wymagana' }); return; }
      const projectId = cleanStr(req.body?.project_id);
      const info = cleanStr(req.body?.info);

      // A project appears once — reuse its existing record instead of duplicating.
      if (projectId) {
        const existing = await recordRepo().findOne({ where: { project_id: projectId } });
        if (existing) {
          existing.name = name;
          if (info !== null) existing.info = info;
          await recordRepo().save(existing);
          const full = await recordRepo().findOne({ where: { id: existing.id }, relations: ['participants'] });
          res.status(200).json(full);
          return;
        }
      }

      const record = recordRepo().create({
        project_id: projectId,
        name,
        info,
        created_by: req.user?.userId ?? null,
      });
      await recordRepo().save(record);
      const full = await recordRepo().findOne({ where: { id: record.id }, relations: ['participants'] });
      res.status(201).json(full);
    } catch (error: any) {
      res.status(400).json({ message: error.message || 'Błąd tworzenia projektu' });
    }
  }

  /** PUT /crm/records/:id — update a project record's name/info. */
  async updateRecord(req: Request, res: Response): Promise<void> {
    try {
      const record = await recordRepo().findOne({ where: { id: req.params.id } });
      if (!record) { res.status(404).json({ message: 'Nie znaleziono projektu' }); return; }
      if (req.body?.name !== undefined) {
        const name = cleanStr(req.body.name);
        if (!name) { res.status(400).json({ message: 'Nazwa projektu nie może być pusta' }); return; }
        record.name = name;
      }
      if (req.body?.info !== undefined) record.info = cleanStr(req.body.info);
      await recordRepo().save(record);
      const full = await recordRepo().findOne({ where: { id: record.id }, relations: ['participants'] });
      res.json(full);
    } catch (error: any) {
      res.status(400).json({ message: error.message || 'Błąd zapisu projektu' });
    }
  }

  /** DELETE /crm/records/:id — delete a project record (participants cascade). */
  async deleteRecord(req: Request, res: Response): Promise<void> {
    try {
      const result = await recordRepo().delete(req.params.id);
      if (!result.affected) { res.status(404).json({ message: 'Nie znaleziono projektu' }); return; }
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ message: error.message || 'Błąd usuwania projektu' });
    }
  }

  /** POST /crm/records/:id/participants — add a participant to a project. */
  async addParticipant(req: Request, res: Response): Promise<void> {
    try {
      const record = await recordRepo().findOne({ where: { id: req.params.id } });
      if (!record) { res.status(404).json({ message: 'Nie znaleziono projektu' }); return; }
      const fullName = cleanStr(req.body?.full_name);
      if (!fullName) { res.status(400).json({ message: 'Imię i nazwisko uczestnika jest wymagane' }); return; }
      const participant = participantRepo().create({
        project_record_id: record.id,
        full_name: fullName,
        role: cleanStr(req.body?.role),
        company: cleanStr(req.body?.company),
        email: cleanStr(req.body?.email),
        phone: cleanStr(req.body?.phone),
        notes: cleanStr(req.body?.notes),
      });
      await participantRepo().save(participant);
      res.status(201).json(participant);
    } catch (error: any) {
      res.status(400).json({ message: error.message || 'Błąd dodawania uczestnika' });
    }
  }

  /** PUT /crm/participants/:id — update a participant. */
  async updateParticipant(req: Request, res: Response): Promise<void> {
    try {
      const participant = await participantRepo().findOne({ where: { id: req.params.id } });
      if (!participant) { res.status(404).json({ message: 'Nie znaleziono uczestnika' }); return; }
      if (req.body?.full_name !== undefined) {
        const fullName = cleanStr(req.body.full_name);
        if (!fullName) { res.status(400).json({ message: 'Imię i nazwisko nie może być puste' }); return; }
        participant.full_name = fullName;
      }
      for (const field of ['role', 'company', 'email', 'phone', 'notes'] as const) {
        if (req.body?.[field] !== undefined) participant[field] = cleanStr(req.body[field]);
      }
      await participantRepo().save(participant);
      res.json(participant);
    } catch (error: any) {
      res.status(400).json({ message: error.message || 'Błąd zapisu uczestnika' });
    }
  }

  /** DELETE /crm/participants/:id — remove a participant. */
  async deleteParticipant(req: Request, res: Response): Promise<void> {
    try {
      const result = await participantRepo().delete(req.params.id);
      if (!result.affected) { res.status(404).json({ message: 'Nie znaleziono uczestnika' }); return; }
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ message: error.message || 'Błąd usuwania uczestnika' });
    }
  }
}

export default new CrmProjectController();
