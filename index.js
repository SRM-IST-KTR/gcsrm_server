require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/utils/db');

const PORT = process.env.PORT;

// Connect to the database and then start the server

connectDB()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.error('Failed to connect to the database:', err);
        process.exit(1);
    });