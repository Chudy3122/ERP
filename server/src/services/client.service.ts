import { AppDataSource } from '../config/database';
import { Client, ClientType } from '../models/Client.model';
import { User } from '../models/User.model';
import activityService from './activity.service';

interface CreateClientDto {
  name: string;
  nip?: string;
  regon?: string;
  street?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  client_type?: ClientType;
  is_active?: boolean;
  notes?: string;
}

interface UpdateClientDto {
  name?: string;
  nip?: string;
  regon?: string;
  street?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  client_type?: ClientType;
  is_active?: boolean;
  notes?: string;
}

interface ClientFilters {
  client_type?: ClientType;
  is_active?: boolean;
  search?: string;
}

export class ClientService {
  private clientRepository = AppDataSource.getRepository(Client);
  private userRepository = AppDataSource.getRepository(User);

  /**
   * Create a new client
   */
  async createClient(data: CreateClientDto, userId: string): Promise<Client> {
    // Check if NIP already exists (if provided)
    if (data.nip) {
      const existingClient = await this.clientRepository.findOne({
        where: { nip: data.nip },
      });

      if (existingClient) {
        throw new Error('Kontrahent z tym NIP-em już istnieje');
      }
    }

    const client = this.clientRepository.create({
      ...data,
      created_by: userId,
    });

    const savedClient = await this.clientRepository.save(client);

    // Log activity
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (user) {
      await activityService.logActivity(
        userId,
        'created_client',
        'client',
        savedClient.id,
        `${user.first_name} ${user.last_name} utworzył kontrahenta "${savedClient.name}"`,
        { client_name: savedClient.name, nip: savedClient.nip }
      );
    }

    return savedClient;
  }

  /**
   * Get all clients with filters
   */
  async getAllClients(filters?: ClientFilters): Promise<{ clients: Client[]; total: number }> {
    const queryBuilder = this.clientRepository
      .createQueryBuilder('client')
      .leftJoinAndSelect('client.creator', 'creator')
      .orderBy('client.name', 'ASC');

    if (filters) {
      if (filters.client_type) {
        queryBuilder.andWhere('client.client_type = :clientType', { clientType: filters.client_type });
      }

      if (filters.is_active !== undefined) {
        queryBuilder.andWhere('client.is_active = :isActive', { isActive: filters.is_active });
      }

      if (filters.search) {
        queryBuilder.andWhere(
          '(client.name ILIKE :search OR client.nip ILIKE :search OR client.city ILIKE :search OR client.email ILIKE :search)',
          { search: `%${filters.search}%` }
        );
      }
    }

    const [clients, total] = await queryBuilder.getManyAndCount();

    return { clients, total };
  }

  /**
   * Get active clients (for dropdowns)
   */
  async getActiveClients(): Promise<Client[]> {
    return await this.clientRepository.find({
      where: { is_active: true },
      order: { name: 'ASC' },
    });
  }

  /**
   * Get client by ID
   */
  async getClientById(id: string): Promise<Client> {
    const client = await this.clientRepository.findOne({
      where: { id },
      relations: ['creator'],
    });

    if (!client) {
      throw new Error('Kontrahent nie znaleziony');
    }

    return client;
  }

  /**
   * Update client
   */
  async updateClient(id: string, data: UpdateClientDto, userId: string): Promise<Client> {
    const client = await this.getClientById(id);

    // Check if NIP already exists (if changing)
    if (data.nip && data.nip !== client.nip) {
      const existingClient = await this.clientRepository.findOne({
        where: { nip: data.nip },
      });

      if (existingClient) {
        throw new Error('Kontrahent z tym NIP-em już istnieje');
      }
    }

    Object.assign(client, data);
    const updatedClient = await this.clientRepository.save(client);

    // Log activity
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (user) {
      await activityService.logActivity(
        userId,
        'updated_client',
        'client',
        client.id,
        `${user.first_name} ${user.last_name} zaktualizował kontrahenta "${client.name}"`,
        { changes: data }
      );
    }

    return updatedClient;
  }

  /**
   * Delete client
   */
  async deleteClient(id: string, userId: string): Promise<void> {
    const client = await this.getClientById(id);

    // Check if client has invoices
    const invoiceCount = await AppDataSource.getRepository('Invoice').count({
      where: { client_id: id },
    });

    if (invoiceCount > 0) {
      throw new Error('Nie można usunąć kontrahenta, który ma przypisane faktury');
    }

    await this.clientRepository.remove(client);

    // Log activity
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (user) {
      await activityService.logActivity(
        userId,
        'deleted_client',
        'client',
        null,
        `${user.first_name} ${user.last_name} usunął kontrahenta "${client.name}"`,
        { client_name: client.name, nip: client.nip }
      );
    }
  }

  /**
   * Check if NIP exists
   */
  async checkNipExists(nip: string, excludeId?: string): Promise<boolean> {
    const queryBuilder = this.clientRepository
      .createQueryBuilder('client')
      .where('client.nip = :nip', { nip });

    if (excludeId) {
      queryBuilder.andWhere('client.id != :excludeId', { excludeId });
    }

    const count = await queryBuilder.getCount();
    return count > 0;
  }
}

export default new ClientService();
