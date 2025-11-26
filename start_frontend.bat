@echo off
echo 🌐 Starting Healthcare Symptom Checker Frontend...
echo.
echo Opening http://localhost:8080 in your browser...
echo.
echo 📝 Make sure the backend is running first!
echo    Run: python run_backend.py
echo.
start http://localhost:8080
python -m http.server 8080
pause