-- Check if AI system tables exist
SELECT 
    table_name,
    table_schema
FROM 
    information_schema.tables
WHERE 
    table_schema = 'public'
    AND table_name IN ('ai_memory', 'ai_logs', 'ai_rules', 'ai_pipeline_runs')
ORDER BY 
    table_name;
