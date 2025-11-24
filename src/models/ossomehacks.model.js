const mongoose = require('mongoose');

/**
 * OssomeHacks Registration Model
 * Based on MLH Registration Guidelines
 * https://guide.mlh.io/general-information/managing-registrations/registrations
 */

const ossomeHacksSchema = new mongoose.Schema({
    // Personal Information - Required Fields
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true,
        minlength: [1, 'First name must be at least 1 character'],
        maxlength: [100, 'First name must not exceed 100 characters']
    },
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true,
        minlength: [1, 'Last name must be at least 1 character'],
        maxlength: [100, 'Last name must not exceed 100 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },
    phoneNumber: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true,
        match: [/^[0-9+\-() ]{10,20}$/, 'Please provide a valid phone number']
    },
    age: {
        type: Number,
        required: [true, 'Age is required'],
        min: [13, 'Must be at least 13 years old'],
        max: [100, 'Invalid age']
    },

    // Educational Information
    school: {
        type: String,
        required: [true, 'School/University is required'],
        trim: true
    },
    levelOfStudy: {
        type: String,
        required: [true, 'Level of study is required'],
        enum: {
            values: [
                'Less than Secondary / High School',
                'Secondary / High School',
                'Undergraduate University (2 year - community college or similar)',
                'Undergraduate University (3+ year)',
                'Graduate University (Masters, Professional, Doctoral, etc)',
                'Code School / Bootcamp',
                'Other Vocational / Trade Program or Apprenticeship',
                'Post Doctorate',
                'Other',
                'I\'m not currently a student',
                'Prefer not to answer'
            ],
            message: '{VALUE} is not a valid level of study'
        }
    },
    graduationYear: {
        type: Number,
        required: false,
        min: [2025, 'Graduation year must be 2025 or later'],
        max: [2035, 'Graduation year must be before 2035']
    },
    major: {
        type: String,
        trim: true,
        maxlength: [100, 'Major must not exceed 100 characters']
    },

    // Location
    countryOfResidence: {
        type: String,
        required: [true, 'Country of residence is required'],
        trim: true
    },

    // Professional Links
    linkedInUrl: {
        type: String,
        trim: true,
        match: [/^(https?:\/\/)?(www\.)?linkedin\.com\/.*$|^$/, 'Please provide a valid LinkedIn URL']
    },
    githubUsername: {
        type: String,
        trim: true,
        lowercase: true
    },

    // Demographics
    gender: {
        type: String,
        required: [true, 'Gender is required'],
        enum: {
            values: ['Man', 'Woman', 'Non-Binary', 'Prefer to self-describe', 'Prefer not to answer'],
            message: '{VALUE} is not a valid gender option'
        }
    },
    genderSelfDescribe: {
        type: String,
        trim: true,
        maxlength: [100, 'Gender description must not exceed 100 characters']
    },
    pronouns: {
        type: String,
        required: false,
        enum: {
            values: ['She/Her', 'He/Him', 'They/Them', 'She/They', 'He/They', 'Prefer not to answer', 'Other'],
            message: '{VALUE} is not a valid pronoun option'
        }
    },
    pronounsOther: {
        type: String,
        trim: true,
        maxlength: [50, 'Pronouns must not exceed 50 characters']
    },

    // Hackathon Experience
    hackathonsAttended: {
        type: Number,
        default: 0,
        min: [0, 'Number of hackathons cannot be negative'],
        max: [100, 'Invalid number of hackathons']
    },
    programmingExperience: {
        type: String,
        enum: {
            values: ['Beginner (0-1 years)', 'Intermediate (1-3 years)', 'Advanced (3-5 years)', 'Expert (5+ years)'],
            message: '{VALUE} is not a valid experience level'
        }
    },

    // Team Information (if applicable)
    teamName: {
        type: String,
        trim: true,
        maxlength: [100, 'Team name must not exceed 100 characters']
    },
    lookingForTeam: {
        type: Boolean,
        default: false
    },

    // MLH Required Checkboxes
    mlhCodeOfConductAgreed: {
        type: Boolean,
        required: [true, 'You must agree to the MLH Code of Conduct'],
        validate: {
            validator: function (v) {
                return v === true;
            },
            message: 'You must agree to the MLH Code of Conduct'
        }
    },
    mlhPrivacyPolicyAgreed: {
        type: Boolean,
        required: [true, 'You must agree to share information with MLH'],
        validate: {
            validator: function (v) {
                return v === true;
            },
            message: 'You must agree to share information with MLH'
        }
    },
    mlhEmailSubscription: {
        type: Boolean,
        default: true
    },

    // Event-Specific Questions
    whyAttend: {
        type: String,
        trim: true,
        maxlength: [1000, 'Response must not exceed 1000 characters']
    },
    projectIdea: {
        type: String,
        trim: true,
        maxlength: [1000, 'Project idea must not exceed 1000 characters']
    },

    // Emergency Contact
    emergencyContactName: {
        type: String,
        trim: true,
        maxlength: [100, 'Emergency contact name must not exceed 100 characters']
    },
    emergencyContactPhone: {
        type: String,
        trim: true,
        match: [/^[0-9+\-() ]{10,20}$|^$/, 'Please provide a valid emergency contact phone number']
    },
    emergencyContactRelationship: {
        type: String,
        trim: true,
        maxlength: [50, 'Relationship must not exceed 50 characters']
    },

    // Registration Meta Information
    registrationStatus: {
        type: String,
        enum: {
            values: ['pending', 'confirmed', 'checked-in', 'cancelled', 'waitlisted'],
            message: '{VALUE} is not a valid registration status'
        },
        default: 'pending'
    },
    applicationNotes: {
        type: String,
        trim: true,
        maxlength: [1000, 'Notes must not exceed 1000 characters']
    },
    referralSource: {
        type: String,
        trim: true,
        enum: {
            values: ['Social Media', 'Friend', 'Professor/Teacher', 'MLH', 'School Club', 'Previous Event', 'Other'],
            message: '{VALUE} is not a valid referral source'
        }
    },
    checkInTime: {
        type: Date
    },

    // Data tracking
    registeredAt: {
        type: Date,
        default: Date.now
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
});
// Indexes for performance
ossomeHacksSchema.index({ email: 1 }, { unique: true });
ossomeHacksSchema.index({ registrationStatus: 1 });
ossomeHacksSchema.index({ school: 1 });
ossomeHacksSchema.index({ checkInTime: 1 });
ossomeHacksSchema.index({ registeredAt: -1 });

