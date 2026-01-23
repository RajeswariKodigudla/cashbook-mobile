# Shared Accounts Usage Guide

Complete guide on how to use the shared account system for group expenses.

## 📋 Table of Contents
1. [Quick Start](#quick-start)
2. [Account Owner Flow](#account-owner-flow)
3. [Member Flow](#member-flow)
4. [API Examples](#api-examples)
5. [Permission Management](#permission-management)
6. [Common Scenarios](#common-scenarios)

---

## 🚀 Quick Start

### Step 1: Start the Server
```bash
cd cashbook-backend
python manage.py runserver
```

### Step 2: Login/Register
- Register: `POST /api/register/`
- Login: `POST /api/token/` (get JWT token)

---

## 👤 Account Owner Flow

### 1. Create a Shared Account

**Request:**
```bash
POST /api/accounts/
Authorization: Bearer {your_jwt_token}
Content-Type: application/json

{
  "name": "Trip Expense",
  "type": "SHARED",
  "description": "Expenses for our weekend trip"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Account created successfully",
  "data": {
    "id": 1,
    "name": "Trip Expense",
    "type": "SHARED",
    "owner": {
      "id": 1,
      "username": "john_doe"
    },
    "member_count": 1,
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

**What happens:**
- Account is created with you as owner
- You automatically become an ACCEPTED member
- You get full permissions

---

### 2. Invite Members

**Invite by Email:**
```bash
POST /api/accounts/1/invite/
Authorization: Bearer {your_jwt_token}
Content-Type: application/json

{
  "email": "friend@example.com",
  "permissions": {
    "can_add_entry": true,
    "can_edit_own_entry": true,
    "can_edit_all_entries": false,
    "can_delete_entry": false,
    "can_view_reports": true,
    "can_manage_members": false
  }
}
```

**Invite by Username:**
```bash
POST /api/accounts/1/invite/
{
  "username": "friend_username"
}
```

**Invite by Mobile Number:**
```bash
POST /api/accounts/1/invite/
{
  "mobile": "+1234567890"
}
```

**Invite by User ID:**
```bash
POST /api/accounts/1/invite/
{
  "user_id": 5
}
```

**Response:**
```json
{
  "success": true,
  "message": "Invitation sent",
  "data": {
    "id": 10,
    "user": {
      "id": 5,
      "username": "friend_username"
    },
    "status": "PENDING",
    "invited_at": "2024-01-15T10:35:00Z"
  }
}
```

**What happens:**
- Invitation created with status PENDING
- Invited user receives notification
- User must accept invitation to gain access

---

### 3. View Account Members

```bash
GET /api/accounts/1/members/
Authorization: Bearer {your_jwt_token}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "user": {
        "id": 1,
        "username": "john_doe"
      },
      "status": "ACCEPTED",
      "permissions": {
        "can_add_entry": true,
        "can_edit_own_entry": true,
        "can_edit_all_entries": true,
        "can_delete_entry": true,
        "can_view_reports": true,
        "can_manage_members": true
      }
    },
    {
      "id": 10,
      "user": {
        "id": 5,
        "username": "friend_username"
      },
      "status": "PENDING",
      "permissions": {...}
    }
  ],
  "count": 2
}
```

---

### 4. Update Member Permissions

```bash
PUT /api/accounts/1/members/10/permissions/
Authorization: Bearer {your_jwt_token}
Content-Type: application/json

{
  "can_add_entry": true,
  "can_edit_own_entry": true,
  "can_edit_all_entries": true,
  "can_delete_entry": true,
  "can_view_reports": true,
  "can_manage_members": false
}
```

---

### 5. Remove a Member

```bash
DELETE /api/accounts/1/members/10/
Authorization: Bearer {your_jwt_token}
```

---

## 👥 Member Flow

### 1. View Pending Invitations

When a user logs in, they can see pending invitations:

```bash
GET /api/accounts/invitations/
Authorization: Bearer {member_jwt_token}
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
      "user": {
        "id": 5,
        "username": "friend_username"
      },
      "status": "PENDING",
      "invitedBy": 1,
      "invited_at": "2024-01-15T10:35:00Z",
      "permissions": {...}
    }
  ],
  "count": 1
}
```

---

### 2. Accept Invitation

```bash
POST /api/accounts/invitations/10/accept/
Authorization: Bearer {member_jwt_token}
```

**Response:**
```json
{
  "success": true,
  "message": "Invitation accepted",
  "data": {
    "id": 10,
    "status": "ACCEPTED",
    "accepted_at": "2024-01-15T11:00:00Z"
  }
}
```

**What happens:**
- Status changes from PENDING to ACCEPTED
- User can now access the account
- Owner receives notification

---

### 3. Reject Invitation

```bash
POST /api/accounts/invitations/10/reject/
Authorization: Bearer {member_jwt_token}
```

---

## 💰 Transaction Management

### 1. Add Transaction to Shared Account

**Personal Transaction (no account):**
```bash
POST /api/transactions/
Authorization: Bearer {your_jwt_token}
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

