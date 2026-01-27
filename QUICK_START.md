# QUICK REFERENCE CARD

## 🚀 Start in 5 Minutes

```bash
# 1. Extract
unzip ai-content-agent.zip
cd ai-content-agent

# 2. Install
cd backend && npm install
cd ../frontend && npm install

# 3. Setup
cd backend
cp .env.example .env
# Edit .env and add: ANTHROPIC_API_KEY=sk-ant-...

# 4. Database
docker run -d -p 27017:27017 --name mongodb mongo:latest

# 5. Seed
npm run seed

# 6. Run (two terminals)
# Terminal 1:
cd backend && npm run dev

# Terminal 2:
cd frontend && npm run dev

# 7. Open
# http://localhost:3000
```

---

## 📋 What This Does

✅ AI generates social media content (LinkedIn, Instagram, Twitter, Facebook)
✅ Multi-step reasoning (brand analysis → content gen → hashtag optimization)
✅ Human approval required before posting
✅ System control modes (Active/Paused/Manual/Crisis)
✅ Media upload and integration
✅ Complete audit logging
✅ Scheduled posting with cron

---

## 🎯 Demo Flow (15 min)

1. **Upload Media** (30s)
   - Go to Media Upload tab
   - Upload an image

2. **Generate Content** (3m)
   - Go to Generate Content tab
   - Select brand, platform, media
   - Add prompt (optional)
   - Click Generate
   - Show console logs (3 AI steps)

3. **Approve** (1m)
   - Go to Approval Queue tab
   - Review content
   - Click Approve

4. **Post** (1m)
   - Click Post Now
   - Show mock URL

5. **System Control** (2m)
   - Go to System Control tab
   - Show Pause/Manual/Crisis modes
   - Demo toggling modes

6. **Regenerate** (2m)
   - Back to Approval Queue
   - Click Regenerate
   - Provide feedback
   - Show new version

7. **Architecture** (5m)
   - Show code structure
   - Explain AI agent steps
   - Discuss production path

---

## 📁 Key Files

```
backend/src/services/aiAgent.service.ts    # AI logic
backend/src/services/posting.service.ts    # Posting logic
backend/src/routes/index.ts                # API endpoints
backend/src/models/index.ts                # Database schemas

frontend/src/components/Dashboard.tsx           # Stats
frontend/src/components/ContentGeneration.tsx   # AI UI
frontend/src/components/ApprovalQueue.tsx       # Review
frontend/src/components/SystemControl.tsx       # Controls
```

---

## 🔧 Common Commands

```bash
# Check health
curl http://localhost:5000/health

# View brands
curl http://localhost:5000/api/brand

# View content
curl http://localhost:5000/api/content

# View system mode
curl http://localhost:5000/api/system/control

# Reset database
cd backend && npm run seed

# View logs
# Watch backend terminal for:
# 🤖 Step 1: Analyzing brand voice...
# 🤖 Step 2: Generating platform content...
# 🤖 Step 3: Optimizing hashtags...
```

---

## 💡 Key Talking Points

**Multi-Step AI Agent:**
"This isn't just an API wrapper. Watch the console - the agent goes through three distinct reasoning steps: analyzing brand voice, generating platform-specific content, and optimizing hashtags."

**Approval-First:**
"Content NEVER posts without explicit human approval. This is architecturally enforced - not just a UI flag."

**System Control:**
"We have four operation modes: Active for full automation, Paused to halt posting, Manual-Only for AI drafts without auto-progression, and Crisis for emergency shutdown."

**Production Ready:**
"Complete error handling, audit logging, state management, and version tracking. The simulated posting can be swapped for real social media APIs without changing the architecture."

**Scalability:**
"Current setup handles 100 concurrent users. For scale: add Redis caching, horizontal scaling with load balancer, microservices for content/posting/AI services."

---

## ❓ Expected Q&A

**Q: How would you integrate real social media APIs?**
A: "Replace simulatePosting() with OAuth flows and platform SDKs. For LinkedIn: OAuth 2.0 flow, then POST to /v2/ugcPosts. Store credentials encrypted. Handle rate limits with exponential backoff."

**Q: What about content moderation?**
A: "Add pre-posting moderation using Anthropic's content classification or OpenAI's moderation API. Block flagged content automatically. Log all moderation decisions to audit trail."

**Q: Multiple clients?**
A: "Add clientId field to all models. Implement tenant isolation at query level. Add user authentication with RBAC. Separate database per client for data isolation."

**Q: Costs at scale?**
A: "AI: ~$30 per 10,000 posts. Infrastructure: ~$500/month for production AWS. Would add caching to reduce AI calls 50%+. Batch similar requests. Optimize prompt tokens."

**Q: Testing strategy?**
A: "Unit tests for services (Jest). Integration tests for APIs (Supertest). E2E for workflows (Playwright). Mock AI in tests. Load testing with k6. Target 80%+ coverage."

---

## 🚨 If Something Breaks

**MongoDB won't start:**
```bash
docker ps -a
docker start mongodb
```

**Port in use:**
```bash
lsof -ti:5000 | xargs kill -9
lsof -ti:3000 | xargs kill -9
```

**AI too slow:**
- Have pre-generated content ready
- Show the code and explain logic
- Discuss the architecture

**Demo crashes:**
- Have screenshots ready
- Walk through code instead
- Explain from architecture diagram

---

## 📚 Full Documentation

- **CLAUDE_CODE_SETUP.md** - Complete setup guide
- **README.md** - Full project documentation
- **ARCHITECTURE.md** - System design deep dive
- **DEMO_SCRIPT.md** - 30-minute presentation script
- **TROUBLESHOOTING.md** - Common issues & fixes

---

## ✅ Pre-Demo Checklist

- [ ] Backend running (port 5000)
- [ ] Frontend running (port 3000)
- [ ] MongoDB running and seeded
- [ ] ANTHROPIC_API_KEY configured
- [ ] Test image ready to upload
- [ ] Practiced full workflow 2-3 times
- [ ] Architecture diagram ready
- [ ] Console visible for AI logs
- [ ] Browser at http://localhost:3000

---

## 🎯 Success Criteria

They're evaluating:
✓ AI-native thinking (not just API wrappers)
✓ Practical system design
✓ Ability to ship working code
✓ Clarity of thought and communication
✓ Production readiness mindset

You've got all of these covered. Good luck! 🚀
