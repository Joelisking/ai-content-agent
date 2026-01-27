# Setup Guide for Claude Code

## Quick Start with Claude Code

This project is designed to work seamlessly with Claude Code. Follow these steps:

### 1. Extract the Project
```bash
unzip ai-content-agent.zip
cd ai-content-agent
```

### 2. Install Dependencies

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
cd ../frontend
npm install
```

### 3. Environment Setup

**Create backend/.env file:**
```bash
cd ../backend
cp .env.example .env
```

**Edit backend/.env and add your API key:**
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/ai-content-agent
ANTHROPIC_API_KEY=your_anthropic_api_key_here
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
SYSTEM_MODE=active
```

### 4. Start MongoDB

**Option 1: Docker (Recommended)**
```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

**Option 2: Local MongoDB**
```bash
# macOS (Homebrew)
brew services start mongodb-community

# Linux (systemd)
sudo systemctl start mongod
```

### 5. Seed the Database
```bash
cd backend
npm run seed
```

You should see:
```
✅ Connected to MongoDB
✅ Created sample brand: TechFlow Innovations
✅ Created system control: active
🎉 Database seeded successfully!
```

### 6. Run the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

Wait for:
```
✅ Connected to MongoDB
🚀 Server running on port 5000
🤖 AI Content Agent System Ready
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Wait for:
```
VITE v5.x.x ready in XXX ms
Local: http://localhost:3000/
```

### 7. Open in Browser
Navigate to: http://localhost:3000

---

## Project Structure for Claude Code

```
ai-content-agent/
│
├── backend/                    # Node.js + Express API
│   ├── src/
│   │   ├── models/
│   │   │   └── index.ts       # MongoDB schemas (Brand, Media, Content, System, Audit)
│   │   ├── services/
│   │   │   ├── aiAgent.service.ts    # Multi-step AI generation logic
│   │   │   └── posting.service.ts    # Scheduled posting with cron
│   │   ├── routes/
│   │   │   └── index.ts       # All REST API endpoints
│   │   ├── scripts/
│   │   │   └── seed.ts        # Database seeding script
│   │   └── server.ts          # Express app entry point
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
├── frontend/                   # React + Vite + TailwindCSS
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.tsx           # Stats overview
│   │   │   ├── ContentGeneration.tsx   # AI generation UI
│   │   │   ├── ApprovalQueue.tsx       # Review workflow
│   │   │   ├── MediaUpload.tsx         # File upload
│   │   │   └── SystemControl.tsx       # Control modes
│   │   ├── api/
│   │   │   └── client.ts      # API client with TypeScript types
│   │   ├── App.tsx             # Main app component
│   │   ├── main.tsx            # React entry point
│   │   └── index.css           # Tailwind styles
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
│
├── README.md                   # Complete documentation
├── ARCHITECTURE.md             # System design details
├── DEMO_SCRIPT.md             # 30-minute presentation guide
└── TROUBLESHOOTING.md         # Common issues

```

---

## Key Files to Understand

### 1. AI Agent Service (`backend/src/services/aiAgent.service.ts`)
This is the core AI logic with multi-step reasoning:
- **analyzeBrandContext()** - Step 1: Analyze brand voice
- **generatePlatformContent()** - Step 2: Generate platform-specific content
- **extractHashtags()** - Step 3: Optimize hashtags
- **regenerateContent()** - Handle feedback and regenerate

### 2. Posting Service (`backend/src/services/posting.service.ts`)
Handles scheduled posting with safety checks:
- **processScheduledPosts()** - Cron job running every minute
- **publishContent()** - Main posting logic with system mode checks
- **simulatePosting()** - Mock API calls (replace with real APIs)

### 3. API Routes (`backend/src/routes/index.ts`)
All REST endpoints:
- `/api/brand` - Brand management
- `/api/media` - File upload/retrieval
- `/api/content` - Generation, approval, posting
- `/api/system` - Control modes
- `/api/audit` - Activity logs

### 4. Database Models (`backend/src/models/index.ts`)
MongoDB schemas:
- **BrandConfig** - Brand voice and guidelines
- **MediaUpload** - Client media assets
- **ContentQueue** - Generated content with state machine
- **SystemControl** - Operation modes
- **AuditLog** - Complete action history

---

## Testing the System

### 1. Test Health Check
```bash
curl http://localhost:5000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-01-26T...",
  "uptime": 123.456
}
```

### 2. Test Content Generation
```bash
# Get brand ID from seed data
curl http://localhost:5000/api/brand

# Generate content (replace BRAND_ID)
curl -X POST http://localhost:5000/api/content/generate \
  -H "Content-Type: application/json" \
  -d '{
    "brandConfigId": "BRAND_ID",
    "platform": "linkedin",
    "userPrompt": "Announce our new AI tools"
  }'
```

### 3. View Generated Content
```bash
curl http://localhost:5000/api/content
```

---

## Common Claude Code Commands

### Start Both Servers
```bash
# In terminal 1
cd backend && npm run dev

# In terminal 2  
cd frontend && npm run dev
```

### View Logs
```bash
# Backend logs show:
🤖 Step 1: Analyzing brand voice...
🤖 Step 2: Generating platform content...
🤖 Step 3: Optimizing hashtags...
✅ Successfully posted to linkedin

# MongoDB logs
✅ Connected to MongoDB
```

