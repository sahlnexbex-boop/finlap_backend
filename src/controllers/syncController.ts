import { Request, Response } from 'express';
import { prisma } from '../db';
import { resolveRequestUserId, seedDefaultDataForUser } from './userController';

interface PendingSyncItem {
  id?: string;
  entity: 'transactions' | 'accounts' | 'categories' | 'businessEntities' | 'reminders' | 'user' | string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | string;
  payload: any;
  timestamp?: number;
}

export const syncUserData = async (req: Request, res: Response) => {
  try {
    const userId = resolveRequestUserId(req);
    const { pendingQueue } = req.body || {};

    // 1. Ensure user default seed data exists if user is fresh
    await seedDefaultDataForUser(userId).catch(() => {});

    let processedCount = 0;

    // 2. Process pending offline mutation queue
    if (Array.isArray(pendingQueue) && pendingQueue.length > 0) {
      for (const item of pendingQueue as PendingSyncItem[]) {
        try {
          const { entity, action, payload } = item || {};
          if (!entity || !action || !payload) continue;

          const normEntity = entity.toLowerCase();
          const normAction = action.toUpperCase();

          // TRANSACTIONS
          if (normEntity === 'transactions' || normEntity === 'transaction') {
            if (normAction === 'CREATE' || normAction === 'UPDATE') {
              const txId = payload.id || item.id;
              const dataObj = {
                userId,
                title: payload.title || 'Untitled Transaction',
                merchant: payload.merchant || payload.title || 'General',
                amount: parseFloat(payload.amount || '0'),
                type: Number(payload.type ?? 0),
                category: payload.category || 'Uncategorized',
                date: payload.date || new Date().toISOString().split('T')[0],
                time: payload.time || '12:00 PM',
                status: payload.status || 'COMPLETED',
                walletId: payload.walletId || null,
                walletName: payload.walletName || null,
                businessEntityId: payload.businessEntityId || null,
                businessName: payload.businessName || null,
                note: payload.note || null,
                fundingSource: payload.fundingSource || 'Personal',
                isRecurring: Boolean(payload.isRecurring),
                attachment: payload.attachment || null,
                icon: payload.icon || 'building',
              };

              if (txId) {
                const existing = await prisma.transaction.findFirst({ where: { id: txId, userId } });
                if (existing) {
                  await prisma.transaction.update({
                    where: { id: txId },
                    data: dataObj,
                  });
                } else {
                  await prisma.transaction.create({
                    data: { id: txId, ...dataObj },
                  });
                }
              } else {
                await prisma.transaction.create({ data: dataObj });
              }
              processedCount++;
            } else if (normAction === 'DELETE') {
              const txId = payload.id || item.id;
              if (txId) {
                await prisma.transaction.deleteMany({ where: { id: txId, userId } });
                processedCount++;
              }
            }
          }

          // ACCOUNTS
          else if (normEntity === 'accounts' || normEntity === 'account') {
            if (normAction === 'CREATE' || normAction === 'UPDATE') {
              const accId = payload.id || item.id;
              const dataObj = {
                userId,
                name: String(payload.name || 'Account').trim(),
                type: payload.type || 'bank',
                balance: parseFloat(payload.balance || '0'),
                icon: payload.icon || 'landmark',
                color: payload.color || '#3B82F6',
              };

              if (accId) {
                const existing = await prisma.account.findFirst({ where: { id: accId, userId } });
                if (existing) {
                  await prisma.account.update({ where: { id: accId }, data: dataObj });
                } else {
                  await prisma.account.create({ data: { id: accId, ...dataObj } });
                }
              } else {
                await prisma.account.create({ data: dataObj });
              }
              processedCount++;
            } else if (normAction === 'DELETE') {
              const accId = payload.id || item.id;
              if (accId) {
                await prisma.account.deleteMany({ where: { id: accId, userId } });
                processedCount++;
              }
            }
          }

          // CATEGORIES
          else if (normEntity === 'categories' || normEntity === 'category') {
            if (normAction === 'CREATE' || normAction === 'UPDATE') {
              const catId = payload.id || item.id;
              const catName = String(payload.name || 'Category').trim();
              const dataObj = {
                userId,
                name: catName,
                icon: payload.icon || 'tag',
                color: payload.color || '#8B5CF6',
              };

              if (catId) {
                const existing = await prisma.category.findFirst({ where: { id: catId, userId } });
                if (existing) {
                  await prisma.category.update({ where: { id: catId }, data: dataObj });
                } else {
                  await prisma.category.create({ data: { id: catId, ...dataObj } }).catch(async () => {
                    await prisma.category.updateMany({ where: { userId, name: catName }, data: dataObj });
                  });
                }
              } else {
                await prisma.category.create({ data: dataObj }).catch(() => {});
              }
              processedCount++;
            } else if (normAction === 'DELETE') {
              const catId = payload.id || item.id;
              if (catId) {
                await prisma.category.deleteMany({ where: { id: catId, userId } });
                processedCount++;
              }
            }
          }

          // BUSINESS ENTITIES
          else if (normEntity === 'businessentities' || normEntity === 'businessentity') {
            if (normAction === 'CREATE' || normAction === 'UPDATE') {
              const entId = payload.id || item.id;
              const dataObj = {
                userId,
                name: String(payload.name || 'Business Entity').trim(),
                subtitle: payload.subtitle || null,
                isPrimary: Boolean(payload.isPrimary),
              };

              if (entId) {
                const existing = await prisma.businessEntity.findFirst({ where: { id: entId, userId } });
                if (existing) {
                  await prisma.businessEntity.update({ where: { id: entId }, data: dataObj });
                } else {
                  await prisma.businessEntity.create({ data: { id: entId, ...dataObj } });
                }
              } else {
                await prisma.businessEntity.create({ data: dataObj });
              }
              processedCount++;
            } else if (normAction === 'DELETE') {
              const entId = payload.id || item.id;
              if (entId) {
                await prisma.businessEntity.deleteMany({ where: { id: entId, userId } });
                processedCount++;
              }
            }
          }

          // REMINDERS
          else if (normEntity === 'reminders' || normEntity === 'reminder') {
            if (normAction === 'CREATE' || normAction === 'UPDATE') {
              const remId = payload.id || item.id;
              const dataObj = {
                userId,
                title: String(payload.title || 'Reminder').trim(),
                amount: parseFloat(payload.amount || '0'),
                date: payload.date || new Date().toISOString().split('T')[0],
                time: payload.time || null,
                notes: payload.notes || null,
                status: payload.status || 'PENDING',
                businessEntityId: payload.businessEntityId || null,
                accountId: payload.accountId || null,
                categoryId: payload.categoryId || null,
                categoryName: payload.categoryName || null,
              };

              if (remId) {
                const existing = await prisma.reminder.findFirst({ where: { id: remId, userId } });
                if (existing) {
                  await prisma.reminder.update({ where: { id: remId }, data: dataObj });
                } else {
                  await prisma.reminder.create({ data: { id: remId, ...dataObj } });
                }
              } else {
                await prisma.reminder.create({ data: dataObj });
              }
              processedCount++;
            } else if (normAction === 'DELETE') {
              const remId = payload.id || item.id;
              if (remId) {
                await prisma.reminder.deleteMany({ where: { id: remId, userId } });
                processedCount++;
              }
            }
          }

          // USER PROFILE
          else if (normEntity === 'user' || normEntity === 'userprofile') {
            if (normAction === 'UPDATE') {
              await prisma.user.update({
                where: { id: userId },
                data: {
                  ...(payload.name && { name: payload.name }),
                  ...(payload.email && { email: payload.email }),
                  ...(payload.phone !== undefined && { phone: payload.phone }),
                  ...(payload.country !== undefined && { country: payload.country }),
                  ...(payload.sex !== undefined && { sex: payload.sex }),
                  ...(payload.place !== undefined && { place: payload.place }),
                  ...(payload.avatarUrl !== undefined && { avatarUrl: payload.avatarUrl }),
                  ...(payload.theme !== undefined && { theme: payload.theme }),
                  ...(payload.currency !== undefined && { currency: payload.currency }),
                  ...(payload.securityPin !== undefined && { securityPin: String(payload.securityPin) }),
                  ...(payload.biometrics !== undefined && { biometrics: Boolean(payload.biometrics) }),
                  ...(payload.notifications !== undefined && { notifications: Boolean(payload.notifications) }),
                },
              }).catch(() => {});
              processedCount++;
            }
          }
        } catch (itemErr) {
          console.error('[syncUserData] Item sync error:', itemErr);
        }
      }
    }

    // 3. Fetch full snapshot of user data after sync
    const [user, transactions, accounts, categories, businessEntities, reminders] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
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
        },
      }).catch(() => null),
      prisma.transaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }).catch(() => []),
      prisma.account.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }).catch(() => []),
      prisma.category.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
      }).catch(() => []),
      prisma.businessEntity.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
      }).catch(() => []),
      prisma.reminder.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }).catch(() => []),
    ]);

    const syncedAt = new Date().toISOString();

    res.json({
      success: true,
      message: 'Data synchronized successfully',
      syncedAt,
      processedCount,
      data: {
        user: user || {},
        transactions,
        accounts,
        categories,
        businessEntities,
        reminders,
      },
    });
  } catch (error) {
    console.error('syncUserData error:', error);
    res.status(500).json({ success: false, error: 'Failed to synchronize data' });
  }
};
