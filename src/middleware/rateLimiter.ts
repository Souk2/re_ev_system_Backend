import rateLimit from 'express-rate-limit';

// ລະດັບທີ 1: 5 ຄັ້ງທຳອິດ → ລໍຖ້າ 30 ວິນາທີ
export const loginLimiter = rateLimit({
  windowMs: 30 * 1000, // 30 ວິນາທີ
  max: 5, // ສູງສຸດ 5 ຄັ້ງ
  message: {
    success: false,
    error: 'ມີການພະຍາຍາມເຂົ້າສູ່ລະບົບຫຼາຍເກີນໄປ. ກະລຸນາລອງໃໝ່ໃນ 30 ວິນາທີ.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // ນັບສະເພາະຄັ້ງທີ່ຜິດ
});

// ລະດັບທີ 2: ຜິດ 25 ຄັ້ງ → ລໍຖ້າ 15 ນາທີ
export const loginLimiterStrict = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 ນາທີ
  max: 25, // ສູງສຸດ 25 ຄັ້ງ
  message: {
    success: false,
    error: 'ມີການພະຍາຍາມເຂົ້າສູ່ລະບົບຫຼາຍເກີນໄປ. ບັນຊີຖືກລ໊ອກ 15 ນາທີ.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});
