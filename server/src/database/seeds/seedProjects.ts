import { AppDataSource } from '../../config/database';
import { Project, ProjectStatus, ProjectPriority } from '../../models/Project.model';
import { ProjectMember, ProjectMemberRole } from '../../models/ProjectMember.model';
import { Task, TaskStatus, TaskPriority } from '../../models/Task.model';
import { Ticket, TicketType, TicketStatus, TicketPriority } from '../../models/Ticket.model';
import { User } from '../../models/User.model';

async function seedProjects() {
  try {
    await AppDataSource.initialize();
    console.log('Database connected for seeding...');

    const projectRepository = AppDataSource.getRepository(Project);
    const projectMemberRepository = AppDataSource.getRepository(ProjectMember);
    const taskRepository = AppDataSource.getRepository(Task);
    const ticketRepository = AppDataSource.getRepository(Ticket);
    const userRepository = AppDataSource.getRepository(User);

    // Get existing users
    const users = await userRepository.find();
    if (users.length === 0) {
      console.log('No users found. Please run seedUsers first.');
      await AppDataSource.destroy();
      return;
    }

    const admin = users.find((u) => u.role === 'admin');
    const teamLeader = users.find((u) => u.role === 'team_leader');
    const employees = users.filter((u) => u.role === 'employee');

    if (!admin) {
      console.log('No admin user found. Please run seedUsers first.');
      await AppDataSource.destroy();
      return;
    }

    // Clear existing data
    console.log('Clearing existing data...');
    // First get all IDs and delete them one by one to avoid FK issues
    const existingTickets = await ticketRepository.find();
    if (existingTickets.length > 0) {
      await ticketRepository.remove(existingTickets);
    }

    const existingTasks = await taskRepository.find();
    if (existingTasks.length > 0) {
      await taskRepository.remove(existingTasks);
    }

    const existingMembers = await projectMemberRepository.find();
    if (existingMembers.length > 0) {
      await projectMemberRepository.remove(existingMembers);
    }

    const existingProjects = await projectRepository.find();
    if (existingProjects.length > 0) {
      await projectRepository.remove(existingProjects);
    }

    console.log('Creating projects...');

    // Project 1: ERP System
    const erpProject = projectRepository.create({
      name: 'System ERP',
      code: 'ERP-001',
      description: 'Kompleksowy system zarządzania zasobami przedsiębiorstwa',
      status: ProjectStatus.ACTIVE,
      priority: ProjectPriority.HIGH,
      start_date: new Date('2024-01-01'),
      target_end_date: new Date('2024-12-31'),
      budget: 500000,
      manager_id: admin.id,
      created_by: admin.id,
    });
    await projectRepository.save(erpProject);

    // Add project members
    await projectMemberRepository.save([
      projectMemberRepository.create({
        project_id: erpProject.id,
        user_id: admin.id,
        role: ProjectMemberRole.LEAD,
        joined_at: new Date(),
      }),
      ...(teamLeader
        ? [
            projectMemberRepository.create({
              project_id: erpProject.id,
              user_id: teamLeader.id,
              role: ProjectMemberRole.MEMBER,
              joined_at: new Date(),
            }),
          ]
        : []),
      ...employees.slice(0, 2).map((emp) =>
        projectMemberRepository.create({
          project_id: erpProject.id,
          user_id: emp.id,
          role: ProjectMemberRole.MEMBER,
          joined_at: new Date(),
        })
      ),
    ]);

    // Project 2: Mobile App
    const mobileProject = projectRepository.create({
      name: 'Aplikacja mobilna',
      code: 'MOB-001',
      description: 'Aplikacja mobilna dla pracowników terenowych',
      status: ProjectStatus.ACTIVE,
      priority: ProjectPriority.MEDIUM,
      start_date: new Date('2024-03-01'),
      target_end_date: new Date('2024-09-30'),
      budget: 200000,
      manager_id: teamLeader?.id || admin.id,
      created_by: admin.id,
    });
    await projectRepository.save(mobileProject);

    await projectMemberRepository.save([
      projectMemberRepository.create({
        project_id: mobileProject.id,
        user_id: teamLeader?.id || admin.id,
        role: ProjectMemberRole.LEAD,
        joined_at: new Date(),
      }),
      ...employees.slice(2, 4).map((emp) =>
        projectMemberRepository.create({
          project_id: mobileProject.id,
          user_id: emp.id,
          role: ProjectMemberRole.MEMBER,
          joined_at: new Date(),
        })
      ),
    ]);

    // Project 3: Website Redesign
    const websiteProject = projectRepository.create({
      name: 'Redesign strony www',
      code: 'WEB-001',
      description: 'Nowy design i funkcjonalności strony internetowej',
      status: ProjectStatus.PLANNING,
      priority: ProjectPriority.LOW,
      start_date: new Date('2024-06-01'),
      manager_id: admin.id,
      created_by: admin.id,
    });
    await projectRepository.save(websiteProject);

    console.log('✅ Projects created successfully');

    // Create tasks
    console.log('Creating tasks...');

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const tasks = [
      // ERP Tasks
      taskRepository.create({
        title: 'Implementacja modułu projektów',
        description: 'Stworzenie pełnego CRUD dla projektów',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
        project_id: erpProject.id,
        assigned_to: employees[0]?.id || admin.id,
        created_by: admin.id,
        due_date: tomorrow,
        estimated_hours: 16,
      }),
      taskRepository.create({
        title: 'Testy modułu czasu pracy',
        description: 'Przygotowanie i wykonanie testów jednostkowych',
        status: TaskStatus.TODO,
        priority: TaskPriority.MEDIUM,
        project_id: erpProject.id,
        assigned_to: employees[1]?.id || admin.id,
        created_by: admin.id,
        due_date: nextWeek,
        estimated_hours: 8,
      }),
      taskRepository.create({
        title: 'Dokumentacja API',
        description: 'Aktualizacja dokumentacji endpointów API',
        status: TaskStatus.DONE,
        priority: TaskPriority.LOW,
        project_id: erpProject.id,
        assigned_to: admin.id,
        created_by: admin.id,
        completed_at: new Date(),
        estimated_hours: 4,
        actual_hours: 5,
      }),
      // Mobile tasks
      taskRepository.create({
        title: 'Design ekranu logowania',
        description: 'Przygotowanie mockupów i prototypu',
        status: TaskStatus.REVIEW,
        priority: TaskPriority.HIGH,
        project_id: mobileProject.id,
        assigned_to: employees[2]?.id || admin.id,
        created_by: teamLeader?.id || admin.id,
        due_date: today,
        estimated_hours: 6,
      }),
      taskRepository.create({
        title: 'Integracja z API',
        description: 'Połączenie aplikacji mobilnej z backendem',
        status: TaskStatus.TODO,
        priority: TaskPriority.HIGH,
        project_id: mobileProject.id,
        assigned_to: employees[3]?.id || admin.id,
        created_by: teamLeader?.id || admin.id,
        due_date: nextWeek,
        estimated_hours: 20,
      }),
    ];

    await taskRepository.save(tasks);
    console.log('✅ Tasks created successfully');

    // Create tickets
    console.log('Creating tickets...');

    const tickets = [
      ticketRepository.create({
        ticket_number: 'TICK-001',
        title: 'Błąd przy logowaniu użytkownika',
        description: 'Użytkownicy zgłaszają problemy z logowaniem przez SSO',
        type: TicketType.BUG,
        status: TicketStatus.OPEN,
        priority: TicketPriority.HIGH,
        project_id: erpProject.id,
        created_by: employees[0]?.id || admin.id,
        assigned_to: admin.id,
      }),
      ticketRepository.create({
        ticket_number: 'TICK-002',
        title: 'Nowa funkcja: eksport raportów do PDF',
        description: 'Możliwość eksportowania raportów czasu pracy do PDF',
        type: TicketType.FEATURE_REQUEST,
        status: TicketStatus.IN_PROGRESS,
        priority: TicketPriority.NORMAL,
        project_id: erpProject.id,
        created_by: teamLeader?.id || admin.id,
        assigned_to: employees[1]?.id || admin.id,
      }),
      ticketRepository.create({
        ticket_number: 'TICK-003',
        title: 'Pytanie: jak skonfigurować powiadomienia?',
        description: 'Potrzebuję pomocy w konfiguracji powiadomień email',
        type: TicketType.QUESTION,
        status: TicketStatus.RESOLVED,
        priority: TicketPriority.LOW,
        project_id: erpProject.id,
        created_by: employees[2]?.id || admin.id,
        assigned_to: admin.id,
        resolved_at: new Date(),
      }),
      ticketRepository.create({
        ticket_number: 'TICK-004',
        title: 'Aplikacja mobilna nie synchronizuje danych',
        description: 'Po aktualizacji aplikacja nie synchronizuje się z serwerem',
        type: TicketType.BUG,
        status: TicketStatus.OPEN,
        priority: TicketPriority.URGENT,
        project_id: mobileProject.id,
        created_by: employees[3]?.id || admin.id,
        assigned_to: teamLeader?.id || admin.id,
      }),
    ];

    await ticketRepository.save(tickets);
    console.log('✅ Tickets created successfully');

    console.log('\n=== Seed Summary ===');
    console.log(`Projects: ${await projectRepository.count()}`);
    console.log(`Project Members: ${await projectMemberRepository.count()}`);
    console.log(`Tasks: ${await taskRepository.count()}`);
    console.log(`Tickets: ${await ticketRepository.count()}`);

    await AppDataSource.destroy();
    console.log('\n✅ Seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedProjects();
