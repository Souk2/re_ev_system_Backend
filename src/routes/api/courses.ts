import { Router, Request, Response } from 'express';

const router = Router();

// Sample data (replace with database in production)
let courses = [
  { id: 1, code: 'CS101', name: 'Introduction to Computer Science', credits: 3, instructor: 'Dr. Smith' },
  { id: 2, code: 'MATH201', name: 'Advanced Mathematics', credits: 4, instructor: 'Dr. Johnson' }
];

// GET all courses
router.get('/', (req: Request, res: Response) => {
  res.json({
    success: true,
    count: courses.length,
    data: courses
  });
});

// GET course by ID
router.get('/:id', (req: Request, res: Response) => {
  const course = courses.find(c => c.id === parseInt(req.params.id));
  
  if (!course) {
    return res.status(404).json({
      success: false,
      error: 'ບໍ່ພົບຂໍ້ມູນວິຊາຮຽນ'
    });
  }

  res.json({
    success: true,
    data: course
  });
});

// POST create new course
router.post('/', (req: Request, res: Response) => {
  const { code, name, credits, instructor } = req.body;

  if (!code || !name || !credits) {
    return res.status(400).json({
      success: false,
      error: 'ກະລຸນາປ້ອນລະຫັດວິຊາ, ຊື່ ແລະ ຈຳນວນໜ່ວຍກິດ'
    });
  }

  const newCourse = {
    id: courses.length + 1,
    code,
    name,
    credits,
    instructor: instructor || 'TBA'
  };

  courses.push(newCourse);

  res.status(201).json({
    success: true,
    data: newCourse
  });
});

// PUT update course
router.put('/:id', (req: Request, res: Response) => {
  const courseIndex = courses.findIndex(c => c.id === parseInt(req.params.id));
  
  if (courseIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'ບໍ່ພົບຂໍ້ມູນວິຊາຮຽນ'
    });
  }

  const { code, name, credits, instructor } = req.body;
  courses[courseIndex] = {
    ...courses[courseIndex],
    code: code || courses[courseIndex].code,
    name: name || courses[courseIndex].name,
    credits: credits || courses[courseIndex].credits,
    instructor: instructor || courses[courseIndex].instructor
  };

  res.json({
    success: true,
    data: courses[courseIndex]
  });
});

// DELETE course
router.delete('/:id', (req: Request, res: Response) => {
  courses = courses.filter(c => c.id !== parseInt(req.params.id));

  res.json({
    success: true,
    message: 'Course deleted successfully'
  });
});

export default router;
