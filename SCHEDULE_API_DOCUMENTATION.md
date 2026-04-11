# Auto Scheduling System - API Documentation

## 📋 Overview

The auto-scheduling system automatically generates class schedules by assigning teachers to courses based on:
- Teacher qualifications (which teachers can teach which courses)
- Teacher availability (when teachers are free)
- Time slot conflicts (no overlapping schedules)
- Room allocation (automatic room assignment)

---

## 🗄️ Database Setup

Before using the API, you must add the auto-schedule functions to your database:

```bash
# Run this SQL file in your PostgreSQL database
psql -U postgres -d re_ev_system -f auto_schedule_function.sql
```

Or use the batch file:
```bash
setup_auto_schedule.bat
```

---

## 🔐 Authentication

All endpoints require authentication. Include your JWT token in the header:

```
Authorization: Bearer <your-token-here>
```

### Role-Based Access Control

| Endpoint | Admin | Staff | Teacher | Student |
|----------|-------|-------|---------|---------|
| POST /api/schedule/generate | ✅ | ✅ | ❌ | ❌ |
| GET /api/schedule/summary | ✅ | ✅ | ✅ | ❌ |
| GET /api/schedule/conflicts | ✅ | ✅ | ❌ | ❌ |
| GET /api/schedule/classes | ✅ | ✅ | ✅ | ✅ |
| DELETE /api/schedule/delete | ✅ | ❌ | ❌ | ❌ |

---

## 📡 API Endpoints

### 1. Generate Automatic Schedule

**POST** `/api/schedule/generate`

Automatically generates class schedules for the specified academic year, semester, and optional filters.

#### Request Body

```json
{
  "academicYearId": "uuid-here",
  "semester": 1,
  "departmentId": "uuid-here",
  "yearLevel": 1,
  "dryRun": false
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `academicYearId` | UUID | ✅ | Academic year ID |
| `semester` | Integer | ✅ | Semester (1 or 2) |
| `departmentId` | UUID | ❌ | Filter by department (null = all departments) |
| `yearLevel` | Integer | ❌ | Filter by year level 1-3 (null = all levels) |
| `dryRun` | Boolean | ❌ | If true, preview without saving (default: false) |

#### Response (Success - 200)

```json
{
  "success": true,
  "message": "ສ້າງຕາຕະລາງສຳເລັດ",
  "data": [
    {
      "class_id": "uuid-here",
      "course_code": "CS101",
      "course_name": "Introduction to Programming",
      "teacher_name": "John Smith",
      "session_name": "Morning",
      "time_slot_code": "M1",
      "room": "201",
      "section_code": "A",
      "year_level": 1,
      "status": "CREATED"
    }
  ]
}
```

#### Response (Error - 400/500)

```json
{
  "success": false,
  "error": "Error message here"
}
```

#### Status Values

| Status | Description |
|--------|-------------|
| `CREATED` | Class successfully created |
| `SKIPPED` | No qualified teachers available |
| `FAILED` | Teacher/time slot conflict |

---

### 2. Get Schedule Summary

**GET** `/api/schedule/summary`

Returns a summary of all scheduled classes for a semester.

#### Query Parameters

```
GET /api/schedule/summary?academicYearId=uuid&semester=1&departmentId=uuid
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `academicYearId` | UUID | ✅ | Academic year ID |
| `semester` | Integer | ✅ | Semester (1 or 2) |
| `departmentId` | UUID | ❌ | Filter by department |

#### Response (Success - 200)

```json
{
  "success": true,
  "data": [
    {
      "course_code": "CS101",
      "course_name": "Introduction to Programming",
      "year_level": 1,
      "total_sections": 2,
      "teachers_assigned": "John Smith, Jane Doe",
      "time_slots": "M1 (Morning), A2 (Afternoon)"
    }
  ]
}
```

---

### 3. Detect Schedule Conflicts

**GET** `/api/schedule/conflicts`

Detects scheduling conflicts such as:
- Teacher time overlaps
- Room double-bookings

#### Query Parameters

