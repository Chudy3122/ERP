import { AppDataSource } from '../config/database';
import { PersonalTask, PersonalTaskStatus } from '../models/PersonalTask.model';

interface CreateDto {
  title: string;
  description?: string;
  status?: PersonalTaskStatus;
}

interface UpdateDto {
  title?: string;
  description?: string;
  status?: PersonalTaskStatus;
  order_index?: number;
}

export class PersonalTaskService {
  private repo = AppDataSource.getRepository(PersonalTask);

  async getForUser(userId: string): Promise<PersonalTask[]> {
    return this.repo.find({
      where: { user_id: userId },
      order: { order_index: 'ASC', created_at: 'ASC' },
    });
  }

  async create(userId: string, data: CreateDto): Promise<PersonalTask> {
    if (!data.title?.trim()) throw new Error('Tytuł jest wymagany');
    const task = this.repo.create({
      user_id: userId,
      title: data.title.trim(),
      description: data.description?.trim() || null,
      status: data.status || PersonalTaskStatus.TODO,
      order_index: 0,
    });
    return this.repo.save(task);
  }

  /** Update a task — only if it belongs to the user */
  async update(id: string, userId: string, data: UpdateDto): Promise<PersonalTask> {
    const task = await this.repo.findOne({ where: { id } });
    if (!task) throw new Error('Zadanie nie znalezione');
    if (task.user_id !== userId) throw new Error('Brak uprawnień');
    if (data.title !== undefined) task.title = data.title;
    if (data.description !== undefined) task.description = data.description || null;
    if (data.status !== undefined) task.status = data.status;
    if (data.order_index !== undefined) task.order_index = data.order_index;
    return this.repo.save(task);
  }

  async delete(id: string, userId: string): Promise<void> {
    const task = await this.repo.findOne({ where: { id } });
    if (!task) throw new Error('Zadanie nie znalezione');
    if (task.user_id !== userId) throw new Error('Brak uprawnień');
    await this.repo.remove(task);
  }

  /** Bulk reorder within a column (owner only) */
  async reorder(userId: string, orderedIds: string[]): Promise<void> {
    const tasks = await this.repo.find({ where: { user_id: userId } });
    const owned = new Set(tasks.map((t) => t.id));
    const updates = orderedIds
      .filter((id) => owned.has(id))
      .map((id, idx) => this.repo.update({ id }, { order_index: idx * 10 }));
    await Promise.all(updates);
  }
}

export default new PersonalTaskService();
