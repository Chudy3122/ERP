import { Repository, LessThanOrEqual, MoreThanOrEqual, Between, Like, In } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Contract, ContractStatus } from '../models/Contract.model';
import { ContractAttachment } from '../models/ContractAttachment.model';
import { Client } from '../models/Client.model';
import notificationService from './notification.service';
import activityService from './activity.service';
import { NotificationType } from '../models/Notification.model';

interface ContractFilters {
  status?: ContractStatus;
  client_id?: string;
  search?: string;
  start_date?: Date;
  end_date?: Date;
  expiring_within_days?: number;
}

interface CreateContractDTO {
  title: string;
  description?: string;
  client_id: string;
  start_date: Date;
  end_date: Date;
  value?: number;
  currency?: string;
  payment_terms?: string;
  auto_renew?: boolean;
  renewal_notice_days?: number;
  notes?: string;
  internal_notes?: string;
}

interface UpdateContractDTO extends Partial<CreateContractDTO> {
  status?: ContractStatus;
}

class ContractService {
  private contractRepository: Repository<Contract>;
  private attachmentRepository: Repository<ContractAttachment>;
  private clientRepository: Repository<Client>;

  constructor() {
    this.contractRepository = AppDataSource.getRepository(Contract);
    this.attachmentRepository = AppDataSource.getRepository(ContractAttachment);
    this.clientRepository = AppDataSource.getRepository(Client);
  }

  /**
   * Generate unique contract number
   */
  private async generateContractNumber(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    // Find the latest contract number for this month
    const latestContract = await this.contractRepository
      .createQueryBuilder('contract')
      .where('contract.contract_number LIKE :pattern', {
        pattern: `UM/${year}/${month}/%`,
      })
      .orderBy('contract.contract_number', 'DESC')
      .getOne();

    let sequence = 1;
    if (latestContract) {
      const parts = latestContract.contract_number.split('/');
      sequence = parseInt(parts[3], 10) + 1;
    }

    return `UM/${year}/${month}/${String(sequence).padStart(4, '0')}`;
  }

  /**
   * Create a new contract
   */
  async createContract(data: CreateContractDTO, userId: string): Promise<Contract> {
    // Verify client exists
    const client = await this.clientRepository.findOne({ where: { id: data.client_id } });
    if (!client) {
      throw new Error('Klient nie istnieje');
    }

    const contract = this.contractRepository.create({
      ...data,
      contract_number: await this.generateContractNumber(),
      status: ContractStatus.DRAFT,
      created_by: userId,
    });

    const savedContract = await this.contractRepository.save(contract);

    // Log activity
    await activityService.logActivity(
      userId,
      'contract_created',
      'contract',
      savedContract.id,
      `Utworzono umowę ${savedContract.contract_number}`
    );

    return this.getContractById(savedContract.id);
  }

  /**
   * Get all contracts with filters
   */
  async getAllContracts(filters: ContractFilters = {}): Promise<Contract[]> {
    const query = this.contractRepository
      .createQueryBuilder('contract')
      .leftJoinAndSelect('contract.client', 'client')
      .leftJoinAndSelect('contract.creator', 'creator')
      .select([
        'contract',
        'client.id',
        'client.name',
        'client.email',
        'creator.id',
        'creator.first_name',
        'creator.last_name',
      ]);

    if (filters.status) {
      query.andWhere('contract.status = :status', { status: filters.status });
    }

    if (filters.client_id) {
      query.andWhere('contract.client_id = :client_id', { client_id: filters.client_id });
    }

    if (filters.search) {
      query.andWhere(
        '(contract.contract_number ILIKE :search OR contract.title ILIKE :search OR client.name ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    if (filters.start_date) {
      query.andWhere('contract.start_date >= :start_date', { start_date: filters.start_date });
    }

    if (filters.end_date) {
      query.andWhere('contract.end_date <= :end_date', { end_date: filters.end_date });
    }

    if (filters.expiring_within_days) {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + filters.expiring_within_days);
      query.andWhere('contract.end_date <= :expiration_date', { expiration_date: expirationDate });
      query.andWhere('contract.status = :active_status', { active_status: ContractStatus.ACTIVE });
    }

    query.orderBy('contract.created_at', 'DESC');

    return query.getMany();
  }

  /**
   * Get contract by ID
   */
  async getContractById(id: string): Promise<Contract> {
    const contract = await this.contractRepository
      .createQueryBuilder('contract')
      .leftJoinAndSelect('contract.client', 'client')
      .leftJoinAndSelect('contract.creator', 'creator')
      .leftJoinAndSelect('contract.attachments', 'attachments')
      .leftJoinAndSelect('attachments.uploader', 'uploader')
      .where('contract.id = :id', { id })
      .getOne();

    if (!contract) {
      throw new Error('Umowa nie znaleziona');
    }

    return contract;
  }

  /**
   * Update contract
   */
  async updateContract(id: string, data: UpdateContractDTO, userId: string): Promise<Contract> {
    const contract = await this.getContractById(id);

    // If client is being changed, verify it exists
    if (data.client_id && data.client_id !== contract.client_id) {
      const client = await this.clientRepository.findOne({ where: { id: data.client_id } });
      if (!client) {
        throw new Error('Klient nie istnieje');
      }
    }

    Object.assign(contract, data);
    await this.contractRepository.save(contract);

    // Log activity
    await activityService.logActivity(
      userId,
      'contract_updated',
      'contract',
      id,
      `Zaktualizowano umowę ${contract.contract_number}`
    );

    return this.getContractById(id);
  }

