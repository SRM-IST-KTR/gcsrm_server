const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true,
	},
	email: {
		type: String,
		required: true,
		unique: true,
		index: true,
	},
	registrationNumber: {
		type: String,
		required: true,
		unique: true,
	},
	phone: {
		type: String,
		required: true,
	},
	year: {
		type: String,
		enum: ['1', '2', "both"],
		required: true,
	},
	domain: {
		type: String,
		enum: [
			"Technical",
			"Creatives",
			"Corporate"
		],
		required: true,
	},
	degreeWithBranch: {
		type: String,
		required: true,
	},
	links: {
		github: {
			type: String,
			default: null,
		},
		demo: {
			type: String,
			default: null,
		},
		deployment: {
			type: String,
			default: null,
		},
	},
	status: {
		type: String,
		enum: [
			'registered',
			'taskSubmitted',
			'interviewShortlist',
			'onboarding',
		],
		default: 'registered',
	},
},
	{
		timestamps: true,
	});

participantSchema.index({ domain: 1, year: 1 });
participantSchema.index({ status: 1 });
participantSchema.index({ name: 'text' });
participantSchema.index({ email: 1 }, { unique: true });
participantSchema.index({ registrationNumber: 1 }, { unique: true });

// Export a function that returns the model for a given connection
function getParticipantUserModel(connection) {
	return connection.model("recruitment25", participantSchema);
}

module.exports = getParticipantUserModel;