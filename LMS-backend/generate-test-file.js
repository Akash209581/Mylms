/**
 * Script to generate a sample Excel file for testing bulk import
 * Run with: node generate-test-file.js
 */

const XLSX = require('xlsx');

// Sample questions for testing
const sampleQuestions = [
  // MCQ
  {
    type: 'MCQ',
    questionText: 'What is the time complexity of binary search?',
    topic: 'Algorithms, Searching',
    difficulty: 'MEDIUM',
    marks: 2,
    programmingLanguage: 'General',
    companiesAppeared: 'Google, Amazon, Microsoft',
    recentYear: 2024,
    bestPracticeFor: 'DSA Interview Prep',
    optionA: 'O(n)',
    optionB: 'O(log n)',
    optionC: 'O(n^2)',
    optionD: 'O(1)',
    correctOption: 'B',
  },
  {
    type: 'MCQ',
    questionText: 'Which data structure uses LIFO principle?',
    topic: 'Data Structures',
    difficulty: 'EASY',
    marks: 1,
    optionA: 'Queue',
    optionB: 'Stack',
    optionC: 'Array',
    optionD: 'Linked List',
    correctOption: 'B',
  },
  
  // FIB
  {
    type: 'FIB',
    questionText: 'The [BLANK] operator is used for exponentiation in Python. List methods like [BLANK] add elements to the end.',
    topic: 'Python Basics',
    difficulty: 'EASY',
    marks: 2,
    programmingLanguage: 'Python',
    blank1: '**',
    blank2: 'append()',
  },
  {
    type: 'FIB',
    questionText: 'In SQL, the [BLANK] clause is used to filter records, while [BLANK] is used to sort results.',
    topic: 'SQL, Databases',
    difficulty: 'MEDIUM',
    marks: 2,
    blank1: 'WHERE',
    blank2: 'ORDER BY',
  },
  
  // MQ
  {
    type: 'MQ',
    questionText: 'Match the data structure with its time complexity for access:',
    topic: 'Data Structures, Time Complexity',
    difficulty: 'MEDIUM',
    marks: 3,
    left1: 'Array Access',
    right1: 'O(1)',
    left2: 'Linked List Search',
    right2: 'O(n)',
    left3: 'Hash Table Insert',
    right3: 'O(1) average',
  },
  
  // JC
  {
    type: 'JC',
    questionText: 'Arrange the following steps to perform bubble sort in correct order:',
    topic: 'Sorting Algorithms',
    difficulty: 'MEDIUM',
    marks: 3,
    programmingLanguage: 'Pseudocode',
    statement1: 'Compare adjacent elements',
    statement2: 'Swap if in wrong order',
    statement3: 'Repeat for all elements',
    statement4: 'Reduce range by 1 each pass',
  },
  
  // PQ
  {
    type: 'PQ',
    questionText: 'Two Sum Problem',
    topic: 'Arrays, Hash Tables',
    difficulty: 'EASY',
    marks: 5,
    programmingLanguage: 'Python',
    companiesAppeared: 'Amazon, Google, Facebook',
    recentYear: 2024,
    problemStatement: 'Given an array of integers and a target, return indices of two numbers that add up to target.',
    inputFormat: 'First line: array of integers. Second line: target integer',
    outputFormat: 'Two space-separated indices',
    constraints: '2 <= array.length <= 10^4, -10^9 <= nums[i] <= 10^9',
    testInput1: '[2,7,11,15]\n9',
    testOutput1: '0 1',
    testInput2: '[3,2,4]\n6',
    testOutput2: '1 2',
  },
  
  // OP
  {
    type: 'OP',
    questionText: 'Predict the output of the following Python code:',
    topic: 'Python, Operators',
    difficulty: 'EASY',
    marks: 2,
    programmingLanguage: 'Python',
    codeSnippet: 'x = 5\ny = 2\nprint(x // y, x % y)',
    expectedOutput: '2 1',
  },
  {
    type: 'OP',
    questionText: 'What will be the output of this code?',
    topic: 'JavaScript, Arrays',
    difficulty: 'MEDIUM',
    marks: 2,
    programmingLanguage: 'JavaScript',
    codeSnippet: 'let arr = [1, 2, 3];\narr.push(4);\nconsole.log(arr.length);',
    expectedOutput: '4',
  },
  
  // Intentional error for testing
  {
    type: 'MCQ',
    questionText: 'This question is missing options',
    topic: 'Testing',
    difficulty: 'EASY',
    // Missing optionA, optionB, optionC, optionD, correctOption
  },
];

// Create workbook
const workbook = XLSX.utils.book_new();

// Create worksheet from sample data
const worksheet = XLSX.utils.json_to_sheet(sampleQuestions);

// Set column widths for better readability
worksheet['!cols'] = [
  { wch: 10 },  // type
  { wch: 60 },  // questionText
  { wch: 25 },  // topic
  { wch: 12 },  // difficulty
  { wch: 8 },   // marks
  { wch: 18 },  // programmingLanguage
  { wch: 30 },  // companiesAppeared
  { wch: 10 },  // recentYear
  { wch: 20 },  // bestPracticeFor
];

// Add worksheet to workbook
XLSX.utils.book_append_sheet(workbook, worksheet, 'Test Questions');

// Write to file
XLSX.writeFile(workbook, 'test_questions_bulk_import.xlsx');

console.log('✅ Test file generated: test_questions_bulk_import.xlsx');
console.log('📊 Total questions: ' + sampleQuestions.length);
console.log('⚠️  Note: Last question has intentional errors for testing validation');
