"""
Database utility functions for connection management and validation
"""
from django.db import connection, connections
from django.db.utils import OperationalError, DatabaseError
import logging

logger = logging.getLogger(__name__)


def close_all_connections():
    """
    Close all database connections to prevent pool exhaustion.
    Use this when connection count is at maximum (2/2).
    """
    try:
        for conn in connections.all():
            try:
                if conn.connection is not None and not conn.connection.closed:
                    conn.close()
            except Exception as e:
                logger.debug(f"Error closing connection: {e}")
    except Exception as e:
        logger.warning(f"Error closing all connections: {e}")


def ensure_valid_connection():
    """
    Ensure the database connection is valid and reconnect if necessary.
    This prevents 'datasource invalid' errors.
    CRITICAL: Closes connection after use to prevent pool exhaustion.
    """
    try:
        # Check if connection exists and is open
        if connection.connection is None:
            logger.debug("Connection is None, ensuring connection...")
            connection.ensure_connection()
            return True
        
        # Check if connection is closed
        if connection.connection.closed:
            logger.warning("Connection is closed, reconnecting...")
            connection.close()
            connection.ensure_connection()
            return True
        
        # Test the connection with a simple query
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
            return True
        except (OperationalError, DatabaseError) as e:
            logger.warning(f"Connection test failed: {e}, reconnecting...")
            # Close all connections to free up pool
            close_all_connections()
            connection.ensure_connection()
            return True
            
    except Exception as e:
        logger.error(f"Error ensuring valid connection: {e}", exc_info=True)
        # Force reconnect - close all connections first
        close_all_connections()
        try:
            connection.ensure_connection()
            return True
        except Exception as reconnect_error:
            logger.error(f"Failed to reconnect: {reconnect_error}", exc_info=True)
            raise


def get_valid_connection():
    """
    Get a valid database connection, reconnecting if necessary.
    """
    ensure_valid_connection()
    return connection


def close_connection_after_use():
    """
    Close connection after use to prevent pool exhaustion.
    Call this after database operations to free up connections.
    """
    try:
        if connection.connection is not None and not connection.connection.closed:
            connection.close()
    except Exception as e:
        logger.debug(f"Error closing connection after use: {e}")

