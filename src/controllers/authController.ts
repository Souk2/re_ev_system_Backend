import { Request, Response } from 'express';
import { authService } from '../services/authService';

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({
        success: false,
        error: 'ກະລຸນາປ້ອນຊື່ຜູ້ໃຊ້ ແລະ ລະຫັດຜ່ານ'
      });
      return;
    }

    const result = await authService.login(username, password);

    res.json({
      success: true,
      message: 'ເຂົ້າສູ່ລະບົບສຳເລັດ',
      data: result
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: (error as Error).message
    });
  }
};

export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'ບໍ່ມີສິດເຂົ້າເຖິງ'
      });
      return;
    }

    const profile = await authService.getProfile(userId);

    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message || 'ເກີດຂໍ້ຜິດພາດທີ່ເຄື່ອງແມ່ຂ່າຍ'
    });
  }
};

export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({
        success: false,
        error: 'ກະລຸນາປ້ອນລະຫັດຜ່ານປັດຈຸບັນ ແລະ ລະຫັດຜ່ານໃໝ່'
      });
      return;
    }

    await authService.changePassword(userId, currentPassword, newPassword);

    res.json({
      success: true,
      message: 'ປ່ຽນລະຫັດຜ່ານສຳເລັດ'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: (error as Error).message || 'ເກີດຂໍ້ຜິດພາດທີ່ເຄື່ອງແມ່ຂ່າຍ'
    });
  }
};
