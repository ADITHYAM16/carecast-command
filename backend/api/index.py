"""
Vercel serverless entry point.
Vercel's @vercel/python runtime looks for a variable named `app` in this file.
We simply re-export the FastAPI app from main.py.
"""
import sys
import os

# Make sure the backend root (parent of this api/ folder) is on the path
# so all relative imports in main.py and services/ resolve correctly.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app  # noqa: F401  — Vercel picks up `app` from here
