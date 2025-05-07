const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth');

// Import the syllabus analyzer service
const syllabusAnalyzer = require('../services/syllabusAnalyzerService');

// Mock data for demonstration purposes
const assessments = [
  {
    _id: 'mock-assessment-id',
    title: 'Introduction to Web Development',
    description: 'Test your knowledge of basic web development concepts',
    courseId: 'mock-course-id',
    questions: [
      {
        type: 'multiple-choice',
        question: 'Which language is primarily used for styling web pages?',
        options: ['HTML', 'CSS', 'JavaScript', 'PHP'],
        correctAnswer: 'CSS',
        points: 10
      },
      {
        type: 'essay',
        question: 'Explain the concept of responsive web design.',
        sampleAnswer: 'Responsive web design is an approach to web design that makes web pages render well on a variety of devices and window or screen sizes.',
        points: 20
      }
    ],
    dueDate: new Date(2025, 5, 15),
    createdAt: new Date()
  }
];

const submissions = [];

// @route   GET api/assessments/upcoming
// @desc    Get list of upcoming assessments for a student
// @access  Private 
router.get('/upcoming', authMiddleware, (req, res) => {
  try {
    // In a real app, this would filter assessments by the user's enrolled courses
    // For demo purposes, we'll just return all assessments with course info
    
    const upcomingAssessments = assessments.map(assessment => ({
      _id: assessment._id,
      title: assessment.title,
      dueDate: assessment.dueDate,
      course: {
        _id: 'mock-course-id',
        title: 'Web Development Fundamentals'
      }
    }));
    
    res.json({
      success: true,
      assessments: upcomingAssessments
    });
  } catch (err) {
    console.error('Error fetching upcoming assessments:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET api/assessment/:id
// @desc    Get a specific assessment
// @access  Private
router.get('/:id', authMiddleware, (req, res) => {
  try {
    const assessment = assessments.find(a => a._id === req.params.id);
    
    if (!assessment) {
      return res.status(404).json({ success: false, message: 'Assessment not found' });
    }
    
    res.json({
      success: true,
      assessment
    });
  } catch (err) {
    console.error('Error fetching assessment:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST api/assessment/:id/submit
// @desc    Submit an assessment
// @access  Private
router.post('/:id/submit', authMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const { answers } = req.body;
    const userId = req.user.id;
    
    const assessment = assessments.find(a => a._id === id);
    if (!assessment) {
      return res.status(404).json({ success: false, message: 'Assessment not found' });
    }
    
    // Mock AI evaluation
    // In a real app, this would use your AI services
    const submission = {
      _id: `submission-${Date.now()}`,
      userId,
      assessmentId: id,
      answers,
      evaluation: {
        score: 85,
        feedback: 'Good job! You have a strong understanding of the basics.',
        questionFeedback: [
          {
            questionIndex: 0,
            score: 10,
            feedback: 'Correct answer!'
          },
          {
            questionIndex: 1,
            score: 15,
            feedback: 'Good explanation, but could be more detailed.'
          }
        ]
      },
      overallScore: 85,
      submittedAt: new Date()
    };
    
    submissions.push(submission);
    
    res.json({
      success: true,
      submissionId: submission._id
    });
  } catch (err) {
    console.error('Error submitting assessment:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET api/submissions/recent
// @desc    Get recent submissions for a student
// @access  Private
router.get('/submissions/recent', authMiddleware, (req, res) => {
  try {
    const userId = req.user.id;
    
    // In a real app, this would filter submissions by userId
    // For demo purposes, we'll just return mock data
    
    const recentSubmissions = [
      {
        _id: 'mock-submission-1',
        assessment: {
          _id: 'mock-assessment-id',
          title: 'Introduction to Web Development'
        },
        course: {
          _id: 'mock-course-id',
          title: 'Web Development Fundamentals'
        },
        overallScore: 85,
        submittedAt: new Date()
      }
    ];
    
    res.json({
      success: true,
      submissions: recentSubmissions
    });
  } catch (err) {
    console.error('Error fetching recent submissions:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET api/assessment/submission/:id
// @desc    Get a specific submission with results
// @access  Private
router.get('/submission/:id', authMiddleware, (req, res) => {
  try {
    const submission = submissions.find(s => s._id === req.params.id) || {
      _id: 'mock-submission-1',
      assessment: {
        _id: 'mock-assessment-id',
        title: 'Introduction to Web Development',
        questions: [
          {
            type: 'multiple-choice',
            question: 'Which language is primarily used for styling web pages?',
            options: ['HTML', 'CSS', 'JavaScript', 'PHP'],
            correctAnswer: 'CSS',
            points: 10
          },
          {
            type: 'essay',
            question: 'Explain the concept of responsive web design.',
            sampleAnswer: 'Responsive web design is an approach to web design that makes web pages render well on a variety of devices and window or screen sizes.',
            points: 20
          }
        ]
      },
      answers: [
        { questionIndex: 0, answer: 'CSS' },
        { questionIndex: 1, answer: 'Responsive web design ensures websites look good on all devices.' }
      ],
      evaluation: {
        score: 85,
        feedback: 'Good job! You have a strong understanding of the basics.',
        questionFeedback: [
          {
            questionIndex: 0,
            score: 10,
            feedback: 'Correct answer!'
          },
          {
            questionIndex: 1,
            score: 15,
            feedback: 'Good explanation, but could be more detailed.'
          }
        ],
        expertPanelFeedback: 'Your understanding of the core concepts is solid. Focus more on the details of responsive design principles.',
        plagiarismScore: 0
      },
      overallScore: 85,
      submittedAt: new Date(),
      courseId: 'mock-course-id'
    };
    
    res.json({
      success: true,
      submission
    });
  } catch (err) {
    console.error('Error fetching submission:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST api/assessment/syllabus/analyze
// @desc    Analyze uploaded syllabus
// @access  Private (Instructor role)
router.post('/syllabus/analyze', authMiddleware, async (req, res) => {
  try {
    // Verify user is an instructor
    if (req.user.role !== 'instructor') {
      return res.status(403).json({ 
        success: false, 
        message: 'Only instructors can analyze syllabi'
      });
    }
    
    const { syllabusContent, courseId } = req.body;
    
    if (!syllabusContent) {
      return res.status(400).json({ 
        success: false, 
        message: 'No syllabus content provided'
      });
    }
    
    // Analyze the syllabus
    const analysisResult = await syllabusAnalyzer.analyzeSyllabus(syllabusContent);
    
    // Store analysis result in database if courseId is provided
    if (courseId) {
      // Update course with syllabus analysis
      // This would be implemented in a real application
      console.log(`Updating course ${courseId} with syllabus analysis`);
    }
    
    res.json({
      success: true,
      analysis: analysisResult
    });
  } catch (err) {
    console.error('Error analyzing syllabus:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error analyzing syllabus',
      error: err.message
    });
  }
});

// @route   POST api/assessment/generate
// @desc    Generate assessment based on syllabus analysis
// @access  Private (Instructor role)
router.post('/generate', authMiddleware, async (req, res) => {
  try {
    // Verify user is an instructor
    if (req.user.role !== 'instructor') {
      return res.status(403).json({ 
        success: false, 
        message: 'Only instructors can generate assessments'
      });
    }
    
    const { syllabusAnalysis, preferences, courseId } = req.body;
    
    if (!syllabusAnalysis) {
      return res.status(400).json({ 
        success: false, 
        message: 'No syllabus analysis provided'
      });
    }
    
    // Generate assessment based on syllabus analysis and preferences
    const assessment = await syllabusAnalyzer.generateAssessment(syllabusAnalysis, preferences);
    
    // Store the generated assessment in the database
    // This would be implemented more fully in a real application
    const newAssessment = {
      _id: `generated-assessment-${Date.now()}`,
      courseId: courseId || 'no-course',
      ...assessment,
      createdAt: new Date()
    };
    
    // Add to mock data for demo purposes
    assessments.push(newAssessment);
    
    res.json({
      success: true,
      assessment: newAssessment
    });
  } catch (err) {
    console.error('Error generating assessment:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error generating assessment',
      error: err.message 
    });
  }
});

// @route   GET api/assessment/templates
// @desc    Get assessment templates based on current course
// @access  Private (Instructor role)
router.get('/templates/:courseId', authMiddleware, async (req, res) => {
  try {
    // Verify user is an instructor
    if (req.user.role !== 'instructor') {
      return res.status(403).json({ 
        success: false, 
        message: 'Only instructors can access assessment templates'
      });
    }
    
    const { courseId } = req.params;
    
    // This would retrieve stored templates from the database in a real app
    // For demo purposes, we'll return mock templates
    const templates = [
      {
        name: "Standard Quiz Template",
        description: "Balanced mix of multiple choice and short answer questions",
        questionDistribution: [
          { type: "multiple-choice", count: 10, pointsEach: 1 },
          { type: "short-answer", count: 5, pointsEach: 2 }
        ],
        difficulty: "medium",
        timeLimit: 30
      },
      {
        name: "Comprehensive Exam Template",
        description: "In-depth assessment with diverse question types",
        questionDistribution: [
          { type: "multiple-choice", count: 15, pointsEach: 1 },
          { type: "short-answer", count: 5, pointsEach: 3 },
          { type: "essay", count: 2, pointsEach: 10 }
        ],
        difficulty: "hard",
        timeLimit: 90
      },
      {
        name: "Quick Knowledge Check",
        description: "Fast multiple choice assessment",
        questionDistribution: [
          { type: "multiple-choice", count: 20, pointsEach: 1 }
        ],
        difficulty: "easy",
        timeLimit: 20
      }
    ];
    
    res.json({
      success: true,
      templates
    });
  } catch (err) {
    console.error('Error fetching assessment templates:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error retrieving templates'
    });
  }
});

module.exports = router;