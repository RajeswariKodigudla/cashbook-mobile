"""
Custom exceptions for the transactions app.
"""
from rest_framework.exceptions import APIException


class TransactionValidationError(APIException):
    """Custom exception for transaction validation errors."""
    status_code = 400
    default_detail = 'Transaction validation failed.'
    default_code = 'transaction_validation_error'


class TransactionNotFoundError(APIException):
    """Custom exception when transaction is not found."""
    status_code = 404
    default_detail = 'Transaction not found.'
    default_code = 'transaction_not_found'


class TransactionPermissionError(APIException):
    """Custom exception when user doesn't have permission to access transaction."""
    status_code = 403
    default_detail = 'You do not have permission to access this transaction.'
    default_code = 'transaction_permission_error'

