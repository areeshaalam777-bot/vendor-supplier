# 📊 Vendor & Supplier Reliability Scorecard

> **Private B2B Intelligence Network & Objective Reliability Audit Trail for Pakistani Traders and SMEs**

A full-stack, production-ready Vendor & Supplier Management and Scorecard system designed specifically for small and medium enterprises (wholesale merchants, hardware distributors, retail shops, importers). It transforms informal verbal commitments into an objective, data-backed track record to prevent losses, resolve commercial disputes, and benchmark supplier performance.

---

## 🚀 Key Features

### 1. 🎯 4-Dimensional Reliability Scoring Algorithm
Every supplier is evaluated with an automated composite reliability score (0–100%) and letter grade (**A+, A, B, C, D**) calculated across four core dimensions:
* **Delivery Punctuality (35% weight):** Tracks promised vs. actual arrival dates with escalating penalties for prolonged delays.
* **Quantity Accuracy (25% weight):** Measures percentage fulfillment of ordered units vs. delivered units to detect shortages.
* **Product Quality Consistency (20% weight):** Aggregates 1–5 star ratings on received physical goods.
* **Dispute History (20% weight):** Evaluates dispute frequency and resolution rates across transactions.

### 2. ⚠️ Risk Trend Detection & Early Warnings
* Analyzes trailing delivery performance vs. historical averages.
* Flags suppliers whose reliability is **Deteriorating**, **Stable**, or **Improving**.
* Provides actionable risk notices before critical delivery bottlenecks impact operations.

### 3. 📱 WhatsApp Commercial Dispute Notice Generator
* Converts short-shipped, delayed, or defective deliveries into formal, polite, and structured commercial reconciliation notices formatted specifically for WhatsApp sharing.
* Automatically includes historical punctuality %, dispute history reference codes, and clear reconciliation options (Credit note vs. balance cargo dispatch).

### 4. ⚖️ Supplier Comparison & Benchmark Matrix
* Side-by-side performance ranking across supplier categories (e.g., *Hardware & Tools*, *Textiles & Fabrics*, *Electronics*, *Auto Parts*).
* Helps traders benchmark new vendor quotes against existing supplier reliability grades.

### 5. 🌐 Blinded Community Intelligence Pooling *(Opt-In)*
* Zero-knowledge, anonymized aggregation of vendor reliability patterns across wholesale markets (e.g., Lahore, Karachi, Peshawar, Rawalpindi).
* Allows participating traders to view category benchmark averages without exposing trade secrets, pricing, or individual ledger records.

### 6. 📱 Responsive, High-Performance UI
* Custom glassmorphic dark-mode / slate theme with responsive off-canvas drawer navigation on tablets and mobile screens.
* Live search, multi-category filtering, instant score recalculation, and animated feedback.

---

## 🛠️ Tech Stack

* **Backend:** Node.js, Express.js 5.x
* **Database & ODM:** MongoDB Atlas, Mongoose 9.x
* **Authentication:** Express Sessions (`express-session`), Mongo Session Store (`connect-mongo`), `bcryptjs` password hashing
* **Frontend:** Vanilla JavaScript (ES6+), Semantic HTML5, Custom CSS3 Design System, FontAwesome 6 Icons
* **Deployment:** Vercel Serverless Function ready (`api/index.js`, `vercel.json`)

---

## 📂 Project Structure

```text
├── api/
│   └── index.js              # Serverless entry point for Vercel deployment
├── public/
│   ├── css/
│   │   └── style.css         # Complete design system tokens, components, & responsive queries
│   ├── js/
│   │   ├── dashboard.js      # Dashboard controller, API connectors, & UI event handlers
│   │   └── login.js          # Authentication & registration handler
│   ├── dashboard.html        # Main authenticated dashboard & scorecard portal
│   ├── index.html            # Auth gateway router
│   └── login.html            # Sign in and business registration portal
├── server/
│   ├── middleware/
│   │   └── requireAuth.js    # Session authentication guard
│   ├── models/
│   │   ├── Supplier.js       # Supplier entity schema
│   │   ├── Transaction.js    # Delivery log & dispute record schema
│   │   └── User.js           # Business user & settings schema
│   ├── routes/
│   │   ├── ai.js             # WhatsApp dispute generator & monthly digests
│   │   ├── auth.js           # Sign in, register, me, & profile settings
│   │   ├── community.js      # Blinded B2B community benchmarks
│   │   ├── suppliers.js      # Supplier CRUD & comparative matrix
│   │   └── transactions.js   # Delivery logs, dispute tracking & stats
│   ├── db.js                 # MongoDB connection & model registry
│   ├── index.js              # Express application server
│   └── scoring.js            # Multi-dimensional reliability scoring engine
├── .env.example              # Sample environment configuration
├── package.json              # Project dependencies & scripts
├── vercel.json               # Vercel deployment routing configuration
└── README.md                 # Project documentation
```

---

## ⚙️ Getting Started

### Prerequisites
* **Node.js** (v18.x or higher recommended)
* **npm** (v9.x or higher)
* **MongoDB Atlas** database cluster (or local MongoDB instance)

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/vender-supplier.git
cd vender-supplier
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the root directory by copying `.env.example`:
```bash
cp .env.example .env
```

Edit `.env` with your credentials:
```env
# MongoDB Atlas Connection URI
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/supplier_scorecard?retryWrites=true&w=majority

# Session Secret Key
SESSION_SECRET=your-secure-random-secret-key-2026

# Server Port (Local)
PORT=3000
```

### 4. Run Locally
```bash
# Start server
npm start

# Or for development
npm run dev
```

Open your browser and navigate to:
```text
http://localhost:3000
```

---

## 🔒 Security & Privacy

* **Isolated Ledgers:** Each trader's delivery logs, purchase amounts, and supplier notes are private and scoped strictly to their authenticated account.
* **Secure Sessions:** Sessions are stored securely in MongoDB with `httpOnly` and `SameSite` protections.
* **Blinded Pooling:** Community metrics aggregate anonymized data without exposing trader identities or commercial values.

---

## ☁️ Deployment (Vercel)

This application includes built-in serverless handlers for easy one-click deployment to **Vercel**:

1. Push your repository to GitHub / GitLab / Bitbucket.
2. Import the project into [Vercel](https://vercel.com).
3. Under **Project Settings > Environment Variables**, add:
   * `MONGODB_URI`
   * `SESSION_SECRET`
4. Deploy!

---

## 📄 License

This project is licensed under the [ISC License](LICENSE).
