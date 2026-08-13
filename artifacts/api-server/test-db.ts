import { db } from './src/db/index';
import { coolifyResourcesTable } from './src/db/schema';
import { eq } from 'drizzle-orm';
async function run() {
  const res = await db.select().from(coolifyResourcesTable).where(eq(coolifyResourcesTable.projectId, 17));
  console.log('UUID:', res[0]?.coolifyApplicationUuid);
  process.exit(0);
}
run();
