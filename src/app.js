const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');
const dotenv = require('dotenv');
const routes = require('./routes');
const { dbHealth } = require('./utils/db');

const errorHandler = require('./middleware/errorMiddleware');

dotenv.config();

const app = express();

app.use(express.json());

app.use(cors({
    origin: process.env.ORIGIN,
}));

if (process.env.NODE_ENV === 'prod') {
    app.use(morgan('combined'));
} else {
    app.use(morgan('dev'));
}

app.use(helmet());

// routes

app.get('/', (req, res) => {
    res.status(200).json({ message: 'octacore is awesome' });
});

app.get('/health', async (req, res) => {
    const health = dbHealth();
    const status = (health.state === 'connected') ? 200 : 503;
    res.status(status).json({
        status: health.state,
        uptime: process.uptime(),
        timestamp: Date.now(),
        hasConnectedOnce: health.hasConnectedOnce,
    });
});

app.use('/api/v1', routes);

app.use(errorHandler);

module.exports = app;