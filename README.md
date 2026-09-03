# GCSRM Server

A robust, high-performance, and scalable backend server for **GitHub Community SRM (GCSRM)** built with Node.js, Express.js 5, MongoDB, Redis, and Amazon SES. This server powers the main community portal, recruitment intake system, hackathon management (OssomeHacks), dynamic certificate generation, OTP verification, and transactional email infrastructure.

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Configuration](#configuration)
- [API Documentation](#-api-documentation)
- [API Endpoints Overview](#-api-endpoints-overview)
  - [Authentication & OTP](#-authentication--otp)
  - [Email Service](#-email-service)
  - [Recruitment 2026](#-recruitment-2026)
  - [OssomeHacks Hackathon](#-ossomehacks-hackathon)
  - [Certificates](#-certificates)
  - [Events](#-events)
  - [Team & Sponsors](#-team--sponsors)
  - [Contact Form](#-contact-form)
- [Project Structure](#-project-structure)
- [Development & Deployment](#-development--deployment)
- [Security & Performance](#-security--performance)
- [License](#-license)
- [Support](#-support)

---

## ✨ Features

- **RESTful API Architecture** - Clean, modular Express.js 5.x routing and controller layer.
- **Unified Amazon SES Email Engine** - High-throughput email delivery via AWS SDK v3 (`@aws-sdk/client-ses`) featuring connection pooling, bounded concurrency worker pools, and automated delivery tracking with Configuration Sets.
- **OTP Verification System** - Anti-abuse, rate-limited 6-digit OTP delivery backed by Redis TTL caching and JWT-authenticated session issuance with custom Shinchan-themed HTML templates.
- **Recruitment 2026 Portal Backend** - Complete intake workflow (registration, automated task assignment, task submissions, status checks) with dual MongoDB database isolation.
- **OssomeHacks Hackathon Management** - Participant registration, check-in QR workflows, status polling, and export utilities.
- **Automated Certificate Generation** - Dynamic name overlay and digital HMAC-SHA256 signature verification using Sharp and PDFKit.
- **Multi-Database Support** - Dedicated MongoDB connections for primary community data and recruitment intake.
- **Redis Caching Layer** - High-speed in-memory state and OTP storage with Upstash REST API compatibility.
- **Error & Performance Monitoring** - Native Sentry v10 instrumentation with profiling and structured logging.
- **Interactive API Documentation** - Built-in Swagger/OpenAPI documentation (`/api-docs`).
- **Security First** - Helmet.js protection, CORS policies, and rigorous Express-validator input sanitization.

---

## 🛠️ Tech Stack

### Core Technologies
- **Runtime**: Node.js (v18+)
- **Framework**: Express.js 5.x
- **Databases**: MongoDB 7.x (via Mongoose 9.x), Redis 6.x / Upstash (via ioredis)
- **Language**: JavaScript (ES6+ / CommonJS)

### Key Dependencies
- **Email Service**: `@aws-sdk/client-ses` (AWS SDK v3)
- **Cache & Auth**: `ioredis`, `jsonwebtoken`
- **Image & PDF Processing**: `sharp` (0.35.x with libvips), `pdfkit`, `opentype.js`
- **Security & Validation**: `helmet`, `cors`, `express-validator`
- **Monitoring & Logging**: `@sentry/node`, `@sentry/profiling-node`, `morgan`
- **Documentation**: `swagger-jsdoc`, `swagger-ui-express`
- **Environment**: `dotenv`

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────┐
│                        Client                          │
│     (Web App / Recruitment Portal / Mobile Client)     │
└───────────────────────────┬────────────────────────────┘
                            │ HTTPS / REST
                            ▼
┌────────────────────────────────────────────────────────┐
│                  Express.js 5 Server                   │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Middleware Layer                                 │  │
│  │  - Helmet (Security Headers)                     │  │
│  │  - CORS Configuration                            │  │
│  │  - Morgan / Sentry Request Logging               │  │
│  │  - Database Health & Connection Check            │  │
│  │  - Service API Key Verification (requireApiKey)   │  │
│  │  - OTP Session Verification (requireOtpAuth)     │  │
│  │  - Centralized Error Handling                    │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Routes & Controllers Layer                       │  │
│  │  - /api/otp          - /api/recruitment          │  │
│  │  - /api/email        - /api/ossomehacks          │  │
│  │  - /api/events       - /api/certificate          │  │
│  │  - /api/team         - /api/sponsors             │  │
│  │  - /api/contact      - /api-docs (Swagger)       │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Services & Utilities                             │  │
│  │  - Unified Amazon SES Email Service (Batch Pool) │  │
│  │  - OTP & JWT Manager                             │  │
│  │  - Sharp / PDFKit Certificate Engine             │  │
│  └──────────────────────────────────────────────────┘  │
└──────────────┬──────────────────┬─────────────────┬────┘
               │                  │                 │
               ▼                  ▼                 ▼
     ┌──────────────────┐ ┌───────────────┐ ┌───────────────┐
     │  Primary MongoDB │ │  Recruitment  │ │     Redis     │
     │     (GCSRM)      │ │    MongoDB    │ │  (OTP/Cache)  │
     └──────────────────┘ └───────────────┘ └───────────────┘
```

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed:
- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **MongoDB** (v6.x / 7.x) or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- **Redis** (Local instance or [Upstash Redis](https://upstash.com/))
- **AWS SES Account** with a verified sending domain

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/SRM-IST-KTR/gcsrm_server.git
   cd gcsrm_server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your credentials (see table below).

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Access services**
   - API Base: `http://localhost:8000/api`
   - Interactive Swagger Docs: `http://localhost:8000/api-docs`

---

### Configuration

Sample `.env` file structure:

```env
# Server Configuration
PORT=8000
NODE_ENV=dev

# Primary Database (Teams, Events, Sponsors, Certificates)
MONGO_URI=mongodb+srv://...
DB_NAME=GCSRM

# Recruitment Database (Recruitment '26, Tasks '26)
MONGO_URI_RECRUITMENT=mongodb+srv://...
DB_NAME_RECRUITMENT=Recruitment

# Recruitment Window (ISO Timestamps)
RECRUITMENT_START_DATE=2026-08-01T00:00:00.000Z
RECRUITMENT_END_DATE=2026-12-31T23:59:59.999Z

# Redis & Authentication
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_jwt_secret_here

# Sentry & Amazon SES Email Configuration
SENTRY_DSN=
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
SENDER_EMAIL=noreply@githubsrmist.in
AWS_SES_CONFIGURATION_SET=gcsrm-events
SES_BATCH_CONCURRENCY=10

# Security Secrets
CERTIFICATE_SECRET=your_certificate_secret
SERVICE_API_KEY=your_service_api_key_here
ORIGIN=*

#### Environment Variable Details

| Variable | Description | Required | Default |
| :--- | :--- | :---: | :--- |
| `PORT` | Express server port | No | `8000` |
| `NODE_ENV` | Environment (`dev` / `production`) | No | `dev` |
| `MONGO_URI` | MongoDB URI for primary GCSRM database | Yes | - |
| `DB_NAME` | Primary database name | Yes | `GCSRM` |
| `MONGO_URI_RECRUITMENT` | MongoDB URI for recruitment database | Yes | - |
| `DB_NAME_RECRUITMENT` | Recruitment database name | Yes | `Recruitment` |
| `REDIS_URL` | Redis connection URL | Yes | `redis://localhost:6379` |
| `JWT_SECRET` | Secret key for signing OTP session tokens | Yes | - |
| `SENTRY_DSN` | Sentry performance & error DSN | No | - |
| `AWS_REGION` | AWS Region for Amazon SES | Yes | `us-east-1` |
| `AWS_ACCESS_KEY_ID` | IAM Access Key ID for Amazon SES | Yes* | *(Inherits AWS CLI/IAM role)* |
| `AWS_SECRET_ACCESS_KEY`| IAM Secret Access Key for Amazon SES | Yes* | *(Inherits AWS CLI/IAM role)* |
| `SENDER_EMAIL` | Verified default sender address | Yes | `noreply@githubsrmist.in` |
| `AWS_SES_CONFIGURATION_SET` | SES Configuration Set for metrics | No | `gcsrm-events` |
| `SES_BATCH_CONCURRENCY` | Worker pool concurrency for batch sending | No | `10` |
| `CERTIFICATE_SECRET` | Secret key for certificate digital signature | Yes | - |
| `SERVICE_API_KEY` | Secret Bearer token for gating `/api/email/send` & `/api/email/batch` | Yes | - |
---

## 📚 API Documentation

Complete interactive documentation is powered by **Swagger UI**:

Visit: **`http://localhost:8000/api-docs`**

---

## 🔌 API Endpoints Overview

### 🔑 Authentication & OTP
- `POST /api/otp/send` — Generate 6-digit OTP, cache in Redis (5-min TTL), and dispatch branded Shinchan verification email using server template (`src/utils/email/templates/otp.html`). Client template/subject overrides are strictly discarded.
- `POST /api/otp/verify` — Verify 6-digit OTP and receive an HS256-signed Bearer JWT session token for anti-tamper form submissions. Single-use only.

### 📧 Email Service
- `POST /api/email/send` — Dispatch a single email via Amazon SES. **Protected:** Requires `Authorization: Bearer <SERVICE_API_KEY>`.
- `POST /api/email/batch` — Dispatch up to 100 emails concurrently via the bounded worker pool. **Protected:** Requires `Authorization: Bearer <SERVICE_API_KEY>`.
### 🎯 Recruitment 2026
- `POST /api/recruitment/apply` — Submit recruitment application (protected by `requireOtpAuth` middleware).
- `GET /api/recruitment/status/:email` — Check applicant registration and task submission status.
- `GET /api/recruitment/tasks/:domain` — Fetch domain-specific recruitment tasks.
- `POST /api/recruitment/submit` — Submit completed recruitment tasks.
- `GET /api/recruitment/stats` — Retrieve overall recruitment statistics and domain counts.

### ⚡ OssomeHacks Hackathon
- `GET /api/ossomehacks/status` — Get live hackathon portal registration status.
- `POST /api/ossomehacks/register` — Register a participant for OssomeHacks.
- `GET /api/ossomehacks/participant/:id` — Retrieve participant details by ID.
- `POST /api/ossomehacks/checkin` — Check in a participant using QR/ID.
- `GET /api/ossomehacks/export` — Export registered participants list.

### 📜 Certificates
- `POST /api/certificate/generate` — Generate dynamic PNG / PDF certificate with custom text overlay.
- `GET /api/certificate/verify/:id` — Verify digital authenticity of a certificate.
- `GET /api/certificate/download/:id` — Download generated certificate file.

### 📅 Events
- `GET /api/events` — List all community events.
- `POST /api/events` — Create a new event.
- `GET /api/events/:id` — Get event details.
- `POST /api/events/:id/register` — Register participant for an event.

### 👥 Team & Sponsors
- `GET /api/team` — Fetch team members by domain/year.
- `POST /api/team` — Add new team member.
- `GET /api/sponsors` — List active sponsors by tier.
- `POST /api/sponsors` — Add a new sponsor.

### 💬 Contact Form
- `POST /api/contact` — Process contact submission and trigger dual notification emails (team notification + sender confirmation).

---

## 📁 Project Structure

```plaintext
gcsrm_server/
├── src/
│   ├── app.js                              # Express application setup & middleware mounting
│   ├── controller/                         # Controller handlers
│   │   ├── certificates/
│   │   │   ├── download.controller.js      # Certificate download handler
│   │   │   ├── generate.controller.js      # Dynamic image/PDF generation
│   │   │   └── verify.controller.js        # Digital HMAC signature verification
│   │   ├── events/
│   │   │   ├── event.controller.js         # Event CRUD
│   │   │   └── register.controller.js      # Event registration
│   │   ├── ossomeHacks/
│   │   │   ├── checkInParticipant.controller.js
│   │   │   ├── deleteRegistration.controller.js
│   │   │   ├── getAllRegistrations.controller.js
│   │   │   ├── HackStatus.controller.js
│   │   │   ├── registration.controller.js
│   │   │   └── updateRegistration.controller.js
│   │   ├── recruitments/
│   │   │   ├── apply_MONGODB.controller.js # Multi-DB application handler
│   │   │   ├── getTasks.controller.js      # Domain task retrieval
│   │   │   ├── recruitment.controller.js   # Recruitment status & stats
│   │   │   └── submitTask.controller.js    # Task submission handler
│   │   ├── contact.controller.js           # Contact form handler
│   │   ├── email.controller.js             # SES single & batch endpoints
│   │   ├── otp.controller.js               # Redis OTP generation & verification
│   │   ├── sponsor.controller.js           # Sponsors CRUD
│   │   └── team.controller.js              # Team CRUD
│   ├── middleware/                         # Custom Express middlewares
│   │   ├── dbCheck.js                     # Database connectivity gate
│   │   ├── errorMiddleware.js             # Centralized error handler
│   │   ├── requestLogging.js              # Sentry & Morgan request logger
│   │   └── requireOtpAuth.js              # Bearer JWT OTP auth guard
│   ├── models/                             # Mongoose schemas
│   │   ├── certificate.model.js
│   │   ├── event.model.js
│   │   ├── ossomehacks.model.js
│   │   ├── participant.model.js
│   │   ├── recruitment.model.js
│   │   ├── sponsor.model.js
│   │   ├── tasks.model.js
│   │   └── team.model.js
│   ├── routes/                             # API Route definitions
│   │   ├── certificate.route.js
│   │   ├── contact.route.js
│   │   ├── email.route.js
│   │   ├── event.route.js
│   │   ├── index.js                       # Route aggregator (/api)
│   │   ├── ossomehacks.route.js
│   │   ├── otp.route.js
│   │   ├── recruitment.route.js
│   │   ├── sponsor.route.js
│   │   └── team.route.js
│   └── utils/                              # Utilities and integrations
│       ├── certificates/
│       │   └── overlay-sharp.js           # Sharp SVG & font text overlay engine
│       ├── email/
│       │   ├── recruitment.js             # Recruitment email trigger
│       │   ├── registration.js            # Event registration email trigger
│       │   └── templates/
│       │       ├── otp.html               # Shinchan Neo-Brutalist OTP email template
│       │       ├── recruitment-confirmation.html
│       │       └── registration.html
│       ├── db.js                          # Primary & secondary MongoDB connections
│       ├── emailService.js                # Amazon SES SDK v3 unified engine
│       ├── hackStatusHelper.js            # Hackathon status helper
│       ├── instrument.js                  # Sentry initialization
│       ├── jwt.js                         # JWT token signer & verifier
│       ├── otpService.js                  # Redis OTP TTL & generation helpers
│       ├── redis.js                       # Redis / Upstash connection pool
│       └── swagger.js                     # Swagger / OpenAPI config
├── index.js                                # Application entry point
├── package.json                            # Package manifest & dependencies
├── Dockerfile                              # Docker container config
├── vercel.json                             # Vercel serverless deployment config
├── .env.example                            # Environment variables template
└── README.md                               # Project documentation
```

---

## 💻 Development & Deployment

### Local Development
```bash
npm run dev
```

### Vercel Serverless Deployment
This project is configured for serverless execution on Vercel:
1. Connect repository in the [Vercel Dashboard](https://vercel.com).
2. Configure environment variables in **Project Settings → Environment Variables**.
3. Deploy directly or push to `main` / `staging`.

### Docker Deployment
```bash
# Build image
docker build -t gcsrm-server .

# Run container
docker run -p 8000:8000 --env-file .env gcsrm-server
```

---

## 🔒 Security & Performance

- **0 Vulnerabilities**: All dependencies verified against `npm audit` with regular automated patching.
- **Connection Reuse**: HTTP Keep-Alive connection pooling across serverless invocations for MongoDB, Redis, and Amazon SES.
- **Anti-Spam & Anti-Tamper**: OTP sessions require email-matched Bearer JWTs preventing forged form submissions.
- **Sanitized Filters**: MongoDB queries protected against NoSQL injections.
- **Security Headers**: Standardized HTTP security headers configured via `helmet`.

---

## 📄 License

This project is licensed under the **ISC License**. See the [LICENSE](LICENSE) file for details.

---

## 📞 Support

- 🐛 **Bug Reports**: [Open an issue](https://github.com/SRM-IST-KTR/gcsrm_server/issues/new?template=bug_report.md)
- 💡 **Feature Requests**: [Open an issue](https://github.com/SRM-IST-KTR/gcsrm_server/issues/new?template=feature_request.md)
- 📧 **Community Email**: [contact@githubsrmist.in](mailto:contact@githubsrmist.in)

<div align="center">

**Built with ❤️ by GitHub Community SRM**

**[Website](https://githubsrmist.in)** • **[Recruitment Portal](https://recruitment.githubsrmist.in)** • **[GitHub](https://github.com/SRM-IST-KTR)** • **[LinkedIn](https://www.linkedin.com/company/githubsrm/)**

</div>
