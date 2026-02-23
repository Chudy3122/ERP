import { AppDataSource } from '../config/database';
import { CrmPipeline } from '../models/CrmPipeline.model';
import { CrmPipelineStage } from '../models/CrmPipelineStage.model';

class CrmPipelineService {
  private pipelineRepository = AppDataSource.getRepository(CrmPipeline);
  private stageRepository = AppDataSource.getRepository(CrmPipelineStage);

  async createPipeline(data: { name: string; description?: string; color?: string }, userId: string): Promise<CrmPipeline> {
    // Get max position
    const maxPos = await this.pipelineRepository
      .createQueryBuilder('p')
      .select('MAX(p.position)', 'max')
      .getRawOne();

    const pipeline = this.pipelineRepository.create({
      name: data.name,
      description: data.description,
      color: data.color || '#3B82F6',
      position: (maxPos?.max ?? -1) + 1,
      created_by: userId,
    });

    const savedPipeline = await this.pipelineRepository.save(pipeline);

    // Create default stages
    await this.createDefaultStages(savedPipeline.id);

    // Reload with stages
    return (await this.pipelineRepository.findOne({
      where: { id: savedPipeline.id },
      relations: ['stages'],
      order: { stages: { position: 'ASC' } },
    }))!;
  }

  private async createDefaultStages(pipelineId: string): Promise<void> {
    const defaults = [
      { name: 'Nowy Lead', color: '#6B7280', position: 0, win_probability: 10 },
      { name: 'Kontakt', color: '#3B82F6', position: 1, win_probability: 20 },
      { name: 'Propozycja', color: '#8B5CF6', position: 2, win_probability: 40 },
      { name: 'Negocjacje', color: '#F59E0B', position: 3, win_probability: 60 },
      { name: 'Wygrana', color: '#10B981', position: 4, win_probability: 100, is_won_stage: true },
      { name: 'Przegrana', color: '#EF4444', position: 5, win_probability: 0, is_lost_stage: true },
    ];

    for (const s of defaults) {
      const stage = this.stageRepository.create({ pipeline_id: pipelineId, ...s });
      await this.stageRepository.save(stage);
    }
  }

  async getAllPipelines(): Promise<CrmPipeline[]> {
    return this.pipelineRepository.find({
      where: { is_active: true },
      order: { position: 'ASC' },
    });
  }

  async getPipelineById(id: string): Promise<CrmPipeline | null> {
    return this.pipelineRepository.findOne({
      where: { id },
      relations: ['stages', 'creator'],
      order: { stages: { position: 'ASC' } },
    });
  }

  async updatePipeline(id: string, data: { name?: string; description?: string; color?: string; is_active?: boolean }): Promise<CrmPipeline | null> {
    const pipeline = await this.pipelineRepository.findOne({ where: { id } });
    if (!pipeline) return null;
    Object.assign(pipeline, data);
    return this.pipelineRepository.save(pipeline);
  }

  async deletePipeline(id: string): Promise<boolean> {
    const pipeline = await this.pipelineRepository.findOne({ where: { id } });
    if (!pipeline) return false;
    pipeline.is_active = false;
    await this.pipelineRepository.save(pipeline);
    return true;
  }

  async reorderPipelines(ids: string[]): Promise<void> {
    const updates = ids.map((id, index) =>
      this.pipelineRepository.update(id, { position: index })
    );
    await Promise.all(updates);
  }
}

export default new CrmPipelineService();
