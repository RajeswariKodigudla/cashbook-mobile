-- Verification Queries for Accounts 5, 6, and 7
-- Run these in DBeaver to verify transactions are stored correctly
-- 
-- NOTE: Based on your DBeaver screenshots, the table name appears to be:
--   - public.transactions (or just 'transactions')
--   - public.accounts_account (or just 'accounts_account')
--   - public.auth_user (or just 'auth_user')
--
-- If queries fail, try replacing table names:
--   transactions -> transactions_transaction
--   accounts_account -> accounts_account (should be correct)
--   auth_user -> auth_user (should be correct)

-- ============================================================================
-- QUERY 1: Overview - Count transactions for each account
-- ============================================================================
SELECT 
    account_id,
    COUNT(*) as total_transactions,
    COUNT(DISTINCT user_id) as unique_users,
    SUM(CASE WHEN type = 'Income' THEN 1 ELSE 0 END) as income_count,
    SUM(CASE WHEN type = 'Expense' THEN 1 ELSE 0 END) as expense_count,
    SUM(CASE WHEN type = 'Income' THEN amount ELSE 0 END) as total_income,
    SUM(CASE WHEN type = 'Expense' THEN amount ELSE 0 END) as total_expense
FROM transactions
WHERE account_id IN (5, 6, 7)
GROUP BY account_id
ORDER BY account_id;

-- ============================================================================
-- QUERY 2: Detailed transactions for Account 5
-- ============================================================================
SELECT 
    t.id,
    t.user_id,
    u.username as created_by,
    t.account_id,
    t.type,
    t.amount,
    t.name,
    t.category,
    t.remark,
    t.mode,
    t.date,
    t.time,
    t.created_at
FROM transactions t
LEFT JOIN auth_user u ON t.user_id = u.id
WHERE t.account_id = 5
ORDER BY t.created_at DESC;

-- ============================================================================
-- QUERY 3: Detailed transactions for Account 6
-- ============================================================================
SELECT 
    t.id,
    t.user_id,
    u.username as created_by,
    t.account_id,
    t.type,
    t.amount,
    t.name,
    t.category,
    t.remark,
    t.mode,
    t.date,
    t.time,
    t.created_at
FROM transactions t
LEFT JOIN auth_user u ON t.user_id = u.id
WHERE t.account_id = 6
ORDER BY t.created_at DESC;

-- ============================================================================
-- QUERY 4: Detailed transactions for Account 7
-- ============================================================================
SELECT 
    t.id,
    t.user_id,
    u.username as created_by,
    t.account_id,
    t.type,
    t.amount,
    t.name,
    t.category,
    t.remark,
    t.mode,
    t.date,
    t.time,
    t.created_at
FROM transactions t
LEFT JOIN auth_user u ON t.user_id = u.id
WHERE t.account_id = 7
ORDER BY t.created_at DESC;

-- ============================================================================
-- QUERY 5: Verify account members for each account
-- ============================================================================
SELECT 
    a.id as account_id,
    a.name as account_name,
    a.type as account_type,
    a.owner_id,
    owner.username as owner_name,
    COUNT(DISTINCT am.user_id) as member_count
FROM accounts_account a
LEFT JOIN auth_user owner ON a.owner_id = owner.id
LEFT JOIN accounts_accountmember am ON a.id = am.account_id AND am.status = 'ACCEPTED'
WHERE a.id IN (5, 6, 7)
GROUP BY a.id, a.name, a.type, a.owner_id, owner.username
ORDER BY a.id;

-- ============================================================================
-- QUERY 6: Verify transactions belong to account members
-- ============================================================================
SELECT 
    t.account_id,
    t.user_id,
    u.username,
    COUNT(t.id) as transaction_count,
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
WHERE t.account_id IN (5, 6, 7)
GROUP BY t.account_id, t.user_id, u.username
ORDER BY t.account_id, u.username;

-- ============================================================================
-- QUERY 7: Summary by user for each account
-- ============================================================================
SELECT 
    t.account_id,
    a.name as account_name,
    u.username,
    u.id as user_id,
    COUNT(t.id) as transaction_count,
    SUM(CASE WHEN t.type = 'Income' THEN t.amount ELSE 0 END) as total_income,
    SUM(CASE WHEN t.type = 'Expense' THEN t.amount ELSE 0 END) as total_expense
FROM transactions t
LEFT JOIN auth_user u ON t.user_id = u.id
LEFT JOIN accounts_account a ON t.account_id = a.id
WHERE t.account_id IN (5, 6, 7)
GROUP BY t.account_id, a.name, u.username, u.id
ORDER BY t.account_id, u.username;

-- ============================================================================
-- QUERY 8: Check for any data integrity issues
-- ============================================================================
-- Check for transactions with invalid account_id
SELECT 
    'Invalid account_id' as issue_type,
    COUNT(*) as count
FROM transactions t
WHERE t.account_id IN (5, 6, 7)
AND NOT EXISTS (
    SELECT 1 FROM accounts_account a WHERE a.id = t.account_id
)

UNION ALL

-- Check for transactions with invalid user_id
SELECT 
    'Invalid user_id' as issue_type,
    COUNT(*) as count
FROM transactions t
WHERE t.account_id IN (5, 6, 7)
AND NOT EXISTS (
    SELECT 1 FROM auth_user u WHERE u.id = t.user_id
)

UNION ALL

-- Check for transactions not belonging to account members
SELECT 
    'Transactions by non-members' as issue_type,
    COUNT(*) as count
FROM transactions t
WHERE t.account_id IN (5, 6, 7)
AND NOT EXISTS (
    SELECT 1 FROM accounts_accountmember am 
    WHERE am.account_id = t.account_id 
    AND am.user_id = t.user_id 
    AND am.status = 'ACCEPTED'
)
AND NOT EXISTS (
    SELECT 1 FROM accounts_account a 
    WHERE a.id = t.account_id 
    AND a.owner_id = t.user_id
);

-- ============================================================================
-- QUERY 9: All transactions for accounts 5, 6, 7 in one view
-- ============================================================================
SELECT 
    t.id,
    t.account_id,
    a.name as account_name,
    t.user_id,
    u.username as created_by,
    t.type,
    t.amount,
    t.name as transaction_name,
    t.category,
    t.date,
    t.time,
    t.created_at
FROM transactions t
LEFT JOIN accounts_account a ON t.account_id = a.id
LEFT JOIN auth_user u ON t.user_id = u.id
WHERE t.account_id IN (5, 6, 7)
ORDER BY t.account_id, t.created_at DESC;

