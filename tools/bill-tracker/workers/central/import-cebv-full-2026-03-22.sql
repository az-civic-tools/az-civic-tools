-- CEBV Weekly Full Import — All 2026 Session Bills
-- Compiled from 12 CEBV Weekly articles (Jan 12 - Mar 23, 2026)
-- Generated 2026-03-22
--
-- Articles processed:
--   1. https://weekly.cebv.us/2026-03-23/   (Mar 23)
--   2. https://weekly.cebv.us/2026-03-16/   (Mar 16)
--   3. https://weekly.cebv.us/se-2026-03-09/ (Mar 9 Special Edition)
--   4. https://weekly.cebv.us/2026-03-09/   (Mar 9)
--   5. https://weekly.cebv.us/2026-03-02/   (Mar 2)
--   6. https://weekly.cebv.us/2026-02-23/   (Feb 23)
--   7. https://weekly.cebv.us/2026-02-16/   (Feb 16)
--   8. https://weekly.cebv.us/2026-02-09/   (Feb 9)
--   9. https://weekly.cebv.us/2026-02-02/   (Feb 2)
--  10. https://weekly.cebv.us/2026-01-26/   (Jan 26)
--  11. https://weekly.cebv.us/2026-01-19/   (Jan 19)
--  12. https://weekly.cebv.us/2026-01-12/   (Jan 12)
--
-- Deduplication: newest write-up kept for each bill number.

-- ============================================================
-- STEP 1: Delete all existing CEBV records
-- ============================================================
DELETE FROM org_recommendations WHERE org_code = 'CEBV';

