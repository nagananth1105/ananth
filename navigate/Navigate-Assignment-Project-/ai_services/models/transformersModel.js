/**
 * Direct integration with Hugging Face Transformers library
 * This module allows loading and using models directly without API calls
 */

// Importing the necessary libraries from transformers
const { AutoTokenizer, AutoModelForCausalLM } = require('transformers');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../backend/.env') });

// Model configuration
const DEFAULT_MODEL = process.env.MODEL_NAME || 'Qwen/Qwen3-30B-A3B';
let loadedModel = null;
let loadedTokenizer = null;

/**
 * Loads the model and tokenizer if not already loaded
 * @param {string} modelName - Name of the model to load
 * @returns {Object} - The loaded model and tokenizer
 */
async function loadModel(modelName = DEFAULT_MODEL) {
  if (!loadedModel || !loadedTokenizer) {
    console.log(`Loading model: ${modelName}`);
    
    try {
      // Load tokenizer and model
      loadedTokenizer = await AutoTokenizer.fromPretrained(modelName);
      loadedModel = await AutoModelForCausalLM.fromPretrained(modelName);
      
      console.log(`Model ${modelName} loaded successfully`);
    } catch (error) {
      console.error('Error loading model:', error);
      throw new Error(`Failed to load model ${modelName}: ${error.message}`);
    }
  }
  
  return {
    model: loadedModel,
    tokenizer: loadedTokenizer
  };
}

/**
 * Generate text using the loaded model
 * @param {string} prompt - The input prompt
 * @param {Object} options - Generation options (temperature, max_tokens, etc.)
 * @returns {string} Generated text
 */
async function generateText(prompt, options = {}) {
  try {
    // Ensure model is loaded
    const { model, tokenizer } = await loadModel(options.modelName || DEFAULT_MODEL);
    
    const temperature = options.temperature || 0.7;
    const maxTokens = options.maxTokens || 2000;
    
    // Tokenize the input
    const inputs = await tokenizer(prompt, { return_tensors: "pt" });
    
    // Generate text
    const output = await model.generate(inputs.input_ids, {
      max_new_tokens: maxTokens,
      temperature: temperature,
      do_sample: temperature > 0,
      top_p: 0.9,
      top_k: 50,
      repetition_penalty: 1.1
    });
    
    // Decode the generated tokens
    const generatedText = await tokenizer.decode(output[0], { skip_special_tokens: true });
    
    // Return the generated text without the original prompt
    return generatedText.slice(prompt.length).trim();
  } catch (error) {
    console.error('Error generating text:', error);
    throw new Error(`Failed to generate text: ${error.message}`);
  }
}

/**
 * Chat completion function similar to OpenAI's interface
 * @param {string} systemPrompt - System instruction
 * @param {string} userPrompt - User message
 * @param {Object} options - Generation options
 * @returns {string} Generated response
 */
async function createChatCompletion(systemPrompt, userPrompt, options = {}) {
  // Format prompt according to Qwen's chat template
  const prompt = `<|im_start|>system\n${systemPrompt || 'You are a helpful AI assistant.'}<|im_end|>\n<|im_start|>user\n${userPrompt}<|im_end|>\n<|im_start|>assistant\n`;
  
  return generateText(prompt, options);
}

module.exports = {
  loadModel,
  generateText,
  createChatCompletion
};