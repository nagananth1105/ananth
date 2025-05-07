const aiSyllabusAnalyzer = require('../../ai_services/assessment/syllabusAnalyzer');

/**
 * Service for analyzing syllabi and generating assessments
 */
class SyllabusAnalyzerService {
  /**
   * Analyze a syllabus and extract structured information
   * 
   * @param {String} syllabusContent - The text content of the syllabus
   * @returns {Object} Structured syllabus information
   */
  async analyzeSyllabus(syllabusContent) {
    try {
      // Call the AI service to analyze the syllabus
      const analysisResult = await aiSyllabusAnalyzer.analyzeSyllabus(syllabusContent);
      
      // Process and store the analysis result
      // In a real application, this might involve storing in a database
      
      return analysisResult;
    } catch (error) {
      console.error('Error in syllabusAnalyzer service:', error);
      throw new Error(`Failed to analyze syllabus: ${error.message}`);
    }
  }
  
  /**
   * Generate an assessment based on syllabus analysis and user preferences
   * 
   * @param {Object} syllabusAnalysis - Analyzed syllabus data
   * @param {Object} preferences - User preferences for assessment generation
   * @returns {Object} Generated assessment
   */
  async generateAssessment(syllabusAnalysis, preferences) {
    try {
      // Call the AI service to generate the assessment
      const assessment = await aiSyllabusAnalyzer.generateAssessment(syllabusAnalysis, preferences);
      
      return assessment;
    } catch (error) {
      console.error('Error generating assessment:', error);
      throw new Error(`Failed to generate assessment: ${error.message}`);
    }
  }
  
  /**
   * Map course content to curriculum concepts
   * 
   * @param {String} courseId - The course ID
   * @param {Object} conceptMap - Concept map generated from syllabus analysis
   * @returns {Object} Updated curriculum map
   */
  async mapCourseToCurriculum(courseId, conceptMap) {
    try {
      // In a real application, this would retrieve course content and map to concepts
      // For demo purposes, we'll return a simplified mapping
      
      const curriculumMap = new Map();
      
      // Convert concept map to curriculum map format
      if (conceptMap && conceptMap.concepts) {
        conceptMap.concepts.forEach(concept => {
          // Find all relationships for this concept
          const relationships = conceptMap.relationships
            .filter(r => r.from === concept.id || r.to === concept.id)
            .map(r => {
              const relatedConceptId = r.from === concept.id ? r.to : r.from;
              const relatedConcept = conceptMap.concepts.find(c => c.id === relatedConceptId);
              return {
                conceptId: relatedConceptId,
                conceptName: relatedConcept ? relatedConcept.name : relatedConceptId,
                relationshipType: r.type,
                strength: r.strength
              };
            });
          
          // Add concept to curriculum map
          curriculumMap.set(concept.name, {
            conceptId: concept.id,
            description: concept.description,
            difficulty: concept.difficulty,
            importance: concept.importance,
            dependsOn: relationships
              .filter(r => r.relationshipType === 'prerequisite')
              .map(r => r.conceptName),
            relatedTo: relationships
              .filter(r => r.relationshipType !== 'prerequisite')
              .map(r => r.conceptName),
            resources: [] // Would be populated from course materials in a real app
          });
        });
      }
      
      // In a real application, we would persist this map to the database
      
      return { 
        courseId, 
        curriculumMap: Object.fromEntries(curriculumMap) 
      };
    } catch (error) {
      console.error('Error mapping course to curriculum:', error);
      throw new Error(`Failed to map course to curriculum: ${error.message}`);
    }
  }
}

module.exports = new SyllabusAnalyzerService();