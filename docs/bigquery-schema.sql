-- BigQuery schema for accurate grant data analytics
-- This schema is designed for high-accuracy analytics with proper normalization

-- 1. Systems dimension table
CREATE TABLE `grants_analytics.dim_systems` (
  system_id STRING NOT NULL,
  name STRING NOT NULL,
  type STRING NOT NULL, -- DAO, Foundation, etc.
  description STRING,
  website STRING,
  api_endpoint STRING,
  funding_mechanisms ARRAY<STRING>,
  supported_networks ARRAY<STRING>,
  established_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  data_source STRING NOT NULL, -- opengrants, daoip5, etc.
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY DATE(created_at)
CLUSTER BY system_id, data_source;

-- 2. Grant pools/rounds fact table
CREATE TABLE `grants_analytics.fact_grant_pools` (
  pool_id STRING NOT NULL,
  system_id STRING NOT NULL,
  name STRING NOT NULL,
  description STRING,
  funding_mechanism STRING NOT NULL,
  is_open BOOLEAN,
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  total_pool_size_native NUMERIC,
  total_pool_size_usd NUMERIC,
  native_currency STRING,
  conversion_rate NUMERIC,
  conversion_date DATE,
  applications_count INT64 DEFAULT 0,
  funded_applications_count INT64 DEFAULT 0,
  total_distributed_usd NUMERIC DEFAULT 0,
  data_source STRING NOT NULL,
  source_url STRING,
  ingested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY DATE(start_date)
CLUSTER BY system_id, funding_mechanism, is_open;

-- 3. Projects dimension table
CREATE TABLE `grants_analytics.dim_projects` (
  project_id STRING NOT NULL,
  canonical_name STRING NOT NULL,
  description STRING,
  website STRING,
  github_url STRING,
  twitter_handle STRING,
  categories ARRAY<STRING>,
  tags ARRAY<STRING>,
  team_size INT64,
  established_date DATE,
  geographic_region STRING,
  country_code STRING,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY DATE(created_at)
CLUSTER BY canonical_name, geographic_region;

-- 4. Grant applications fact table
CREATE TABLE `grants_analytics.fact_grant_applications` (
  application_id STRING NOT NULL,
  pool_id STRING NOT NULL,
  project_id STRING NOT NULL,
  system_id STRING NOT NULL,
  status STRING NOT NULL, -- pending, approved, rejected, funded, completed
  submitted_at TIMESTAMP,
  decided_at TIMESTAMP,
  amount_requested_native NUMERIC,
  amount_requested_usd NUMERIC,
  amount_approved_native NUMERIC,
  amount_approved_usd NUMERIC,
  amount_paid_native NUMERIC,
  amount_paid_usd NUMERIC,
  native_currency STRING,
  conversion_rate_requested NUMERIC,
  conversion_rate_approved NUMERIC,
  conversion_rate_paid NUMERIC,
  conversion_date_requested DATE,
  conversion_date_approved DATE,
  conversion_date_paid DATE,
  votes_count INT64 DEFAULT 0,
  unique_voters_count INT64 DEFAULT 0,
  matching_amount_usd NUMERIC DEFAULT 0,
  data_source STRING NOT NULL,
  source_url STRING,
  ingested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY DATE(submitted_at)
CLUSTER BY system_id, pool_id, status;

-- 5. Funding transactions fact table (for detailed tracking)
CREATE TABLE `grants_analytics.fact_funding_transactions` (
  transaction_id STRING NOT NULL,
  application_id STRING NOT NULL,
  pool_id STRING NOT NULL,
  project_id STRING NOT NULL,
  system_id STRING NOT NULL,
  transaction_type STRING NOT NULL, -- grant, matching, bonus, etc.
  amount_native NUMERIC NOT NULL,
  amount_usd NUMERIC NOT NULL,
  native_currency STRING NOT NULL,
  conversion_rate NUMERIC NOT NULL,
  conversion_date DATE NOT NULL,
  transaction_date TIMESTAMP NOT NULL,
  blockchain_network STRING,
  transaction_hash STRING,
  from_address STRING,
  to_address STRING,
  data_source STRING NOT NULL,
  ingested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY DATE(transaction_date)
CLUSTER BY system_id, transaction_type, blockchain_network;

-- 6. Currency exchange rates table
CREATE TABLE `grants_analytics.dim_currency_rates` (
  currency_pair STRING NOT NULL, -- ETH_USD, BTC_USD, etc.
  rate_date DATE NOT NULL,
  rate NUMERIC NOT NULL,
  source STRING NOT NULL, -- coingecko, coinbase, etc.
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY rate_date
CLUSTER BY currency_pair, source;

-- 7. Data quality and lineage table
CREATE TABLE `grants_analytics.data_lineage` (
  lineage_id STRING NOT NULL,
  table_name STRING NOT NULL,
  record_id STRING NOT NULL,
  source_system STRING NOT NULL,
  source_url STRING,
  extraction_timestamp TIMESTAMP NOT NULL,
  transformation_rules ARRAY<STRING>,
  data_quality_score NUMERIC, -- 0-100
  validation_errors ARRAY<STRING>,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY DATE(extraction_timestamp)
CLUSTER BY table_name, source_system;

-- Materialized views for common analytics queries

-- 1. System overview metrics
CREATE MATERIALIZED VIEW `grants_analytics.mv_system_metrics` AS
SELECT 
  s.system_id,
  s.name as system_name,
  s.type as system_type,
  s.funding_mechanisms,
  COUNT(DISTINCT p.pool_id) as total_pools,
  COUNT(DISTINCT a.application_id) as total_applications,
  COUNT(DISTINCT CASE WHEN a.status IN ('approved', 'funded', 'completed') THEN a.application_id END) as funded_applications,
  COUNT(DISTINCT a.project_id) as unique_projects,
  SUM(a.amount_approved_usd) as total_funding_usd,
  SUM(a.amount_paid_usd) as total_distributed_usd,
  SAFE_DIVIDE(
    COUNT(DISTINCT CASE WHEN a.status IN ('approved', 'funded', 'completed') THEN a.application_id END),
    COUNT(DISTINCT a.application_id)
  ) * 100 as approval_rate_percent,
  MAX(a.updated_at) as last_updated
FROM `grants_analytics.dim_systems` s
LEFT JOIN `grants_analytics.fact_grant_pools` p ON s.system_id = p.system_id
LEFT JOIN `grants_analytics.fact_grant_applications` a ON p.pool_id = a.pool_id
WHERE s.is_active = TRUE
GROUP BY s.system_id, s.name, s.type, s.funding_mechanisms;

-- 2. Quarterly funding trends
CREATE MATERIALIZED VIEW `grants_analytics.mv_quarterly_trends` AS
SELECT 
  EXTRACT(YEAR FROM a.submitted_at) as year,
  EXTRACT(QUARTER FROM a.submitted_at) as quarter,
  FORMAT('%d-Q%d', EXTRACT(YEAR FROM a.submitted_at), EXTRACT(QUARTER FROM a.submitted_at)) as quarter_label,
  s.system_id,
  s.name as system_name,
  p.funding_mechanism,
  COUNT(DISTINCT a.application_id) as applications_count,
  COUNT(DISTINCT CASE WHEN a.status IN ('approved', 'funded', 'completed') THEN a.application_id END) as funded_count,
  COUNT(DISTINCT a.project_id) as unique_projects,
  SUM(a.amount_requested_usd) as total_requested_usd,
  SUM(a.amount_approved_usd) as total_approved_usd,
  SUM(a.amount_paid_usd) as total_distributed_usd,
  AVG(a.amount_approved_usd) as avg_grant_size_usd
FROM `grants_analytics.fact_grant_applications` a
JOIN `grants_analytics.fact_grant_pools` p ON a.pool_id = p.pool_id
JOIN `grants_analytics.dim_systems` s ON a.system_id = s.system_id
WHERE a.submitted_at IS NOT NULL
GROUP BY year, quarter, quarter_label, s.system_id, s.name, p.funding_mechanism;

-- 3. Funding mechanism analysis
CREATE MATERIALIZED VIEW `grants_analytics.mv_mechanism_analysis` AS
SELECT 
  p.funding_mechanism,
  COUNT(DISTINCT p.pool_id) as pools_count,
  COUNT(DISTINCT a.application_id) as applications_count,
  COUNT(DISTINCT CASE WHEN a.status IN ('approved', 'funded', 'completed') THEN a.application_id END) as funded_count,
  COUNT(DISTINCT a.project_id) as unique_projects,
  COUNT(DISTINCT s.system_id) as systems_using_mechanism,
  SUM(p.total_pool_size_usd) as total_pool_size_usd,
  SUM(a.amount_approved_usd) as total_approved_usd,
  SUM(a.amount_paid_usd) as total_distributed_usd,
  AVG(a.amount_approved_usd) as avg_grant_size_usd,
  SAFE_DIVIDE(
    COUNT(DISTINCT CASE WHEN a.status IN ('approved', 'funded', 'completed') THEN a.application_id END),
    COUNT(DISTINCT a.application_id)
  ) * 100 as approval_rate_percent
FROM `grants_analytics.fact_grant_pools` p
LEFT JOIN `grants_analytics.fact_grant_applications` a ON p.pool_id = a.pool_id
JOIN `grants_analytics.dim_systems` s ON p.system_id = s.system_id
GROUP BY p.funding_mechanism;

-- Indexes for performance
CREATE INDEX idx_applications_system_status ON `grants_analytics.fact_grant_applications`(system_id, status);
CREATE INDEX idx_applications_project_pool ON `grants_analytics.fact_grant_applications`(project_id, pool_id);
CREATE INDEX idx_pools_system_mechanism ON `grants_analytics.fact_grant_pools`(system_id, funding_mechanism);
CREATE INDEX idx_transactions_application ON `grants_analytics.fact_funding_transactions`(application_id);

-- Data quality constraints
ALTER TABLE `grants_analytics.fact_grant_applications` 
ADD CONSTRAINT check_valid_status 
CHECK (status IN ('pending', 'in_review', 'approved', 'funded', 'rejected', 'completed', 'cancelled'));

ALTER TABLE `grants_analytics.fact_grant_pools` 
ADD CONSTRAINT check_positive_amounts 
CHECK (total_pool_size_usd >= 0 AND total_distributed_usd >= 0);

ALTER TABLE `grants_analytics.dim_currency_rates` 
ADD CONSTRAINT check_positive_rate 
CHECK (rate > 0);
