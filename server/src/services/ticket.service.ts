import { AppDataSource } from '../config/database';
import { Ticket, TicketStatus, TicketType, TicketPriority } from '../models/Ticket.model';
import { TicketComment } from '../models/TicketComment.model';
import { User } from '../models/User.model';
import activityService from './activity.service';

interface CreateTicketDto {
  title: string;
  description: string;
  type?: TicketType;
  priority?: TicketPriority;
  category?: string;
  project_id?: string;
}

interface UpdateTicketDto {
  title?: string;
  description?: string;
  type?: TicketType;
  status?: TicketStatus;
  priority?: TicketPriority;
  assigned_to?: string;
  category?: string;
  project_id?: string;
}

export class TicketService {
  private ticketRepository = AppDataSource.getRepository(Ticket);
  private ticketCommentRepository = AppDataSource.getRepository(TicketComment);
  private userRepository = AppDataSource.getRepository(User);

  /**
   * Generate unique ticket number (TKT-YYYYMMDD-NNN)
   */
  async generateTicketNumber(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');

    // Find last ticket number for today
    const lastTicket = await this.ticketRepository
      .createQueryBuilder('ticket')
      .where('ticket.ticket_number LIKE :pattern', { pattern: `TKT-${dateStr}-%` })
      .orderBy('ticket.ticket_number', 'DESC')
      .getOne();

    let sequence = 1;
    if (lastTicket) {
      const lastSequence = parseInt(lastTicket.ticket_number.split('-')[2]);
      sequence = lastSequence + 1;
    }

    return `TKT-${dateStr}-${sequence.toString().padStart(3, '0')}`;
  }

  /**
   * Create a new ticket
   */
  async createTicket(data: CreateTicketDto, userId: string): Promise<Ticket> {
    const ticketNumber = await this.generateTicketNumber();

    const ticket = this.ticketRepository.create({
      ...data,
      ticket_number: ticketNumber,
      created_by: userId,
      status: TicketStatus.OPEN,
    });

    const savedTicket = await this.ticketRepository.save(ticket);

    // Log activity
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (user) {
      await activityService.logActivity(
        userId,
        'created_ticket',
        'ticket',
        savedTicket.id,
        `${user.first_name} ${user.last_name} utworzył zgłoszenie "${savedTicket.ticket_number}: ${savedTicket.title}"`,
        { ticket_type: savedTicket.type }
      );
    }

    return savedTicket;
  }

  /**
   * Get ticket by ID
   */
  async getTicketById(id: string): Promise<Ticket> {
    const ticket = await this.ticketRepository.findOne({
      where: { id },
      relations: ['creator', 'assignee', 'project'],
    });

    if (!ticket) {
      throw new Error('Ticket not found');
    }

    return ticket;
  }

  /**
   * Get all tickets with filters
   */
  async getAllTickets(filters?: {
    type?: TicketType;
    status?: TicketStatus;
    priority?: TicketPriority;
    createdBy?: string;
    assignedTo?: string;
    category?: string;
    projectId?: string;
    search?: string;
  }): Promise<{ tickets: Ticket[]; total: number }> {
    const queryBuilder = this.ticketRepository
      .createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.creator', 'creator')
      .leftJoinAndSelect('ticket.assignee', 'assignee')
      .leftJoinAndSelect('ticket.project', 'project')
      .orderBy('ticket.created_at', 'DESC');

    if (filters) {
      if (filters.type) {
        queryBuilder.andWhere('ticket.type = :type', { type: filters.type });
      }

      if (filters.status) {
        queryBuilder.andWhere('ticket.status = :status', { status: filters.status });
      }

      if (filters.priority) {
        queryBuilder.andWhere('ticket.priority = :priority', { priority: filters.priority });
      }

      if (filters.createdBy) {
        queryBuilder.andWhere('ticket.created_by = :createdBy', { createdBy: filters.createdBy });
      }

      if (filters.assignedTo) {
        queryBuilder.andWhere('ticket.assigned_to = :assignedTo', { assignedTo: filters.assignedTo });
      }

      if (filters.category) {
        queryBuilder.andWhere('ticket.category = :category', { category: filters.category });
      }

      if (filters.projectId) {
        queryBuilder.andWhere('ticket.project_id = :projectId', { projectId: filters.projectId });
      }

      if (filters.search) {
        queryBuilder.andWhere(
          '(ticket.title ILIKE :search OR ticket.description ILIKE :search OR ticket.ticket_number ILIKE :search)',
          { search: `%${filters.search}%` }
        );
      }
    }

    const [tickets, total] = await queryBuilder.getManyAndCount();

    return { tickets, total };
  }

  /**
   * Get user's tickets
   */
  async getUserTickets(userId: string): Promise<Ticket[]> {
    const { tickets } = await this.getAllTickets({ createdBy: userId });
    return tickets;
  }

  /**
   * Get tickets assigned to user
   */
  async getAssignedTickets(userId: string): Promise<Ticket[]> {
    const { tickets } = await this.getAllTickets({ assignedTo: userId });
    return tickets;
  }

