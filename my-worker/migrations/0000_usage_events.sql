-- Usage analytics: page views per path/tool (anonymous)
CREATE TABLE IF NOT EXISTS usage_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL,
  anonymous_id TEXT NOT NULL,
  path TEXT NOT NULL,
  tool_id TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_usage_events_ts ON usage_events(ts);
CREATE INDEX IF NOT EXISTS idx_usage_events_tool_id ON usage_events(tool_id);
