# Troubleshooting Guide

## Common Issues and Solutions

### Installation Issues

#### Issue: `npm install` fails with peer dependency errors
**Solution:**
```bash
# Try with legacy peer deps flag
npm install --legacy-peer-deps

# Or use the force flag (not recommended but works)
npm install --force
```

#### Issue: TypeScript errors during build
**Solution:**
```bash
# Make sure TypeScript is installed
npm install -D typescript

# Clean and rebuild
rm -rf node_modules package-lock.json
npm install
npm run build
```

---

### Database Issues

#### Issue: Cannot connect to MongoDB
**Symptoms:**
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```

**Solutions:**
1. **Check if MongoDB is running:**
```bash
# macOS/Linux
pgrep mongod

# Or check the process
ps aux | grep mongod
```

2. **Start MongoDB:**
```bash
# macOS (if installed via Homebrew)
brew services start mongodb-community

# Linux (systemd)
sudo systemctl start mongod

# Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

3. **Verify connection:**
```bash
# Try connecting via mongo shell
mongosh mongodb://localhost:27017
```

#### Issue: Database seeding fails
**Solution:**
```bash
# Make sure MongoDB is running first
# Then run seed script
cd backend
npm run seed

# If it fails, manually check connection:
mongosh
> use ai-content-agent
> db.brand_configs.find()
```

---

### API Issues

#### Issue: Anthropic API key not working
**Symptoms:**
```
Error: Invalid API key
```

**Solutions:**
1. **Verify API key is set:**
```bash
cd backend
cat .env | grep ANTHROPIC_API_KEY
```

2. **Test API key directly:**
```bash
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: YOUR_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-sonnet-4-20250514","max_tokens":100,"messages":[{"role":"user","content":"Hello"}]}'
```

3. **Common mistakes:**
   - API key has spaces at the end
   - .env file not in correct location
   - Environment variables not loaded (restart the backend)

#### Issue: Content generation times out
**Symptoms:**
```
Error: Request timeout
```

**Solutions:**
1. **Increase timeout in Anthropic client:**
```typescript
// In aiAgent.service.ts
this.client = new Anthropic({ 
  apiKey,
  timeout: 60000 // 60 seconds
});
```

2. **Check Anthropic API status:**
Visit https://status.anthropic.com

3. **Try with simpler prompt:**
```typescript
// Test with minimal content
const response = await aiAgent.generateContent({
  brandConfig: brand,
  platform: 'linkedin'
  // No media, no prompt
});
```

---

### File Upload Issues

#### Issue: File upload fails with "Invalid file type"
**Solution:**
```typescript
// Check allowed file types in routes/index.ts
const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi/;

// Add more types if needed:
const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi|webp|heic/;
```

#### Issue: "File too large" error
**Solution:**
```bash
# Edit backend/.env
MAX_FILE_SIZE=10485760  # 10MB in bytes

# Or increase to 50MB
MAX_FILE_SIZE=52428800
```

#### Issue: Uploaded files not found
**Solution:**
```bash
# Check uploads directory exists
cd backend
ls -la uploads/

# If not, create it:
mkdir uploads

# Verify path in .env
UPLOAD_DIR=./uploads
```

---

### Frontend Issues

#### Issue: "Proxy error" when calling API
**Symptoms:**
```
[vite] http proxy error: ECONNREFUSED
```

**Solutions:**
1. **Verify backend is running:**
```bash
curl http://localhost:5000/health
```

2. **Check Vite proxy config:**
```typescript
// frontend/vite.config.ts should have:
server: {
  port: 3000,
  proxy: {
    '/api': {
      target: 'http://localhost:5000',
      changeOrigin: true,
    }
  }
}
```

3. **Restart both servers:**
```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```

#### Issue: UI not updating after API call
**Solution:**
```typescript
// Make sure you're calling fetchContent() after actions
const handleApprove = async (id: string) => {
  await apiClient.approveContent(id, 'admin');
  await fetchContent(); // This line is crucial
};
```

#### Issue: Tailwind styles not applying
**Solution:**
```bash
# Rebuild Tailwind
cd frontend
npm run dev -- --force

# Or clear Vite cache
rm -rf node_modules/.vite
npm run dev
```

---

### System Control Issues

