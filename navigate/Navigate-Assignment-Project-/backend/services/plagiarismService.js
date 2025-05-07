const { Configuration, OpenAIApi } = require('openai');
const AWS = require('aws-sdk');

// Configure OpenAI
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Configure AWS for Comprehend
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: 'us-east-1'
});

const comprehend = new AWS.Comprehend();

/**
 * Detect plagiarism in student response
 * @param {String} studentResponse - The student's answer
 * @returns {Object} Plagiarism detection results
 */
exports.detectPlagiarism = async (studentResponse) => {
  try {
    // Strategy: Use multiple methods and combine results
    const [aiDetectionResult, textAnalysisResult] = await Promise.all([
      detectPlagiarismWithAI(studentResponse),
      analyzeTextWithComprehend(studentResponse)
    ]);
    
    // Combine scores (weights can be adjusted)
    const combinedScore = (aiDetectionResult.score * 0.7) + (textAnalysisResult.score * 0.3);
    
    // Prepare feedback based on score
    let feedback = '';
    if (combinedScore < 30) {
      feedback = 'The response appears to be original.';
    } else if (combinedScore < 60) {
      feedback = 'Some elements of the response may be similar to existing sources. Consider adding more original analysis.';
    } else {
      feedback = 'The response contains significant similarity to existing sources. Please ensure proper attribution or rework for more originality.';
    }
    
    return {
      similarityScore: combinedScore,
      feedback,
      aiConfidence: aiDetectionResult.confidence,
      textFeatures: textAnalysisResult.features
    };
  } catch (error) {
    console.error('Error in plagiarism detection:', error);
    return {
      similarityScore: 0, // Default to no plagiarism on error
      feedback: 'Plagiarism detection system encountered an error. Please review manually.',
      error: error.message
    };
  }
};

/**
 * Use AI to detect potential plagiarism
 */
async function detectPlagiarismWithAI(text) {
  try {
    const prompt = `
      You are an expert at detecting plagiarism in student work.
      
      Please analyze the following text for signs of plagiarism such as:
      1. Unusual vocabulary or phrases that don't match typical student writing
      2. Sophisticated sentence structure inconsistent with student level
      3. Formal academic language mixed with informal language
      4. Content that appears to be copied from common sources
      
      Text to analyze:
      "${text.substring(0, 1000)}"
      
      Provide:
      1. A plagiarism probability score from 0-100 (where 0 is definitely original and 100 is definitely plagiarized)
      2. Your confidence level in this assessment (0-100)
      3. Reasoning for your assessment
      
      Format your response as:
      Score: [number]
      Confidence: [number]
      Reasoning: [your analysis]
    `;
    
    const completion = await openai.createCompletion({
      model: "text-davinci-003",
      prompt,
      max_tokens: 500,
      temperature: 0.3,
    });
    
    const response = completion.data.choices[0].text.trim();
    
    // Parse the response
    const scoreMatch = response.match(/Score:\s*(\d+)/i);
    const confidenceMatch = response.match(/Confidence:\s*(\d+)/i);
    
    const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 50;
    const confidence = confidenceMatch ? parseInt(confidenceMatch[1], 10) : 70;
    
    return { score, confidence };
  } catch (error) {
    console.error('Error in AI plagiarism detection:', error);
    return { score: 50, confidence: 0 };
  }
}

/**
 * Analyze text patterns using AWS Comprehend
 */
async function analyzeTextWithComprehend(text) {
  // For MVP, we'll use a simplified approach without AWS Comprehend
  // In a production environment, we would use AWS Comprehend for more sophisticated analysis
  
  try {
    // Simple text analysis features
    const features = {
      averageSentenceLength: calculateAverageSentenceLength(text),
      readabilityScore: calculateReadabilityScore(text),
      uniqueWordRatio: calculateUniqueWordRatio(text)
    };
    
    // Calculate a score based on features
    // Higher scores indicate more complex text (potentially plagiarized)
    let score = 0;
    
    // Long average sentence length might indicate academic source
    if (features.averageSentenceLength > 25) score += 30;
    else if (features.averageSentenceLength > 20) score += 20;
    else if (features.averageSentenceLength > 15) score += 10;
    
    // Complex readability often indicates non-student writing
    if (features.readabilityScore > 50) score += 30;
    else if (features.readabilityScore > 30) score += 15;
    
    // Low unique word ratio might indicate memorized text
    if (features.uniqueWordRatio < 0.4) score += 40;
    else if (features.uniqueWordRatio < 0.5) score += 20;
    
    return { score, features };
  } catch (error) {
    console.error('Error in text analysis:', error);
    return { score: 0, features: {} };
  }
}

/**
 * Calculate average sentence length
 */
function calculateAverageSentenceLength(text) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  if (sentences.length === 0) return 0;
  
  const wordCount = sentences.reduce((count, sentence) => {
    return count + sentence.split(/\s+/).filter(w => w.length > 0).length;
  }, 0);
  
  return wordCount / sentences.length;
}

/**
 * Calculate simple readability score (approximation of Flesch-Kincaid)
 */
function calculateReadabilityScore(text) {
  const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
  const sentenceCount = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  const syllableCount = estimateSyllableCount(text);
  
  if (sentenceCount === 0 || wordCount === 0) return 0;
  
  // Simple formula for readability (higher = more complex)
  return (0.39 * (wordCount / sentenceCount)) + (11.8 * (syllableCount / wordCount)) - 15.59;
}

/**
 * Estimate syllable count - simplified approach
 */
function estimateSyllableCount(text) {
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  
  let count = 0;
  for (const word of words) {
    // Count vowel groups as syllables (simplified)
    const syllables = word.match(/[aeiouy]{1,}/g);
    count += syllables ? syllables.length : 1;
    
    // Adjust for silent e at end
    if (word.length > 2 && word.endsWith('e')) {
      count--;
    }
  }
  
  return Math.max(count, words.length * 0.5); // Ensure reasonable minimum
}

/**
 * Calculate unique word ratio
 */
function calculateUniqueWordRatio(text) {
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 0 && w.match(/[a-z]/));
  if (words.length === 0) return 0;
  
  const uniqueWords = new Set(words);
  return uniqueWords.size / words.length;
}

module.exports = exports;