/**
 * Environment Variable Validation Module
 * Validates required environment variables on application startup
 */

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

/**
 * Configuration schema defining required and optional environment variables
 */
const configSchema = {
  required: {
    MONGO_URI: {
      description: 'MongoDB connection string',
      example: 'mongodb://localhost:27017',
      validate: (value) => value.startsWith('mongodb://') || value.startsWith('mongodb+srv://'),
      errorMessage: 'MONGO_URI must be a valid MongoDB connection string (mongodb:// or mongodb+srv://)'
    },
    DB_NAME: {
      description: 'Database name',
      example: 'gcsrm_db',
      validate: (value) => value.length > 0,
      errorMessage: 'DB_NAME cannot be empty'
    },
    PORT: {
      description: 'Server port number',
      example: '3000',
      default: '3000',
      validate: (value) => !isNaN(value) && parseInt(value) > 0 && parseInt(value) < 65536,
      errorMessage: 'PORT must be a valid port number (1-65535)'
    }
  },
  optional: {
    NODE_ENV: {
      description: 'Node environment (development, production, test)',
      example: 'development',
      default: 'development',
      validate: (value) => ['development', 'production', 'test', 'dev', 'prod'].includes(value),
      warningMessage: 'NODE_ENV should be one of: development, production, test'
    },
    ORIGIN: {
      description: 'CORS origin configuration',
      example: '*',
      default: '*'
    },
    SENTRY_DSN: {
      description: 'Sentry DSN for error tracking',
      example: 'https://...@sentry.io/...'
    }
  }
};

/**
 * Validates all environment variables according to the schema
 * @throws {Error} If required variables are missing or invalid
 */
function validateEnvVariables() {
  const errors = [];
  const warnings = [];
  const appliedDefaults = [];

  console.log(`${colors.blue}\n🔍 Validating environment variables...${colors.reset}\n`);

  // Validate required variables
  for (const [key, config] of Object.entries(configSchema.required)) {
    const value = process.env[key];

    // Check if variable exists
    if (!value) {
      // Apply default if available
      if (config.default) {
        process.env[key] = config.default;
        appliedDefaults.push({
          key,
          value: config.default,
          description: config.description
        });
        continue;
      }

      errors.push({
        key,
        description: config.description,
        example: config.example
      });
      continue;
    }

    // Validate value if validator function exists
    if (config.validate && !config.validate(value)) {
      errors.push({
        key,
        description: config.description,
        example: config.example,
        currentValue: value,
        errorMessage: config.errorMessage
      });
    }
  }

  // Validate optional variables
  for (const [key, config] of Object.entries(configSchema.optional)) {
    const value = process.env[key];

    // Apply default if variable is missing
    if (!value && config.default) {
      process.env[key] = config.default;
      appliedDefaults.push({
        key,
        value: config.default,
        description: config.description
      });
      continue;
    }

    // Validate value if it exists and has a validator
    if (value && config.validate && !config.validate(value)) {
      warnings.push({
        key,
        currentValue: value,
        warningMessage: config.warningMessage || `Invalid value for ${key}`
      });
    }
  }

  // Display applied defaults
  if (appliedDefaults.length > 0) {
    console.log(`${colors.yellow}⚙️  Applied default values:${colors.reset}\n`);
    appliedDefaults.forEach(({ key, value, description }) => {
      console.log(`${colors.yellow}  ${key}=${value}${colors.reset}`);
      console.log(`${colors.gray}  └─ ${description}${colors.reset}\n`);
    });
  }

  // Display warnings
  if (warnings.length > 0) {
    console.log(`${colors.yellow}⚠️  Configuration warnings:${colors.reset}\n`);
    warnings.forEach(({ key, currentValue, warningMessage }) => {
      console.log(`${colors.yellow}  ${key}: ${warningMessage}${colors.reset}`);
      console.log(`${colors.gray}  Current value: ${currentValue}${colors.reset}\n`);
    });
  }

  // Handle errors
  if (errors.length > 0) {
    console.log(`${colors.red}${colors.bright}\n❌ Environment validation failed!${colors.reset}\n`);
    console.log(`${colors.red}Missing or invalid required environment variables:${colors.reset}\n`);

    errors.forEach(({ key, description, example, currentValue, errorMessage }) => {
      console.log(`${colors.red}${colors.bright}  • ${key}${colors.reset}`);
      console.log(`${colors.gray}    Description: ${description}${colors.reset}`);
      if (currentValue) {
        console.log(`${colors.red}    Current value: ${currentValue}${colors.reset}`);
        console.log(`${colors.red}    Error: ${errorMessage}${colors.reset}`);
      } else {
        console.log(`${colors.gray}    Example: ${example}${colors.reset}`);
      }
      console.log('');
    });

    console.log(`${colors.yellow}💡 To fix this:${colors.reset}\n`);
    console.log('  1. Create a .env file in the project root');
    console.log('  2. Copy variables from .env.example');
    console.log('  3. Fill in the required values\n');

    throw new Error('Environment validation failed. Please check the errors above.');
  }

  console.log(`${colors.green}✅ Environment validation passed!${colors.reset}\n`);
}

/**
 * Displays current environment configuration
 */
function displayConfig() {
  console.log(`${colors.blue}📋 Current Configuration:${colors.reset}\n`);

  const config = {
    'Database': {
      'MongoDB URI': process.env.MONGO_URI?.replace(/\/\/.*:.*@/, '//***:***@') || 'Not set',
      'Database Name': process.env.DB_NAME || 'Not set'
    },
    'Server': {
      'Port': process.env.PORT || 'Not set',
      'Environment': process.env.NODE_ENV || 'development',
      'CORS Origin': process.env.ORIGIN || '*'
    },
    'Monitoring': {
      'Sentry DSN': process.env.SENTRY_DSN ? 'Configured' : 'Not configured'
    }
  };

  for (const [category, values] of Object.entries(config)) {
    console.log(`${colors.cyan}  ${category}:${colors.reset}`);
    for (const [key, value] of Object.entries(values)) {
      console.log(`    ${key}: ${value}`);
    }
    console.log('');
  }
}

module.exports = {
  validateEnvVariables,
  displayConfig,
  configSchema
};
