"""
Django management command to verify transactions are stored correctly in the database.
Works with PostgreSQL (and other Django-supported databases).

Usage: 
    python manage.py verify_transactions
    python manage.py verify_transactions --account-id 7
    python manage.py verify_transactions --account-id 7 --detailed
    python manage.py verify_transactions --user-id 30
"""
from django.core.management.base import BaseCommand
from django.db.models import Count, Q
from transactions.models import Transaction
from accounts.models import Account, AccountMember
from django.contrib.auth.models import User


class Command(BaseCommand):
    help = 'Verify transactions are stored correctly in the database, especially for shared accounts'

    def add_arguments(self, parser):
        parser.add_argument(
            '--account-id',
            type=int,
            help='Check transactions for a specific account ID',
        )
        parser.add_argument(
            '--user-id',
            type=int,
            help='Check transactions for a specific user ID',
        )
        parser.add_argument(
            '--detailed',
            action='store_true',
            help='Show detailed transaction information',
        )

    def handle(self, *args, **options):
        account_id = options.get('account_id')
        user_id = options.get('user_id')
        detailed = options.get('detailed', False)

        self.stdout.write(self.style.SUCCESS('\n' + '='*80))
        self.stdout.write(self.style.SUCCESS('TRANSACTION VERIFICATION REPORT'))
        self.stdout.write(self.style.SUCCESS('='*80 + '\n'))

        # 1. Overall statistics
        total_transactions = Transaction.objects.count()
        personal_transactions = Transaction.objects.filter(account__isnull=True).count()
        shared_transactions = Transaction.objects.filter(account__isnull=False).count()

        self.stdout.write(self.style.WARNING('[STATS] OVERALL STATISTICS:'))
        self.stdout.write(f'   Total transactions: {total_transactions}')
        self.stdout.write(f'   Personal transactions (account_id IS NULL): {personal_transactions}')
        self.stdout.write(f'   Shared account transactions (account_id IS NOT NULL): {shared_transactions}')
        self.stdout.write('')

        # 2. Transactions by account
        self.stdout.write(self.style.WARNING('[ACCOUNTS] TRANSACTIONS BY ACCOUNT:'))
        account_stats = Transaction.objects.values('account_id').annotate(
            count=Count('id')
        ).order_by('account_id')

        for stat in account_stats:
            account_id_val = stat['account_id']
            count = stat['count']
            if account_id_val is None:
                self.stdout.write(f'   Personal (NULL): {count} transactions')
            else:
                try:
                    account = Account.objects.get(id=account_id_val)
                    account_type = account.type
                    account_name = account.name
                    self.stdout.write(f'   Account ID {account_id_val} ({account_name}, {account_type}): {count} transactions')
                except Account.DoesNotExist:
                    self.stdout.write(self.style.ERROR(f'   Account ID {account_id_val}: {count} transactions ([WARNING] ACCOUNT NOT FOUND!)'))

        self.stdout.write('')

        # 3. Check for specific account
        if account_id:
            self.stdout.write(self.style.WARNING(f'[DETAILED] CHECK FOR ACCOUNT ID {account_id}:'))
            try:
                account = Account.objects.get(id=account_id)
                self.stdout.write(f'   Account Name: {account.name}')
                self.stdout.write(f'   Account Type: {account.type}')
                self.stdout.write(f'   Owner: {account.owner.username} (ID: {account.owner.id})')

                # Get members
                members = AccountMember.objects.filter(account=account, status='ACCEPTED')
                self.stdout.write(f'   ACCEPTED Members ({members.count()}):')
                for member in members:
                    self.stdout.write(f'      - {member.user.username} (ID: {member.user.id})')

                # Get transactions
                transactions = Transaction.objects.filter(account_id=account_id).order_by('-created_at')
                self.stdout.write(f'\n   Transactions in this account ({transactions.count()}):')

                if detailed:
                    for tx in transactions:
                        self.stdout.write(f'      ID: {tx.id} | User: {tx.user.username} (ID: {tx.user.id}) | '
                                        f'Type: {tx.type} | Amount: {tx.amount} | '
                                        f'Name: {tx.name} | Date: {tx.date} | Created: {tx.created_at}')
                else:
                    # Group by user
                    user_stats = transactions.values('user__username', 'user_id').annotate(
                        count=Count('id')
                    ).order_by('user__username')
                    for stat in user_stats:
                        self.stdout.write(f'      {stat["user__username"]} (ID: {stat["user_id"]}): {stat["count"]} transactions')

                # Verify all transactions belong to members
                self.stdout.write(f'\n   [VERIFY] Verification:')
                all_users = set(members.values_list('user_id', flat=True))
                all_users.add(account.owner_id)
                transaction_users = set(transactions.values_list('user_id', flat=True))
                
                if transaction_users.issubset(all_users):
                    self.stdout.write(self.style.SUCCESS(f'      [OK] All transactions belong to account members/owner'))
                else:
                    invalid_users = transaction_users - all_users
                    self.stdout.write(self.style.ERROR(f'      [ERROR] Some transactions belong to users not in account: {invalid_users}'))

            except Account.DoesNotExist:
                self.stdout.write(self.style.ERROR(f'   [ERROR] Account ID {account_id} not found!'))

            self.stdout.write('')

        # 4. Check for specific user
        if user_id:
            self.stdout.write(self.style.WARNING(f'[USER] TRANSACTIONS FOR USER ID {user_id}:'))
            try:
                user = User.objects.get(id=user_id)
                self.stdout.write(f'   Username: {user.username}')
                
                user_transactions = Transaction.objects.filter(user_id=user_id)
                personal_count = user_transactions.filter(account__isnull=True).count()
                shared_count = user_transactions.filter(account__isnull=False).count()
                
                self.stdout.write(f'   Total transactions: {user_transactions.count()}')
                self.stdout.write(f'   Personal transactions: {personal_count}')
                self.stdout.write(f'   Shared account transactions: {shared_count}')

                if detailed:
                    self.stdout.write(f'\n   Transaction details:')
                    for tx in user_transactions.order_by('-created_at')[:10]:  # Show last 10
                        account_info = f'Account ID: {tx.account_id}' if tx.account_id else 'Personal'
                        self.stdout.write(f'      ID: {tx.id} | {account_info} | Type: {tx.type} | '
                                        f'Amount: {tx.amount} | Date: {tx.date}')

            except User.DoesNotExist:
                self.stdout.write(self.style.ERROR(f'   [ERROR] User ID {user_id} not found!'))

            self.stdout.write('')

        # 5. Check for data integrity issues
        self.stdout.write(self.style.WARNING('[INTEGRITY] DATA INTEGRITY CHECKS:'))
        
        # Check for transactions with account_id but account doesn't exist
        invalid_accounts = Transaction.objects.filter(
            account__isnull=False
        ).exclude(
            account_id__in=Account.objects.values_list('id', flat=True)
        )
        if invalid_accounts.exists():
            self.stdout.write(self.style.ERROR(f'   [ERROR] Found {invalid_accounts.count()} transactions with invalid account_id'))
            for tx in invalid_accounts[:5]:
                self.stdout.write(self.style.ERROR(f'      Transaction ID {tx.id} has account_id={tx.account_id} (account not found)'))
        else:
            self.stdout.write(self.style.SUCCESS('   [OK] All transactions have valid account_id'))

        # Check for transactions with user_id but user doesn't exist
        invalid_users = Transaction.objects.exclude(
            user_id__in=User.objects.values_list('id', flat=True)
        )
        if invalid_users.exists():
            self.stdout.write(self.style.ERROR(f'   [ERROR] Found {invalid_users.count()} transactions with invalid user_id'))
        else:
            self.stdout.write(self.style.SUCCESS('   [OK] All transactions have valid user_id'))

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('='*80))
        self.stdout.write(self.style.SUCCESS('VERIFICATION COMPLETE'))
        self.stdout.write(self.style.SUCCESS('='*80 + '\n'))

