const axios = require('axios');
const path = require('path');
const fs = require('fs').promises;
const transformersModel = require('../models/transformersModel');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../../backend/.env') });

// Configure Qwen (Alibaba Cloud) if API key exists
const QWEN_API_KEY = process.env.QWEN_API_KEY;
const QWEN_API_ENDPOINT = process.env.QWEN_API_ENDPOINT || 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';
const USE_LOCAL_MODEL = process.env.USE_LOCAL_MODEL === 'true';

/**
 * Calls the appropriate LLM (Local Transformers Model or Qwen API) based on configuration
 * @param {string} prompt - The prompt to send to the LLM
 * @param {number} temperature - The temperature parameter (0.0 to 1.0)
 * @param {number} maxTokens - Maximum tokens in the response
 * @returns {string} The LLM's response text
 */
async function callLLM(prompt, temperature = 0.5, maxTokens = 2000) {
  // Use Qwen API if configured, otherwise fall back to local model
  if (QWEN_API_KEY) {
    return await callQwenAPI(prompt, temperature, maxTokens);
  } else if (USE_LOCAL_MODEL) {
    return await callLocalModel(prompt, temperature, maxTokens);
  } else {
    throw new Error('No model configuration found. Please set either QWEN_API_KEY or USE_LOCAL_MODEL=true in .env file');
  }
}

/**
 * Call local transformers model (Qwen model)
 */
async function callLocalModel(prompt, temperature, maxTokens) {
  try {
    // Use the system prompt for educational AI
    const systemPrompt = 'You are an expert educational AI specializing in curriculum analysis and assessment creation.';
    
    // Call the transformers model
    const response = await transformersModel.createChatCompletion(systemPrompt, prompt, {
      temperature,
      maxTokens
    });
    
    return response.trim();
  } catch (error) {
    console.error('Local model error:', error);
    throw new Error('Failed to call local model: ' + error.message);
  }
}

/**
 * Call Qwen model via Alibaba Cloud's DashScope API
 */
