const { Configuration, OpenAIApi } = require('openai');
const Assessment = require('../models/Assessment');
const LearningPath = require('../models/LearningPath');
const plagiarismService = require('./plagiarismService');
const expertPanelService = require('./expertPanelService');
const syllabusAnalyzerService = require('../../ai_services/assessment/syllabusAnalyzer');

// Configure OpenAI
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

/**
 * Evaluate a student's submission using AI
 * @param {Object} assessment - Assessment object
 * @param {Array} studentAnswers - Array of student answers
 * @returns {Array} Evaluated answers with AI feedback
 */
exports.evaluateSubmission = async (assessment, studentAnswers) => {
  try {
    const evaluatedAnswers = [];
    
    // Process each answer
    for (const answer of studentAnswers) {
      const questionId = answer.questionId;
      const studentResponse = answer.answer;
      
      // Find the corresponding question in the assessment
      const question = assessment.questions.find(
        q => q._id.toString() === questionId.toString()
      );
      
      if (!question) {
        throw new Error(`Question with ID ${questionId} not found`);
      }
      
      // 1. Check for plagiarism
      const plagiarismResult = await plagiarismService.detectPlagiarism(studentResponse);
      
      // 2. Evaluate answer accuracy using AI
      const accuracyEvaluation = await evaluateAccuracy(
        question.question,
        studentResponse,
        question.groundTruth,
        question.questionType,
        question.rubric.accuracy
      );
      
      // 3. Evaluate conceptual understanding
      const conceptualEvaluation = await evaluateConceptualUnderstanding(
        question.question,
        studentResponse,
        question.relatedConcepts,
        question.rubric.conceptualUnderstanding
      );
      
      // 4. Evaluate presentation
      const presentationEvaluation = await evaluatePresentation(
        studentResponse,
        question.rubric.presentation
      );
      
      // 5. Get expert panel feedback
      const expertFeedback = await expertPanelService.getExpertFeedback(
        question.question,
        studentResponse,
        question.groundTruth,
        question.relatedConcepts
      );
      
      // Calculate total score
      const totalScore = calculateTotalScore(
        accuracyEvaluation.score,
        conceptualEvaluation.score,
        plagiarismResult.similarityScore,
        presentationEvaluation.score,
        question.rubric
      );
      
      // Identify misconceptions and learning gaps
      const { misconceptions, learningGaps } = await identifyLearningGaps(
        question.question,
        studentResponse,
        question.groundTruth,
        question.relatedConcepts
      );
      
      // Create suggestions for improvement
      const suggestions = await generateSuggestions(
        accuracyEvaluation.feedback,
        conceptualEvaluation.feedback,
        presentationEvaluation.feedback,
        expertFeedback,
        misconceptions,
        question
      );
      
      // Build evaluated answer object
      evaluatedAnswers.push({
        questionId,
        answer: studentResponse,
        aiEvaluation: {
          accuracy: accuracyEvaluation,
          conceptualUnderstanding: conceptualEvaluation,
          originality: {
            score: Math.max(0, 10 - plagiarismResult.similarityScore) / 10,
            feedback: plagiarismResult.feedback,
            similarityScore: plagiarismResult.similarityScore
          },
          presentation: presentationEvaluation,
          totalScore,
          suggestions
        },
        expertPanelFeedback: expertFeedback,
        misconceptions,
        learningGaps,
        topic: question.topic,
        relatedConcepts: question.relatedConcepts
      });
    }
    
    return evaluatedAnswers;
  } catch (error) {
    console.error('Error evaluating submission:', error);
    throw error;
  }
};

/**
 * Evaluate the accuracy of a student answer compared to ground truth
 */
async function evaluateAccuracy(question, studentAnswer, groundTruth, questionType, rubric) {
  try {
    const prompt = `
      You are an expert educator evaluating student answers.
      
      Question: ${question}
      Student Answer: ${studentAnswer}
      Reference Answer (Ground Truth): ${groundTruth}
      
      Rubric Criteria: ${rubric.criteria.join(', ')}
      
      Please evaluate the accuracy of the student's answer compared to the reference answer.
      Consider factual correctness, completeness, and alignment with the reference answer.
      
      Provide:
      1. A score between 0 and 10, where 10 is perfect accuracy
      2. Detailed feedback explaining the score
    `;
    
    const completion = await openai.createCompletion({
      model: "text-davinci-003",
      prompt,
      max_tokens: 500,
      temperature: 0.3,
    });
    
    // Parse the response
    const response = completion.data.choices[0].text.trim();
    const scoreMatch = response.match(/\d+(\.\d+)?/);
    const score = scoreMatch ? parseFloat(scoreMatch[0]) / 10 : 0.5; // Normalize to 0-1
    
    return {
      score: Math.min(Math.max(score, 0), 1), // Ensure between 0 and 1
      feedback: response.replace(/^\d+(\.\d+)?[\/\s]*10\s*/, '') // Remove score from feedback
    };
  } catch (error) {
    console.error('Error evaluating accuracy:', error);
    return {
      score: 0.5,
      feedback: 'Error evaluating answer accuracy. Please review manually.'
    };
  }
}