  /**
   * Update ticket
   */
  async updateTicket(id: string, data: UpdateTicketDto, userId: string): Promise<Ticket> {
    const ticket = await this.getTicketById(id);

    // If status changed to resolved, set resolved_at
    if (data.status === TicketStatus.RESOLVED && ticket.status !== TicketStatus.RESOLVED) {
      ticket.resolved_at = new Date();
    }

    // If status changed to closed, set closed_at
    if (data.status === TicketStatus.CLOSED && ticket.status !== TicketStatus.CLOSED) {
      ticket.closed_at = new Date();
    }

    Object.assign(ticket, data);
    const updatedTicket = await this.ticketRepository.save(ticket);

    // Log activity
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (user) {
      await activityService.logActivity(
        userId,
        'updated_ticket',
        'ticket',
        ticket.id,
        `${user.first_name} ${user.last_name} zaktualizował zgłoszenie "${ticket.ticket_number}"`,
        { changes: data }
      );
    }

    return updatedTicket;
  }

  /**
   * Assign ticket to user
   */
  async assignTicket(ticketId: string, assigneeId: string, assignedBy: string): Promise<Ticket> {
    const ticket = await this.getTicketById(ticketId);
    ticket.assigned_to = assigneeId;

    const updatedTicket = await this.ticketRepository.save(ticket);

    // Log activity
    const assignee = await this.userRepository.findOne({ where: { id: assigneeId } });
    const assigner = await this.userRepository.findOne({ where: { id: assignedBy } });

    if (assignee && assigner) {
      await activityService.logActivity(
        assignedBy,
        'assigned_ticket',
        'ticket',
        ticketId,
        `${assigner.first_name} ${assigner.last_name} przypisał zgłoszenie "${ticket.ticket_number}" do ${assignee.first_name} ${assignee.last_name}`,
        { assignee_id: assigneeId }
      );
    }

    return updatedTicket;
  }

  /**
   * Update ticket status
   */
  async updateTicketStatus(ticketId: string, status: TicketStatus, userId: string): Promise<Ticket> {
    const ticket = await this.getTicketById(ticketId);
    const oldStatus = ticket.status;
    ticket.status = status;

    if (status === TicketStatus.RESOLVED) {
      ticket.resolved_at = new Date();
    } else if (status === TicketStatus.CLOSED) {
      ticket.closed_at = new Date();
    }

    const updatedTicket = await this.ticketRepository.save(ticket);

    // Log activity
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (user) {
      await activityService.logActivity(
        userId,
        'changed_ticket_status',
        'ticket',
        ticketId,
        `${user.first_name} ${user.last_name} zmienił status zgłoszenia "${ticket.ticket_number}" z "${oldStatus}" na "${status}"`,
        { old_status: oldStatus, new_status: status }
      );
    }

    return updatedTicket;
  }

  /**
   * Delete ticket
   */
  async deleteTicket(id: string, userId: string): Promise<void> {
    const ticket = await this.getTicketById(id);

    await this.ticketRepository.remove(ticket);

    // Log activity
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (user) {
      await activityService.logActivity(
        userId,
        'deleted_ticket',
        'ticket',
        null,
        `${user.first_name} ${user.last_name} usunął zgłoszenie "${ticket.ticket_number}"`,
        { ticket_title: ticket.title }
      );
    }
  }

  /**
   * Add comment to ticket
   */
  async addTicketComment(
    ticketId: string,
    userId: string,
    content: string,
    isInternal: boolean = false
  ): Promise<TicketComment> {
    const comment = this.ticketCommentRepository.create({
      ticket_id: ticketId,
      user_id: userId,
      content,
      is_internal: isInternal,
    });

    const savedComment = await this.ticketCommentRepository.save(comment);

    // Log activity
    const user = await this.userRepository.findOne({ where: { id: userId } });
    const ticket = await this.getTicketById(ticketId);

    if (user) {
      await activityService.logActivity(
        userId,
        'added_ticket_comment',
        'ticket',
        ticketId,
        `${user.first_name} ${user.last_name} dodał komentarz do zgłoszenia "${ticket.ticket_number}"`,
        { is_internal: isInternal }
      );
    }

    return savedComment;
  }

  /**
   * Get ticket comments
   */
  async getTicketComments(ticketId: string, includeInternal: boolean = true): Promise<TicketComment[]> {
    const queryBuilder = this.ticketCommentRepository
      .createQueryBuilder('comment')
      .leftJoinAndSelect('comment.user', 'user')
      .where('comment.ticket_id = :ticketId', { ticketId })
      .orderBy('comment.created_at', 'ASC');

    if (!includeInternal) {
      queryBuilder.andWhere('comment.is_internal = false');
    }

    return await queryBuilder.getMany();
  }

  /**
   * Get ticket statistics
   */
  async getTicketStatistics(): Promise<any> {
    const [total, open, inProgress, resolved, closed] = await Promise.all([
      this.ticketRepository.count(),
      this.ticketRepository.count({ where: { status: TicketStatus.OPEN } }),
      this.ticketRepository.count({ where: { status: TicketStatus.IN_PROGRESS } }),
      this.ticketRepository.count({ where: { status: TicketStatus.RESOLVED } }),
      this.ticketRepository.count({ where: { status: TicketStatus.CLOSED } }),
    ]);

    return {
      total,
      open,
      inProgress,
      resolved,
      closed,
    };
  }
}

export default new TicketService();
