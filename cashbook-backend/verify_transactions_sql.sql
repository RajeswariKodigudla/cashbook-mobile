-- SQL Queries to Verify Transaction Storage (PostgreSQL)
-- Run these in DBeaver, pgAdmin, or psql to verify all transactions are stored correctly
-- Database: PostgreSQL
--
-- NOTE: In PostgreSQL, table names are case-sensitive when quoted.
-- Django creates tables in lowercase, so use lowercase table names.
-- Schema is usually 'public' by default.
--
-- Connection Info (from your Django settings):
-- Host: dpg-d5giqe6r433s73dn7ptg-a.oregon-postgres.render.com
-- Database: cashbook_os9o
-- Port: 5432

-- IMPORTANT: Django creates table names as: appname_modelname (lowercase)
-- Table names:
--   transactions_transaction (Transaction model)
--   accounts_account (Account model)
--   accounts_accountmember (AccountMember model)
--   auth_user (Django User model)

-- 1. Check if account_id column exists
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'transactions_transaction' AND column_name = 'account_id';

-- 2. View ALL transactions with account_id (including NULL for personal)
SELECT 
    id,
    user_id,
    account_id,  -- This column should exist
    type,
    amount,
    name,
    category,
    date,
    time,
    created_at
FROM transactions_transaction
ORDER BY created_at DESC;

-- 3. View only shared account transactions (account_id IS NOT NULL)
SELECT 
    id,
    user_id,
    account_id,
    type,
    amount,
    name,
    category,
    date,
    time,
    created_at
FROM transactions_transaction
WHERE account_id IS NOT NULL
ORDER BY created_at DESC;

-- 4. View only personal transactions (account_id IS NULL)
SELECT 
    id,
    user_id,
    account_id,
    type,
    amount,
    name,
    category,
    date,
    time,
    created_at
FROM transactions_transaction
WHERE account_id IS NULL
ORDER BY created_at DESC;

-- 5. Count transactions by account
SELECT 
    account_id,
    COUNT(*) as transaction_count
FROM transactions_transaction
GROUP BY account_id
ORDER BY account_id;

-- 6. View transactions for a specific shared account (replace 7 with your account ID)
SELECT 
    t.id,
    t.user_id,
    t.account_id,
    t.type,
    t.amount,
    t.name,
    t.category,
    t.date,
    t.time,
    t.created_at,
    u.username as created_by
FROM transactions_transaction t
LEFT JOIN auth_user u ON t.user_id = u.id
WHERE t.account_id = 7  -- Replace with your shared account ID
ORDER BY t.created_at DESC;

-- 7. Verify all transactions in a shared account belong to account members
-- Replace 7 with your account ID
SELECT 
    t.id,
    t.user_id,
    u.username,
    t.account_id,
    t.type,
    t.amount,
    t.name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM accounts_accountmember am 
            WHERE am.account_id = t.account_id 
            AND am.user_id = t.user_id 
            AND am.status = 'ACCEPTED'
        ) OR EXISTS (
            SELECT 1 FROM accounts_account a 
            WHERE a.id = t.account_id 
            AND a.owner_id = t.user_id
        ) THEN '✅ Valid Member'
        ELSE '❌ NOT a Member'
    END as membership_status
FROM transactions t
LEFT JOIN auth_user u ON t.user_id = u.id
WHERE t.account_id = 7  -- Replace with your shared account ID
ORDER BY t.created_at DESC;

-- 8. Count transactions by user for a specific account
-- Replace 7 with your account ID
SELECT 
    u.username,
    u.id as user_id,
    COUNT(t.id) as transaction_count
FROM transactions_transaction t
LEFT JOIN auth_user u ON t.user_id = u.id
WHERE t.account_id = 7  -- Replace with your shared account ID
GROUP BY u.id, u.username
ORDER BY transaction_count DESC;

-- 9. Check for orphaned transactions (account_id exists but account doesn't)
SELECT 
    t.id,
    t.account_id,
    t.user_id,
    u.username,
    t.type,
    t.amount,
    t.created_at
FROM transactions_transaction t
LEFT JOIN auth_user u ON t.user_id = u.id
WHERE t.account_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM accounts_account a WHERE a.id = t.account_id
)
ORDER BY t.created_at DESC;

-- 10. List all tables to verify table names (PostgreSQL)
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%transaction%' OR table_name LIKE '%account%'
ORDER BY table_name;

-- 11. Quick summary: Transactions by account with account names
SELECT 
    a.id as account_id,
    a.name as account_name,
    a.type as account_type,
    COUNT(t.id) as transaction_count
FROM accounts_account a
LEFT JOIN transactions_transaction t ON a.id = t.account_id
GROUP BY a.id, a.name, a.type
ORDER BY transaction_count DESC;

