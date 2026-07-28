import { Request, Response } from 'express';
import { prisma } from '../db';
import { resolveRequestUserId } from './userController';

// GET /api/business-entities
export const getBusinessEntities = async (req: Request, res: Response) => {
  try {
    const userId = resolveRequestUserId(req);
    const entities = await prisma.businessEntity.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { transactions: true } } },
    });
    res.json({ success: true, data: entities });
  } catch (error) {
    console.error('getBusinessEntities error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch business entities' });
  }
};

// POST /api/business-entities
export const createBusinessEntity = async (req: Request, res: Response) => {
  try {
    const userId = resolveRequestUserId(req);
    const { name, subtitle, isPrimary } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }

    if (isPrimary) {
      await prisma.businessEntity.updateMany({
        where: { userId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const entity = await prisma.businessEntity.create({
      data: {
        userId,
        name: name.trim(),
        subtitle: subtitle?.trim() || null,
        isPrimary: Boolean(isPrimary),
      },
    });

    res.status(201).json({ success: true, data: entity });
  } catch (error) {
    console.error('createBusinessEntity error:', error);
    res.status(500).json({ success: false, error: 'Failed to create business entity' });
  }
};

// PUT /api/business-entities/:id
export const updateBusinessEntity = async (req: Request, res: Response) => {
  try {
    const userId = resolveRequestUserId(req);
    const { id } = req.params;
    const { name, subtitle, isPrimary } = req.body;

    const existing = await prisma.businessEntity.findFirst({ where: { id, userId } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Entity not found' });
    }

    if (isPrimary) {
      await prisma.businessEntity.updateMany({
        where: { userId, isPrimary: true, NOT: { id } },
        data: { isPrimary: false },
      });
    }

    const updated = await prisma.businessEntity.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(subtitle !== undefined && { subtitle: subtitle?.trim() || null }),
        ...(isPrimary !== undefined && { isPrimary: Boolean(isPrimary) }),
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('updateBusinessEntity error:', error);
    res.status(500).json({ success: false, error: 'Failed to update business entity' });
  }
};

// DELETE /api/business-entities/:id
export const deleteBusinessEntity = async (req: Request, res: Response) => {
  try {
    const userId = resolveRequestUserId(req);
    const { id } = req.params;

    const existing = await prisma.businessEntity.findFirst({ where: { id, userId } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Entity not found' });
    }

    await prisma.transaction.updateMany({
      where: { userId, businessEntityId: id },
      data: { businessEntityId: null },
    });
    await prisma.businessEntity.delete({ where: { id } });
    res.json({ success: true, message: 'Business entity deleted' });
  } catch (error) {
    console.error('deleteBusinessEntity error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete business entity' });
  }
};
