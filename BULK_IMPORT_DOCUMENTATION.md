# Bulk Question Import System - Documentation

## Overview
The Bulk Question Import System allows administrators, instructors, and super admins to upload multiple questions at once using Excel (.xlsx, .xls) or CSV files.

## Features Implemented

### Backend (NestJS)

#### 1. **File Upload & Parsing**
- **File Parser Service** (`file-parser.service.ts`)
  - Supports Excel (.xlsx, .xls) and CSV formats
  - Max file size: 10MB
  - Max rows per upload: 1000
  - Validates file type and MIME type
  - Flexible column name matching (case-insensitive)

#### 2. **Validation Service**
- **Question Validator Service** (`question-validator.service.ts`)
  - Type-specific validation for all 6 question types
  - **MCQ**: Validates 4 options + correct answer
  - **FIB**: Matches [BLANK] count with blank answers
  - **MQ**: Validates matching pairs (min 2 pairs)
  - **JC**: Validates jumbled statements (min 2)
  - **PQ**: Validates programming questions with test cases (min 1)
  - **OP**: Validates code snippet and expected output
  - XSS prevention and text sanitization

#### 3. **Bulk Import Service**
- **Bulk Import Service** (`bulk-import.service.ts`)
  - Batch processing (50 rows per batch)
  - Transaction-based insertion
  - Individual row error handling
  - Automatic question number generation
  - Detailed error reporting

#### 4. **API Endpoints**

##### POST `/question-bank/bulk-import`
Upload Excel/CSV file for bulk import

**Access**: SUPER_ADMIN, ADMIN, INSTRUCTOR

**Request**: `multipart/form-data` with `file` field

**Response**:
```json
{
  "totalRows": 100,
  "successfullyInserted": 95,
  "failedRows": 5,
  "errorDetails": [
    {
      "rowNumber": 12,
      "reason": "Missing required fields: type, questionText, or topic",
      "data": {
        "type": "MCQ",
        "topic": "Arrays"
      }
    }
  ],
  "uploadedBy": "admin@example.com",
  "timestamp": "2026-03-02T10:30:00Z"
}
```

##### GET `/question-bank/bulk-import/template`
Download sample Excel template

**Access**: SUPER_ADMIN, ADMIN, INSTRUCTOR

**Response**: Excel file with sample data for all question types

##### POST `/question-bank/bulk-import/error-report`
Download error report as CSV

**Access**: SUPER_ADMIN, ADMIN, INSTRUCTOR

**Request Body**:
```json
{
  "errorDetails": [...]
}
```

**Response**: CSV file with error details

### Frontend (Next.js + React)

#### 1. **Bulk Import Component** (`BulkQuestionImport.tsx`)
- Drag & drop file upload
- File validation (type, size)
- Upload progress indicator
- Results modal with:
  - Success/failure statistics
  - Progress bar
  - Error details table
  - Download error report button

#### 2. **Dashboard Pages**
Created bulk import pages for:
- `/dashboard/superadmin/question-bank/bulk-import`
- `/dashboard/admin/question-bank/bulk-import`
- `/dashboard/instructor/question-bank/bulk-import`

## Excel File Format

### Common Columns (All Question Types)
| Column | Required | Description | Example |
|--------|----------|-------------|---------|
| type | Yes | Question type | MCQ, FIB, MQ, JC, PQ, OP |
| questionText | Yes | The question text | "What is the time complexity?" |
| topic | Yes | Topic/tags | "Algorithms, Searching" |
| difficulty | No | Difficulty level | VERY_EASY, EASY, MEDIUM, HARD, VERY_HARD |
| marks | No | Points for question | 2 |
| programmingLanguage | No | Language | Python, Java, C++, etc. |
| companiesAppeared | No | Companies | "Google, Amazon" |
| recentYear | No | Recent year | 2024 |
| bestPracticeFor | No | Best practice tag | "Interview Prep" |

### Type-Specific Columns

#### MCQ (Multiple Choice Question)
| Column | Required | Example |
|--------|----------|---------|
| optionA | Yes | "O(n)" |
| optionB | Yes | "O(log n)" |
| optionC | Yes | "O(n^2)" |
| optionD | Yes | "O(1)" |
| correctOption | Yes | "B" (A, B, C, or D) |

#### FIB (Fill in the Blank)
| Column | Required | Note |
|--------|----------|------|
| blank1 | Yes | First blank answer |
| blank2 | Optional | Second blank answer |
| blank3-5 | Optional | Additional blanks |

**Note**: questionText must contain [BLANK] placeholders equal to the number of blank columns.

#### MQ (Matching Question)
| Column | Required | Example |
|--------|----------|---------|
| left1 | Yes | "Array Access" |
| right1 | Yes | "O(1)" |
| left2 | Yes | "Binary Search" |
| right2 | Yes | "O(log n)" |
| left3-5, right3-5 | Optional | Additional pairs |

**Note**: Minimum 2 pairs required.

