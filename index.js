const dotenv = require('dotenv');
const app = require('./src/app');
const connectDB = require('./src/utils/db');
const sessionManager = require('./src/utils/sessionManager');

dotenv.config();

const PORT = process.env.PORT;

// Connect to the database and then start the server

async function start() {
    try {
        // await connectDB(); // existing mongoose connection (can be removed if fully migrating)
        await sessionManager.connect();
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (err) {
        console.error('Startup failure:', err);
        process.exit(1);
    }
}

start();