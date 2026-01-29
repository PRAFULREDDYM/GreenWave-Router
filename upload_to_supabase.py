import json
import os
from supabase import create_client, Client

# --- CONFIGURATION ---
"""
Bulk-load intersection + signal-phase seed data into Supabase.

Credentials are read from environment variables (do not hardcode secrets).
Recommended: use the Service Role key for seeding.
"""

def _get_env(*names: str) -> str | None:
    for name in names:
        value = os.getenv(name)
        if value:
            return value
    return None

# Get these from Supabase Dashboard -> Project Settings -> API
# Prefer SERVICE_ROLE for seeding; fall back to anon key only if your RLS allows inserts.
URL = _get_env("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL")
KEY = _get_env("SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY")

if not URL or not KEY:
    raise RuntimeError(
        "Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY "
        "(or NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY)."
    )

supabase: Client = create_client(URL, KEY)

# --- LOAD DATA ---
with open("final_seed_data.json", "r") as f:
    data = json.load(f)

print("Starting upload...")

# 1. Upload Intersections
# Supabase allows bulk inserts. We do them in chunks to be safe.
intersections = data['intersections']
print(f"Uploading {len(intersections)} intersections...")

# Batch size of 100 to prevent timeouts
for i in range(0, len(intersections), 100):
    batch = intersections[i:i+100]
    data_response = supabase.table('intersections').insert(batch).execute()
    print(f"Uploaded batch {i} - {i+100}")

# 2. Upload Phases
phases = data['phases']
print(f"Uploading {len(phases)} signal phases...")

for i in range(0, len(phases), 100):
    batch = phases[i:i+100]
    data_response = supabase.table('signal_phases').insert(batch).execute()
    print(f"Uploaded batch {i} - {i+100}")

print("Upload Complete! Check your Supabase Table Editor.")