-- Create groupgrid_visits table for tracking GroupGrid page visits
-- This table tracks when users visit the GroupGrid page

CREATE TABLE IF NOT EXISTS groupgrid_visits (
  id BIGSERIAL PRIMARY KEY,
  register_number TEXT,
  visited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on register_number for faster lookups
CREATE INDEX IF NOT EXISTS idx_groupgrid_visits_register_number ON groupgrid_visits(register_number);

-- Create index on visited_at for time-based queries
CREATE INDEX IF NOT EXISTS idx_groupgrid_visits_visited_at ON groupgrid_visits(visited_at DESC);

-- Create index on created_at for cleanup queries
CREATE INDEX IF NOT EXISTS idx_groupgrid_visits_created_at ON groupgrid_visits(created_at DESC);

-- Add comment
COMMENT ON TABLE groupgrid_visits IS 'Tracks visits to the GroupGrid page, including register numbers and timestamps';

