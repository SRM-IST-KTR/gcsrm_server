# Contributing to GCSRM Server 🎉

Welcome to the GCSRM Server project! We're excited that you're interested in contributing. This guide will help you get started and ensure your contributions are valuable and well-received.

## 🎯 Hacktoberfest 2025

This project is participating in **Hacktoberfest 2025**! We welcome contributions from developers of all skill levels.

### 🔍 Hacktoberfest PR/MR Validation Requirements

**CRITICAL**: Before contributing, ensure your PR meets ALL Hacktoberfest validation criteria:

#### ⏰ Timeline & Repository Requirements

- **Create PRs between October 1, 10:00 AM UTC and October 31, 11:59:59 PM UTC**
- Repository must be public and unarchived ✅
- PRs created before October 1 don't count, even if merged after

#### 🛡️ Quality & Spam Prevention

- **No spam**: PRs labeled with "spam" won't count
- **No low-quality**: Automated/meaningless changes will be rejected
- **2+ spammy PRs = disqualification**
- Only meaningful contributions accepted

#### ✅ Participation & Labels

- This repo has `hacktoberfest` topic ✅
- PRs need `hacktoberfest-accepted` label OR merge/approval
- PRs labeled "invalid" won't count (unless also `hacktoberfest-accepted`)

#### 🎉 Acceptance Criteria

Your PR must be ONE of:

1. **Merged** by maintainers
2. **Labeled** with `hacktoberfest-accepted`
3. **Approved** with overall approving review (not closed)

**Draft PRs don't count!**

#### ⏳ 7-Day Review Period

- After meeting criteria → 7-day review period starts
- If any check fails → timer resets
- PRs in review on Oct 31 can continue into November
- After 7 days → automatically accepted! 🎉

### Getting Started for Hacktoberfest