-- ============================================================
-- Voting Rights, Elections & Direct Democracy
-- ============================================================

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SCR1001', 'oppose', 'Voting Rights', 'Would eliminate Arizona''s pioneering early voting system and require all voters—even mail-in—to present "proof of identity to vote" with unclear implementation. Would end the ability to drop mail ballots at vote centers after Friday before Election Day. Arizonans already rejected similar voter ID requirements in 2022 (Prop 309).', 'https://weekly.cebv.us/2026-03-23/', '2026-03-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SCR1002', 'oppose', 'Voting Rights', 'Increases campaign finance anonymity threshold from $100 to $200, reducing political money transparency. Similar to arguments in lawsuits attempting to invalidate the voter-approved Voters Right to Know Act.', 'https://weekly.cebv.us/2026-03-23/', '2026-03-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SCR1004', 'oppose', 'Voting Rights', 'Asks voters to ban cities from using photo radar unless communities vote every 10 years to approve it. Studies show speed and red-light cameras reduce traffic crashes and injuries by up to 35 percent. Arizona has used speed cameras since 1987.', 'https://weekly.cebv.us/2026-03-23/', '2026-03-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SCR1005', 'oppose', 'Voting Rights', 'Bans ballot measures from accepting money from "foreign corporations or persons." Broadly written so police and trade unions couldn''t support measures if they have legal permanent resident members—already happening in Ohio.', 'https://weekly.cebv.us/2026-03-23/', '2026-03-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SCR1006', 'oppose', 'Voting Rights', 'An anti-LGBTQ+, anti-student "bathroom ban" and "pronoun ban" that would go directly to ballot. Would ban teachers from using a student''s chosen pronouns without written parental permission, and ban trans kids from using the school bathrooms, changing facilities and "sleeping quarters" that fit their gender identities. Anyone who "encounters" a trans person in a bathroom could file suit against a public school.', 'https://weekly.cebv.us/2026-03-02/', '2026-03-02', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SCR1010', 'oppose', 'Voting Rights', 'Ballot referral allowing legislature to impeach politicians/judges for "failing to follow" state law, enabling partisan impeachment for disagreements over constitutional interpretation.', 'https://weekly.cebv.us/2026-01-19/', '2026-01-19', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SCR1011', 'oppose', 'Voting Rights', 'Copy of failed 2025 bill adding Arizona to states requesting Article V constitutional convention to amend US Constitution creating Congressional term limits. Dangerous: Constitution sets no rules for Article V convention; risk of "runaway convention" resulting in whole new government form. Transmitted directly to Congress without governor/voter approval.', 'https://weekly.cebv.us/2026-02-02/', '2026-02-02', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SCR1013', 'oppose', 'Voting Rights', 'Bans "foreign" money and in-kind donations for election administration and ballot measures. Model legislation from Trump-connected America First Policy Institute. Chief complaint: wealthy Wyoming permanent resident with Swiss citizenship donates to organizations underwriting progressive ballot initiatives. FEC says this is legal.', 'https://weekly.cebv.us/2026-02-02/', '2026-02-02', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SCR1014', 'oppose', 'Voting Rights', 'Requires early ballot drop-off by Friday before Election Day, voiding drop box use weekends/Election Day unless voters stand in line showing ID. Hundreds of thousands would wait in long lines; November 2024 Maricopa County saw 225,000+ ballots dropped across 240 locations. Gov. Hobbs vetoed this twice.', 'https://weekly.cebv.us/2026-02-02/', '2026-02-02', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SCR1020', 'support', 'Voting Rights', 'Asks voters to institute annual inflation adjustments for state lawmaker salaries, raising current $24,000/year to nearly $48,000 with future increases. Lawmakers making ends meet non-exploitatively often resign citing long hours, low salary, chaotic pressure-cooker environment. Voters haven''t approved raises since 1998, rejecting six proposed increases.', 'https://weekly.cebv.us/2026-02-02/', '2026-02-02', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SCR1022', 'oppose', 'Voting Rights', 'Adds 30 new state lawmakers by splitting current legislative districts into three sections giving each one representative. Would create new buildings for lawmakers at significant unknown costs, potentially overrepresent rural districts.', 'https://weekly.cebv.us/2026-03-23/', '2026-03-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SCR1023', 'oppose', 'Voting Rights', 'Skews Independent Redistricting Commission by allowing legislature to appoint four members and requiring 6 of 9 commissioners live in Maricopa/Pima counties. Forces districts to vary by no more than 5,000 people, splitting minority voting blocs and advantaging Republicans.', 'https://weekly.cebv.us/2026-03-23/', '2026-03-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SCR1024', 'oppose', 'Voting Rights', 'Requires state lawmaker candidates live in legislative districts (not just counties) for at least one year before elections. Several actual lawmakers don''t reside in represented districts; violating current law carries basically no consequences. Measure is a waste of time and ballot space.', 'https://weekly.cebv.us/2026-03-09/', '2026-03-09', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SCR1025', 'oppose', 'Voting Rights', 'Delays Arizona Legislature''s annual opening date by two weeks to the fourth Monday in January, despite lawmakers already struggling to complete work under current timelines.', 'https://weekly.cebv.us/2026-03-23/', '2026-03-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SCR1027', 'oppose', 'Voting Rights', 'Revokes charter cities'' rights to determine their own elections and moves mayoral, city council and school board elections to November general elections. Could increase ballot fatigue and force small candidates to overspend just to get noticed.', 'https://weekly.cebv.us/2026-03-23/', '2026-03-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SCR1028', 'oppose', 'Voting Rights', 'Proposes constitutional amendment requiring two-thirds supermajority for statewide fees and assessments. Similar tax provision has strangled state government over decades, making funding priorities nearly impossible. Threatens Arizona''s economic future and service provision.', 'https://weekly.cebv.us/2026-03-09/', '2026-03-09', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SCR1029', 'oppose', 'Voting Rights', 'Would ask voters to create term limits for mine inspector beginning in 2031, limiting those who serve to 2 consecutive 4-year terms and requiring at least 1 full term out of office before they can serve again.', 'https://weekly.cebv.us/2026-02-16/', '2026-02-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SCR1031', 'oppose', 'Voting Rights', 'Blows up Arizona''s Independent Redistricting Commission (nationwide model) by requiring own fake "census" determining US citizen population for grid-like districts. Any lawmaker could sue disliking results. Incredibly expensive ($158 million every 10 years); purposely undercounts communities of color. Defunds voter-created Clean Elections Commission.', 'https://weekly.cebv.us/2026-02-02/', '2026-02-02', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SCR1040', 'oppose', 'Voting Rights', 'Raises judges'' mandatory retirement age from 70 to 75, attempting to keep aging conservative judges on bench. Voters rejected similar measure in 2012 by nearly 3-to-1 margins.', 'https://weekly.cebv.us/2026-03-23/', '2026-03-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SCR1041', 'oppose', 'Voting Rights', 'Would ask voters to create a new version of Prop 123 that restricts funds to "eligible teachers" and bases their pay on performance. This is bad policy; individual schools are best suited to determine their own needs.', 'https://weekly.cebv.us/2026-02-16/', '2026-02-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SCR1048', 'oppose', 'Voting Rights', 'Would ask voters to declare "excessive marijuana smoke and odor" a public nuisance, making it a criminal activity that endangers public health and safety.', 'https://weekly.cebv.us/2026-02-16/', '2026-02-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SCR1049', 'oppose', 'Voting Rights', 'Would ask voters to require that prisoners who kill a law enforcement officer be executed by firing squad and to give other prisoners sentenced to death the choice to opt for a firing squad.', 'https://weekly.cebv.us/2026-02-16/', '2026-02-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SCR1051', 'oppose', 'Voting Rights', 'Would ask voters to create a new version of Prop 123 that restricts funds to "eligible teachers" and bases their pay on performance. Bad policy; individual schools are best suited to determine their own needs.', 'https://weekly.cebv.us/2026-02-16/', '2026-02-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HCR2001', 'oppose', 'Voting Rights', 'Would ask voters to eliminate early voting, ban all-mail elections, and require government-issued ID for all voters. Arizonans rejected similar voter ID requirements in 2022 (Prop 309). Competing with SCR1001 in intraparty fight over which version to advance.', 'https://weekly.cebv.us/2026-03-16/', '2026-03-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HCR2003', 'oppose', 'Voting Rights', 'Asks voters to ban transgender girls from youth sports, school bathrooms and changing facilities aligned with gender identity. Anti-trans hate creates a toxic environment for girls, inviting harassment of those perceived as "too good" or having "stocky builds," small breasts or short hair. Subjects girls to humiliation, verbal assault, physical attacks or even invasive genital exams.', 'https://weekly.cebv.us/2026-03-09/', '2026-03-09', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HCR2004', 'oppose', 'Voting Rights', 'Bans photo radar unless cities run voter-approval ballot measures every 10 years. Arizona has used photo radar since 1987; studies confirm these cameras reduce traffic crashes and injuries significantly.', 'https://weekly.cebv.us/2026-03-23/', '2026-03-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HCR2005', 'oppose', 'Voting Rights', 'Requires legislature adjourn by April 30 yearly. While favoring shorter sessions, meaningless change allowing unlimited special sessions with unrealistic purported goal given closely divided legislature.', 'https://weekly.cebv.us/2026-02-02/', '2026-02-02', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HCR2007', 'oppose', 'Voting Rights', 'Would defund public schools by requiring district schools (excluding charter/ESA voucher-funded schools) to spend minimum 60% of funds on "direct instructional expenses" or lose state funding difference. Arizona schools already spend less on classroom instruction due to persistent underfunding and $1B yearly ESA voucher drain.', 'https://weekly.cebv.us/2026-02-23/', '2026-02-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HCR2016', 'oppose', 'Voting Rights', 'Copy of failed bill banning voting centers and returning to precinct-based voting with 2,500-voter limit per precinct. Before voting center model, elections had "long lines and technology issues" with tens of thousands of uncounted votes cast at wrong locations. Fiscal note estimates $7 million annual cost plus $10+ million equipment cost.', 'https://weekly.cebv.us/2026-03-16/', '2026-03-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HCR2040', 'oppose', 'Voting Rights', 'Aims to legislate away teachers'' unions by creating new limits on collective organizing and bargaining. Would ban payroll deduction of union dues and prohibit districts from using public resources to support labor organizations, even for rented meetings.', 'https://weekly.cebv.us/2026-03-23/', '2026-03-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HCR2043', 'oppose', 'Voting Rights', 'Adds Arizona''s name to states requesting Article V constitutional convention for congressional term limits. Threatens runaway convention potentially redesigning entire government. Six Democratic lawmakers voted YES: Alma Hernandez (D-20), Consuelo Hernandez (D-21), Lydia Hernandez (D-24), Elda Luna-Najera (D-22), Myron Tsosie (D-6), Kevin Volk (D-17).', 'https://weekly.cebv.us/2026-02-09/', '2026-02-09', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HCR2044', 'oppose', 'Voting Rights', 'Enshrine racism in state Constitution by preventing preference for BIPOC-owned businesses in state contracts, blocking teachers from discussing accurate history, banning certain content from schools, and blocking LGBTQ+ support trainings. Allows legislature to "prescribe related practices" to ban—open-ended censorship.', 'https://weekly.cebv.us/2026-03-23/', '2026-03-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HCR2048', 'oppose', 'Voting Rights', 'Withholds pay from governor, state lawmakers and statewide elected officials if they fail to pass budget by April 30. While punishing elected officials appeals to some, the date is arbitrary and doesn''t address the real problem: secret budget negotiations.', 'https://weekly.cebv.us/2026-03-23/', '2026-03-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HCR2051', 'oppose', 'Voting Rights', 'Institutes anti-democratic requirements for initiatives: paid circulators must tell signers their state of residence, wear ID badges, identify themselves verbally as paid. Signatures without these would be void, opening petitions to legal challenges and expanding restrictions to local measures.', 'https://weekly.cebv.us/2026-03-23/', '2026-03-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HCR2052', 'oppose', 'Voting Rights', 'Freezes city and county taxes, fees, utility rates for four years. Hamstrings local government crisis response; harms public safety, roads, parks, libraries.', 'https://weekly.cebv.us/2026-02-09/', '2026-02-09', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HCR2056', 'oppose', 'Voting Rights', 'Ends school vaccine requirements and destroys protections against lice, scabies, Hepatitis A and whooping cough. Prevents schools from sending children home with lice until treated. Sponsor was nearly removed from Air Force for refusing vaccination.', 'https://weekly.cebv.us/2026-03-23/', '2026-03-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HCR2058', 'oppose', 'Voting Rights', 'Asks voters to mandate private audit of AHCCCS (Arizona Medicaid) reviewing all payments from past 3 years. Private contractors paid based on recovered claims—incentivizing false fraud citations. Legislature already has power to audit AHCCCS through Joint Legislative Audit Committee.', 'https://weekly.cebv.us/2026-03-16/', '2026-03-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1003', 'oppose', 'Voting Rights', 'Allows county supervisors and elections officials to "acknowledge" election results "without prejudice" instead of certifying them. Gives elected officials free pass to spread misinformation about elections with no consequences.', 'https://weekly.cebv.us/2026-03-23/', '2026-03-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1006', 'oppose', 'Voting Rights', 'Allow people who make a political contribution below $200 to remain anonymous, rather than be named in campaign finance reports. (Current threshold is $100.) This would make money in Arizona politics less transparent.', 'https://weekly.cebv.us/2026-03-02/', '2026-03-02', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1037', 'oppose', 'Voting Rights', 'Copy of vetoed measure requiring voting equipment meet "Department of Homeland Security standards." Many security measures already covered by Arizona law. Multiple election officials testified provisions are unneeded or harmful. Sponsor claims without evidence machines were remotely hacked in 2020 and 2022.', 'https://weekly.cebv.us/2026-03-16/', '2026-03-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1038', 'oppose', 'Voting Rights', 'Would make the "cast vote record" (a receipt of everything scanned by a voting machine) a public record, violating Arizonans'' constitutionally mandated voter privacy. This year''s version requires county recorders to publish the massive record within one hour after polls close.', 'https://weekly.cebv.us/2026-03-02/', '2026-03-02', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1040', 'oppose', 'Voting Rights', 'Copy of vetoed bill forcing county recorders to provide free public access to voter registration rolls. Creates opportunities for spam, harassment, and enabling bad actors to generate fake purge lists, threatening election integrity.', 'https://weekly.cebv.us/2026-03-09/', '2026-03-09', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1057', 'oppose', 'Voting Rights', 'Require ballot paper to include specific "anti-fraud countermeasures." This not only adds unnecessary complexity and expense to our elections, it''s corruption in action. The bill is written so narrowly that only one vendor is qualified: Authentix, a company with ties to Finchem.', 'https://weekly.cebv.us/2026-03-02/', '2026-03-02', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1060', 'oppose', 'Voting Rights', 'Bans US citizens from voter registration in Arizona if they have a US citizen parent registered to vote in Arizona but never lived in US. Clearly unconstitutional and part of national Republican push to disenfranchise voters.', 'https://weekly.cebv.us/2026-03-23/', '2026-03-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1134', 'oppose', 'Voting Rights', 'Allows political signs starting 71 days before early ballots mail instead of 71 days before election—about 40 extra days. Arizonans universally report hating political signs as "nuisance," "ugly" and "trash."', 'https://weekly.cebv.us/2026-03-23/', '2026-03-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1237', 'oppose', 'Voting Rights', 'Require Arizona''s secretary of state to consult with county recorders and the chairs and ranking members of the legislature''s elections committees before creating Arizona''s election procedures manual. This politically motivated bill is spurred by Republican sour grapes over Arizona voters electing Democrats as top statewide officials.', 'https://weekly.cebv.us/2026-03-02/', '2026-03-02', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1283', 'oppose', 'Voting Rights', 'Would eliminate Division Two of Court of Appeals and reorganize as single court. Republicans'' latest effort to push political balance further to the right.', 'https://weekly.cebv.us/2026-01-26/', '2026-01-26', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1392', 'oppose', 'Voting Rights', 'Would give county boards of supervisors wide-ranging pre-election access to secure areas like ballot processing, tabulation and storage.', 'https://weekly.cebv.us/2026-02-16/', '2026-02-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1428', 'oppose', 'Voting Rights', 'Would expand county boards of supervisors starting in 2033 based on population. Maricopa County would be forced to expand to 9 members, and Pima County to 7.', 'https://weekly.cebv.us/2026-02-16/', '2026-02-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1433', 'oppose', 'Voting Rights', 'Gerrymanders Maricopa County redrawing boundaries making Arizona more Republican. Uses crack technique splitting Democratic voters across counties.', 'https://weekly.cebv.us/2026-02-09/', '2026-02-09', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1434', 'oppose', 'Voting Rights', 'Gerrymanders Maricopa County splitting into four smaller counties with Republicans controlling three. Uses pack technique concentrating Democrats into tiny area.', 'https://weekly.cebv.us/2026-02-09/', '2026-02-09', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1489', 'oppose', 'Voting Rights', 'Institutes anti-democratic petition circulator requirements including verbally identifying as paid, wearing visible ID badges, disclosing signer information. Opens petitions to legal challenges.', 'https://weekly.cebv.us/2026-02-16/', '2026-02-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1568', 'oppose', 'Voting Rights', 'Requires voters update signatures every five years for early ballot eligibility. Cumbersome and potentially disenfranchising requirement.', 'https://weekly.cebv.us/2026-02-09/', '2026-02-09', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1609', 'support', 'Voting Rights', 'Requires new political parties use distinguishable names; bans misappropriating "independent" term. Responds to No Labels Party''s name change to Arizona Independent Party.', 'https://weekly.cebv.us/2026-02-16/', '2026-02-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1647', 'oppose', 'Voting Rights', 'Would ban ballot measures from accepting money or in-kind donations from "a foreign corporation or person."', 'https://weekly.cebv.us/2026-02-16/', '2026-02-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1746', 'oppose', 'Voting Rights', 'Copy of previously vetoed bill requiring public district schools to be closed on every regular primary and general election day, and to provide their gymnasiums for use as polling places.', 'https://weekly.cebv.us/2026-02-16/', '2026-02-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1755', 'oppose', 'Voting Rights', 'Would ban a judge from practicing law in Arizona, except in limited circumstances. This is already against the rules of the Judicial Code of Conduct.', 'https://weekly.cebv.us/2026-02-16/', '2026-02-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2009', 'oppose', 'Voting Rights', 'Bans foreign donations to constitutional amendment campaigns and requires disclaimers if 20%+ funding comes from outside Arizona, restricting direct democracy rights.', 'https://weekly.cebv.us/2026-01-19/', '2026-01-19', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2022', 'oppose', 'Voting Rights', 'Moves Arizona primary from August to July and allows partisan observers as challengers; sponsor previously sanctioned for peddling election conspiracies.', 'https://weekly.cebv.us/2026-01-19/', '2026-01-19', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2313', 'oppose', 'Voting Rights', 'Subject to a striker that would ban two or more teachers from participating together in a strike. District or charter schools that experience a work stoppage would see their base support level cut.', 'https://weekly.cebv.us/2026-02-16/', '2026-02-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2579', 'support', 'Voting Rights', 'Funds free school lunches for children meeting federal income requirements. Helps struggling families and supports child health outcomes.', 'https://weekly.cebv.us/2026-02-09/', '2026-02-09', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2745', 'oppose', 'Voting Rights', 'Copy of bill vetoed last year allowing legislature to arrest anyone refusing legislative subpoena—including other elected officials—and physically haul them before committees. Follows 2024 attempt to impeach Attorney General Kris Mayes for protecting Arizonans.', 'https://weekly.cebv.us/2026-03-23/', '2026-03-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2805', 'support', 'Voting Rights', 'Allows online signatures via E-Qual for nomination petitions of local candidates (school board, community college board, water conservation district board). Promotes ballot access for working parents and community members.', 'https://weekly.cebv.us/2026-02-09/', '2026-02-09', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2902', 'oppose', 'Voting Rights', 'Vetoed bill copies affirming importance of Electoral College. Electoral College handed victory to loser twice in past two decades; only 35% of Americans support keeping it.', 'https://weekly.cebv.us/2026-01-26/', '2026-01-26', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB4115', 'oppose', 'Voting Rights', 'Would institute a host of anti-democratic requirements for ballot initiatives and petition circulators that would make it much harder for initiatives to qualify for the ballot.', 'https://weekly.cebv.us/2026-03-16/', '2026-03-16', datetime('now'));

