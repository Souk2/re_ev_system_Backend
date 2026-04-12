// ກຳນົດຕາຕະລາງ ແລະ ຖັນທີ່ອະນຸຍາດໃຫ້ CRUD (ເພື່ອຄວາມປອດໄພ ແລະ ປ້ອງກັນ SQL Injection)
export interface TableConfig {
  [tableName: string]: {
    idColumn?: string;
    columns: string[];
    sortable?: string[];
  };
}

export const tableConfigs: TableConfig = {
  // ຂໍ້ມູນພື້ນຖານ
  provinces: { columns: ['code', 'name'] },
  districts: { columns: ['province_id', 'code', 'name'] },
  
  // ການສຶກສາ
  academic_years: { columns: ['name', 'is_current'] },
  departments: { columns: ['code', 'name'] },
  ethnicities: { columns: ['code', 'name_lo', 'name_en'] },
  religions: { columns: ['code', 'name_lo', 'name_en'] },
  
  // ຕັ້ງຄ່າລະບົບ
  residence_types: { columns: ['code', 'name_lo'] },
  relationship_types: { columns: ['code', 'name_lo'] },
  sessions: { columns: ['code', 'name_lo', 'name_en', 'time_start', 'time_end', 'is_active'] },
  time_slots: { columns: ['session_id', 'code', 'name_lo', 'time_start', 'time_end'] },
  
  // ວິຊາຮຽນ
  courses: { columns: ['code', 'name', 'credits', 'department_id', 'year_level'] },

  tuition_fees: { columns: ['department_id', 'academic_year_id', 'year_level', 'semester', 'fee_amount', 'effective_from', 'is_active'] },
  // ຜູ້ໃຊ້ ແລະ ພະນັກງານ (Users & Personnel)
  // ✅ FIXED: Removed 'password' (causes crash) and 'password_hash' (for security).
  users: { columns: ['username', 'role', 'is_active'] },
  staff: { columns: ['user_id', 'first_name', 'last_name', 'phone', 'email', 'position', 'photo_path', 'is_active'] },
  teachers: { columns: ['user_id', 'first_name', 'last_name', 'phone', 'email', 'specialization', 'photo_path', 'is_active'] },

  // 🎓 ນັກສຶກສາ (Students)
  students: { columns: ['user_id', 'student_code', 'department_id', 'session_id', 'entry_year_id', 'current_year_level', 'status'] },
  student_profiles: { columns: ['student_id', 'first_name_lo', 'last_name_lo', 'first_name_en', 'last_name_en', 'gender', 'dob', 'ethnicity_id', 'religion_id', 'birth_province_id', 'birth_district_id', 'birth_village', 'phone', 'email', 'reg_province_id', 'reg_district_id', 'reg_village', 'residence_type_id', 'res_province_id', 'res_district_id', 'res_village', 'photo_path'] },
  student_education_records: { columns: ['student_id', 'record_type', 'school_name', 'graduation_year', 'school_province_id', 'school_district_id', 'institution_name', 'department_name', 'current_year_level'] },
  student_emergency_contacts: { columns: ['student_id', 'full_name', 'relationship_id', 'province_id', 'district_id', 'village', 'phone_home', 'phone_office', 'phone_mobile', 'is_primary'] },
  student_work_affiliations: { columns: ['student_id', 'occupation', 'position', 'workplace_name', 'department', 'province_or_ministry', 'is_active'] },

  // 🆕 ແບບຟອມສະໝັກເຂົ້າຮຽນ (Student Application Form)
  student_applications: {
    columns: [
      'first_name_lo', 'last_name_lo', 'first_name_en', 'last_name_en',
      'gender', 'dob', 'ethnicity_id', 'religion_id', 'birth_province_id',
      'birth_district_id', 'birth_village', 'reg_province_id', 'reg_district_id',
      'reg_village', 'residence_type_id', 'res_province_id', 'res_district_id',
      'res_village', 'phone', 'email', 'photo_3x4_path', 'id_card_path',
      'emergency_contacts', 'education_records', 'work_affiliations',
      'applied_department_id', 'session_id', 'status', 'reviewed_by', 'review_notes',
      'created_at', 'updated_at'
    ]
  },
};