1. Look for issues labeled with `hacktoberfest` or `good first issue`
2. Read through this contributing guide thoroughly
3. Fork the repository and create a feature branch
4. Make **meaningful, quality** changes following our guidelines
5. Submit a pull request for review (use our PR template)
6. Wait for maintainer review and the 7-day acceptance period

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Issue Guidelines](#issue-guidelines)
- [Pull Request Process](#pull-request-process)
- [Community](#community)

## 📜 Code of Conduct

This project adheres to a [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v16 or higher)
- **npm**
- **MongoDB** (local installation or access to MongoDB Atlas)
- **Git**

### Development Setup

1. **Fork the repository**

   ```bash
   # Click the "Fork" button on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/gcsrm_server.git
   cd gcsrm_server
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   # Create a .env file in the root directory
   cp .env.example .env
   # Edit .env with your configuration
   ```

   Required environment variables:

   ```
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/gcsrm
   NODE_ENV=development
   # Add other required environment variables
   ```

Additional optional environment variables (Rate limiting):

```
# Window size in minutes for rate limiting
RATE_LIMIT_WINDOW_MINUTES=15
# Default maximum requests per IP per window
RATE_LIMIT_MAX=100
# Optional per-category overrides
RATE_LIMIT_GENERAL_MAX=100
RATE_LIMIT_AUTH_MAX=5
RATE_LIMIT_PUBLIC_MAX=200
# Redis URL for distributed rate limiting (optional)
# REDIS_URL=redis://:password@redis-host:6379
```

4. **Start the development server**

   ```bash
   npm run dev
   ```

5. **Verify setup**
   - Server should start on `http://localhost:3000`
   - Check API documentation at `http://localhost:3000/api-docs` (if Swagger is configured)

## 🔄 Making Changes

### Branching Strategy

- Create a new branch for each feature or bug fix
- Use descriptive branch names:
  - `feature/add-authentication`
  - `bugfix/fix-user-validation`
  - `docs/update-readme`
  - `refactor/optimize-database-queries`

```bash
git checkout -b feature/your-feature-name
```

### Commit Message Guidelines

We follow the [Conventional Commits](https://conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:**

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools

**Examples:**

```
feat(auth): add JWT token validation middleware
fix(database): resolve connection timeout issue
docs(api): update swagger documentation for user endpoints
```

## 🎨 Coding Standards

### JavaScript/Node.js Guidelines

1. **Code Style**

   - Use consistent indentation (2 spaces)
   - Use meaningful variable and function names
   - Follow camelCase for variables and functions
   - Follow PascalCase for classes and constructors

2. **File Structure**

   ```
   src/
   ├── controllers/     # Route handlers
   ├── middleware/      # Custom middleware
   ├── models/          # Database models
   ├── routes/          # Route definitions
   ├── utils/           # Utility functions
   └── app.js           # Main application file
   ```

3. **Code Quality**

   - Write self-documenting code
   - Add comments for complex logic
   - Use async/await instead of callbacks
   - Handle errors properly with try-catch blocks
   - Validate input data appropriately

4. **Security Best Practices**
   - Sanitize user inputs
   - Use parameterized queries
   - Implement proper authentication and authorization
   - Don't expose sensitive information in error messages

### Example Code Structure

```javascript
// controllers/example.controller.js
const ExampleModel = require("../models/example.model");

/**
 * Get all examples
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getAllExamples = async (req, res, next) => {
  try {
    const examples = await ExampleModel.find();
    res.status(200).json({
      success: true,
      data: examples,
      message: "Examples retrieved successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllExamples,
};
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Writing Tests

- Write unit tests for utility functions
- Write integration tests for API endpoints
- Use descriptive test names
- Follow the AAA pattern (Arrange, Act, Assert)

Example test structure:

```javascript
describe("User Controller", () => {
  describe("GET /api/users", () => {
    it("should return all users when valid request", async () => {
      // Arrange
      const mockUsers = [
        /* mock data */
      ];

      // Act
      const response = await request(app).get("/api/users");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
```

## 📝 Issue Guidelines

### Before Creating an Issue

1. Search existing issues to avoid duplicates
2. Check if the issue exists in the latest version
3. Gather relevant information (error messages, steps to reproduce)

### Issue Templates

Please use our issue templates:

- **Bug Report**: For reporting bugs
- **Feature Request**: For suggesting new features
- **Documentation**: For documentation improvements

### Good First Issues

Look for issues labeled with:

- `good first issue`: Perfect for newcomers
- `help wanted`: We need community help
- `hacktoberfest`: Hacktoberfest-specific contributions

## 🔀 Pull Request Process

### Before Submitting

1. **Test your changes**

   ```bash
   npm test
   npm run dev  # Ensure the server starts without errors
   ```

2. **Update documentation**

   - Update README.md if needed
   - Add/update API documentation
   - Update comments in code

3. **Check your code**
   - Follow coding standards
   - Remove console.log statements
   - Ensure no merge conflicts

### Pull Request Template

When creating a pull request, please:

1. **Use a descriptive title**

   - ✅ "Add user authentication middleware"
   - ❌ "Fix stuff"

2. **Fill out the PR template completely**

   - Description of changes
   - Type of change (bug fix, feature, etc.)
   - Testing performed
   - Screenshots (if applicable)

3. **Link related issues**
   - Use "Closes #123" or "Fixes #123"

### Review Process

1. **Automated checks**: Ensure all CI checks pass
2. **Code review**: At least one maintainer will review your code
3. **Testing**: Verify functionality works as expected
4. **Approval**: PR will be merged after approval

### After Submission

- Be responsive to feedback
- Make requested changes promptly
- Keep your branch up to date with the main branch

## 🎯 Types of Contributions We Welcome

### 🐛 Bug Fixes

- Fix existing issues
- Improve error handling
- Performance optimizations

### ✨ Features

- New API endpoints
- Enhanced middleware
- Database improvements
- Authentication/authorization features

### 📚 Documentation

- API documentation improvements
- Code comments
- Setup guides
- Example usage

### 🧹 Maintenance

- Code refactoring
- Dependency updates
- Test improvements
- Security enhancements

## 🏷️ Hacktoberfest Labels

We use specific labels for Hacktoberfest validation:

### 🎯 Validation Labels

- `hacktoberfest`: General Hacktoberfest issues (this repo has the topic ✅)
- `hacktoberfest-accepted`: **CRITICAL** - Marks PR as accepted for Hacktoberfest
- `spam`: **WARNING** - Marks PR as spam (disqualifies from Hacktoberfest)
- `invalid`: **WARNING** - Marks PR as invalid (won't count unless also `hacktoberfest-accepted`)

### 📝 Contribution Labels

- `good first issue`: Beginner-friendly issues
- `help wanted`: Issues where we need community help
- `documentation`: Documentation improvements
- `enhancement`: New features or improvements
- `bug`: Bug fixes needed

### ⚠️ Important Notes

- PRs labeled `spam` are automatically disqualified
- Users with 2+ spam PRs are banned from Hacktoberfest
- `hacktoberfest-accepted` overrides `invalid` labels
- Regular Node.js RegEx `/\bspam\b/i` is used to detect spam labels

## 🚫 What We Don't Accept

- Spam or low-quality contributions
- Automated or generated content without value
- Changes that break existing functionality
- Contributions without proper testing
- Plagiarized code

## 🤝 Community

### Getting Help

- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For questions and general discussion
- **Email**: [Contact maintainers if needed]

### Recognition

Contributors will be:

- Added to our contributors list
- Mentioned in release notes for significant contributions
- Featured in our README (for substantial contributions)

## 📄 License

By contributing to GCSRM Server, you agree that your contributions will be licensed under the same license as the project (ISC License).

## 🙏 Thank You

Thank you for taking the time to contribute! Your efforts help make this project better for everyone.

---

**Happy Coding and Happy Hacktoberfest! 🎃👨‍💻👩‍💻**