```
GET /api/schedule/conflicts?academicYearId=uuid&semester=1
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `academicYearId` | UUID | ✅ | Academic year ID |
| `semester` | Integer | ✅ | Semester (1 or 2) |

#### Response (Success - 200)

```json
{
  "success": true,
  "data": [
    {
      "conflict_type": "TEACHER_TIME_CONFLICT",
      "description": "Teacher John Smith has overlapping classes at M1 and M2",
      "class_id_1": "uuid-1",
      "class_id_2": "uuid-2"
    },
    {
      "conflict_type": "ROOM_CONFLICT",
      "description": "Room 201 double-booked at M1",
      "class_id_1": "uuid-3",
      "class_id_2": "uuid-4"
    }
  ]
}
```

**Note:** If `data` is an empty array `[]`, there are no conflicts.

---

### 4. Get Schedule Classes

**GET** `/api/schedule/classes`

Returns detailed information about all scheduled classes.

#### Query Parameters

```
GET /api/schedule/classes?academicYearId=uuid&semester=1&departmentId=uuid&yearLevel=1
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `academicYearId` | UUID | ✅ | Academic year ID |
| `semester` | Integer | ✅ | Semester (1 or 2) |
| `departmentId` | UUID | ❌ | Filter by department |
| `yearLevel` | Integer | ❌ | Filter by year level (1-3) |

#### Response (Success - 200)

```json
{
  "success": true,
  "data": [
    {
      "id": "class-uuid",
      "course_id": "course-uuid",
      "course_code": "CS101",
      "course_name": "Introduction to Programming",
      "academic_year_id": "year-uuid",
      "time_slot_id": "slot-uuid",
      "teacher_id": "teacher-uuid",
      "teacher_name": "John Smith",
      "year_level": 1,
      "semester": 1,
      "section_code": "A",
      "room": "201",
      "current_enrolled": 0,
      "is_closed": false,
      "session_name": "Morning",
      "time_start": "08:00:00",
      "time_end": "10:00:00"
    }
  ]
}
```

---

### 5. Delete Schedule (Reset)

**DELETE** `/api/schedule/delete`

Deletes all classes and enrollments for a semester. Use with caution!

#### Request Body

```json
{
  "academicYearId": "uuid-here",
  "semester": 1
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `academicYearId` | UUID | ✅ | Academic year ID |
| `semester` | Integer | ✅ | Semester (1 or 2) |

#### Response (Success - 200)

```json
{
  "success": true,
  "message": "ລົບຕາຕະລາງສຳເລັດ",
  "data": {
    "deletedCount": 15
  }
}
```

---

## 🧪 Example Usage

### Example 1: Dry Run (Preview Before Creating)

```javascript
// Test the schedule generation without saving
const response = await fetch('http://localhost:3000/api/schedule/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify({
    academicYearId: 'your-academic-year-id',
    semester: 1,
    departmentId: 'your-department-id',
    yearLevel: 1,
    dryRun: true  // Preview mode
  })
});

const result = await response.json();
console.log(result);
```

### Example 2: Generate Actual Schedule

```javascript
// Generate and save the schedule
const response = await fetch('http://localhost:3000/api/schedule/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify({
    academicYearId: 'your-academic-year-id',
    semester: 1,
    departmentId: 'your-department-id',
    dryRun: false  // Actually save
  })
});

const result = await response.json();
console.log('Classes created:', result.data.length);
```

### Example 3: Check for Conflicts

```javascript
// After generating, check for conflicts
const response = await fetch(
  'http://localhost:3000/api/schedule/conflicts?academicYearId=your-id&semester=1',
  {
    headers: {
      'Authorization': 'Bearer ' + token
    }
  }
);

const conflicts = await response.json();
if (conflicts.data.length === 0) {
  console.log('✅ No conflicts detected!');
} else {
  console.log('⚠️ Conflicts found:', conflicts.data);
}
```

### Example 4: Get Full Schedule

```javascript
// Retrieve all classes for the semester
const response = await fetch(
  'http://localhost:3000/api/schedule/classes?academicYearId=your-id&semester=1',
  {
    headers: {
      'Authorization': 'Bearer ' + token
    }
  }
);

