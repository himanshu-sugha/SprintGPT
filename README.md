#  SprintGPT - AI Sprint Retrospective Engine

> Your AI-powered Sprint Engineer that analyzes sprint data like F1 telemetry. Built for Codegeist 2025: Atlassian Williams Racing Edition.

**🏆 Prize Categories:**
- **Apps for Software Teams** - Helps development teams operate like a pit crew with data-driven retrospectives
- **Best Rovo Apps** - Uses `rovo:agent` and `action` modules to enable natural language sprint analysis

> **⚠️ Important:** SprintGPT works with **Scrum projects with active sprints**. For Kanban-only projects, demo data is displayed to showcase features.

---

## 1. What is SprintGPT?

SprintGPT is an **AI-powered sprint retrospective engine** built on Atlassian Forge that:

1. **Analyzes sprint metrics** with health scores and velocity tracking
2. **Detects patterns** across multiple sprints automatically
3. **Generates insights** for more effective retrospectives
4. **Creates Confluence pages** with one click from Jira
5. **Automates triggers** on sprint completion

---

## 2. Problem Statement

Sprint retrospectives often fail to deliver value. Teams struggle with:

| Problem | Impact |
|---------|--------|
| **Subjective discussions** | No data to back up observations |
| **Recurring issues** | Same problems resurface every sprint |
| **Forgotten action items** | Retro improvements never get implemented |
| **No historical view** | Can't track improvement over time |
| **Manual prep work** | Scrum masters spend hours gathering metrics |

**The Cost:**
- Average retro takes 1-2 hours with little actionable outcome
- Teams repeat the same mistakes sprint after sprint
- Velocity stagnates without data-driven insights

**SprintGPT solves this** by automatically analyzing your sprint data and providing AI-powered insights for more effective retrospectives.

---

## 3. Features & Implementation

| Feature | How It Works | File/Location |
|---------|--------------|---------------|
| **Sprint Dashboard** | Real-time metrics with health score (0-100) | `static/dashboard/src/App.js` |
| **Rovo AI Agent** | Natural language sprint analysis chat | `manifest.yml` (rovo:agent) |
| **Pattern Detection** | Identifies trends across sprints | `src/index.js` |
| **Confluence Integration** | Creates formatted retro pages in Confluence | `createConfluencePage` |
| **Sprint Trigger** | Auto-analysis on sprint completion | `onSprintCompleteHandler` |

---

## 4. AI Capabilities (Rovo Agent)

### Meet "Sprint Engineer" 🏎️

The **Sprint Engineer** is your AI co-pilot for sprint retrospectives. Think of it like an F1 race engineer analyzing telemetry data to help the team understand performance and improve.

**Agent Persona:**
- **Data-Driven:** Always backs up insights with specific metrics
- **Constructive:** Focuses on improvements, not blame
- **Actionable:** Every observation leads to a possible action
- **F1-Themed:** Uses racing metaphors (pit stops, lap times, qualifying)

### Available Actions

| Action | Type | Purpose |
|--------|------|---------|
| `analyze-current-sprint` | GET | Full sprint metrics analysis |
| `compare-two-sprints` | GET | Side-by-side sprint comparison |
| `identify-patterns` | GET | Detect trends across history |
| `generate-retro-report` | CREATE | Generate Confluence report |
| `create-action-item` | CREATE | Create Jira issue from insight |

### Conversation Starters
- "Analyze our last sprint's performance"
- "Why did we miss our sprint goal?"
- "What are our recurring blockers?"
- "Generate retro talking points for today"
- "Compare this sprint to our best sprint"

### Example Conversation

**You:** "Why did our last sprint underperform?"

**Sprint Engineer:**
```
🏎️ TELEMETRY SUMMARY: Sprint 42

| Metric        | Value   | vs Average |
|---------------|---------|------------|
| 📈 Velocity   | 34 pts  | ↓ 23% below |
| ✅ Completion | 71%     | ↓ from 85% |
| ⏱️ Cycle Time | 4.2 days| ↑ slower   |
| 🚧 Blockers   | 4       | ↑ 3 more   |

💡 ENGINEER'S INSIGHT:
Scope creep was the main factor - 8 stories added mid-sprint.
Review bottleneck - 3 stories spent 5+ days in review.

🏁 NEXT LAP RECOMMENDATION:
1. Implement sprint scope lock after day 2
2. Add daily review pairing slot

Should I create action items for these?
```

### Technical Implementation

```yaml
# manifest.yml
rovo:agent:
  - key: sprint-engineer
    name: Sprint Engineer
    prompt: resources/prompts/sprint-engineer.md
    actions:
      - analyze-current-sprint
      - compare-two-sprints
      - identify-patterns
      - generate-retro-report
      - create-action-item
```

---

## 5. Screenshots

**Sprint Intelligence Dashboard:**
![Sprint Dashboard](static/screenshot_dashboard.png)

**One-Click Confluence Page Creation:**
![Confluence Modal](static/screenshot_modal.png)

