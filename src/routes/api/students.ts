import { Router, Request, Response } from 'express';

const router = Router();

// Sample data (replace with database in production)
let students = [
  { id: 1, name: 'Student One', email: 'student1@example.com', enrollmentDate: '2024-01-15' },
  { id: 2, name: 'Student Two', email: 'student2@example.com', enrollmentDate: '2024-01-16' }
];

// GET all students
router.get('/', (req: Request, res: Response) => {
  res.json({
    success: true,
    count: students.length,
    data: students
  });
});

// GET student by ID
router.get('/:id', (req: Request, res: Response) => {
  const student = students.find(s => s.id === parseInt(req.params.id));
  
  if (!student) {
    return res.status(404).json({
      success: false,
      error: 'Student not found'
    });
  }

  res.json({
    success: true,
    data: student
  });
});

// POST create new student
router.post('/', (req: Request, res: Response) => {
  const { name, email, enrollmentDate } = req.body;

  if (!name || !email) {
    return res.status(400).json({
      success: false,
      error: 'Name and email are required'
    });
  }

  const newStudent = {
    id: students.length + 1,
    name,
    email,
    enrollmentDate: enrollmentDate || new Date().toISOString().split('T')[0]
  };

  students.push(newStudent);

  res.status(201).json({
    success: true,
    data: newStudent
  });
});

// PUT update student
router.put('/:id', (req: Request, res: Response) => {
  const studentIndex = students.findIndex(s => s.id === parseInt(req.params.id));
  
  if (studentIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'Student not found'
    });
  }

  const { name, email, enrollmentDate } = req.body;
  students[studentIndex] = {
    ...students[studentIndex],
    name: name || students[studentIndex].name,
    email: email || students[studentIndex].email,
    enrollmentDate: enrollmentDate || students[studentIndex].enrollmentDate
  };

  res.json({
    success: true,
    data: students[studentIndex]
  });
});

// DELETE student
router.delete('/:id', (req: Request, res: Response) => {
  const studentIndex = students.findIndex(s => s.id === parseInt(req.params.id));
  
  if (studentIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'Student not found'
    });
  }

  students = students.filter(s => s.id !== parseInt(req.params.id));

  res.json({
    success: true,
    message: 'Student deleted successfully'
  });
});

export default router;
