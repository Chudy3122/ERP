import { AppDataSource } from '../config/database';
import { Procedure, ProcedureStatus } from '../models/Procedure.model';

interface CreateProcedureDto {
  title: string;
  description?: string;
  content: string;
  category?: string;
  status?: ProcedureStatus;
  version?: string;
}

interface UpdateProcedureDto {
  title?: string;
  description?: string;
  content?: string;
  category?: string;
  status?: ProcedureStatus;
  version?: string;
}

export class ProcedureService {
  private procedureRepository = AppDataSource.getRepository(Procedure);

  async getAll(category?: string, status?: string): Promise<Procedure[]> {
    const qb = this.procedureRepository
      .createQueryBuilder('procedure')
      .leftJoinAndSelect('procedure.creator', 'creator')
      .leftJoinAndSelect('procedure.updater', 'updater')
      .orderBy('procedure.created_at', 'DESC');

    if (category) qb.andWhere('procedure.category = :category', { category });
    if (status) qb.andWhere('procedure.status = :status', { status });

    return qb.getMany();
  }

  async getById(id: string): Promise<Procedure | null> {
    return this.procedureRepository.findOne({
      where: { id },
      relations: ['creator', 'updater'],
    });
  }

  async create(data: CreateProcedureDto, userId: string): Promise<Procedure> {
    const procedure = this.procedureRepository.create({
      ...data,
      created_by: userId,
    });
    return this.procedureRepository.save(procedure);
  }

  async update(id: string, data: UpdateProcedureDto, userId: string): Promise<Procedure | null> {
    const procedure = await this.procedureRepository.findOne({ where: { id } });
    if (!procedure) return null;

    Object.assign(procedure, data);
    procedure.updated_by = userId;

    return this.procedureRepository.save(procedure);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.procedureRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }
}

export default new ProcedureService();
