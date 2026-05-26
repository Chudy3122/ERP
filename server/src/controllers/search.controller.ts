import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Project } from '../models/Project.model';
import { Task } from '../models/Task.model';
import { Ticket } from '../models/Ticket.model';
import { Invoice } from '../models/Invoice.model';
import { Contract } from '../models/Contract.model';
import { Client } from '../models/Client.model';
import { Procedure } from '../models/Procedure.model';
import { User, UserRole } from '../models/User.model';

const PER_TYPE = 5;

interface SearchResult {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  href: string;
}

export class SearchController {
  async search(req: Request, res: Response): Promise<void> {
    try {
      const q = ((req.query.q as string) || '').trim();
      if (q.length < 2) {
        res.json({ results: [] });
        return;
      }

      const userId = req.user!.userId;
      const role = req.user!.role as UserRole;
      const like = `%${q}%`;

      const isAdmin = role === UserRole.ADMIN;
      const isSzef = role === UserRole.SZEF;
      const isKierownik = role === UserRole.KIEROWNIK;
      const isKsiegowosc = role === UserRole.KSIEGOWOSC;
      const isSekretariat = role === UserRole.SEKRETARIAT;
      const isEmployee = role === UserRole.EMPLOYEE;

      const allPromises: Promise<SearchResult[]>[] = [];

      // ── Projects ──────────────────────────────────────────────────────
      allPromises.push((async (): Promise<SearchResult[]> => {
        const qb = AppDataSource.getRepository(Project)
          .createQueryBuilder('project')
          .where(
            '(project.name ILIKE :like OR project.code ILIKE :like OR project.description ILIKE :like)',
            { like }
          )
          .andWhere('project.is_archived = false')
          .orderBy('project.updated_at', 'DESC')
          .take(PER_TYPE);

        if (!isAdmin && !isSzef && !isKierownik) {
          qb.innerJoin('project.members', 'pm', 'pm.user_id = :userId', { userId });
        }

        const rows = await qb.getMany();
        return rows.map((p) => ({
          id: p.id,
          type: 'project',
          title: p.name,
          subtitle: `${p.code} · ${p.status}`,
          href: `/projects/${p.id}`,
        }));
      })());

      // ── Tasks ─────────────────────────────────────────────────────────
      allPromises.push((async (): Promise<SearchResult[]> => {
        const qb = AppDataSource.getRepository(Task)
          .createQueryBuilder('task')
          .leftJoinAndSelect('task.project', 'project')
          .where('(task.title ILIKE :like OR task.description ILIKE :like)', { like })
          .orderBy('task.updated_at', 'DESC')
          .take(PER_TYPE);

        if (isEmployee || isKsiegowosc || isSekretariat) {
          qb.andWhere('(task.assigned_to = :userId OR task.created_by = :userId)', { userId });
        }

        const rows = await qb.getMany();
        return rows.map((t) => ({
          id: t.id,
          type: 'task',
          title: t.title,
          subtitle: t.project?.name || t.status,
          href: `/tasks/${t.id}/edit`,
        }));
      })());

      // ── Tickets ───────────────────────────────────────────────────────
      allPromises.push((async (): Promise<SearchResult[]> => {
        const qb = AppDataSource.getRepository(Ticket)
          .createQueryBuilder('ticket')
          .where(
            '(ticket.title ILIKE :like OR ticket.description ILIKE :like OR ticket.ticket_number ILIKE :like)',
            { like }
          )
          .orderBy('ticket.updated_at', 'DESC')
          .take(PER_TYPE);

        if (isEmployee || isSekretariat) {
          qb.andWhere(
            '(ticket.created_by = :userId OR ticket.assigned_to = :userId)',
            { userId }
          );
        }

        const rows = await qb.getMany();
        return rows.map((t) => ({
          id: t.id,
          type: 'ticket',
          title: `${t.ticket_number}: ${t.title}`,
          subtitle: `${t.status} · ${t.priority}`,
          href: `/tickets/${t.id}/edit`,
        }));
      })());

      // ── Invoices (finance roles + management) ─────────────────────────
      if (isAdmin || isSzef || isKsiegowosc || isKierownik) {
        allPromises.push((async (): Promise<SearchResult[]> => {
          const rows = await AppDataSource.getRepository(Invoice)
            .createQueryBuilder('invoice')
            .leftJoinAndSelect('invoice.client', 'client')
            .where('(invoice.invoice_number ILIKE :like OR invoice.notes ILIKE :like)', { like })
            .orderBy('invoice.updated_at', 'DESC')
            .take(PER_TYPE)
            .getMany();

          return rows.map((inv) => ({
            id: inv.id,
            type: 'invoice',
            title: inv.invoice_number,
            subtitle: inv.client?.name || inv.status,
            href: `/invoices/${inv.id}`,
          }));
        })());
      }

      // ── Contracts ─────────────────────────────────────────────────────
      if (isAdmin || isSzef || isKsiegowosc || isKierownik) {
        allPromises.push((async (): Promise<SearchResult[]> => {
          const rows = await AppDataSource.getRepository(Contract)
            .createQueryBuilder('contract')
            .leftJoinAndSelect('contract.client', 'client')
            .where(
              '(contract.contract_number ILIKE :like OR contract.title ILIKE :like OR contract.description ILIKE :like)',
              { like }
            )
            .orderBy('contract.updated_at', 'DESC')
            .take(PER_TYPE)
            .getMany();

          return rows.map((c) => ({
            id: c.id,
            type: 'contract',
            title: c.title,
            subtitle: `${c.contract_number} · ${c.status}`,
            href: `/contracts/${c.id}`,
          }));
        })());
      }

      // ── Clients ───────────────────────────────────────────────────────
      if (isAdmin || isSzef || isKsiegowosc || isKierownik || isSekretariat) {
        allPromises.push((async (): Promise<SearchResult[]> => {
          const rows = await AppDataSource.getRepository(Client)
            .createQueryBuilder('client')
            .where(
              '(client.name ILIKE :like OR client.nip ILIKE :like OR client.email ILIKE :like OR client.contact_person ILIKE :like)',
              { like }
            )
            .andWhere('client.is_active = true')
            .orderBy('client.updated_at', 'DESC')
            .take(PER_TYPE)
            .getMany();

          return rows.map((c) => ({
            id: c.id,
            type: 'client',
            title: c.name,
            subtitle: [c.city, c.nip].filter(Boolean).join(' · ') || c.email || '',
            href: `/clients/${c.id}`,
          }));
        })());
      }

      // ── Procedures (all users, active only) ───────────────────────────
      allPromises.push((async (): Promise<SearchResult[]> => {
        const rows = await AppDataSource.getRepository(Procedure)
          .createQueryBuilder('procedure')
          .where('(procedure.title ILIKE :like OR procedure.description ILIKE :like)', { like })
          .andWhere("procedure.status = 'active'")
          .orderBy('procedure.updated_at', 'DESC')
          .take(PER_TYPE)
          .getMany();

        return rows.map((p) => ({
          id: p.id,
          type: 'procedure',
          title: p.title,
          subtitle: p.category || 'Procedura',
          href: `/procedures`,
        }));
      })());

      // ── Employees (management roles) ──────────────────────────────────
      if (isAdmin || isKierownik || isSzef || isSekretariat) {
        allPromises.push((async (): Promise<SearchResult[]> => {
          const rows = await AppDataSource.getRepository(User)
            .createQueryBuilder('user')
            .where(
              "(CONCAT(user.first_name, ' ', user.last_name) ILIKE :like OR user.email ILIKE :like OR user.position ILIKE :like)",
              { like }
            )
            .andWhere('user.is_active = true')
            .orderBy('user.last_name', 'ASC')
            .take(PER_TYPE)
            .getMany();

          return rows.map((u) => ({
            id: u.id,
            type: 'employee',
            title: `${u.first_name} ${u.last_name}`,
            subtitle: u.position || u.department || u.email,
            href: `/employees/${u.id}`,
          }));
        })());
      }

      const groupedResults = await Promise.all(allPromises);
      const results = groupedResults.flat();

      res.json({ results });
    } catch (error: any) {
      console.error('Search error:', error);
      res.status(500).json({ message: 'Błąd wyszukiwania' });
    }
  }
}

export default new SearchController();
