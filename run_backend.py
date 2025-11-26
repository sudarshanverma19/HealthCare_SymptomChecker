#!/usr/bin/env python3
"""
Simple script to start the Healthcare Symptom Checker backend server.
No Docker required!
"""

import os
import sys
import subprocess
from pathlib import Path

def main():
    print("🏥 Starting Healthcare Symptom Checker Backend...")
    
    # Change to backend directory
    backend_dir = Path(__file__).parent / "backend"
    os.chdir(backend_dir)
    
    # Check if .env file exists
    if not (backend_dir / ".env").exists():
        print("❌ Error: .env file not found in backend directory!")
        print("Please create backend/.env with your GEMINI_API_KEY")
        return 1
    
    # Check if requirements are installed
    try:
        import fastapi
        import uvicorn
        print("✅ Dependencies found")
    except ImportError:
        print("❌ Missing dependencies. Installing...")
        subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
    
    print("🚀 Starting server on http://localhost:8000")
    print("📖 API Documentation: http://localhost:8000/docs")
    print("❤️  Health Check: http://localhost:8000/health")
    print("\n📝 Press Ctrl+C to stop the server\n")
    
    # Start the server
    try:
        subprocess.run([
            sys.executable, "-m", "uvicorn", 
            "main:app", 
            "--host", "0.0.0.0", 
            "--port", "8000", 
            "--reload"
        ])
    except KeyboardInterrupt:
        print("\n👋 Server stopped. Goodbye!")

if __name__ == "__main__":
    sys.exit(main())