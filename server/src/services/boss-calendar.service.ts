import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { BossCalendar, BossCalendarEntryType } from '../models/BossCalendar.model';

interface CreateEntryDto {
  date: string;
  end_date?: string | null;
  start_time: string;
  end_time: string;
  title: string;
  description?: string;
  type?: BossCalendarEntryType;
  location?: string;
  created_by: string;
}

interface UpdateEntryDto {
  date?: string;
  end_date?: string | null;
  start_time?: string;
  end_time?: string;
  title?: string;
  description?: string;
  type?: BossCalendarEntryType;
  location?: string;
  updated_by: string;
}

export class BossCalendarService {
  private repo: Repository<BossCalendar>;

  constructor() {
    this.repo = AppDataSource.getRepository(BossCalendar);
  }

  async getByDateRange(from: string, to: string): Promise<BossCalendar[]> {
    // Overlap: entry starts on/before the range end AND ends (end_date or date)
    // on/after the range start — so multi-day entries show on every covered day.
    return this.repo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.creator', 'creator')
      .where('e.date <= :to', { to })
      .andWhere('COALESCE(e.end_date, e.date) >= :from', { from })
      .orderBy('e.date', 'ASC')
      .addOrderBy('e.start_time', 'ASC')
      .getMany();
  }

  async getById(id: string): Promise<BossCalendar | null> {
    return this.repo.findOne({ where: { id }, relations: ['creator'] });
  }

  async create(dto: CreateEntryDto): Promise<BossCalendar> {
    const entry = this.repo.create(dto);
    return this.repo.save(entry);
  }

  async update(id: string, dto: UpdateEntryDto): Promise<BossCalendar | null> {
    const entry = await this.repo.findOne({ where: { id } });
    if (!entry) return null;
    Object.assign(entry, dto);
    return this.repo.save(entry);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repo.delete(id);
    return (result.affected ?? 0) > 0;
  }
}
