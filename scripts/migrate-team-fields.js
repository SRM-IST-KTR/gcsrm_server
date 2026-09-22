const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const { connectDB } = require('../src/utils/db');
const Team = require('../src/models/team.model');

async function migrate() {
    try {
        console.log('Connecting to database...');
        await connectDB();

        console.log('Renaming fields in teams collection...');
        const result = await Team.collection.updateMany(
            {
                $or: [
                    { joined: { $exists: true } },
                    { isCurrent: { $exists: true } }
                ]
            },
            {
                $rename: {
                    joined: 'joined_yr',
                    isCurrent: 'isCurrentMember'
                }
            }
        );

        console.log(`Migration complete. Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);
        await mongoose.disconnect();
        return result;
    } catch (err) {
        console.error('Migration failed:', err);
        await mongoose.disconnect().catch(() => {});
        throw err;
    }
}

if (require.main === module) {
    migrate()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = migrate;
