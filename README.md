# 🛡️ KYC & AML Compliance Orchestrator

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-cyan)](https://tailwindcss.com/)
[![React Flow](https://img.shields.io/badge/React_Flow-11-purple)](https://reactflow.dev/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7-green)](https://www.mongodb.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue)](https://www.docker.com/)

A powerful, **low-code orchestration engine** designed to streamline **Know Your Customer (KYC)**, **Anti-Money Laundering (AML)**, and **Transaction Monitoring (TM)** workflows.

Built for fintechs and banks to visually design, test, and deploy complex compliance logic without hard-coding rules.

---

## 🌟 Key Features

### 🎨 Visual Workflow Builder
- **Drag-and-Drop Interface**: Intuitively connect nodes to build compliance pipelines
- **Node Palette**: Categorized nodes for KYC, AML, Transaction Monitoring, Risk Logic, and decisioning
- **Real-time Validation**: Visual feedback for node connections and configuration
- **Custom Node Styling**: Modern rectangular nodes with gradient-styled connections

### 🔐 Authentication & User Management
- **Full Authentication System**: Secure signup/login with JWT tokens
- **User-specific Workflows**: Each user's workflows are stored and managed separately
- **Session Management**: Secure logout and session handling

### 👥 Team Collaboration
- **Admin Access Panel**: Workflow owners can invite collaborators
- **Role-Based Access Control**: Support for Viewer, Editor, and Admin roles
- **Share Dialog**: Easy sharing interface for workflow collaboration
- **Team Management**: Dedicated team page for managing collaborators

### 🆔 KYC Automation (Know Your Customer)
- **Client Registration**: Automated client data collection and registration
- **Document Upload**: Secure document handling with type detection
- **OCR Extraction**: Intelligent text extraction from identity documents (passport, ID cards)
- **Document Fraud Check**: Tampering detection and fraud scoring
- **Biometric Liveness**: Face liveness verification checks
- **Face Matching**: Document-to-selfie face comparison

### 🕵️ AML Screening (Anti-Money Laundering)
- **Sanctions Screening**: Real-time screening against global sanction lists (OFAC, UN, EU) via OpenSanctions API
- **PEP Screening**: Politically Exposed Person detection
- **Watchlist Screening**: Criminal and enforcement list checks
- **Adverse Media Screening**: Automated checks for negative news coverage
- **Fuzzy Matching Engine**: Levenshtein distance-based name similarity scoring
- **Demo Fallback**: Graceful degradation with demo data when API is unavailable

### 📊 Transaction Monitoring
A complete suite of nodes for detecting suspicious financial activity in real-time:
- **Schema Validation**: Enforce data integrity on incoming transaction events with configurable required fields
- **FX Normalization**: Real-time currency conversion using [Frankfurter API](https://www.frankfurter.app/) with fallback rates
- **Deduplication**: Intelligent handling of duplicate webhooks using txn_id, hash, or both strategies
- **Scenario Rules Engine**: Configurable logic for:
  - 🚩 High Value Transactions
  - ⚡ High Frequency / Velocity checks
  - 🧩 Structuring / "Smurfing" detection
  - 🌍 High-Risk Corridor monitoring
  - 📈 Unusual Pattern detection
- **Alert Management**: Auto-generation of investigation cases with priority scoring and SLA tracking

### 🧠 Logic & Risk Engine
- **Risk Calculator**: Comprehensive weighted scoring based on:
  - AML screening results (Sanctions, PEP, Watchlist, Adverse Media)
  - KYC check outcomes (Document fraud, Face match, Liveness)
  - Transaction monitoring flags
- **Risk Gate**: Conditional routing based on risk levels (HIGH/MEDIUM/LOW)
- **Decision Nodes**: Auto-approve, reject, or route to manual review
- **Webhooks**: Real-time callbacks to external systems for final decisions
- **Audit Logging**: Complete trail of workflow execution

### 📈 Execution Dashboard
- **Chrome-style Tabs**: Easy navigation between Workflows and Executions
- **Execution History**: View all workflow executions with status, risk scores, and decisions
- **API Integration**: Execute workflows via REST API (Postman compatible)
- **Real-time Refresh**: Keep track of latest executions

---

## 🛠️ Technology Stack

| Category | Technology |
|----------|------------|
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router) |
| **Language** | TypeScript 5.0 |
| **Styling** | Tailwind CSS 4.0 + Shadcn UI |
| **Workflow Engine** | React Flow 11 |
| **Database** | MongoDB 7 (Mongoose ODM) |
| **Authentication** | JWT + bcryptjs |
| **Validation** | Zod 4 |
| **UI Components** | Radix UI primitives |
| **Notifications** | Sonner toast |
| **Containerization** | Docker + Docker Compose |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MongoDB instance (local or Atlas)
- Docker (optional, for containerized deployment)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Sarthak-Jadhav-Dev/KYC-AML.git
   cd KYC-AML
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment**
   Create a `.env.local` file in the root directory:
   ```env
   MONGODB_URI=mongodb://localhost:27017/kyc-aml
   JWT_SECRET=your_jwt_secret_key
   NEXTAUTH_SECRET=your_nextauth_secret_key
   ```

4. **Run the Development Server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the application.

### Docker Deployment

1. **Build and run with Docker Compose**
   ```bash
   docker-compose up --build
   ```
   This will start:
   - The Next.js application on port 3000
   - MongoDB on port 27017

2. **Environment Variables for Docker**
   Create a `.env` file with:
   ```env
   MONGODB_URI=mongodb://mongodb:27017/kyc-aml
   JWT_SECRET=your_jwt_secret_key
   NEXTAUTH_SECRET=your_nextauth_secret_key
   ```

---

## 🔌 API Reference

### Execute a Workflow

```bash
POST /api/workflows/{workflowId}/run
Content-Type: application/json

{
  "name": "John Doe",
  "dob": "1990-01-15",
  "amount": 15000,
  "currency": "USD",
  "direction": "OUT",
  "channel": "WIRE"
}
```

### Response
```json
{
  "executionId": "exec_abc123",
  "status": "DONE",
  "riskScore": 65,
  "riskLevel": "MEDIUM",
  "decision": "MANUAL_REVIEW",
  "reasons": ["High value transaction", "PEP match found"]
}
```

---

## 🧪 Testing Transaction Monitoring

We've included a specialized test suite to verify the logic of the TM nodes.

```bash
# Run the TM Node simulation
npx tsx testing_scripts/test-tm-nodes.ts
```

This script simulates a stream of transactions passing through:
1. **Validation**: Drops invalid formats
2. **FX Normalization**: Converts currencies to USD using real-time rates
3. **Deduplication**: Drops duplicate transaction IDs
4. **Scenario Rules**: Flags transactions based on configured rules
5. **Alert Generation**: Creates prioritized compliance cases

---

## 📂 Project Structure

```
├── app/                          # Next.js App Router
│   ├── api/                      # REST API endpoints
│   │   ├── auth/                 # Authentication (login, signup, logout)
│   │   ├── executions/           # Execution management
│   │   ├── workflows/            # Workflow CRUD & execution
│   │   └── users/                # User management
│   ├── dashboard/                # Protected dashboard pages
│   │   ├── workflows/            # Workflow editor
│   │   ├── executions/           # Execution history
│   │   └── team/                 # Team management
│   ├── login/                    # Login page
│   └── signup/                   # Signup page
├── components/
│   ├── ui/                       # Shadcn UI primitives (18 components)
│   └── workflow/                 # Workflow-specific components
│       ├── ConfigPanel.tsx       # Node configuration panel
│       ├── CustomNode.tsx        # Custom node rendering
│       ├── NodePalette.tsx       # Draggable node palette
│       └── ShareDialog.tsx       # Collaboration sharing dialog
├── lib/
│   ├── auth/                     # JWT authentication utilities
│   ├── models/                   # Mongoose schemas
│   │   ├── definitions.ts        # Workflow, Execution, Tenant, AuditEvent
│   │   ├── User.ts               # User model
│   │   └── Collaborator.ts       # Team collaboration model
│   ├── nodes/                    # Node logic
│   │   ├── handlers/             # Business logic handlers
│   │   │   ├── kyc.ts            # KYC node handlers (6 nodes)
│   │   │   ├── aml.ts            # AML screening handlers (4 nodes)
│   │   │   ├── tm.ts             # Transaction monitoring (5 nodes)
│   │   │   └── logic.ts          # Risk & decision handlers
│   │   ├── registry.ts           # Handler registration
│   │   └── tm-types.ts           # TM TypeScript definitions
│   ├── workflow/                 # Workflow engine
│   │   ├── compiler.ts           # Graph to executable compilation
│   │   ├── runner.ts             # Workflow execution engine
│   │   └── schema.ts             # Zod validation schemas
│   ├── db.ts                     # MongoDB connection
│   └── utils.ts                  # Utility functions
├── public/                       # Static assets
├── testing_scripts/              # Test scripts
├── docker-compose.yml            # Docker orchestration
├── Dockerfile                    # Container definition
└── package.json                  # Dependencies & scripts
```

---

## 🧩 Available Node Types

### KYC Nodes (6)
| Node | Description |
|------|-------------|
| Client Registration | Collect and register customer data |
| Document Upload | Handle identity document uploads |
| OCR Extract | Extract text from documents |
| Document Fraud Check | Detect document tampering |
| Biometric Liveness | Verify user liveness |
| Face Match | Compare face to document photo |

### AML Nodes (4)
| Node | Description |
|------|-------------|
| Sanctions Screen | Check against OFAC, UN, EU sanctions |
| PEP Screen | Identify politically exposed persons |
| Watchlist Screen | Criminal and enforcement list checks |
| Adverse Media | Screen for negative news |

### Transaction Monitoring Nodes (5)
| Node | Description |
|------|-------------|
| Schema Validate | Validate transaction data structure |
| FX Normalize | Convert to base currency |
| Deduplicate | Handle duplicate transactions |
| Scenario Rule | Apply detection rules |
| Create Alert | Generate compliance alerts |

### Logic & Decision Nodes (6)
| Node | Description |
|------|-------------|
| Risk Calculator | Calculate weighted risk score |
| Risk Gate | Route based on risk level |
| Approve | Auto-approve decision |
| Reject | Auto-reject decision |
| Manual Review | Route to manual review |
| Webhook Callback | Send results to external system |

---

## 📜 Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

---

## 🤝 Contributing

Contributions are welcome! Please fork the repository and submit a Pull Request.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

## 🙏 Acknowledgments

- [OpenSanctions](https://www.opensanctions.org/) - AML screening data
- [Frankfurter API](https://www.frankfurter.app/) - Real-time FX rates
- [React Flow](https://reactflow.dev/) - Workflow visualization
- [Shadcn UI](https://ui.shadcn.com/) - UI components
- [Radix UI](https://www.radix-ui.com/) - Accessible primitives
