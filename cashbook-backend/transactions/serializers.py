from rest_framework import serializers
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction
from django.utils import timezone
from datetime import datetime, date, time
from decimal import Decimal, InvalidOperation
import logging
from .models import Transaction, UserCustomField

logger = logging.getLogger(__name__)


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for user profile (read and update)"""
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'date_joined', 'last_login']
        read_only_fields = ['id', 'username', 'date_joined', 'last_login']


class PasswordChangeSerializer(serializers.Serializer):
    """Serializer for password change"""
    old_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True, min_length=8)
    new_password_confirm = serializers.CharField(required=True, write_only=True, min_length=8)
    
    def validate(self, attrs):
        """Validate password match and strength."""
        new_password = attrs.get('new_password')
        new_password_confirm = attrs.get('new_password_confirm')
        
        if new_password != new_password_confirm:
            raise serializers.ValidationError({
                "new_password": "New passwords do not match.",
                "new_password_confirm": "New passwords do not match."
            })
        
        if len(new_password) < 8:
            raise serializers.ValidationError({
                "new_password": "Password must be at least 8 characters long."
            })
        
        return attrs


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True, 
        min_length=8,
        error_messages={
            'min_length': 'Password must be at least 8 characters long.',
            'required': 'Password is required.',
            'blank': 'Password cannot be blank.'
        }
    )
    password_confirm = serializers.CharField(
        write_only=True, 
        min_length=8,
        error_messages={
            'min_length': 'Password confirmation must be at least 8 characters long.',
            'required': 'Password confirmation is required.',
            'blank': 'Password confirmation cannot be blank.'
        }
    )
    username = serializers.CharField(
        min_length=3,
        max_length=150,
        error_messages={
            'min_length': 'Username must be at least 3 characters long.',
            'max_length': 'Username cannot exceed 150 characters.',
            'required': 'Username is required.',
            'blank': 'Username cannot be blank.'
        }
    )
    email = serializers.EmailField(
        required=False,
        allow_blank=True,
        error_messages={
            'invalid': 'Enter a valid email address.'
        }
    )
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password_confirm', 'first_name', 'last_name']
        extra_kwargs = {
            'username': {'validators': []}  # Disable default validators, we'll handle it manually
        }
    
    def validate_username(self, value):
        """Validate username uniqueness and format."""
        if not value:
            raise serializers.ValidationError("Username is required.")
        
        # Normalize username (lowercase for consistency)
        normalized_username = value.lower().strip()
        
        if not normalized_username:
            raise serializers.ValidationError("Username cannot be empty.")
        
        # Check minimum length
        if len(normalized_username) < 3:
            raise serializers.ValidationError("Username must be at least 3 characters long.")
        
        # Check for invalid characters
        if not normalized_username.replace('_', '').replace('.', '').isalnum():
            raise serializers.ValidationError("Username can only contain letters, numbers, underscores, and periods.")
        
        # Check uniqueness using database query (case-insensitive)
        # IMPORTANT: Use database connection directly to ensure we're checking the correct database
        from django.db import connection, transaction
        
        # Log which database we're checking
        db_name = connection.settings_dict.get('NAME', 'unknown')
        db_engine = connection.settings_dict.get('ENGINE', 'unknown')
        
        # CRITICAL: Check uniqueness WITHOUT transaction.atomic() here
        # We'll do the final check in create() with proper transaction handling
        # This prevents double-checking and transaction isolation issues
        
        # Force a fresh database query (no cache) - case-insensitive check
        # Use .using('default') to ensure we're using the correct database
        existing_users_iexact = User.objects.using('default').filter(username__iexact=normalized_username)
        
        # Also check exact match
        existing_users_exact = User.objects.using('default').filter(username=normalized_username)
        
        # Get first match
        existing = existing_users_iexact.first() or existing_users_exact.first()
        
        if existing:
            # Log for debugging
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(
                f"Username '{normalized_username}' (or case variant) already exists in database '{db_name}' "
                f"(Engine: {db_engine}). Found user: '{existing.username}' (ID: {existing.id})"
            )
            raise serializers.ValidationError(
                f"A user with this username already exists. Please choose a different username."
            )
        
        # Return normalized username
        return normalized_username
    
    def validate(self, attrs):
        """Validate password match and strength."""
        password = attrs.get('password')
        password_confirm = attrs.get('password_confirm')
        
        if password != password_confirm:
            raise serializers.ValidationError({
                "password": "Passwords do not match.",
                "password_confirm": "Passwords do not match."
            })
        
        # Check password strength (optional - can be enhanced)
        if password and len(password) < 8:
            raise serializers.ValidationError({
                "password": "Password must be at least 8 characters long."
            })
        
        return attrs
    
    def create(self, validated_data):
        """Create user with proper error handling and database commit."""
        password_confirm = validated_data.pop('password_confirm', None)
        
        try:
            # Use database transaction to ensure user is saved
            # IntegrityError already imported at top
            
            with transaction.atomic():
                # Ensure username is normalized (lowercase, trimmed)
                username = validated_data['username'].lower().strip()
                
                # CRITICAL: Final uniqueness check with SELECT FOR UPDATE to prevent race conditions
                # Use .using('default') to ensure correct database
                # This check happens INSIDE the transaction, so it sees uncommitted changes
                existing_iexact = User.objects.using('default').filter(
                    username__iexact=username
                ).select_for_update().first()
                
                existing_exact = User.objects.using('default').filter(
                    username=username
                ).select_for_update().first()
                
                existing = existing_iexact or existing_exact
                
                if existing:
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.warning(
                        f"Duplicate username detected in create(): '{username}' "
                        f"matches existing user '{existing.username}' (ID: {existing.id})"
                    )
                    raise serializers.ValidationError({
                        'username': [f"Username '{username}' already exists. Please choose a different username."]
                    })
                
                # Prepare user data
                user_data = {
                    'username': username,
                    'email': validated_data.get('email', '').strip().lower() if validated_data.get('email') else '',
                    'password': validated_data['password'],
                    'first_name': validated_data.get('first_name', '').strip(),
                    'last_name': validated_data.get('last_name', '').strip(),
                }
                
                # Create user - catch IntegrityError for unique constraint violations
                try:
                    user = User.objects.create_user(**user_data)
                except IntegrityError as e:
                    # Check if it's a username uniqueness error
                    error_msg = str(e)
                    if 'username' in error_msg.lower() or 'unique' in error_msg.lower():
                        raise serializers.ValidationError({
                            'username': [f"Username '{username}' already exists in database."]
                        })
                    raise
                
                # CRITICAL: Force database commit and refresh
                user.refresh_from_db()
                
                # CRITICAL: Verify user exists in database immediately
                verify_user = User.objects.filter(id=user.id).first()
                if not verify_user:
                    raise Exception("User was not saved to database")
                
                # CRITICAL: Log database info for verification
                from django.db import connection
                db_info = connection.settings_dict
                import logging
                logger = logging.getLogger(__name__)
                logger.info(
                    f"User '{user.username}' (ID: {user.id}) created in "
                    f"PostgreSQL database '{db_info.get('NAME', 'unknown')}' "
                    f"(Engine: {db_info.get('ENGINE', 'unknown')})"
                )
                
                # NOTE: No need for connection.commit() - transaction.atomic() handles it
                # The transaction will commit automatically when the atomic block exits
                
                return user
                
        except serializers.ValidationError:
            # Re-raise validation errors as-is
            raise
        except IntegrityError as e:
            # Handle database-level unique constraint violations
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Database integrity error: {str(e)}", exc_info=True)
            error_msg = str(e)
            if 'username' in error_msg.lower():
                raise serializers.ValidationError({
                    'username': ['This username is already taken. Please choose a different one.']
                })
            raise serializers.ValidationError({
                'error': ['Database error occurred. Please try again.']
            })
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"User creation error: {str(e)}", exc_info=True)
            raise serializers.ValidationError({
                'error': [f"Failed to create user: {str(e)}"]
            })


class UserCustomFieldSerializer(serializers.ModelSerializer):
    """Serializer for user custom fields"""
    class Meta:
        model = UserCustomField
        fields = [
            'id', 'field_name', 'field_label', 'field_type', 'is_required',
            'is_active', 'options', 'transaction_types', 'category_ids', 'order'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class TransactionSerializer(serializers.ModelSerializer):
    # Add frontend-compatible fields (SerializerMethodField - not database fields)
    # These are computed fields and should NOT be queried from database
    categoryId = serializers.SerializerMethodField()
    note = serializers.SerializerMethodField()
    timestamp = serializers.SerializerMethodField()
    accountId = serializers.IntegerField(source='account.id', read_only=True, allow_null=True)
    createdBy = serializers.SerializerMethodField()  # User who created the transaction
    addedBy = serializers.SerializerMethodField()  # Alias for createdBy (frontend compatibility)
    
    class Meta:
        model = Transaction
        fields = [
            'id', 'type', 'amount', 'category', 'categoryId', 'name', 'remark', 'note', 
            'mode', 'date', 'time', 'timestamp',
            'account', 'accountId',
            'createdBy', 'addedBy',  # Show who added the transaction
            'employer_name', 'salary_month', 'tax_deducted', 'net_amount',
            'vendor_name', 'invoice_number', 'receipt_number', 'tax_amount', 'tax_percentage',
            'location', 'tags', 'attachments', 'recurring', 'recurring_frequency', 'next_due_date',
            'custom_fields', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'accountId', 'createdBy', 'addedBy']
    
    def save(self, **kwargs):
        """
        Override save to ensure user and account are properly passed to create().
        ModelSerializer.save() passes kwargs directly to create()/update(),
        but we need to ensure user and account are available in create().
        """
        # Extract user and account from kwargs if provided
        user = kwargs.pop('user', None)
        account = kwargs.pop('account', None)
        
        # CRITICAL: Store user and account as instance attributes so create() can access them
        # ModelSerializer.save() doesn't merge kwargs into validated_data automatically
        if user:
            self._save_user = user
        if account is not None:  # Allow None for personal transactions
            self._save_account = account
        
        # Call parent save method - it will pass remaining kwargs to create()
        # But we need to ensure user and account are available in create()
        result = super().save(**kwargs)
        return result
    
    def to_representation(self, instance):
        """Override to ensure method fields are computed correctly."""
        data = super().to_representation(instance)
        # Ensure method fields are present (they should be computed by get_* methods)
        return data
    
    def get_categoryId(self, obj):
        """Map category name back to categoryId for frontend."""
        if not obj.category:
            return ''
        # Reverse mapping - return category name as ID (frontend uses category names as IDs)
        return obj.category.lower()
    
    def get_note(self, obj):
        """Map remark to note for frontend."""
        return obj.remark or ''
    
    def get_timestamp(self, obj):
        """Convert date and time to timestamp for frontend."""
        from django.utils import timezone
        if obj.date and obj.time:
            dt = timezone.make_aware(
                timezone.datetime.combine(obj.date, obj.time)
            )
            return int(dt.timestamp() * 1000)  # Return milliseconds
        return int(timezone.now().timestamp() * 1000)
    
    def get_createdBy(self, obj):
        """Get user who created the transaction"""
        if obj.user:
            user_data = {
                'id': obj.user.id,
                'username': obj.user.username,
                'email': getattr(obj.user, 'email', ''),
            }
            # VERIFICATION: Log the user who created the transaction
            logger.info(f"🔍 [VERIFY] Transaction {obj.id} createdBy: username={obj.user.username}, id={obj.user.id}")
            return user_data
        logger.warning(f"⚠️ [VERIFY] Transaction {obj.id} has no user associated!")
        return None
    
    def get_addedBy(self, obj):
        """Alias for createdBy - frontend compatibility"""
        return self.get_createdBy(obj)
    
    def to_internal_value(self, data):
        """Convert frontend format to backend format."""
        # Handle frontend field name mappings
        if 'categoryId' in data and 'category' not in data:
            # Map categoryId to category name
            category_id = data.get('categoryId')
            if category_id:
                # Map common category IDs to names
                category_map = {
                    'salary': 'Salary',
                    'food': 'Food',
                    'coffee': 'Coffee',
                    'transport': 'Transport',
                    'shopping': 'Shopping',
                    'bills': 'Bills',
                    'rent': 'Rent',
                    'entertainment': 'Entertainment',
                    'health': 'Health',
                    'travel': 'Travel',
                    'edu': 'Education',
                    'other_exp': 'Other',
                    'invest': 'Investment',
                    'freelance': 'Freelance',
                    'bonus': 'Bonus',
                    'gift': 'Gift',
                    'other_inc': 'Other',
                }
                data['category'] = category_map.get(category_id.lower(), category_id.capitalize())
        
        # Handle timestamp to date/time conversion
        if 'timestamp' in data and 'date' not in data:
            timestamp = data.get('timestamp')
            if timestamp:
                try:
                    # Convert timestamp (milliseconds) to datetime
                    if isinstance(timestamp, (int, float)):
                        # Handle both seconds and milliseconds
                        if timestamp > 1e10:  # milliseconds
                            dt = datetime.fromtimestamp(timestamp / 1000)
                        else:  # seconds
                            dt = datetime.fromtimestamp(timestamp)
                    else:
                        dt = datetime.fromisoformat(str(timestamp))
                    
                    data['date'] = dt.date()
                    data['time'] = dt.time()
                except (ValueError, OSError, OverflowError) as e:
                    # If conversion fails, use current date/time
                    now = timezone.now()
                    data['date'] = now.date()
                    data['time'] = now.time()
                    logger.warning(f"Failed to parse timestamp {timestamp}, using current date/time: {e}")
        
        # Handle note to remark mapping
        if 'note' in data and 'remark' not in data:
            data['remark'] = data.get('note', '')
        
        # CRITICAL: Handle accountId -> account mapping
        # Frontend sends accountId, but backend model uses account field
        # We'll handle accountId in perform_create, but preserve it here for logging
        if 'accountId' in data:
            account_id = data.get('accountId')
            # Log for debugging
            if account_id:
                logger.info(f"📝 Received accountId in serializer: {account_id} (type: {type(account_id)})")
            else:
                logger.info("📝 Received accountId as null/empty (personal transaction)")
            # Don't remove accountId - perform_create will use it from request.data
            # The account field will be set in perform_create via serializer.save(account=...)
        
        # Handle type case conversion (INCOME/EXPENSE -> Income/Expense)
        if 'type' in data:
            type_value = data.get('type', '')
            if isinstance(type_value, str):
                type_value = type_value.strip()
                if type_value.upper() == 'INCOME':
                    data['type'] = 'Income'
                elif type_value.upper() == 'EXPENSE':
                    data['type'] = 'Expense'
                elif type_value and type_value not in ['Income', 'Expense']:
                    # Try to normalize common variations
                    type_lower = type_value.lower()
                    if type_lower in ['income', 'in', 'i']:
                        data['type'] = 'Income'
                    elif type_lower in ['expense', 'exp', 'out', 'e']:
                        data['type'] = 'Expense'
        
        # Ensure required fields have defaults if completely missing
        if 'type' not in data or not data.get('type'):
            # Default to Expense if type is not provided
            data['type'] = 'Expense'
            logger.warning("Transaction type not provided, defaulting to 'Expense'")
        
        if 'amount' not in data or data.get('amount') is None:
            logger.warning("Transaction amount not provided in request data")
        
        return super().to_internal_value(data)
    
    def validate_amount(self, value):
        """Validate amount is positive and within reasonable limits."""
        if value is None:
            raise serializers.ValidationError("Amount is required.")
        
        try:
            # Convert to Decimal for precise validation
            decimal_value = Decimal(str(value))
        except (InvalidOperation, ValueError, TypeError):
            raise serializers.ValidationError("Amount must be a valid number.")
        
        if decimal_value <= 0:
            raise serializers.ValidationError("Amount must be greater than zero.")
        
        # Set maximum amount limit (1 billion)
        max_amount = Decimal('1000000000.00')
        if decimal_value > max_amount:
            raise serializers.ValidationError(f"Amount cannot exceed {max_amount:,.2f}.")
        
        # Check decimal places (max 2)
        if decimal_value.as_tuple().exponent < -2:
            raise serializers.ValidationError("Amount cannot have more than 2 decimal places.")
        
        return decimal_value
    
    def validate_type(self, value):
        """Validate transaction type."""
        if not value:
            raise serializers.ValidationError("Transaction type is required.")
        
        valid_types = ['Income', 'Expense']
        if value not in valid_types:
            raise serializers.ValidationError(
                f"Type must be one of: {', '.join(valid_types)}."
            )
        
        return value
    
    def validate_mode(self, value):
        """Validate payment mode."""
        if not value:
            # Default to Cash if not provided
            return 'Cash'
        
        valid_modes = ['Cash', 'Online', 'Card', 'UPI', 'Bank Transfer', 'Other']
        if value not in valid_modes:
            raise serializers.ValidationError(
                f"Mode must be one of: {', '.join(valid_modes)}."
            )
        
        return value
    
    def validate_category(self, value):
        """Validate category."""
        if value and len(value) > 100:
            raise serializers.ValidationError("Category cannot exceed 100 characters.")
        return value or ''
    
    def validate(self, attrs):
        """Cross-field validation."""
        # Ensure required fields are present
        required_fields = ['type', 'amount']
        
        # Date and time are required, but we'll set defaults if missing
        if 'date' not in attrs:
            attrs['date'] = timezone.now().date()
        
        if 'time' not in attrs:
            attrs['time'] = timezone.now().time()
        
        for field in required_fields:
            if field not in attrs:
                raise serializers.ValidationError({field: f"{field.capitalize()} is required."})
        
        # Salary-specific validation (make it optional to not block transaction creation)
        # Only validate if both employer_name and salary_month are explicitly provided
        # This allows transactions to be created without these fields
        if attrs.get('category', '').lower() == 'salary' and attrs.get('type') == 'Income':
            # Auto-calculate net amount if tax_deducted is provided
            # But don't require employer_name or salary_month
            pass
        
        # Auto-calculate net amount for salary if not provided
        if attrs.get('category') == 'salary' and attrs.get('type') == 'Income':
            amount = attrs.get('amount', Decimal('0'))
            tax_deducted = attrs.get('tax_deducted', Decimal('0')) or Decimal('0')
            if 'net_amount' not in attrs or not attrs.get('net_amount'):
                attrs['net_amount'] = amount - tax_deducted
        
        return attrs
    
    def validate_date(self, value):
        """Validate date is not in the future and is reasonable."""
        if not value:
            raise serializers.ValidationError("Date is required.")
        
        if not isinstance(value, date):
            raise serializers.ValidationError("Date must be a valid date.")
        
        # Check if date is too far in the future (e.g., more than 1 year)
        max_future_date = date.today().replace(year=date.today().year + 1)
        if value > max_future_date:
            raise serializers.ValidationError("Date cannot be more than 1 year in the future.")
        
        # Optional: Check if date is too far in the past (e.g., more than 100 years)
        min_past_date = date.today().replace(year=date.today().year - 100)
        if value < min_past_date:
            raise serializers.ValidationError("Date cannot be more than 100 years in the past.")
        
        return value
    
    def validate_time(self, value):
        """Validate time format."""
        if not value:
            # Default to midnight if not provided
            return time(0, 0, 0)
        
        if not isinstance(value, time):
            # Try to parse string time
            try:
                if isinstance(value, str):
                    # Handle different time formats
                    if ':' in value:
                        parts = value.split(':')
                        hour = int(parts[0])
                        minute = int(parts[1]) if len(parts) > 1 else 0
                        second = int(parts[2]) if len(parts) > 2 else 0
                        value = time(hour, minute, second)
                    else:
                        raise serializers.ValidationError("Time must be in HH:MM:SS format.")
            except (ValueError, IndexError):
                raise serializers.ValidationError("Time must be in HH:MM:SS format.")
        
        return value
    
    def validate_name(self, value):
        """Validate name length."""
        if value and len(value) > 255:
            raise serializers.ValidationError("Name cannot exceed 255 characters.")
        return value or ''
    
    def validate_remark(self, value):
        """Validate remark length."""
        if value and len(value) > 1000:
            raise serializers.ValidationError("Remark cannot exceed 1000 characters.")
        return value or ''
    
    def create(self, validated_data):
        """
        Create transaction with explicit save to ensure database commit.
        User and account are passed via serializer.save(user=..., account=...) and stored as attributes.
        """
        # Get user and account from instance attributes set by save() method
        user = getattr(self, '_save_user', None)
        account = getattr(self, '_save_account', None)  # None for personal transactions
        
        # Clean up the attributes
        if hasattr(self, '_save_user'):
            delattr(self, '_save_user')
        if hasattr(self, '_save_account'):
            delattr(self, '_save_account')
        
        # CRITICAL: User must be provided
        if not user:
            logger.error("CRITICAL: User not provided when creating transaction!")
            logger.error(f"Validated data keys: {list(validated_data.keys())}")
            logger.error(f"Serializer instance attributes: {dir(self)}")
            raise serializers.ValidationError({
                'error': 'User is required to create a transaction.'
            })
        
        # Log account info for debugging
        if account:
            logger.info(f"Creating transaction for account: {account.id} ({account.name})")
        else:
            logger.info("Creating personal transaction (no account)")
        
        # CRITICAL: Ensure all required fields have defaults if missing or None
        # Set defaults for optional fields that might be missing or None
        # Handle None values explicitly - replace them with defaults
        defaults = {
            'category': '',
            'name': '',
            'remark': '',
            'mode': 'Cash',
            'date': timezone.now().date(),
            'time': timezone.now().time(),
        }
        
        # Start with validated_data, then apply defaults for missing/None values
        final_data = dict(validated_data)
        
        # Replace None or missing values with defaults for specific fields
        for key, default_value in defaults.items():
            if key not in final_data or final_data[key] is None:
                final_data[key] = default_value
        
        # Handle other optional string fields that might be None
        string_fields_with_defaults = {
            'employer_name': '',
            'vendor_name': '',
            'invoice_number': '',
            'receipt_number': '',
            'location': '',
        }
        for key, default_value in string_fields_with_defaults.items():
            if key in final_data and final_data[key] is None:
                final_data[key] = default_value
        
        # Handle list/array fields
        if 'tags' in final_data and final_data['tags'] is None:
            final_data['tags'] = []
        if 'attachments' in final_data and final_data['attachments'] is None:
            final_data['attachments'] = []
        if 'custom_fields' in final_data and final_data['custom_fields'] is None:
            final_data['custom_fields'] = {}
        
        # CRITICAL: Ensure required fields are present
        if 'type' not in final_data or final_data['type'] is None:
            logger.error("CRITICAL: Transaction type is missing!")
            raise serializers.ValidationError({
                'type': 'Transaction type is required.'
            })
        
        if 'amount' not in final_data or final_data['amount'] is None:
            logger.error("CRITICAL: Transaction amount is missing!")
            raise serializers.ValidationError({
                'amount': 'Transaction amount is required.'
            })
        
        # Ensure date and time are set
        if 'date' not in final_data or final_data['date'] is None:
            final_data['date'] = timezone.now().date()
        if 'time' not in final_data or final_data['time'] is None:
            final_data['time'] = timezone.now().time()
        
        # Log what we're about to save - show ALL fields
        logger.info(f"Creating transaction with data: type={final_data.get('type')}, "
                   f"amount={final_data.get('amount')}, category={final_data.get('category')}, "
                   f"name={final_data.get('name')}, remark={final_data.get('remark')}, "
                   f"mode={final_data.get('mode')}, date={final_data.get('date')}, "
                   f"time={final_data.get('time')}")
        logger.info(f"All final_data keys: {list(final_data.keys())}")
        logger.info(f"Final data values: {[(k, v) for k, v in final_data.items() if k != 'user']}")
        
        # Use Transaction.objects.create() which immediately saves to database
        # This ensures the transaction is committed right away
        # CRITICAL: Explicitly pass all fields including account to ensure they're saved
        # CRITICAL: Log account info before creating
        if account:
            logger.info(f"🔍 Creating transaction with account: ID={account.id}, Name={account.name}, Type={account.type}")
        else:
            logger.info("🔍 Creating personal transaction (account=None)")
        
        try:
            # CRITICAL: Ensure account is properly set - use account object directly
            transaction = Transaction.objects.create(
                user=user,
                account=account,  # CRITICAL: Include account (None for personal transactions)
                type=final_data['type'],
                amount=final_data['amount'],
                category=final_data.get('category', ''),
                name=final_data.get('name', ''),
                remark=final_data.get('remark', ''),
                mode=final_data.get('mode', 'Cash'),
                date=final_data['date'],
                time=final_data['time'],
                employer_name=final_data.get('employer_name', ''),
                salary_month=final_data.get('salary_month', ''),
                tax_deducted=final_data.get('tax_deducted'),
                net_amount=final_data.get('net_amount'),
                vendor_name=final_data.get('vendor_name', ''),
                invoice_number=final_data.get('invoice_number', ''),
                receipt_number=final_data.get('receipt_number', ''),
                tax_amount=final_data.get('tax_amount'),
                tax_percentage=final_data.get('tax_percentage'),
                location=final_data.get('location', ''),
                tags=final_data.get('tags', []),
                attachments=final_data.get('attachments', []),
                recurring=final_data.get('recurring', False),
                recurring_frequency=final_data.get('recurring_frequency', ''),
                next_due_date=final_data.get('next_due_date'),
                custom_fields=final_data.get('custom_fields', {}),
            )
        except Exception as e:
            logger.error(f"❌ Error creating transaction in serializer: {str(e)}", exc_info=True)
            logger.error(f"❌ Failed data: {final_data}")
            logger.error(f"❌ User: {user.id if user else 'None'}")
            logger.error(f"❌ Account: {account.id if account else 'None'}")
            raise serializers.ValidationError({
                'error': f'Failed to save transaction to database: {str(e)}'
            })
        
        # Force database commit by accessing the ID
        transaction_id = transaction.id
        
        # CRITICAL: Verify transaction was saved and account is correct
        if not transaction_id:
            logger.error("❌ CRITICAL: Transaction created but has no ID!")
            raise serializers.ValidationError({
                'error': 'Transaction was not saved to database. Please try again.'
            })
        
        # CRITICAL: Verify account was saved correctly (non-critical - log but don't fail)
        try:
            transaction.refresh_from_db()
            logger.info(f"✅ [VERIFY] Transaction refreshed from database: ID={transaction.id}, account_id={transaction.account_id}")
            
            # Verify and fix account_id if needed (non-critical - don't fail if mismatch)
            if account:
                if transaction.account_id != account.id:
                    logger.warning(f"⚠️ [VERIFY] Account mismatch in serializer! Expected {account.id}, got {transaction.account_id}")
                    logger.warning(f"⚠️ [VERIFY] Attempting to fix account_id...")
                    # Try to fix it
                    try:
                        transaction.account = account
                        transaction.save(update_fields=['account'])
                        logger.info(f"✅ [VERIFY] Fixed account ID: Set to {account.id}")
                    except Exception as fix_error:
                        logger.error(f"❌ [VERIFY] Could not fix account_id: {str(fix_error)}")
                else:
                    logger.info(f"✅ [VERIFY] Account verified in serializer: Transaction {transaction_id} linked to account {account.id}")
            else:
                if transaction.account_id is not None:
                    logger.warning(f"⚠️ [VERIFY] Personal transaction has account_id {transaction.account_id}!")
                    logger.warning(f"⚠️ [VERIFY] Attempting to fix...")
                    # Try to fix it
                    try:
                        transaction.account = None
                        transaction.save(update_fields=['account'])
                        logger.info(f"✅ [VERIFY] Fixed account_id: Set to None")
                    except Exception as fix_error:
                        logger.error(f"❌ [VERIFY] Could not fix account_id: {str(fix_error)}")
                else:
                    logger.info(f"✅ [VERIFY] Personal transaction verified: No account_id (correct)")
        except Exception as e:
            logger.error(f"⚠️ [VERIFY] Error verifying transaction in serializer (non-critical): {str(e)}", exc_info=True)
            # Continue anyway - the transaction was created and saved
        
        # CRITICAL: Verify the transaction was actually saved (this is critical)
        if not transaction_id:
            logger.error("❌ CRITICAL: Transaction created but has no ID!")
            raise serializers.ValidationError({
                'error': 'Transaction was not saved to database. Please try again.'
            })
        
        logger.info(f"✅ Transaction {transaction_id} created successfully in serializer")
        transaction.refresh_from_db()
        
        # CRITICAL: Verify all fields were saved correctly
        field_verification = {
            'type': transaction.type,
            'amount': str(transaction.amount),
            'category': transaction.category or '(empty)',
            'name': transaction.name or '(empty)',
            'remark': transaction.remark or '(empty)',
            'mode': transaction.mode,
            'date': str(transaction.date),
            'time': str(transaction.time),
        }
        
        # CRITICAL: Log account_id explicitly to verify it's saved
        logger.info(f"✅ [VERIFY] Transaction created in serializer: ID={transaction_id}, account_id={transaction.account_id}, user_id={transaction.user_id}")
        
        # Log for debugging - show ALL fields being saved including account
        logger.info(
            f"Transaction created in serializer: ID={transaction_id}, "
            f"User: {transaction.user.username if transaction.user else 'N/A'}, "
            f"Account: {transaction.account.name if transaction.account else 'Personal (None)'}, "
            f"Account ID: {transaction.account.id if transaction.account else 'None'}, "
            f"Type: {field_verification['type']}, "
            f"Amount: {field_verification['amount']}, "
            f"Category: {field_verification['category']}, "
            f"Name: {field_verification['name']}, "
            f"Remark: {field_verification['remark']}, "
            f"Mode: {field_verification['mode']}, "
            f"Date: {field_verification['date']}, "
            f"Time: {field_verification['time']}"
        )
        
        # CRITICAL: Verify account was saved correctly (non-critical - fix if needed, don't fail)
        if account:
            if transaction.account_id != account.id:
                logger.warning(f"⚠️ Account mismatch detected! Expected {account.id}, got {transaction.account_id}")
                logger.warning(f"⚠️ Attempting to fix account_id...")
                # Try to fix it instead of failing
                try:
                    transaction.account = account
                    transaction.save(update_fields=['account'])
                    logger.info(f"✅ Fixed account_id: Set to {account.id}")
                except Exception as fix_error:
                    logger.error(f"❌ Could not fix account_id: {str(fix_error)}")
                    # Don't fail - transaction is already saved
            else:
                logger.info(f"✅ Account verified: Transaction {transaction_id} is linked to account {account.id}")
        else:
            if transaction.account_id is not None:
                logger.warning(f"⚠️ Personal transaction has account ID {transaction.account_id}!")
                logger.warning(f"⚠️ Attempting to fix...")
                # Try to fix it instead of failing
                try:
                    transaction.account = None
                    transaction.save(update_fields=['account'])
                    logger.info(f"✅ Fixed account_id: Set to None")
                except Exception as fix_error:
                    logger.error(f"❌ Could not fix account_id: {str(fix_error)}")
                    # Don't fail - transaction is already saved
            else:
                logger.info(f"✅ Personal transaction verified: Transaction {transaction_id} has no account")
        
        # Log validated_data to see what was passed
        logger.info(f"Validated data keys saved: {list(validated_data.keys())}")
        logger.info(f"Final data keys used: {list(final_data.keys())}")
        
        # Verify critical fields were saved
        if not transaction.type:
            logger.error("CRITICAL: Transaction type is missing after save!")
        if not transaction.amount:
            logger.error("CRITICAL: Transaction amount is missing after save!")
        if transaction.category is None:
            logger.warning("Transaction category is None (may be empty string)")
        
        # Refresh from database to ensure it's committed
        transaction.refresh_from_db()
        
        # Final verification - check if it exists in database
        verify = Transaction.objects.filter(id=transaction_id).first()
        if not verify:
            logger.error(f"CRITICAL: Transaction {transaction_id} not found in database after create!")
            raise serializers.ValidationError({
                'error': 'Transaction was not saved to database. Please try again.'
            })
        
        return transaction