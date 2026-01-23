/**
 * Transaction Action Validation Utility
 * Validates user permissions before allowing transaction actions
 */

/**
 * Validates if user can perform a transaction action
 * @param {Object} user - User object
 * @param {string} action - Action type: 'add', 'edit', 'delete'
 * @param {Object} transaction - Transaction object (required for edit/delete to check ownership)
 * @param {string} accountId - Current account ID (null/personal for personal transactions)
 * @param {Object} accountMembership - AccountMembership object for current account (optional)
 * @param {Object} account - Account object (optional, for owner verification)
 * @returns {Object} - { valid: boolean, error: string }
 */
export function validateTransactionAction(user, action, transaction = null, accountId = null, accountMembership = null, account = null) {
  // CRITICAL: For 'add' and 'create' actions, ALWAYS ALLOW - check FIRST before anything else
  // This is the absolute first check to ensure we never block add/create actions
  if (action && (String(action).toLowerCase() === 'add' || String(action).toLowerCase() === 'create')) {
    console.log('✅ [Validation] Add/Create action detected at START - ALWAYS ALLOWING');
    return {
      valid: true,
      error: null,
    };
  }
  
  // Check if user exists
  if (!user) {
    return {
      valid: false,
      error: 'User not authenticated. Please login again.',
    };
  }

  // For personal accounts (accountId is null, 'personal', or undefined), allow all actions
  // This maintains backward compatibility with existing personal expense functionality
  if (!accountId || accountId === 'personal' || accountId === '') {
    return {
      valid: true,
      error: null,
    };
  }

  // For shared accounts, validate accountMembership
  // Check if user has accountMembership (from parameter or user object)
  const membership = accountMembership || user.accountMembership;
  
  if (!membership) {
    // No membership found - let backend verify (be lenient)
    // Backend will handle the actual authorization
    console.warn('⚠️ [Validation] No membership found. Skipping client-side validation. Backend will verify.');
    return {
      valid: true,
      error: null,
    };
  }

  // CRITICAL: For 'add' and 'create' actions, ALWAYS ALLOW - NO VALIDATION
  // This ensures we never block legitimate users - backend will handle authorization
  // Client-side validation is only for UX hints, not security
  // We completely skip all validation for add/create actions and let backend decide
  if ((action.toLowerCase() === 'add' || action.toLowerCase() === 'create')) {
    // Log for debugging
    console.log('🔍 [Validation] Add/Create action detected - SKIPPING ALL VALIDATION');
    console.log('🔍 [Validation] Membership status:', membership.status);
    console.log('🔍 [Validation] Full membership:', JSON.stringify(membership, null, 2));
    
    // ALWAYS ALLOW - No status checks, no permission checks, nothing
    // Backend is the source of truth and will verify everything
    console.log('✅ [Validation] Add/Create action - ALWAYS ALLOWING (no validation)');
    console.log('✅ [Validation] Backend will verify permissions and status');
    return {
      valid: true,
      error: null,
    };
  }

  // For other actions (edit, delete), do full validation
  // Check if status is ACCEPTED - this is the only hard check we do
  if (membership.status && membership.status !== 'ACCEPTED') {
    const statusMessages = {
      'PENDING': 'Your account membership is pending approval.',
      'REJECTED': 'Your account membership has been rejected.',
      'INVITED': 'Please accept the account invitation first.',
    };
    
    return {
      valid: false,
      error: statusMessages[membership.status] || 
             `Your account membership status is: ${membership.status}. You cannot perform this action.`,
    };
  }

  // Check if user is the account owner - owners always have all permissions
  // Account owner check: membership.role === 'OWNER' or user.id === account.ownerId
  const accountOwnerId = account?.ownerId || 
                        account?.owner?.id || 
                        membership?.account?.ownerId ||
                        membership?.account?.owner?.id;
  
  const isAccountOwner = membership.role === 'OWNER' || 
                        (accountOwnerId && user.id && String(accountOwnerId) === String(user.id)) ||
                        (membership.userId && user.id && String(membership.userId) === String(user.id) && membership.role === 'OWNER');

  // Debug logging
  console.log('🔍 [Validation] Membership object:', JSON.stringify(membership, null, 2));
  console.log('🔍 [Validation] Account object:', JSON.stringify(account, null, 2));
  console.log('🔍 [Validation] User ID:', user.id);
  console.log('🔍 [Validation] Account Owner ID:', accountOwnerId);
  console.log('🔍 [Validation] Is Account Owner:', isAccountOwner);
  console.log('🔍 [Validation] Membership role:', membership.role);

  // Get permissions - handle both nested permissions object and direct properties
  // Backend returns permissions in snake_case, frontend expects camelCase
  const permissionsObj = membership.permissions || {};
  
  // Helper function to get permission value (handles both snake_case and camelCase)
  // Returns undefined if not found (not false) so we can distinguish between "not found" and "explicitly false"
  const getPermission = (camelKey, snakeKey, defaultValue = undefined) => {
    // Check nested permissions object first (camelCase)
    if (permissionsObj[camelKey] !== undefined) {
      console.log(`✅ [Validation] Found permission ${camelKey} in permissionsObj (camelCase):`, permissionsObj[camelKey]);
      return permissionsObj[camelKey];
    }
    // Check nested permissions object (snake_case)
    if (permissionsObj[snakeKey] !== undefined) {
      console.log(`✅ [Validation] Found permission ${snakeKey} in permissionsObj (snake_case):`, permissionsObj[snakeKey]);
      return permissionsObj[snakeKey];
    }
    // Check direct properties on membership (snake_case from backend)
    if (membership[snakeKey] !== undefined) {
      console.log(`✅ [Validation] Found permission ${snakeKey} on membership (snake_case):`, membership[snakeKey]);
      return membership[snakeKey];
    }
    // Check direct properties on membership (camelCase)
    if (membership[camelKey] !== undefined) {
      console.log(`✅ [Validation] Found permission ${camelKey} on membership (camelCase):`, membership[camelKey]);
      return membership[camelKey];
    }
    console.log(`⚠️ [Validation] Permission ${camelKey}/${snakeKey} not found, returning undefined`);
    return defaultValue;
  };
  
  switch (action.toLowerCase()) {
    case 'add':
    case 'create':
      // This should never be reached due to early return above, but keep for safety
      console.log('✅ [Validation] Add/Create action - allowing');
      break;

    case 'edit':
    case 'update':
      // Owners always have permission
      if (isAccountOwner) {
        break;
      }
      // Check if user can edit all entries or owns this entry
      const canEditAll = getPermission('canEditAllEntries', 'can_edit_all_entries');
      const canEditOwn = getPermission('canEditOwnEntry', 'can_edit_own_entry');
      
      if (!canEditAll && !canEditOwn) {
        return {
          valid: false,
          error: 'You do not have permission to edit transactions in this account.',
        };
      }
      
      // If can only edit own entries, check ownership
      if (!canEditAll && canEditOwn && transaction) {
        const isOwner = transaction.created_by === user.id || 
                       transaction.user_id === user.id ||
                       transaction.user === user.id ||
                       transaction.createdBy === user.id;
        
        if (!isOwner) {
          return {
            valid: false,
            error: 'You can only edit your own transactions in this account.',
          };
        }
      }
      break;

    case 'delete':
    case 'remove':
      // Owners always have permission
      if (isAccountOwner) {
        break;
      }
      // Check permission (handles both formats)
      const canDelete = getPermission('canDeleteEntry', 'can_delete_entry');
      if (!canDelete) {
        return {
          valid: false,
          error: 'You do not have permission to delete transactions from this account.',
        };
      }
      break;

    default:
      return {
        valid: false,
        error: `Unknown action: ${action}`,
      };
  }

  // All validations passed
  return {
    valid: true,
    error: null,
  };
}

