#!/bin/bash

# Healthcare Symptom Checker Deployment Script
# For AWS EC2 Amazon Linux 2

set -e

echo "🏥 Healthcare Symptom Checker - AWS Deployment"
echo "=============================================="

# Update system
echo "📦 Updating system packages..."
sudo yum update -y

# Install Docker
echo "🐳 Installing Docker..."
sudo amazon-linux-extras install docker -y
sudo service docker start
sudo usermod -a -G docker ec2-user

# Install Docker Compose
echo "🐙 Installing Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/download/v2.21.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Git (if not already installed)
echo "📡 Installing Git..."
sudo yum install git -y

# Clone repository (replace with your actual repository URL)
echo "📥 Cloning repository..."
# git clone https://github.com/yourusername/healthcare-symptom-checker.git
# cd healthcare-symptom-checker

# Set up environment variables
echo "⚙️  Setting up environment..."
cp .env.example .env
echo "❗ Please edit .env file with your actual Gemini API key:"
echo "   nano .env"
echo ""
echo "Press Enter after editing .env file..."
read -p ""

# Create data directory
echo "📁 Creating data directory..."
mkdir -p ./data

# Build and start containers
echo "🏗️  Building and starting containers..."
docker-compose up -d --build

# Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 30

# Check service health
echo "🔍 Checking service health..."
if curl -f http://localhost:8000/health >/dev/null 2>&1; then
    echo "✅ Backend is healthy"
else
    echo "❌ Backend health check failed"
fi

if curl -f http://localhost/health >/dev/null 2>&1; then
    echo "✅ Frontend is healthy"
else
    echo "❌ Frontend health check failed"
fi

# Show running containers
echo "📊 Running containers:"
docker-compose ps

echo ""
echo "🎉 Deployment completed!"
echo ""
echo "🌐 Your application should be available at:"
echo "   Frontend: http://$(curl -s http://checkip.amazonaws.com/)"
echo "   Backend API: http://$(curl -s http://checkip.amazonaws.com/):8000"
echo ""
echo "🛠️  Useful commands:"
echo "   View logs: docker-compose logs -f"
echo "   Stop services: docker-compose down"
echo "   Restart services: docker-compose restart"
echo "   Update application: git pull && docker-compose up -d --build"
echo ""
echo "📝 Don't forget to configure EC2 Security Group to allow:"
echo "   - HTTP (port 80) from 0.0.0.0/0"
echo "   - HTTPS (port 443) from 0.0.0.0/0 (if using SSL)"
echo "   - Custom TCP (port 8000) from 0.0.0.0/0 (for API access)"