#### JC (Jumbled Code)
| Column | Required | Example |
|--------|----------|---------|
| statement1 | Yes | "Initialize variable" |
| statement2 | Yes | "Start loop" |
| statement3-8 | Optional | Additional statements |

**Note**: Minimum 2 statements required.

#### PQ (Programming Question)
| Column | Required | Example |
|--------|----------|---------|
| problemStatement | Yes | "Given an array..." |
| inputFormat | No | "First line: array" |
| outputFormat | No | "Two space-separated indices" |
| constraints | No | "2 <= n <= 10^4" |
| testInput1 | Yes | "[2,7,11,15]\n9" |
| testOutput1 | Yes | "0 1" |
| testInput2-5 | Optional | Additional test cases |
| testOutput2-5 | Optional | Additional outputs |

**Note**: At least 1 test case (testInput1 + testOutput1) required.

#### OP (Output Prediction)
| Column | Required | Example |
|--------|----------|---------|
| codeSnippet | Yes | "x = 5\ny = 2\nprint(x // y)" |
| expectedOutput | Yes | "2 1" |

## Security Features

1. **File Validation**
   - File size limit (10MB)
   - File type validation
   - MIME type verification

2. **Data Sanitization**
   - XSS prevention
   - SQL injection prevention
   - Text length limits

3. **Role-Based Access**
   - Only SUPER_ADMIN, ADMIN, and INSTRUCTOR can import
   - Activity logging (uploadedBy, timestamp)

## Performance Optimizations

1. **Batch Processing**: Processes 50 rows per batch
2. **Transaction-Based**: Uses database transactions for data integrity
3. **Streaming Parser**: Handles large files efficiently
4. **Individual Error Handling**: Invalid rows don't affect valid ones

## Error Handling

### Types of Errors Reported
1. **File Errors**
   - Invalid file type
   - File too large
   - Empty file
   - Too many rows

2. **Row Validation Errors**
   - Missing required fields
   - Invalid enum values
   - Type-specific validation failures
   - Mismatched data (e.g., [BLANK] count mismatch)

3. **Database Errors**
   - Duplicate entries
   - Constraint violations
   - Transaction rollbacks

## Usage Guide

### Step 1: Download Template
1. Navigate to Question Bank
2. Click "Bulk Import" button
3. Click "Download Sample Template"
4. Open the Excel file in your preferred editor

### Step 2: Fill in Questions
1. Choose the appropriate sheet for your question type (or use "All_Samples")
2. Fill in the required columns
3. Add multiple rows for multiple questions
4. Save the file

### Step 3: Upload File
1. Drag and drop the file OR click to browse
2. Verify file details
3. Click "Upload and Import"
4. Wait for processing (progress indicator shown)

### Step 4: Review Results
1. Check success rate and statistics
2. Review error details if any rows failed
3. Download error report for fixing issues
4. Fix errors and re-upload failed rows if needed

## API Testing

### Test with cURL

```bash
# Upload file
curl -X POST http://localhost:3001/question-bank/bulk-import \
  -F "file=@questions.xlsx" \
  --cookie "your-auth-cookie" \
  -H "Content-Type: multipart/form-data"

# Download template
curl -X GET http://localhost:3001/question-bank/bulk-import/template \
  --cookie "your-auth-cookie" \
  -o template.xlsx
```

### Test with Postman
1. Create POST request to `/question-bank/bulk-import`
2. Set Body type to `form-data`
3. Add key `file` with type `File`
4. Select your Excel/CSV file
5. Send request

## Integration Notes

### Dependencies Added
```json
{
  "xlsx": "^latest",
  "multer": "^latest",
  "@nestjs/platform-express": "^latest",
  "csv-parser": "^latest",
  "@types/multer": "^latest"
}
```

### Database Schema
No schema changes required. Uses existing `Question` entity.

### Frontend Integration
- Component is reusable across all role dashboards
- Fully responsive design
- Tailwind CSS styling
- Axios for API requests

## Future Enhancements

1. **Real-time Progress**: WebSocket for live upload progress
2. **Validation Preview**: Preview before final upload
3. **Template Customization**: Save custom templates
4. **Bulk Edit**: Update existing questions via upload
5. **Import History**: Track all bulk imports
6. **Scheduled Imports**: Queue uploads for later processing
7. **Multi-sheet Support**: Import different question types from multiple sheets in one file

## Troubleshooting

### Common Issues

**Issue**: "File type not supported"
- **Solution**: Ensure file has .xlsx, .xls, or .csv extension

**Issue**: "Failed rows showing validation errors"
- **Solution**: Check error report, verify all required columns are filled

**Issue**: "[BLANK] count mismatch"
- **Solution**: Ensure number of [BLANK] in questionText matches number of blank columns

**Issue**: "Unauthorized" error
- **Solution**: Ensure you're logged in with ADMIN, INSTRUCTOR, or SUPERADMIN role

## Support

For issues or questions, check:
- Error logs in backend console
- Browser console for frontend errors
- Error report CSV for specific row failures
