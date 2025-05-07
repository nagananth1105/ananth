const syllabusAnalyzer = require('../../ai_services/assessment/syllabusAnalyzer');
const Assessment = require('../models/Assessment');
const Course = require('../models/Course');

/**
 * Controller for syllabus-related operations:
 * - Upload and analyze syllabi
 * - Generate assessments from syllabus analysis
 * - Create curriculum maps
 */

/**
 * Upload and analyze a course syllabus
 * @param {Object} req - Express request object with syllabus content
 * @param {Object} res - Express response object
 */
exports.uploadSyllabus = async (req, res) => {
  try {
    const { syllabusContent, courseId } = req.body;
    
    if (!syllabusContent) {
      return res.status(400).json({ 
        success: false, 
        message: 'No syllabus content provided' 
      });
    }

    // Verify course exists if courseId is provided
    if (courseId) {
      const course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }
    }
    
    // Analyze syllabus
    const syllabusAnalysis = await syllabusAnalyzer.analyzeSyllabus(syllabusContent);
    
    // Save analysis to course if courseId provided
    if (courseId) {
      await Course.findByIdAndUpdate(courseId, {
        syllabusAnalysis,
        updatedAt: Date.now()
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Syllabus analyzed successfully',
      syllabusAnalysis
    });
  } catch (error) {
    console.error('Error in uploadSyllabus:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to analyze syllabus',
      error: error.message
    });
  }
};

/**
 * Generate an assessment from syllabus analysis
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.generateAssessment = async (req, res) => {
  try {
    const { courseId, syllabusAnalysis, preferences } = req.body;
    
    if (!syllabusAnalysis) {
      return res.status(400).json({ 
        success: false, 
        message: 'No syllabus analysis provided' 
      });
    }
    
    // Get course if courseId is provided but no syllabus analysis is given
    if (courseId && !syllabusAnalysis) {
      const course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }
      
      if (!course.syllabusAnalysis) {
        return res.status(400).json({
          success: false,
          message: 'Course has no syllabus analysis. Please upload a syllabus first.'
        });
      }
      
      // Use course's syllabus analysis
      syllabusAnalysis = course.syllabusAnalysis;
    }
    
    // Generate assessment from syllabus analysis and preferences
    const assessmentData = await syllabusAnalyzer.generateAssessment(
      syllabusAnalysis, 
      preferences || {}
    );
    
    // If courseId is provided, save the assessment to the database
    let createdAssessment = null;
    if (courseId) {
      const assessment = new Assessment({
        title: assessmentData.title,
        description: assessmentData.description,
        course: courseId,
        questions: assessmentData.questions.map(q => ({
          question: q.question,
          questionType: q.questionType,
          options: q.options || [],
          groundTruth: q.groundTruth,
          relatedConcepts: q.relatedConcepts || [],
          difficultyLevel: q.difficultyLevel || 3,
          rubric: {
            accuracy: q.rubric?.accuracy || {
              weight: 0.4,
              criteria: []
            },
            conceptualUnderstanding: q.rubric?.conceptualUnderstanding || {
              weight: 0.3,
              criteria: []
            },
            originality: q.rubric?.originality || {
              weight: 0.2,
              criteria: []
            },
            presentation: q.rubric?.presentation || {
              weight: 0.1,
              criteria: []
            }
          }
        })),
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default due date: 1 week
        timeLimit: assessmentData.timeLimit || 30
      });
      
      createdAssessment = await assessment.save();
      
      // Add assessment to course
      await Course.findByIdAndUpdate(courseId, {
        $push: { assessments: createdAssessment._id },
        updatedAt: Date.now()
      });
    }
    
    res.status(201).json({
      success: true,
      message: 'Assessment generated successfully',
      assessment: createdAssessment || assessmentData
    });
  } catch (error) {
    console.error('Error in generateAssessment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate assessment',
      error: error.message
    });
  }
};

/**
 * Get available assessment patterns based on syllabus analysis
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAssessmentPatterns = async (req, res) => {
  try {
    const { courseId } = req.params;
    
    // Get course
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }
    
    if (!course.syllabusAnalysis) {
      return res.status(400).json({
        success: false,
        message: 'Course has no syllabus analysis. Please upload a syllabus first.'
      });
    }
    
    // Extract assessment patterns from syllabus analysis
    const patterns = course.syllabusAnalysis.assessmentPatterns?.patterns || [
      // Provide default patterns if none exist
      {
        name: "Standard Assessment",
        description: "A balanced mix of multiple-choice and short answer questions",
        structure: [
          {
            questionType: "multiple-choice",
            count: 10,
            pointsPerQuestion: 1,
            topicDistribution: []
          },
          {
            questionType: "short-answer",
            count: 5,
            pointsPerQuestion: 2,
            topicDistribution: []
          }
        ],
        totalPoints: 20,
        estimatedDuration: "30 minutes"
      },
      {
        name: "Comprehensive Exam",
        description: "In-depth assessment with a variety of question types",
        structure: [
          {
            questionType: "multiple-choice",
            count: 15,
            pointsPerQuestion: 1,
            topicDistribution: []
          },
          {
            questionType: "short-answer",
            count: 3,
            pointsPerQuestion: 5,
            topicDistribution: []
          },
          {
            questionType: "essay",
            count: 1,
            pointsPerQuestion: 10,
            topicDistribution: []
          }
        ],
        totalPoints: 30,
        estimatedDuration: "60 minutes"
      }
    ];
    
    res.status(200).json({
      success: true,
      patterns
    });
  } catch (error) {
    console.error('Error in getAssessmentPatterns:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get assessment patterns',
      error: error.message
    });
  }
};

/**
 * Check a submission for plagiarism and answer correctness
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.checkSubmission = async (req, res) => {
  try {
    const { assessmentId, answers } = req.body;
    
    if (!assessmentId || !answers) {
      return res.status(400).json({
        success: false,
        message: 'Missing assessment ID or answers'
      });
    }
    
    // Get assessment
    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: 'Assessment not found'
      });
    }
    
    // Check submission using AI
    const checkResults = await syllabusAnalyzer.checkSubmission(assessment, answers);
    
    res.status(200).json({
      success: true,
      results: checkResults
    });
  } catch (error) {
    console.error('Error in checkSubmission:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check submission',
      error: error.message
    });
  }
};