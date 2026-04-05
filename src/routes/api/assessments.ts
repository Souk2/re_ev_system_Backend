import { Router, Request, Response } from 'express';

const router = Router();

// Sample data (replace with database in production)
let assessments = [
  { id: 1, studentId: 1, courseId: 1, type: 'Midterm', score: 85, grade: 'B+', date: '2024-03-15' },
  { id: 2, studentId: 1, courseId: 1, type: 'Final', score: 90, grade: 'A', date: '2024-05-20' }
];

// GET all assessments
router.get('/', (req: Request, res: Response) => {
  res.json({
    success: true,
    count: assessments.length,
    data: assessments
  });
});

// GET assessment by ID
router.get('/:id', (req: Request, res: Response) => {
  const assessment = assessments.find(a => a.id === parseInt(req.params.id));
  
  if (!assessment) {
    return res.status(404).json({
      success: false,
      error: 'ບໍ່ພົບຂໍ້ມູນການປະເມີນຜົນ'
    });
  }

  res.json({
    success: true,
    data: assessment
  });
});

// GET assessments by student ID
router.get('/student/:studentId', (req: Request, res: Response) => {
  const studentAssessments = assessments.filter(
    a => a.studentId === parseInt(req.params.studentId)
  );

  res.json({
    success: true,
    count: studentAssessments.length,
    data: studentAssessments
  });
});

// GET assessments by course ID
router.get('/course/:courseId', (req: Request, res: Response) => {
  const courseAssessments = assessments.filter(
    a => a.courseId === parseInt(req.params.courseId)
  );

  res.json({
    success: true,
    count: courseAssessments.length,
    data: courseAssessments
  });
});

// POST create new assessment
router.post('/', (req: Request, res: Response) => {
  const { studentId, courseId, type, score, grade, date } = req.body;

  if (!studentId || !courseId || !type || score === undefined) {
    return res.status(400).json({
      success: false,
      error: 'ກະລຸນາປ້ອນລະຫັດນັກສຶກສາ, ລະຫັດວິຊາ, ປະເພດ ແລະ ຄະແນນ'
    });
  }

  const newAssessment = {
    id: assessments.length + 1,
    studentId,
    courseId,
    type,
    score,
    grade: grade || calculateGrade(score),
    date: date || new Date().toISOString().split('T')[0]
  };

  assessments.push(newAssessment);

  res.status(201).json({
    success: true,
    data: newAssessment
  });
});

// PUT update assessment
router.put('/:id', (req: Request, res: Response) => {
  const assessmentIndex = assessments.findIndex(a => a.id === parseInt(req.params.id));
  
  if (assessmentIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'ບໍ່ພົບຂໍ້ມູນການປະເມີນຜົນ'
    });
  }

  const { studentId, courseId, type, score, grade, date } = req.body;
  assessments[assessmentIndex] = {
    ...assessments[assessmentIndex],
    studentId: studentId || assessments[assessmentIndex].studentId,
    courseId: courseId || assessments[assessmentIndex].courseId,
    type: type || assessments[assessmentIndex].type,
    score: score !== undefined ? score : assessments[assessmentIndex].score,
    grade: grade || (score !== undefined ? calculateGrade(score) : assessments[assessmentIndex].grade),
    date: date || assessments[assessmentIndex].date
  };

  res.json({
    success: true,
    data: assessments[assessmentIndex]
  });
});

// DELETE assessment
router.delete('/:id', (req: Request, res: Response) => {
  assessments = assessments.filter(a => a.id !== parseInt(req.params.id));

  res.json({
    success: true,
    message: 'Assessment deleted successfully'
  });
});

// Helper function to calculate grade
function calculateGrade(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 85) return 'B+';
  if (score >= 80) return 'B';
  if (score >= 75) return 'C+';
  if (score >= 70) return 'C';
  if (score >= 65) return 'D+';
  if (score >= 60) return 'D';
  return 'F';
}

export default router;
