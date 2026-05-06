-- Add key_takeaways and definitions columns to articles table
ALTER TABLE articles
ADD COLUMN IF NOT EXISTS key_takeaways text[],
ADD COLUMN IF NOT EXISTS definitions jsonb;

-- Add comments for documentation
COMMENT ON COLUMN articles.key_takeaways IS 'Array of key takeaway points for TL;DR section';
COMMENT ON COLUMN articles.definitions IS 'Array of {term, meaning} objects for key terms section';