async function callQwenAPI(prompt, temperature, maxTokens) {
  try {
    const response = await axios.post(
      QWEN_API_ENDPOINT,
      {
        model: process.env.QWEN_MODEL || 'qwen-max',
        input: {
          messages: [
            {
              role: 'system',
              content: 'You are an expert educational AI specializing in curriculum analysis and assessment creation.'
            },
            {
              role: 'user',
              content: prompt
            }
          ]
        },
        parameters: {
          temperature,
          max_tokens: maxTokens,
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${QWEN_API_KEY}`
        }
      }
    );
    
    // Extract text from Qwen response
    return response.data.output.text || response.data.output.choices[0].message.content;
  } catch (error) {
    console.error('Qwen API error:', error.response ? error.response.data : error);
    throw new Error('Failed to call Qwen API: ' + (error.response ? JSON.stringify(error.response.data) : error.message));
  }
}

/**
 * Analyze a syllabus document to extract key information
 * @param {string} syllabusContent - The text content of the syllabus
 * @returns {Object} Structured analysis of the syllabus
 */
async function analyzeSyllabus(syllabusContent) {
  try {
    // Limit content length if extremely long
    const limitedContent = syllabusContent.length > 15000 
      ? syllabusContent.substring(0, 15000) + "\n[Content truncated due to length...]"
      : syllabusContent;

    // Prompt for extracting basic syllabus information
    const basicInfoPrompt = `
      Analyze the following syllabus content and extract key information.
      Format your response as a valid JSON object with the following structure:
      {
        "courseTitle": "Title of the course",
        "courseCode": "Course code/number",
        "department": "Department offering the course",
        "academicLevel": "Undergraduate/Graduate/etc",
        "credits": "Number of credit hours",
        "instructor": "Course instructor(s) name(s)",
        "term": "Semester/term/year",
        "description": "A 1-2 sentence summary of the course"
      }
      
      Only return the JSON, no other text.
      
      SYLLABUS CONTENT:
      ${limitedContent}
    `;

    // Prompt for extracting learning outcomes and topics
    const learningOutcomesPrompt = `
      Analyze the following syllabus content and extract:
      
      1. Learning outcomes/objectives of the course
      2. Key topics covered in the course
      3. Weekly schedule or topic breakdown (if available)
      
      Format your response as a valid JSON object with the following structure:
      {
        "learningOutcomes": ["outcome1", "outcome2", ...],
        "keyTopics": ["topic1", "topic2", ...],
        "weeklyBreakdown": [
          {
            "week": "1", 
            "topics": ["topic1", "topic2"],
            "description": "Brief description of what is covered"
          },
          ...
        ]
      }
      
      Only return the JSON, no other text.
      
      SYLLABUS CONTENT:
      ${limitedContent}
    `;

    // Make both API calls in parallel for efficiency
    const [basicInfoResponse, learningOutcomesResponse] = await Promise.all([
      callLLM(basicInfoPrompt, 0.2, 1500),
      callLLM(learningOutcomesPrompt, 0.3, 2000)
    ]);

    // Parse JSON responses
    let basicInfo, learningOutcomes;
    
    try {
      // Extract JSON objects from responses (handling cases where model returns non-JSON text)
      const basicInfoJson = extractJsonFromString(basicInfoResponse);
      const learningOutcomesJson = extractJsonFromString(learningOutcomesResponse);
      
      basicInfo = JSON.parse(basicInfoJson);
      learningOutcomes = JSON.parse(learningOutcomesJson);
    } catch (error) {
      console.error('Error parsing LLM response:', error);
      throw new Error('Failed to parse syllabus analysis results');
    }

    // Generate assessment patterns based on the analyzed syllabus
    const assessmentPatterns = await generateAssessmentPatterns(basicInfo, learningOutcomes);

    // Generate concept map
    const conceptMap = await generateConceptMap(learningOutcomes.keyTopics, learningOutcomes.weeklyBreakdown);

    return {
      basicInfo,
      learningOutcomes,
      assessmentPatterns,
      conceptMap
    };
  } catch (error) {
    console.error('Error analyzing syllabus:', error);
    throw error;
  }
}

/**
 * Generate assessment patterns based on syllabus analysis
 */
async function generateAssessmentPatterns(basicInfo, learningOutcomes) {
  try {
    const prompt = `
      Based on this course information:
      - Course: ${basicInfo.courseTitle} (${basicInfo.courseCode})
      - Level: ${basicInfo.academicLevel}
      - Key topics: ${learningOutcomes.keyTopics.join(', ')}
      - Learning outcomes: ${learningOutcomes.learningOutcomes.slice(0, 5).join('; ')}
      
      Generate 3 different assessment patterns that would be appropriate for evaluating students in this course.
      Each pattern should have a different structure, difficulty level, and assessment philosophy.
      
      Format your response as a valid JSON object with the following structure:
      {
        "patterns": [
          {
            "name": "Pattern name",
            "description": "Brief description of this assessment pattern",
            "difficulty": "Beginner/Intermediate/Advanced",
            "structure": [
              {"questionType": "Multiple Choice", "count": 10, "pointsPerQuestion": 1},
              {"questionType": "Short Answer", "count": 5, "pointsPerQuestion": 2},
              {"questionType": "Essay", "count": 2, "pointsPerQuestion": 10}
            ],
            "totalPoints": 40,
            "estimatedTime": 60,
            "evaluationCriteria": ["criteria1", "criteria2", ...],
            "bestSuitedFor": "Description of when this pattern works best"
          },
          ...
        ]
      }
      
      Include question types such as Multiple Choice, True/False, Fill-in-the-blank, Short Answer, 
      Essay, Problem Solving, Case Study, Programming, Diagram/Visual, Matching.
      
      The pattern structures should vary to match different assessment philosophies (traditional testing,
      project-based, mastery learning, etc.)
      
      Only return the JSON, no other text.
    `;

    const response = await callLLM(prompt, 0.7, 2500);
    
    // Extract and parse the JSON
    const jsonStr = extractJsonFromString(response);
    const patterns = JSON.parse(jsonStr);
    
    return patterns;
  } catch (error) {
    console.error('Error generating assessment patterns:', error);
    return {
      patterns: [
        {
          name: "Standard Mixed Assessment",
          description: "A balanced mix of question types suitable for most courses",
          difficulty: "Intermediate",
          structure: [
            {"questionType": "Multiple Choice", "count": 10, "pointsPerQuestion": 1},
            {"questionType": "Short Answer", "count": 5, "pointsPerQuestion": 2},
            {"questionType": "Essay", "count": 1, "pointsPerQuestion": 10}
          ],
          totalPoints: 30,
          estimatedTime: 45,
          evaluationCriteria: ["Content knowledge", "Critical thinking", "Communication"],
          bestSuitedFor: "General assessment of course material comprehension"
        }
      ]
    };
  }
}

/**
 * Generate a concept map showing relationships between topics
 */
async function generateConceptMap(keyTopics, weeklyBreakdown) {
  try {
    // Prepare data for the concept map
    const topicList = keyTopics.join(', ');
    
    // Extract weekly topics if available
    let weeklyTopics = '';
    if (weeklyBreakdown && weeklyBreakdown.length > 0) {
      weeklyTopics = weeklyBreakdown
        .map(week => `Week ${week.week}: ${week.topics.join(', ')}`)
        .join('\n');
    }

    const prompt = `
      Based on the following course topics:
      ${topicList}
      
      Weekly breakdown:
      ${weeklyTopics}
      
      Create a concept map showing how these topics are related to each other. 
      The concept map should show:
      
      1. Main topics and subtopics
      2. Relationships between topics (prerequisite, related to, leads to, etc.)
      3. Key concepts under each topic
      
      Format your response as a valid JSON object representing a directed graph:
      {
        "nodes": [
          {"id": "topic1", "label": "Topic 1", "type": "main|sub|concept"},
          {"id": "topic2", "label": "Topic 2", "type": "main|sub|concept"},
          ...
        ],
        "edges": [
          {"source": "topic1", "target": "topic2", "relationship": "prerequisite|related|leads-to"},
          {"source": "topic2", "target": "topic3", "relationship": "prerequisite|related|leads-to"},
          ...
        ]
      }
      
      Only return the JSON, no other text.
    `;

    const response = await callLLM(prompt, 0.6, 2000);
    
    // Extract and parse the JSON
    const jsonStr = extractJsonFromString(response);
    const conceptMap = JSON.parse(jsonStr);
    
    return conceptMap;
  } catch (error) {
    console.error('Error generating concept map:', error);
    // Return a simplified concept map as fallback
    return {
      nodes: keyTopics.map((topic, index) => ({
        id: `topic${index}`,
        label: topic,
        type: 'main'
      })),
      edges: []
    };
  }
}

/**
 * Generate an assessment based on syllabus analysis and a selected pattern
 */
async function generateAssessment(syllabusAnalysis, pattern) {
  try {
    // Extract key information from the syllabus analysis
    const { basicInfo, learningOutcomes } = syllabusAnalysis;
    const courseTopics = learningOutcomes.keyTopics;
    const learningObjectives = learningOutcomes.learningOutcomes;
    
    // Calculate how many questions to distribute across topics
    const totalQuestions = pattern.structure.reduce((sum, item) => sum + item.count, 0);
    const questionsPerTopic = Math.ceil(totalQuestions / courseTopics.length);
    
    // Create prompt for assessment generation
    const prompt = `
      Generate an assessment for the following course:
      - Course: ${basicInfo.courseTitle} (${basicInfo.courseCode})
      - Level: ${basicInfo.academicLevel}
      
      The assessment should follow this pattern:
      - Name: ${pattern.name}
      - Description: ${pattern.description}
      - Structure: ${JSON.stringify(pattern.structure)}
      - Total points: ${pattern.totalPoints}
      
      Key topics to cover:
      ${courseTopics.join('\n')}
      
      Learning objectives:
      ${learningObjectives.join('\n')}
      
      For each question, provide:
      1. The question text
      2. Question type
      3. Associated topic from the list above
      4. Points worth
      5. Ground truth answer
      6. Rubric for evaluation
      7. Related concepts
      
      Format your response as a valid JSON object with the following structure:
      {
        "title": "Assessment title",
        "description": "Brief description of this assessment",
        "totalPoints": 100,
        "timeLimit": 60,
        "questions": [
          {
            "question": "Question text here",
            "questionType": "Multiple Choice|Short Answer|Essay|etc.",
            "options": ["Option A", "Option B", "Option C", "Option D"], 
            "topic": "Related topic from the syllabus",
            "points": 5,
            "difficulty": "Easy|Medium|Hard",
            "bloomLevel": "Knowledge|Comprehension|Application|Analysis|Synthesis|Evaluation",
            "groundTruth": "Correct answer or expected response",
            "rubric": {
              "accuracy": {"weight": 0.6, "criteria": "What makes an answer accurate"},
              "conceptualUnderstanding": {"weight": 0.3, "criteria": "How to evaluate conceptual understanding"},
              "presentation": {"weight": 0.1, "criteria": "Presentation expectations"}
            },
            "relatedConcepts": ["concept1", "concept2"]
          },
          ...
        ]
      }
      
      Distribute questions across all topics approximately evenly, with ${questionsPerTopic} questions per topic.
      For multiple-choice and similar questions, include a complete set of options.
      For essay and open-ended questions, provide a comprehensive model answer and detailed rubric.
      
      Only return the JSON, no other text.
    `;

    const response = await callLLM(prompt, 0.7, 4000);
    
    // Extract and parse the JSON
    const jsonStr = extractJsonFromString(response);
    const assessment = JSON.parse(jsonStr);
    
    return assessment;
  } catch (error) {
    console.error('Error generating assessment:', error);
    throw error;
  }
}

/**
 * Extract JSON from a string that might contain non-JSON text
 * @param {string} str - String that should contain JSON
 * @returns {string} The extracted JSON string
 */
function extractJsonFromString(str) {
  // Try to find JSON object in the string
  const jsonMatch = str.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0];
  }
  
  // Try to find JSON array in the string
  const jsonArrayMatch = str.match(/\[[\s\S]*\]/);
  if (jsonArrayMatch) {
    return jsonArrayMatch[0];
  }
  
  // If no JSON found, return the original string
  return str;
}

module.exports = {
  analyzeSyllabus,
  generateAssessment,
  generateAssessmentPatterns,
  callLLM
};