
# 🛡️ KYC & AML Compliance Orchestrator

[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.0-cyan)](https://tailwindcss.com/)
[![React Flow](https://img.shields.io/badge/React_Flow-11-purple)](https://reactflow.dev/)

A powerful, low-code orchestration engine designed to streamline **Know Your Customer (KYC)**, **Anti-Money Laundering (AML)**, and **Transaction Monitoring (TM)** workflows. 

Built for fintechs and banks to visually design, test, and deploy complex compliance logic without hard-coding rules.

---

## 🌟 Key Features

### 🎨 Visual Workflow Builder
- **Drag-and-Drop Interface**: Intuitively connect nodes to build compliance pipelines.
- **Node Palette**: Categorized nodes for KYC, AML, Risk Logic, and decisioning.
- **Real-time Validation**: visual feedback for node connections and configuration.

### 🆔 KYC Automation (Know Your Customer)
- **Identity Verification**: Modules for client registration and data collection.
- **Document Intelligence**: OCR extraction and document fraud checks.
- **Biometric Security**: Liveness checks and face matching logic.

### 🕵️ AML Screening (Anti-Money Laundering)
- **Sanctions & Watchlists**: Real-time screening against global sanction lists (OFAC, UN, EU).
- **PEP Screening**: Politically Exposed Person detection.
- **Adverse Media**: Automated checks for negative news coverage.

### 📊 Transaction Monitoring (New!)
A complete suite of nodes for detecting suspicious financial activity in real-time:
- **Schema Validation**: Enforce data integrity on incoming transaction events.
- **FX Normalization**: Automatically convert multi-currency transactions to a base currency (e.g., USD) for consistent rule evaluation.
- **Deduplication**: Intelligent handling of duplicate webhooks or retries using idempotent keys.
- **Scenario Rules Engine**: Configurable logic for:
  - 🚩 High Value Transactions
  - ⚡ High Frequency / Velocity checks
  - 🧩 Structuring / "Smurfing" (transactions just below reporting thresholds)
  - 🌍 High-Risk Corridor monitoring
- **Alert Management**: Auto-generation of investigation cases with priority scoring and SLA tracking.

### 🧠 Logic & Risk Engine
- **Risk Calculator**: Weighted scoring based on screening results.
- **Conditional Routing**: "Risk Gate" nodes to route low-risk users to auto-approval and high-risk users to manual review.
- **Webhooks**: Real-time callbacks to your backend for final decisions.

---

## 🛠️ Technology Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Shadcn UI
- **Workflow Engine**: React Flow
- **Database**: MongoDB (Mongoose Schema)
- **Validation**: Zod

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MongoDB instance (local or Atlas)

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
   MONGODB_URI=mongodb://localhost:27017/compliance-engine
   NEXTAUTH_SECRET=your_super_secret_key
   ```

4. **Run the Development Server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 🧪 Testing Transaction Monitoring

We've included a specialized test suite to verify the logic of the TM nodes.

```bash
# Run the TM Node simulation
npx tsx testing_scripts/test-tm-nodes.ts
```
This script simulates a stream of transactions passing through:
1.  **Validation**: Drops invalid formats.
2.  **FX**: Converts EUR -> USD.
3.  **Dedup**: Drops duplicate IDs.
4.  **Rules**: Flags a $15,000 transaction.
5.  **Alerts**: Generates a P1 Compliance Case.

---

## 📂 Project Structure

```
├── components
│   ├── ui/           # Shadcn UI primitives
│   └── workflow/     # Logic for the custom node editor
├── lib
│   ├── models/       # Mongoose DB definitions
│   ├── nodes/        # Logic handlers for Node execution 
│   │   ├── handlers/ # KYC, AML, and TM business logic
│   │   ├── tm-types.ts # TypeScript definitions for TM
│   └── workflow/     # Compiler and Runner engine
├── app/              # Next.js App Router pages
└── public/           # Static assets
```

---

## 🤝 Contributing

Contributions are welcome! Please fork the repository and submit a Pull Request.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
