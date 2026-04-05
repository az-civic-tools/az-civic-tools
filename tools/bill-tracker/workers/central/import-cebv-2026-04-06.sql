-- CEBV Weekly Import — 2026-04-06
-- Source: https://weekly.cebv.us/2026-04-06/
-- 1 new bill position (SCR1032, companion to HCR2007)
-- All other "Nutty Nine" and Veto Watch bills already tracked from prior imports

-- ============================================================
-- Affordability (1 new bill — paired with HCR2007)
-- ============================================================

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SCR1032', 'oppose', 'Affordability', 'Companion to HCR2007; would defund public schools by asking voters to force district (not charter or ESA voucher-funded) schools to spend at least 50% on teacher pay and 60% on direct instructional expenses, or have the difference withheld from state funding. Schools already spend less on classrooms due to persistent legislative underfunding and the $1B/year ESA voucher drain.', 'https://weekly.cebv.us/2026-04-06/', '2026-04-06', datetime('now'));

-- ============================================================
-- Verification query — run after import to confirm
-- ============================================================
-- SELECT org_code, bill_number, position, category, source_date
-- FROM org_recommendations
-- WHERE org_code = 'CEBV' AND bill_number = 'SCR1032';
