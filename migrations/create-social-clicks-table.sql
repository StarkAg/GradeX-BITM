-- Create social_clicks table to track LinkedIn and GitHub link clicks
CREATE TABLE IF NOT EXISTS social_clicks (
  id BIGSERIAL PRIMARY KEY,
  platform TEXT NOT NULL CHECK (platform IN ('linkedin', 'github')),
  clicked_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  referrer TEXT
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_social_clicks_platform ON social_clicks(platform);
CREATE INDEX IF NOT EXISTS idx_social_clicks_clicked_at ON social_clicks(clicked_at);

-- Enable Row Level Security
ALTER TABLE social_clicks ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows insert access to everyone (for public API)
CREATE POLICY "Allow public insert access" ON social_clicks
  FOR INSERT
  WITH CHECK (true);

-- Create a policy that allows read access to authenticated users only
-- For now, we'll allow public read for admin portal (you can restrict this later)
CREATE POLICY "Allow public read access" ON social_clicks
  FOR SELECT
  USING (true);

-- Add comment
COMMENT ON TABLE social_clicks IS 'Tracks clicks on LinkedIn and GitHub profile links';