/**
 * Evaluate conceptual understanding
 */
async function evaluateConceptualUnderstanding(question, studentAnswer, relatedConcepts, rubric) {
  try {
    const prompt = `
      You are an expert educator evaluating a student's conceptual understanding.
      
      Question: ${question}
      Student Answer: ${studentAnswer}
      Related Concepts: ${relatedConcepts.join(', ')}
      
      Rubric Criteria: ${rubric.criteria.join(', ')}
      
      Please evaluate the student's conceptual understanding based on their answer.
      Consider depth of understanding, application of concepts, and connections between ideas.
      
      Provide:
      1. A score between 0 and 10, where 10 is perfect conceptual understanding
      2. Detailed feedback on the conceptual understanding shown in the answer
    `;
    
    const completion = await openai.createCompletion({
      model: "text-davinci-003",
      prompt,
      max_tokens: 500,
      temperature: 0.3,
    });
    
    // Parse the response
    const response = completion.data.choices[0].text.trim();
    const scoreMatch = response.match(/\d+(\.\d+)?/);
    const score = scoreMatch ? parseFloat(scoreMatch[0]) / 10 : 0.5; // Normalize to 0-1
    
    return {
      score: Math.min(Math.max(score, 0), 1), // Ensure between 0 and 1
      feedback: response.replace(/^\d+(\.\d+)?[\/\s]*10\s*/, '') // Remove score from feedback
    };
  } catch (error) {
    console.error('Error evaluating conceptual understanding:', error);
    return {
      score: 0.5,
      feedback: 'Error evaluating conceptual understanding. Please review manually.'
    };
  }
}

/**
 * Evaluate presentation of the answer
 */
async function evaluatePresentation(studentAnswer, rubric) {
  try {
    const prompt = `
      You are an expert educator evaluating the presentation quality of a student answer.
      
      Student Answer: ${studentAnswer}
      
      Rubric Criteria: ${rubric.criteria.join(', ')}
      
      Please evaluate the presentation quality of the student's answer.
      Consider clarity, organization, language usage, and overall communication effectiveness.
      
      Provide:
      1. A score between 0 and 10, where 10 is perfect presentation
      2. Detailed feedback on the presentation quality
    `;
    
    const completion = await openai.createCompletion({
      model: "text-davinci-003",
      prompt,
      max_tokens: 300,
      temperature: 0.3,
    });
    
    // Parse the response
    const response = completion.data.choices[0].text.trim();
    const scoreMatch = response.match(/\d+(\.\d+)?/);
    const score = scoreMatch ? parseFloat(scoreMatch[0]) / 10 : 0.5; // Normalize to 0-1
    
    return {
      score: Math.min(Math.max(score, 0), 1), // Ensure between 0 and 1
      feedback: response.replace(/^\d+(\.\d+)?[\/\s]*10\s*/, '') // Remove score from feedback
    };
  } catch (error) {
    console.error('Error evaluating presentation:', error);
    return {
      score: 0.7, // Default to slightly above average for presentation
      feedback: 'Error evaluating presentation quality. Please review manually.'
    };
  }
}

/**
 * Calculate overall score based on all evaluation components
 */
function calculateTotalScore(accuracyScore, conceptualScore, plagiarismScore, presentationScore, rubric) {
  // Higher plagiarism score means more plagiarism, so we invert it for originality
  const originalityScore = Math.max(0, 1 - (plagiarismScore / 100));
  
  // Calculate weighted score
  const score = 
    (accuracyScore * rubric.accuracy.weight) +
    (conceptualScore * rubric.conceptualUnderstanding.weight) +
    (originalityScore * rubric.originality.weight) +
    (presentationScore * rubric.presentation.weight);
  
  return score;
}

/**
 * Identify misconceptions and learning gaps
 */
