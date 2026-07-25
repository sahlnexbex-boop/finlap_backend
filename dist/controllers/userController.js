"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserSettings = exports.getUserProfile = void 0;
const db_1 = require("../db");
const getUserProfile = async (req, res) => {
    try {
        let user = await db_1.prisma.user.findFirst();
        if (!user) {
            user = await db_1.prisma.user.create({
                data: {
                    name: 'Julian Sterling',
                    email: 'julian.sterling@finlap.io',
                    currency: 'USD',
                    memberTier: 'Platinum Member',
                    proBadge: true,
                    biometrics: true,
                    notifications: true,
                    securityPin: '1234',
                    theme: 'Midnight Slate',
                    language: 'English (US)',
                },
            });
        }
        res.json({ success: true, data: user });
    }
    catch (error) {
        res.json({
            success: true,
            data: {
                id: 'user-1',
                name: 'Julian Sterling',
                email: 'julian.sterling@finlap.io',
                currency: 'USD',
                memberTier: 'Platinum Member',
                proBadge: true,
                biometrics: true,
                notifications: true,
                securityPin: '1234',
                theme: 'Midnight Slate',
                language: 'English (US)',
            },
        });
    }
};
exports.getUserProfile = getUserProfile;
const updateUserSettings = async (req, res) => {
    try {
        const { biometrics, notifications, currency, name, securityPin, theme, language } = req.body;
        let user = await db_1.prisma.user.findFirst();
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
                },
            });
        }
        res.json({ success: true, data: user });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Failed to update settings' });
    }
};
exports.updateUserSettings = updateUserSettings;
