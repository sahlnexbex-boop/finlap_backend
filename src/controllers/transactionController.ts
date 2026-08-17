import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { resolveRequestUserId } from './userController';
import fs from 'fs';
import path from 'path';
import multer from 'multer';

const ATTACHMENT_DIR = path.join(__dirname, '../../uploads/transaction_attachments');
if (!fs.existsSync(ATTACHMENT_DIR)) {
  fs.mkdirSync(ATTACHMENT_DIR, { recursive: true });
}

const cleanStoredName = (fileName?: string) =>
  String(fileName || 'receipt')
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .substring(0, 40);

const transactionAttachmentStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, ATTACHMENT_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').replace('.', '') || 'jpg';
    const baseName = cleanStoredName(file.originalname);
    cb(null, `${baseName || 'receipt'}-${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`);
  },
});

export const transactionAttachmentUpload = multer({
  storage: transactionAttachmentStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

const extensionFromDataUrl = (dataUrl: string) => {
  const match = dataUrl.match(/^data:([a-zA-Z0-9/-]+);base64,/);
  const mime = match?.[1] || '';
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('pdf')) return 'pdf';
  return 'jpg';
};

const TRANSACTION_TYPE = {
  EXPENSE: 0,
  INCOME: 1,
} as const;

const normalizeTransactionType = (type: unknown, amount?: number) => {
  if (type === TRANSACTION_TYPE.INCOME || type === '1' || type === 'INCOME') {
    return TRANSACTION_TYPE.INCOME;
  }
  if (type === TRANSACTION_TYPE.EXPENSE || type === '0' || type === 'EXPENSE') {
    return TRANSACTION_TYPE.EXPENSE;
  }
  return amount !== undefined && amount > 0 ? TRANSACTION_TYPE.INCOME : TRANSACTION_TYPE.EXPENSE;
};

const normalizeBoolean = (value: unknown) => value === true || value === 'true' || value === '1' || value === 1;

const transactionTypeClientField = Prisma.dmmf.datamodel.models
  .find((model) => model.name === 'Transaction')
  ?.fields.find((field) => field.name === 'type');

const serializeTransactionTypeForClient = (type: 0 | 1) => {
  if (transactionTypeClientField?.type === 'String') {
    return type === TRANSACTION_TYPE.INCOME ? 'INCOME' : 'EXPENSE';
  }
  return type;
};

const transactionSelect = {
  id: true,
  userId: true,
  title: true,
  merchant: true,
  amount: true,
  type: true,
  category: true,
  date: true,
  time: true,
  status: true,
  walletId: true,
  walletName: true,
  businessEntityId: true,
  businessName: true,
  note: true,
  fundingSource: true,
  isRecurring: true,
  icon: true,
  isReturnable: true,
  returnableType: true,
  returnableStatus: true,
  settledAmount: true,
  relatedTransactionId: true,
  counterparty: true,
  createdAt: true,
} as const;

const storeTransactionAttachment = async (transactionId: string, attachmentPath: string) => {
  try {
    await prisma.$executeRaw`
      UPDATE "Transaction"
      SET "attachment" = ${attachmentPath}
      WHERE "id" = ${transactionId}
    `;
  } catch (error: any) {
    if (error?.code !== 'P2010' && error?.code !== 'P2022') {
      throw error;
    }

    await prisma.$executeRaw`
      UPDATE "Transaction"
      SET "attachmentUrl" = ${attachmentPath}
      WHERE "id" = ${transactionId}
    `;
  }
};

export const getTransactions = async (req: Request, res: Response) => {
  try {
    const userId = resolveRequestUserId(req);
    const { category, type, search, account, businessEntityId, date, startDate, endDate, isReturnable, returnableType } = req.query;

    let whereClause: any = { userId };
    if (category && category !== 'ALL') {
      whereClause.category = String(category);
    }
    if (type && type !== 'ALL') {
      whereClause.type = normalizeTransactionType(type);
    }
    if (isReturnable !== undefined) {
      whereClause.isReturnable = normalizeBoolean(isReturnable);
    }
    if (returnableType && returnableType !== 'ALL') {
      whereClause.returnableType = String(returnableType);
    }
    if (account && account !== 'ALL') {
      whereClause.OR = [
        { fundingSource: String(account) },
        { walletName: String(account) },
      ];
    }
    if (businessEntityId && businessEntityId !== 'ALL') {
      whereClause.businessEntityId = String(businessEntityId);
    }
    if (date && date !== 'ALL') {
      whereClause.date = String(date);
    }

    let transactions = await prisma.transaction.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      select: transactionSelect,
    });

    // Helper to parse date string (e.g. "Jul 30, 2026") into timestamp
    const getTimestamp = (t: any) => {
      try {
        const dateParsed = new Date(t.date);
        if (!isNaN(dateParsed.getTime())) {
          if (t.time) {
            const [hours, minutes] = t.time.split(':').map(Number);
            if (!isNaN(hours) && !isNaN(minutes)) {
              dateParsed.setHours(hours, minutes, 0, 0);
            }
          }
          return dateParsed.getTime();
        }
      } catch (e) {}
      return new Date(t.createdAt).getTime();
    };

    // Sort by latest date & time on top
    transactions.sort((a, b) => getTimestamp(b) - getTimestamp(a));

    if (startDate || endDate) {
      const startMs = startDate ? new Date(String(startDate)).getTime() : 0;
      const endMs = endDate ? new Date(String(endDate)).setHours(23, 59, 59, 999) : Infinity;
      transactions = transactions.filter((t) => {
        const ts = getTimestamp(t);
        return ts >= startMs && ts <= endMs;
      });
    }

    if (search) {
      const query = String(search).toLowerCase();
      transactions = transactions.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          t.merchant.toLowerCase().includes(query) ||
          t.category.toLowerCase().includes(query) ||
          (t.note && t.note.toLowerCase().includes(query)) ||
          (t.businessName && t.businessName.toLowerCase().includes(query)) ||
          (t.fundingSource && t.fundingSource.toLowerCase().includes(query)) ||
          (t.counterparty && t.counterparty.toLowerCase().includes(query))
      );
    }

    res.json({
      success: true,
      count: transactions.length,
      data: transactions,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch transactions' });
  }
};

