import { Router } from 'express';
import ticketController from '../controllers/ticket.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { UserRole } from '../models/User.model';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Statistics (before :id routes)
router.get('/statistics', requireRole([UserRole.ADMIN, UserRole.TEAM_LEADER]), ticketController.getTicketStatistics.bind(ticketController));

// User tickets
router.get('/my', ticketController.getUserTickets.bind(ticketController));
router.get('/assigned', ticketController.getAssignedTickets.bind(ticketController));

// Ticket CRUD
router.post('/', ticketController.createTicket.bind(ticketController));
router.get('/', ticketController.getAllTickets.bind(ticketController));
router.get('/:id', ticketController.getTicketById.bind(ticketController));
router.put('/:id', ticketController.updateTicket.bind(ticketController));
router.delete('/:id', requireRole([UserRole.ADMIN, UserRole.TEAM_LEADER]), ticketController.deleteTicket.bind(ticketController));

// Ticket actions
router.put('/:id/assign', requireRole([UserRole.ADMIN, UserRole.TEAM_LEADER]), ticketController.assignTicket.bind(ticketController));
router.put('/:id/status', ticketController.updateTicketStatus.bind(ticketController));

// Ticket comments
router.post('/:id/comments', ticketController.addTicketComment.bind(ticketController));
router.get('/:id/comments', ticketController.getTicketComments.bind(ticketController));

export default router;
