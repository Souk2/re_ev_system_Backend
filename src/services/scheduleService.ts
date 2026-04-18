import { pool } from '../config/database';

export interface GenerateScheduleParams {
  academicYearId: string;
  semester: number;
  departmentId?: string | null;
  yearLevel?: number | null;
  dryRun?: boolean;
  sectionsPerCourse?: number;
  coursesOneSlot?: string[] | null; // Course IDs that should have only 1 slot per week
  useV7?: boolean; // Use new session-based scheduling
}

export interface ScheduleSummaryParams {
  academicYearId: string;
  semester: number;
  departmentId?: string | null;
}

export interface DetectConflictsParams {
  academicYearId: string;
  semester: number;
}

export interface GetScheduleClassesParams {
  academicYearId: string;
  semester: number;
  departmentId?: string | null;
  yearLevel?: number | null;
}

export interface DeleteScheduleParams {
  academicYearId: string;
  semester: number;
}

export interface ScheduleResult {
  class_id: string;
  course_code: string;
  course_name: string;
  teacher_name: string;
  day_of_week: string;
  session_name: string;
  time_slot_code: string;
  room: string;
  section_code: string;
  year_level: number;
  status: string;
}

export interface ScheduleSummaryResult {
  course_code: string;
  course_name: string;
  year_level: number;
  total_sections: number;
  teachers_assigned: string;
  time_slots: string;
}

export interface ConflictResult {
  conflict_type: string;
  description: string;
  class_id_1: string;
  class_id_2: string;
}

export interface ClassDetails {
  id: string;
  course_id: string;
  course_code: string;
  course_name: string;
  academic_year_id: string;
  time_slot_id: string;
  teacher_id: string;
  teacher_name: string;
  day_of_week: string;
  year_level: number;
  semester: number;
  section_code: string;
  room: string;
  current_enrolled: number;
  is_closed: boolean;
  session_name: string;
  time_start: string;
  time_end: string;
}

