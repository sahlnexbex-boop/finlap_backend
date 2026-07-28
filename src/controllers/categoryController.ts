import { Request, Response } from 'express';
import { prisma } from '../db';
import { resolveRequestUserId } from './userController';

// GET /api/categories
export const getCategories = async (req: Request, res: Response) => {
  try {
    const userId = resolveRequestUserId(req);
    const categories = await prisma.category.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('getCategories error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch categories' });
  }
};

// POST /api/categories
export const createCategory = async (req: Request, res: Response) => {
  try {
    const userId = resolveRequestUserId(req);
    const { name, icon, color } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Category name is required' });
    }

    const category = await prisma.category.create({
      data: {
        userId,
        name: name.trim(),
        icon: icon || 'tag',
        color: color || '#8B5CF6',
      },
    });

    res.status(201).json({ success: true, data: category });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return res.status(400).json({ success: false, error: 'A category with this name already exists' });
    }
    console.error('createCategory error:', error);
    res.status(500).json({ success: false, error: 'Failed to create category' });
  }
};

// PUT /api/categories/:id
export const updateCategory = async (req: Request, res: Response) => {
  try {
    const userId = resolveRequestUserId(req);
    const { id } = req.params;
    const { name, icon, color } = req.body;

    const existing = await prisma.category.findFirst({ where: { id, userId } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }

    const updated = await prisma.category.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(icon !== undefined && { icon }),
        ...(color !== undefined && { color }),
      },
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return res.status(400).json({ success: false, error: 'A category with this name already exists' });
    }
    console.error('updateCategory error:', error);
    res.status(500).json({ success: false, error: 'Failed to update category' });
  }
};

// DELETE /api/categories/:id
export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const userId = resolveRequestUserId(req);
    const { id } = req.params;

    const existing = await prisma.category.findFirst({ where: { id, userId } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }

    await prisma.category.delete({ where: { id } });
    res.json({ success: true, message: 'Category deleted' });
  } catch (error) {
    console.error('deleteCategory error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete category' });
  }
};
