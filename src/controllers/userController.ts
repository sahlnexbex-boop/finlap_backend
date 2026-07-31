import { Request, Response } from 'express';
import { prisma } from '../db';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';

const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;

// Ensure uploads/profile_photo directory exists
const PROFILE_PHOTO_DIR = path.join(__dirname, '../../uploads/profile_photo');
if (!fs.existsSync(PROFILE_PHOTO_DIR)) {
  fs.mkdirSync(PROFILE_PHOTO_DIR, { recursive: true });
}

// User record type
interface StoredUser {
  id: string;
  name: string;
  email: string;
  password?: string;
  avatarUrl?: string;
  country?: string;
  sex?: string;
  place?: string;
  phone?: string;
  currency: string;
  memberTier: string;
  proBadge: boolean;
  biometrics: boolean;
  notifications: boolean;
  securityPin: string;
  theme: string;
  language: string;
}

// In-memory user database fallback to support instant user creation & password checks
const usersDb = new Map<string, StoredUser>();

// Active sessions map: token -> userId
const tokenSessions = new Map<string, string>();
const passwordResetRequests = new Map<string, { otp: string; expiresAt: number }>();
const passwordResetTokens = new Map<string, { email: string; expiresAt: number }>();
const PASSWORD_RESET_OTP_TTL = 10 * 60 * 1000;
const PASSWORD_RESET_TOKEN_TTL = 10 * 60 * 1000;

const cleanupPasswordResetEntries = () => {
  const now = Date.now();
  for (const [email, entry] of passwordResetRequests.entries()) {
    if (entry.expiresAt <= now) {
      passwordResetRequests.delete(email);
    }
  }
  for (const [token, entry] of passwordResetTokens.entries()) {
    if (entry.expiresAt <= now) {
      passwordResetTokens.delete(token);
    }
  }
};

const generateOtp = () => String(1000 + Math.floor(Math.random() * 9000));

const getUserByEmail = async (normalizedEmail: string): Promise<StoredUser | undefined> => {
  let user = usersDb.get(normalizedEmail);
  if (!user) {
    const dbUser = await prisma.user
      .findUnique({ where: { email: normalizedEmail }, select: userSelect })
      .catch(() => null);
    if (dbUser) {
      user = toStoredUser(dbUser, await getStoredPassword(normalizedEmail));
      usersDb.set(normalizedEmail, user);
    }
  }
  return user;
};

