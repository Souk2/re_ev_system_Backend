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
  courses: { columns: ['code', 'name', 'credits', 'department_id'] },

  // ຜູ້ໃຊ້ ແລະ ພະນັກງານ (Users & Personnel)
  // ✅ FIXED: Removed 'password' (causes crash) and 'password_hash' (for security).
  users: { columns: ['username', 'role', 'is_active'] },
  staff: { columns: ['user_id', 'first_name', 'last_name', 'phone', 'email', 'department_id', 'position', 'is_active'] },
  teachers: { columns: ['user_id', 'first_name', 'last_name', 'phone', 'email', 'specialization', 'is_active'] },
};
