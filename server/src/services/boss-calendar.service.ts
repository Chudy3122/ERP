import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { BossCalendar, BossCalendarEntryType } from '../models/BossCalendar.model';

interface CreateEntryDto {
  date: string;
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
    return this.repo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.creator', 'creator')
      .where('e.date >= :from', { from })
      .andWhere('e.date <= :to', { to })
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
