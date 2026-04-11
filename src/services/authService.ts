import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { userRepository } from '../repositories/userRepository';
import { auditRepository } from '../repositories/auditRepository';
import { profileRepository } from '../repositories/profileRepository';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../config/jwt';

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
    console.log(`🔐 Login attempt for: "${username}"`);
    
    const user = await userRepository.findWithProfile(username);
    if (!user) {
      console.log(`❌ User not found: "${username}"`);
      throw new Error('ຊື່ຜູ້ໃຊ້ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ');
    }

    console.log(`✅ User found: role=${user.role}, is_active=${user.is_active}`);

    if (!user.is_active) {
      console.log(`❌ User inactive: "${username}"`);
      throw new Error('ຊື່ຜູ້ໃຊ້ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ');
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    console.log(`🔑 Password valid: ${isValidPassword}`);
    
    if (!isValidPassword) {
      await auditRepository.logFailedLogin(user.id, username);
      console.log(`❌ Invalid password for: "${username}"`);
      throw new Error('ຊື່ຜູ້ໃຊ້ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ');
    }

    const token = this.generateToken({
      userId: user.id,
      username: user.username,
      role: user.role,
    });

    await auditRepository.logLogin(user.id, username);

    const profile = await profileRepository.getProfileByRole(user.role, user.profile_id);

    console.log(`✅ Login successful: ${username} (${user.role})`);

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
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
      issuer: 're-ev-system',
      subject: payload.userId,
    });
  }
}

export const authService = new AuthService();