**Shared Account Transaction:**
```bash
POST /api/transactions/
Authorization: Bearer {your_jwt_token}
Content-Type: application/json

{
  "type": "Expense",
  "amount": 2000,
  "category": "Transport",
  "name": "Taxi to hotel",
  "remark": "Shared taxi fare",
  "mode": "Online",
  "date": "2024-01-15",
  "time": "14:00:00",
  "accountId": 1
}
```

**Response:**
```json
{
  "success": true,
  "message": "Transaction created successfully",
  "data": {
    "id": 100,
    "type": "Expense",
    "amount": "2000.00",
    "category": "Transport",
    "name": "Taxi to hotel",
    "remark": "Shared taxi fare",
    "accountId": 1,
    "createdBy": {
      "id": 5,
      "username": "friend_username"
    },
    "addedBy": {
      "id": 5,
      "username": "friend_username"
    },
    "date": "2024-01-15",
    "time": "14:00:00"
  },
  "transactions": [...]
}
```

**What happens:**
- Transaction is linked to account
- All ACCEPTED members receive notification
- Transaction shows "Added by" information

---

### 2. View Transactions

**All Transactions (Personal + Shared):**
```bash
GET /api/transactions/
Authorization: Bearer {your_jwt_token}
```

**Filter by Account:**
```bash
# Personal transactions only
GET /api/transactions/?account=personal

# Specific shared account
GET /api/transactions/?account=1
```

**Response includes:**
- Personal transactions (accountId: null)
- Shared account transactions where user is ACCEPTED member
- Each transaction shows `createdBy` / `addedBy` field

---

### 3. Edit Transaction

**Edit Your Own Transaction:**
```bash
PUT /api/transactions/100/
Authorization: Bearer {your_jwt_token}
Content-Type: application/json

{
  "amount": 2500,
  "remark": "Updated: Taxi + tip"
}
```

**Edit Other Member's Transaction:**
- Requires `can_edit_all_entries` permission
- If you don't have permission, you'll get:
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "permission": ["You do not have permission to edit other members' entries"]
  }
}
```

---

### 4. Delete Transaction

```bash
DELETE /api/transactions/100/
Authorization: Bearer {your_jwt_token}
```

**Requires:**
- `can_delete_entry` permission for shared accounts
- Always allowed for personal transactions

---

## 🔐 Permission Management

### Permission Types

1. **can_add_entry** - Add new transactions
2. **can_edit_own_entry** - Edit transactions you created
3. **can_edit_all_entries** - Edit any member's transactions
4. **can_delete_entry** - Delete transactions
5. **can_view_reports** - View account reports
6. **can_manage_members** - Invite/remove members, update permissions

### Default Permissions

**Owner:**
- All permissions: `true`

**New Member (Default):**
- `can_add_entry`: `true`
- `can_edit_own_entry`: `true`
- `can_edit_all_entries`: `false`
- `can_delete_entry`: `false`
- `can_view_reports`: `true`
- `can_manage_members`: `false`

---

## 📱 Common Scenarios

### Scenario 1: Trip Expense Account

**Step 1: Owner creates account**
```bash
POST /api/accounts/
{
  "name": "Weekend Trip",
  "type": "SHARED"
}
```

**Step 2: Owner invites friends**
```bash
POST /api/accounts/1/invite/ {"email": "friend1@example.com"}
POST /api/accounts/1/invite/ {"email": "friend2@example.com"}
```

**Step 3: Friends accept invitations**
```bash
# Friend 1
POST /api/accounts/invitations/10/accept/

# Friend 2
POST /api/accounts/invitations/11/accept/
```

**Step 4: Members add expenses**
```bash
# Friend 1 adds expense
POST /api/transactions/
{
  "type": "Expense",
  "amount": 500,
  "category": "Food",
  "accountId": 1,
  "date": "2024-01-15",
  "time": "12:00:00"
}

# Friend 2 adds expense
POST /api/transactions/
{
  "type": "Expense",
  "amount": 1000,
  "category": "Transport",
  "accountId": 1,
  "date": "2024-01-15",
  "time": "13:00:00"
}
```

**Step 5: View all trip expenses**
```bash
GET /api/transactions/?account=1
```

**Response shows:**
- All expenses added by any member
- Each expense shows who added it (`createdBy`)
- All members can see all expenses

---

### Scenario 2: Household Expenses

**Owner creates account:**
```bash
POST /api/accounts/
{
  "name": "Household Expenses",
  "type": "SHARED",
  "description": "Monthly household bills and groceries"
}
```

**Owner invites family members with specific permissions:**
```bash
# Family member 1 - Can add and edit own entries
POST /api/accounts/2/invite/
{
  "email": "spouse@example.com",
  "permissions": {
    "can_add_entry": true,
    "can_edit_own_entry": true,
    "can_edit_all_entries": false,
    "can_delete_entry": false
  }
}

