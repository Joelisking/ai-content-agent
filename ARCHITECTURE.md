# System Architecture & Design Decisions

## High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                              │
│                                                                   │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐    │
│  │   Dashboard    │  │    Content     │  │    System      │    │
│  │   Overview     │  │   Generation   │  │    Control     │    │
│  └────────────────┘  └────────────────┘  └────────────────┘    │
│                                                                   │
│  ┌────────────────┐  ┌────────────────┐                         │
│  │   Approval     │  │     Media      │                         │
│  │     Queue      │  │    Upload      │                         │
│  └────────────────┘  └────────────────┘                         │
│                                                                   │
│  React + Vite + TailwindCSS                                      │
└───────────────────────────┬──────────────────────────────────────┘
                            │ HTTP/REST
┌───────────────────────────▼──────────────────────────────────────┐
│                      API GATEWAY LAYER                            │
│                                                                   │
│  Express.js + TypeScript                                         │
│                                                                   │
│  ┌────────────────────────────────────────────────────┐         │
│  │             Route Handlers                          │         │
│  │  /brand  /media  /content  /system  /audit         │         │
│  └────────────────────────────────────────────────────┘         │
│                                                                   │
│  ┌────────────────────────────────────────────────────┐         │
│  │          Middleware Layer                           │         │
│  │  - CORS  - Body Parser  - Error Handler            │         │
│  │  - File Upload (Multer)  - Logging                 │         │
│  └────────────────────────────────────────────────────┘         │
└───────────────────────────┬──────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼──────┐  ┌────────▼────────┐  ┌──────▼──────┐
│   AI Agent   │  │    Posting      │  │   Media     │
│   Service    │  │    Service      │  │   Handler   │
└───────┬──────┘  └────────┬────────┘  └──────┬──────┘
        │                  │                   │
        │ Claude API       │ Cron Jobs        │ File System
        │                  │                   │
┌───────▼──────────────────▼───────────────────▼──────┐
│               DATA PERSISTENCE LAYER                 │
│                                                       │
│  MongoDB Collections:                                │
│  ┌─────────────────┐  ┌─────────────────┐          │
│  │ brand_configs   │  │ media_uploads   │          │
│  └─────────────────┘  └─────────────────┘          │
│  ┌─────────────────┐  ┌─────────────────┐          │
│  │ content_queue   │  │ system_control  │          │
│  └─────────────────┘  └─────────────────┘          │
│  ┌─────────────────┐                                │
│  │  audit_logs     │                                │
│  └─────────────────┘                                │
└───────────────────────────────────────────────────────┘
```

---

## Component Deep Dive

### 1. AI Agent Service

**Purpose**: Multi-step content generation with brand voice adaptation

**Architecture**:
```
User Request
    ↓
Step 1: Brand Voice Analysis
    ├─ Load brand configuration
    ├─ Analyze tone, audience, messages
    └─ Generate comprehensive voice guide
    ↓
Step 2: Platform-Specific Generation
    ├─ Apply platform guidelines (LinkedIn/Instagram/etc)
    ├─ Incorporate media context if provided
    ├─ Generate content with reasoning
    └─ Return structured output
    ↓
Step 3: Hashtag Optimization
    ├─ Extract/generate relevant hashtags
    ├─ Platform-specific limits
    └─ SEO-optimized selection
    ↓
Result: Complete Post Package
```

**Key Methods**:
- `analyzeBrandContext()` - Understand brand voice
- `generatePlatformContent()` - Create adapted content
- `extractHashtags()` - Optimize tags
- `regenerateContent()` - Incorporate feedback

**Why This Design?**
- Demonstrates actual agent reasoning (not just prompt wrapper)
- Allows inspection of each step
- Easy to debug and improve
- Extensible for new platforms

---

### 2. Posting Service

**Purpose**: Scheduled posting with safety controls

**Architecture**:
```
Cron Scheduler (runs every minute)
    ↓
Check System Control Mode
    ├─ Active? → Continue
    ├─ Paused? → Skip
    ├─ Manual-Only? → Skip
    └─ Crisis? → Block all
    ↓
Query Approved Content
    ├─ Status = 'approved'
    ├─ ScheduledFor <= now
    └─ Sort by scheduledFor ASC
    ↓
For Each Content:
    ├─ Validate status
    ├─ Check system mode again
    ├─ Call platform API (or simulate)
    ├─ Update status to 'posted'
    ├─ Log to audit trail
    └─ Handle errors gracefully
