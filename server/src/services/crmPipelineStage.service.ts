import { AppDataSource } from '../config/database';
import { CrmPipelineStage } from '../models/CrmPipelineStage.model';
import { CrmDeal } from '../models/CrmDeal.model';

class CrmPipelineStageService {
  private stageRepository = AppDataSource.getRepository(CrmPipelineStage);
  private dealRepository = AppDataSource.getRepository(CrmDeal);

  async createStage(pipelineId: string, data: {
    name: string;
    color?: string;
    win_probability?: number;
    is_won_stage?: boolean;
    is_lost_stage?: boolean;
  }): Promise<CrmPipelineStage> {
    const maxPos = await this.stageRepository
      .createQueryBuilder('s')
      .select('MAX(s.position)', 'max')
      .where('s.pipeline_id = :pipelineId', { pipelineId })
      .getRawOne();

    const stage = this.stageRepository.create({
      pipeline_id: pipelineId,
      name: data.name,
      color: data.color || '#6B7280',
      position: (maxPos?.max ?? -1) + 1,
      win_probability: data.win_probability ?? 0,
      is_won_stage: data.is_won_stage ?? false,
      is_lost_stage: data.is_lost_stage ?? false,
    });

    return this.stageRepository.save(stage);
  }

  async updateStage(id: string, data: {
    name?: string;
    color?: string;
    win_probability?: number;
    is_won_stage?: boolean;
    is_lost_stage?: boolean;
    is_active?: boolean;
  }): Promise<CrmPipelineStage | null> {
    const stage = await this.stageRepository.findOne({ where: { id } });
    if (!stage) return null;
    Object.assign(stage, data);
    return this.stageRepository.save(stage);
  }

  async deleteStage(id: string, moveDealsToStageId?: string): Promise<boolean> {
    const stage = await this.stageRepository.findOne({ where: { id } });
    if (!stage) return false;

    if (moveDealsToStageId) {
      await this.dealRepository.update({ stage_id: id }, { stage_id: moveDealsToStageId });
    }

    stage.is_active = false;
    await this.stageRepository.save(stage);
    return true;
  }

  async reorderStages(pipelineId: string, stageIds: string[]): Promise<void> {
    const updates = stageIds.map((id, index) =>
      this.stageRepository.update({ id, pipeline_id: pipelineId }, { position: index })
    );
    await Promise.all(updates);
  }
}

export default new CrmPipelineStageService();
