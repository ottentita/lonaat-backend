-- Add missing indexes to AI tables
-- SAFE: Only adds indexes, does not modify columns or data

-- ai_memory: Add scope index (key index already exists)
CREATE INDEX IF NOT EXISTS ai_memory_scope_idx ON ai_memory(scope);

-- ai_logs: Indexes already exist (type, created_at)
-- No action needed

-- ai_pipeline_runs: Add pipeline index (status and created_at already exist)
CREATE INDEX IF NOT EXISTS ai_pipeline_runs_pipeline_idx ON ai_pipeline_runs(pipeline);

-- Verification query
SELECT 
    schemaname,
    tablename,
    indexname
FROM 
    pg_indexes
WHERE 
    schemaname = 'public'
    AND tablename IN ('ai_memory', 'ai_logs', 'ai_pipeline_runs')
ORDER BY 
    tablename, indexname;
