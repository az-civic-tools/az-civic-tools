-- CEBV Weekly Import — 2026-03-30
-- Source: https://weekly.cebv.us/2026-03-30/
-- 6 new bill positions (5 oppose, 1 support) + 1 updated (SB1176 striker)

-- ============================================================
-- UPDATE: SB1176 — striker completely replaced original bill
-- Was: Energy, Water & Climate / "Allow storm water storage for replenishment credits"
-- Now: Voting Rights / striker banning cities/counties from hiring lobbyists
-- ============================================================

UPDATE org_recommendations
SET category = 'Voting Rights',
    description = 'Striker banning cities and counties from hiring lobbyists to represent their interests at the legislature',
    source_url = 'https://weekly.cebv.us/2026-03-30/',
    source_date = '2026-03-30',
    scraped_at = datetime('now')
WHERE org_code = 'CEBV' AND bill_number = 'SB1176';

-- ============================================================
-- Voting Rights (2 new ballot referrals)
-- ============================================================

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SCR1012', 'oppose', 'Voting Rights', 'Striker asking voters to give lawmakers a huge raise; 60% of governor salary ($57K) starting 2027', 'https://weekly.cebv.us/2026-03-30/', '2026-03-30', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SCR1020', 'support', 'Voting Rights', 'Annual inflation adjustments for state lawmaker salaries', 'https://weekly.cebv.us/2026-03-30/', '2026-03-30', datetime('now'));

-- ============================================================
-- Immigration (1 new bill)
-- ============================================================

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2416', 'oppose', 'Immigration', 'Take $20 million from state general fund for local border support', 'https://weekly.cebv.us/2026-03-30/', '2026-03-30', datetime('now'));

-- ============================================================
-- Public Safety (3 new bills)
-- ============================================================

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2446', 'oppose', 'Public Safety', 'Striker requiring DPS to enforce English proficiency for commercial truck drivers; xenophobic policy raising prices', 'https://weekly.cebv.us/2026-03-30/', '2026-03-30', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2812', 'oppose', 'Public Safety', 'Striker stripping Attorney General of duty to represent DPS; defunds highway patrol by $4.75 million', 'https://weekly.cebv.us/2026-03-30/', '2026-03-30', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2957', 'oppose', 'Public Safety', 'Ban Real ID requirement for government purposes; would prevent Arizonans from boarding planes', 'https://weekly.cebv.us/2026-03-30/', '2026-03-30', datetime('now'));

-- ============================================================
-- Verification query — run after import to confirm counts
-- ============================================================
-- SELECT source_date, category, position, COUNT(*) as cnt
-- FROM org_recommendations
-- WHERE org_code = 'CEBV' AND source_date = '2026-03-30'
-- GROUP BY source_date, category, position
-- ORDER BY category;