const sendPasswordResetEmail = async (toEmail: string, otp: string) => {
  const from = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  if (!from || !pass) {
    throw new Error('Email transporter is not configured');
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: from,
      pass,
    },
  });

  const mailOptions = {
    from,
    to: toEmail,
    subject: 'FinLap Password Reset Code',
    text: `Your FinLap password reset code is ${otp}. It expires in 10 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif;">
        <p>Hi there,</p>
        <p>Your FinLap password reset code is <strong>${otp}</strong>.</p>
        <p>This code is valid for 10 minutes.</p>
        <p>If you did not request a password reset, please ignore this email.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

// Seed default users
const defaultJulian: StoredUser = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Julian Sterling',
  email: 'julian.sterling@finlap.io',
  password: 'password123',
  currency: 'INR',
  memberTier: 'Platinum Member',
  proBadge: true,
  biometrics: true,
  notifications: true,
  securityPin: '1234',
  theme: 'Midnight Slate',
  language: 'English (US)',
};

usersDb.set(defaultJulian.email.toLowerCase(), defaultJulian);

const toStoredUser = (user: any, password?: string): StoredUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  password: password ?? user.password ?? undefined,
  avatarUrl: user.avatarUrl ?? undefined,
  country: user.country ?? undefined,
  sex: user.sex ?? undefined,
  place: user.place ?? undefined,
  phone: user.phone ?? undefined,
  currency: user.currency || 'INR',
  memberTier: user.memberTier || 'Platinum Member',
  proBadge: user.proBadge ?? true,
  biometrics: user.biometrics ?? true,
  notifications: user.notifications ?? true,
  securityPin: user.securityPin || '1234',
  theme: user.theme || 'Midnight Slate',
  language: user.language || 'English (US)',
});

export const seedDefaultDataForUser = async (userId: string) => {
  try {
    const existingEntities = await prisma.businessEntity.findMany({ where: { userId } }).catch(() => []);
    if (existingEntities.length === 0) {
      await prisma.businessEntity.create({
        data: {
          userId,
          name: 'Personal',
          subtitle: 'Personal Account',
          isPrimary: true,
        },
      }).catch(() => null);
    }

    const existingCategories = await prisma.category.findMany({ where: { userId } }).catch(() => []);
    if (existingCategories.length === 0) {
      const defaultCategories = [
        { name: 'Food', icon: 'utensils', color: '#8B5CF6' },
        { name: 'Bills', icon: 'zap', color: '#3B82F6' },
        { name: 'Travel', icon: 'plane', color: '#10B981' },
        { name: 'Other', icon: 'tag', color: '#F59E0B' },
      ];
      for (const cat of defaultCategories) {
        await prisma.category.create({
          data: {
            userId,
            name: cat.name,
            icon: cat.icon,
            color: cat.color,
          },
        }).catch(() => null);
      }
    }

    const existingAccounts = await prisma.account.findMany({ where: { userId } }).catch(() => []);
    if (existingAccounts.length === 0) {
      await prisma.account.create({
        data: {
          userId,
          name: 'Cash',
          type: 'cash',
          balance: 0,
          icon: 'wallet',
          color: '#10B981',
        },
      }).catch(() => null);
    }
  } catch (err) {
    console.error('Error seeding default data for user:', err);
  }
};

const issueSession = (userId: string) => {
  const token = `finlap_token_${crypto.randomUUID()}`;
  const expiresAt = Date.now() + ONE_MONTH_MS;
  tokenSessions.set(token, userId);
  return { token, expiresAt };
};

const userSelect = {
  id: true,
  name: true,
  email: true,
  avatarUrl: true,
  country: true,
  sex: true,
  place: true,
  phone: true,
  currency: true,
  memberTier: true,
  proBadge: true,
  biometrics: true,
  notifications: true,
  securityPin: true,
  theme: true,
  language: true,
  createdAt: true,
  updatedAt: true,
} as const;

const getStoredPassword = async (email: string) => {
  try {
    const rows = await prisma.$queryRaw<Array<{ password: string | null }>>`
      SELECT "password"
      FROM "User"
      WHERE "email" = ${email}
      LIMIT 1
    `;
    return rows[0]?.password || undefined;
  } catch {
    return undefined;
  }
};

const saveStoredPassword = async (userId: string, password: string) => {
  try {
    await prisma.$executeRaw`
      UPDATE "User"
      SET "password" = ${password}
      WHERE "id" = ${userId}
    `;
  } catch {}
};

export function resolveRequestUserId(req: Request): string {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const userId = tokenSessions.get(token);
    if (userId) {
      return userId;
    }
  }

  const header = req.headers['x-user-id'];
  if (header && typeof header === 'string') return header;

  if (req.query.userId && typeof req.query.userId === 'string') return req.query.userId;

  return defaultJulian.id;
}

// Helper to get active user by token or default
function getUserByToken(req: Request): StoredUser {
  const userId = resolveRequestUserId(req);
  for (const u of usersDb.values()) {
    if (u.id === userId) return u;
  }
  return Array.from(usersDb.values())[0] || defaultJulian;
}

function cleanAvatarUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (url.includes('/uploads/')) {
    const idx = url.indexOf('/uploads/');
    return url.substring(idx);
  }
  return url;
}

export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const userId = resolveRequestUserId(req);
    const activeUser = getUserByToken(req);
    let prismaUser = await prisma.user.findUnique({
      where: { id: userId },
      select: userSelect,
    }).catch(() => null);

    const userData = prismaUser || (activeUser.id === userId ? activeUser : null);
    if (!userData) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    if (userData.avatarUrl) {
      userData.avatarUrl = cleanAvatarUrl(userData.avatarUrl);
    }

    res.json({ success: true, data: userData });
  } catch (error) {
    const fallback = getUserByToken(req);
    if (fallback.avatarUrl) fallback.avatarUrl = cleanAvatarUrl(fallback.avatarUrl);
    res.json({ success: true, data: fallback });
  }
};

export const uploadAvatar = async (req: Request, res: Response) => {
  try {
    const { imageBase64, fileName } = req.body;

    if (imageBase64) {
      // Decode base64 and save to uploads/profile_photo
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      const name = `avatar-${Date.now()}-${Math.round(Math.random() * 1e6)}.jpg`;
      const filePath = path.join(PROFILE_PHOTO_DIR, name);
      fs.writeFileSync(filePath, buffer);

      const avatarUrl = `/uploads/profile_photo/${name}`;
      return res.json({ success: true, avatarUrl });
    }

    if (req.file) {
      const avatarUrl = `/uploads/profile_photo/${req.file.filename}`;
      return res.json({ success: true, avatarUrl });
    }

    res.status(400).json({ success: false, message: 'No image file or base64 data provided' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to upload photo' });
  }
};

export const updateUserSettings = async (req: Request, res: Response) => {
  try {
    const userId = resolveRequestUserId(req);
    let activeUser = getUserByToken(req);
    if (activeUser.id !== userId) {
      const prismaUser = await prisma.user.findUnique({ where: { id: userId }, select: userSelect }).catch(() => null);
      if (!prismaUser) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }
      activeUser = { ...prismaUser } as StoredUser;
      usersDb.set(activeUser.email.toLowerCase(), activeUser);
    }
    const {
      biometrics,
      notifications,
      currency,
      name,
      email,
      securityPin,
      theme,
      language,
      country,
      sex,
      place,
      phone,
      avatarUrl,
    } = req.body;

    const cleanedAvatar = avatarUrl !== undefined ? cleanAvatarUrl(avatarUrl) : activeUser.avatarUrl;
    const previousEmail = activeUser.email.toLowerCase();
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : previousEmail;

    if (biometrics !== undefined) activeUser.biometrics = biometrics;
    if (notifications !== undefined) activeUser.notifications = notifications;
    if (currency !== undefined) activeUser.currency = currency;
    if (name !== undefined) activeUser.name = name;
    if (email !== undefined) activeUser.email = normalizedEmail;
    if (securityPin !== undefined) activeUser.securityPin = securityPin;
    if (theme !== undefined) activeUser.theme = theme;
    if (language !== undefined) activeUser.language = language;
    if (country !== undefined) activeUser.country = country;
    if (sex !== undefined) activeUser.sex = sex;
    if (place !== undefined) activeUser.place = place;
    if (phone !== undefined) activeUser.phone = phone;
    if (avatarUrl !== undefined) activeUser.avatarUrl = cleanedAvatar;

    if (email !== undefined && normalizedEmail !== previousEmail) {
      usersDb.delete(previousEmail);
    }
    usersDb.set(normalizedEmail, activeUser);

    try {
      let user = await prisma.user.findUnique({ where: { id: activeUser.id }, select: userSelect });
      if (user) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            ...(biometrics !== undefined && { biometrics }),
            ...(notifications !== undefined && { notifications }),
            ...(currency !== undefined && { currency }),
            ...(name !== undefined && { name }),
            ...(email !== undefined && { email: normalizedEmail }),
            ...(securityPin !== undefined && { securityPin }),
            ...(theme !== undefined && { theme }),
            ...(language !== undefined && { language }),
            ...(country !== undefined && { country }),
            ...(sex !== undefined && { sex }),
            ...(place !== undefined && { place }),
            ...(phone !== undefined && { phone }),
            ...(avatarUrl !== undefined && { avatarUrl: cleanedAvatar }),
          },
          select: userSelect,
        });
        if (user) {
          activeUser = toStoredUser(user, activeUser.password);
        }
      }
    } catch (e) {}

    res.json({ success: true, data: activeUser });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update settings' });
  }
};

export const requestPasswordReset = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await getUserByEmail(normalizedEmail);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Email not found' });
    }

    cleanupPasswordResetEntries();
    const otp = generateOtp();
    passwordResetRequests.set(normalizedEmail, {
      otp,
      expiresAt: Date.now() + PASSWORD_RESET_OTP_TTL,
    });

    await sendPasswordResetEmail(normalizedEmail, otp);

    res.json({ success: true, message: 'OTP sent to email' });
  } catch (error: any) {
    console.error('requestPasswordReset error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to send OTP' });
  }
};

export const verifyPasswordResetOtp = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    cleanupPasswordResetEntries();
    const request = passwordResetRequests.get(normalizedEmail);

    if (!request || request.otp !== String(otp).trim()) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    passwordResetRequests.delete(normalizedEmail);
    const resetToken = `reset_${crypto.randomUUID()}`;
    passwordResetTokens.set(resetToken, {
      email: normalizedEmail,
      expiresAt: Date.now() + PASSWORD_RESET_TOKEN_TTL,
    });

    res.json({ success: true, message: 'OTP verified', resetToken });
  } catch (error: any) {
    console.error('verifyPasswordResetOtp error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to verify OTP' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ success: false, message: 'Reset token and password are required' });
    }

    cleanupPasswordResetEntries();
    const entry = passwordResetTokens.get(String(token));
    if (!entry) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }

    const normalizedEmail = entry.email;
    const user = await getUserByEmail(normalizedEmail);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const hashedPassword = await bcrypt.hash(String(password), 10);
    user.password = hashedPassword;
    usersDb.set(normalizedEmail, user);
    await saveStoredPassword(user.id, hashedPassword);
    passwordResetTokens.delete(String(token));

    res.json({ success: true, message: 'Password has been reset successfully' });
  } catch (error: any) {
    console.error('resetPassword error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to reset password' });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    let user = usersDb.get(normalizedEmail);

    if (!user) {
      const dbUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: userSelect,
      }).catch(() => null);
      if (dbUser) {
        user = toStoredUser(dbUser, await getStoredPassword(normalizedEmail));
        usersDb.set(normalizedEmail, user);
      }
    }

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'User not found!',
      });
    }

    if (user.password) {
      const isBcrypt = user.password.startsWith('$2a$') || user.password.startsWith('$2b$');
      const isMatch = isBcrypt
        ? await bcrypt.compare(password, user.password)
        : user.password === password;

      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: 'Invalid Password!',
        });
      }

      // Upgrade plain text password to hashed password if needed
      if (!isBcrypt) {
        const newHash = await bcrypt.hash(password, 10);
        user.password = newHash;
        usersDb.set(normalizedEmail, user);
        await saveStoredPassword(user.id, newHash);
      }
    }

    await seedDefaultDataForUser(user.id);

    const { token, expiresAt } = issueSession(user.id);

    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      message: 'Login successful',
      token,
      expiresAt,
      user: userWithoutPassword,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Login failed. Please check your credentials.',
    });
  }
};

export const registerUser = async (req: Request, res: Response) => {
  try {
    const { name, email, password, country, sex, place, phone, avatarUrl } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (usersDb.has(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists',
      });
    }

    const existingDbUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: userSelect,
    }).catch(() => null);
    if (existingDbUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists',
      });
    }

    const cleanedAvatar = cleanAvatarUrl(avatarUrl);
    const hashedPassword = await bcrypt.hash(password, 10);

    let newUser: StoredUser;

    try {
      const createdUser = await prisma.user.create({
        data: {
          name: name.trim(),
          email: normalizedEmail,
          avatarUrl: cleanedAvatar,
          country: country || undefined,
          sex: sex || undefined,
          place: place || undefined,
          phone: phone || undefined,
          currency: 'INR',
          memberTier: 'Platinum Member',
          proBadge: true,
          biometrics: true,
          notifications: true,
          securityPin: '1234',
          theme: 'Midnight Slate',
          language: 'English (US)',
        } as any,
        select: userSelect,
      });
      await saveStoredPassword(createdUser.id, hashedPassword);
      newUser = toStoredUser(createdUser, hashedPassword);
    } catch (e) {
      newUser = {
        id: crypto.randomUUID(),
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        avatarUrl: cleanedAvatar,
        country: country || undefined,
        sex: sex || undefined,
        place: place || undefined,
        phone: phone || undefined,
        currency: 'INR',
        memberTier: 'Platinum Member',
        proBadge: true,
        biometrics: true,
        notifications: true,
        securityPin: '1234',
        theme: 'Midnight Slate',
        language: 'English (US)',
      };
    }

    usersDb.set(normalizedEmail, newUser);

    await seedDefaultDataForUser(newUser.id);

    const { token, expiresAt } = issueSession(newUser.id);

    const { password: _, ...userWithoutPassword } = newUser;

    res.json({
      success: true,
      message: 'Account created successfully',
      token,
      expiresAt,
      user: userWithoutPassword,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Registration failed. Please try again.',
    });
  }
};

export const logoutUser = async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    tokenSessions.delete(token);
  }
  res.json({
    success: true,
    message: 'Signed out successfully from server',
  });
};

export const verifyToken = async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No authorization header provided' });
  }

  const token = authHeader.substring(7);
  const userId = tokenSessions.get(token);

  if (!userId) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }

  let matchedUser = Array.from(usersDb.values()).find((u) => u.id === userId);
  if (!matchedUser) {
    return res.status(401).json({ success: false, message: 'User session not found' });
  }

  const { password: _, ...userWithoutPassword } = matchedUser;
  res.json({
    success: true,
    message: 'Token is valid',
    user: userWithoutPassword,
  });
};

export const deleteUserAccount = async (req: Request, res: Response) => {
  try {
    const userId = resolveRequestUserId(req);
    const activeUser = getUserByToken(req);

    try {
      await prisma.transaction.deleteMany({ where: { userId } });
      await prisma.businessEntity.deleteMany({ where: { userId } });
      await prisma.account.deleteMany({ where: { userId } });
      await prisma.category.deleteMany({ where: { userId } });
      await prisma.user.deleteMany({ where: { id: userId } });
    } catch (e) {
      console.warn('Prisma account delete warning:', e);
    }

    if (activeUser?.email) {
      usersDb.delete(activeUser.email.toLowerCase());
    }

    for (const [token, uid] of Array.from(tokenSessions.entries())) {
      if (uid === userId) {
        tokenSessions.delete(token);
      }
    }

    res.json({
      success: true,
      message: 'Account and all associated user data deleted successfully',
    });
  } catch (error) {
    console.error('deleteUserAccount error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete account' });
  }
};
