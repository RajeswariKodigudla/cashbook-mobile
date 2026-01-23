"""
Custom exception handler for REST Framework.
"""
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
import logging

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Custom exception handler that provides consistent error responses.
    """
    # Call REST framework's default exception handler first
    response = exception_handler(exc, context)
    
    # If response is None, it's an unhandled exception
    if response is None:
        logger.error(f"Unhandled exception: {exc}", exc_info=True)
        return Response({
            'success': False,
            'message': 'An unexpected error occurred',
            'error': str(exc)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    # Customize the response data structure
    custom_response_data = {
        'success': False,
        'message': 'An error occurred',
    }
    
    # Add error details
    if hasattr(exc, 'detail'):
        if isinstance(exc.detail, dict):
            custom_response_data['errors'] = exc.detail
        elif isinstance(exc.detail, list):
            custom_response_data['errors'] = {'detail': exc.detail}
        else:
            custom_response_data['message'] = str(exc.detail)
            custom_response_data['errors'] = {'detail': [str(exc.detail)]}
    else:
        custom_response_data['message'] = str(exc)
        custom_response_data['errors'] = {'detail': [str(exc)]}
    
    # Log the error
    logger.error(f"API Error: {exc}", exc_info=True)
    
    return Response(custom_response_data, status=response.status_code)

