import { Request, Response } from 'express';
import { scheduleService } from '../services/scheduleService';

export const getSessionTimeSlots = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.query;
    if (!sessionId) { res.status(400).json({ success: false, error: 'sessionId required' }); return; }
    const data = await scheduleService.getSessionTimeSlots(sessionId as string);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
};

export const getAvailableTeachersForSlot = async (req: Request, res: Response): Promise<void> => {
  try {
    const { courseId, sessionId, timeSlotId, dayOfWeek, yearLevel, academicYearId, semester } = req.query;
    if (!courseId || !sessionId || !timeSlotId || !dayOfWeek || !yearLevel || !academicYearId || !semester) {
      res.status(400).json({ success: false, error: 'courseId, sessionId, timeSlotId, dayOfWeek, yearLevel, academicYearId, semester required' });
      return;
    }
    const data = await scheduleService.getAvailableTeachersForSlot({
      courseId: courseId as string,
      sessionId: sessionId as string,
      timeSlotId: timeSlotId as string,
      dayOfWeek: dayOfWeek as string,
      yearLevel: parseInt(yearLevel as string),
      academicYearId: academicYearId as string,
      semester: parseInt(semester as string)
    });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
};

export const createManualClass = async (req: Request, res: Response): Promise<void> => {
  try {
    const { courseId, academicYearId, timeSlotId, teacherId, dayOfWeek, yearLevel, semester, sectionCode, room } = req.body;
    if (!courseId || !academicYearId || !timeSlotId || !teacherId || !dayOfWeek || !yearLevel || !semester || !sectionCode || !room) {
      res.status(400).json({ success: false, error: 'ຂໍ້ມູນບໍ່ຄົບຖ້ວນ' });
      return;
    }
    const data = await scheduleService.createManualClass({ courseId, academicYearId, timeSlotId, teacherId, dayOfWeek, yearLevel: parseInt(yearLevel), semester: parseInt(semester), sectionCode, room });
    res.json({ success: true, message: 'ສ້າງຫ້ອງຮຽນສຳເລັດ', data });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
};

export const deleteClass = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await scheduleService.deleteClass(id);
    res.json({ success: true, message: 'ລົບຫ້ອງຮຽນສຳເລັດ' });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
};

/**
 * Generate automatic schedule for classes
 */
export const generateSchedule = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      academicYearId,
      semester,
      departmentId,
      yearLevel,
      dryRun
    } = req.body;

    // Validation
    if (!academicYearId) {
      res.status(400).json({
        success: false,
        error: 'ກະລຸນາລະບຸ academicYearId'
      });
      return;
    }

    if (!semester || semester < 1 || semester > 2) {
      res.status(400).json({
        success: false,
        error: 'Semester must be 1 or 2'
      });
      return;
    }

    if (yearLevel && (yearLevel < 1 || yearLevel > 3)) {
      res.status(400).json({
        success: false,
        error: 'Year level must be between 1 and 3'
      });
      return;
    }

    const result = await scheduleService.generateSchedule({
      academicYearId,
      semester,
      departmentId: departmentId || null,
      yearLevel: yearLevel || null,
      dryRun: dryRun || false
    });

    res.json({
      success: true,
      message: dryRun 
        ? 'ການທົດສອບສ້າງຕາຕະລາງສຳເລັດ (Dry Run)' 
        : 'ສ້າງຕາຕະລາງສຳເລັດ',
      data: result
    });
  } catch (error) {
    console.error('Error generating schedule:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
};

/**
 * Get schedule summary for a semester
 */
export const getScheduleSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const { academicYearId, semester, departmentId } = req.query;

    if (!academicYearId || !semester) {
      res.status(400).json({
        success: false,
        error: 'ກະລຸນາລະບຸ academicYearId ແລະ semester'
      });
      return;
    }

    const result = await scheduleService.getScheduleSummary({
      academicYearId: academicYearId as string,
      semester: parseInt(semester as string),
      departmentId: departmentId as string || null
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error getting schedule summary:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
};

/**
 * Detect schedule conflicts
 */
export const detectConflicts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { academicYearId, semester } = req.query;

    if (!academicYearId || !semester) {
      res.status(400).json({
        success: false,
        error: 'ກະລຸນາລະບຸ academicYearId ແລະ semester'
      });
      return;
    }

    const result = await scheduleService.detectConflicts({
      academicYearId: academicYearId as string,
      semester: parseInt(semester as string)
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error detecting conflicts:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
};

/**
 * Get all classes for a schedule
 */
export const getScheduleClasses = async (req: Request, res: Response): Promise<void> => {
  try {
    const { academicYearId, semester, departmentId, yearLevel } = req.query;

    if (!academicYearId || !semester) {
      res.status(400).json({
        success: false,
        error: 'ກະລຸນາລະບຸ academicYearId ແລະ semester'
      });
      return;
    }

    const result = await scheduleService.getScheduleClasses({
      academicYearId: academicYearId as string,
      semester: parseInt(semester as string),
      departmentId: departmentId as string || null,
      yearLevel: yearLevel ? parseInt(yearLevel as string) : null
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error getting schedule classes:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
};

/**
 * Delete all classes for a semester (reset schedule)
 */
export const deleteSchedule = async (req: Request, res: Response): Promise<void> => {
  try {
    const { academicYearId, semester } = req.body;

    if (!academicYearId || !semester) {
      res.status(400).json({
        success: false,
        error: 'ກະລຸນາລະບຸ academicYearId ແລະ semester'
      });
      return;
    }

    const result = await scheduleService.deleteSchedule({
      academicYearId,
      semester: parseInt(semester)
    });

    res.json({
      success: true,
      message: 'ລົບຕາຕະລາງສຳເລັດ',
      data: result
    });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
};
