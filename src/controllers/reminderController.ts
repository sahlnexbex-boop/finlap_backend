import { Request, Response } from 'express';
import { prisma } from '../db';
import { resolveRequestUserId } from './userController';

// GET /api/reminders
export const getReminders = async (req: Request, res: Response) => {
  try {
    const userId = resolveRequestUserId(req);
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const search = (req.query.search as string) || '';
    const startDate = (req.query.startDate as string) || '';
    const endDate = (req.query.endDate as string) || '';
    const status = (req.query.status as string) || '';

    const where: any = { userId };

    if (search.trim()) {
      where.OR = [
        { title: { contains: search.trim(), mode: 'insensitive' } },
        { notes: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    if (startDate && endDate) {
      where.date = { gte: startDate, lte: endDate };
    } else if (startDate) {
      where.date = { gte: startDate };
    } else if (endDate) {
      where.date = { lte: endDate };
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    const skip = (page - 1) * limit;

    const [reminders, total] = await Promise.all([
      (prisma as any).reminder.findMany({
        where,
        orderBy: [{ date: 'asc' }, { time: 'asc' }],
        skip,
        take: limit,
      }),
      (prisma as any).reminder.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    res.json({
      success: true,
      data: reminders,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    });
  } catch (error) {
    console.error('getReminders error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch reminders' });
  }
};

// POST /api/reminders
export const createReminder = async (req: Request, res: Response) => {
  try {
    const userId = resolveRequestUserId(req);
    const { title, amount, date, time, notes, status, businessEntityId, accountId, categoryId, categoryName } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Title is required' });
    }
    if (amount === undefined || amount === null || isNaN(Number(amount))) {
      return res.status(400).json({ success: false, error: 'Valid amount is required' });
    }
    if (!date) {
      return res.status(400).json({ success: false, error: 'Date is required' });
    }

    const reminder = await (prisma as any).reminder.create({
      data: {
        userId,
        title: title.trim(),
        amount: Number(amount),
        date: String(date).trim(),
        time: time ? String(time).trim() : null,
        notes: notes ? String(notes).trim() : null,
        status: status || 'PENDING',
        businessEntityId: businessEntityId || null,
        accountId: accountId || null,
        categoryId: categoryId || null,
        categoryName: categoryName || null,
      },
    });

    res.status(201).json({ success: true, data: reminder });
  } catch (error) {
    console.error('createReminder error:', error);
    res.status(500).json({ success: false, error: 'Failed to create reminder' });
  }
};

// PUT /api/reminders/:id
export const updateReminder = async (req: Request, res: Response) => {
  try {
    const userId = resolveRequestUserId(req);
    const { id } = req.params;
    const { title, amount, date, time, notes, status, businessEntityId, accountId, categoryId, categoryName } = req.body;

    const existing = await (prisma as any).reminder.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Reminder not found' });
    }

    const updated = await (prisma as any).reminder.update({
      where: { id },
      data: {
        title: title !== undefined ? String(title).trim() : existing.title,
        amount: amount !== undefined ? Number(amount) : existing.amount,
        date: date !== undefined ? String(date).trim() : existing.date,
        time: time !== undefined ? (time ? String(time).trim() : null) : existing.time,
        notes: notes !== undefined ? (notes ? String(notes).trim() : null) : existing.notes,
        status: status !== undefined ? status : existing.status,
        businessEntityId: businessEntityId !== undefined ? businessEntityId : existing.businessEntityId,
        accountId: accountId !== undefined ? accountId : existing.accountId,
        categoryId: categoryId !== undefined ? categoryId : existing.categoryId,
        categoryName: categoryName !== undefined ? categoryName : existing.categoryName,
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('updateReminder error:', error);
    res.status(500).json({ success: false, error: 'Failed to update reminder' });
  }
};

// DELETE /api/reminders/:id
export const deleteReminder = async (req: Request, res: Response) => {
  try {
    const userId = resolveRequestUserId(req);
    const { id } = req.params;

    const existing = await (prisma as any).reminder.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Reminder not found' });
    }

    await (prisma as any).reminder.delete({
      where: { id },
    });

    res.json({ success: true, message: 'Reminder deleted successfully' });
  } catch (error) {
    console.error('deleteReminder error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete reminder' });
  }
};
