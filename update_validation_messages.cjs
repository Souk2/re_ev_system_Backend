const fs = require('fs');

// Update students.ts
let students = fs.readFileSync('src/routes/api/students.ts', 'utf8');
students = students
  .replace(/'Student not found'/g, "'ບໍ່ພົບຂໍ້ມູນນັກສຶກສາ'")
  .replace(/'Name and email are required'/g, "'ກະລຸນາປ້ອນຊື່ ແລະ ອີເມວ'");
fs.writeFileSync('src/routes/api/students.ts', students);
console.log('✅ students.ts updated');

// Update courses.ts
let courses = fs.readFileSync('src/routes/api/courses.ts', 'utf8');
courses = courses
  .replace(/'Course not found'/g, "'ບໍ່ພົບຂໍ້ມູນວິຊາຮຽນ'")
  .replace(/'Code, name, and credits are required'/g, "'ກະລຸນາປ້ອນລະຫັດວິຊາ, ຊື່ ແລະ ຈຳນວນໜ່ວຍກິດ'");
fs.writeFileSync('src/routes/api/courses.ts', courses);
console.log('✅ courses.ts updated');

// Update assessments.ts
let assessments = fs.readFileSync('src/routes/api/assessments.ts', 'utf8');
assessments = assessments
  .replace(/'Assessment not found'/g, "'ບໍ່ພົບຂໍ້ມູນການປະເມີນຜົນ'")
  .replace(/'studentId, courseId, type, and score are required'/g, "'ກະລຸນາປ້ອນລະຫັດນັກສຶກສາ, ລະຫັດວິຊາ, ປະເພດ ແລະ ຄະແນນ'");
fs.writeFileSync('src/routes/api/assessments.ts', assessments);
console.log('✅ assessments.ts updated');

console.log('\n✅✅✅ All validation messages translated to Lao! ✅✅✅');
