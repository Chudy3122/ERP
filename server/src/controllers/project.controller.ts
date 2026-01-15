import { Request, Response } from 'express';
import projectService from '../services/project.service';
import { ProjectStatus, ProjectPriority } from '../models/Project.model';
import { ProjectMemberRole } from '../models/ProjectMember.model';

export class ProjectController {
  /**
   * Create new project
   * POST /api/projects
   */
  async createProject(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const project = await projectService.createProject(req.body, userId);
      res.status(201).json(project);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  /**
   * Get all projects with filters
   * GET /api/projects
   */
  async getAllProjects(req: Request, res: Response): Promise<void> {
    try {
      const filters = {
        status: req.query.status as ProjectStatus,
        priority: req.query.priority as ProjectPriority,
        managerId: req.query.managerId as string,
        search: req.query.search as string,
        isArchived: req.query.isArchived === 'true',
      };

      const result = await projectService.getAllProjects(filters);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * Get user's projects
   * GET /api/projects/my
   */
  async getUserProjects(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const projects = await projectService.getUserProjects(userId);
      res.json(projects);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * Get project by ID
   * GET /api/projects/:id
   */
  async getProjectById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const project = await projectService.getProjectById(id);
      res.json(project);
    } catch (error: any) {
      res.status(404).json({ message: error.message });
    }
  }

  /**
   * Update project
   * PUT /api/projects/:id
   */
  async updateProject(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      const project = await projectService.updateProject(id, req.body, userId);
      res.json(project);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  /**
   * Delete project
   * DELETE /api/projects/:id
   */
  async deleteProject(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      await projectService.deleteProject(id, userId);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  /**
   * Get project members
   * GET /api/projects/:id/members
   */
  async getProjectMembers(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const members = await projectService.getProjectMembers(id);
      res.json(members);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * Add project member
   * POST /api/projects/:id/members
   */
  async addProjectMember(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { userId, role } = req.body;
      const addedBy = req.user!.userId;

      const member = await projectService.addProjectMember(id, userId, role as ProjectMemberRole, addedBy);
      res.status(201).json(member);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  /**
   * Remove project member
   * DELETE /api/projects/:id/members/:userId
   */
  async removeProjectMember(req: Request, res: Response): Promise<void> {
    try {
      const { id, userId } = req.params;
      const removedBy = req.user!.userId;

      await projectService.removeProjectMember(id, userId, removedBy);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  /**
   * Get project statistics
   * GET /api/projects/:id/statistics
   */
  async getProjectStatistics(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const stats = await projectService.getProjectStatistics(id);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
}

export default new ProjectController();