// Pre-save middleware to update lastUpdated
ossomeHacksSchema.pre('save', function (next) {
    this.lastUpdated = Date.now();
    next();
});

// Virtual for full name
ossomeHacksSchema.virtual('fullName').get(function () {
    return `${this.firstName} ${this.lastName}`;
});

// Method to check if participant is eligible (18+)
ossomeHacksSchema.methods.isEligibleForSponsors = function () {
    return this.age >= 18;
};
ossomeHacksSchema.methods.toExport = function () {
    return {
        'Full Name': this.fullName,
        'Email': this.email,
        'Phone': this.phoneNumber,
        'Age': this.age,
        'School': this.school,
        'Level of Study': this.levelOfStudy,
        'Graduation Year': this.graduationYear || 'N/A',
        'Major': this.major || 'N/A',
        'Country': this.countryOfResidence,
        'Gender': this.gender,
        'Pronouns': this.pronouns || 'N/A',
        'Experience': this.programmingExperience || 'N/A',
        'Hackathons Attended': this.hackathonsAttended,
        'Team': this.teamName || 'N/A',
        'Looking for Team': this.lookingForTeam ? 'Yes' : 'No',
        'LinkedIn': this.linkedInUrl || 'N/A',
        'GitHub': this.githubUsername || 'N/A',
        'Status': this.registrationStatus,
        'Registered At': this.registeredAt,
        'Checked In': this.checkInTime ? 'Yes' : 'No'
    };
};

module.exports = mongoose.model('OssomeHacks3', ossomeHacksSchema);