export const getPendingReturnables = async (req: Request, res: Response) => {
  try {
    const userId = resolveRequestUserId(req);
    const { type } = req.query;

    const whereClause: any = {
      userId,
      isReturnable: true,
      returnableStatus: { in: ['PENDING', 'PARTIALLY_SETTLED'] },
    };
    if (type && type !== 'ALL') {
      whereClause.returnableType = String(type);
    }

    const list = await prisma.transaction.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      select: transactionSelect,
    });

    res.json({
      success: true,
      count: list.length,
      data: list,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch pending returnable items' });
  }
};

export const createTransaction = async (req: Request, res: Response) => {
  try {
    const userId = resolveRequestUserId(req);
    const {
      title,
      merchant,
      amount,
      type,
      category,
      walletName,
      businessName,
      businessEntityId,
      note,
      fundingSource,
      isRecurring,
      attachment,
      date,
      isReturnable,
      returnableType,
      counterparty,
      relatedTransactionId,
    } = req.body;

    if (!amount) {
      return res.status(400).json({ success: false, error: 'Amount is required' });
    }

    const now = new Date();
    const dateStr = date || 'Oct 24, 2023';
    const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);

    const numericAmount = parseFloat(amount);
    const finalType = normalizeTransactionType(type, numericAmount);
    const finalAmount = finalType === TRANSACTION_TYPE.EXPENSE ? -Math.abs(numericAmount) : Math.abs(numericAmount);

    const selectedEntity = businessEntityId
      ? await prisma.businessEntity.findFirst({ where: { id: businessEntityId, userId } })
      : await prisma.businessEntity.findFirst({
          where: { userId, name: businessName },
        });

    if (businessEntityId && !selectedEntity) {
      return res.status(400).json({ success: false, error: 'Business entity does not belong to this user' });
    }

    const selectedCategory = category
      ? await prisma.category.findFirst({ where: { userId, name: category } })
      : null;

    if (category && !selectedCategory) {
      return res.status(400).json({ success: false, error: 'Category does not belong to this user' });
    }

    const selectedAccount = fundingSource
      ? await prisma.account.findFirst({ where: { userId, name: fundingSource } })
      : null;

    if (fundingSource && !selectedAccount) {
      return res.status(400).json({ success: false, error: 'Account does not belong to this user' });
    }

    const isReturnableBool = normalizeBoolean(isReturnable);
    const finalReturnableType = isReturnableBool
      ? returnableType || (finalType === TRANSACTION_TYPE.EXPENSE ? 'RECEIVABLE' : 'PAYABLE')
      : null;
    const finalReturnableStatus = isReturnableBool ? 'PENDING' : null;

    const finalBusinessName = selectedEntity?.name || businessName || title || merchant || 'Business Transaction';
    const finalFundingSource = selectedAccount?.name || walletName || 'Account';
    const displayTitle = counterparty ? `${counterparty} (${finalBusinessName})` : finalBusinessName;
    const uploadedFile = req.file as Express.Multer.File | undefined;
    const attachmentPath = uploadedFile
      ? `/uploads/transaction_attachments/${uploadedFile.filename}`
      : attachment || null;

    const transaction = await prisma.transaction.create({
      data: {
        userId,
        title: displayTitle,
        merchant: merchant || displayTitle,
        amount: finalAmount,
        type: serializeTransactionTypeForClient(finalType),
        category: selectedCategory?.name || category || 'Uncategorized',
        date: dateStr,
        time: timeStr,
        walletName: finalFundingSource,
        businessName: finalBusinessName,
        businessEntityId: selectedEntity?.id || null,
        note: note || '',
        fundingSource: finalFundingSource,
        isRecurring: normalizeBoolean(isRecurring),
        icon: 'building',
        status: 'COMPLETED',
        isReturnable: isReturnableBool,
        returnableType: finalReturnableType,
        returnableStatus: finalReturnableStatus,
        settledAmount: 0,
        relatedTransactionId: relatedTransactionId || null,
        counterparty: counterparty || null,
      } as any,
      select: transactionSelect,
    });

    // If this transaction settles a parent returnable item, update parent status
    if (relatedTransactionId) {
      const parent = await prisma.transaction.findFirst({
        where: { id: relatedTransactionId, userId },
      });
      if (parent) {
        const parentTotal = Math.abs(parent.amount);
        const newSettled = (parent.settledAmount || 0) + Math.abs(numericAmount);
        const newStatus = newSettled >= parentTotal ? 'SETTLED' : 'PARTIALLY_SETTLED';
        await prisma.transaction.update({
          where: { id: parent.id },
          data: {
            settledAmount: newSettled,
            returnableStatus: newStatus,
          },
        });
      }
    }

    if (attachmentPath) {
      await storeTransactionAttachment(transaction.id, attachmentPath);
    }

    // Sync account balance
    if (selectedAccount) {
      await prisma.account.update({
        where: { id: selectedAccount.id },
        data: { balance: selectedAccount.balance + finalAmount },
      });
    }

    res.status(201).json({ success: true, data: { ...transaction, attachment: attachmentPath } });
  } catch (error) {
    console.error('Failed to create transaction:', error);
    res.status(500).json({ success: false, error: 'Failed to create transaction' });
  }
};