#### Issue: System mode not changing
**Solution:**
```bash
# Check current system control
curl http://localhost:5000/api/system/control

# Manually update in MongoDB
mongosh
> use ai-content-agent
> db.system_controls.updateOne(
    {},
    { $set: { mode: 'active' } }
  )
```

#### Issue: Scheduled posts not posting
**Symptoms:** Content stays in "approved" status past scheduled time

**Solutions:**
1. **Check system mode:**
```bash
curl http://localhost:5000/api/system/control
# Should be "active"
```

2. **Check cron job is running:**
```bash
# Look for log messages every minute in backend console:
# "📋 Found X posts ready to publish"
```

3. **Manually trigger posting:**
```bash
curl -X POST http://localhost:5000/api/content/:id/post \
  -H "Content-Type: application/json" \
  -d '{"performedBy":"admin"}'
```

---

### Performance Issues

#### Issue: Content generation is slow (>30 seconds)
**Solutions:**
1. **Reduce prompt complexity:**
```typescript
// Simplify brand voice analysis
// Use fewer examples
// Reduce max_tokens
```

2. **Cache brand analysis:**
```typescript
// Store brand voice analysis in Redis
// Reuse for multiple content generations
```

3. **Use faster model:**
```typescript
// Switch from claude-sonnet to claude-haiku
model: 'claude-haiku-20250514'
```

#### Issue: Dashboard loads slowly
**Solutions:**
1. **Add MongoDB indexes:**
```javascript
// In backend/src/models/index.ts
ContentQueueSchema.index({ status: 1, createdAt: -1 });
ContentQueueSchema.index({ platform: 1, status: 1 });
```

2. **Limit query results:**
```typescript
// Only fetch recent content
const content = await ContentQueue.find()
  .sort({ createdAt: -1 })
  .limit(100);
```

---

### Demo Day Issues

#### Issue: AI response is unexpected/incorrect
**Solutions:**
1. **Have backup pre-generated content ready**
2. **Show the code and explain the reasoning**
3. **Demonstrate error handling**
4. **Regenerate with different parameters**

#### Issue: Demo crashes during presentation
**Solutions:**
1. **Keep backup recording of working demo**
2. **Have screenshots of key features**
3. **Walk through code instead**
4. **Explain architecture from diagrams**

---

## Quick Diagnostics

### Check if everything is running:
```bash
# Check backend
curl http://localhost:5000/health

# Check frontend
curl http://localhost:3000

# Check MongoDB
mongosh --eval "db.serverStatus()"

# Check environment variables
cd backend && cat .env
```

### View logs:
```bash
# Backend logs (in terminal running backend)
# Look for:
# - ✅ Connected to MongoDB
# - 🚀 Server running on port 5000
# - 🤖 Step 1: Analyzing brand voice...

# Check database collections
mongosh ai-content-agent --eval "db.getCollectionNames()"
```

### Reset everything:
```bash
# Stop all services
# Ctrl+C in all terminals

# Clear database
mongosh ai-content-agent --eval "db.dropDatabase()"

# Reinstall dependencies
cd backend && rm -rf node_modules && npm install
cd ../frontend && rm -rf node_modules && npm install

# Reseed database
cd backend && npm run seed

# Restart services
cd backend && npm run dev
cd frontend && npm run dev
```

---

## Getting Help

### Check these resources:
1. README.md - Complete setup guide
2. ARCHITECTURE.md - System design details
3. DEMO_SCRIPT.md - Presentation guide
4. Backend console logs - Error details
5. Browser DevTools console - Frontend errors
6. MongoDB logs - Database issues

### Common log patterns:
```
✅ - Success
❌ - Error (action failed)
⚠️  - Warning (needs attention)
🤖 - AI agent activity
📅 - Scheduler activity
📋 - Processing activity
```

---

## Emergency Fixes

### If nothing works:
```bash
# Nuclear option - start completely fresh
rm -rf ai-content-agent
# Re-clone/download the project
# Follow setup from scratch
```

### If demo day is in 5 minutes:
1. Have screenshots ready
2. Have architecture diagram ready
3. Have code pulled up in IDE
4. Explain the system conceptually
5. Walk through code logic
6. Show error handling
7. Discuss production path

**Remember:** Explaining the architecture and design decisions is more valuable than a perfect demo. If something breaks, stay calm and pivot to discussing the code and reasoning.

---

Good luck! 🚀