-- ============================================================
-- Discrimination & LGBTQ+ Rights
-- ============================================================

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1013', 'oppose', 'Discrimination', 'Copy of vetoed bill banning public schools from hiring policies based on factors other than "merit" as MAGA attack on diversity, equity and inclusion. Would allow anyone to sue, leading to endless frivolous "reverse racism" claims.', 'https://weekly.cebv.us/2026-03-23/', '2026-03-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1014', 'oppose', 'Discrimination', 'Version of a vetoed bill from last year that would force health care professionals to pay the medical costs for "gender detransition" procedures.', 'https://weekly.cebv.us/2026-02-16/', '2026-02-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1015', 'oppose', 'Discrimination', 'Exact copy of vetoed bill forcing health care professionals to pay medical costs for minors seeking "gender detransition" within 25 years. Enables civil lawsuits for damages including medical costs, pain/suffering, lost income. Designed to harass providers with liability fears and create obstacles for transgender care.', 'https://weekly.cebv.us/2026-03-23/', '2026-03-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1018', 'oppose', 'Discrimination', 'Would add "Sharia law" to banned legal systems in Arizona. Hysteria driven by anti-Muslim hate groups intending to demonize Islamic faith. Ban serves no legal purpose—only to scapegoat and ostracize Muslim neighbors. Attacks alongside Islamophobic federal administration placing Muslim neighbors in grave danger.', 'https://weekly.cebv.us/2026-03-16/', '2026-03-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1075', 'oppose', 'Discrimination', 'Copy of vetoed bill banning sale of public/private land to "hostile foreign entity" without majority legislature approval. Raised concerns about racial profiling; nonpartisan rules attorney warned could violate US Constitution. Sponsor linked to hate groups, routinely spouts conspiracy theories.', 'https://weekly.cebv.us/2026-03-16/', '2026-03-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1094', 'oppose', 'Discrimination', 'Version of vetoed bill allowing people who requested gender reassignment surgery as minors to sue physicians until 25 years after minor turns 18, even with parental consent. Despite sponsor''s beliefs, regret rates for gender-affirming surgeries remain among the lowest in medical care overall. Ideologically driven attack on providers.', 'https://weekly.cebv.us/2026-03-16/', '2026-03-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1095', 'oppose', 'Discrimination', 'Bans puberty blockers and hormone therapy for transgender minors, making treatment unprofessional conduct resulting in doctor license loss. Would also ban referrals, preventing doctors from sending patients outside state for needed care.', 'https://weekly.cebv.us/2026-03-16/', '2026-03-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1139', 'oppose', 'Discrimination', 'Version of vetoed bill requiring both parents consent before family court orders counseling or intervention. Allows one parent to block any court-ordered family treatment from domestic violence to substance abuse, potentially putting children at further risk.', 'https://weekly.cebv.us/2026-03-16/', '2026-03-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1156', 'oppose', 'Discrimination', 'Takes $20 million from state general fund to reimburse cities/counties for short-term detention holds for undocumented immigrants. Federal government bears responsibility; state general fund stretched too thin.', 'https://weekly.cebv.us/2026-02-16/', '2026-02-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1157', 'oppose', 'Discrimination', 'Takes $20 million from state general fund for cities/counties to build walls along Arizona''s southern border. Federal government bears responsibility for border costs.', 'https://weekly.cebv.us/2026-02-16/', '2026-02-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1177', 'oppose', 'Discrimination', 'Would make it a class 4 felony to use public monies to fund a gender transition.', 'https://weekly.cebv.us/2026-02-16/', '2026-02-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1327', 'oppose', 'Discrimination', 'Bans university recruiting of international students and recognition of their associations; requires Board of Regents approval of foreign partnerships. ASU hosts 15,100 international students from 157 countries.', 'https://weekly.cebv.us/2026-02-09/', '2026-02-09', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1328', 'oppose', 'Discrimination', 'Specifies state law protects "parents'' rights" to "direct upbringing, education, and health care" of children, weakening state ability to ensure vaccinations, proper education. Why don''t children receive a bill of rights?', 'https://weekly.cebv.us/2026-02-02/', '2026-02-02', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1368', 'oppose', 'Discrimination', 'Vetoed concept banning food stamps for soda, energy drinks, candy, and snack foods. Poor people should enjoy simple luxuries too.', 'https://weekly.cebv.us/2026-01-26/', '2026-01-26', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1474', 'oppose', 'Discrimination', 'Version of previously vetoed bill forcing cities, counties and public schools to work with and for ICE (regardless of whether anyone wants that), and mandating all employees take a federal immigration enforcement training.', 'https://weekly.cebv.us/2026-02-16/', '2026-02-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1573', 'oppose', 'Discrimination', 'Bans courts from using "religious sectarian law" unless based on "Anglo-American legal tradition and principles"—white nationalism. Thinly veiled attack on multiculturalism related to xenophobic hate groups demonizing other faiths.', 'https://weekly.cebv.us/2026-03-23/', '2026-03-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1650', 'oppose', 'Discrimination', 'Would make judges legally liable for damages if they "knew or should have known" that actions in a case violated someone''s civil rights.', 'https://weekly.cebv.us/2026-02-16/', '2026-02-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1668', 'oppose', 'Discrimination', 'Would require funeral homes to obtain a permit to transport embryonic and fetal remains before 20 weeks of gestation in cases of abortion if the woman authorizes it.', 'https://weekly.cebv.us/2026-02-16/', '2026-02-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1686', 'oppose', 'Discrimination', 'Renames Wesley Bolin Plaza to "Wesley Bolin and Charlie Kirk Freedom Plaza" authorizing memorials. Elevates someone making combative, incendiary, racist and sexist behavior his calling card to level of lifelong public servant.', 'https://weekly.cebv.us/2026-03-16/', '2026-03-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2040', 'oppose', 'Discrimination', 'Requires university health clinics discuss adoption whenever students seek contraception or STI testing/treatment. Also forces adoption discussion into school sex ed.', 'https://weekly.cebv.us/2026-02-09/', '2026-02-09', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2060', 'oppose', 'Discrimination', 'Bans district/charter schools, community colleges and state universities and their employees from "encouraging or facilitating abortions." Sponsor seeks to prevent any discussion of constitutional abortion rights, including at university student health centers.', 'https://weekly.cebv.us/2026-03-23/', '2026-03-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2074', 'oppose', 'Discrimination', 'Would mandate reporting of "partial-birth abortions" to county attorneys, using non-medical terminology to criminalize women''s healthcare decisions.', 'https://weekly.cebv.us/2026-01-19/', '2026-01-19', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2085', 'oppose', 'Discrimination', 'Bans medical personnel from prescribing puberty-blocking hormones to anyone under 18 for gender dysphoria treatment. Age-appropriate hormones provide time for families to explore identity, access support, and develop treatment goals. Politics would wedge between medical professionals and patients.', 'https://weekly.cebv.us/2026-03-09/', '2026-03-09', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2112', 'oppose', 'Discrimination', 'Would create specialty license plate funding Turning Point USA. Organization exploits teens and would drag society backwards into authoritarian, patriarchal Christian supremacy. Passed along strictly partisan lines with only Republican support.', 'https://weekly.cebv.us/se-2026-03-09/', '2026-03-09', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2135', 'oppose', 'Discrimination', 'Allow anyone to sue if public schools violate a state or federal law banning diversity, equity and inclusion. This would lead to endless frivolous claims of "reverse racism."', 'https://weekly.cebv.us/2026-03-02/', '2026-03-02', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2144', 'oppose', 'Discrimination', 'Legalizes court-ordered child support for "preborn child" beginning on positive pregnancy test. Part of anti-scientific "fetal personhood" strategy giving fetuses same legal rights as people, to detriment of women. Attacks voter-approved Prop 139.', 'https://weekly.cebv.us/2026-03-23/', '2026-03-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2184', 'oppose', 'Discrimination', 'Changes fetal death certificate eligibility to include embryos and fetuses before 20 weeks gestation, way before fetal viability. Replaces "fetus" terminology with "unborn child" and requires doctors to discuss transferring remains to funeral homes. Part of "fetal personhood" strategy.', 'https://weekly.cebv.us/2026-03-09/', '2026-03-09', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2229', 'oppose', 'Discrimination', 'Allocates $3M in state funds to controversial "pregnancy resource centers" that discourage abortion-seeking. Most centers are unlicensed and provide no comprehensive reproductive care. Bill bans abortion-providing healthcare from receiving funds. Attorney General Mayes issued 2024 consumer alert about these centers.', 'https://weekly.cebv.us/2026-02-23/', '2026-02-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2249', 'oppose', 'Discrimination', 'Requires written parental consent before teachers use students'' chosen names or pronouns differing from birth names. Mandates schools provide parents access to all minor records, stripping minors of privacy rights. Establishes minimum statutory damages of $500,000 against districts and $20,000 against administrators.', 'https://weekly.cebv.us/2026-03-09/', '2026-03-09', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2364', 'oppose', 'Discrimination', 'Makes it felony to order or sell abortion drugs. These drugs have better safety record than penicillin or Viagra; banning them poses undue burden on women. Part of Republican package attacking voter-approved Prop 139.', 'https://weekly.cebv.us/2026-03-23/', '2026-03-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2575', 'oppose', 'Discrimination', 'Copy of vetoed bill banning schools from teaching "antisemitic conduct"; creates personal civil liability for teachers. Definition weaponized to censor Israeli-Palestinian conflict discussion.', 'https://weekly.cebv.us/2026-02-09/', '2026-02-09', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2589', 'oppose', 'Discrimination', 'Makes it felony allowing anyone to perform in "drag show performance" for people under 18 or remain in building during performance. Definition broad enough to include school plays (Shakespeare) or football players dressing as cheerleaders. Minimum 1-year prison sentence. Legislature''s nonpartisan rules attorneys said similar bill likely unconstitutional.', 'https://weekly.cebv.us/2026-03-23/', '2026-03-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2600', 'oppose', 'Discrimination', 'Would require public schools to keep students in grades 6-8 out of student clubs and organizations unless they have written parental permission.', 'https://weekly.cebv.us/2026-02-16/', '2026-02-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2830', 'oppose', 'Discrimination', 'Requires State Board of Education create fetal/prenatal human development lessons for public schools'' science classes while banning teaching about how pregnancy happens. Bans any organization associated with abortion from providing instruction/materials. Schools losing funding if non-compliant. Attacks voter-approved Prop 139.', 'https://weekly.cebv.us/2026-03-23/', '2026-03-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2904', 'oppose', 'Discrimination', 'Directs judges interpret Arizona law protecting "sovereign authority" against border "unlawful invasion." Enables further due process and civil rights violations in immigration enforcement.', 'https://weekly.cebv.us/2026-02-09/', '2026-02-09', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB4027', 'oppose', 'Discrimination', 'Would rename Loop 202 to the "Charlie Kirk Highway." Highways generally get their names changed only after review by a specific state board.', 'https://weekly.cebv.us/2026-02-16/', '2026-02-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2043', 'oppose', 'Discrimination', 'Add "causing the death of an unborn child at any stage of development" to the definition of first-degree murder if someone is already committing another crime. Part of the anti-scientific strategy of "fetal personhood," which gives fetuses the same legal rights as people. Part of a package of bills designed to attack voter-approved Prop 139.', 'https://weekly.cebv.us/2026-03-02/', '2026-03-02', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2011', 'oppose', 'Discrimination', 'Expands state tax credit for adoption expenses to include human embryo "adoption." Part of anti-scientific "fetal personhood" strategy granting fetuses legal rights equal to people. Embryos are microscopic 8-cell clumps, often discarded as medical waste.', 'https://weekly.cebv.us/2026-02-02/', '2026-02-02', datetime('now'));

