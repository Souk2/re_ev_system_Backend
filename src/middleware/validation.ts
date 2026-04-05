import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

// Validation ສຳລັບ login - ກວດພຽງແຕ່ມີຂໍ້ມູນ (ບໍ່ກວດຄວາມຍາວ ເພາະລະຫັດເກົ່າອາດສັ້ນ)
export const validateLogin = [
  body('username')
    .isString()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('ກະລຸນາປ້ອນຊື່ຜູ້ໃຊ້')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('ຊື່ຜູ້ໃຊ້ສາມາດໃຊ້ໄດ້ສະເພາະ a-z, 0-9, _'),
  body('password')
    .isString()
    .notEmpty()
    .withMessage('ກະລຸນາປ້ອນລະຫັດຜ່ານ'),
];

// Validation ສຳລັບ change password - ຕ້ອງການ 8+ ຕົວ
export const validateChangePassword = [
  body('currentPassword')
    .isString()
    .notEmpty()
    .withMessage('ກະລຸນາປ້ອນລະຫັດຜ່ານປັດຈຸບັນ'),
  body('newPassword')
    .isString()
    .isLength({ min: 8, max: 128 })
    .withMessage('ລະຫັດຜ່ານໃໝ່ຕ້ອງມີຄວາມຍາວ 8 ຕົວຂື້ນໄປ')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('ລະຫັດຜ່ານຕ້ອງມີ: ອັກສອນພິມໃຫຍ່, ອັກສອນພິມນ້ອຍ, ຕົວເລກ, ແລະ ອັກສອນພິເສດ'),
];

// Middleware ກວດສອບ validation result
export const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      error: errors.array()[0].msg,
      details: errors.array()
    });
    return;
  }
  next();
};