# Family member 2 - Can add but not edit
POST /api/accounts/2/invite/
{
  "email": "child@example.com",
  "permissions": {
    "can_add_entry": true,
    "can_edit_own_entry": false,
    "can_edit_all_entries": false,
    "can_delete_entry": false
  }
}
```

---

## 🔍 Viewing Accounts

### List All Your Accounts

```bash
GET /api/accounts/
Authorization: Bearer {your_jwt_token}
```

**Returns:**
- Accounts you own
- Accounts where you're an ACCEPTED member

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Trip Expense",
      "type": "SHARED",
      "owner": {
        "id": 1,
        "username": "john_doe"
      },
      "member_count": 3,
      "current_user_membership": {
        "status": "ACCEPTED",
        "can_add_entry": true,
        ...
      }
    }
  ]
}
```

---

## 📊 Notifications

### View Notifications

```bash
GET /api/notifications/
Authorization: Bearer {your_jwt_token}
```

**Filter by account:**
```bash
GET /api/notifications/?account=1
```

**Filter by type:**
```bash
GET /api/notifications/?type=INVITATION
GET /api/notifications/?type=TRANSACTION_ADDED
```

**Filter by read status:**
```bash
GET /api/notifications/?read=false  # Unread only
GET /api/notifications/?read=true   # Read only
```

### Mark as Read

```bash
PUT /api/notifications/5/read/
{
  "read": true
}
```

### Unread Count

```bash
GET /api/notifications/unread-count/
```

---

## 🛡️ Security & Access Control

### Access Rules

1. **Personal Transactions:**
   - Only the creator can view/edit/delete
   - No account required

2. **Shared Account Transactions:**
   - Only ACCEPTED members can view
   - Permissions control edit/delete access
   - Owner always has full access

3. **Account Access:**
   - Only owner and ACCEPTED members can access
   - PENDING members cannot view transactions
   - REJECTED members have no access

---

## ⚠️ Error Handling

### Common Errors

**1. Not a member:**
```json
{
  "success": false,
  "message": "You do not have access to this account. Please accept the invitation first."
}
```

**2. No permission:**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "permission": ["You do not have permission to edit other members' entries"]
  }
}
```

**3. Account not found:**
```json
{
  "success": false,
  "message": "Account not found"
}
```

---

## 🎯 Best Practices

1. **Always check permissions** before allowing actions in UI
2. **Show clear error messages** when permissions are denied
3. **Display "Added by"** information for shared transactions
4. **Notify members** when transactions are added/edited
5. **Filter transactions** by account to show relevant data
6. **Handle invitation status** properly (PENDING → ACCEPTED)

---

## 📝 Complete Example Flow

```bash
# 1. Owner creates account
POST /api/accounts/
{"name": "Group Project", "type": "SHARED"}

# 2. Owner invites member
POST /api/accounts/1/invite/
{"email": "member@example.com"}

# 3. Member accepts invitation
POST /api/accounts/invitations/10/accept/

# 4. Member adds expense
POST /api/transactions/
{
  "type": "Expense",
  "amount": 1000,
  "category": "Supplies",
  "accountId": 1,
  "date": "2024-01-15",
  "time": "10:00:00"
}

# 5. Owner views all expenses
GET /api/transactions/?account=1

# 6. Owner edits member's expense (if has permission)
PUT /api/transactions/100/
{"amount": 1200}

# 7. View account members
GET /api/accounts/1/members/
```

---

## 🔗 API Endpoints Summary

### Accounts
- `GET /api/accounts/` - List accounts
- `POST /api/accounts/` - Create account
- `GET /api/accounts/{id}/` - Get account details
- `PUT /api/accounts/{id}/` - Update account
- `DELETE /api/accounts/{id}/` - Delete account
- `GET /api/accounts/{id}/members/` - List members
- `POST /api/accounts/{id}/invite/` - Invite member
- `PUT /api/accounts/{id}/members/{member_id}/permissions/` - Update permissions
- `DELETE /api/accounts/{id}/members/{member_id}/` - Remove member

### Invitations
- `GET /api/accounts/invitations/` - List pending invitations
- `POST /api/accounts/invitations/{id}/accept/` - Accept invitation
- `POST /api/accounts/invitations/{id}/reject/` - Reject invitation

### Transactions
- `GET /api/transactions/` - List transactions (all accounts)
- `GET /api/transactions/?account={id}` - Filter by account
- `POST /api/transactions/` - Create transaction
- `PUT /api/transactions/{id}/` - Update transaction
- `DELETE /api/transactions/{id}/` - Delete transaction

### Notifications
- `GET /api/notifications/` - List notifications
- `GET /api/notifications/{id}/` - Get notification
- `PUT /api/notifications/{id}/read/` - Mark as read
- `PUT /api/notifications/mark-all-read/` - Mark all as read
- `GET /api/notifications/unread-count/` - Get unread count

---

## 🚀 Ready to Use!

The system is fully functional and production-ready. Start by creating a shared account and inviting members!