export const uploadTransactionAttachment = async (req: Request, res: Response) => {
  try {
    const { fileBase64, fileName } = req.body;

    if (!fileBase64) {
      return res.status(400).json({ success: false, error: 'No attachment data provided' });
    }

    const extension = extensionFromDataUrl(fileBase64);
    const base64Data = fileBase64.replace(/^data:[a-zA-Z0-9/-]+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const cleanName = cleanStoredName(fileName);
    const storedName = `${cleanName || 'receipt'}-${Date.now()}-${Math.round(Math.random() * 1e6)}.${extension}`;
    const filePath = path.join(ATTACHMENT_DIR, storedName);

    fs.writeFileSync(filePath, buffer);

    res.json({
      success: true,
      attachment: `/uploads/transaction_attachments/${storedName}`,
    });
  } catch (error) {
    console.error('Failed to upload transaction attachment:', error);
    res.status(500).json({ success: false, error: 'Failed to upload attachment' });
  }
};

export const deleteTransaction = async (req: Request, res: Response) => {
  try {
    const userId = resolveRequestUserId(req);
    const { id } = req.params;
    const existing = await prisma.transaction.findFirst({
      where: { id, userId },
      select: transactionSelect,
    });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }

    // Revert account balance if applicable
    if (existing.fundingSource) {
      const selectedAccount = await prisma.account.findFirst({
        where: { userId, name: existing.fundingSource },
      });
      if (selectedAccount) {
        await prisma.account.update({
          where: { id: selectedAccount.id },
          data: { balance: selectedAccount.balance - existing.amount },
        });
      }
    }

    // Revert parent returnable settlement if applicable
    if (existing.relatedTransactionId) {
      const parent = await prisma.transaction.findFirst({
        where: { id: existing.relatedTransactionId, userId },
      });
      if (parent) {
        const parentTotal = Math.abs(parent.amount);
        const newSettled = Math.max(0, (parent.settledAmount || 0) - Math.abs(existing.amount));
        const newStatus =
          newSettled <= 0 ? 'PENDING' : newSettled >= parentTotal ? 'SETTLED' : 'PARTIALLY_SETTLED';
        await prisma.transaction.update({
          where: { id: parent.id },
          data: {
            settledAmount: newSettled,
            returnableStatus: newStatus,
          },
        });
      }
    }

    await prisma.transaction.delete({ where: { id } });
    res.json({ success: true, message: 'Transaction deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete transaction' });
  }
};

