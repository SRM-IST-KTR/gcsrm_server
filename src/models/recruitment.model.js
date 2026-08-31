const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      lowercase: true,
    },
    registrationNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    year: {
      type: String,
      required: true,
      trim: true,
    },
    domain: {
      type: String,
      required: true,
      trim: true,
    },
    degreeWithBranch: {
      type: String,
      required: true,
      trim: true,
    },
    // Flexible links object supporting arbitrary domain-specific submission requirements
    links: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({
        github: null,
        demo: null,
        deployment: null,
      }),
    },
    status: {
      type: String,
      enum: [
        'registered',
        'taskSubmitted',
        'interviewShortlisted',
        'interviewShortlist',
        'onboarding',
        'rejected',
        'underReview',
      ],
      default: 'registered',
    },
    notes: {
      type: String,
      default: '',
    },
    review: {
      rating: { type: Number, default: 0 },
      feedback: { type: String, default: '' },
      interviewer: { type: String, default: '' },
      reviewedAt: { type: Date, default: null },
    },
  },
  {
    timestamps: true,
    strict: false, // Allows additional domain-specific submission fields dynamically
  }
);

participantSchema.index({ domain: 1, year: 1 });
participantSchema.index({ status: 1 });
participantSchema.index({ name: 'text', email: 'text', registrationNumber: 'text' });

// Export a function that returns the model for a given connection
function getParticipantUserModel(connection) {
  if (connection && connection.models && connection.models.recruitment26) {
    return connection.models.recruitment26;
  }
  if (mongoose.models && mongoose.models.recruitment26) {
    return mongoose.models.recruitment26;
  }
  const target = connection || mongoose;
  return target.model('recruitment26', participantSchema, 'recruitment26');
}

module.exports = getParticipantUserModel;
