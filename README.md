# 🏥 Healthcare Symptom Checker (Educational)

A production-ready, containerized healthcare symptom checker web application powered by Google's Gemini AI. This application provides a professional medical consultation simulation with intelligent follow-up questions and educational assessments.

## ✨ Features

- **🩺 Interactive Medical Consultation**: Multi-step consultation process mirroring real doctor-patient interactions
- **🤖 AI-Powered Analysis**: Google Gemini AI for intelligent symptom analysis and follow-up questions  
- **📚 Educational Focus**: Differential diagnosis with likelihood ratings and medical reasoning
- **📋 Consultation History**: Comprehensive tracking and display of previous consultations
- **🛡️ Rate Limiting**: Built-in API protection for responsible usage
- **🎨 Professional UI**: Modern, responsive design using Tailwind CSS
- **⚠️ Safety Features**: Red flag symptoms identification and care guidance
- **🐳 Docker Ready**: Fully containerized for easy deployment
- **☁️ AWS Compatible**: Optimized for AWS EC2 free tier deployment

## 🏗️ Technology Stack

### Backend
- **FastAPI**: High-performance Python web framework
- **Google Gemini AI**: Advanced AI model for medical reasoning  
- **SQLite**: Lightweight, persistent database
- **SlowAPI**: Rate limiting middleware
- **Docker**: Containerized deployment

### Frontend  
- **HTML5 + Tailwind CSS**: Modern, responsive UI
- **Vanilla JavaScript**: Clean, dependency-free logic
- **Nginx**: High-performance web server (production)
- **Docker**: Containerized static file serving

## 🚀 Quick Start (Docker)

### Prerequisites
- Docker & Docker Compose
- Google Gemini AI API key

### One-Command Setup
```bash
# Clone repository
git clone <your-repository-url>
cd healthcare-symptom-checker

# Set up environment
cp .env.example .env
# Edit .env with your Gemini API key

# Start application
docker-compose up -d --build
```

**Access your application:**
- 🌐 Frontend: http://localhost
- 🔌 Backend API: http://localhost:8000

## 🛠️ Development Setup

### Local Development
```bash
# Backend setup
cd backend
python -m venv venv
source venv/bin/activate  # Windows: .\venv\Scripts\activate
pip install -r requirements.txt

# Configure environment  
cp .env.example .env
# Add your Gemini API key to .env

# Run backend
uvicorn main:app --reload --host 127.0.0.1 --port 8000

# Frontend setup (separate terminal)
cd frontend
python -m http.server 8080
```

**Development URLs:**
- Frontend: http://localhost:8080
- Backend: http://localhost:8000

## ☁️ AWS EC2 Deployment

### Automated Deployment
```bash
# On your EC2 instance
chmod +x deploy.sh
./deploy.sh
```

### Security Group Configuration
Allow these ports in your EC2 Security Group:
- **HTTP (80)**: Frontend access
- **Custom TCP (8000)**: Backend API access

## 📊 Usage Flow

1. **🩺 Start Consultation**: Describe symptoms in detail
2. **❓ Answer Questions**: Respond to AI-generated medical questions
3. **📋 View Assessment**: Review conditions, recommendations, and warnings
4. **📚 Check History**: Access previous consultation records

## 🔌 API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/analyze_symptoms` | POST | Submit symptoms for AI analysis |
| `/history` | GET | Retrieve consultation history |
| `/clear-history` | DELETE | Clear all consultation data |
| `/health` | GET | Service health check |

### Request Example
```json
{
  "symptoms": "I have a fever and sore throat for 2 days",
  "conversation_history": [],
  "is_followup": false
}
```

## 🐳 Docker Commands

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services  
docker-compose down

# Rebuild and restart
docker-compose up -d --build
```

## 🔧 Configuration

### Environment Variables
```bash
# Required
GEMINI_API_KEY=your_gemini_api_key_here

# Optional
DB_PATH=/app/data/data.db
API_HOST=0.0.0.0
API_PORT=8000
```

## 🏥 Medical Disclaimer

⚠️ **IMPORTANT**: This application is for educational purposes only and is not intended to replace professional medical advice, diagnosis, or treatment. Always consult qualified healthcare providers for medical concerns.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 🆘 Troubleshooting

### Common Issues

**API Key Issues**
```bash
# Check environment variables
docker-compose exec backend printenv | grep GEMINI
```

**Database Issues** 
```bash
# Reset database
docker-compose down
rm -rf ./data/
docker-compose up -d