async function identifyLearningGaps(question, studentAnswer, groundTruth, relatedConcepts) {
  try {
    const prompt = `
      You are an expert educator analyzing a student's answer for misconceptions and learning gaps.
      
      Question: ${question}
      Student Answer: ${studentAnswer}
      Reference Answer: ${groundTruth}
      Related Concepts: ${relatedConcepts.join(', ')}
      
      Please identify:
      1. List of specific misconceptions shown in the student's answer (max 3)
      2. List of learning gaps or concepts the student needs to study further (max 3)
      
      Format your response as:
      Misconceptions:
      - [misconception 1]
      - [misconception 2]
      - [misconception 3]
      
      Learning Gaps:
      - [learning gap 1]
      - [learning gap 2]
      - [learning gap 3]
    `;
    
    const completion = await openai.createCompletion({
      model: "text-davinci-003",
      prompt,
      max_tokens: 500,
      temperature: 0.3,
    });
    
    const response = completion.data.choices[0].text.trim();
    
    // Parse misconceptions and learning gaps
    const misconceptionsMatch = response.match(/Misconceptions:([\s\S]*?)(?=Learning Gaps:|$)/i);
    const learningGapsMatch = response.match(/Learning Gaps:([\s\S]*)/i);
    
    const misconceptions = misconceptionsMatch 
      ? misconceptionsMatch[1].split('-')
        .map(item => item.trim())
        .filter(item => item.length > 0)
      : [];
    
    const learningGaps = learningGapsMatch
      ? learningGapsMatch[1].split('-')
        .map(item => item.trim())
        .filter(item => item.length > 0)
      : [];
    
    return { misconceptions, learningGaps };
  } catch (error) {
    console.error('Error identifying learning gaps:', error);
    return { misconceptions: [], learningGaps: [] };
  }
}

/**
 * Generate personalized improvement suggestions
 */
async function generateSuggestions(accuracyFeedback, conceptualFeedback, presentationFeedback, expertFeedback, misconceptions, question) {
  try {
    // Compile all feedback
    const allFeedback = [
      `Accuracy feedback: ${accuracyFeedback}`,
      `Conceptual understanding feedback: ${conceptualFeedback}`,
      `Presentation feedback: ${presentationFeedback}`
    ];
    
    // Add expert feedback
    expertFeedback.forEach(ef => {
      allFeedback.push(`${ef.role} feedback: ${ef.feedback}`);
    });
    
    // Add misconceptions
    misconceptions.forEach(m => {
      allFeedback.push(`Misconception: ${m}`);
    });
    
    // Add question-specific context
    const questionContext = [
      `Question topic: ${question.topic}`,
      `Related concepts: ${question.relatedConcepts.join(', ')}`
    ];
    
    const prompt = `
      You are an expert educator providing constructive suggestions to a student.
      
      Based on the following feedback and context:
      
      ${allFeedback.join('\n\n')}
      
      Question context:
      ${questionContext.join('\n')}
      
      Generate 3-5 specific, actionable suggestions for how the student can improve.
      Each suggestion should be:
      1. Concise and directly address a specific area for improvement
      2. Actionable with clear steps the student can take
      3. Tailored to the specific topic and concepts of the question
      4. Include specific learning resources or activities when relevant
      
      Format your response as a JSON array:
      [
        {
          "suggestion": "Brief suggestion statement",
          "explanation": "More detailed explanation",
          "actionItems": ["Specific action 1", "Specific action 2"],
          "resources": ["Resource suggestion 1", "Resource suggestion 2"]
        }
      ]
      
      Only return the JSON array, no additional text.
    `;
    
    // Use the syllabusAnalyzer's LLM caller which supports both OpenAI and Qwen
    const response = await syllabusAnalyzerService.callLLM(prompt, 0.5, 2000);
    
    // Parse suggestions
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      const jsonString = jsonMatch ? jsonMatch[0] : response;
      return JSON.parse(jsonString);
    } catch (parseError) {
      console.error('Error parsing suggestions JSON:', parseError);
      return [
        {
          suggestion: "Review core concepts",
          explanation: "Focus on understanding the fundamental concepts related to this topic",
          actionItems: ["Create a concept map", "Review course materials"],
          resources: ["Course textbook", "Online tutorials"]
        }
      ];
    }
  } catch (error) {
    console.error('Error generating suggestions:', error);
    return [
      {
        suggestion: "Review the course material",
        explanation: "Revisit the course materials related to this topic to strengthen your understanding",
        actionItems: ["Re-read relevant chapters", "Review your notes"],
        resources: ["Course materials"]
      }
    ];
  }
}

/**
 * Generate a personalized learning path based on assessment results
 * @param {String} userId - User ID
 * @param {Object} assessment - Assessment object
 * @param {Array} evaluatedAnswers - Evaluated answers with feedback
 * @returns {Object} Personalized learning path
 */
