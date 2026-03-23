-- Cactus Watch — Central Bill Database Schema
-- Cloudflare D1

-- Legislative sessions
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY,
  session_id INTEGER UNIQUE NOT NULL,
  legislature INTEGER NOT NULL,
  session_code TEXT NOT NULL,
  name TEXT NOT NULL,
  year INTEGER NOT NULL,
  is_current INTEGER DEFAULT 0
);

-- All bills scraped from azleg.gov
CREATE TABLE IF NOT EXISTS bills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES sessions(id),
  azleg_bill_id INTEGER,
  number TEXT NOT NULL,
  short_title TEXT,
  description TEXT,
  sponsor TEXT,
  sponsor_party TEXT,
  chamber TEXT NOT NULL,
  bill_type TEXT NOT NULL,
  date_introduced TEXT,
  last_action TEXT,
  last_action_date TEXT,
  status TEXT NOT NULL DEFAULT 'introduced',
  final_disposition TEXT,
  governor_action TEXT,
  governor_action_date TEXT,
  azleg_url TEXT,
  keywords TEXT,
  overview TEXT,
  dead_reason TEXT,
  deadline_dead_at TEXT,
  original_short_title TEXT,
  scraped_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(session_id, number)
);

-- Bill cosponsors
CREATE TABLE IF NOT EXISTS cosponsors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bill_id INTEGER NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  party TEXT,
  sponsor_type TEXT DEFAULT 'CoSponsor',
  UNIQUE(bill_id, name)
);

-- Committee assignments and actions
CREATE TABLE IF NOT EXISTS committee_actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bill_id INTEGER NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  committee_name TEXT NOT NULL,
  committee_short TEXT NOT NULL,
  chamber TEXT NOT NULL,
  action TEXT,
  ayes INTEGER,
  nays INTEGER,
  action_date TEXT
);

-- Third reading / floor votes
CREATE TABLE IF NOT EXISTS votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bill_id INTEGER NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  azleg_action_id INTEGER,
  chamber TEXT NOT NULL,
  vote_date TEXT,
  yeas INTEGER DEFAULT 0,
  nays INTEGER DEFAULT 0,
  not_voting INTEGER DEFAULT 0,
  excused INTEGER DEFAULT 0,
  result TEXT,
  UNIQUE(bill_id, chamber, azleg_action_id)
);

-- Individual legislator votes on floor votes
CREATE TABLE IF NOT EXISTS vote_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vote_id INTEGER NOT NULL REFERENCES votes(id) ON DELETE CASCADE,
  legislator TEXT NOT NULL,
  party TEXT,
  vote TEXT NOT NULL,
  UNIQUE(vote_id, legislator)
);

-- Floor actions (readings, COW, caucus — parsed from Bill API response, no extra calls)
CREATE TABLE IF NOT EXISTS floor_actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bill_id INTEGER NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  chamber TEXT NOT NULL,
  action_type TEXT NOT NULL,   -- '1st_read', '2nd_read', 'cow', '3rd_read', 'caucus'
  action_date TEXT,
  azleg_action_id INTEGER,     -- BillStatusActionId from FloorHeaders (for COW/THIRD)
  total_votes INTEGER DEFAULT 0,
  UNIQUE(bill_id, chamber, action_type)
);

CREATE INDEX IF NOT EXISTS idx_floor_actions_bill ON floor_actions(bill_id);

-- RTS (Request to Speak) agenda items — scraped nightly from azleg.gov
CREATE TABLE IF NOT EXISTS rts_agendas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agenda_item_id INTEGER NOT NULL UNIQUE,
  bill_number TEXT NOT NULL,
  committee_name TEXT,
  committee_short TEXT,
  chamber TEXT,
  agenda_date TEXT,
  agenda_time TEXT,
  location TEXT,
  can_rts INTEGER DEFAULT 0,
  is_past INTEGER DEFAULT 0,
  positions_for INTEGER DEFAULT 0,
  positions_against INTEGER DEFAULT 0,
  positions_neutral INTEGER DEFAULT 0,
  rts_url TEXT NOT NULL,
  scraped_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rts_agendas_bill ON rts_agendas(bill_number);
CREATE INDEX IF NOT EXISTS idx_rts_agendas_date ON rts_agendas(agenda_date);

-- Organization bill recommendations (CEBV, etc.)
CREATE TABLE IF NOT EXISTS org_recommendations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_code TEXT NOT NULL,
  org_name TEXT NOT NULL,
  bill_number TEXT NOT NULL,
  position TEXT NOT NULL,
  category TEXT,
  description TEXT,
  source_url TEXT NOT NULL,
  source_date TEXT,
  scraped_at TEXT NOT NULL,
  UNIQUE(org_code, bill_number, source_url)
);

CREATE INDEX IF NOT EXISTS idx_org_recs_bill ON org_recommendations(bill_number);
CREATE INDEX IF NOT EXISTS idx_org_recs_org ON org_recommendations(org_code);

-- Scraper audit log
CREATE TABLE IF NOT EXISTS scrape_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  bills_found INTEGER DEFAULT 0,
  bills_new INTEGER DEFAULT 0,
  bills_updated INTEGER DEFAULT 0,
  errors TEXT,
  status TEXT DEFAULT 'running'
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_bills_session ON bills(session_id);
CREATE INDEX IF NOT EXISTS idx_bills_number ON bills(number);
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);
CREATE INDEX IF NOT EXISTS idx_bills_chamber ON bills(chamber);
CREATE INDEX IF NOT EXISTS idx_bills_sponsor ON bills(sponsor);
CREATE INDEX IF NOT EXISTS idx_bills_updated ON bills(updated_at);
CREATE INDEX IF NOT EXISTS idx_cosponsors_bill ON cosponsors(bill_id);
CREATE INDEX IF NOT EXISTS idx_committee_actions_bill ON committee_actions(bill_id);
CREATE INDEX IF NOT EXISTS idx_votes_bill ON votes(bill_id);
CREATE INDEX IF NOT EXISTS idx_vote_records_vote ON vote_records(vote_id);
