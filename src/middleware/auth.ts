import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface AuthRequest extends Request {
  user?: {
    userId: string;
    username: string;
    role: string;
  };
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'ການເຂົ້າເຖິງຖືກປະຕິເສດ. ບໍ່ມີໂທເຄນ'
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const jwtSecret = process.env.JWT_SECRET || 're_ev_system_secret_key_2024_change_in_production';
    const decoded = jwt.verify(token, jwtSecret) as {
      userId: string;
      username: string;
      role: string;
    };

    // Attach user info to request
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        error: 'ໂທເຄນໝົດອາຍຸແລ້ວ'
      });
    } else if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        error: 'ໂທເຄນບໍ່ຖືກຕ້ອງ'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'ເກີດຂໍ້ຜິດພາດທີ່ເຄື່ອງແມ່ຂ່າຍ'
      });
    }
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'ບໍ່ມີສິດເຂົ້າເຖິງ'
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: `ການເຂົ້າເຖິງຖືກປະຕິເສດ. ບົດບາດ '${req.user.role}' ບໍ່ມີສິດເຂົ້າເຖິງຊັບພະຍາກອນນີ້`
      });
      return;
    }

    next();
  };
};
