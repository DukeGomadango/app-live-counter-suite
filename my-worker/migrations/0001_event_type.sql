-- Add event_type: 'page_view' | 'session_start'. Existing rows stay NULL (treated as page_view in queries).
ALTER TABLE usage_events ADD COLUMN event_type TEXT DEFAULT 'page_view';
