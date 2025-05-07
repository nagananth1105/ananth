import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Stepper,
  Step,
  StepLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Divider,
  Card,
  CardContent,
  CircularProgress,
  FormControlLabel,
  Switch,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import TipsAndUpdatesIcon from '@mui/icons-material/TipsAndUpdates';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PreviewIcon from '@mui/icons-material/Preview';
import SyllabusUpload from '../../components/instructor/SyllabusUpload';
import AssessmentPatternSelector from '../../components/instructor/AssessmentPatternSelector';

// Mock data for patterns generated from syllabus analysis
const mockPatterns = [
  {
    id: '1',
    name: 'Comprehensive Examination',
    description: 'A balanced assessment covering all key topics and cognitive levels',
    difficulty: 'Medium',
    structure: [
      { questionType: 'Multiple Choice', count: 15, pointsPerQuestion: 2 },
      { questionType: 'Short Answer', count: 5, pointsPerQuestion: 5 },
      { questionType: 'Essay', count: 2, pointsPerQuestion: 10 }
    ],
    totalPoints: 80,
    estimatedTime: 90,
    evaluationCriteria: [
      'Content mastery',
      'Critical thinking',
      'Communication skills'
    ],
    bestSuitedFor: 'Midterm or final examination'
  },
  {
    id: '2',
    name: 'Programming Skills Assessment',
    description: 'Focus on practical implementation of data structures',
    difficulty: 'Hard',
    structure: [
      { questionType: 'Multiple Choice', count: 5, pointsPerQuestion: 2 },
      { questionType: 'Programming', count: 3, pointsPerQuestion: 15 },
      { questionType: 'Problem Solving', count: 2, pointsPerQuestion: 10 }
    ],
    totalPoints: 75,
    estimatedTime: 120,
    evaluationCriteria: [
      'Algorithm design',
      'Code efficiency',
      'Implementation correctness',
      'Problem-solving approach'
    ],
    bestSuitedFor: 'Practical programming skills evaluation'
  },
  {
    id: '3',
    name: 'Concept Mastery Check',
    description: 'Quick assessment focused on fundamental concepts',
    difficulty: 'Easy',
    structure: [
      { questionType: 'Multiple Choice', count: 20, pointsPerQuestion: 2 },
      { questionType: 'True/False', count: 10, pointsPerQuestion: 1 },
      { questionType: 'Matching', count: 5, pointsPerQuestion: 2 }
    ],
    totalPoints: 60,
    estimatedTime: 45,
    evaluationCriteria: [
      'Basic concept understanding',
      'Terminology knowledge',
      'Conceptual relationships'
    ],
    bestSuitedFor: 'Quick knowledge check or quiz'
  }
];

// Mock data for AI-generated questions
const mockGeneratedQuestions = [
  {
    id: '1',
    question: 'Which of the following data structures implements the LIFO (Last-In-First-Out) principle?',
    questionType: 'Multiple Choice',
    options: ['Queue', 'Stack', 'Array', 'Linked List'],
    correctAnswer: 'Stack',
    topic: 'Stacks and Queues',
    difficulty: 'Easy',
    points: 2,
    bloomLevel: 'Remember'
  },
  {
    id: '2',
    question: 'Explain the difference between a stack and a queue in terms of their operational principles and use cases.',
    questionType: 'Short Answer',
    correctAnswer: 'A stack follows LIFO (Last-In-First-Out) where the last element added is the first one to be removed, while a queue follows FIFO (First-In-First-Out) where the first element added is the first one to be removed. Stacks are used in function calls, expression evaluation, and backtracking algorithms, while queues are used in BFS, scheduling, and buffering.',
    topic: 'Stacks and Queues',
    difficulty: 'Medium',
    points: 5,
    bloomLevel: 'Understand'
  },
  {
    id: '3',
    question: 'Implement a function to check if a given string has balanced parentheses using a stack.',
    questionType: 'Programming',
    correctAnswer: `function isBalanced(str) {
  const stack = [];
  const pairs = {
    '(': ')',
    '{': '}',
    '[': ']'
  };
  
  for (let char of str) {
    if (pairs[char]) {
      stack.push(char);
    } else if (Object.values(pairs).includes(char)) {
      if (pairs[stack.pop()] !== char) {
        return false;
      }
    }
  }
  
  return stack.length === 0;
}`,
    topic: 'Stacks and Applications',
    difficulty: 'Hard',
    points: 15,
    bloomLevel: 'Apply'
  },
  {
    id: '4',
    question: 'What is the time complexity of the worst-case scenario for finding an element in a binary search tree?',
    questionType: 'Multiple Choice',
    options: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'],
    correctAnswer: 'O(n)',
    topic: 'Trees and Time Complexity',
    difficulty: 'Medium',
    points: 2,
    bloomLevel: 'Apply'
  },
  {
    id: '5',
    question: 'Compare and contrast Breadth-First Search (BFS) and Depth-First Search (DFS) algorithms for graph traversal.',
    questionType: 'Essay',
    correctAnswer: 'BFS explores all the neighbors at the present depth before moving to nodes at the next depth level. It uses a queue data structure and is optimal for finding the shortest path. DFS explores as far as possible along each branch before backtracking, using a stack (or recursion). BFS is better for finding shortest paths, while DFS is better for maze-like problems or when target is likely far from source. BFS requires more memory for level-by-level storage, while DFS requires less memory but may get stuck in infinite paths without proper handling.',
    topic: 'Graph Algorithms',
    difficulty: 'Hard',
    points: 10,
    bloomLevel: 'Analyze'
  }
];