/**
 * Validates transaction action and throws error if invalid
 * @param {Object} user - User object
 * @param {string} action - Action type
 * @param {Object} transaction - Transaction object (optional)
 * @param {string} accountId - Current account ID (optional, for shared account validation)
 * @param {Object} accountMembership - AccountMembership object (optional)
 * @param {Object} account - Account object (optional, for owner verification)
 * @throws {Error} - If validation fails (NEVER for add/create actions)
 */
export function validateTransactionActionOrThrow(user, action, transaction = null, accountId = null, accountMembership = null, account = null) {
  // CRITICAL: For add/create actions, COMPLETELY BYPASS - never validate, never throw
  // This is the ABSOLUTE FIRST check - before ANY other logic, before ANY function calls
  // This ensures we never block add/create actions under any circumstances
  // Wrap the ENTIRE function in try-catch to ensure we NEVER throw for add/create actions
  
  // First, check if this is an add/create action - do this BEFORE anything else
  let isAddAction = false;
  try {
    if (action !== null && action !== undefined) {
      const actionStr = String(action);
      const actionLower = actionStr.toLowerCase().trim();
      isAddAction = (actionLower === 'add' || actionLower === 'create');
    }
  } catch (e) {
    // If we can't check the action, assume it might be add and allow it (fail open)
    console.log('⚠️ [validateTransactionActionOrThrow] Could not check action, allowing by default');
    return;
  }
  
  // If it's an add/create action, return immediately - NEVER validate, NEVER throw
  if (isAddAction) {
    console.log('✅ [validateTransactionActionOrThrow] Add/Create action detected - COMPLETELY BYPASSING');
    console.log('✅ [validateTransactionActionOrThrow] Returning immediately - no validation, no errors, no exceptions');
    return; // Just return immediately, don't do ANYTHING else
  }
  
  // Only validate for other actions (edit, delete) - wrap in try-catch as extra safety
  try {
    console.log('🔍 [validateTransactionActionOrThrow] Starting validation for non-add action');
    console.log('🔍 [validateTransactionActionOrThrow] Action:', action);
    console.log('🔍 [validateTransactionActionOrThrow] AccountId:', accountId);
    console.log('🔍 [validateTransactionActionOrThrow] Membership:', accountMembership);
    
    const validation = validateTransactionAction(user, action, transaction, accountId, accountMembership, account);
    
    console.log('🔍 [validateTransactionActionOrThrow] Validation result:', validation);
    
    if (!validation.valid) {
      console.error('❌ [validateTransactionActionOrThrow] Validation failed:', validation.error);
      const error = new Error(validation.error);
      error.validationError = true;
      throw error;
    }
    
    console.log('✅ [validateTransactionActionOrThrow] Validation passed');
  } catch (e) {
    // Final safety net - if somehow an add action got here, don't throw
    // This should never happen, but we're being extra safe
    if (isAddAction) {
      console.log('⚠️ [validateTransactionActionOrThrow] Add action caught in error handler, allowing');
      return;
    }
    // For non-add actions, re-throw the error
    throw e;
  }
}

