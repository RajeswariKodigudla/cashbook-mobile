# PostgreSQL Connection Guide

## Connection Information

- **Host:** `dpg-d5giqe6r433s73dn7ptg-a.oregon-postgres.render.com`
- **Database:** `cashbook_os9o`
- **Port:** `5432`
- **User:** `cashbook`
- **Password:** (Check your Django settings or Render dashboard)

## Method 1: Using psql (Command Line)

### Windows PowerShell:
```powershell
# Install PostgreSQL client if not installed
# Download from: https://www.postgresql.org/download/windows/

# Connect to database
psql -h dpg-d5giqe6r433s73dn7ptg-a.oregon-postgres.render.com -U cashbook -d cashbook_os9o -p 5432
```

### After connecting, run queries:
```sql
-- List all tables
\dt

-- View transactions
SELECT * FROM transactions_transaction LIMIT 10;

-- View accounts
SELECT * FROM accounts_account;

-- Exit
\q
```

## Method 2: Using pgAdmin

1. **Download pgAdmin:** https://www.pgadmin.org/download/
2. **Add Server:**
   - Right-click "Servers" → "Create" → "Server"
   - **General Tab:**
     - Name: `Cashbook Production`
   - **Connection Tab:**
     - Host: `dpg-d5giqe6r433s73dn7ptg-a.oregon-postgres.render.com`
     - Port: `5432`
     - Database: `cashbook_os9o`
     - Username: `cashbook`
     - Password: (your password)
   - Click "Save"

3. **Run Queries:**
   - Right-click database → "Query Tool"
   - Copy queries from `verify_transactions_sql.sql`
   - Execute (F5)

## Method 3: Using DBeaver

1. **Download DBeaver:** https://dbeaver.io/download/
2. **Create Connection:**
   - Click "New Database Connection"
   - Select "PostgreSQL"
   - **Main Tab:**
     - Host: `dpg-d5giqe6r433s73dn7ptg-a.oregon-postgres.render.com`
     - Port: `5432`
     - Database: `cashbook_os9o`
     - Username: `cashbook`
     - Password: (your password)
   - Click "Test Connection"
   - Click "Finish"

3. **Run Queries:**
   - Right-click database → "SQL Editor" → "New SQL Script"
   - Copy queries from `verify_transactions_sql.sql`
   - Execute (Ctrl+Enter)

## Method 4: Using Django Management Command (Easiest)

```bash
cd cashbook-backend
python manage.py verify_transactions
python manage.py verify_transactions --account-id 7 --detailed
```

## Quick Queries to Check Transactions

### View all transactions in account 7:
```sql
SELECT 
    t.id,
    t.user_id,
    u.username as created_by,
    t.account_id,
    t.type,
    t.amount,
    t.name,
    t.category,
    t.date,
    t.created_at
FROM transactions_transaction t
LEFT JOIN auth_user u ON t.user_id = u.id
WHERE t.account_id = 7
ORDER BY t.created_at DESC;
```

### Count transactions by account:
```sql
SELECT 
    a.id as account_id,
    a.name as account_name,
    COUNT(t.id) as transaction_count
FROM accounts_account a
LEFT JOIN transactions_transaction t ON a.id = t.account_id
GROUP BY a.id, a.name
ORDER BY transaction_count DESC;
```

### Check account members:
```sql
SELECT 
    a.id as account_id,
    a.name as account_name,
    u.username,
    am.status
FROM accounts_account a
JOIN accounts_accountmember am ON a.id = am.account_id
JOIN auth_user u ON am.user_id = u.id
WHERE a.id = 7;
```

## Table Names Reference

Django creates tables with format: `appname_modelname`

- `transactions_transaction` - All transactions
- `accounts_account` - All accounts
- `accounts_accountmember` - Account memberships
- `auth_user` - Django users
- `notifications_notification` - Notifications

## Troubleshooting

### Connection Refused:
- Check if database is running on Render
- Verify firewall settings
- Check connection string in Django settings

### Authentication Failed:
- Verify username and password
- Check if user has proper permissions

### Table Not Found:
- Verify table name (use `\dt` in psql to list tables)
- Check if migrations have been run: `python manage.py migrate`

