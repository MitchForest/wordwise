-- Add score fields to documents table
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS seo_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS readability_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS style_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS overall_score INTEGER DEFAULT 0;

-- Add indices for performance
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_target_keyword ON documents(target_keyword);
CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON documents(updated_at);

-- Update existing documents with default values
UPDATE documents 
SET 
  seo_score = COALESCE(seo_score, 0),
  readability_score = COALESCE(readability_score, 0),
  style_score = COALESCE(style_score, 0),
  overall_score = COALESCE(overall_score, 0)
WHERE seo_score IS NULL 
   OR readability_score IS NULL 
   OR style_score IS NULL 
   OR overall_score IS NULL;