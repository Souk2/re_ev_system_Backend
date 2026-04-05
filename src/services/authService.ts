import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { userRepository } from '../repositories/userRepository';
import { auditRepository } from '../repositories/auditRepository';
import { profileRepository } from '../repositories/profileRepository';

export interface LoginResult {
  token: string;
  user: {
    id: string;
    username: string;
    role: string;
    profile: any;
  };
}

export class AuthService {
  async login(username: string, password: string): Promise<LoginResult> {
    // 1. ຄົ້ນຫາ user ພ້ອມ profile
    const user = await userRepository.findWithProfile(username);
    if (!user) {
      throw new Error('ຊື່ຜູ້ໃຊ້ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ');
    }

    // 2. ກວດສອບບັນຊີ
    if (!user.is_active) {
      throw new Error('ຊື່ຜູ້ໃຊ້ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ');
    }

    // 3. ກວດສອບລະຫັດຜ່ານ
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      await auditRepository.logFailedLogin(user.id, username);
      throw new Error('ຊື່ຜູ້ໃຊ້ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ');
    }

    // 4. ສ້າງ JWT token
    const token = this.generateToken({
      userId: user.id,
      username: user.username,
      role: user.role,
    });

    // 5. Log ການເຂົ້າສູ່ລະບົບ
    await auditRepository.logLogin(user.id, username);

    // 6. ດຶງຂໍ້ມູນ profile
    const profile = await profileRepository.getProfileByRole(user.role, user.profile_id);

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        profile,
      },
    };
  }

  async getProfile(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('ບໍ່ພົບຜູ້ໃຊ້');
    }
    if (!user) {
      throw new Error('ບໍ່ພົບຜູ້ໃຊ້');
    }

    const profile = await profileRepository.getProfileByRole(user.role, userId);

    return {
      ...user,
      profile,
    };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('ບໍ່ພົບຜູ້ໃຊ້');
    }

    // ກວດຄວາມສັບສົນຂອງລະຫັດຜ່ານໃໝ່
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
    if (!passwordRegex.test(newPassword)) {
      throw new Error('ລະຫັດຜ່ານຕ້ອງມີ: ອັກສອນພິມໃຫຍ່, ອັກສອນພິມນ້ອຍ, ຕົວເລກ, ແລະ ອັກສອນພິເສດ');
    }

    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) {
      throw new Error('ລະຫັດຜ່ານປັດຈຸບັນບໍ່ຖືກຕ້ອງ');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await userRepository.updatePassword(userId, hashedPassword);
    await auditRepository.logPasswordChange(userId);
  }

  private generateToken(payload: { userId: string; username: string; role: string }): string {
    const secret = process.env.JWT_SECRET || 're_ev_system_secret_key_2024_change_in_production';
    const expiresIn = (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'];

    return jwt.sign(payload, secret, {
    expiresIn,
    issuer: 're-ev-system',
    subject: payload.userId,
  });
  }
}

export const authService = new AuthService();