class ScheduleService {
  /**
   * Generate automatic schedule for classes
   */
  async generateSchedule(params: GenerateScheduleParams): Promise<ScheduleResult[]> {
    const client = await pool.connect();

    try {
      // Use V7 for session-based scheduling
      const functionName = params.useV7 ? 'fn_auto_generate_schedule_v7' : 'fn_auto_generate_schedule_v5';
      
      const query = params.useV7 ? `
        SELECT * FROM ${functionName}(
          $1::UUID,
          $2::INTEGER,
          $3::UUID,
          $4::INTEGER,
          $5::BOOLEAN,
          $6::UUID[]
        )
      ` : `
        SELECT * FROM ${functionName}(
          $1::UUID,
          $2::INTEGER,
          $3::UUID,
          $4::INTEGER,
          $5::BOOLEAN
        )
      `;

      const values = params.useV7 ? [
        params.academicYearId,
        params.semester,
        params.departmentId,
        params.yearLevel,
        params.dryRun,
        params.coursesOneSlot || null
      ] : [
        params.academicYearId,
        params.semester,
        params.departmentId,
        params.yearLevel,
        params.dryRun
      ];

      const result = await client.query(query, values);

      return result.rows;
    } catch (error: any) {
      console.error('Error in generateSchedule:', error);
      throw new Error(`Failed to generate schedule: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Get schedule summary for a semester
   */
  async getScheduleSummary(params: ScheduleSummaryParams): Promise<ScheduleSummaryResult[]> {
    const client = await pool.connect();
    
    try {
      const query = `
        SELECT * FROM fn_get_schedule_summary(
          $1::UUID,
          $2::INTEGER,
          $3::UUID
        )
      `;
      
      const values = [
        params.academicYearId,
        params.semester,
        params.departmentId
      ];

      const result = await client.query(query, values);
      
      return result.rows;
    } catch (error: any) {
      console.error('Error in getScheduleSummary:', error);
      throw new Error(`Failed to get schedule summary: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Detect schedule conflicts
   */
  async detectConflicts(params: DetectConflictsParams): Promise<ConflictResult[]> {
    const client = await pool.connect();
    
    try {
      const query = `
        SELECT * FROM fn_detect_schedule_conflicts(
          $1::UUID,
          $2::INTEGER
        )
      `;
      
      const values = [
        params.academicYearId,
        params.semester
      ];

      const result = await client.query(query, values);
      
      return result.rows;
    } catch (error: any) {
      console.error('Error in detectConflicts:', error);
      throw new Error(`Failed to detect conflicts: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Get all classes for a schedule with full details
   */
  async getScheduleClasses(params: GetScheduleClassesParams): Promise<ClassDetails[]> {
    const client = await pool.connect();
    
    try {
      let query = `
        SELECT
          cl.id,
          cl.course_id,
          c.code AS course_code,
          c.name AS course_name,
          cl.academic_year_id,
          cl.time_slot_id,
          cl.teacher_id,
          t.first_name || ' ' || t.last_name AS teacher_name,
          cl.day_of_week,
          cl.year_level,
          cl.semester,
          cl.section_code,
          cl.room,
          cl.current_enrolled,
          cl.is_closed,
          s.name_en AS session_name,
          ts.time_start::TEXT,
          ts.time_end::TEXT
        FROM classes cl
        INNER JOIN courses c ON cl.course_id = c.id
        INNER JOIN teachers t ON cl.teacher_id = t.id
        INNER JOIN time_slots ts ON cl.time_slot_id = ts.id
        INNER JOIN sessions s ON ts.session_id = s.id
        WHERE cl.academic_year_id = $1::UUID
          AND cl.semester = $2::INTEGER
      `;
      
      const values: any[] = [
        params.academicYearId,
        params.semester
      ];

      let paramCount = 3;

      if (params.departmentId) {
        query += ` AND c.department_id = $${paramCount}::UUID`;
        values.push(params.departmentId);
        paramCount++;
      }

      if (params.yearLevel) {
        query += ` AND cl.year_level = $${paramCount}::INTEGER`;
        values.push(params.yearLevel);
        paramCount++;
      }

      query += ` ORDER BY cl.year_level, c.code, cl.section_code`;

      const result = await client.query(query, values);
      
      return result.rows;
    } catch (error: any) {
      console.error('Error in getScheduleClasses:', error);
      throw new Error(`Failed to get schedule classes: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Delete all classes for a semester (reset schedule)
   */
  async deleteSchedule(params: DeleteScheduleParams): Promise<{ deletedCount: number }> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // First, delete all enrollments for these classes
      const deleteEnrollmentsQuery = `
        DELETE FROM enrollments 
        WHERE class_id IN (
          SELECT id FROM classes 
          WHERE academic_year_id = $1::UUID 
            AND semester = $2::INTEGER
        )
      `;
      
      await client.query(deleteEnrollmentsQuery, [
        params.academicYearId,
        params.semester
      ]);

      // Then delete the classes
      const deleteClassesQuery = `
        DELETE FROM classes 
        WHERE academic_year_id = $1::UUID 
          AND semester = $2::INTEGER
        RETURNING id
      `;
      
      const result = await client.query(deleteClassesQuery, [
        params.academicYearId,
        params.semester
      ]);

      await client.query('COMMIT');
      
      return {
        deletedCount: result.rowCount || 0
      };
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Error in deleteSchedule:', error);
      throw new Error(`Failed to delete schedule: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Get available teachers for a course
   */
  async getAvailableTeachers(courseId: string, yearLevel: number): Promise<any[]> {
    const client = await pool.connect();
    
    try {
      const query = `
        SELECT DISTINCT
          t.id,
          t.first_name,
          t.last_name,
          t.email,
          t.specialization,
          ARRAY_AGG(DISTINCT ta.session_id) AS available_sessions,
          ARRAY_AGG(DISTINCT ta.year_level) AS available_year_levels
        FROM teachers t
        INNER JOIN teacher_qualifications tq ON t.id = tq.teacher_id
        LEFT JOIN teacher_availability ta ON t.id = ta.teacher_id
        WHERE tq.course_id = $1::UUID
          AND t.is_active = true
          AND (ta.year_level = $2::INTEGER OR ta.year_level IS NULL)
        GROUP BY t.id, t.first_name, t.last_name, t.email, t.specialization
        ORDER BY t.last_name, t.first_name
      `;

      const result = await client.query(query, [courseId, yearLevel]);
      
      return result.rows;
    } catch (error: any) {
      console.error('Error in getAvailableTeachers:', error);
      throw new Error(`Failed to get available teachers: ${error.message}`);
    } finally {
      client.release();
    }
  }

  async getSessionTimeSlots(sessionId: string): Promise<any[]> {
    const result = await pool.query(
      `SELECT id, code, name_lo, time_start::TEXT, time_end::TEXT
       FROM time_slots WHERE session_id = $1::UUID ORDER BY time_start`,
      [sessionId]
    );
    return result.rows;
  }

  async getAvailableTeachersForSlot(params: {
    courseId: string;
    sessionId: string;
    timeSlotId: string;
    dayOfWeek: string;
    yearLevel: number;
    academicYearId: string;
    semester: number;
  }): Promise<any[]> {
    const { courseId, sessionId, timeSlotId, dayOfWeek, yearLevel, academicYearId, semester } = params;
    const result = await pool.query(`
      SELECT DISTINCT t.id,
        t.first_name || ' ' || t.last_name AS full_name,
        t.specialization
      FROM teachers t
      INNER JOIN teacher_qualifications tq ON t.id = tq.teacher_id AND tq.course_id = $1::UUID
      INNER JOIN teacher_availability ta ON t.id = ta.teacher_id
        AND ta.session_id = $2::UUID
        AND ta.day_of_week = $4
        AND (ta.year_level = $5::INTEGER OR ta.year_level IS NULL)
      WHERE t.is_active = true
        AND NOT EXISTS (
          SELECT 1 FROM classes c
          WHERE c.teacher_id = t.id
            AND c.academic_year_id = $6::UUID
            AND c.semester = $7::INTEGER
            AND c.day_of_week = $4
            AND c.time_slot_id = $3::UUID
        )
      ORDER BY full_name
    `, [courseId, sessionId, timeSlotId, dayOfWeek, yearLevel, academicYearId, semester]);
    return result.rows;
  }

  async createManualClass(params: {
    courseId: string;
    academicYearId: string;
    timeSlotId: string;
    teacherId: string;
    dayOfWeek: string;
    yearLevel: number;
    semester: number;
    sectionCode: string;
    room: string;
  }): Promise<any> {
    const { courseId, academicYearId, timeSlotId, teacherId, dayOfWeek, yearLevel, semester, sectionCode, room } = params;
    try {
      const result = await pool.query(`
        INSERT INTO classes
          (course_id, academic_year_id, time_slot_id, teacher_id, day_of_week, year_level, semester, section_code, room, current_enrolled, is_closed)
        VALUES ($1::UUID, $2::UUID, $3::UUID, $4::UUID, $5, $6::INTEGER, $7::INTEGER, $8, $9, 0, false)
        RETURNING id
      `, [courseId, academicYearId, timeSlotId, teacherId, dayOfWeek, yearLevel, semester, sectionCode, room]);
      return result.rows[0];
    } catch (error: any) {
      if (error.code === '23505') throw new Error('ຫ້ອງຮຽນນີ້ມີຢູ່ແລ້ວ (duplicate)');
      throw new Error(`ສ້າງຫ້ອງຮຽນລົ້ມເຫຼວ: ${error.message}`);
    }
  }

  async deleteClass(classId: string): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM enrollments WHERE class_id = $1::UUID', [classId]);
      await client.query('DELETE FROM classes WHERE id = $1::UUID', [classId]);
      await client.query('COMMIT');
    } catch (error: any) {
      await client.query('ROLLBACK');
      throw new Error(`ລົບຫ້ອງຮຽນລົ້ມເຫຼວ: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Get available time slots for a teacher
   */
  async getAvailableTimeSlots(teacherId: string, academicYearId: string, semester: number): Promise<any[]> {
    const client = await pool.connect();
    
    try {
      const query = `
        SELECT 
          s.id AS session_id,
          s.name_en AS session_name,
          s.time_start AS session_start,
          s.time_end AS session_end,
          ts.id AS time_slot_id,
          ts.code AS time_slot_code,
          ts.time_start,
          ts.time_end,
          CASE 
            WHEN EXISTS (
              SELECT 1 FROM classes c
              WHERE c.teacher_id = $1::UUID
                AND c.academic_year_id = $2::UUID
                AND c.semester = $3::INTEGER
                AND c.time_slot_id = ts.id
            ) THEN true
            ELSE false
          END AS is_booked
        FROM sessions s
        INNER JOIN time_slots ts ON s.id = ts.session_id
        LEFT JOIN teacher_availability ta ON s.id = ta.session_id AND ta.teacher_id = $1::UUID
        WHERE s.is_active = true
          AND (ta.teacher_id IS NOT NULL OR ta.teacher_id IS NULL)
        ORDER BY s.time_start, ts.code
      `;

      const result = await client.query(query, [
        teacherId,
        academicYearId,
        semester
      ]);
      
      return result.rows;
    } catch (error: any) {
      console.error('Error in getAvailableTimeSlots:', error);
      throw new Error(`Failed to get available time slots: ${error.message}`);
    } finally {
      client.release();
    }
  }
}

export const scheduleService = new ScheduleService();
