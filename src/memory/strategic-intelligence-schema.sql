-- Strategic Intelligence Schema for Claude-Flow
-- Adds systematic problem/solution tracking and strategic intelligence to existing memory system
-- Based on claude-super-agents strategic intelligence layer but integrated with claude-flow architecture

-- Strategic Items Table - Core tracking for problems, solutions, assessments, and findings
CREATE TABLE IF NOT EXISTS strategic_items (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('problem', 'solution', 'assessment', 'finding')),
    title TEXT NOT NULL,
    domain TEXT NOT NULL,
    file_path TEXT,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'evaluating', 'in_progress', 'done', 'blocked')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Autonomous Intelligence Fields
    agent_last_assessed TEXT,
    agent_confidence REAL DEFAULT 0.0,
    agent_analysis TEXT,
    implementation_progress REAL DEFAULT 0.0,
    autonomous_score REAL DEFAULT 0.0,
    evidence_strength REAL DEFAULT 0.0,
    
    -- Strategic Context
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
    impact_level TEXT DEFAULT 'medium' CHECK (impact_level IN ('critical', 'high', 'medium', 'low')),
    complexity_score REAL DEFAULT 0.5,
    risk_level REAL DEFAULT 0.5,
    
    -- Integration with Claude-Flow
    session_id TEXT,
    swarm_id TEXT,
    agent_id TEXT,
    task_id TEXT,
    
    -- Metadata
    tags TEXT, -- JSON array of tags
    metadata TEXT, -- JSON object for additional data
    
    FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE SET NULL
);

-- Strategic Relationships Table - Track connections between strategic items
CREATE TABLE IF NOT EXISTS strategic_relationships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id TEXT NOT NULL,
    target_id TEXT NOT NULL,
    relation_type TEXT NOT NULL CHECK (relation_type IN ('related', 'blocks', 'implements', 'supersedes', 'depends_on', 'validates')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Autonomous Discovery
    discovery_agent TEXT,
    confidence REAL DEFAULT 0.0,
    evidence TEXT,
    
    -- Relationship Metadata
    strength REAL DEFAULT 0.5,
    bidirectional BOOLEAN DEFAULT FALSE,
    
    FOREIGN KEY (source_id) REFERENCES strategic_items(id) ON DELETE CASCADE,
    FOREIGN KEY (target_id) REFERENCES strategic_items(id) ON DELETE CASCADE,
    UNIQUE(source_id, target_id, relation_type)
);

-- Strategic Events Table - Track changes and updates to strategic items
CREATE TABLE IF NOT EXISTS strategic_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    strategic_id TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('created', 'status_changed', 'updated', 'agent_assessed', 'relationship_added', 'evidence_added')),
    old_value TEXT,
    new_value TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Agent/System Context
    agent_source TEXT,
    confidence REAL DEFAULT 0.0,
    evidence TEXT,
    
    -- Integration Context
    session_id TEXT,
    swarm_id TEXT,
    task_id TEXT,
    
    -- Event Metadata
    metadata TEXT, -- JSON object
    
    FOREIGN KEY (strategic_id) REFERENCES strategic_items(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE SET NULL
);

-- Strategic Metadata Table - Extended metadata and analysis
CREATE TABLE IF NOT EXISTS strategic_metadata (
    strategic_id TEXT PRIMARY KEY,
    
    -- Analysis Data
    complexity_analysis TEXT, -- JSON object
    impact_analysis TEXT, -- JSON object
    risk_analysis TEXT, -- JSON object
    
    -- Implementation Data
    implementation_plan TEXT, -- JSON object
    verification_criteria TEXT, -- JSON array
    success_metrics TEXT, -- JSON object
    
    -- Agent Coordination
    assigned_agents TEXT, -- JSON array of agent IDs
    coordination_data TEXT, -- JSON object
    
    -- Timeline
    estimated_effort REAL,
    target_completion TIMESTAMP,
    actual_completion TIMESTAMP,
    
    -- External References
    external_refs TEXT, -- JSON array of external references
    documentation_links TEXT, -- JSON array
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (strategic_id) REFERENCES strategic_items(id) ON DELETE CASCADE
);

-- Performance Indexes for Strategic Intelligence
CREATE INDEX IF NOT EXISTS idx_strategic_items_type ON strategic_items(type);
CREATE INDEX IF NOT EXISTS idx_strategic_items_status ON strategic_items(status);
CREATE INDEX IF NOT EXISTS idx_strategic_items_domain ON strategic_items(domain);
CREATE INDEX IF NOT EXISTS idx_strategic_items_priority ON strategic_items(priority);
CREATE INDEX IF NOT EXISTS idx_strategic_items_session ON strategic_items(session_id);
CREATE INDEX IF NOT EXISTS idx_strategic_items_swarm ON strategic_items(swarm_id);
CREATE INDEX IF NOT EXISTS idx_strategic_items_composite ON strategic_items(type, status, domain);
CREATE INDEX IF NOT EXISTS idx_strategic_items_autonomous ON strategic_items(agent_last_assessed, autonomous_score);

