const dotenv = require('dotenv');
const app = require('./src/app');
const { connectDB } = require('./src/utils/db');
const { validateEnvVariables, displayConfig } = require('./src/config/validation');

// Load environment variables from .env file
dotenv.config();

// Validate environment variables before starting the application
try {
    validateEnvVariables();
    displayConfig();
} catch (error) {
    console.error('\n' + error.message);
    process.exit(1);
}

// Cast PORT to number for proper type handling
const PORT = parseInt(process.env.PORT, 10);

// Connect to the database and then start the server
connectDB()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`\n🚀 Server is running on port ${PORT}`);
            console.log(`   Environment: ${process.env.NODE_ENV}`);
            console.log(`   Database: ${process.env.DB_NAME}\n`);
        });
    })
    .catch((err) => {
        console.error('\n❌ Failed to connect to the database:', err.message);
        console.error('\n💡 Please check your MONGO_URI and database configuration\n');
        process.exit(1);
    });