**Confluence Report Page:**
![Confluence Page](static/screenshot_confluence_page.png)

**Insert Sprint Report Action:**
![Confluence Action](static/screenshot_confluence_action.png)


---

## 6. Sprint Health Algorithm

Our health score uses a weighted calculation:

### 6.1 Scoring Weights
| Factor | Weight | How It's Scored |
|--------|--------|-----------------|
| Completion Rate | 40% | % of issues done vs total |
| Blocked Issues | 25% | Penalty for blockers (0 = 100 pts) |
| Velocity vs Target | 20% | Story points completed |
| Cycle Time | 15% | Average days per issue |

### 6.2 Health Score Ranges
| Score | Rating | Color |
|-------|--------|-------|
| 80-100 | Excellent | 🟢 Green |
| 60-79 | Good | 🟡 Orange |
| 0-59 | Needs Attention | 🔴 Red |

**Formula:** `Health = (CompletionRate × 0.4) + (100 - BlockerPenalty) × 0.25 + (VelocityScore × 0.2) + (CycleTimeScore × 0.15)`

---

## 7. How It Works (User Flow)

```
+-------------------------------------------------------------+
|  1. INSTALL                                                 |
|  --> Add SprintGPT to your Jira project                     |
+-------------------------------------------------------------+
|  2. VIEW DASHBOARD                                          |
|  --> See health score, velocity, completion rate instantly  |
+-------------------------------------------------------------+
|  3. ANALYZE                                                 |
|  --> Click "Analyze Current Sprint" for deep insights       |
+-------------------------------------------------------------+
|  4. DETECT PATTERNS                                         |
|  --> AI identifies trends across your sprint history        |
+-------------------------------------------------------------+
|  5. CREATE CONFLUENCE PAGE                                  |
|  --> "Create Confluence Page" button publishes formatted    |
|      retrospective directly to your Confluence space        |
+-------------------------------------------------------------+
```

---

## 8. Architecture

```
+-------------------------------------------------------------+
|                    ATLASSIAN FORGE                          |
+-------------------------------------------------------------+
|  UI Layer                                                   |
|  [Dashboard] [Rovo Agent] [Confluence Action] [Trigger]     |
+-------------------------------------------------------------+
|  Function Layer (Node.js)                                   |
|  +----------------+  +----------------+  +----------------+  |
|  | analyzeHandler |  | compareHandler |  | reportHandler  |  |
|  +----------------+  +----------------+  +----------------+  |
+-------------------------------------------------------------+
|  API Layer                                                  |
|  [Jira Agile API] [Forge Storage] [Confluence API]          |
+-------------------------------------------------------------+
```

---

## 9. Tech Stack

| Category | Technology |
|----------|------------|
| **Platform** | Atlassian Forge |
| **Runtime** | Node.js 22.x |
| **Frontend** | React 18, Custom UI |
| **AI** | Rovo Agent with custom actions |
| **Storage** | Forge Storage API |
| **APIs** | Jira Agile REST API |

---

## 10. Demo Data Support

**The app works 100% even without sprint data.** Every feature has a fallback:

| Scenario | Behavior |
|----------|----------|
| **Active sprint with issues** | Shows real metrics from Jira API |
| **Empty project** | Shows demo data for full UI preview |
| **Manual demo** | "Load Demo Data" button shows sample metrics |

> **Core features work fully with or without active sprints.**

---

## 11. Requirements

SprintGPT works best with:
- **Scrum projects** with active or recently closed sprints
- **Team-managed projects** with Agile boards
- Sprints containing issues with status tracking

> **Note:** For Kanban-only projects without sprints, demo data will be displayed to showcase the dashboard features.

---

## 12. Quick Start

### Option 1: One-Click Install (For Judges)