```

**Key Methods**:
- `processScheduledPosts()` - Main cron job
- `publishContent()` - Actual posting logic
- `simulatePosting()` - Mock API calls
- `postImmediately()` - Manual override

**Why This Design?**
- Safety-first: Multiple checks before posting
- Audit trail for compliance
- Easy to replace simulation with real APIs
- Error handling prevents cascade failures

---

### 3. Content Queue State Machine

**States and Transitions**:
```
                    ┌──────────┐
                    │ GENERATED│
                    └─────┬────┘
                          │
                    ┌─────▼────┐
                    │ PENDING  │
                    └─────┬────┘
                          │
            ┌─────────────┼─────────────┐
            │             │             │
      ┌─────▼────┐  ┌────▼─────┐  ┌───▼────┐
      │REGENERATE│  │ APPROVED │  │REJECTED│
      └─────┬────┘  └────┬─────┘  └───┬────┘
            │            │             │
            └────────────┼─────────────┘
                         │
                    ┌────▼─────┐
                    │ SCHEDULED│
                    └────┬─────┘
                         │
                    ┌────▼─────┐
                    │  POSTED  │
                    └──────────┘
```

**State Rules**:
1. PENDING → Can be approved, rejected, or regenerated
2. APPROVED → Can be posted immediately or scheduled
3. REJECTED → Can only be regenerated
4. SCHEDULED → Automatically moves to POSTED at scheduled time
5. POSTED → Terminal state (no further changes)

**Why This Design?**
- Clear state management prevents invalid transitions
- Easy to reason about content lifecycle
- Audit logs track all state changes
- Supports rollback scenarios

---

### 4. System Control Modes

**Mode Hierarchy** (Increasing Restriction):
```
ACTIVE
  ├─ AI generates content automatically
  ├─ Approvals required (as configured)
  ├─ Scheduled posting enabled
  └─ Full automation active

MANUAL-ONLY
  ├─ AI generates content automatically
  ├─ All approvals required
  ├─ Manual trigger for posting
  └─ No automatic posting

PAUSED
  ├─ Content generation continues
  ├─ No posting occurs
  ├─ Scheduler halted
  └─ Manual posting blocked

CRISIS
  ├─ All operations blocked
  ├─ Emergency shutdown
  ├─ Requires reason
  └─ Administrative override only
```

**Implementation**:
```typescript
interface SystemControl {
  mode: 'active' | 'paused' | 'manual-only' | 'crisis';
  lastChangedBy: string;
  lastChangedAt: Date;
  reason?: string;
  settings: {
    autoPostingEnabled: boolean;
    requireApprovalForAll: boolean;
    maxDailyPosts: number;
  };
}
```

**Why This Design?**
- Clear operational states
- Safety escalation path
- Audit trail of mode changes
- Production incident management

---

## Data Flow Diagrams

### Content Generation Flow

```
User Action: Upload Media
    ↓
Store in /uploads directory
    ↓
Create MediaUpload record in DB
    ↓
Return media ID to frontend
    ↓
User Action: Select brand, platform, media
    ↓
POST /api/content/generate
    ↓
Backend validates inputs
    ↓
AI Agent: Step 1 - Brand Analysis
    ↓
AI Agent: Step 2 - Content Generation
    ↓
AI Agent: Step 3 - Hashtag Optimization
    ↓
Create ContentQueue record (status: pending)
    ↓
Log to AuditLog
    ↓
Return generated content to frontend
    ↓
Display in Approval Queue
```

### Approval & Posting Flow

```
User views content in Approval Queue
    ↓
User Action: Approve
    ↓
POST /api/content/:id/approve
    ↓
Update status to 'approved'
    ↓
Optional: Set scheduledFor
    ↓
Log approval to AuditLog
    ↓
If scheduled: Wait for cron job
If immediate: POST /api/content/:id/post
    ↓
Posting Service checks system mode
    ↓
If blocked: Return error
If allowed: Proceed
    ↓
Simulate platform API call
    ↓
Update status to 'posted'
    ↓
Store post URL
    ↓
Log to AuditLog
    ↓
