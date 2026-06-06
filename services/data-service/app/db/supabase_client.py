import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables (mostly for local development, docker-compose will inject them)
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
SUPABASE_TABLE = os.getenv("SUPABASE_TABLE", "water_quality_clean")
SUPABASE_PREDICTION_TABLE = os.getenv("SUPABASE_PREDICTION_TABLE", "prediction_results")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    raise ValueError(
        "Missing required environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set."
    )

# Create a single instance of Supabase Client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