-- ============================================================
-- Immigration
-- ============================================================

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1051', 'oppose', 'Immigration', 'Vetoed bill copy requiring hospitals to ask immigration status, turning them into border checkpoints and doctors into immigration police, demonizing anyone appearing immigrant and risking public health.', 'https://weekly.cebv.us/2026-02-23/', '2026-02-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1055', 'oppose', 'Immigration', 'Vetoed idea requiring local law enforcement to "immediately" notify ICE upon arrest. ICE agents are untrained, undisciplined and terrorizing communities.', 'https://weekly.cebv.us/2026-01-26/', '2026-01-26', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1213', 'oppose', 'Immigration', 'Bans undocumented immigrants convicted of state/local offenses (including speeding, loitering, "criminal nuisance") from probation eligibility. Requires courts immediately notify ICE.', 'https://weekly.cebv.us/2026-03-23/', '2026-03-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1421', 'oppose', 'Immigration', 'Bans undocumented immigrants from banking in Arizona, including check cashing and wire transfers. Civil penalties snatch one-quarter of transfer monies. Intended to drive undocumented immigrants out despite their contribution of $704 million in taxes to Arizona''s economy.', 'https://weekly.cebv.us/2026-03-23/', '2026-03-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1457', 'oppose', 'Immigration', 'Expands Arizona''s $2 million Advanced Air Mobility Fund (for flying cars) to include border enforcement. Hypocritical given Republican focus on border issues.', 'https://weekly.cebv.us/2026-03-23/', '2026-03-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1511', 'oppose', 'Immigration', 'Bans undocumented immigrants from driving commercial vehicles; requires police to impound vehicles/cargo. Trucking industry faces years-long driver shortage; foreign-born US truck drivers now comprise nearly 1-in-5 and have doubled in 25 years.', 'https://weekly.cebv.us/2026-03-23/', '2026-03-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1520', 'oppose', 'Immigration', 'Requires Arizona and state agencies to share immigration information with ICE, forcing cooperation with what has become "de facto terror force" of untrained, undisciplined federal agents using illegal and excessive force.', 'https://weekly.cebv.us/2026-03-16/', '2026-03-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1635', 'oppose', 'Immigration', 'Would criminalize blowing whistles to alert neighbors that ICE is present, punishable by up to 6 months jail. Monitoring law enforcement is constitutionally protected activity.', 'https://weekly.cebv.us/2026-03-16/', '2026-03-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2416', 'oppose', 'Immigration', 'Takes $20 million from state general fund for "local border support." Costs are federal government responsibility; state general fund already overextended.', 'https://weekly.cebv.us/2026-03-16/', '2026-03-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2443', 'oppose', 'Immigration', 'Requires commercial driver license applicants speak English. Studies show no correlation between English proficiency and commercial truck driver accidents; nearly 1 in 5 truck drivers Latino, critical to industry. Xenophobic bill pulling drivers off highways raises prices on goods.', 'https://weekly.cebv.us/2026-03-16/', '2026-03-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2446', 'oppose', 'Immigration', 'Requires commercial truck drivers speak English with roadside inspections conducted in English only without interpreters. No correlation between English proficiency and accidents; nearly 1 in 5 truck drivers Latino. Bill leads to unfair targeting by law enforcement.', 'https://weekly.cebv.us/2026-03-16/', '2026-03-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2689', 'oppose', 'Immigration', 'Vetoed bill copy requiring hospitals to ask immigration status, turning them into border checkpoints and doctors into immigration police.', 'https://weekly.cebv.us/2026-01-26/', '2026-01-26', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2806', 'oppose', 'Immigration', 'Wide-ranging anti-immigrant bill requiring Arizona verify citizenship using flawed federal system for voter registration, health care, driver licenses. Increases erroneous purge risks, disenfranchising eligible voters. Sponsor has shocking racist, xenophobic history.', 'https://weekly.cebv.us/2026-03-16/', '2026-03-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2811', 'oppose', 'Immigration', 'Version of previously vetoed bill criminalizing attempts to "obstruct" ICE officer arrests. Bill so vague potentially unconstitutional; speaking loudly, yelling, or following ICE agents could land peaceful protesters minimum 6-month prison. ICE detained hundreds of US citizens and killed at least 9 people in 2026.', 'https://weekly.cebv.us/2026-03-16/', '2026-03-16', datetime('now'));

