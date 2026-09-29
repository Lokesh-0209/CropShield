import os
from typing import Optional
from dotenv import find_dotenv, load_dotenv
from supabase import Client, create_client

# Ensure .env is loaded (searches current and parent directories)
load_dotenv(find_dotenv())

_supabase_client: Optional[Client] = None


def get_supabase_client() -> Optional[Client]:
    """
    Returns a configured Supabase client instance, or None if credentials
    are not configured in the environment.
    """
    global _supabase_client

    if _supabase_client is not None:
        return _supabase_client

    url = os.getenv("SUPABASE_URL", "").strip()
    key = os.getenv("SUPABASE_KEY", "").strip() or os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip() or os.getenv("SUPABASE_ANON_KEY", "").strip()

    if not url or not key:
        return None

    try:
        _supabase_client = create_client(url, key)
        return _supabase_client
    except Exception:
        return None


def reset_supabase_client() -> None:
    """Resets the cached Supabase client instance (useful in tests)."""
    global _supabase_client
    _supabase_client = None
