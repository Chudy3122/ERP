import { AppDataSource } from '../../config/database';
import { Department } from '../../models/Department.model';
import { In } from 'typeorm';

export async function seedDepartments(): Promise<void> {
  const repo = AppDataSource.getRepository(Department);

  // Remove seeded duplicates created by initial seed run — original departments already exist with different codes
  const duplicateCodes = ['SZEF', 'SEK', 'REL', 'PIS', 'KAD', 'INW'];
  const toDelete = await repo.find({ where: { code: In(duplicateCodes) } });
  if (toDelete.length > 0) {
    await repo.remove(toDelete);
    console.log(`✓ Removed ${toDelete.length} duplicate seeded department(s)`);
  }

  // Rename BUR → Biuro Usług Rozwojowych if still using old name
  const bur = await repo.findOne({ where: { code: 'BUR' } });
  if (bur && bur.name !== 'Biuro Usług Rozwojowych') {
    bur.name = 'Biuro Usług Rozwojowych';
    await repo.save(bur);
    console.log('✓ Renamed BUR → Biuro Usług Rozwojowych');
  }
}
