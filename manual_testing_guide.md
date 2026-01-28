# Manual Testing Guide

This guide allows you to manually verify every feature of the AI Content Agent, ensuring the system meets all case study requirements.

## Prerequisites

- backend running (`npm run dev` in `/backend`)
- frontend running (`npm run dev` in `/frontend`)
- Browser open at `http://localhost:3000`

---

## 1. Client Media Upload

**Case Study Requirement**: "Upload own photos/videos... use as inputs"

### Test Steps:

1. Navigate to the **Media** tab (or "Upload" section).
2. Click **Upload Media**.
3. Select an image file (JPG/PNG) from your computer.
4. **Verify**: The image appears in the media grid.
5. **Verify**: Hovering over the image shows valid metadata (size, type).
6. **Edge Case**: Try uploading a non-image file (e.g., PDF) if restriction is implemented to see error handling, or try a very large file.

---

## 2. AI Content Creation

**Case Study Requirement**: "Generating platform-ready content... text mandatory... adapting tone"

### Test Steps:

1. Navigate to **Generate** / **Create Content**.
2. **Select Brand**: Choose a brand profile (e.g., "TechFlow").
3. **Select Platform**: Choose **LinkedIn**.
4. **Add Media**: Select the image you just uploaded in Step 1.
5. **Input Prompt**: Enter "Announce our new AI agent feature that saves time."
6. Click **Generate**.
7. **Observe**: Loading spinner should appear (optionally showing "Analyzing...", "Generating...").
8. **Verify Output**:
   - Is the tone professional (LinkedIn style)?
   - Does it mention the image context?
   - Are there hashtags included (e.g., #AI #Productivity)?
9. **Repeat**: Change platform to **Instagram** and regenerate.
   - **Verify**: Is the tone more casual/visual? Are hashtags different?

---

## 3. Approval Workflow (Hard Gate)

**Case Study Requirement**: "No content published without explicit human approval... clearly enforced"

### Test Steps:

1. After generation, the content should appear in the **Approval Queue** (status: `PENDING`).
2. **Tab Check**: Verify it appears under the "Pending" filter.
3. **Action: Edit/Regenerate** (Optional):
   - Click **Regenerate**.
   - Add feedback: "Make it more exciting."
   - Verify a new version is created.
4. **Action: Reject**:
   - Find a pending item.
   - Click **Reject**.
   - Enter reason: "Too generic."
   - **Verify**: Item moves to "Rejected" tab. status is `REJECTED`.
5. **Action: Approve**:
   - Find a pending item.
   - Click **Approve**.
   - **Verify**: Item moves to "Approved" tab. Status is `APPROVED`.
   - **Verify**: It has NOT been posted yet (unless you selected "Post Now").

---

## 4. Scheduling & Automated Posting

**Case Study Requirement**: "Automated posting... simulated posting pipeline... scheduling"

### Test Steps (Scheduling):

1. In **Approval Queue**, find a Pending item.
2. Click **Approve**.
3. Select a **Date/Time** in the future (e.g., 5 mins from now).
4. Click **Schedule**.
5. **Verify**: Item status is `APPROVED` (or `SCHEDULED` if distinctly tracked).
6. **Wait**: Wait for the cron job (runs every minute).
7. **Verify**: After time passes, status changes to `POSTED`.

### Test Steps (Simulated Posting):

1. Find an `APPROVED` item.
2. Click **Post Now**.
3. **Verify**: Status changes to `POSTED`.
4. **Verify**: A "link" is generated (simulated post URL).
5. Open the link to confirm it "exists" (or just verify the UI link presence).

---

## 5. Control & Safety Mechanisms

**Case Study Requirement**: "Instant Pause... Manual-Only... Crisis Mode"

### Test Steps:

1. Navigate to **System Control** in the sidebar.
2. **Test Active Mode** (Default):
   - **Verify**: Mode is **ACTIVE**.
   - **Action**: Schedule a post for 1 minute in the future.
   - **Verify**: Post is automatically published when time arrives.

3. **Test Pause Mode**:
   - **Action**: Switch mode to **PAUSED** and provide a reason.
   - **Test Manual Generation**: Go to "Generate", try to generate new content.
     - **Verify**: FAILS with error "System paused".
   - **Test Scheduled Drafting**: (Logic Check) Scheduled draft generation is BLOCKED.
   - **Test Auto-Posting**: Schedule a pending post for now.
     - **Verify**: Post remains in `SCHEDULED` status (Cron is stopped).
   - **Test Manual Override**: Go to Approved tab, click **Post Now**.
     - **Verify**: SUCCEEDS (Manual override allowed).

4. **Test Manual-Only Mode**:
   - **Action**: Switch mode to **MANUAL-ONLY**.
   - **Test Manual Generation**: Try to generate content.
     - **Verify**: WORKS (Drafts allowed).
   - **Test Auto-Posting**: Schedule a post for now or wait for a scheduled time.
     - **Verify**: Post remains in `SCHEDULED` status (Auto-posting blocked).
   - **Test Manual Override**: Click **Post Now**.
     - **Verify**: SUCCEEDS.
   - **Key Distinction**: The system continues to "think" (generate drafts if scheduled) but cannot "act" (post) without you.

5. **Test Crisis Mode**:
   - **Action**: Switch mode to **CRISIS** (requires confirmation).
   - **Test Generation**: Try to generate.
     - **Verify**: FAILS with "System in crisis mode".
   - **Test Posting**: Try to **Post Now**.
     - **Verify**: FAILS with "System in crisis mode - all posting blocked".
     - **Verify**: UI shows prominent red warning/status.

6. **Reset**: Switch back to **ACTIVE** mode.

---

## 6. Audit Trail (Documentation)

**Case Study Requirement**: "Clear explanation... admin access"

### Test Steps:

1. Perform various actions (Approve, Reject, Change Mode).
2. Check the **Console Logs** (backend terminal) to see if these actions are logged.
3. If there is an **Audit Log** UI page, check that your actions appear there with timestamps.