-- ============================================================
-- Affordability
-- ============================================================

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1002', 'oppose', 'Affordability', 'Creates unnecessary eligibility checks on SNAP with no funding for implementation, harming vulnerable families including 1 of every 4 Arizona children relying on SNAP. Governor vetoed.', 'https://weekly.cebv.us/2026-02-23/', '2026-02-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1036', 'oppose', 'Affordability', 'Copy of bills vetoed in 2024 and 2025 imposing work requirements on "able-bodied" SNAP users. Mandatory employment training programs are expensive and haven''t proven to increase employment or wages. Governor vetoed.', 'https://weekly.cebv.us/2026-02-23/', '2026-02-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1042', 'oppose', 'Affordability', 'Copy of vetoed bill allowing state treasurer and retirement systems to invest public monies in "virtual currency." Cryptocurrency is speculative, has no intrinsic value, 5-10 times more volatile than US stock market. Would gamble with tax dollars and Arizonans'' lifetime savings.', 'https://weekly.cebv.us/2026-03-23/', '2026-03-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1043', 'oppose', 'Affordability', 'Copy of vetoed bill allowing Arizona to accept cryptocurrency as payment method. Crypto is highly financially risky and volatile. Would put state government at risk of massive financial losses.', 'https://weekly.cebv.us/2026-03-23/', '2026-03-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1044', 'oppose', 'Affordability', 'Would exempt "virtual currency" from property taxation. Cryptocurrency is an environmentally destructive bubble.', 'https://weekly.cebv.us/2026-01-26/', '2026-01-26', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1049', 'oppose', 'Affordability', 'Upends the current basis of deciding spousal support in a divorce. Insultingly, it lowers the standard of living factor to one-half of the marital standard of living, instead of the entire marital standard of living.', 'https://weekly.cebv.us/2026-03-02/', '2026-03-02', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1050', 'oppose', 'Affordability', 'Requires Arizona State Parks to give free lifetime passes to veterans. State Parks budget was cut $1.6M last year (10% of budget) and raised fees, with cheapest annual pass jumping from $75 to $200.', 'https://weekly.cebv.us/2026-02-23/', '2026-02-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1056', 'oppose', 'Affordability', 'Requires elimination of full-time positions vacant for 150+ days regardless of essentiality or specialization. Governor vetoed.', 'https://weekly.cebv.us/2026-02-23/', '2026-02-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1090', 'oppose', 'Affordability', 'Subject to striker banning cities from charging sales tax on food. 2023 analysis estimated $200 million annual city budget drain; harms public services.', 'https://weekly.cebv.us/2026-02-09/', '2026-02-09', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1106', 'oppose', 'Affordability', 'Would fully align Arizona''s tax code with last year''s sweeping federal budget bill, adopting its pricey tax cuts for the rich and opting Arizona in to the Project 2025-style federal school voucher program.', 'https://weekly.cebv.us/2026-01-12/', '2026-01-12', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1115', 'oppose', 'Affordability', 'Prohibits AHCCCS employees from working remotely. Would cost the state additional money despite remote work saving $32 million annually in rent plus $58.6 million in deferred maintenance since 2021.', 'https://weekly.cebv.us/2026-03-09/', '2026-03-09', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1142', 'oppose', 'Affordability', 'Makes Arizona eligible for Trump''s federal voucher program with no spending cap. Designed as tax benefits for wealthy families already using private schools. Could funnel billions of dollars a year to private institutions with zero taxpayer accountability.', 'https://weekly.cebv.us/2026-03-09/', '2026-03-09', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1221', 'oppose', 'Affordability', 'Requires Arizona Department of Revenue to notify legislative committee chairs before creating tax forms "adversely affecting taxpayers prospectively" and testify at hearings. Political sour grapes following Gov. Hobbs'' veto of Republican tax plan.', 'https://weekly.cebv.us/2026-03-23/', '2026-03-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1236', 'oppose', 'Affordability', 'Vetoed bill copy requiring AHCCCS staff to check for lottery/gambling winnings and making recent hospital patients harder to qualify for Medicaid coverage.', 'https://weekly.cebv.us/2026-01-26/', '2026-01-26', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1268', 'oppose', 'Affordability', 'Exempts some veterans and spouses from state property taxes. Republican lawmakers have systematically increased tax carve-outs from $16 billion in 2014 to over $30 billion in 2025, harming ability to fund state services. Schools rank 48th nationally in funding.', 'https://weekly.cebv.us/2026-02-02/', '2026-02-02', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1331', 'oppose', 'Affordability', 'Copy of bills vetoed in 2024 and 2025 imposing work requirements on "able-bodied" SNAP users. Governor vetoed.', 'https://weekly.cebv.us/2026-02-23/', '2026-02-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1333', 'oppose', 'Affordability', 'Requires Arizona to reduce SNAP payment error rate below 3% by 2030 or lose 10% of administrative funding. No state currently achieves below 3% rate. Defunding agency harms children; 1 of every 4 children in Arizona rely on SNAP.', 'https://weekly.cebv.us/2026-02-02/', '2026-02-02', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1334', 'oppose', 'Affordability', 'Copy of bills vetoed in 2024 and 2025 banning work requirement waivers for "able-bodied" SNAP adults. Governor vetoed.', 'https://weekly.cebv.us/2026-02-23/', '2026-02-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1338', 'oppose', 'Affordability', 'Allows state, cities and counties to distribute public retirement benefits without verifying lawful US residency. Hypocritical given heavy-handed bills this year verifying citizenship for voter registration, health care and driver licenses.', 'https://weekly.cebv.us/2026-03-23/', '2026-03-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1372', 'support', 'Affordability', 'Would create a study committee to evaluate the feasibility, costs and public health outcomes of expanding AHCCCS, Arizona''s Medicaid program, to include comprehensive adult dental coverage.', 'https://weekly.cebv.us/2026-02-16/', '2026-02-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1437', 'oppose', 'Affordability', 'Requires cities/school districts fulfill public records requests electronically and in least expensive manner possible, banning reasonable fees for staff time. Ignores that some actors file numerous frivolous or weaponized requests to disrupt.', 'https://weekly.cebv.us/2026-03-23/', '2026-03-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1501', 'oppose', 'Affordability', 'Directs Administrative Rules Oversight Committee to hunt down agency rules "exceeding statutory authority" and recommend legislative changes. Injects argumentative chaos into nonpartisan regulatory decisions.', 'https://weekly.cebv.us/2026-03-23/', '2026-03-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1516', 'oppose', 'Affordability', 'Would give private jet owners a tax break, something the sponsor has been trying to do for several years. Similar bill last year was estimated to cost millions.', 'https://weekly.cebv.us/2026-02-16/', '2026-02-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1633', 'oppose', 'Affordability', 'Creates dollar-for-dollar tax write-off for primary residence sale profits. Tax carve-outs increased from $16 billion (2014) to $30 billion (2025).', 'https://weekly.cebv.us/2026-02-09/', '2026-02-09', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1638', 'oppose', 'Affordability', 'Rubber-stamps federal tax cuts at state level, blowing hole in state budget. Governor Hobbs vetoed first attempts; this larger bill demonstrates Republican refusal to compromise.', 'https://weekly.cebv.us/2026-02-02/', '2026-02-02', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1745', 'oppose', 'Affordability', 'Forces Maricopa and Pima counties to slash local taxes to 2.5% unless residents vote higher; withholds state funding for non-compliance. Harms public services.', 'https://weekly.cebv.us/2026-02-09/', '2026-02-09', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2107', 'oppose', 'Affordability', 'Would expand restrictions on using SNAP for fast food to our society''s most vulnerable people. The fast food carve-out exists for people who may not be able to prepare meals or who don''t have homes and kitchens.', 'https://weekly.cebv.us/2026-02-16/', '2026-02-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2123', 'oppose', 'Affordability', 'Establishes state depository for gold bullion and makes gold legal tender in Arizona while exempting it from taxes. Gold value fluctuates; January 2026 spike to $5,300/ounce demonstrates vulnerability. Based on tinfoil-hat beliefs about banking system collapse.', 'https://weekly.cebv.us/2026-02-02/', '2026-02-02', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2140', 'oppose', 'Affordability', 'Subject to striker allowing Arizona to invest in gold bullion. Gold fluctuates with market; experts called it "overbought." Republicans run tinfoil-hat bills based on belief banking system is imploding.', 'https://weekly.cebv.us/2026-03-23/', '2026-03-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2153', 'oppose', 'Affordability', 'Would fully align Arizona''s tax code with last year''s sweeping federal budget bill, adopting its pricey tax cuts for the rich and opting Arizona in to the Project 2025-style federal school voucher program.', 'https://weekly.cebv.us/2026-01-12/', '2026-01-12', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2165', 'oppose', 'Affordability', 'Makes all Arizona state parks free for military and guests. State currently offers 50% military discount, free admission for disabled veterans. Unknown cost while State Parks budget cut $1.6 million last year and fees jumped from $75 to $200.', 'https://weekly.cebv.us/2026-03-23/', '2026-03-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2206', 'oppose', 'Affordability', 'Requires Arizona reduce SNAP payment error rate below 3% by 2030 or lose 10% of administrative funding. No state achieves below 3% rate. Defunding harms children. Governor vetoed.', 'https://weekly.cebv.us/2026-02-23/', '2026-02-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2288', 'oppose', 'Affordability', 'Would increase income tax deduction for corporations receiving foreign dividends, creating tax breaks for overseas investment while the state faces revenue shortages.', 'https://weekly.cebv.us/2026-01-19/', '2026-01-19', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2309', 'oppose', 'Affordability', 'Disguises payday loans as "earned wage advance" to circumvent Arizona''s Consumer Lender Act and 36% rate cap. Actual borrowing rate would exceed 300% annually, hurting vulnerable families.', 'https://weekly.cebv.us/2026-02-02/', '2026-02-02', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2396', 'oppose', 'Affordability', 'Bans sugary drinks, candy, and minimal-nutrition snacks from SNAP, contradicting studies showing current SNAP access improves recipient health and lowers healthcare costs. Governor vetoed.', 'https://weekly.cebv.us/2026-02-23/', '2026-02-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2429', 'support', 'Affordability', 'Would allow cities and counties to limit the number of short-term and vacation rentals by capping permits or licenses or by establishing minimum distance requirements.', 'https://weekly.cebv.us/2026-02-16/', '2026-02-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2442', 'oppose', 'Affordability', 'Copy of bills vetoed in 2024 and 2025 imposing work requirements on "able-bodied" SNAP users. Mandatory employment training programs are expensive and ineffective.', 'https://weekly.cebv.us/2026-02-02/', '2026-02-02', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2448', 'oppose', 'Affordability', 'Copy of bills vetoed in 2024 and 2025 banning work requirement waivers for "able-bodied" SNAP adults. Makes it harder for Arizonans in need to afford food.', 'https://weekly.cebv.us/2026-02-02/', '2026-02-02', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2532', 'oppose', 'Affordability', 'Strips money from Housing Trust Fund meant promoting affordable housing solutions; spends on performance audit of state/local programs helping homelessness individuals. Homelessness crisis about to surge due to federal defunding.', 'https://weekly.cebv.us/2026-03-16/', '2026-03-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2688', 'oppose', 'Affordability', 'Requires elimination of full-time positions vacant 150+ days regardless of essentiality. Skilled searches take time. Eliminating positions could prevent agencies from fulfilling legal mandates.', 'https://weekly.cebv.us/2026-02-02/', '2026-02-02', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2690', 'oppose', 'Affordability', 'Vetoed bill copy requiring 5 weekly work search actions for unemployment recipients. Arizona ranks bottom 5 nationally for unemployment benefits at $320 weekly maximum.', 'https://weekly.cebv.us/2026-02-09/', '2026-02-09', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2786', 'oppose', 'Affordability', 'Would exempt textbook leasing/renting from sales tax at unknown cost. Republican lawmakers increased tax carve-outs from $16 billion in 2014 to over $30 billion in 2025.', 'https://weekly.cebv.us/2026-01-26/', '2026-01-26', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2785', 'oppose', 'Affordability', 'Would rubber-stamp federal tax cuts at state level, blowing hole in state budget. Governor Hobbs vetoed first non-negotiated attempts.', 'https://weekly.cebv.us/2026-02-02/', '2026-02-02', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2792', 'oppose', 'Affordability', 'Exempts some veterans and spouses from state property taxes. Republicans systematically slashed revenues; schools funded at 48th in the country.', 'https://weekly.cebv.us/2026-02-02/', '2026-02-02', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2796', 'oppose', 'Affordability', 'Requires AHCCCS staff to check for recent lottery/gambling winnings without funding and makes hospital patient Medicaid qualification more difficult. Governor vetoed.', 'https://weekly.cebv.us/2026-02-23/', '2026-02-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2797', 'oppose', 'Affordability', 'Requires state employees check SNAP eligibility for jobs, lottery/gambling winnings, prison status. Arizona''s SNAP process already has adequate income checks. No implementation funding included.', 'https://weekly.cebv.us/2026-02-02/', '2026-02-02', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2903', 'oppose', 'Affordability', 'Bans state requiring banks considering social/environmental values when lending. Arizona not requiring this. Driven by panic society holding extremists accountable. ESG plays large role in corporate risk management and long-term profitability.', 'https://weekly.cebv.us/2026-03-16/', '2026-03-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2911', 'oppose', 'Affordability', 'Would repeal the Registrar of Contractors'' ability to order licensed contractors to provide restitution to homeowners if they abandon residential contracts or do work so shoddy it constitutes grounds to suspend their license.', 'https://weekly.cebv.us/2026-02-16/', '2026-02-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2940', 'oppose', 'Affordability', 'Would ban the state from granting anyone Medicaid or SNAP benefits without first affirmatively verifying their eligibility. Agency employees who willfully fail to comply would be fired and forfeit retirement benefits.', 'https://weekly.cebv.us/2026-02-16/', '2026-02-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2946', 'oppose', 'Affordability', 'Cap city/county growth increases at 50%; ban development fees for parks/libraries or basing fees on residence size/bedroom count. Limits to one increase every four years.', 'https://weekly.cebv.us/2026-03-23/', '2026-03-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2951', 'support', 'Affordability', 'Creates consumer protections for automatic subscription renewals. Companies would have to clearly disclose renewal terms, allow consumers to opt in directly rather than being passively renewed, and offer an easy cancellation mechanism.', 'https://weekly.cebv.us/2026-02-16/', '2026-02-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB4030', 'oppose', 'Affordability', 'Freezes city and county taxes, fees, utility rates for four years. Hamstrings crisis response; harms public safety, roads, parks, libraries.', 'https://weekly.cebv.us/2026-02-09/', '2026-02-09', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB4056', 'oppose', 'Affordability', 'Bans charging state lawmakers reasonable fees for public records fulfillment. Striker response to legislator facing $1/page standard rate for 26,000-page request.', 'https://weekly.cebv.us/2026-03-23/', '2026-03-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB4066', 'oppose', 'Affordability', 'Would ban cities from charging fees for creating, upgrading or replacing public services that are higher than "necessary." Attack on local control negatively impacting cities'' ability to serve residents.', 'https://weekly.cebv.us/2026-02-16/', '2026-02-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SCR1003', 'oppose', 'Affordability', 'Exempts "virtual currency" (cryptocurrency) from property taxes, despite environmental destruction concerns.', 'https://weekly.cebv.us/2026-02-23/', '2026-02-23', datetime('now'));