  /**
   * Update contract status
   */
  async updateStatus(id: string, status: ContractStatus, userId: string): Promise<Contract> {
    const contract = await this.getContractById(id);
    const oldStatus = contract.status;

    contract.status = status;
    await this.contractRepository.save(contract);

    // Log activity
    await activityService.logActivity(
      userId,
      'contract_status_changed',
      'contract',
      id,
      `Zmieniono status umowy ${contract.contract_number} z ${oldStatus} na ${status}`
    );

    return this.getContractById(id);
  }

  /**
   * Delete contract
   */
  async deleteContract(id: string, userId: string): Promise<void> {
    const contract = await this.getContractById(id);

    // Log activity before deletion
    await activityService.logActivity(
      userId,
      'contract_deleted',
      'contract',
      id,
      `Usunięto umowę ${contract.contract_number}`
    );

    await this.contractRepository.remove(contract);
  }

  /**
   * Get expiring contracts
   */
  async getExpiringContracts(days: number = 30): Promise<Contract[]> {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + days);

    return this.contractRepository
      .createQueryBuilder('contract')
      .leftJoinAndSelect('contract.client', 'client')
      .where('contract.status = :status', { status: ContractStatus.ACTIVE })
      .andWhere('contract.end_date BETWEEN :today AND :future', {
        today: today.toISOString().split('T')[0],
        future: futureDate.toISOString().split('T')[0],
      })
      .orderBy('contract.end_date', 'ASC')
      .getMany();
  }

  /**
   * Get contract statistics
   */
  async getStatistics(): Promise<{
    total: number;
    by_status: { status: string; count: number }[];
    total_value: number;
    expiring_soon: number;
  }> {
    const total = await this.contractRepository.count();

    const byStatus = await this.contractRepository
      .createQueryBuilder('contract')
      .select('contract.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('contract.status')
      .getRawMany();

    const totalValue = await this.contractRepository
      .createQueryBuilder('contract')
      .select('SUM(contract.value)', 'total')
      .where('contract.status IN (:...statuses)', {
        statuses: [ContractStatus.ACTIVE, ContractStatus.PENDING],
      })
      .getRawOne();

    const expiringDate = new Date();
    expiringDate.setDate(expiringDate.getDate() + 30);

    const expiringSoon = await this.contractRepository
      .createQueryBuilder('contract')
      .where('contract.status = :status', { status: ContractStatus.ACTIVE })
      .andWhere('contract.end_date <= :date', { date: expiringDate })
      .getCount();

    return {
      total,
      by_status: byStatus.map((s) => ({ status: s.status, count: parseInt(s.count, 10) })),
      total_value: parseFloat(totalValue?.total || '0'),
      expiring_soon: expiringSoon,
    };
  }

  /**
   * Check and update expired contracts
   */
  async updateExpiredContracts(): Promise<number> {
    const today = new Date().toISOString().split('T')[0];

    const result = await this.contractRepository
      .createQueryBuilder()
      .update(Contract)
      .set({ status: ContractStatus.EXPIRED })
      .where('status = :status', { status: ContractStatus.ACTIVE })
      .andWhere('end_date < :today', { today })
      .execute();

    return result.affected || 0;
  }

  /**
   * Send expiring contract notifications
   */
  async sendExpiringNotifications(): Promise<number> {
    const expiringContracts = await this.getExpiringContracts(30);
    let count = 0;

    for (const contract of expiringContracts) {
      // Calculate days until expiration
      const today = new Date();
      const endDate = new Date(contract.end_date);
      const daysUntilExpiration = Math.ceil(
        (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Send notification to creator
      await notificationService.createNotification({
        userId: contract.created_by,
        type: NotificationType.CONTRACT_EXPIRING,
        title: 'Umowa wygasa wkrótce',
        message: `Umowa ${contract.contract_number} z ${contract.client?.name} wygasa za ${daysUntilExpiration} dni`,
        actionUrl: `/contracts/${contract.id}`,
      });

      count++;
    }

    return count;
  }

  // ==================== ATTACHMENTS ====================

  /**
   * Add attachment to contract
   */
  async addAttachment(
    contractId: string,
    file: {
      filename: string;
      originalname: string;
      mimetype: string;
      size: number;
      path: string;
    },
    userId: string
  ): Promise<ContractAttachment> {
    const contract = await this.getContractById(contractId);

    const attachment = this.attachmentRepository.create({
      contract_id: contractId,
      file_name: file.filename,
      original_name: file.originalname,
      file_type: file.mimetype,
      file_size: file.size,
      file_url: `/uploads/contracts/${file.filename}`,
      uploaded_by: userId,
    });

    const savedAttachment = await this.attachmentRepository.save(attachment);

    // Log activity
    await activityService.logActivity(
      userId,
      'contract_attachment_added',
      'contract',
      contractId,
      `Dodano załącznik "${file.originalname}" do umowy ${contract.contract_number}`
    );

    return savedAttachment;
  }

  /**
   * Get attachments for contract
   */
  async getAttachments(contractId: string): Promise<ContractAttachment[]> {
    return this.attachmentRepository.find({
      where: { contract_id: contractId },
      relations: ['uploader'],
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Delete attachment
   */
  async deleteAttachment(attachmentId: string, userId: string): Promise<void> {
    const attachment = await this.attachmentRepository.findOne({
      where: { id: attachmentId },
      relations: ['contract'],
    });

    if (!attachment) {
      throw new Error('Załącznik nie znaleziony');
    }

    // Log activity
    await activityService.logActivity(
      userId,
      'contract_attachment_deleted',
      'contract',
      attachment.contract_id,
      `Usunięto załącznik "${attachment.original_name}"`
    );

    await this.attachmentRepository.remove(attachment);
  }
}

export default new ContractService();