Return success
```

---

## Database Schema Design

### ContentQueue Collection

```javascript
{
  _id: ObjectId,
  platform: String (enum: linkedin|instagram|twitter|facebook),
  content: {
    text: String,
    hashtags: [String],
    mediaIds: [String]  // References to MediaUpload
  },
  status: String (enum: pending|approved|rejected|posted|scheduled),
  brandConfigId: String,  // Reference to BrandConfig
  generatedBy: String (enum: ai|manual),
  
  // Approval tracking
  approvedBy: String,
  approvedAt: Date,
  
  // Rejection tracking
  rejectedBy: String,
  rejectedAt: Date,
  rejectionReason: String,
  
  // Scheduling
  scheduledFor: Date,
  
  // Posting tracking
  postedAt: Date,
  postUrl: String,
  
  // Versioning
  metadata: {
    version: Number,
    previousVersions: [Object],  // Historical versions
    aiMetadata: {
      model: String,
      temperature: Number,
      promptTokens: Number,
      completionTokens: Number
    }
  },
  
  createdAt: Date,
  updatedAt: Date
}
```

**Why This Schema?**
- Complete lifecycle tracking
- Version history for auditing
- Flexible for new platforms
- Easy to query by status/platform
- AI metadata for debugging

---

## Technology Stack Rationale

### Backend: Node.js + Express + TypeScript

**Pros**:
- JavaScript ecosystem (npm packages)
- Excellent async/await for AI API calls
- TypeScript adds type safety
- Fast iteration cycle
- Large community

**Cons**:
- Not as performant as Go/Rust
- Can be memory-intensive at scale

**Why Chosen**: Speed of development, AI API integration ease, JavaScript full-stack

---

### Frontend: React + Vite + TailwindCSS

**Pros**:
- Component-based architecture
- Vite's lightning-fast HMR
- TailwindCSS for rapid UI development
- Large ecosystem of libraries
- Easy to build dashboards

**Cons**:
- Can be overkill for simple apps
- Bundle size concerns at scale

**Why Chosen**: Perfect for interactive dashboards, fast dev experience, easy to demo

---

### Database: MongoDB

**Pros**:
- Flexible schema (easy to iterate)
- JSON-like documents (matches JS objects)
- Good for rapid prototyping
- Easy to add new fields
- Horizontal scaling with sharding

**Cons**:
- No ACID transactions across documents
- Can lead to schema drift
- Not ideal for complex joins

**Why Chosen**: Flexible for evolving requirements, good for demos, easy to extend

---

### AI: Anthropic Claude API

**Pros**:
- Excellent at following instructions
- Long context window (200K tokens)
- Good at structured outputs
- Strong reasoning capabilities
- Safe and aligned

**Cons**:
- Cost per API call
- Latency (seconds per generation)
- Rate limits

**Why Chosen**: Best for multi-step reasoning, reliable outputs, production-grade

---

## Scalability Considerations

### Current Limits
- Single server: ~100 concurrent users
- MongoDB: ~1M documents before indexing needed
- File storage: Local disk (not cloud)
- AI API: Rate limited to Anthropic's tier

### Scaling Path

**Phase 1: Optimize Current Stack**
- Add MongoDB indexes
- Implement Redis caching
- Add CDN for media files
- Optimize API queries

**Phase 2: Horizontal Scaling**
- Load balancer (NGINX/AWS ALB)
- Multiple backend servers
- Shared Redis session store
- S3 for media storage
- MongoDB replica set

**Phase 3: Microservices**
- Content Generation Service
- Posting Service
- Media Service
- Auth Service
- Message queue (RabbitMQ/Kafka)

**Phase 4: Global**
- Multi-region deployment
- CDN everywhere
- Distributed database
- Event-driven architecture

---

## Security Considerations

### Current Implementation
✅ CORS configured
✅ File upload validation
✅ Environment variables
✅ Error handling (no stack traces exposed)

### Would Add for Production
- [ ] JWT authentication
- [ ] Role-based access control (RBAC)
- [ ] API rate limiting
- [ ] Input sanitization
- [ ] SQL injection prevention (already handled by Mongoose)
- [ ] XSS protection
- [ ] CSRF tokens
- [ ] Encryption at rest
- [ ] Secrets management (AWS Secrets Manager)
- [ ] DDoS protection
- [ ] Security headers (Helmet.js)
- [ ] Regular security audits

---

## Monitoring & Observability

### Would Add
- Application monitoring (Datadog, New Relic)
- Error tracking (Sentry)
- Log aggregation (ELK stack)
- Performance monitoring (APM)
- Uptime monitoring (Pingdom)
- Custom metrics (Prometheus + Grafana)

### Key Metrics to Track
- Content generation latency
- AI API success rate
- Posting success rate
- System mode changes
- Approval/rejection rates
- User engagement
- Error rates by endpoint

---

## Testing Strategy

### Current: Manual Testing

### Would Implement

**Unit Tests** (Jest)
- AI Agent service methods
- Posting service logic
- Database models
- Utility functions

**Integration Tests** (Supertest)
- API endpoints
- Database operations
- File uploads
- Error scenarios

**E2E Tests** (Playwright/Cypress)
- Complete user workflows
- Content generation → approval → posting
- System control mode changes
- Error handling

**Load Tests** (Artillery, k6)
- Concurrent content generation
- Multiple users
- Database performance
- API rate limits

---

## Deployment Architecture

### Development
```
Local Machine
├── MongoDB (Docker)
├── Backend (npm run dev)
└── Frontend (npm run dev)
```

### Production (AWS Example)
```
Route53 (DNS)
    ↓
CloudFront (CDN)
    ↓
ALB (Load Balancer)
    ├─ EC2 (Frontend) - Auto Scaling Group
    └─ EC2 (Backend) - Auto Scaling Group
        ↓
    ┌───┴───┐
    │       │
MongoDB Atlas    S3 (Media Storage)
    │
ElastiCache (Redis)
```

---

## Cost Estimation (Production)

**Infrastructure** (AWS):
- EC2 instances: $200/month
- MongoDB Atlas: $100/month
- S3 storage: $50/month
- CloudFront: $100/month
- Load balancer: $25/month
**Total**: ~$475/month

**AI API** (Anthropic):
- 10,000 posts/month
- ~1,000 tokens per generation
- ~$30/million tokens
**Total**: ~$300/month

**Grand Total**: ~$775/month for production-grade system

---

This architecture balances speed of development with production readiness, demonstrating both AI-native thinking and practical system design.
