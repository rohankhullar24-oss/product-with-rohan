#!/bin/bash
# Spinny AI Inspector Deployment Script

echo "=========================================="
echo "Spinny AI Voice/Vision Agent Deployment"
echo "=========================================="

# Environment Check
if [ -f .env ]; then
    export $(cat .env | xargs)
else
    echo "ERROR: .env file missing! Create .env with LIVEKIT_URL, LIVEKIT_API_KEY, OPENAI_API_KEY."
    exit 1
fi

MODE=$1

if [ "$MODE" == "local" ]; then
    echo "Starting Local Agent Worker..."
    python inspector_agent.py dev
elif [ "$MODE" == "cloud" ]; then
    PROJECT_ID=${2:-"spinny-production"}
    echo "Building container for Google Cloud Run (Project: $PROJECT_ID)..."
    gcloud builds submit --tag gcr.io/$PROJECT_ID/spinny-inspection-copilot:latest
    
    echo "Deploying to Cloud Run asia-south1 (Mumbai)..."
    gcloud run deploy spinny-inspection-copilot \
      --image gcr.io/$PROJECT_ID/spinny-inspection-copilot:latest \
      --platform managed \
      --region asia-south1 \
      --set-env-vars LIVEKIT_URL=$LIVEKIT_URL,LIVEKIT_API_KEY=$LIVEKIT_API_KEY,LIVEKIT_API_SECRET=$LIVEKIT_API_SECRET,OPENAI_API_KEY=$OPENAI_API_KEY,DEEPGRAM_API_KEY=$DEEPGRAM_API_KEY
else
    echo "Usage: ./deploy.sh [local|cloud] [GCP_PROJECT_ID]"
fi