CREATE INDEX IF NOT EXISTS idx_strategic_relationships_source ON strategic_relationships(source_id);
CREATE INDEX IF NOT EXISTS idx_strategic_relationships_target ON strategic_relationships(target_id);
CREATE INDEX IF NOT EXISTS idx_strategic_relationships_type ON strategic_relationships(relation_type);
CREATE INDEX IF NOT EXISTS idx_strategic_relationships_discovery ON strategic_relationships(discovery_agent, confidence);

CREATE INDEX IF NOT EXISTS idx_strategic_events_strategic_id ON strategic_events(strategic_id);
CREATE INDEX IF NOT EXISTS idx_strategic_events_type ON strategic_events(event_type);
CREATE INDEX IF NOT EXISTS idx_strategic_events_timestamp ON strategic_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_strategic_events_agent ON strategic_events(agent_source);
CREATE INDEX IF NOT EXISTS idx_strategic_events_session ON strategic_events(session_id);

-- Views for Common Strategic Intelligence Queries

-- Active Strategic Items by Priority
CREATE VIEW IF NOT EXISTS view_active_strategic_items AS
SELECT 
    si.*,
    sm.complexity_analysis,
    sm.implementation_plan,
    sm.assigned_agents,
    COUNT(sr.target_id) as relationship_count
FROM strategic_items si
LEFT JOIN strategic_metadata sm ON si.id = sm.strategic_id
LEFT JOIN strategic_relationships sr ON si.id = sr.source_id
WHERE si.status NOT IN ('done', 'blocked')
GROUP BY si.id
ORDER BY 
    CASE si.priority 
        WHEN 'critical' THEN 1 
        WHEN 'high' THEN 2 
        WHEN 'medium' THEN 3 
        WHEN 'low' THEN 4 
    END,
    si.autonomous_score DESC;

-- Strategic Intelligence Dashboard Data
CREATE VIEW IF NOT EXISTS view_strategic_dashboard AS
SELECT 
    domain,
    COUNT(*) as total_items,
    SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) as new_items,
    SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as active_items,
    SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as completed_items,
    SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END) as blocked_items,
    AVG(autonomous_score) as avg_autonomous_score,
    AVG(implementation_progress) as avg_progress,
    COUNT(DISTINCT agent_last_assessed) as active_agents,
    MAX(updated_at) as last_activity
FROM strategic_items
GROUP BY domain
ORDER BY total_items DESC;

-- Recent Strategic Intelligence Activity
CREATE VIEW IF NOT EXISTS view_recent_strategic_activity AS
SELECT 
    se.timestamp,
    se.event_type,
    si.id as strategic_id,
    si.type,
    si.title,
    si.domain,
    si.status,
    se.agent_source,
    se.confidence,
    se.old_value,
    se.new_value
FROM strategic_events se
JOIN strategic_items si ON se.strategic_id = si.id
ORDER BY se.timestamp DESC
LIMIT 50;

-- Triggers for Strategic Intelligence Automation

-- Auto-update timestamp on strategic_items changes
CREATE TRIGGER IF NOT EXISTS trigger_strategic_items_updated_at
    AFTER UPDATE ON strategic_items
    FOR EACH ROW
BEGIN
    UPDATE strategic_items 
    SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
END;

-- Auto-create events for strategic item changes
CREATE TRIGGER IF NOT EXISTS trigger_strategic_status_change
    AFTER UPDATE OF status ON strategic_items
    FOR EACH ROW
    WHEN OLD.status != NEW.status
BEGIN
    INSERT INTO strategic_events (strategic_id, event_type, old_value, new_value, agent_source, session_id)
    VALUES (NEW.id, 'status_changed', OLD.status, NEW.status, NEW.agent_last_assessed, NEW.session_id);
END;

-- Auto-create events for agent assessments
CREATE TRIGGER IF NOT EXISTS trigger_strategic_agent_assessment
    AFTER UPDATE OF agent_last_assessed, agent_confidence, autonomous_score ON strategic_items
    FOR EACH ROW
    WHEN (OLD.agent_last_assessed IS NULL OR OLD.agent_last_assessed != NEW.agent_last_assessed)
       OR (OLD.agent_confidence != NEW.agent_confidence)
       OR (OLD.autonomous_score != NEW.autonomous_score)
BEGIN
    INSERT INTO strategic_events (strategic_id, event_type, new_value, agent_source, confidence, session_id)
    VALUES (NEW.id, 'agent_assessed', 
            json_object('confidence', NEW.agent_confidence, 'score', NEW.autonomous_score),
            NEW.agent_last_assessed, NEW.agent_confidence, NEW.session_id);
END;

-- Auto-update metadata timestamp
CREATE TRIGGER IF NOT EXISTS trigger_strategic_metadata_updated_at
    AFTER UPDATE ON strategic_metadata
    FOR EACH ROW
BEGIN
    UPDATE strategic_metadata 
    SET updated_at = CURRENT_TIMESTAMP 
    WHERE strategic_id = NEW.strategic_id;
END;