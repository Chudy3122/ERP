import { AppDataSource } from '../config/database';
import { Vehicle } from '../models/Vehicle.model';
import { VehicleRequest, VehicleRequestStatus } from '../models/VehicleRequest.model';
import { User, UserRole } from '../models/User.model';

interface CreateRequestDto {
  destination: string;
  purpose?: string;
  start_at: string;
  end_at: string;
  passengers?: number | null;
}

export class FleetService {
  private vehicleRepo = AppDataSource.getRepository(Vehicle);
  private requestRepo = AppDataSource.getRepository(VehicleRequest);
  private userRepo = AppDataSource.getRepository(User);

  /** Admins always manage; otherwise the user must be flagged as fleet manager. */
  async canManage(userId: string, role: string): Promise<boolean> {
    if (role === UserRole.ADMIN) return true;
    const user = await this.userRepo.findOne({ where: { id: userId }, select: ['id', 'is_fleet_manager'] });
    return !!user?.is_fleet_manager;
  }

  /** All active users who should be notified about new requests (admins + fleet managers). */
  async getManagers(): Promise<User[]> {
    return this.userRepo.find({
      where: [
        { role: UserRole.ADMIN, is_active: true },
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

  async createVehicle(name: string, registration?: string): Promise<Vehicle> {
    if (!name?.trim()) throw new Error('Nazwa pojazdu jest wymagana');
    const vehicle = this.vehicleRepo.create({ name: name.trim(), registration: registration?.trim() || null });
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
}

export default new FleetService();