### Reset Database
```bash
cd backend
npm run seed
```

### Rebuild Everything
```bash
# Backend
cd backend
rm -rf node_modules
npm install
npm run build

# Frontend
cd frontend
rm -rf node_modules
npm install
npm run build
```

---

## API Endpoints Reference

### Brand Management
- `GET /api/brand` - List all brands
- `POST /api/brand` - Create brand
- `GET /api/brand/:id` - Get brand details

### Media Upload
- `POST /api/media/upload` - Upload file (multipart/form-data)
- `GET /api/media` - List all media
- `GET /api/media/:id` - Get media details

### Content Operations
- `POST /api/content/generate` - Generate new content
  ```json
  {
    "brandConfigId": "string",
    "platform": "linkedin|instagram|twitter|facebook",
    "mediaIds": ["string"],
    "userPrompt": "string"
  }
  ```

- `POST /api/content/:id/regenerate` - Regenerate with feedback
  ```json
  {
    "feedback": "string",
    "performedBy": "string"
  }
  ```

- `GET /api/content` - List content (filter by status/platform)
- `POST /api/content/:id/approve` - Approve content
  ```json
  {
    "approvedBy": "string",
    "scheduledFor": "ISO 8601 date (optional)"
  }
  ```

- `POST /api/content/:id/reject` - Reject content
  ```json
  {
    "rejectedBy": "string",
    "reason": "string"
  }
  ```

- `POST /api/content/:id/post` - Post immediately
  ```json
  {
    "performedBy": "string"
  }
  ```

### System Control
- `GET /api/system/control` - Get current mode
- `POST /api/system/control` - Update mode
  ```json
  {
    "mode": "active|paused|manual-only|crisis",
    "changedBy": "string",
    "reason": "string (optional)"
  }
  ```

### Analytics
- `GET /api/dashboard/stats` - Dashboard statistics
- `GET /api/audit?limit=50` - Audit logs
- `GET /api/posting/stats?days=7` - Posting statistics

---

## Environment Variables

**backend/.env:**
```env
PORT=5000                                    # API server port
NODE_ENV=development                         # Environment
MONGODB_URI=mongodb://localhost:27017/ai-content-agent  # Database
ANTHROPIC_API_KEY=sk-ant-...                # Your Claude API key
UPLOAD_DIR=./uploads                         # Media upload directory
MAX_FILE_SIZE=10485760                       # 10MB file size limit
SYSTEM_MODE=active                           # Initial system mode
```

---

## Development Workflow

### 1. Add a New Platform
1. Update Platform type in `backend/src/models/index.ts`
2. Add platform guidelines in `backend/src/services/aiAgent.service.ts`
3. Add platform icon in frontend components

### 2. Integrate Real Social Media API
1. Replace `simulatePosting()` in `posting.service.ts`
2. Add OAuth flow for platform authentication
3. Store platform credentials in database
4. Handle rate limits and errors

### 3. Add Content Moderation
1. Create new service: `moderation.service.ts`
2. Call moderation API before approval
3. Block flagged content automatically
4. Log moderation results to audit trail

### 4. Add User Authentication
1. Install Passport.js or similar
2. Add User model
3. Protect routes with authentication middleware
4. Add role-based access control

---

## Troubleshooting

### MongoDB Connection Issues
```bash
# Check if MongoDB is running
docker ps | grep mongodb

# Or
pgrep mongod

# Start MongoDB
docker start mongodb
# Or
brew services start mongodb-community
```

### Port Already in Use
```bash
# Find and kill process on port 5000
lsof -ti:5000 | xargs kill -9

# Or port 3000
lsof -ti:3000 | xargs kill -9
```

### TypeScript Errors
```bash
# Rebuild TypeScript
cd backend
npm run build

# Or frontend
cd frontend
npm run build
```

### API Key Issues
```bash
# Verify API key is loaded
cd backend
node -e "require('dotenv').config(); console.log(process.env.ANTHROPIC_API_KEY)"
```

---

## Next Steps After Setup

1. ✅ Verify backend is running (check health endpoint)
2. ✅ Verify frontend is running (open browser)
3. ✅ Upload a test image
4. ✅ Generate content for LinkedIn
5. ✅ Approve the content
6. ✅ Test posting (will be simulated)
7. ✅ Try system control modes
8. ✅ Test regeneration with feedback

---

## Demo Preparation

Before your demo interview:

1. **Practice the full workflow** 3 times
2. **Test all system control modes**
3. **Prepare sample images** to upload
4. **Have architecture diagram** ready
5. **Know the codebase structure**
6. **Review common Q&A** in DEMO_SCRIPT.md

---

## Production Deployment (Future)

When ready to deploy:

1. Set up proper database (MongoDB Atlas)
2. Configure cloud storage (AWS S3/Cloudinary)
3. Add authentication/authorization
4. Integrate real social media APIs
5. Set up monitoring (Datadog/Sentry)
6. Configure CI/CD pipeline
7. Deploy to cloud (AWS/GCP/Azure)

---

For detailed architecture explanations, see ARCHITECTURE.md
For step-by-step demo guide, see DEMO_SCRIPT.md
For common issues, see TROUBLESHOOTING.md

Good luck with your demo! 🚀
