import { Request, Response } from 'express';
import { prisma } from '../db';

export const getUserProfile = async (req: Request, res: Response) => {
  try {
    let user = await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.create({
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
  } catch (error) {
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

export const updateUserSettings = async (req: Request, res: Response) => {
  try {
    const { biometrics, notifications, currency, name, securityPin, theme, language } = req.body;
    let user = await prisma.user.findFirst();

    if (user) {
      user = await prisma.user.update({
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
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update settings' });
  }
};
