"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUserAccount = exports.verifyToken = exports.logoutUser = exports.registerUser = exports.loginUser = exports.updateUserSettings = exports.uploadAvatar = exports.getUserProfile = exports.seedDefaultDataForUser = void 0;
exports.resolveRequestUserId = resolveRequestUserId;
const db_1 = require("../db");
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;
// Ensure uploads/profile_photo directory exists
const PROFILE_PHOTO_DIR = path_1.default.join(__dirname, '../../uploads/profile_photo');
if (!fs_1.default.existsSync(PROFILE_PHOTO_DIR)) {
    fs_1.default.mkdirSync(PROFILE_PHOTO_DIR, { recursive: true });
}
// In-memory user database fallback to support instant user creation & password checks
const usersDb = new Map();
// Active sessions map: token -> userId
const tokenSessions = new Map();
// Seed default users
const defaultJulian = {
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
const toStoredUser = (user, password) => ({
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
const seedDefaultDataForUser = async (userId) => {
    try {
        const existingEntities = await db_1.prisma.businessEntity.findMany({ where: { userId } }).catch(() => []);
        if (existingEntities.length === 0) {
            await db_1.prisma.businessEntity.create({
                data: {
                    userId,
                    name: 'Personal',
                    subtitle: 'Personal Account',
                    isPrimary: true,
                },
            }).catch(() => null);
        }
        const existingCategories = await db_1.prisma.category.findMany({ where: { userId } }).catch(() => []);
        if (existingCategories.length === 0) {
            const defaultCategories = [
                { name: 'Food', icon: 'utensils', color: '#8B5CF6' },
                { name: 'Bills', icon: 'zap', color: '#3B82F6' },
                { name: 'Travel', icon: 'plane', color: '#10B981' },
                { name: 'Other', icon: 'tag', color: '#F59E0B' },
            ];
            for (const cat of defaultCategories) {
                await db_1.prisma.category.create({
                    data: {
                        userId,
                        name: cat.name,
                        icon: cat.icon,
                        color: cat.color,
                    },
                }).catch(() => null);
            }
        }
        const existingAccounts = await db_1.prisma.account.findMany({ where: { userId } }).catch(() => []);
        if (existingAccounts.length === 0) {
            await db_1.prisma.account.create({
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
    }
    catch (err) {
        console.error('Error seeding default data for user:', err);
    }
};
exports.seedDefaultDataForUser = seedDefaultDataForUser;
const issueSession = (userId) => {
    const token = `finlap_token_${crypto_1.default.randomUUID()}`;
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
};
const getStoredPassword = async (email) => {
    try {
        const rows = await db_1.prisma.$queryRaw `
      SELECT "password"
      FROM "User"
      WHERE "email" = ${email}
      LIMIT 1
    `;
        return rows[0]?.password || undefined;
    }
    catch {
        return undefined;
    }
};
const saveStoredPassword = async (userId, password) => {
    try {
        await db_1.prisma.$executeRaw `
      UPDATE "User"
      SET "password" = ${password}
      WHERE "id" = ${userId}
    `;
    }
    catch { }
};
function resolveRequestUserId(req) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const userId = tokenSessions.get(token);
        if (userId) {
            return userId;
        }
    }
    const header = req.headers['x-user-id'];
    if (header && typeof header === 'string')
        return header;
    if (req.query.userId && typeof req.query.userId === 'string')
        return req.query.userId;
    return defaultJulian.id;
}
// Helper to get active user by token or default
function getUserByToken(req) {
    const userId = resolveRequestUserId(req);
    for (const u of usersDb.values()) {
        if (u.id === userId)
            return u;
    }
    return Array.from(usersDb.values())[0] || defaultJulian;
}
function cleanAvatarUrl(url) {
    if (!url)
        return undefined;
    if (url.includes('/uploads/')) {
        const idx = url.indexOf('/uploads/');
        return url.substring(idx);
    }
    return url;
}
const getUserProfile = async (req, res) => {
    try {
        const userId = resolveRequestUserId(req);
        const activeUser = getUserByToken(req);
        let prismaUser = await db_1.prisma.user.findUnique({
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
    }
    catch (error) {
        const fallback = getUserByToken(req);
        if (fallback.avatarUrl)
            fallback.avatarUrl = cleanAvatarUrl(fallback.avatarUrl);
        res.json({ success: true, data: fallback });
    }
};
exports.getUserProfile = getUserProfile;
const uploadAvatar = async (req, res) => {
    try {
        const { imageBase64, fileName } = req.body;
        if (imageBase64) {
            // Decode base64 and save to uploads/profile_photo
            const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');
            const name = `avatar-${Date.now()}-${Math.round(Math.random() * 1e6)}.jpg`;
            const filePath = path_1.default.join(PROFILE_PHOTO_DIR, name);
            fs_1.default.writeFileSync(filePath, buffer);
            const avatarUrl = `/uploads/profile_photo/${name}`;
            return res.json({ success: true, avatarUrl });
        }
        if (req.file) {
            const avatarUrl = `/uploads/profile_photo/${req.file.filename}`;
            return res.json({ success: true, avatarUrl });
        }
        res.status(400).json({ success: false, message: 'No image file or base64 data provided' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to upload photo' });
    }
};
exports.uploadAvatar = uploadAvatar;
const updateUserSettings = async (req, res) => {
    try {
        const userId = resolveRequestUserId(req);
        let activeUser = getUserByToken(req);
        if (activeUser.id !== userId) {
            const prismaUser = await db_1.prisma.user.findUnique({ where: { id: userId }, select: userSelect }).catch(() => null);
            if (!prismaUser) {
                return res.status(404).json({ success: false, error: 'User not found' });
            }
            activeUser = { ...prismaUser };
            usersDb.set(activeUser.email.toLowerCase(), activeUser);
        }
        const { biometrics, notifications, currency, name, securityPin, theme, language, country, sex, place, phone, avatarUrl } = req.body;
        const cleanedAvatar = avatarUrl !== undefined ? cleanAvatarUrl(avatarUrl) : activeUser.avatarUrl;
        if (biometrics !== undefined)
            activeUser.biometrics = biometrics;
        if (notifications !== undefined)
            activeUser.notifications = notifications;
        if (currency !== undefined)
            activeUser.currency = currency;
        if (name !== undefined)
            activeUser.name = name;
        if (securityPin !== undefined)
            activeUser.securityPin = securityPin;
        if (theme !== undefined)
            activeUser.theme = theme;
        if (language !== undefined)
            activeUser.language = language;
        if (country !== undefined)
            activeUser.country = country;
        if (sex !== undefined)
            activeUser.sex = sex;
        if (place !== undefined)
            activeUser.place = place;
        if (phone !== undefined)
            activeUser.phone = phone;
        if (avatarUrl !== undefined)
            activeUser.avatarUrl = cleanedAvatar;
        usersDb.set(activeUser.email.toLowerCase(), activeUser);
        try {
            let user = await db_1.prisma.user.findUnique({ where: { id: activeUser.id }, select: userSelect });
            if (user) {
                user = await db_1.prisma.user.update({
                    where: { id: user.id },
                    data: {
                        ...(biometrics !== undefined && { biometrics }),
                        ...(notifications !== undefined && { notifications }),
                        ...(currency !== undefined && { currency }),
                        ...(name !== undefined && { name }),
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
            }
        }
        catch (e) { }
        res.json({ success: true, data: activeUser });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Failed to update settings' });
    }
};
exports.updateUserSettings = updateUserSettings;
const loginUser = async (req, res) => {
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
            const dbUser = await db_1.prisma.user.findUnique({
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
        if (user.password && user.password !== password) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Password!',
            });
        }
        await (0, exports.seedDefaultDataForUser)(user.id);
        const { token, expiresAt } = issueSession(user.id);
        const { password: _, ...userWithoutPassword } = user;
        res.json({
            success: true,
            message: 'Login successful',
            token,
            expiresAt,
            user: userWithoutPassword,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: 'Login failed. Please check your credentials.',
        });
    }
};
exports.loginUser = loginUser;
const registerUser = async (req, res) => {
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
        const existingDbUser = await db_1.prisma.user.findUnique({
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
        let newUser;
        try {
            const createdUser = await db_1.prisma.user.create({
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
                },
                select: userSelect,
            });
            await saveStoredPassword(createdUser.id, password);
            newUser = toStoredUser(createdUser, password);
        }
        catch (e) {
            newUser = {
                id: crypto_1.default.randomUUID(),
                name: name.trim(),
                email: normalizedEmail,
                password,
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
        await (0, exports.seedDefaultDataForUser)(newUser.id);
        const { token, expiresAt } = issueSession(newUser.id);
        const { password: _, ...userWithoutPassword } = newUser;
        res.json({
            success: true,
            message: 'Account created successfully',
            token,
            expiresAt,
            user: userWithoutPassword,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: 'Registration failed. Please try again.',
        });
    }
};
exports.registerUser = registerUser;
const logoutUser = async (req, res) => {
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
exports.logoutUser = logoutUser;
const verifyToken = async (req, res) => {
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
exports.verifyToken = verifyToken;
const deleteUserAccount = async (req, res) => {
    try {
        const userId = resolveRequestUserId(req);
        const activeUser = getUserByToken(req);
        try {
            await db_1.prisma.transaction.deleteMany({ where: { userId } });
            await db_1.prisma.businessEntity.deleteMany({ where: { userId } });
            await db_1.prisma.account.deleteMany({ where: { userId } });
            await db_1.prisma.category.deleteMany({ where: { userId } });
            await db_1.prisma.wallet.deleteMany({ where: { userId } });
            await db_1.prisma.budget.deleteMany({ where: { userId } });
            await db_1.prisma.goal.deleteMany({ where: { userId } });
            await db_1.prisma.netWorthHistory.deleteMany({ where: { userId } });
            await db_1.prisma.user.deleteMany({ where: { id: userId } });
        }
        catch (e) {
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
    }
    catch (error) {
        console.error('deleteUserAccount error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete account' });
    }
};
exports.deleteUserAccount = deleteUserAccount;
