import { IsNull } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Vehicle } from '../models/Vehicle.model';
import { VehicleRequest, VehicleRequestStatus } from '../models/VehicleRequest.model';
import { VehicleReminder } from '../models/VehicleReminder.model';
import { VehicleLogEntry } from '../models/VehicleLogEntry.model';
import { User, UserRole } from '../models/User.model';
import notificationService from './notification.service';

interface CreateRequestDto {
  destination: string;
  purpose?: string;
  start_at: string;
  end_at: string;
  passengers?: number | null;
}

interface VehicleDto {
  name?: string;
  registration?: string | null;
  year?: number | null;
  seats?: number | null;
  fuel_type?: string | null;
  notes?: string | null;
  image_url?: string | null;
}

interface ReminderDto {
  title: string;
  due_date: string;
  remind_days_before?: number;
  notes?: string | null;
}

interface LogDto {
  entry_date: string;
  title: string;
  category?: string;
  cost?: number | null;
  mileage?: number | null;
  notes?: string | null;
}

export class FleetService {
  private vehicleRepo = AppDataSource.getRepository(Vehicle);
  private requestRepo = AppDataSource.getRepository(VehicleRequest);
  private reminderRepo = AppDataSource.getRepository(VehicleReminder);
  private logRepo = AppDataSource.getRepository(VehicleLogEntry);
  private userRepo = AppDataSource.getRepository(User);

  /** Admin/szef always manage; otherwise the user must be flagged as fleet manager. */
  async canManage(userId: string, role: string): Promise<boolean> {
    if (role === UserRole.ADMIN || role === UserRole.SZEF) return true;
    const user = await this.userRepo.findOne({ where: { id: userId }, select: ['id', 'is_fleet_manager'] });
    return !!user?.is_fleet_manager;
  }

  /** Active users notified about new requests (admins + szef + fleet managers). */
  async getManagers(): Promise<User[]> {
    return this.userRepo.find({
      where: [
        { role: UserRole.ADMIN, is_active: true },
        { role: UserRole.SZEF, is_active: true },
        { is_fleet_manager: true, is_active: true },
      ],
      select: ['id'],
    });
  }

  // ── Vehicles ────────────────────────────────────────────────────────────────
  async listVehicles(includeInactive = false): Promise<Vehicle[]> {
    return this.vehicleRepo.find({
      where: includeInactive ? {} : { is_active: true },
      order: { name: 'ASC' },
    });
  }

  async createVehicle(data: VehicleDto): Promise<Vehicle> {
    if (!data.name?.trim()) throw new Error('Nazwa pojazdu jest wymagana');
    const vehicle = this.vehicleRepo.create({
      name: data.name.trim(),
      registration: data.registration?.trim() || null,
      year: data.year ?? null,
      seats: data.seats ?? null,
      fuel_type: data.fuel_type?.trim() || null,
      notes: data.notes?.trim() || null,
      image_url: data.image_url || null,
    });
    return this.vehicleRepo.save(vehicle);
  }

  async updateVehicle(id: string, data: VehicleDto): Promise<Vehicle> {
    const vehicle = await this.vehicleRepo.findOne({ where: { id } });
    if (!vehicle) throw new Error('Pojazd nie znaleziony');
    if (data.name !== undefined) {
      if (!data.name.trim()) throw new Error('Nazwa pojazdu jest wymagana');
      vehicle.name = data.name.trim();
    }
    if (data.registration !== undefined) vehicle.registration = data.registration?.trim() || null;
    if (data.year !== undefined) vehicle.year = data.year ?? null;
    if (data.seats !== undefined) vehicle.seats = data.seats ?? null;
    if (data.fuel_type !== undefined) vehicle.fuel_type = data.fuel_type?.trim() || null;
    if (data.notes !== undefined) vehicle.notes = data.notes?.trim() || null;
    if (data.image_url !== undefined && data.image_url) vehicle.image_url = data.image_url;
    return this.vehicleRepo.save(vehicle);
  }

