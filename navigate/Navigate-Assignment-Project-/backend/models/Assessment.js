const mongoose = require('mongoose');

const AssessmentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  questions: [{
    question: {
      type: String,
      required: true
    },
    questionType: {
      type: String,
      enum: ['multiple-choice', 'short-answer', 'essay', 'coding'],
      required: true
    },
    options: [String], // For multiple-choice questions
    groundTruth: {
      type: String, // Model answer or correct option
      required: true
    },
    rubric: {
      accuracy: {
        weight: {
          type: Number,
          default: 0.4
        },
        criteria: [String]
      },
      conceptualUnderstanding: {
        weight: {
          type: Number,
          default: 0.3
        },
        criteria: [String]
      },
      originality: {
        weight: {
          type: Number, 
          default: 0.2
        },
        criteria: [String]
      },
      presentation: {
        weight: {
          type: Number,
          default: 0.1
        },
        criteria: [String]
      }
    },
    relatedConcepts: [String], // Links to curriculum map
    difficultyLevel: {
      type: Number,
      min: 1,
      max: 5,
      default: 3
    }
  }],
  dueDate: {
    type: Date,
    required: true
  },
  timeLimit: {
    type: Number, // In minutes, 0 for unlimited
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Assessment', AssessmentSchema);