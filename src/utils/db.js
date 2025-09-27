const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config();

const connectDB = async () => {
    try {
        if (!process.env.MONGO_URI || !process.env.DB_NAME) {
            throw new Error('Missing MONGO_URI or DB_NAME in environment variables');
        }

        const connectionInstance = await mongoose.connect(process.env.MONGO_URI, {
            dbName: process.env.DB_NAME,
        });

        console.log(`Database connected: ${connectionInstance.connection.host}`);

        mongoose.connection.on('error', (err) => {
            console.error('Mongoose connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.log('Mongoose disconnected');
        });

    } catch (error) {
        console.error('Database connection failed:', error);
        process.exit(1);
    }
};

process.on('SIGINT', async () => {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    process.exit(0);
});

module.exports = connectDB;