exports.generateLearningPath = async (userId, assessment, evaluatedAnswers) => {
  try {
    // Group weak areas by topic
    const topicWeaknesses = {};
    
    // Process each evaluated answer to identify areas of improvement
    evaluatedAnswers.forEach(answer => {
      const topic = answer.topic;
      const score = answer.aiEvaluation.totalScore;
      
      // Consider scores below 0.7 (70%) as needing improvement
      if (score < 0.7) {
        if (!topicWeaknesses[topic]) {
          topicWeaknesses[topic] = {
            score,
            count: 1,
            misconceptions: [...answer.misconceptions],
            learningGaps: [...answer.learningGaps],
            relatedConcepts: [...answer.relatedConcepts]
          };
        } else {
          topicWeaknesses[topic].count += 1;
          topicWeaknesses[topic].score = (topicWeaknesses[topic].score + score) / 2;
          topicWeaknesses[topic].misconceptions.push(...answer.misconceptions);
          topicWeaknesses[topic].learningGaps.push(...answer.learningGaps);
          topicWeaknesses[topic].relatedConcepts.push(...answer.relatedConcepts);
        }
      }
    });
    
    // Sort topics by weakness (lowest score first)
    const sortedWeakTopics = Object.entries(topicWeaknesses)
      .sort(([, a], [, b]) => a.score - b.score)
      .map(([topic, data]) => ({
        topic,
        score: data.score,
        count: data.count,
        // Remove duplicates from lists
        misconceptions: [...new Set(data.misconceptions)],
        learningGaps: [...new Set(data.learningGaps)],
        relatedConcepts: [...new Set(data.relatedConcepts)]
      }));
    
    // Generate learning path with AI
    const learningPathData = await generateAILearningPath(sortedWeakTopics, assessment);
    
    // Create learning path in database
    const learningPath = new LearningPath({
      userId,
      assessmentId: assessment._id,
      title: learningPathData.title,
      description: learningPathData.description,
      modules: learningPathData.modules,
      createdAt: new Date(),
      status: 'active'
    });
    
    await learningPath.save();
    return learningPath;
  } catch (error) {
    console.error('Error generating learning path:', error);
    throw error;
  }
};

/**
 * Generate a learning path using AI
 */
async function generateAILearningPath(weakTopics, assessment) {
  try {
    // If no weak areas, return a general improvement path
    if (weakTopics.length === 0) {
      return {
        title: "General Knowledge Enhancement",
        description: "A learning path to strengthen your overall understanding of the subject.",
        modules: [
          {
            title: "Subject Overview",
            description: "A general review of key concepts in this subject.",
            activities: [
              {
                type: "reading",
                title: "Review Core Concepts",
                description: "Review the fundamental concepts covered in this subject."
              },
              {
                type: "practice",
                title: "Practice Problems",
                description: "Solve practice problems to reinforce your understanding."
              }
            ]
          }
        ]
      };
    }
    
    // Prepare data for learning path generation
    const weakAreasData = weakTopics.map(topic => ({
      topic: topic.topic,
      misconceptions: topic.misconceptions.slice(0, 3), // Limit to top 3
      learningGaps: topic.learningGaps.slice(0, 3),
      relatedConcepts: topic.relatedConcepts.slice(0, 5)
    }));
    
    const prompt = `
      You are an expert educational designer creating a personalized learning path for a student.
      
      The student needs improvement in these areas (ranked from weakest to strongest):
      ${JSON.stringify(weakAreasData, null, 2)}
      
      The assessment was titled: "${assessment.title}"
      
      Create a structured learning path with modules focusing on each weak area.
      For each module, include varied learning activities (readings, videos, exercises, etc.).
      
      Return a JSON object with the following structure:
      {
        "title": "Personalized Learning Path: [focus area]",
        "description": "A customized learning path to help you improve in specific areas.",
        "modules": [
          {
            "title": "Module Title",
            "description": "Module description",
            "focus": "Main topic/concept of focus",
            "activities": [
              {
                "type": "reading|video|practice|reflection|project",
                "title": "Activity Title",
                "description": "Detailed description of the activity",
                "estimatedTime": "time in minutes",
                "resources": ["Resource 1", "Resource 2"]
              }
            ]
          }
        ]
      }
      
      Limit to a maximum of 5 modules, focusing on the weakest areas first.
      Each module should have 2-4 activities.
      
      IMPORTANT: Return ONLY the JSON object, no additional text.
    `;
    
    // Use the syllabusAnalyzer's LLM caller which supports both OpenAI and Qwen
    const response = await syllabusAnalyzerService.callLLM(prompt, 0.7, 4000);
    
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : response;
      return JSON.parse(jsonString);
    } catch (parseError) {
      console.error('Error parsing learning path JSON:', parseError);
      throw new Error('Failed to generate personalized learning path');
    }
  } catch (error) {
    console.error('Error generating AI learning path:', error);
    throw error;
  }
}

module.exports = exports;