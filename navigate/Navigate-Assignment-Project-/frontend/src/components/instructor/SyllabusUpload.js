import AnalyticsIcon from '@mui/icons-material/Analytics';
import ArticleIcon from '@mui/icons-material/Article';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Divider, Grid, Paper, TextField, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import axios from 'axios';
import React, { useState } from 'react';
import AssessmentPatternSelector from './AssessmentPatternSelector';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});

const SyllabusUpload = () => {
  const [file, setFile] = useState(null);
  const [textContent, setTextContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploadMethod, setUploadMethod] = useState('file');
  const [syllabusAnalysis, setSyllabusAnalysis] = useState(null);
  const [selectedPattern, setSelectedPattern] = useState(null);
  const [generatedAssessment, setGeneratedAssessment] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [generatingAssessment, setGeneratingAssessment] = useState(false);

  // Handle file upload
  const handleFileUpload = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      
      // Read file content if it's a text file
      if (selectedFile.type === 'text/plain') {
        const reader = new FileReader();
        reader.onload = (e) => {
          setTextContent(e.target.result);
        };
        reader.readAsText(selectedFile);
      }
    }
  };

  // Handle text input change
  const handleTextChange = (event) => {
    setTextContent(event.target.value);
    setError(null);
  };

  // Upload and analyze syllabus
  const handleAnalyzeSyllabus = async () => {
    try {
      setError(null);
      setAnalyzing(true);
      
      let syllabusContent = '';
      
      // Get content based on upload method
      if (uploadMethod === 'file' && file) {
        // If file is a text file, use the content we already read
        if (file.type === 'text/plain') {
          syllabusContent = textContent;
        } else {
          // For PDF, DOC, etc. we need to send the file to the server for processing
          const formData = new FormData();
          formData.append('file', file);
          
          const uploadResponse = await axios.post(`${API_URL}/curriculum/upload`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          
          syllabusContent = uploadResponse.data.content;
        }
      } else if (uploadMethod === 'text' && textContent) {
        syllabusContent = textContent;
      } else {
        throw new Error('Please upload a file or enter text content');
      }
      
      // Send content for analysis
      const analysisResponse = await axios.post(`${API_URL}/curriculum/analyze`, 
        { content: syllabusContent },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      setSyllabusAnalysis(analysisResponse.data);
      setSuccess('Syllabus successfully analyzed!');
    } catch (err) {
      console.error('Error analyzing syllabus:', err);
      setError(err.response?.data?.message || err.message || 'Error analyzing syllabus');
    } finally {
      setAnalyzing(false);
    }
  };

  // Generate assessment based on selected pattern
  const handleGenerateAssessment = async () => {
    if (!selectedPattern) {
      setError('Please select an assessment pattern first');
      return;
    }
    
    try {
      setError(null);
      setGeneratingAssessment(true);
      
      const response = await axios.post(`${API_URL}/assessment/generate`, 
        { 
          syllabusAnalysisId: syllabusAnalysis._id,
          pattern: selectedPattern,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      setGeneratedAssessment(response.data);
      setSuccess('Assessment successfully generated!');
    } catch (err) {
      console.error('Error generating assessment:', err);
      setError(err.response?.data?.message || err.message || 'Error generating assessment');
    } finally {
      setGeneratingAssessment(false);
    }
  };

  // Handle pattern selection from AssessmentPatternSelector
  const handlePatternSelect = (pattern) => {
    setSelectedPattern(pattern);
  };

  // Save the generated assessment
  const handleSaveAssessment = async () => {
    try {
      setLoading(true);
      setError(null);
      
      await axios.post(`${API_URL}/assessment/save`, 
        { assessment: generatedAssessment },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      setSuccess('Assessment saved successfully!');
    } catch (err) {
      console.error('Error saving assessment:', err);
      setError(err.response?.data?.message || err.message || 'Error saving assessment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: '100%', mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 3 }}>
        <ArticleIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
        Syllabus Upload & Assessment Generation
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" component="h2" gutterBottom>
                Step 1: Upload Syllabus
              </Typography>
              
              <Box sx={{ display: 'flex', mb: 2 }}>
                <Button
                  variant={uploadMethod === 'file' ? 'contained' : 'outlined'}
                  onClick={() => setUploadMethod('file')}
                  sx={{ mr: 1 }}
                >
                  File Upload
                </Button>
                <Button
                  variant={uploadMethod === 'text' ? 'contained' : 'outlined'}
                  onClick={() => setUploadMethod('text')}
                >
                  Enter Text
                </Button>
              </Box>
              
              {uploadMethod === 'file' ? (
                <Box sx={{ mb: 2 }}>
                  <Button
                    component="label"
                    variant="contained"
                    startIcon={<CloudUploadIcon />}
                    fullWidth
                    sx={{ mb: 1 }}
                  >
                    Upload Syllabus
                    <VisuallyHiddenInput type="file" onChange={handleFileUpload} />
                  </Button>
                  {file && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Selected file: {file.name}
                    </Typography>
                  )}
                  <Typography variant="caption" color="text.secondary">
                    Supported formats: PDF, DOC, DOCX, TXT
                  </Typography>
                </Box>
              ) : (
                <TextField
                  multiline
                  rows={6}
                  fullWidth
                  placeholder="Paste syllabus content here..."
                  value={textContent}
                  onChange={handleTextChange}
                  sx={{ mb: 2 }}
                  variant="outlined"
                />
              )}
              
              <Button
                variant="contained"
                color="primary"
                onClick={handleAnalyzeSyllabus}
                disabled={analyzing || (uploadMethod === 'file' && !file) || (uploadMethod === 'text' && !textContent)}
                startIcon={analyzing ? <CircularProgress size={20} color="inherit" /> : <AnalyticsIcon />}
              >
                {analyzing ? 'Analyzing...' : 'Analyze Syllabus'}
              </Button>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          {syllabusAnalysis && (
            <Card variant="outlined" sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" component="h2" gutterBottom>
                  Syllabus Analysis Results
                </Typography>
                
                {syllabusAnalysis.basicInfo && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Course Information:
                    </Typography>
                    <Typography variant="body1">
                      <strong>Title:</strong> {syllabusAnalysis.basicInfo.courseTitle}
                    </Typography>
                    <Typography variant="body1">
                      <strong>Code:</strong> {syllabusAnalysis.basicInfo.courseCode}
                    </Typography>
                  </Box>
                )}
                
                {syllabusAnalysis.learningOutcomes && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Learning Outcomes:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                      {syllabusAnalysis.learningOutcomes.keyTopics?.map((topic, index) => (
                        <Chip key={index} label={topic} size="small" />
                      ))}
                    </Box>
                  </Box>
                )}
                
                <Divider sx={{ my: 2 }} />
                
                <Typography variant="h6" component="h2" gutterBottom>
                  Step 2: Select Assessment Pattern
                </Typography>
                
                {syllabusAnalysis.assessmentPatterns?.patterns && (
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    The AI has suggested {syllabusAnalysis.assessmentPatterns.patterns.length} assessment patterns 
                    based on this syllabus. You can select one or create your own custom pattern.
                  </Typography>
                )}
                
                <AssessmentPatternSelector 
                  syllabusAnalysis={syllabusAnalysis} 
                  onPatternSelect={handlePatternSelect}
                />
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>
      
      {selectedPattern && (
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" component="h2" gutterBottom>
              Step 3: Generate Assessment
            </Typography>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Selected Pattern: {selectedPattern.name}
              </Typography>
              <Typography variant="body2">
                {selectedPattern.description}
              </Typography>
              <Box sx={{ mt: 1 }}>
                <Typography variant="body2">
                  <strong>Structure:</strong> {selectedPattern.structure?.map(item => 
                    `${item.count} ${item.questionType} (${item.pointsPerQuestion} points each)`
                  ).join(', ')}
                </Typography>
                <Typography variant="body2">
                  <strong>Total Points:</strong> {selectedPattern.totalPoints}
                </Typography>
              </Box>
            </Box>
            
            <Button
              variant="contained"
              color="primary"
              onClick={handleGenerateAssessment}
              disabled={generatingAssessment}
              startIcon={generatingAssessment ? <CircularProgress size={20} color="inherit" /> : <AssignmentIcon />}
            >
              {generatingAssessment ? 'Generating...' : 'Generate Assessment'}
            </Button>
          </CardContent>
        </Card>
      )}
      
      {generatedAssessment && (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" component="h2" gutterBottom>
              Generated Assessment
            </Typography>
            
            <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
              <Typography variant="h6">
                {generatedAssessment.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {generatedAssessment.description}
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Typography variant="body2">
                <strong>Total Questions:</strong> {generatedAssessment.questions.length}
              </Typography>
              <Typography variant="body2">
                <strong>Total Points:</strong> {generatedAssessment.totalPoints}
              </Typography>
              <Typography variant="body2">
                <strong>Time Limit:</strong> {generatedAssessment.timeLimit} minutes
              </Typography>
            </Paper>
            
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Sample Questions:
            </Typography>
            
            <Box sx={{ mb: 2 }}>
              {generatedAssessment.questions.slice(0, 3).map((question, index) => (
                <Paper key={index} elevation={0} variant="outlined" sx={{ p: 1.5, mb: 1 }}>
                  <Typography variant="body1" sx={{ mb: 0.5 }}>
                    <strong>Q{index + 1}:</strong> {question.question}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Type: {question.questionType} | Points: {question.points} | Topic: {question.topic}
                  </Typography>
                </Paper>
              ))}
              {generatedAssessment.questions.length > 3 && (
                <Typography variant="body2" color="text.secondary">
                  {generatedAssessment.questions.length - 3} more questions not shown...
                </Typography>
              )}
            </Box>
            
            <Button
              variant="contained"
              color="primary"
              onClick={handleSaveAssessment}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {loading ? 'Saving...' : 'Save Assessment'}
            </Button>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default SyllabusUpload;