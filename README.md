# GCSRM Server 🚀

[![Hacktoberfest 2025](https://img.shields.io/badge/Hacktoberfest-2025-orange.svg)](https://hacktoberfest.com/)
[![Contributions Welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-16+-green.svg)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-4.4+-green.svg)](https://www.mongodb.com/)

The complete server backend for GCSRM (GitHub Club SRM) - A robust Node.js/Express.js server with MongoDB integration, featuring comprehensive API endpoints, authentication middleware, and modern development practices.

## 🎯 Hacktoberfest 2025

**We're participating in Hacktoberfest 2025!** 🎃

This repository is open for contributions during Hacktoberfest and throughout the year. We welcome developers of all skill levels to contribute to this project.

### 🔍 Hacktoberfest PR/MR Validation Criteria

**IMPORTANT**: Your contributions must meet ALL the following criteria to count for Hacktoberfest:

#### ⏰ **[BOUNDS]** Timeline Requirements

- PR/MRs must be created between **October 1, 10:00 AM UTC** and **October 31, 11:59:59 PM UTC**
- Repository must be public and unarchived
- PRs created before October 1 but merged after do NOT count

#### 🚫 **[EXCLUSION]** Repository Standards

- This repository follows Hacktoberfest values and is NOT excluded
- We maintain high standards for contributions and community behavior

#### 🛡️ **[SPAM]** Quality Assurance

- PR/MRs labeled with "spam" by maintainers will NOT be counted
- PR/MRs detected as spammy by the system will NOT be counted
- Users with 2+ spammy PR/MRs will be **disqualified**
- Only quality, meaningful contributions are accepted

#### ✅ **[PARTICIPATING]** Opt-in Verification

- This repository has the `hacktoberfest` topic (✓)
- OR your PR/MR must have the `hacktoberfest-accepted` label
- This is a **one-time check** - once passed, won't be rechecked

#### ❌ **[INVALID]** Label Check

- PR/MRs labeled with "invalid" will NOT be counted
- Exception: If also labeled `hacktoberfest-accepted`

#### 🎉 **[ACCEPTED]** Final Approval

Your PR/MR must be **ONE** of the following:

- ✅ **Merged** by a maintainer
- ✅ **Labeled** with `hacktoberfest-accepted`
- ✅ **Approved** with an overall approving review (and not closed)

**Important**: Draft PRs are NOT considered accepted.

#### ⏳ \*\*7-Day Review Period

- After passing all checks, there's a **7-day review period**
- If any check fails during this time, the timer resets
- PRs still in review on October 31 can continue into November
- After 7 days, your PR is automatically accepted for Hacktoberfest! 🎉

### How to Contribute for Hacktoberfest

1. ⭐ **Star this repository**
2. 🍴 **Fork the repository**
3. 👀 **Look for issues** labeled with `hacktoberfest`, `good first issue`, or `help wanted`
4. 📖 **Read our** [Contributing Guidelines](CONTRIBUTING.md)
5. 🚀 **Make your contribution** (ensure it meets quality standards)
6. 📝 **Submit a pull request** (use our PR template)
7. 🔍 **Wait for review** (7-day review period after initial approval)

### Good First Issues for Beginners

We maintain a list of beginner-friendly issues perfect for newcomers:

- 📝 Documentation improvements
- 🐛 Simple bug fixes
- ✨ Small feature enhancements
- 🧪 Adding unit tests
- 🎨 Code style improvements

### 🚨 What We DON'T Accept

- Spam or low-quality contributions
- Automated commits without meaningful changes
- Copy-paste code without understanding
- Breaking changes without discussion
- Contributions that don't follow our guidelines

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [API Documentation](#api-documentation)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [Development Setup](#development-setup)
- [Scripts](#scripts)
- [Environment Variables](#environment-variables)
- [API Endpoints](#api-endpoints)
- [License](#license)
- [Contributors](#contributors)

## ✨ Features

- 🚀 **Modern Node.js/Express.js** server architecture
- 🗄️ **MongoDB** integration with Mongoose ODM
- 📚 **Swagger/OpenAPI** documentation
- 🛡️ **Security middleware** (Helmet, CORS)
- 📊 **Request logging** with Morgan
- 🔧 **Error handling** middleware
- 📧 **Email functionality** with Nodemailer
- 📈 **Performance monitoring** with Sentry
- 🧪 **Development tools** (Nodemon)
- 🔒 **Input validation** and sanitization

## 🛠️ Tech Stack

- **Runtime**: Node.js (v16+)
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Documentation**: Swagger UI
- **Security**: Helmet, CORS
- **Logging**: Morgan
- **Email**: Nodemailer
- **Monitoring**: Sentry
- **Development**: Nodemon

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- npm or yarn
- Git

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

   ```bash
   # Create .env file
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start the development server**

   ```bash
   npm run dev
   ```

5. **Visit the application**
   - API Server: `http://localhost:3000`
   - API Documentation: `http://localhost:3000/api-docs`

## 📚 API Documentation

This project uses Swagger for API documentation. Once the server is running, you can access the interactive API documentation at:

```
http://localhost:3000/api-docs
```

## 📁 Project Structure

```
gcsrm_server/
├── src/
│   ├── controllers/          # Route handlers and business logic
│   │   ├── sponsor.controller.js
│   │   └── team.controller.js
│   ├── middleware/           # Custom middleware functions
│   │   ├── errorMiddleware.js
│   │   └── requestLogging.js
│   ├── models/               # Database models (Mongoose schemas)
│   │   ├── sponsor.model.js
│   │   └── team.model.js
│   ├── routes/               # Route definitions
│   │   ├── index.js
│   │   ├── sponsor.route.js
│   │   └── team.route.js
│   ├── utils/                # Utility functions and helpers
│   │   ├── db.js
│   │   ├── instrument.js
│   │   └── swagger.js
│   └── app.js                # Main application configuration
├── index.js                  # Application entry point
├── package.json              # Dependencies and scripts
├── Dockerfile                # Docker configuration
├── CONTRIBUTING.md           # Contribution guidelines
├── CODE_OF_CONDUCT.md        # Community guidelines
└── README.md                 # Project documentation
```

## 🤝 Contributing

We love contributions! Please read our [Contributing Guidelines](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md) before getting started.

### How to Contribute

1. **Find an Issue**: Look for issues labeled `good first issue`, `help wanted`, or `hacktoberfest`
2. **Fork & Clone**: Fork the repo and clone it locally
3. **Create Branch**: Create a new branch for your feature/fix
4. **Make Changes**: Implement your changes with proper testing
5. **Submit PR**: Create a pull request with a clear description

### Development Guidelines

- Follow the existing code style
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting
- Write clear commit messages

## ⚙️ Development Setup

### Environment Variables

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/gcsrm
DB_NAME=gcsrm

# Sentry Configuration (Optional)
SENTRY_DSN=your_sentry_dsn_here

# Email Configuration (Optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Rate limiting configuration (optional)
# Window size in minutes for rate limiting
RATE_LIMIT_WINDOW_MINUTES=15
# Default maximum requests per IP per window
RATE_LIMIT_MAX=100
# Optional per-category overrides (optional)
RATE_LIMIT_GENERAL_MAX=100
RATE_LIMIT_AUTH_MAX=5
RATE_LIMIT_PUBLIC_MAX=200

# Redis URL (optional) - if set and rate-limit Redis dependencies are installed,
# the app will use Redis for distributed rate limiting. Example:
# REDIS_URL=redis://:password@redis-host:6379
```

### Scripts

```bash
# Development
npm run dev          # Start development server with nodemon

# Production
npm start           # Start production server
```

## 🔗 API Endpoints

### Base URL

```
http://localhost:3000/api
```

### Available Routes

- **Teams**

  - `GET /api/teams` - Get all teams
  - `POST /api/teams` - Create a new team
  - `GET /api/teams/:id` - Get team by ID
  - `PUT /api/teams/:id` - Update team
  - `DELETE /api/teams/:id` - Delete team

- **Sponsors**
  - `GET /api/sponsors` - Get all sponsors
  - `POST /api/sponsors` - Create a new sponsor
  - `GET /api/sponsors/:id` - Get sponsor by ID
  - `PUT /api/sponsors/:id` - Update sponsor
  - `DELETE /api/sponsors/:id` - Delete sponsor

_For detailed API documentation with request/response schemas, visit `/api-docs` when the server is running._

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 👥 Contributors

Thanks to all the amazing contributors who have helped make this project better! 🙏

<!-- ALL-CONTRIBUTORS-LIST:START -->
<!-- This section will be automatically updated -->
<!-- ALL-CONTRIBUTORS-LIST:END -->

## 🙏 Acknowledgments

- Thanks to all Hacktoberfest participants
- MongoDB and Mongoose community
- Express.js community
- All open-source contributors

## 📞 Support

If you have any questions or need help:

- 📋 Open an [issue](https://github.com/SRM-IST-KTR/gcsrm_server/issues)
- 📧 Contact the maintainers
- 💬 Join our community discussions

---

**Made with ❤️ for Hacktoberfest 2025 and the open-source community!**

_Happy coding! 🚀_
