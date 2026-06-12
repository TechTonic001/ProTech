-- ============================================================
-- ProTech Database Migration — Add Hostel Columns to users
-- Run this in phpMyAdmin on protech_db BEFORE deploying code
-- ============================================================

ALTER TABLE users
  ADD COLUMN hostel_name    VARCHAR(200) NULL
    COMMENT 'Name of hostel/property — landlords only'
    AFTER account_name,
  ADD COLUMN hostel_address TEXT NULL
    COMMENT 'Address of hostel — landlords only'
    AFTER hostel_name;
