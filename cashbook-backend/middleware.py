"""
Middleware to manage database connections and prevent pool exhaustion,
and ensure proper Content-Type headers with charset.
"""
from django.db import connection
from django.db.utils import OperationalError, DatabaseError
import logging

logger = logging.getLogger(__name__)


class DatabaseConnectionMiddleware:
    """
    Middleware to ensure database connections are properly closed after each request.
    This prevents connection pool exhaustion (2/2 connections in use).
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Process request
        response = self.get_response(request)
        
        # CRITICAL: Close database connection after each request to prevent pool exhaustion
        # This ensures connections are always released back to the pool (prevents 2/2 error)
        # IMPORTANT: Only close Django's connections, not external tools like DBeaver
        # NOTE: This runs AFTER the response is returned, so all transactions should be committed
        try:
            # Close the default connection used by Django
            if hasattr(connection, 'connection') and connection.connection is not None:
                try:
                    # Check if connection is in a transaction before closing
                    # If in a transaction, don't close (shouldn't happen after response, but be safe)
                    if hasattr(connection, 'in_atomic_block'):
                        if connection.in_atomic_block:
                            logger.warning("Connection still in atomic block after response - not closing")
                            return response
                    
                    if not connection.connection.closed:
                        connection.close()
                        logger.debug("Closed default Django connection after request")
                except Exception as e:
                    # Connection might already be closed or in use by another process
                    logger.debug(f"Could not close default connection: {e}")
            
            # Close all Django-managed connections (but not external tools)
            # Only close connections that Django created, not external connections
            from django.db import connections
            for alias in connections:
                try:
                    conn = connections[alias]
                    # Only close if this is a Django-managed connection
                    if hasattr(conn, 'connection') and conn.connection is not None:
                        # Check if connection is in a transaction before closing
                        if hasattr(conn, 'in_atomic_block'):
                            if conn.in_atomic_block:
                                logger.warning(f"Connection '{alias}' still in atomic block after response - not closing")
                                continue
                        
                        # Check if connection is from Django's pool (not external)
                        if not conn.connection.closed:
                            # Only close if it's not in use by external tools
                            # External tools like DBeaver have their own connection pool
                            conn.close()
                            logger.debug(f"Closed Django connection '{alias}' after request")
                except Exception as e:
                    # Ignore errors - connection might be in use by external tool
                    logger.debug(f"Could not close connection '{alias}': {e}")
        except Exception as e:
            # Log but don't fail the request if connection closing fails
            logger.warning(f"Error closing connections in middleware: {e}")
        
        return response


class ContentTypeCharsetMiddleware:
    """
    Middleware to ensure Content-Type headers include charset=utf-8.
    This fixes browser warnings about missing charset in Content-Type headers.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        response = self.get_response(request)
        
        # Ensure Content-Type includes charset=utf-8 for text/html and application/json
        content_type = response.get('Content-Type', '')
        
        if content_type:
            # Check if it's a text or application type that should have charset
            if any(content_type.startswith(prefix) for prefix in [
                'text/html',
                'text/plain',
                'application/json',
                'application/javascript',
                'text/css',
                'text/xml',
                'application/xml'
            ]):
                # Only add charset if not already present
                if 'charset=' not in content_type.lower():
                    # Preserve the original content type and add charset
                    response['Content-Type'] = f"{content_type}; charset=utf-8"
        
        return response