  async deleteVehicle(id: string): Promise<void> {
    const vehicle = await this.vehicleRepo.findOne({ where: { id } });
    if (!vehicle) throw new Error('Pojazd nie znaleziony');
    // Soft-disable so historical assignments keep their vehicle reference.
    vehicle.is_active = false;
    await this.vehicleRepo.save(vehicle);
  }

  // ── Requests ──────────────────────────────────────────────────────────────--
  async getAll(status?: string): Promise<VehicleRequest[]> {
    const qb = this.requestRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.user', 'user')
      .leftJoinAndSelect('r.vehicle', 'vehicle')
      .leftJoinAndSelect('r.reviewer', 'reviewer')
      .orderBy('r.start_at', 'DESC');
    if (status) qb.andWhere('r.status = :status', { status });
    return qb.getMany();
  }

  async getMine(userId: string): Promise<VehicleRequest[]> {
    return this.requestRepo.find({
      where: { user_id: userId },
      relations: ['vehicle', 'reviewer'],
      order: { start_at: 'DESC' },
    });
  }

  async create(data: CreateRequestDto, userId: string): Promise<VehicleRequest> {
    if (!data.destination?.trim()) throw new Error('Cel/trasa jest wymagana');
    if (!data.start_at || !data.end_at) throw new Error('Podaj termin od i do');
    const start = new Date(data.start_at);
    const end = new Date(data.end_at);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) throw new Error('Nieprawidłowy termin');
    if (end.getTime() <= start.getTime()) throw new Error('Termin „do" musi być po „od"');