const schedule = await response.json();
schedule.data.forEach(cls => {
  console.log(`${cls.course_code} - Section ${cls.section_code}`);
  console.log(`  Teacher: ${cls.teacher_name}`);
  console.log(`  Time: ${cls.session_name} (${cls.time_start} - ${cls.time_end})`);
  console.log(`  Room: ${cls.room}`);
});
```

---

## 📊 Algorithm Details

### How Auto-Scheduling Works

1. **Course Selection**: Iterates through all courses (filtered by department/year if specified)

2. **Teacher Matching**: For each course:
   - Finds teachers qualified in the course (teacher_qualifications table)
   - Checks teacher availability (teacher_availability table)
   - Excludes teachers with 2+ sections in the same session

3. **Section Creation**: Creates multiple sections (A, B, C...) if needed

4. **Time Slot Assignment**: For each section:
   - Tries each session (Morning, Afternoon, etc.)
   - Tries each time slot within the session
   - Finds an available teacher with no time conflicts

5. **Room Allocation**: Assigns rooms sequentially from available pool

### Constraints Enforced

✅ Teacher must be qualified for the course  
✅ Teacher must be available for the session/year level  
✅ No teacher time conflicts (overlapping schedules)  
✅ Maximum 2 sections per teacher per session  
✅ Room capacity limits (defined in classes table)  
✅ Unique class combinations (course + year + teacher + section)

---

## 🔧 Setup Required Data

Before using auto-scheduling, ensure these tables have data:

### 1. Sessions (Time Periods)
```sql
INSERT INTO sessions (code, name_lo, name_en, time_start, time_end) VALUES
('MORNING', 'ຕອນເຊົ້າ', 'Morning', '08:00', '12:00'),
('AFTERNOON', 'ຕອນບ່າຍ', 'Afternoon', '13:00', '17:00');
```

### 2. Time Slots
```sql
INSERT INTO time_slots (session_id, code, name_lo, time_start, time_end) VALUES
('<morning-session-id>', 'M1', 'ຊ່ວງທີ 1 ເຊົ້າ', '08:00', '10:00'),
('<morning-session-id>', 'M2', 'ຊ່ວງທີ 2 ເຊົ້າ', '10:00', '12:00'),
('<afternoon-session-id>', 'A1', 'ຊ່ວງທີ 1 ບ່າຍ', '13:00', '15:00'),
('<afternoon-session-id>', 'A2', 'ຊ່ວງທີ 2 ບ່າຍ', '15:00', '17:00');
```

### 3. Teacher Qualifications
```sql
INSERT INTO teacher_qualifications (teacher_id, course_id) VALUES
('<teacher-id>', '<course-id>');
```

### 4. Teacher Availability
```sql
INSERT INTO teacher_availability (teacher_id, session_id, year_level) VALUES
('<teacher-id>', '<session-id>', 1);
```

---

## 🐛 Troubleshooting

### Issue: "No qualified teachers available"

**Solution:**
1. Check if teachers exist in `teacher_qualifications` for the course
2. Verify teachers are marked as `is_active = true`
3. Ensure teachers have availability records in `teacher_availability`

```sql
-- Check qualified teachers for a course
SELECT t.first_name, t.last_name
FROM teachers t
INNER JOIN teacher_qualifications tq ON t.id = tq.teacher_id
WHERE tq.course_id = 'your-course-id'
  AND t.is_active = true;
```

### Issue: "No available time slot or teacher conflict"

**Solution:**
1. Check if all time slots are already booked
2. Verify teacher availability for the session
3. Try with `dryRun: true` first to see the pattern

```sql
-- Check available time slots
SELECT ts.code, s.name_en
FROM time_slots ts
INNER JOIN sessions s ON ts.session_id = s.id
WHERE s.is_active = true;
```

### Issue: Classes not generated for all courses

**Solution:**
1. Some courses may not have qualified teachers
2. Check the response - each course will show status (CREATED, SKIPPED, or FAILED)
3. Review conflicts with GET `/api/schedule/conflicts`

---

## 📝 Best Practices

1. **Always use dryRun first** - Preview the schedule before committing
2. **Check for conflicts** - Run conflict detection after generation
3. **Backup before delete** - Export current schedule before resetting
4. **Generate in batches** - Use department/year filters for large datasets
5. **Verify teacher data** - Ensure qualifications and availability are up to date

---

## 🚀 Next Steps

After generating the schedule:

1. ✅ Review the generated classes
2. ✅ Check for conflicts
3. ✅ Manually adjust if needed (update classes table)
4. ✅ Open enrollment for students
5. ✅ Monitor room capacity

---

## 📞 Support

For issues or questions:
- Check the API response messages
- Review database logs for SQL errors
- Verify all required data exists in reference tables
- Test with dryRun mode first
