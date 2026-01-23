# Quick Start Guide - Shared Accounts

## 🚀 Start Server

```bash
cd cashbook-backend
python manage.py runserver
```

Server runs at: `http://127.0.0.1:8000`

---

## 📝 Step-by-Step Usage

### Step 1: Login/Register

**Register:**
```bash
POST http://127.0.0.1:8000/api/register/
Content-Type: application/json

{
  "username": "john",
  "email": "john@example.com",
  "password": "password123"
}
```

**Login:**
```bash
POST http://127.0.0.1:8000/api/token/
Content-Type: application/json

{
  "username": "john",
  "password": "password123"
}
```

**Response:**
```json
{
  "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Save the `access` token for all API calls!**

---

### Step 2: Create Shared Account (Owner)

```bash
POST http://127.0.0.1:8000/api/accounts/
Authorization: Bearer {your_access_token}
Content-Type: application/json

{
  "name": "Trip Expense",
  "type": "SHARED",
  "description": "Weekend trip expenses"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Trip Expense",
    "type": "SHARED",
    "owner": {"id": 1, "username": "john"}
  }
}
```

**Save the account `id` (e.g., `1`)**

---

### Step 3: Invite Members

```bash
POST http://127.0.0.1:8000/api/accounts/1/invite/
Authorization: Bearer {your_access_token}
Content-Type: application/json

{
  "email": "friend@example.com"
}
```

**Or invite by username:**
```json
{
  "username": "friend_username"
}
```

**Or invite by mobile:**
```json
{
  "mobile": "+1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Invitation sent",
  "data": {
    "id": 10,
    "status": "PENDING"
  }
}
```

---

### Step 4: Member Accepts Invitation

**Member logs in and checks invitations:**
```bash
GET http://127.0.0.1:8000/api/accounts/invitations/
Authorization: Bearer {member_access_token}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 10,
      "accountId": 1,
      "accountName": "Trip Expense",
      "status": "PENDING"
    }
  ]
}
```

**Member accepts:**
```bash
POST http://127.0.0.1:8000/api/accounts/invitations/10/accept/
Authorization: Bearer {member_access_token}
```

**Response:**
```json
{
  "success": true,
  "message": "Invitation accepted",
  "data": {
    "id": 10,
    "status": "ACCEPTED"
  }
}
```

---

### Step 5: Add Expenses to Shared Account

**Personal Expense (no account):**
```bash
POST http://127.0.0.1:8000/api/transactions/
Authorization: Bearer {your_access_token}
Content-Type: application/json

{
  "type": "Expense",
  "amount": 500,
  "category": "Food",
  "name": "Lunch",
  "remark": "Restaurant meal",
  "mode": "Cash",
  "date": "2024-01-15",
  "time": "13:30:00"
}
```

**Shared Account Expense:**
```bash
POST http://127.0.0.1:8000/api/transactions/
Authorization: Bearer {your_access_token}
Content-Type: application/json

{
  "type": "Expense",
  "amount": 2000,
  "category": "Transport",
  "name": "Taxi fare",
  "remark": "Shared taxi",
  "mode": "Online",
  "date": "2024-01-15",
  "time": "14:00:00",
  "accountId": 1
}
```

**Response includes:**
```json
{
  "success": true,
  "data": {
    "id": 100,
    "amount": "2000.00",
    "category": "Transport",
    "accountId": 1,
    "createdBy": {
      "id": 1,
      "username": "john"
    },
    "addedBy": {
      "id": 1,
      "username": "john"
    }
  }
}
```

---

### Step 6: View Transactions

**All transactions (personal + shared):**
```bash
GET http://127.0.0.1:8000/api/transactions/
Authorization: Bearer {your_access_token}
```

**Filter by account:**
```bash
# Personal only
GET http://127.0.0.1:8000/api/transactions/?account=personal

# Specific shared account
GET http://127.0.0.1:8000/api/transactions/?account=1
```

**Response shows:**
- All transactions you created
- All transactions from shared accounts where you're ACCEPTED member
- Each transaction shows `createdBy` / `addedBy` field

---

## 📋 Common Operations

### View Your Accounts
```bash
GET http://127.0.0.1:8000/api/accounts/
Authorization: Bearer {token}
```

### View Account Members
```bash
GET http://127.0.0.1:8000/api/accounts/1/members/
Authorization: Bearer {token}
```

### Update Member Permissions
```bash
PUT http://127.0.0.1:8000/api/accounts/1/members/10/permissions/
Authorization: Bearer {token}
Content-Type: application/json

{
  "can_add_entry": true,
  "can_edit_own_entry": true,
  "can_edit_all_entries": false,
  "can_delete_entry": false
}
```

### Edit Transaction
```bash
PUT http://127.0.0.1:8000/api/transactions/100/
Authorization: Bearer {token}
Content-Type: application/json

{
  "amount": 2500,
  "remark": "Updated amount"
}
```

### Delete Transaction
```bash
DELETE http://127.0.0.1:8000/api/transactions/100/
Authorization: Bearer {token}
```

### View Notifications
```bash
GET http://127.0.0.1:8000/api/notifications/
Authorization: Bearer {token}
```

---

## 🔑 Important Notes

1. **Always include Authorization header:**
   ```
   Authorization: Bearer {your_access_token}
   ```

2. **Personal vs Shared:**
   - Personal: Don't include `accountId` or set `accountId: null`
   - Shared: Include `accountId` with the account ID

3. **Permissions:**
   - Owner: Full access (all permissions)
   - Member: Based on assigned permissions
   - Check permissions before allowing edit/delete in UI

4. **Transaction Access:**
   - Personal: Only creator can see/edit/delete
   - Shared: All ACCEPTED members can see, edit/delete based on permissions

5. **Invitation Status:**
   - PENDING: User hasn't accepted yet
   - ACCEPTED: User can access account
   - REJECTED: User declined invitation

---

## 🎯 Complete Example Flow

```bash
# 1. Owner creates account
POST /api/accounts/ {"name": "Trip", "type": "SHARED"}
→ Account ID: 1

# 2. Owner invites friend
POST /api/accounts/1/invite/ {"email": "friend@example.com"}
→ Invitation ID: 10

# 3. Friend accepts
POST /api/accounts/invitations/10/accept/

# 4. Friend adds expense
POST /api/transactions/ {
  "type": "Expense",
  "amount": 1000,
  "category": "Food",
  "accountId": 1,
  "date": "2024-01-15",
  "time": "12:00:00"
}

# 5. Owner views all expenses
GET /api/transactions/?account=1
→ Shows expense with "addedBy": {"username": "friend"}
```

---

## 📚 Full Documentation

See `SHARED_ACCOUNTS_USAGE_GUIDE.md` for complete documentation.

---

## 🆘 Troubleshooting

**Error: "You do not have access to this account"**
→ User needs to accept invitation first

**Error: "You do not have permission to edit"**
→ Check member permissions, may need `can_edit_all_entries` for other's transactions

**Error: 404 on /api/accounts/invitations/**
→ Make sure you're logged in and have pending invitations

**Transactions not showing:**
→ Check if accountId is correct and user is ACCEPTED member

---

## ✅ Ready to Use!

Start with creating an account and inviting members. Everything else follows naturally!