    const request = this.requestRepo.create({
      user_id: userId,
      destination: data.destination.trim(),
      purpose: data.purpose?.trim() || null,
      start_at: start,
      end_at: end,
      passengers: data.passengers && data.passengers > 0 ? data.passengers : null,
      status: VehicleRequestStatus.PENDING,
    });
    return this.requestRepo.save(request);
  }

  /** Assign a vehicle (= approve). Blocks if the car overlaps another approved booking. */
  async assign(id: string, vehicleId: string, reviewerId: string, notes?: string): Promise<VehicleRequest> {
    const request = await this.requestRepo.findOne({ where: { id } });
    if (!request) throw new Error('Zapotrzebowanie nie znalezione');
    const vehicle = await this.vehicleRepo.findOne({ where: { id: vehicleId } });
    if (!vehicle) throw new Error('Wybrany pojazd nie istnieje');

    const overlap = await this.requestRepo
      .createQueryBuilder('r')
      .where('r.vehicle_id = :vid', { vid: vehicleId })
      .andWhere('r.status = :status', { status: VehicleRequestStatus.APPROVED })
      .andWhere('r.id != :id', { id })
      .andWhere('r.start_at < :end AND r.end_at > :start', { start: request.start_at, end: request.end_at })
      .getCount();
    if (overlap > 0) {
      throw new Error(`${vehicle.name} jest już przypisany w nakładającym się terminie`);
    }

    request.vehicle_id = vehicleId;
    request.status = VehicleRequestStatus.APPROVED;
    request.reviewed_by = reviewerId;
    request.reviewed_at = new Date();
    request.review_notes = notes?.trim() || null;
    await this.requestRepo.save(request);
    return (await this.requestRepo.findOne({ where: { id }, relations: ['user', 'vehicle', 'reviewer'] }))!;
  }

  async reject(id: string, reviewerId: string, notes?: string): Promise<VehicleRequest> {
    const request = await this.requestRepo.findOne({ where: { id } });
    if (!request) throw new Error('Zapotrzebowanie nie znalezione');
    request.status = VehicleRequestStatus.REJECTED;
    request.vehicle_id = null;
    request.reviewed_by = reviewerId;
    request.reviewed_at = new Date();
    request.review_notes = notes?.trim() || null;
    await this.requestRepo.save(request);
    return (await this.requestRepo.findOne({ where: { id }, relations: ['user', 'vehicle', 'reviewer'] }))!;
  }

  async delete(id: string, userId: string, isManager: boolean): Promise<void> {
    const request = await this.requestRepo.findOne({ where: { id } });
    if (!request) throw new Error('Zapotrzebowanie nie znalezione');
    if (!isManager && request.user_id !== userId) {
      throw new Error('Brak uprawnień do usunięcia tego zapotrzebowania');
    }
    await this.requestRepo.remove(request);
  }

  // ── Reminders (terminy: przegląd, ubezpieczenie…) ───────────────────────────
  async listReminders(vehicleId: string): Promise<VehicleReminder[]> {
    return this.reminderRepo.find({ where: { vehicle_id: vehicleId }, order: { due_date: 'ASC' } });
  }

  async addReminder(vehicleId: string, dto: ReminderDto): Promise<VehicleReminder> {
    if (!dto.title?.trim()) throw new Error('Nazwa terminu jest wymagana');
    if (!dto.due_date) throw new Error('Data terminu jest wymagana');
    const reminder = this.reminderRepo.create({
      vehicle_id: vehicleId,
      title: dto.title.trim(),
      due_date: dto.due_date,
      remind_days_before: dto.remind_days_before ?? 14,
      notes: dto.notes?.trim() || null,
    });
    return this.reminderRepo.save(reminder);
  }

  async deleteReminder(id: string): Promise<void> {
    const r = await this.reminderRepo.findOne({ where: { id } });
    if (!r) throw new Error('Termin nie znaleziony');
    await this.reminderRepo.remove(r);
  }

  // ── Service / expense log (dzienniczek) ─────────────────────────────────────
  async listLog(vehicleId: string): Promise<VehicleLogEntry[]> {
    return this.logRepo.find({
      where: { vehicle_id: vehicleId },
      relations: ['creator'],
      order: { entry_date: 'DESC', created_at: 'DESC' },
    });
  }

  async addLogEntry(vehicleId: string, dto: LogDto, userId: string): Promise<VehicleLogEntry> {
    if (!dto.title?.trim()) throw new Error('Opis jest wymagany');
    if (!dto.entry_date) throw new Error('Data jest wymagana');
    const entry = this.logRepo.create({
      vehicle_id: vehicleId,
      entry_date: dto.entry_date,
      title: dto.title.trim(),
      category: dto.category || 'repair',
      cost: dto.cost != null && !isNaN(Number(dto.cost)) ? Number(dto.cost) : null,
      mileage: dto.mileage != null && !isNaN(Number(dto.mileage)) ? Number(dto.mileage) : null,
      notes: dto.notes?.trim() || null,
      created_by: userId,
    });
    return this.logRepo.save(entry);
  }

  async deleteLogEntry(id: string): Promise<void> {
    const e = await this.logRepo.findOne({ where: { id } });
    if (!e) throw new Error('Wpis nie znaleziony');
    await this.logRepo.remove(e);
  }

  /** Background job: fire due vehicle reminders (once) to fleet managers. */
  async processDueVehicleReminders(): Promise<void> {
    const pending = await this.reminderRepo.find({ where: { reminded_at: IsNull() }, relations: ['vehicle'] });
    if (!pending.length) return;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const managers = await this.getManagers();

    for (const r of pending) {
      const due = new Date(`${r.due_date}T00:00:00`);
      const remindOn = new Date(due);
      remindOn.setDate(remindOn.getDate() - (r.remind_days_before || 0));
      if (today.getTime() < remindOn.getTime()) continue;

      for (const m of managers) {
        try {
          await notificationService.notifyVehicleReminder(m.id, r.vehicle?.name || 'Pojazd', r.title, r.due_date);
        } catch (e) {
          console.error('Vehicle reminder notify error:', e);
        }
      }
      r.reminded_at = new Date();
      await this.reminderRepo.save(r);
    }
  }
}

export default new FleetService();
