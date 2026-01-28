# AI Content Agent Backend - GCP Deployment Guide

This guide describes how to deploy the containerized backend to Google Cloud Run.

## Prerequisites

1.  **Google Cloud Project**: Created and billing enabled.
2.  **gcloud CLI**: Installed and initialized (`gcloud init`).
3.  **APIs Enabled**:
    - Cloud Run API
    - Artifact Registry API
    - Cloud Build API

## 1. Setup Environment

Set your project variables:

```bash
export PROJECT_ID="your-project-id"
export REGION="us-central1"
export APP_NAME="ai-content-agent-backend"
export REPO_NAME="ai-agent-repo"
```

Create an Artifact Registry repository (if not exists):

```bash
gcloud artifacts repositories create $REPO_NAME \
    --repository-format=docker \
    --location=$REGION \
    --description="Docker repository for AI Content Agent"
```

## 2. Build and Push Image

**Option A: Using Cloud Build (Recommended)**
This builds the image directly in the cloud, avoiding local bandwidth usage.

```bash
# Run from the /backend directory
gcloud builds submit --tag $REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/$APP_NAME:latest .
```

**Option B: Build Locally and Push**

```bash
# Configure docker auth
gcloud auth configure-docker $REGION-docker.pkg.dev

# Build
docker build -t $REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/$APP_NAME:latest .

# Push
docker push $REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/$APP_NAME:latest
```

## 3. Deploy to Cloud Run

Deploy the service using the pushed image. You will need to inject your secrets (API keys) as environment variables.

**Recommended**: Use Google Secret Manager for sensitive keys (`OPENAI_API_KEY`, `MONGODB_URI`, etc.) instead of plain text vars.

### Deploy Command (Basic)

```bash
gcloud run deploy $APP_NAME \
    --image $REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/$APP_NAME:latest \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --set-env-vars NODE_ENV=production \
    --set-env-vars MONGODB_URI="your-mongodb-uri" \
    --set-env-vars OPENAI_API_KEY="your-key" \
    --set-env-vars CLOUDINARY_CLOUD_NAME="your-cloud-name" \
    --set-env-vars CLOUDINARY_API_KEY="your-api-key" \
    --set-env-vars CLOUDINARY_API_SECRET="your-secret" \
    --set-env-vars FRONTEND_URL="https://your-frontend-url.com"
```

### Note on MongoDB

If using MongoDB Atlas, ensure your cluster IP whitelist includes `0.0.0.0/0` (or setup VPC peering) since Cloud Run uses dynamic IPs.

## 4. Verification

After deployment, Cloud Run will output a Service URL (e.g., `https://ai-content-agent-backend-xyz-uc.a.run.app`).

Test the health check:

```bash
curl https://YOUR_SERVICE_URL/health
```
