import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export async function runScoreFieldsMigration() {
  try {
    console.log('Starting score fields migration...');
    
    // Add missing columns
    await db.execute(sql`
      ALTER TABLE documents 
      ADD COLUMN IF NOT EXISTS seo_score INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS readability_score INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS style_score INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS overall_score INTEGER DEFAULT 0
    `);
    
    console.log('Added score columns');
    
    // Add indices
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_documents_target_keyword ON documents(target_keyword);
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON documents(updated_at);
    `);
    
    console.log('Added indices');
    
    // Update existing records
    await db.execute(sql`
      UPDATE documents 
      SET 
        seo_score = COALESCE(seo_score, 0),
        readability_score = COALESCE(readability_score, 0),
        style_score = COALESCE(style_score, 0),
        overall_score = COALESCE(overall_score, 0)
      WHERE seo_score IS NULL 
         OR readability_score IS NULL 
         OR style_score IS NULL 
         OR overall_score IS NULL
    `);
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Run the migration if called directly
if (require.main === module) {
  runScoreFieldsMigration()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}