const axios = require('axios');
require('dotenv').config();

/**
 * Assessment Evaluator AI Service
 * 
 * This service evaluates student assessment submissions using AI:
 * 1. Evaluates multiple choice questions automatically
 * 2. Uses LLM to evaluate essay/open-ended questions by comparing to rubrics
 * 3. Provides detailed feedback on each question
 * 4. Calculates overall scores
 * 5. Generates personalized improvement recommendations
 */

class AssessmentEvaluator {
  constructor() {
    this.openai = axios.create({
      baseURL: 'https://api.openai.com/v1',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Evaluates an entire assessment submission
   * 
   * @param {Object} submission - Student submission object containing answers
   * @param {Object} assessment - Assessment object containing questions and rubrics
   * @returns {Object} Evaluation results with scores and feedback
   */
  async evaluateSubmission(submission, assessment) {
    try {
      console.log(`Evaluating submission for assessment: ${assessment.title}`);
      
      const evaluationResults = {
        score: 0,
        feedback: '',
        questionFeedback: [],
        totalPoints: 0,
        earnedPoints: 0,
        improvement: []
      };
      
      // Process each question and answer
      for (let i = 0; i < assessment.questions.length; i++) {
        const question = assessment.questions[i];
        const studentAnswer = submission.answers.find(a => a.questionIndex === i);
        
        if (!studentAnswer) {
          console.warn(`No answer found for question ${i}`);
          evaluationResults.questionFeedback.push({
            questionIndex: i,
            score: 0,
            feedback: "No answer provided.",
            improvement: "Make sure to answer all questions."
          });
          continue;
        }
        
        // Add question points to total
        evaluationResults.totalPoints += question.points;
        
        // Evaluate based on question type
        let result;
        switch (question.type) {
          case 'multiple-choice':
            result = this._evaluateMultipleChoice(studentAnswer.answer, question);
            break;
          case 'essay':
            result = await this._evaluateEssay(studentAnswer.answer, question);
            break;
          case 'short-answer':
            result = await this._evaluateShortAnswer(studentAnswer.answer, question);
            break;
          default:
            console.warn(`Unknown question type: ${question.type}`);
            result = { score: 0, feedback: "Could not evaluate this question type." };
        }
        
        // Add earned points
        evaluationResults.earnedPoints += result.score;
        
        // Add to question feedback
        evaluationResults.questionFeedback.push({
          questionIndex: i,
          score: result.score,
          feedback: result.feedback,
          improvement: result.improvement || null
        });
      }
      
      // Calculate overall score as percentage
      evaluationResults.score = evaluationResults.totalPoints > 0 
        ? Math.round((evaluationResults.earnedPoints / evaluationResults.totalPoints) * 100) 
        : 0;
        
      // Generate overall feedback
      evaluationResults.feedback = await this._generateOverallFeedback(
        evaluationResults.score, 
        evaluationResults.questionFeedback,
        assessment.title
      );
      
      // Generate improvement recommendations
      evaluationResults.improvement = this._generateImprovementRecommendations(
        evaluationResults.questionFeedback,
        assessment
      );
      
      return evaluationResults;
    } catch (error) {
      console.error('Error in evaluateSubmission:', error);
      throw new Error(`Failed to evaluate submission: ${error.message}`);
    }
  }

  /**
   * Evaluates a multiple choice question
   * @private
   */
  _evaluateMultipleChoice(answer, question) {
    // Direct comparison with correct answer
    const isCorrect = answer === question.correctAnswer;
    const score = isCorrect ? question.points : 0;
    const feedback = isCorrect
      ? "Correct answer!"
      : `Incorrect. The correct answer is: ${question.correctAnswer}.`;
      
    return {
      score,
      feedback,
      improvement: isCorrect ? null : `Review the section about ${question.topic || "this topic"}.`
    };
  }

  /**
   * Evaluates an essay question using LLM
   * @private
   */
  async _evaluateEssay(answer, question) {
    try {
      // Skip evaluation if answer is too short
      if (!answer || answer.length < 10) {
        return {
          score: 0,
          feedback: "Your response is too short to evaluate.",
          improvement: "Please provide a complete answer to receive credit and feedback."
        };
      }

      const prompt = `
As an expert evaluator, assess the following student response to this question:

QUESTION: ${question.question}

STUDENT ANSWER: "${answer}"

${question.rubric ? `RUBRIC: ${question.rubric}` : ''}
${question.sampleAnswer ? `SAMPLE ANSWER: ${question.sampleAnswer}` : ''}

Total possible points: ${question.points}

Evaluate the response and provide:
1. A score out of ${question.points} points
2. Specific feedback on the response's strengths and weaknesses
3. One specific recommendation for improvement

Format your response as a JSON object with the following structure:
{
  "score": [numeric score],
  "feedback": "[detailed feedback]",
  "improvement": "[improvement recommendation]"
}
`;

      const response = await this.openai.post('/chat/completions', {
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are an expert educational assessment evaluator." },
          { role: "user", content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 500
      });

      // Parse the AI response
      const responseContent = response.data.choices[0].message.content;
      const jsonStartIndex = responseContent.indexOf('{');
      const jsonEndIndex = responseContent.lastIndexOf('}') + 1;
      const jsonContent = responseContent.substring(jsonStartIndex, jsonEndIndex);
      
      // Parse the JSON result
      const evaluation = JSON.parse(jsonContent);
      
      // Ensure the score doesn't exceed maximum points
      evaluation.score = Math.min(evaluation.score, question.points);
      
      return evaluation;
    } catch (error) {
      console.error('Error in essay evaluation:', error);
      
      // Fallback evaluation if AI fails
      return {
        score: Math.floor(question.points * 0.6), // Default to partial credit
        feedback: "We encountered an issue evaluating your response in detail. Your answer has been given partial credit.",
        improvement: "Please check that your answer fully addresses all aspects of the question."
      };
    }
  }

  /**
   * Evaluates a short answer question using LLM
   * @private
   */
  async _evaluateShortAnswer(answer, question) {
    // Use similar approach to essay but with different expectations
    try {
      // Skip evaluation if answer is empty
      if (!answer || answer.length === 0) {
        return {
          score: 0,
          feedback: "No answer provided.",
          improvement: "Please provide an answer to receive credit."
        };
      }

      const prompt = `
Evaluate the following student's short answer response:

QUESTION: ${question.question}
STUDENT ANSWER: "${answer}"
${question.correctAnswer ? `CORRECT ANSWER: ${question.correctAnswer}` : ''}
${question.keywords ? `KEY CONCEPTS THAT SHOULD BE MENTIONED: ${question.keywords.join(', ')}` : ''}

Total possible points: ${question.points}

Evaluate the response and provide:
1. A score out of ${question.points} points
2. Brief feedback (1-2 sentences)
3. One specific improvement suggestion

Format your response as a JSON object with the following structure:
{
  "score": [numeric score],
  "feedback": "[brief feedback]",
  "improvement": "[improvement suggestion]"
}
`;

      const response = await this.openai.post('/chat/completions', {
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are an expert educational assessment evaluator specializing in concise answers." },
          { role: "user", content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 300
      });

      // Parse the AI response
      const responseContent = response.data.choices[0].message.content;
      const jsonStartIndex = responseContent.indexOf('{');
      const jsonEndIndex = responseContent.lastIndexOf('}') + 1;
      const jsonContent = responseContent.substring(jsonStartIndex, jsonEndIndex);
      
      // Parse the JSON result
      const evaluation = JSON.parse(jsonContent);
      
      // Ensure the score doesn't exceed maximum points
      evaluation.score = Math.min(evaluation.score, question.points);
      
      return evaluation;
    } catch (error) {
      console.error('Error in short answer evaluation:', error);
      
      // Fallback evaluation
      return {
        score: Math.floor(question.points * 0.5),
        feedback: "System encountered an issue evaluating your response in detail.",
        improvement: "Ensure your answer is clear and addresses the question directly."
      };
    }
  }

  /**
   * Generates overall feedback for the submission
   * @private
   */
  async _generateOverallFeedback(score, questionFeedback, assessmentTitle) {
    try {
      // Prepare a summary of the performance
      const strengths = [];
      const weaknesses = [];
      
      questionFeedback.forEach(qf => {
        if (qf.score > 0) {
          strengths.push(qf.feedback);
        } else {
          weaknesses.push(qf.feedback);
        }
      });
      
      // Generate personalized overall feedback
      const prompt = `
Create encouraging, personalized feedback for a student who received a score of ${score}% on their "${assessmentTitle}" assessment.

Some areas they did well: ${strengths.length > 0 ? strengths.slice(0, 3).join('. ') : 'None identified.'}
Some areas needing improvement: ${weaknesses.length > 0 ? weaknesses.slice(0, 3).join('. ') : 'None identified.'}

The feedback should be:
1. Positive and encouraging
2. Specific to their performance
3. About 2-3 sentences long
`;

      const response = await this.openai.post('/chat/completions', {
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are an encouraging and supportive educational coach." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 200
      });

      return response.data.choices[0].message.content.trim();
    } catch (error) {
      console.error('Error generating overall feedback:', error);
      
      // Fallback feedback based on score
      if (score >= 90) {
        return "Excellent work! You've demonstrated a strong understanding of the material.";
      } else if (score >= 70) {
        return "Good job! You've shown solid knowledge, with some areas that could be strengthened.";
      } else if (score >= 50) {
        return "You've made good progress, but there are several concepts that need further review.";
      } else {
        return "This topic needs additional study. Focus on reviewing the core concepts and try again.";
      }
    }
  }

  /**
   * Generates improvement recommendations based on question feedback
   * @private
   */
  _generateImprovementRecommendations(questionFeedback, assessment) {
    const weakAreas = questionFeedback
      .filter(qf => qf.improvement)
      .map(qf => {
        const questionIndex = qf.questionIndex;
        const question = assessment.questions[questionIndex];
        return {
          topic: question.topic || "General knowledge",
          improvement: qf.improvement,
          weight: question.points
        };
      });
    
    // Group by topic and find the most important areas to improve
    const topicGroups = {};
    weakAreas.forEach(area => {
      if (!topicGroups[area.topic]) {
        topicGroups[area.topic] = {
          topic: area.topic,
          improvements: [],
          totalWeight: 0
        };
      }
      
      topicGroups[area.topic].improvements.push(area.improvement);
      topicGroups[area.topic].totalWeight += area.weight;
    });
    
    // Convert to array and sort by weight
    const sortedTopics = Object.values(topicGroups)
      .sort((a, b) => b.totalWeight - a.totalWeight)
      .slice(0, 3); // Top 3 areas
      
    return sortedTopics.map(topic => ({
      topic: topic.topic,
      recommendation: topic.improvements[0] // Use the first improvement for this topic
    }));
  }
}

module.exports = new AssessmentEvaluator();