👉 **[Install SprintGPT](https://developer.atlassian.com/console/install/045c5e5c-6494-448c-a173-f08478bc6e01?signature=AYABeCO3ZBAR2fJB%2FrLYR1LSqa8AAAADAAdhd3Mta21zAEthcm46YXdzOmttczp1cy13ZXN0LTI6NzA5NTg3ODM1MjQzOmtleS83MDVlZDY3MC1mNTdjLTQxYjUtOWY5Yi1lM2YyZGNjMTQ2ZTcAuAECAQB4IOp8r3eKNYw8z2v%2FEq3%2FfvrZguoGsXpNSaDveR%2FF%2Fo0BtV%2FfigLRmf%2Fl08C0I6xCqgAAAH4wfAYJKoZIhvcNAQcGoG8wbQIBADBoBgkqhkiG9w0BBwEwHgYJYIZIAWUDBAEuMBEEDKtAEKRgdwrceOmOIgIBEIA741wYBUvrLpqwZUesjIyVorQrpS0zveit%2B%2F9hydsQLVWJMr2BEesaKZREURsjCqjakSHqPm2AzbFgFQ8AB2F3cy1rbXMAS2Fybjphd3M6a21zOmV1LXdlc3QtMTo3MDk1ODc4MzUyNDM6a2V5LzQ2MzBjZTZiLTAwYzMtNGRlMi04NzdiLTYyN2UyMDYwZTVjYwC4AQICAHijmwVTMt6Oj3F%2B0%2B0cVrojrS8yZ9ktpdfDxqPMSIkvHAHkTfJwtmiFX0tzWewIWW1kAAAAfjB8BgkqhkiG9w0BBwagbzBtAgEAMGgGCSqGSIb3DQEHATAeBglghkgBZQMEAS4wEQQM0OquKUfxFfVth1zsAgEQgDvHeS4qKIKaf%2FgWlZ3AIi5eNVI1lZ4r%2FocQ7QYoHUj%2BMaDIM5%2BfJejRD%2BcSkouKYOxNMXyfiozoyF6wtQAHYXdzLWttcwBLYXJuOmF3czprbXM6dXMtZWFzdC0xOjcwOTU4NzgzNTI0MzprZXkvNmMxMjBiYTAtNGNkNS00OTg1LWI4MmUtNDBhMDQ5NTJjYzU3ALgBAgIAeLKa7Dfn9BgbXaQmJGrkKztjV4vrreTkqr7wGwhqIYs5Aecpm%2BSVcCC%2B6kUuxGBjBvgAAAB%2BMHwGCSqGSIb3DQEHBqBvMG0CAQAwaAYJKoZIhvcNAQcBMB4GCWCGSAFlAwQBLjARBAz9DSsrv41V2CnUqWICARCAO%2FAUSlOMbxk34Ycfwv29SI8BoNHa3F3gNziveCljDNHC3Z0EpGji3whw3FALL662EP1NJ1GOXSrvo9IeAgAAAAAMAAAQAAAAAAAAAAAAAAAAAFO333g23TmchMazdBW5Gqf%2F%2F%2F%2F%2FAAAAAQAAAAAAAAAAAAAAAQAAADKXb%2FgPDpT0RrgTtcoRiKt3MEdil5aUpmD7NHq8pvN924Epr7WnaHQSQWHBAzWTVn80B8hdH%2BneKxRKROhPODneqQ0%3D&product=confluence&product=jira)**

1. Click the link above
2. Select your Atlassian site
3. Click "Get app"
4. Go to: **Jira Project → Apps → Sprint Intelligence**
5. To use Rovo: **Open Rovo Chat → Select "Sprint Engineer"**
6. To use Confluence: **Open any Page → Actions (...) → Insert Sprint Retro Report**

> **💡 Tip:** For best results, use a **Scrum project with an active sprint**. Click "Analyze Current Sprint" to fetch real data. Kanban-only projects will display demo data.

> **Note:** Installation links have temporary signatures (valid ~7-14 days). If the link expires, use Option 2 below or contact the developer for a fresh link.

### Option 2: Clone & Deploy (For Developers)

```bash
# 1. Clone the repository
git clone https://github.com/himanshu-sugha/SprintGPT
cd SprintGPT

# 2. Install dependencies
npm install
cd static/dashboard && npm install && npm run build && cd ../..

# 3. Login to Forge
forge login

# 4. Register as your own app
forge register

# 5. Deploy
forge deploy
# 6. Install on your Jira AND Confluence sites
forge install --product jira --site YOUR-SITE.atlassian.net
forge install --product confluence --site YOUR-SITE.atlassian.net


# 7. Open the app
# Go to: **Jira Project → Apps → Sprint Intelligence**
# To use Rovo: **Open Rovo Chat → Select "Sprint Engineer"**
# To use Confluence: **Open any Page → Actions (...) → Insert Sprint Retro Report**
```

### Prerequisites
- Node.js 18+
- Atlassian Forge CLI (`npm install -g @forge/cli`)
- Atlassian Cloud account with Jira access
- Scrum project with at least one sprint

---

## 12. Project Structure

```
SprintGPT/
├── manifest.yml                 # Forge app configuration
├── package.json                 # Root dependencies
├── src/
│   └── index.js                 # All function handlers (700+ lines)
├── resources/
│   └── prompts/
│       └── sprint-engineer.md   # Rovo agent personality
└── static/
    └── dashboard/
        ├── package.json         # React dependencies
        └── src/
            ├── App.js           # Dashboard component
            └── index.css        # F1-themed styling
```

---

## 13. Additional Screenshots

**Real Sprint Data Analysis (External Site):**
![Real Data](static/screenshot_real_data.png)

**Sprint Backlog with Issues:**
![Sprint Backlog](static/screenshot_sprint_backlog.png)

---

## 14. Author

**Himanshu Sugha**  
Email: himanshusugha@gmail.com  
GitHub: [@himanshu-sugha](https://github.com/himanshu-sugha)

---

## 14. License

MIT License - Built for Codegeist 2025

---

<p align="center">
  <b>SprintGPT - Analyze Sprints Like F1 Telemetry 🏎️</b>
</p>
