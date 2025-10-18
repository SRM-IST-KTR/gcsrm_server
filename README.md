# OCTACORE

A robust and scalable backend server for GitHub Club SRM (GCSRM) built with Node.js, Express.js, and MongoDB. This server provides RESTful APIs for managing club activities, events, team members, sponsors, certificates, and contact submissions.

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Configuration](#configuration)
- [API Documentation](#-api-documentation)
- [Project Structure](#-project-structure)
- [API Endpoints](#-api-endpoints)
  - [Teams](#teams)
  - [Sponsors](#sponsors)
  - [Events](#events)
  - [Certificates](#certificates)
  - [Contact](#contact)
- [Development](#-development)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)
- [Support](#-support)

## ✨ Features

- **RESTful API Architecture** - Clean and intuitive REST API design
- **MongoDB Integration** - Robust database management with Mongoose ODM
- **Event Management** - Complete CRUD operations for club events
- **Team Management** - Manage team members and their roles
- **Sponsor Management** - Track and manage club sponsors
- **Certificate Generation** - Automated certificate generation and verification system
- **Contact Form Handler** - Process and store contact form submissions with email notifications
- **Interactive API Documentation** - Swagger UI for easy API exploration and testing
- **Security First** - Helmet.js for security headers, CORS configuration
- **Request Logging** - Morgan for HTTP request logging
- **Error Handling** - Centralized error handling middleware
- **Database Health Checks** - Automatic connection monitoring
- **Performance Monitoring** - Sentry integration for error tracking
- **Development Hot Reload** - Nodemon for efficient development

## 🛠️ Tech Stack

### Core Technologies

- **Runtime**: Node.js (v16+)
- **Framework**: Express.js 5.x
- **Database**: MongoDB 6.x with Mongoose 8.x
- **Language**: JavaScript (ES6+)

### Key Dependencies

- **Security**: Helmet, CORS
- **Validation**: Express-validator
- **Logging**: Morgan
- **Documentation**: Swagger (swagger-jsdoc, swagger-ui-express)
- **Email**: Nodemailer
- **Image Processing**: Sharp
- **PDF Generation**: PDFKit
- **Font Handling**: OpenType.js
- **Monitoring**: Sentry
- **Environment**: dotenv

### Development Tools

- **Process Manager**: Nodemon
- **Version Control**: Git

## 🏗️ Architecture

The server follows a modular MVC (Model-View-Controller) architecture:

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────┐
│      Express.js Server          │
│  ┌───────────────────────────┐  │
│  │  Middleware Layer         │  │
│  │  - CORS                   │  │
│  │  - Helmet (Security)      │  │
│  │  - Request Logging        │  │
│  │  - Error Handling         │  │
│  │  - DB Health Check        │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │  Routes Layer             │  │
│  │  - /api/teams             │  │
│  │  - /api/sponsors          │  │
│  │  - /api/events            │  │
│  │  - /api/certificates      │  │
│  │  - /api/contact           │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │  Controllers Layer        │  │
│  │  - Business Logic         │  │
│  │  - Request Handling       │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │  Models Layer             │  │
│  │  - Mongoose Schemas       │  │
│  │  - Data Validation        │  │
│  └───────────────────────────┘  │
└─────────────┬───────────────────┘
              │
              ▼
     ┌─────────────────┐
     │   MongoDB        │
     └─────────────────┘
```

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
- **MongoDB** (v6.x or higher) - [Download](https://www.mongodb.com/try/download/community) or use [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- **npm** (comes with Node.js) or **yarn**
- **Git** - [Download](https://git-scm.com/downloads)

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
3. **Set up environment variables**

   Create a `.env` file in the root directory:

   ```bash
   cp .env.example .env
   ```

   Then edit `.env` with your configuration (see [Configuration](#configuration) section below).
4. **Start MongoDB**

   If using local MongoDB:

   ```bash
   # macOS
   brew services start mongodb-community

   # Linux
   sudo systemctl start mongod

   # Windows
   net start MongoDB
   ```
5. **Start the development server**

   ```bash
   npm run dev
   ```
6. **Verify the installation**

   - API Server: `http://localhost:3000`
   - API Documentation: `http://localhost:3000/api-docs`
   - Health Check: `http://localhost:3000/health`

### Configuration

Create a `.env` file with the following variables:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/gcsrm
DB_NAME=gcsrm

# CORS Configuration (for production)
# ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Sentry Configuration (Optional - for error monitoring)
SENTRY_DSN=your_sentry_dsn_here

# Email Configuration (for contact form notifications)
ZOHO_SMTP_PASS=your_app_specific_password
ZOHO_SMTP_USER=noreply@gcsrm.com

# Certificate Configuration
CERTIFICATE_SECRET=YOUR_CERTIFICATE_SECRET
```

#### Environment Variable Details


| Variable             | Description                          | Required | Default     |
| -------------------- | ------------------------------------ | -------- | ----------- |
| `PORT`               | Server port                          | No       | 3000        |
| `NODE_ENV`           | Environment (development/production) | No       | development |
| `MONGODB_URI`        | MongoDB connection string            | Yes      | -           |
| `DB_NAME`            | Database name                        | Yes      | -           |
| `SENTRY_DSN`         | Sentry error tracking DSN            | No       | -           |
| `ZOHO_SMTP_USER`     | Email account username               | Yes*     | -           |
| `ZOHO_SMTP_PASS`     | Email account password               | Yes*     | -           |
| `CERTIFICATE_SECRET` | Certificate verification             | Yes*     | -           |

## 📚 API Documentation

This project uses **Swagger/OpenAPI** for comprehensive, interactive API documentation.

### Accessing Documentation

Once the server is running, access the Swagger UI at:

```plaintext
http://localhost:3000/api-docs
```

The Swagger interface provides:

- 📖 **Complete API reference** - All endpoints with descriptions
- 🧪 **Interactive testing** - Try out APIs directly from the browser
- 📋 **Request/Response schemas** - Detailed data models
- 🔐 **Authentication details** - Required headers and authorization
- 💡 **Example requests** - Sample payloads for each endpoint

## 📁 Project Structure

```plaintext
gcsrm_server/
├── src/
│   ├── app.js                      # Express application setup
│   ├── controller/                 # Request handlers & business logic
│   │   ├── certificate.controller.js
│   │   ├── contact.controller.js
│   │   ├── event.controller.js
│   │   ├── sponsor.controller.js
│   │   └── team.controller.js
│   ├── middleware/                 # Custom middleware functions
│   │   ├── dbCheck.js             # Database health check
│   │   ├── errorMiddleware.js     # Centralized error handling
│   │   └── requestLogging.js      # Request logging middleware
│   ├── models/                     # Mongoose schemas & models
│   │   ├── certificate.model.js
│   │   ├── event.model.js
│   │   ├── sponsor.model.js
│   │   └── team.model.js
│   ├── routes/                     # API route definitions
│   │   ├── index.js               # Main router
│   │   ├── certificate.route.js
│   │   ├── contact.route.js
│   │   ├── event.route.js
│   │   ├── sponsor.route.js
│   │   └── team.route.js
│   └── utils/                      # Helper functions & utilities
│       ├── db.js                  # Database connection
│       ├── instrument.js          # Sentry instrumentation
│       ├── mailer.js              # Email service
│       ├── swagger.js             # Swagger configuration
│       └── certificates/          # Certificate generation
│           └── overlay-sharp.js   # Image processing for certificates
├── index.js                        # Application entry point
├── package.json                    # Dependencies & scripts
├── Dockerfile                      # Docker configuration
├── vercel.json                     # Vercel deployment config
├── .env                           # Environment variables (not in repo)
├── .env.example                   # Environment template
├── CONTRIBUTING.md                 # Contribution guidelines
├── CODE_OF_CONDUCT.md             # Community guidelines
└── README.md                       # Project documentation
```

### Key Directories

- **`controllers/`** - Contains business logic and request handling
- **`models/`** - Database schemas and data validation rules
- **`routes/`** - API endpoint definitions and route handlers
- **`middleware/`** - Custom Express middleware for cross-cutting concerns
- **`utils/`** - Helper functions, database connection, and utilities

## 💻 Development

### Available Scripts

```bash
# Start development server with hot reload
npm run dev

# Start production server
npm start
```

## 🚀 Deployment

### Vercel Deployment

This project is configured for Vercel deployment.

1. **Install Vercel CLI**

   ```bash
   npm install -g vercel
   ```
2. **Deploy to Vercel**

   ```bash
   vercel
   ```
3. **Production deployment**

   ```bash
   vercel --prod
   ```

### Docker Deployment

1. **Build Docker image**

   ```bash
   docker build -t gcsrm-server .
   ```
2. **Run container**

   ```bash
   docker run -p 3000:3000 --env-file .env gcsrm-server
   ```

### Environment-Specific Configuration

**Production Checklist:**

- ✅ Set `NODE_ENV=production`
- ✅ Use production MongoDB URI
- ✅ Configure proper CORS origins
- ✅ Set up Sentry DSN for error monitoring
- ✅ Use strong email credentials
- ✅ Enable HTTPS
- ✅ Set up rate limiting (if needed)
- ✅ Configure proper logging
- ✅ Set up monitoring and alerts

**Common HTTP Status Codes:**


| Code | Meaning               | Description                   |
| ---- | --------------------- | ----------------------------- |
| 200  | OK                    | Request successful            |
| 201  | Created               | Resource created successfully |
| 400  | Bad Request           | Invalid request data          |
| 404  | Not Found             | Resource not found            |
| 500  | Internal Server Error | Server error occurred         |

## 📄 License

This project is licensed under the **ISC License**. See the [LICENSE](LICENSE) file for details.

```plaintext
ISC License

Copyright (c) 2025 GitHub Club SRM

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
```

## 📞 Support

Need help? We're here for you!

### Documentation

- 📖 **API Documentation**: Visit `/api-docs` when the server is running
- 📋 **Certificate System**: See [CERTIFICATE_SYSTEM.md](CERTIFICATE_SYSTEM.md)
- 🎃 **Hacktoberfest Guide**: See [HACKTOBERFEST_GUIDE.md](HACKTOBERFEST_GUIDE.md)

### Get in Touch

- 🐛 **Bug Reports**: [Open an issue](https://github.com/SRM-IST-KTR/gcsrm_server/issues/new?template=bug_report.md)
- 💡 **Feature Requests**: [Open an issue](https://github.com/SRM-IST-KTR/gcsrm_server/issues/new?template=feature_request.md)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/SRM-IST-KTR/gcsrm_server/discussions)
- 📧 **Email**: contact@githubsrmist.in

### Useful Resources

- [Express.js Documentation](https://expressjs.com/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Mongoose Documentation](https://mongoosejs.com/docs/)
- [Node.js Documentation](https://nodejs.org/docs/)
- [Swagger Documentation](https://swagger.io/docs/)

## � Security

### Reporting Security Issues

If you discover a security vulnerability, please **DO NOT** open a public issue. Instead:

1. Email us at community@githubsrmist.in
2. Include a detailed description of the vulnerability
3. Provide steps to reproduce (if applicable)
4. We'll respond within 48 hours

### Security Best Practices

This project implements:

- ✅ Helmet.js for security headers
- ✅ CORS configuration
- ✅ Input validation with express-validator
- ✅ Environment variable protection
- ✅ Error message sanitization
- ✅ MongoDB injection prevention (via Mongoose)

## 📈 Performance

### Optimization Techniques

- **Database Indexing** - Optimized queries with proper indexes
- **Connection Pooling** - Efficient database connection management
- **Error Monitoring** - Sentry integration for tracking issues

### Monitoring

We use **Sentry** for:

- Error tracking
- Performance monitoring
- Release health tracking

<div align="center">

**Built with ❤️ by GitHub Club SRM**

**[Website](https://githubsrmist.in)** • **[GitHub](https://github.com/SRM-IST-KTR)** • **[LinkedIn](https://www.linkedin.com/company/githubsrmist/)**

⭐ Star us on GitHub — it motivates us a lot!

</div>
