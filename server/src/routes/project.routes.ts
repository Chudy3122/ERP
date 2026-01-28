import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import projectController from '../controllers/project.controller';
import { workLogController } from '../controllers/worklog.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { UserRole } from '../models/User.model';

const router = Router();

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

// All routes require authentication
router.use(authenticate);

// Project CRUD
router.post('/', projectController.createProject.bind(projectController));
router.get('/', projectController.getAllProjects.bind(projectController));
router.get('/my', projectController.getUserProjects.bind(projectController));
router.get('/:id', projectController.getProjectById.bind(projectController));
router.put('/:id', projectController.updateProject.bind(projectController));
router.delete('/:id', requireRole([UserRole.ADMIN, UserRole.TEAM_LEADER]), projectController.deleteProject.bind(projectController));

// Project members
router.get('/:id/members', projectController.getProjectMembers.bind(projectController));
router.post('/:id/members', requireRole([UserRole.ADMIN, UserRole.TEAM_LEADER]), projectController.addProjectMember.bind(projectController));
router.delete('/:id/members/:userId', requireRole([UserRole.ADMIN, UserRole.TEAM_LEADER]), projectController.removeProjectMember.bind(projectController));

// Project statistics
router.get('/:id/statistics', projectController.getProjectStatistics.bind(projectController));

// Project attachments
router.post('/:id/attachments', upload.array('files', 10), projectController.uploadAttachments.bind(projectController));
router.get('/:id/attachments', projectController.getAttachments.bind(projectController));
router.delete('/:id/attachments/:attachmentId', projectController.deleteAttachment.bind(projectController));

// Project activity
router.get('/:id/activity', projectController.getProjectActivity.bind(projectController));

// Project work logs
router.get('/:id/work-logs', workLogController.getProjectWorkLogs.bind(workLogController));
router.get('/:id/time-stats', workLogController.getProjectTimeStats.bind(workLogController));

export default router;