-- ============================================================
-- Energy, Water & Climate
-- ============================================================

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1176', 'oppose', 'Energy, Water & Climate', 'Copy of failed bill allowing storm water storage use for replenishment credits. Gives credits for water generally recharged anyway, resulting in net increase in pumping.', 'https://weekly.cebv.us/2026-03-23/', '2026-03-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1197', 'oppose', 'Energy, Water & Climate', 'Vetoed bill copy allowing irrigated grandfather rights transfer, leading to more groundwater pumping. Douglas pumps 3 times as much water as returns.', 'https://weekly.cebv.us/2026-01-26/', '2026-01-26', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1200', 'oppose', 'Energy, Water & Climate', 'Version of failed bill exempting specific housing developments in Queen Creek and Buckeye from building moratorium using 20-year-old groundwater models. Benefits developers; could result in excessive groundwater pumping. Required replenishment water almost exclusively from Colorado River facing steep cuts.', 'https://weekly.cebv.us/2026-03-16/', '2026-03-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1241', 'oppose', 'Energy, Water & Climate', 'Privatizes building permit review; bans cities/counties from rejecting private permits or charging fees. Financial incentives conflict with impartial safety evaluations.', 'https://weekly.cebv.us/2026-02-09/', '2026-02-09', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1280', 'oppose', 'Energy, Water & Climate', 'Bans Arizona Game and Fish from transporting Mexican gray wolf puppies into state or using public resources for transportation. Mexican gray wolves are most endangered subspecies worldwide and belong in ecosystem.', 'https://weekly.cebv.us/2026-03-16/', '2026-03-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1281', 'oppose', 'Energy, Water & Climate', 'Requires both legislative chambers to vote approving any federal land sales. Threatens conservation and Arizona''s $1.4 billion outdoor recreation industry.', 'https://weekly.cebv.us/2026-03-09/', '2026-03-09', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1288', 'oppose', 'Energy, Water & Climate', 'Copy of failed 2025 bill allowing developers to claim 100-year water supply based on outdated models (some 20+ years old) and build in water-insufficient areas. Destroys Groundwater Management Act protections.', 'https://weekly.cebv.us/2026-02-02/', '2026-02-02', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1332', 'oppose', 'Energy, Water & Climate', 'Mandates legislative review of state light rail participation. Designed to dig evidence light rail is overly expensive despite voters repeatedly approving it.', 'https://weekly.cebv.us/2026-03-23/', '2026-03-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1418', 'oppose', 'Energy, Water & Climate', 'Bans counties from using zoning regulations for small modular reactors colocated with large industrial energy users like data centers. Flies in the face of voter wishes. Part of package creating exemptions for untested, hazardous technology.', 'https://weekly.cebv.us/2026-03-09/', '2026-03-09', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1419', 'oppose', 'Energy, Water & Climate', 'Layers new requirements on rooftop solar installations beyond existing licensing/building regulations, increasing costs. Bans solar contractors from making statements about customer savings. Committee testimony stated bill will probably prevent any new rooftop solar in Arizona.', 'https://weekly.cebv.us/2026-03-16/', '2026-03-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1445', 'oppose', 'Energy, Water & Climate', 'Limits how often Department of Environmental Quality can require testing protected aquifers in small cities for bacterial contamination.', 'https://weekly.cebv.us/2026-03-23/', '2026-03-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1503', 'oppose', 'Energy, Water & Climate', 'Bans government from considering environmental, social, policy or ideological goals for public pension plans. 2024 Public Safety Personnel Retirement System warned similar effort would hurt maximizing returns.', 'https://weekly.cebv.us/2026-03-23/', '2026-03-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1519', 'oppose', 'Energy, Water & Climate', 'Increases off-highway vehicle weight limit from 2,500 to 3,500 pounds at Polaris Industries request. Excessive off-road travel already destroying pristine habitat.', 'https://weekly.cebv.us/2026-03-23/', '2026-03-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1547', 'support', 'Energy, Water & Climate', 'Requires electric cars and alt-fuel vehicles to pay 18-cent energy tax equivalent to gas taxes. Funds highway maintenance; Arizona has third-worst maintained highways nationally with only 35% of pavement in good condition.', 'https://weekly.cebv.us/2026-02-09/', '2026-02-09', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1725', 'oppose', 'Energy, Water & Climate', 'Declares "excessive marijuana smoke and odor" public nuisance, making it criminal activity. Prop 207 (2020) already bans smoking in public spaces. Fails to define "excessive." Six Democrats voted YES on Senate floor.', 'https://weekly.cebv.us/2026-03-23/', '2026-03-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2026', 'oppose', 'Energy, Water & Climate', 'Creates new loophole allowing developers to circumvent assured water supply requirements. Arizona has less water than 20 years ago.', 'https://weekly.cebv.us/2026-03-09/', '2026-03-09', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2027', 'oppose', 'Energy, Water & Climate', 'Creates Groundwater Management Act loophole banning state from using certain water measurement methods. Threatens finite groundwater resource management.', 'https://weekly.cebv.us/2026-02-09/', '2026-02-09', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2028', 'oppose', 'Energy, Water & Climate', 'Lets developers sue state over water applications before state decisions finalize. Creates legal chaos and uncertainty.', 'https://weekly.cebv.us/2026-02-09/', '2026-02-09', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2030', 'oppose', 'Energy, Water & Climate', 'Would eliminate education and research components from water conservation grants, undermining conservation efforts.', 'https://weekly.cebv.us/2026-01-19/', '2026-01-19', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2031', 'oppose', 'Energy, Water & Climate', 'Gives applicants more time filing for grandfathered rights in Willcox Active Management Area. Sounds like delaying tactic; unnecessary.', 'https://weekly.cebv.us/2026-03-16/', '2026-03-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2055', 'oppose', 'Energy, Water & Climate', 'Dedicates state money to brackish groundwater recovery projects. More groundwater pumping isn''t the answer—particularly from nearly quarter-mile depth producing toxic brine byproduct. This water is essentially non-renewable.', 'https://weekly.cebv.us/2026-03-23/', '2026-03-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2056', 'oppose', 'Energy, Water & Climate', 'Requires state study on desalinating brackish groundwater. Water experts call use of brackish groundwater "a mirage," citing laundry list of environmental, physical, financial, technical, regulatory and legal barriers.', 'https://weekly.cebv.us/2026-03-16/', '2026-03-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2094', 'oppose', 'Energy, Water & Climate', 'Exempts proposed housing developments in Queen Creek and Buckeye from building moratoria using outdated 20-year-old groundwater models. Benefits developers; excessive pumping likely. Required replenishment water almost exclusively from Colorado River facing steep cuts.', 'https://weekly.cebv.us/2026-03-09/', '2026-03-09', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2095', 'oppose', 'Energy, Water & Climate', 'Weakens assured water supply requirements by modifying well depth threshold definitions. Facilitates resource overuse and exploitation.', 'https://weekly.cebv.us/2026-02-09/', '2026-02-09', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2096', 'support', 'Energy, Water & Climate', 'Allow the state water authority to fund counties'' work to fix, replace or close cesspools that pose a risk to public health or water quality, and replace them with proper wastewater treatment.', 'https://weekly.cebv.us/2026-03-02/', '2026-03-02', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2097', 'oppose', 'Energy, Water & Climate', 'Would cement existing overpumping on land with insufficient groundwater by raising the limit to 6 acre-feet per acre per year. Basically authorizes sticking a straw in the ground and draining everything out.', 'https://weekly.cebv.us/2026-01-12/', '2026-01-12', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2100', 'oppose', 'Energy, Water & Climate', 'Copy of vetoed bill allowing counties to approve small subdivisions, circumventing existing assured water supply requirements. Benefits wildcat subdivision developers.', 'https://weekly.cebv.us/2026-03-23/', '2026-03-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2101', 'oppose', 'Energy, Water & Climate', 'Undermines state groundwater assessment by relying on modeling instead of actual data regarding supply and demand.', 'https://weekly.cebv.us/2026-03-09/', '2026-03-09', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2102', 'oppose', 'Energy, Water & Climate', 'Creates new infrastructure enabling water hauling in active management areas needing aggressive groundwater management. Fails addressing rural water concerns from industrial agriculture and data centers.', 'https://weekly.cebv.us/2026-03-16/', '2026-03-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2103', 'oppose', 'Energy, Water & Climate', 'Creates new infrastructure enabling water hauling in active management areas. Fails addressing rural water concerns from industrial agriculture and data centers.', 'https://weekly.cebv.us/2026-03-16/', '2026-03-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2145', 'oppose', 'Energy, Water & Climate', 'Lets legislative leaders waive minimum required gasoline standards in Maricopa/Pinal counties at any gas company request. Harms air quality; Arizona ranks fourth in unhealthy ozone days and 84% of Arizonans live in areas with unhealthy air.', 'https://weekly.cebv.us/2026-03-23/', '2026-03-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2147', 'oppose', 'Energy, Water & Climate', 'Requires Arizona Game and Fish issue hunting permits to landowners for deer. Undermines wildlife conservation mandate.', 'https://weekly.cebv.us/2026-02-09/', '2026-02-09', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2159', 'oppose', 'Energy, Water & Climate', 'Allows landowners hunt and kill Mexican gray wolves. Most endangered wolf subspecies globally; protected under Endangered Species Act.', 'https://weekly.cebv.us/2026-02-09/', '2026-02-09', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2267', 'oppose', 'Energy, Water & Climate', 'Declares utility-scale wind/solar farms within four miles of residential property public nuisance; requires AG lawsuit. Wind and solar don''t pollute or drain resources.', 'https://weekly.cebv.us/2026-02-09/', '2026-02-09', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2328', 'oppose', 'Energy, Water & Climate', 'Would force Tucson to stop charging unincorporated customers higher rates. Extended areas require more infrastructure and costlier operations and maintenance.', 'https://weekly.cebv.us/2026-01-26/', '2026-01-26', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2331', 'oppose', 'Energy, Water & Climate', 'Subject to striker requiring 85% of state''s public power generation from fossil fuels. Sierra Club warns it infringes on constitutional authority of Arizona Corporation Commission as it affects ratemaking.', 'https://weekly.cebv.us/2026-02-02/', '2026-02-02', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2388', 'oppose', 'Energy, Water & Climate', 'Dedicates unspecified state tax money studying "economic benefits" of small modular reactors and data centers in Arizona. Biased premise promoting nuclear-powered data centers.', 'https://weekly.cebv.us/2026-02-09/', '2026-02-09', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2389', 'oppose', 'Energy, Water & Climate', 'Allows power companies to replace or add to power plants without environmental impact examination of their plans.', 'https://weekly.cebv.us/2026-02-23/', '2026-02-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2400', 'oppose', 'Energy, Water & Climate', 'Creates summer "fuel tax holiday," directly harming roads. 2022 suspension attempt would have drained $540 million yearly from road infrastructure. Arizona has third-worst maintained highways.', 'https://weekly.cebv.us/2026-02-02/', '2026-02-02', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2452', 'oppose', 'Energy, Water & Climate', 'Requires counties with 125,000+ population to designate land for data centers and small modular reactors. Arizonans across political spectrum pushing back against data centers.', 'https://weekly.cebv.us/2026-02-02/', '2026-02-02', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2456', 'oppose', 'Energy, Water & Climate', 'Bans counties using zoning regulations for small modular reactors colocated with large industrial users. Ignores voter opposition to data centers.', 'https://weekly.cebv.us/2026-02-09/', '2026-02-09', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2457', 'oppose', 'Energy, Water & Climate', 'Allows power companies building new plants near large industrial energy user (data center, aluminum smelter) without environmental impact examination. Flies against voter wishes.', 'https://weekly.cebv.us/2026-03-16/', '2026-03-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2492', 'oppose', 'Energy, Water & Climate', 'Would ban Arizona and its cities/counties from managing urban sprawl or limiting services from being extended to new areas of sprawl.', 'https://weekly.cebv.us/2026-02-16/', '2026-02-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2494', 'oppose', 'Energy, Water & Climate', 'Bans counties from regulating whether solar, wind, gas and nuclear power plants are built if state already studied environmental impact.', 'https://weekly.cebv.us/2026-03-16/', '2026-03-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2497', 'oppose', 'Energy, Water & Climate', 'Creates statutory right for Arizonans to hunt, fish and harvest wildlife, bans policies unreasonably restricting it, weakens Game and Fish wildlife management ability. Anti-conservation; sponsor acknowledged bill targets non-existent problem.', 'https://weekly.cebv.us/2026-03-23/', '2026-03-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2696', 'oppose', 'Energy, Water & Climate', 'Requires Arizona Commerce Authority use all available resources reducing gas prices. Lawmakers busy attacking light rail, obstructing solar while demanding cheaper gas. Increases air pollution, worsens public health.', 'https://weekly.cebv.us/2026-03-23/', '2026-03-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2755', 'oppose', 'Energy, Water & Climate', 'Forces state prioritize mining as highest use of trust land conflicting with other uses like solar. Mining has pronounced destructive environmental impacts.', 'https://weekly.cebv.us/2026-02-09/', '2026-02-09', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2757', 'oppose', 'Energy, Water & Climate', 'Would allow La Paz County to pump more groundwater out of a protected area in Butler Valley intended as reserve groundwater and insurance policy.', 'https://weekly.cebv.us/2026-02-16/', '2026-02-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2758', 'oppose', 'Energy, Water & Climate', 'Allow private water companies to transfer groundwater from area where Saudi company Fondomonte grows water-guzzling alfalfa. Destroys the only state law that protects groundwater for La Paz County communities and industries.', 'https://weekly.cebv.us/2026-03-16/', '2026-03-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2781', 'oppose', 'Energy, Water & Climate', 'Hamstrings solar energy with special requirements and mandatory decommissioning plan submission before starting. Why aren''t similar requirements imposed on actually destructive industries?', 'https://weekly.cebv.us/2026-03-23/', '2026-03-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2787', 'oppose', 'Energy, Water & Climate', 'Bans Arizona from cooperating with Mexican Wolf Reintroduction Program, ignoring federal Endangered Species Act. Mexican gray wolves are most endangered wolf subspecies worldwide; estimated population around 286.', 'https://weekly.cebv.us/2026-03-23/', '2026-03-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2791', 'oppose', 'Energy, Water & Climate', 'Would make Arizona first state banning lab-grown meat as class 5 felony (18 months prison). USDA and FDA approved lab-grown chicken in 2023.', 'https://weekly.cebv.us/2026-01-26/', '2026-01-26', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2795', 'oppose', 'Energy, Water & Climate', 'Bans counties from regulating small modular nuclear reactor siting as long as federal government OKs them. Modular reactors not yet in US commercial use; only two exist worldwide in Russia and China.', 'https://weekly.cebv.us/2026-03-23/', '2026-03-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2843', 'support', 'Energy, Water & Climate', 'Would allow Arizonans to use portable or plug-in solar generation devices without having to first obtain utility approval or pay fees.', 'https://weekly.cebv.us/2026-02-16/', '2026-02-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2889', 'support', 'Energy, Water & Climate', 'Directs $1 million from state general fund to monitoring uranium contamination (soil, water, home testing) in partnership with tribal epidemiology centers. 85% of Navajo people live in uranium-contaminated homes.', 'https://weekly.cebv.us/2026-03-23/', '2026-03-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2915', 'oppose', 'Energy, Water & Climate', 'Would require county boards of supervisors to create a fund to compensate homeowners for the inconvenience of living near wind or solar energy facilities.', 'https://weekly.cebv.us/2026-02-16/', '2026-02-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2918', 'oppose', 'Energy, Water & Climate', 'Imposes punitive taxes on renewable energy and storage equipment owned by public power company. Sponsor stated goal is destroying policies making renewable energy investment more attractive.', 'https://weekly.cebv.us/2026-03-23/', '2026-03-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2955', 'oppose', 'Energy, Water & Climate', 'Waives Arizona requirement for clean-burning summer fuel. State law requires special blend controlling ozone/air pollutants in metro Phoenix, consistently ranking worst air quality regions.', 'https://weekly.cebv.us/2026-03-23/', '2026-03-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2975', 'oppose', 'Energy, Water & Climate', 'Forces State Land Department suspend solar score program; directs land use for mining/housing instead. Hamstrings desperately needed and lucrative renewable energy development.', 'https://weekly.cebv.us/2026-03-23/', '2026-03-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2985', 'oppose', 'Energy, Water & Climate', 'Requires State Land Department develop new CAP water distribution process. Appears intended allowing water sellers/home builders taking more than fair share of groundwater.', 'https://weekly.cebv.us/2026-03-23/', '2026-03-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB4009', 'oppose', 'Energy, Water & Climate', 'Requires State Land Department create map identifying data center suitable locations on trust land. Citizens of all political affiliations oppose more data centers.', 'https://weekly.cebv.us/2026-02-09/', '2026-02-09', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB4025', 'oppose', 'Energy, Water & Climate', 'Would establish a committee to study petroleum availability in Arizona and the feasibility of constructing gas refineries here.', 'https://weekly.cebv.us/2026-02-16/', '2026-02-16', datetime('now'));