// Steps for assessment creation wizard
const steps = ['Upload Syllabus', 'Select Pattern', 'Customize Questions', 'Settings & Review'];

const AssessmentCreation = () => {
  const { assessmentId } = useParams();
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  
  // Assessment data
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [courseId, setCourseId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [timeLimit, setTimeLimit] = useState(60);
  const [selectedPattern, setSelectedPattern] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [randomizeQuestions, setRandomizeQuestions] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);
  const [syllabusContent, setSyllabusContent] = useState(null);
  const [syllabusAnalysis, setSyllabusAnalysis] = useState(null);
  const [patterns, setPatterns] = useState([]);
  
  // Mock course data
  const courses = [
    { id: '1', title: 'Data Structures and Algorithms' },
    { id: '2', title: 'Introduction to Programming' },
    { id: '3', title: 'Web Development Fundamentals' }
  ];
  
  // Load assessment data if editing existing assessment
  useEffect(() => {
    if (assessmentId) {
      setIsEditing(true);
      // Simulate loading assessment data from API
      setLoading(true);
      setTimeout(() => {
        // Mock data for an existing assessment
        setTitle('Midterm Examination');
        setDescription('Comprehensive evaluation of your understanding of data structures');
        setCourseId('1');
        setDueDate('2025-11-15T23:59');
        setTimeLimit(90);
        setRandomizeQuestions(true);
        setShowAnswers(false);
        setQuestions(mockGeneratedQuestions);
        setSelectedPattern(mockPatterns[0]);
        setLoading(false);
      }, 1000);
    }
  }, [assessmentId]);
  
  // Handle syllabus analysis
  const handleSyllabusAnalysis = (content) => {
    setSyllabusContent(content);
    setLoading(true);
    
    // In a real app, this would call an API to analyze the syllabus
    setTimeout(() => {
      setLoading(false);
      setSyllabusAnalysis({
        courseTitle: 'Data Structures and Algorithms',
        courseCode: 'CS301',
        topics: ['Arrays', 'Linked Lists', 'Stacks', 'Queues', 'Trees', 'Graphs', 'Hashing'],
        learningOutcomes: [
          'Understand fundamental data structures',
          'Analyze algorithm efficiency using Big O notation',
          'Implement data structures in code',
          'Choose appropriate data structures for specific problem domains'
        ]
      });
      setPatterns(mockPatterns);
      setTitle(`${mockPatterns[0].name}: Data Structures and Algorithms`);
      setCourseId('1');
    }, 2000);
  };
  
  // Handle pattern selection
  const handlePatternSelection = (pattern) => {
    setSelectedPattern(pattern);
  };
  
  // Generate questions based on syllabus and pattern
  const handleGenerateQuestions = () => {
    if (!selectedPattern || !syllabusAnalysis) return;
    
    setGenerating(true);
    
    // In a real app, this would call an API to generate questions
    setTimeout(() => {
      setQuestions(mockGeneratedQuestions);
      setGenerating(false);
      // Move to next step after generation
      handleNext();
    }, 3000);
  };
  
  // Add a new question manually
  const handleAddQuestion = () => {
    const newQuestion = {
      id: `new-${questions.length + 1}`,
      question: '',
      questionType: 'Multiple Choice',
      options: ['', '', '', ''],
      correctAnswer: '',
      topic: '',
      difficulty: 'Medium',
      points: 2,
      bloomLevel: 'Remember'
    };
    
    setQuestions([...questions, newQuestion]);
  };
  
  // Remove a question
  const handleRemoveQuestion = (id) => {
    setQuestions(questions.filter(q => q.id !== id));
  };
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  // Next step in wizard
  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };
  
  // Back step in wizard
  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };
  
  // Save assessment
  const handleSave = () => {
    // Prepare assessment data
    const assessmentData = {
      id: assessmentId || 'new',
      title,
      description,
      courseId,
      dueDate,
      timeLimit,
      randomizeQuestions,
      showAnswers,
      questions,
      pattern: selectedPattern
    };
    
    console.log('Saving assessment:', assessmentData);
    
    // In a real app, this would call an API to save the assessment
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      // Navigate back to instructor dashboard
      navigate('/instructor/dashboard');
    }, 2000);
  };
  
  // Calculate total points
  const calculateTotalPoints = () => {
    return questions.reduce((total, question) => total + question.points, 0);
  };
  
  if (loading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="80vh"
      >
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        {isEditing ? 'Edit Assessment' : 'Create New Assessment'}
      </Typography>
      
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      
      <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
        {/* Step 1: Upload Syllabus */}
        {activeStep === 0 && (
          <Box>
            <Typography variant="h5" gutterBottom>
              Upload Course Syllabus
            </Typography>
            <Typography variant="body1" paragraph>
              Upload your course syllabus to automatically generate assessment questions based on the course content and learning objectives.
            </Typography>
            
            <SyllabusUpload onAnalysis={handleSyllabusAnalysis} />
            
            {syllabusAnalysis && (
              <Box sx={{ mt: 4 }}>
                <Typography variant="h6" gutterBottom>
                  Syllabus Analysis Results
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle1" gutterBottom>
                          Course Information
                        </Typography>
                        <List dense>
                          <ListItem>
                            <ListItemText primary="Course Title" secondary={syllabusAnalysis.courseTitle} />
                          </ListItem>
                          <ListItem>
                            <ListItemText primary="Course Code" secondary={syllabusAnalysis.courseCode} />
                          </ListItem>
                        </List>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle1" gutterBottom>
                          Key Topics
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {syllabusAnalysis.topics.map((topic, index) => (
                            <Chip key={index} label={topic} />
                          ))}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle1" gutterBottom>
                          Learning Outcomes
                        </Typography>
                        <List dense>
                          {syllabusAnalysis.learningOutcomes.map((outcome, index) => (
                            <ListItem key={index}>
                              <ListItemIcon>
                                <CheckCircleIcon color="primary" />
                              </ListItemIcon>
                              <ListItemText primary={outcome} />
                            </ListItem>
                          ))}
                        </List>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Box>
            )}
            
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4 }}>
              <Button 
                variant="contained" 
                onClick={handleNext}
                disabled={!syllabusAnalysis}
              >
                Continue
              </Button>
            </Box>
          </Box>
        )}
        
        {/* Step 2: Select Pattern */}
        {activeStep === 1 && (
          <Box>
            <Typography variant="h5" gutterBottom>
              Select Assessment Pattern
            </Typography>
            <Typography variant="body1" paragraph>
              Choose an assessment pattern that best suits your evaluation goals. Each pattern provides a different structure and mix of question types.
            </Typography>
            
            <AssessmentPatternSelector 
              patterns={patterns} 
              selectedPattern={selectedPattern}
              onSelectPattern={handlePatternSelection}
            />
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
              <Button variant="outlined" onClick={handleBack}>
                Back
              </Button>
              <Button 
                variant="contained" 
                onClick={handleGenerateQuestions}
                disabled={!selectedPattern || generating}
                startIcon={generating ? <CircularProgress size={20} /> : <AutoAwesomeIcon />}
              >
                {generating ? 'Generating Questions...' : 'Generate Questions'}
              </Button>
            </Box>
          </Box>
        )}
        
        {/* Step 3: Customize Questions */}
        {activeStep === 2 && (
          <Box>
            <Typography variant="h5" gutterBottom>
              Customize Questions
            </Typography>
            <Typography variant="body1" paragraph>
              Review, edit, or add assessment questions. You can modify AI-generated questions or create your own.
            </Typography>
            
            <Box sx={{ width: '100%', mb: 3 }}>
              <Tabs
                value={activeTab}
                onChange={handleTabChange}
                variant="fullWidth"
                textColor="primary"
                indicatorColor="primary"
              >
                <Tab label="All Questions" />
                <Tab label="Multiple Choice" />
                <Tab label="Free Response" />
                <Tab label="Programming" />
              </Tabs>
            </Box>
            
            <Box sx={{ mb: 3 }}>
              <Button 
                variant="outlined" 
                startIcon={<AddIcon />}
                onClick={handleAddQuestion}
              >
                Add New Question
              </Button>
            </Box>
            
            <List>
              {questions
                .filter(q => {
                  if (activeTab === 0) return true;
                  if (activeTab === 1) return q.questionType === 'Multiple Choice';
                  if (activeTab === 2) return ['Short Answer', 'Essay'].includes(q.questionType);
                  if (activeTab === 3) return q.questionType === 'Programming';
                  return true;
                })
                .map((question, index) => (
                  <React.Fragment key={question.id}>
                    <ListItem
                      alignItems="flex-start"
                      secondaryAction={
                        <Box>
                          <IconButton edge="end" onClick={() => {}}>
                            <EditIcon />
                          </IconButton>
                          <IconButton edge="end" onClick={() => handleRemoveQuestion(question.id)}>
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      }
                      sx={{ py: 2 }}
                    >
                      <ListItemIcon sx={{ mt: 0 }}>
                        <Typography variant="body1">
                          {index + 1}.
                        </Typography>
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ mb: 1 }}>
                            <Typography variant="body1">{question.question}</Typography>
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                              <Chip 
                                label={question.questionType} 
                                size="small" 
                                color="primary" 
                                variant="outlined"
                              />
                              <Chip 
                                label={question.difficulty} 
                                size="small" 
                                color={
                                  question.difficulty === 'Easy' ? 'success' : 
                                  question.difficulty === 'Medium' ? 'primary' : 
                                  'error'
                                }
                                variant="outlined"
                              />
                              <Chip 
                                label={`${question.points} pts`} 
                                size="small" 
                                variant="outlined"
                              />
                              <Chip 
                                label={question.topic} 
                                size="small" 
                                variant="outlined"
                              />
                            </Box>
                            
                            {question.questionType === 'Multiple Choice' && (
                              <List dense>
                                {question.options.map((option, idx) => (
                                  <ListItem key={idx} dense sx={{ py: 0 }}>
                                    <ListItemIcon sx={{ minWidth: 32 }}>
                                      {option === question.correctAnswer ? (
                                        <CheckCircleIcon color="success" fontSize="small" />
                                      ) : (
                                        <Typography variant="body2">
                                          {String.fromCharCode(65 + idx)}.
                                        </Typography>
                                      )}
                                    </ListItemIcon>
                                    <ListItemText primary={option} />
                                  </ListItem>
                                ))}
                              </List>
                            )}
                            
                            {(question.questionType === 'Short Answer' || question.questionType === 'Essay') && (
                              <Box sx={{ mt: 1 }}>
                                <Typography variant="body2" color="text.secondary">
                                  <b>Sample Answer:</b> {question.correctAnswer.length > 100 ? 
                                    `${question.correctAnswer.substring(0, 100)}...` : 
                                    question.correctAnswer}
                                </Typography>
                              </Box>
                            )}
                            
                            {question.questionType === 'Programming' && (
                              <Box sx={{ mt: 1 }}>
                                <Typography variant="body2" color="text.secondary">
                                  <b>Sample Solution</b> (abbreviated)
                                </Typography>
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    fontFamily: 'monospace', 
                                    whiteSpace: 'pre-wrap',
                                    bgcolor: 'grey.100',
                                    p: 1,
                                    borderRadius: 1,
                                    maxHeight: 80,
                                    overflow: 'hidden'
                                  }}
                                >
                                  {question.correctAnswer.split('\n').slice(0, 3).join('\n')}...
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                    <Divider component="li" />
                  </React.Fragment>
                ))}
            </List>
            
            {questions.length === 0 && (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Typography variant="body1" color="text.secondary">
                  No questions added yet. Click "Add New Question" or go back to generate questions.
                </Typography>
              </Box>
            )}
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
              <Button variant="outlined" onClick={handleBack}>
                Back
              </Button>
              <Button 
                variant="contained" 
                onClick={handleNext}
                disabled={questions.length === 0}
              >
                Continue
              </Button>
            </Box>
          </Box>
        )}
        
        {/* Step 4: Settings & Review */}
        {activeStep === 3 && (
          <Box>
            <Typography variant="h5" gutterBottom>
              Assessment Settings & Review
            </Typography>
            <Typography variant="body1" paragraph>
              Configure assessment settings and review all details before saving.
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Basic Information
                </Typography>
                <TextField
                  label="Assessment Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  fullWidth
                  margin="normal"
                  required
                />
                <TextField
                  label="Description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  fullWidth
                  margin="normal"
                  multiline
                  rows={3}
                />
                <FormControl fullWidth margin="normal" required>
                  <InputLabel>Course</InputLabel>
                  <Select
                    value={courseId}
                    onChange={(e) => setCourseId(e.target.value)}
                    label="Course"
                  >
                    {courses.map(course => (
                      <MenuItem key={course.id} value={course.id}>
                        {course.title}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  label="Due Date & Time"
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  fullWidth
                  margin="normal"
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Assessment Settings
                </Typography>
                <TextField
                  label="Time Limit (minutes)"
                  type="number"
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(e.target.value)}
                  fullWidth
                  margin="normal"
                  InputProps={{ inputProps: { min: 0 } }}
                  helperText="Set to 0 for no time limit"
                />
                <Box sx={{ mt: 2 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={randomizeQuestions}
                        onChange={(e) => setRandomizeQuestions(e.target.checked)}
                      />
                    }
                    label="Randomize question order"
                  />
                </Box>
                <Box>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={showAnswers}
                        onChange={(e) => setShowAnswers(e.target.checked)}
                      />
                    }
                    label="Show answers after submission"
                  />
                </Box>
              </Grid>
              
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Assessment Summary
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Question Type</TableCell>
                        <TableCell align="right">Count</TableCell>
                        <TableCell align="right">Points Each</TableCell>
                        <TableCell align="right">Total Points</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {['Multiple Choice', 'Short Answer', 'Essay', 'Programming'].map(type => {
                        const typeQuestions = questions.filter(q => q.questionType === type);
                        if (typeQuestions.length === 0) return null;
                        
                        return (
                          <TableRow key={type}>
                            <TableCell component="th" scope="row">
                              {type}
                            </TableCell>
                            <TableCell align="right">{typeQuestions.length}</TableCell>
                            <TableCell align="right">
                              {typeQuestions.length > 0 
                                ? `${Math.min(...typeQuestions.map(q => q.points))} - ${Math.max(...typeQuestions.map(q => q.points))}`
                                : 'N/A'}
                            </TableCell>
                            <TableCell align="right">
                              {typeQuestions.reduce((sum, q) => sum + q.points, 0)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      <TableRow sx={{ '& td': { fontWeight: 'bold' } }}>
                        <TableCell>Total</TableCell>
                        <TableCell align="right">{questions.length}</TableCell>
                        <TableCell align="right">-</TableCell>
                        <TableCell align="right">{calculateTotalPoints()}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
            </Grid>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
              <Button variant="outlined" onClick={handleBack}>
                Back
              </Button>
              <Box>
                <Button 
                  variant="outlined" 
                  sx={{ mr: 2 }}
                  startIcon={<PreviewIcon />}
                >
                  Preview
                </Button>
                <Button 
                  variant="contained" 
                  onClick={handleSave}
                  disabled={!title || !courseId}
                  startIcon={<CheckCircleIcon />}
                >
                  {isEditing ? 'Save Changes' : 'Create Assessment'}
                </Button>
              </Box>
            </Box>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default AssessmentCreation;