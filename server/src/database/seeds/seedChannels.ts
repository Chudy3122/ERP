import { AppDataSource } from '../../config/database';
import { Channel, ChannelType } from '../../models/Channel.model';
import { ChannelMember, ChannelMemberRole } from '../../models/ChannelMember.model';
import { User } from '../../models/User.model';

/**
 * Seed script to create example chat channels
 *
 * This will create:
 * - A public company channel
 * - Team channels
 * - Direct message channels between some users
 */

async function seedChannels() {
  try {
    // Initialize database connection
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('✅ Database connection established');
    }

    const channelRepository = AppDataSource.getRepository(Channel);
    const memberRepository = AppDataSource.getRepository(ChannelMember);
    const userRepository = AppDataSource.getRepository(User);

    console.log('\n🌱 Starting channel seeding process...\n');

    // Get all users
    const allUsers = await userRepository.find();
    const admin = allUsers.find((u) => u.email === 'admin@erp.pl');
    const teamLeader1 = allUsers.find((u) => u.email === 'jan.kowalski@erp.pl');
    const teamLeader2 = allUsers.find((u) => u.email === 'anna.nowak@erp.pl');
    const employees = allUsers.filter((u) => u.role === 'employee');

    if (!admin || !teamLeader1 || !teamLeader2 || employees.length === 0) {
      console.error('❌ Not enough users found. Please run seed:users first.');
      process.exit(1);
    }

    let createdCount = 0;
    let skippedCount = 0;

    // 1. Create public company channel
    const companyChannelName = 'Ogłoszenia Firmowe';
    let companyChannel = await channelRepository.findOne({
      where: { name: companyChannelName, type: ChannelType.PUBLIC },
    });

    if (!companyChannel) {
      companyChannel = channelRepository.create({
        name: companyChannelName,
        description: 'Oficjalny kanał dla ogłoszeń i komunikatów firmowych',
        type: ChannelType.PUBLIC,
        created_by: admin.id,
      });
      await channelRepository.save(companyChannel);

      // Add all users as members
      for (const user of allUsers) {
        const member = memberRepository.create({
          channel_id: companyChannel.id,
          user_id: user.id,
          role: user.id === admin.id ? ChannelMemberRole.ADMIN : ChannelMemberRole.MEMBER,
        });
        await memberRepository.save(member);
      }

      console.log(`✅ Created PUBLIC channel  | ${companyChannelName}`);
      createdCount++;
    } else {
      console.log(`⏭️  Skipped ${companyChannelName} - already exists`);
      skippedCount++;
    }

    // 2. Create team channel for Team Leader 1
    const team1ChannelName = 'Zespół - Jan Kowalski';
    let team1Channel = await channelRepository.findOne({
      where: { name: team1ChannelName },
    });

    if (!team1Channel) {
      team1Channel = channelRepository.create({
        name: team1ChannelName,
        description: 'Kanał zespołu Jana Kowalskiego',
        type: ChannelType.GROUP,
        created_by: teamLeader1.id,
      });
      await channelRepository.save(team1Channel);

      // Add team leader and first 5 employees
      const team1Members = [teamLeader1, ...employees.slice(0, 5)];
      for (const user of team1Members) {
        const member = memberRepository.create({
          channel_id: team1Channel.id,
          user_id: user.id,
          role: user.id === teamLeader1.id ? ChannelMemberRole.ADMIN : ChannelMemberRole.MEMBER,
        });
        await memberRepository.save(member);
      }

      console.log(`✅ Created GROUP channel   | ${team1ChannelName}`);
      createdCount++;
    } else {
      console.log(`⏭️  Skipped ${team1ChannelName} - already exists`);
      skippedCount++;
    }

    // 3. Create team channel for Team Leader 2
    const team2ChannelName = 'Zespół - Anna Nowak';
    let team2Channel = await channelRepository.findOne({
      where: { name: team2ChannelName },
    });

    if (!team2Channel) {
      team2Channel = channelRepository.create({
        name: team2ChannelName,
        description: 'Kanał zespołu Anny Nowak',
        type: ChannelType.GROUP,
        created_by: teamLeader2.id,
      });
      await channelRepository.save(team2Channel);

      // Add team leader and last 5 employees
      const team2Members = [teamLeader2, ...employees.slice(5)];
      for (const user of team2Members) {
        const member = memberRepository.create({
          channel_id: team2Channel.id,
          user_id: user.id,
          role: user.id === teamLeader2.id ? ChannelMemberRole.ADMIN : ChannelMemberRole.MEMBER,
        });
        await memberRepository.save(member);
      }

      console.log(`✅ Created GROUP channel   | ${team2ChannelName}`);
      createdCount++;
    } else {
      console.log(`⏭️  Skipped ${team2ChannelName} - already exists`);
      skippedCount++;
    }

    // 4. Create some direct message channels
    const directPairs = [
      [admin, teamLeader1],
      [admin, teamLeader2],
      [teamLeader1, teamLeader2],
      [teamLeader1, employees[0]],
      [teamLeader2, employees[5]],
    ];

    for (const [user1, user2] of directPairs) {
      if (!user1 || !user2) continue;

      // Check if direct channel already exists between these users
      const existingChannel = await channelRepository
        .createQueryBuilder('channel')
        .leftJoin('channel.members', 'member')
        .where('channel.type = :type', { type: ChannelType.DIRECT })
        .andWhere('member.user_id IN (:...userIds)', { userIds: [user1.id, user2.id] })
        .groupBy('channel.id')
        .having('COUNT(DISTINCT member.user_id) = 2')
        .getOne();

      if (!existingChannel) {
        const directChannel = channelRepository.create({
          type: ChannelType.DIRECT,
          created_by: user1.id,
        });
        await channelRepository.save(directChannel);

        // Add both users as members
        for (const user of [user1, user2]) {
          const member = memberRepository.create({
            channel_id: directChannel.id,
            user_id: user.id,
            role: ChannelMemberRole.MEMBER,
          });
          await memberRepository.save(member);
        }

        console.log(
          `✅ Created DIRECT channel  | ${user1.first_name} ${user1.last_name} ↔ ${user2.first_name} ${user2.last_name}`
        );
        createdCount++;
      } else {
        skippedCount++;
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('🎉 Channel seeding completed!');
    console.log('='.repeat(80));
    console.log(`✅ Created: ${createdCount} channels`);
    console.log(`⏭️  Skipped: ${skippedCount} channels (already exist)`);
    console.log('='.repeat(80));

    console.log('\n📋 CHANNELS CREATED:');
    console.log('='.repeat(80));
    console.log('1. Ogłoszenia Firmowe (PUBLIC) - All users');
    console.log('2. Zespół - Jan Kowalski (GROUP) - Team Leader 1 + 5 employees');
    console.log('3. Zespół - Anna Nowak (GROUP) - Team Leader 2 + 5 employees');
    console.log('4. Direct messages between key users');
    console.log('='.repeat(80) + '\n');

    // Close connection
    await AppDataSource.destroy();
    console.log('✅ Database connection closed\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding channels:', error);
    process.exit(1);
  }
}

// Run the seed function
seedChannels();