-- ============================================================
-- Public Safety
-- ============================================================

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1010', 'oppose', 'Public Safety', 'Renames Loop 202 to "Charlie Kirk Highway." Parts already named for congressman Ed Pastor. Politicizes highway naming process normally handled by state board with five-year-after-death policy.', 'https://weekly.cebv.us/2026-03-16/', '2026-03-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1011', 'oppose', 'Public Safety', 'Requires medical examiners review infant vaccination history in sudden death cases. Assumes vaccinations cause unexplained infant death without evidence. No link exists between vaccines and sudden infant death.', 'https://weekly.cebv.us/2026-03-23/', '2026-03-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1012', 'oppose', 'Public Safety', 'Forces bars/restaurants serving alcohol to let concealed handgun permit holders carry concealed weapons as long as not drinking. Negatively impacts property rights and public safety.', 'https://weekly.cebv.us/2026-03-23/', '2026-03-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1016', 'oppose', 'Public Safety', 'Expands religious exemptions from all vaccines for employees, undermining public health as measles and whooping cough cases surge.', 'https://weekly.cebv.us/2026-01-19/', '2026-01-19', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1019', 'oppose', 'Public Safety', 'Would ban cities from fluoridating water. Defies decades of research; Calgary eliminated fluoride, tooth decay spiked, and they reintroduced it.', 'https://weekly.cebv.us/2026-01-26/', '2026-01-26', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1047', 'oppose', 'Public Safety', 'Copy of failed bill banning governor from calling National Guard into active duty unless Congress or Arizona Legislature requests it.', 'https://weekly.cebv.us/2026-02-16/', '2026-02-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1052', 'oppose', 'Public Safety', 'Subject to "hostile" striker that would keep Department of Economic Security open without extraneous policies. Republicans stuffed bill with unrelated, previously vetoed policies including attacking SNAP users and forcing hospitals to ask immigration status.', 'https://weekly.cebv.us/2026-03-23/', '2026-03-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1053', 'oppose', 'Public Safety', 'Create new concealed weapons permit fees for Arizona residents at 10% of non-resident fees. Would irresponsibly reduce DPS funding and likely increase concealed weapons in Arizona.', 'https://weekly.cebv.us/2026-03-02/', '2026-03-02', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1054', 'oppose', 'Public Safety', 'Would allow residents/businesses to sue voiding emergency local laws. These are already very difficult to pass requiring three-quarters supermajority vote.', 'https://weekly.cebv.us/2026-01-26/', '2026-01-26', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1058', 'oppose', 'Public Safety', 'Ban banks and credit cards from using merchant category codes that identify gun retailers. These codes are an important tool in flagging suspicious gun purchases.', 'https://weekly.cebv.us/2026-03-02/', '2026-03-02', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1061', 'oppose', 'Public Safety', 'Lowers mandatory sentencing threshold for fentanyl sales from 200 grams to 9 grams, requiring 5-15 years prison. Could prosecute people with legitimate uses like cancer patients. Tougher sentences won''t curb fentanyl crisis.', 'https://weekly.cebv.us/2026-03-09/', '2026-03-09', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1065', 'oppose', 'Public Safety', 'Adds $3.64 million state dollars to hyperbaric oxygen therapy fund for military veterans. Therapy mostly treats decompression sickness; very expensive, attracting fraudsters. Governor Ducey used first-ever line-item veto on identical provision.', 'https://weekly.cebv.us/2026-02-02/', '2026-02-02', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1066', 'oppose', 'Public Safety', 'Allows attorneys general to sue researchers publishing "fraudulent scientific research," politicizing science and threatening academic freedom.', 'https://weekly.cebv.us/2026-01-19/', '2026-01-19', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1068', 'oppose', 'Public Safety', 'Exact copy of vetoed bill prohibiting universities and community colleges from banning concealed weapons permit holders from possessing guns on campus. College campuses and guns are a deadly combination.', 'https://weekly.cebv.us/2026-03-09/', '2026-03-09', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1069', 'oppose', 'Public Safety', 'Exact copy of vetoed bill legalizing silencers. Makes it harder for bystanders and law enforcement to identify and react quickly to gunshots.', 'https://weekly.cebv.us/2026-03-09/', '2026-03-09', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1081', 'oppose', 'Public Safety', 'Restricts DCS attorneys from appearing before same judge in dependency and guardianship cases within five cases, hindering child protection efforts.', 'https://weekly.cebv.us/2026-01-19/', '2026-01-19', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1093', 'oppose', 'Public Safety', 'Create draconian new penalties for protesters with broad new definition of "riot" involving two or more people recklessly using force resulting in property damage. Police may treat as conspiracy or racketeering.', 'https://weekly.cebv.us/2026-03-02/', '2026-03-02', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1111', 'oppose', 'Public Safety', 'Exempts all automated license plate reader (ALPR) data from public records. Over 65 Arizona agencies use ALPR; Flock company breached citizen privacy repeatedly.', 'https://weekly.cebv.us/2026-02-09/', '2026-02-09', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1112', 'oppose', 'Public Safety', 'Makes involuntary mental health treatment easier by lowering witness requirement to one. Very serious civil liberties infringement; disproportionately impacts domestic violence victims, people of color, and people with intellectual/developmental disabilities.', 'https://weekly.cebv.us/2026-03-23/', '2026-03-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1138', 'oppose', 'Public Safety', 'Would cement automated license plate reader misuse into law, granting blanket permission without judicial warrant. ALPR data known to be monitored by ICE.', 'https://weekly.cebv.us/2026-01-26/', '2026-01-26', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1148', 'oppose', 'Public Safety', 'Transfers attorney licensing from State Bar to Arizona Supreme Court; bans requiring State Bar membership. Sponsor carries grudge—Bar sanctioned his lawyer for frivolous suit and forced repayment of nearly $50,000 in legal fees.', 'https://weekly.cebv.us/2026-03-09/', '2026-03-09', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1194', 'oppose', 'Public Safety', 'Would ban health care workers and hospitals from denying care or downgrading priority based on vaccination status.', 'https://weekly.cebv.us/2026-02-16/', '2026-02-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1212', 'oppose', 'Public Safety', 'Bans health insurance companies reimbursing at different rates based on vaccination status. This isn''t happening. Fear-mongering, unnecessary bill attacking public health.', 'https://weekly.cebv.us/2026-03-23/', '2026-03-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1214', 'oppose', 'Public Safety', 'Would ban medical professionals from using embryonic stem cell therapy if cells derived from an aborted embryo.', 'https://weekly.cebv.us/2026-02-16/', '2026-02-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1424', 'oppose', 'Public Safety', 'Mandates public district and charter schools (not private or voucher-funded) teach "age-appropriate firearm safety awareness" every year, K-12.', 'https://weekly.cebv.us/2026-03-09/', '2026-03-09', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1439', 'oppose', 'Public Safety', 'Create a special license plate for Charlie Kirk. Arizona already has 109 special plates. Designed to fund Turning Point USA. Sponsor''s companies paid millions by TPUSA, raising questions about direct profit. Governor vetoed.', 'https://weekly.cebv.us/se-2026-03-09/', '2026-03-09', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1456', 'oppose', 'Public Safety', 'Allows ADOT designate state roads "primitive" as use-at-your-own-risk byways limiting state liability. Could burden emergency responders regardless of signs.', 'https://weekly.cebv.us/2026-03-23/', '2026-03-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1523', 'support', 'Public Safety', 'Appropriates $340,000 from state general fund to Navajo Nation for pipeline bringing water to Ganado area. Minimal budget impact but significant benefit to families lacking running water and infrastructure.', 'https://weekly.cebv.us/2026-02-23/', '2026-02-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1539', 'support', 'Public Safety', 'Requires backyard pet breeders to maintain basic health and safety conditions, practice safe breeding and humane placement, provide customers with valid certificate of veterinary inspection.', 'https://weekly.cebv.us/2026-02-16/', '2026-02-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1557', 'oppose', 'Public Safety', 'Requires health professional to get patient''s signed informed consent before any "medical intervention," except during emergency care.', 'https://weekly.cebv.us/2026-02-16/', '2026-02-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1602', 'support', 'Public Safety', 'Gradually raises monthly kinship foster care parent stipend to $600/month matching other foster parents. Kinship parents often grandparents raising grandkids; some families must return children because they cannot afford care.', 'https://weekly.cebv.us/2026-03-23/', '2026-03-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1624', 'oppose', 'Public Safety', 'Institutes limits on photo radar: caps ticket cost at $75, bans cities suspending/revoking licenses based on camera information. Studies show cameras reduce crashes/injuries by up to 35 percent.', 'https://weekly.cebv.us/2026-03-16/', '2026-03-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1707', 'oppose', 'Public Safety', 'Would spend $5 million in state funds on AI for border security. Could lead to inaccuracies, create privacy issues, and erode public confidence in immigration enforcement.', 'https://weekly.cebv.us/2026-02-16/', '2026-02-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'SB1751', 'oppose', 'Public Safety', 'Would require prisoners who kill law enforcement officer be executed by firing squad, and give other death-sentenced prisoners the choice of firing squad.', 'https://weekly.cebv.us/2026-02-16/', '2026-02-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2003', 'oppose', 'Public Safety', 'Lowers minimum driver''s permit age to 15. Insurance Institute for Highway Safety data shows this would increase both fatal crashes and accidents overall. Teen drivers crash at nearly 4 times rates of drivers 20+.', 'https://weekly.cebv.us/2026-03-09/', '2026-03-09', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2076', 'oppose', 'Public Safety', 'Copy of failed bill allowing K-12 schools to permit firearms on grounds with minimal oversight. Employees could carry unknown to parents; immunity during active threats.', 'https://weekly.cebv.us/2026-02-09/', '2026-02-09', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2086', 'oppose', 'Public Safety', 'Bans state, cities, counties and district schools from requiring any vaccines. Also bans masks except long-standing workplace safety measures. Also bans private businesses requiring masks/vaccinations.', 'https://weekly.cebv.us/2026-03-23/', '2026-03-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2108', 'oppose', 'Public Safety', 'Toughens penalties for someone who flees from a pursuing law enforcement vehicle. Could be misused and weaponized as retaliation against dissent.', 'https://weekly.cebv.us/2026-01-12/', '2026-01-12', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2118', 'oppose', 'Public Safety', 'Bans cities/counties requiring background checks, ID or fingerprinting from food truck owners before licensing. Eliminating checks entirely harms public safety.', 'https://weekly.cebv.us/2026-03-23/', '2026-03-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2132', 'oppose', 'Public Safety', 'Lowers threshold for mandatory sentencing of fentanyl sellers to 100 grams from 200. Required 5-15 years prison, 10-20 for repeat offenders. Tougher mandatory sentences won''t curb fentanyl crisis; Arizona already has seventh-highest incarceration rate.', 'https://weekly.cebv.us/2026-03-02/', '2026-03-02', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2133', 'oppose', 'Public Safety', 'Forces consent for digitally created content depicting real people. Strikes at First Amendment by enabling politically motivated censorship and requiring pre-approval of content critical of politicians.', 'https://weekly.cebv.us/2026-03-23/', '2026-03-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2136', 'oppose', 'Public Safety', 'Creates new felony offenses of "civil terrorism" and "subversion" (18 months prison); expanding racketeering to include riot. Also revives vetoed bill making felony for 3+ protesters blocking roads. Purposely intended criminalizing constitutionally protected protest right.', 'https://weekly.cebv.us/2026-03-23/', '2026-03-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2168', 'oppose', 'Public Safety', 'Would stop Arizona''s attorney general from filing "public nuisance actions" or penalize her for doing so. AG Mayes used nuisance law against Saudi company Fondomonte and considers using it to oppose enormous new ICE prison in Surprise.', 'https://weekly.cebv.us/2026-03-16/', '2026-03-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2169', 'oppose', 'Public Safety', 'Related bill threatening attorney general regarding public nuisance action against smelting plant.', 'https://weekly.cebv.us/2026-02-02/', '2026-02-02', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2167', 'oppose', 'Public Safety', 'Stops Arizona''s attorney general from filing public nuisance actions or penalizes doing so. Benson residents suing aluminum smelting plant requested AG Mayes intervene; she identifies nuisance law as strongest tool available.', 'https://weekly.cebv.us/2026-03-09/', '2026-03-09', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2248', 'oppose', 'Public Safety', 'Bans private businesses from refusing employment/service based on vaccination status. Bans schools from requiring vaccines. Would even ban schools sending home children with lice.', 'https://weekly.cebv.us/2026-03-16/', '2026-03-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2334', 'oppose', 'Public Safety', 'Copy of vetoed 2024 bill banning food that "has received a mRNA vaccine" from being sold in Arizona.', 'https://weekly.cebv.us/2026-02-16/', '2026-02-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2342', 'support', 'Public Safety', 'Requires HOAs to allow residents to install reasonable shade structures in backyards while allowing HOAs to adopt rules on size, placement and appearance. Helps families protect from excessive heat and reduce energy costs.', 'https://weekly.cebv.us/2026-03-23/', '2026-03-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2349', 'oppose', 'Public Safety', 'Would exempt rural fire districts in counties under 1 million from workers'' compensation coverage for firefighters.', 'https://weekly.cebv.us/2026-02-16/', '2026-02-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2369', 'oppose', 'Public Safety', 'Requires photo radar tickets signed by judge. Attack on photo radar means more dangerous roads and collisions. Arizona has used speed cameras since 1987.', 'https://weekly.cebv.us/2026-03-16/', '2026-03-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2410', 'oppose', 'Public Safety', 'Declares AI communications "privileged" like advice from human professionals. Federal judge ruled public AI use is not privileged communication. AI can hallucinate, exhibit biases, and violate ethics standards. Deeply dangerous to elevate AI to same standard as human care.', 'https://weekly.cebv.us/2026-03-09/', '2026-03-09', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2417', 'oppose', 'Public Safety', 'Allows Arizona drivers installing variable speed inhibitor in cars instead of license revocation/suspension. Unclear who is notified if disabled or timeline. Why aren''t these drivers on provisional license?', 'https://weekly.cebv.us/2026-03-23/', '2026-03-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2435', 'oppose', 'Public Safety', 'Allows foreign medical school graduates (including non-accredited) practice medicine without residency completion or specialty declaration. Reduces patient safety standards.', 'https://weekly.cebv.us/2026-02-09/', '2026-02-09', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2592', 'oppose', 'Public Safety', 'Requires every state agency incorporating AI into operations; agencies cannot regulate without legislature''s express permission. Blindly trusting AI carries serious risk. Past year: AI made racist/antisemitic remarks, wiped corporate database, helped plan assault.', 'https://weekly.cebv.us/2026-03-16/', '2026-03-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2593', 'support', 'Public Safety', 'Would continue funding for Arizona''s Perinatal and Pediatric Psychiatry Access Line, a phone number health care providers can call to get real-time psychiatric guidance.', 'https://weekly.cebv.us/2026-02-16/', '2026-02-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2641', 'support', 'Public Safety', 'Bans PFAs from firefighting foam. Studies found high PFA levels in firefighters'' blood; these forever chemicals cause serious health problems including cancer, high cholesterol, and reproductive issues.', 'https://weekly.cebv.us/2026-03-23/', '2026-03-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2673', 'support', 'Public Safety', 'Institutes basic safeguards for screening and treating mental illness in prisoners. 2022 federal judge ruled mental health care for incarcerated Arizonans "so bad it amounts to cruel and unusual punishment."', 'https://weekly.cebv.us/2026-03-16/', '2026-03-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2683', 'support', 'Public Safety', 'Sets aside $5 million for emergency food assistance fund supporting SNAP during federal shutdowns. Supports food banks and nonprofits.', 'https://weekly.cebv.us/2026-02-09/', '2026-02-09', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2763', 'oppose', 'Public Safety', 'Requires both legislature chambers approving state-owned shooting range closure. Response to sponsor''s fear state will close Ben Avery Shooting Facility—not planned or discussed. Unnecessary red tape.', 'https://weekly.cebv.us/2026-03-23/', '2026-03-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2773', 'oppose', 'Public Safety', 'Bans Arizona/cities/counties from assisting International Criminal Court. Court is last resort complementing national courts. Bill may shield ICE from future responsibility for documented abuses.', 'https://weekly.cebv.us/2026-02-02/', '2026-02-02', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2775', 'oppose', 'Public Safety', 'Bans Arizona and cities/counties from assisting international organizations including WHO, UN, ICC, and NATO. Isolationist scheme shielding government accountability.', 'https://weekly.cebv.us/2026-02-16/', '2026-02-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2861', 'support', 'Public Safety', 'Would allow government to destroy a gun that was used to kill or seriously harm someone, instead of selling or transferring the weapon as state law currently requires.', 'https://weekly.cebv.us/2026-02-16/', '2026-02-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2862', 'oppose', 'Public Safety', 'Toughens penalties for crimes committed while "wearing mask with intent concealing identity." Potential First Amendment issues based on clothing, not conduct. Part of package criminalizing constitutionally protected protest right.', 'https://weekly.cebv.us/2026-03-23/', '2026-03-23', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2941', 'support', 'Public Safety', 'Reclassifies lane splitting by motorcycles as reckless driving. Motorcycle crashes comprise 2.59% total crashes but account for over 21% traffic fatalities.', 'https://weekly.cebv.us/2026-03-16/', '2026-03-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2957', 'oppose', 'Public Safety', 'Bans Arizona requiring enhanced driver license program like REAL ID for government purpose. Appears motivated by paranoia.', 'https://weekly.cebv.us/2026-03-16/', '2026-03-16', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB2958', 'support', 'Public Safety', 'Requires AHCCCS provide comprehensive dental care for pregnant women ages 21+. Dental care during pregnancy crucial for mother and infant health.', 'https://weekly.cebv.us/2026-02-09/', '2026-02-09', datetime('now'));

INSERT INTO org_recommendations (org_code, org_name, bill_number, position, category, description, source_url, source_date, scraped_at)
VALUES ('CEBV', 'Civic Engagement Beyond Voting', 'HB4117', 'oppose', 'Public Safety', 'Makes crime of "disturbing religious service" with "indecent behavior, profane discourse, or unnecessary noise," even outside building. "Profane discourse" inclusion likely violates First Amendment. Part of package criminalizing constitutionally protected protest.', 'https://weekly.cebv.us/2026-03-23/', '2026-03-23', datetime('now'));

-- ============================================================
-- Verification query — run after import to confirm counts
-- ============================================================
-- SELECT position, COUNT(*) as cnt
-- FROM org_recommendations
-- WHERE org_code = 'CEBV'
-- GROUP BY position
-- ORDER BY position;
--
-- SELECT category, COUNT(*) as cnt
-- FROM org_recommendations
-- WHERE org_code = 'CEBV'
-- GROUP BY category
-- ORDER BY cnt DESC;