export const updateTransaction = async (req: Request, res: Response) => {
  try {
    const userId = resolveRequestUserId(req);
    const { id } = req.params;
    const {
      title,
      merchant,
      amount,
      type,
      category,
      walletName,
      businessName,
      businessEntityId,
      note,
      fundingSource,
      isRecurring,
      attachment,
      date,
    } = req.body;

    const existing = await prisma.transaction.findFirst({
      where: { id, userId },
      select: transactionSelect,
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }

    // Revert previous account balance impact
    if (existing.fundingSource) {
      const prevAccount = await prisma.account.findFirst({
        where: { userId, name: existing.fundingSource },
      });
      if (prevAccount) {
        await prisma.account.update({
          where: { id: prevAccount.id },
          data: { balance: prevAccount.balance - existing.amount },
        });
      }
    }

    const numericAmount = amount !== undefined ? parseFloat(amount) : Math.abs(existing.amount);
    const finalType = normalizeTransactionType(type !== undefined ? type : existing.type, numericAmount);
    const finalAmount = finalType === TRANSACTION_TYPE.EXPENSE ? -Math.abs(numericAmount) : Math.abs(numericAmount);

    const selectedEntity = businessEntityId
      ? await prisma.businessEntity.findFirst({ where: { id: businessEntityId, userId } })
      : businessName
      ? await prisma.businessEntity.findFirst({ where: { userId, name: businessName } })
      : null;

    const finalBusinessName = selectedEntity?.name || businessName || title || merchant || existing.businessName || existing.title;
    const finalFundingSource = fundingSource || walletName || existing.fundingSource || 'Account';
    const displayTitle = finalBusinessName;

    const uploadedFile = req.file as Express.Multer.File | undefined;
    const attachmentPath = uploadedFile
      ? `/uploads/transaction_attachments/${uploadedFile.filename}`
      : attachment !== undefined
      ? attachment
      : (existing as any).attachment || null;

    const updated = await prisma.transaction.update({
      where: { id },
      data: {
        title: displayTitle,
        merchant: merchant || displayTitle,
        amount: finalAmount,
        type: serializeTransactionTypeForClient(finalType),
        category: category || existing.category,
        date: date || existing.date,
        walletName: finalFundingSource,
        businessName: finalBusinessName,
        businessEntityId: selectedEntity?.id || (businessEntityId !== undefined ? businessEntityId : existing.businessEntityId),
        note: note !== undefined ? note : existing.note,
        fundingSource: finalFundingSource,
        isRecurring: isRecurring !== undefined ? normalizeBoolean(isRecurring) : existing.isRecurring,
      } as any,
      select: transactionSelect,
    });

    if (attachmentPath) {
      await storeTransactionAttachment(updated.id, attachmentPath);
    }

    // Apply new account balance impact
    const newAccount = await prisma.account.findFirst({
      where: { userId, name: finalFundingSource },
    });
    if (newAccount) {
      await prisma.account.update({
        where: { id: newAccount.id },
        data: { balance: newAccount.balance + finalAmount },
      });
    }

    res.json({ success: true, data: { ...updated, attachment: attachmentPath } });
  } catch (error) {
    console.error('Failed to update transaction:', error);
    res.status(500).json({ success: false, error: 'Failed to update transaction' });
  }
};
