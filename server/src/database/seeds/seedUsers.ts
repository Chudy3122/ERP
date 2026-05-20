import { AppDataSource } from '../../config/database';
import { User, UserRole } from '../../models/User.model';
import { hashPassword } from '../../utils/password.utils';

/**
 * Seed script to populate the database with test users
 *
 * ADMIN CREDENTIALS:
 * Email: admin@erp.pl
 * Password: Admin123!
 *
 * All test users have the same password: Test123!
 */

interface TestUser {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: UserRole;
}

const testUsers: TestUser[] = [
  // ADMIN ACCOUNT
  {
    email: 'admin@erp.pl',
    password: 'Admin123!',
    first_name: 'Administrator',
    last_name: 'Systemu',
    role: UserRole.ADMIN,
  },

  // TEAM LEADERS (2)
  {
    email: 'jan.kowalski@erp.pl',
    password: 'Test123!',
    first_name: 'Jan',
    last_name: 'Kowalski',
    role: UserRole.KIEROWNIK,
  },
  {
    email: 'anna.nowak@erp.pl',
    password: 'Test123!',
    first_name: 'Anna',
    last_name: 'Nowak',
    role: UserRole.KIEROWNIK,
  },

  // EMPLOYEES (10)
  {
    email: 'piotr.wisniewski@erp.pl',
    password: 'Test123!',
    first_name: 'Piotr',
    last_name: 'Wiśniewski',
    role: UserRole.EMPLOYEE,
  },
  {
    email: 'maria.wojcik@erp.pl',
    password: 'Test123!',
    first_name: 'Maria',
    last_name: 'Wójcik',
    role: UserRole.EMPLOYEE,
  },
  {
    email: 'krzysztof.kaminski@erp.pl',
    password: 'Test123!',
    first_name: 'Krzysztof',
    last_name: 'Kamiński',
    role: UserRole.EMPLOYEE,
  },
  {
    email: 'katarzyna.lewandowska@erp.pl',
    password: 'Test123!',
    first_name: 'Katarzyna',
    last_name: 'Lewandowska',
    role: UserRole.EMPLOYEE,
  },
  {
    email: 'tomasz.zielinski@erp.pl',
    password: 'Test123!',
    first_name: 'Tomasz',
    last_name: 'Zieliński',
    role: UserRole.EMPLOYEE,
  },
  {
    email: 'magdalena.szymanska@erp.pl',
    password: 'Test123!',
    first_name: 'Magdalena',
    last_name: 'Szymańska',
    role: UserRole.EMPLOYEE,
  },
  {
    email: 'jakub.wozniak@erp.pl',
    password: 'Test123!',
    first_name: 'Jakub',
    last_name: 'Woźniak',
    role: UserRole.EMPLOYEE,
  },
  {
    email: 'agnieszka.dabrowski@erp.pl',
    password: 'Test123!',
    first_name: 'Agnieszka',
    last_name: 'Dąbrowska',
    role: UserRole.EMPLOYEE,
  },
  {
    email: 'marcin.kozlowski@erp.pl',
    password: 'Test123!',
    first_name: 'Marcin',
    last_name: 'Kozłowski',
    role: UserRole.EMPLOYEE,
  },
  {
    email: 'joanna.jankowska@erp.pl',
    password: 'Test123!',
    first_name: 'Joanna',
    last_name: 'Jankowska',
    role: UserRole.EMPLOYEE,
  },
];

async function seedUsers() {
  try {
    // Initialize database connection
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('✅ Database connection established');
    }

    const userRepository = AppDataSource.getRepository(User);

    console.log('\n🌱 Starting user seeding process...\n');

    let createdCount = 0;
    let skippedCount = 0;

    for (const userData of testUsers) {
      // Check if user already exists
      const existingUser = await userRepository.findOne({
        where: { email: userData.email },
      });

      if (existingUser) {
        console.log(`⏭️  Skipping ${userData.email} - already exists`);
        skippedCount++;
        continue;
      }

      // Hash password
      const hashedPassword = await hashPassword(userData.password);

      // Create user
      const user = userRepository.create({
        email: userData.email,
        password_hash: hashedPassword,
        first_name: userData.first_name,
        last_name: userData.last_name,
        role: userData.role,
      });

      await userRepository.save(user);

      console.log(
        `✅ Created ${userData.role.padEnd(12)} | ${userData.email.padEnd(35)} | ${userData.first_name} ${userData.last_name}`
      );
      createdCount++;
    }

    console.log('\n' + '='.repeat(80));
    console.log('🎉 User seeding completed!');
    console.log('='.repeat(80));
    console.log(`✅ Created: ${createdCount} users`);
    console.log(`⏭️  Skipped: ${skippedCount} users (already exist)`);
    console.log('='.repeat(80));

    console.log('\n📋 ADMIN LOGIN CREDENTIALS:');
    console.log('='.repeat(80));
    console.log('Email:    admin@erp.pl');
    console.log('Password: Admin123!');
    console.log('='.repeat(80));

    console.log('\n📋 TEST USER LOGIN (all test users):');
    console.log('='.repeat(80));
    console.log('Password: Test123!');
    console.log('Emails:');
    testUsers.slice(1).forEach((user) => {
      console.log(`  - ${user.email.padEnd(35)} | ${user.first_name} ${user.last_name} (${user.role})`);
    });
    console.log('='.repeat(80) + '\n');

    // Close connection
    await AppDataSource.destroy();
    console.log('✅ Database connection closed\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding users:', error);
    process.exit(1);
  }
}

// Run the seed function
seedUsers();
