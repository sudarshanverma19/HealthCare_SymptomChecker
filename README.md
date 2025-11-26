# 🏥 Healthcare Symptom Checker

A simple AI-powered symptom checker built with FastAPI and vanilla JavaScript. No Docker required!


DEMO VIDEO LINK : [Link Drive]https://drive.google.com/file/d/12yMCvEqdCIuj8nwo15KmflgifJ6R182R/view?usp=sharing

## ✨ Features

- 🤖 AI-powered symptom analysis using Google Gemini
- 💬 Interactive consultation with follow-up questions  
- 📊 Medical condition assessment with likelihood ratings
- 📝 Consultation history tracking
- ⚠️ Red flag warnings for urgent care
- 🎨 Clean, responsive web interface

## 🚀 Quick Start

### 1. Prerequisites

- Python 3.8+
- Google Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))

### 2. Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/sudarshanverma19/HealthCare_SymptomChecker.git
   cd HealthCare_SymptomChecker
   ```

2. **Install Python dependencies**
   ```bash
   pip install -r backend/requirements.txt
   ```

3. **Configure API key**
   
   Create `backend/.env` file:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```

### 3. Run the Application

**Option A: Using batch scripts (Windows)**
1. Double-click `start_backend.bat` to start the API server
2. Double-click `start_frontend.bat` to start the web interface

**Option B: Manual startup**
1. Start backend: `python run_backend.py`
2. Start frontend: `python -m http.server 8080`
3. Open: http://localhost:8080

## 🌐 Usage

1. **Open** http://localhost:8080 in your browser
2. **Describe** your symptoms in the text area
3. **Click** "Start Medical Consultation"
4. **Answer** follow-up questions if prompted
5. **Review** AI assessment and recommendations

## 📁 Project Structure

```
healthcare-symptom-checker/
├── backend/                 # FastAPI backend
│   ├── main.py             # Main API application
│   ├── requirements.txt    # Python dependencies
│   └── .env               # API keys (create this!)
├── index.html             # Frontend web page
├── script.js              # Frontend JavaScript
├── style.css              # Frontend styling
├── run_backend.py         # Backend startup script
├── start_backend.bat      # Windows backend launcher
└── start_frontend.bat     # Windows frontend launcher
```

## 🛠️ API Endpoints

- `GET /health` - Health check
- `POST /analyze_symptoms` - Symptom analysis
- `GET /history` - Consultation history
- `GET /docs` - Interactive API documentation

## ⚠️ Important Notes

- **Not for medical diagnosis** - This is an educational tool only
- **Always consult professionals** for medical advice
- **Secure your API key** - Don't commit .env files
- **Local development only** - Additional security needed for production

## 🔧 Troubleshooting

**Backend won't start?**
- Check if Python 3.8+ is installed
- Verify your GEMINI_API_KEY in backend/.env
- Install dependencies: `pip install -r backend/requirements.txt`

**Frontend can't connect?**
- Make sure backend is running on port 8000
- Check if http://localhost:8000/health returns JSON

**API errors?**
- Verify your Gemini API key is valid
- Check your Google AI Studio quota

## 📄 License

MIT License - Feel free to use and modify!

---

**Disclaimer:** This application is for educational purposes only and should not replace professional medical advice, diagnosis, or treatment.

