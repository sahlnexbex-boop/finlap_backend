"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTransaction = exports.deleteTransaction = exports.uploadTransactionAttachment = exports.createTransaction = exports.getTransactions = exports.transactionAttachmentUpload = void 0;
const client_1 = require("@prisma/client");
const db_1 = require("../db");
const userController_1 = require("./userController");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const multer_1 = __importDefault(require("multer"));
const ATTACHMENT_DIR = path_1.default.join(__dirname, '../../uploads/transaction_attachments');
if (!fs_1.default.existsSync(ATTACHMENT_DIR)) {
    fs_1.default.mkdirSync(ATTACHMENT_DIR, { recursive: true });
}
const cleanStoredName = (fileName) => String(fileName || 'receipt')
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .substring(0, 40);
const transactionAttachmentStorage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => cb(null, ATTACHMENT_DIR),
    filename: (_req, file, cb) => {
        const ext = path_1.default.extname(file.originalname || '').replace('.', '') || 'jpg';
        const baseName = cleanStoredName(file.originalname);
        cb(null, `${baseName || 'receipt'}-${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`);
    },
});
exports.transactionAttachmentUpload = (0, multer_1.default)({
    storage: transactionAttachmentStorage,
    limits: { fileSize: 10 * 1024 * 1024 },
});
const extensionFromDataUrl = (dataUrl) => {
    const match = dataUrl.match(/^data:([a-zA-Z0-9/-]+);base64,/);
    const mime = match?.[1] || '';
    if (mime.includes('png'))
        return 'png';
    if (mime.includes('webp'))
        return 'webp';
    if (mime.includes('pdf'))
        return 'pdf';
    return 'jpg';
};
const TRANSACTION_TYPE = {
    EXPENSE: 0,
    INCOME: 1,
};
const normalizeTransactionType = (type, amount) => {
    if (type === TRANSACTION_TYPE.INCOME || type === '1' || type === 'INCOME') {
        return TRANSACTION_TYPE.INCOME;
    }
    if (type === TRANSACTION_TYPE.EXPENSE || type === '0' || type === 'EXPENSE') {
        return TRANSACTION_TYPE.EXPENSE;
    }
    return amount !== undefined && amount > 0 ? TRANSACTION_TYPE.INCOME : TRANSACTION_TYPE.EXPENSE;
};
const normalizeBoolean = (value) => value === true || value === 'true' || value === '1' || value === 1;
const transactionTypeClientField = client_1.Prisma.dmmf.datamodel.models
    .find((model) => model.name === 'Transaction')
    ?.fields.find((field) => field.name === 'type');
const serializeTransactionTypeForClient = (type) => {
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
    createdAt: true,
};
const storeTransactionAttachment = async (transactionId, attachmentPath) => {
    try {
        await db_1.prisma.$executeRaw `
      UPDATE "Transaction"
      SET "attachment" = ${attachmentPath}
      WHERE "id" = ${transactionId}
    `;
    }
    catch (error) {
        if (error?.code !== 'P2010' && error?.code !== 'P2022') {
            throw error;
        }
        await db_1.prisma.$executeRaw `
      UPDATE "Transaction"
      SET "attachmentUrl" = ${attachmentPath}
      WHERE "id" = ${transactionId}
    `;
    }
};
const getTransactions = async (req, res) => {
    try {
        const userId = (0, userController_1.resolveRequestUserId)(req);
        const { category, type, search, account, businessEntityId, date, startDate, endDate } = req.query;
        let whereClause = { userId };
        if (category && category !== 'ALL') {
            whereClause.category = String(category);
        }
        if (type && type !== 'ALL') {
            whereClause.type = normalizeTransactionType(type);
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
        let transactions = await db_1.prisma.transaction.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            select: transactionSelect,
        });
        // Helper to parse date string (e.g. "Jul 30, 2026") into timestamp
        const getTimestamp = (t) => {
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
            }
            catch (e) { }
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
            transactions = transactions.filter((t) => t.title.toLowerCase().includes(query) ||
                t.merchant.toLowerCase().includes(query) ||
                t.category.toLowerCase().includes(query) ||
                (t.note && t.note.toLowerCase().includes(query)) ||
                (t.businessName && t.businessName.toLowerCase().includes(query)) ||
                (t.fundingSource && t.fundingSource.toLowerCase().includes(query)));
        }
        res.json({
            success: true,
            count: transactions.length,
            data: transactions,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch transactions' });
    }
};
exports.getTransactions = getTransactions;
const createTransaction = async (req, res) => {
    try {
        const userId = (0, userController_1.resolveRequestUserId)(req);
        const { title, merchant, amount, type, category, walletName, businessName, businessEntityId, note, fundingSource, isRecurring, attachment, date, } = req.body;
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
            ? await db_1.prisma.businessEntity.findFirst({ where: { id: businessEntityId, userId } })
            : await db_1.prisma.businessEntity.findFirst({
                where: { userId, name: businessName },
            });
        if (businessEntityId && !selectedEntity) {
            return res.status(400).json({ success: false, error: 'Business entity does not belong to this user' });
        }
        const selectedCategory = category
            ? await db_1.prisma.category.findFirst({ where: { userId, name: category } })
            : null;
        if (category && !selectedCategory) {
            return res.status(400).json({ success: false, error: 'Category does not belong to this user' });
        }
        const selectedAccount = fundingSource
            ? await db_1.prisma.account.findFirst({ where: { userId, name: fundingSource } })
            : null;
        if (fundingSource && !selectedAccount) {
            return res.status(400).json({ success: false, error: 'Account does not belong to this user' });
        }
        const finalBusinessName = selectedEntity?.name || businessName || title || merchant || 'Business Transaction';
        const finalFundingSource = selectedAccount?.name || walletName || 'Account';
        const displayTitle = finalBusinessName;
        const uploadedFile = req.file;
        const attachmentPath = uploadedFile
            ? `/uploads/transaction_attachments/${uploadedFile.filename}`
            : attachment || null;
        const transaction = await db_1.prisma.transaction.create({
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
            },
            select: transactionSelect,
        });
        if (attachmentPath) {
            await storeTransactionAttachment(transaction.id, attachmentPath);
        }
        // Sync account balance
        if (selectedAccount) {
            await db_1.prisma.account.update({
                where: { id: selectedAccount.id },
                data: { balance: selectedAccount.balance + finalAmount },
            });
        }
        res.status(201).json({ success: true, data: { ...transaction, attachment: attachmentPath } });
    }
    catch (error) {
        console.error('Failed to create transaction:', error);
        res.status(500).json({ success: false, error: 'Failed to create transaction' });
    }
};
exports.createTransaction = createTransaction;
const uploadTransactionAttachment = async (req, res) => {
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
        const filePath = path_1.default.join(ATTACHMENT_DIR, storedName);
        fs_1.default.writeFileSync(filePath, buffer);
        res.json({
            success: true,
            attachment: `/uploads/transaction_attachments/${storedName}`,
        });
    }
    catch (error) {
        console.error('Failed to upload transaction attachment:', error);
        res.status(500).json({ success: false, error: 'Failed to upload attachment' });
    }
};
exports.uploadTransactionAttachment = uploadTransactionAttachment;
const deleteTransaction = async (req, res) => {
    try {
        const userId = (0, userController_1.resolveRequestUserId)(req);
        const { id } = req.params;
        const existing = await db_1.prisma.transaction.findFirst({
            where: { id, userId },
            select: transactionSelect,
        });
        if (!existing) {
            return res.status(404).json({ success: false, error: 'Transaction not found' });
        }
        // Revert account balance if applicable
        if (existing.fundingSource) {
            const selectedAccount = await db_1.prisma.account.findFirst({
                where: { userId, name: existing.fundingSource },
            });
            if (selectedAccount) {
                await db_1.prisma.account.update({
                    where: { id: selectedAccount.id },
                    data: { balance: selectedAccount.balance - existing.amount },
                });
            }
        }
        await db_1.prisma.transaction.delete({ where: { id } });
        res.json({ success: true, message: 'Transaction deleted' });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Failed to delete transaction' });
    }
};
exports.deleteTransaction = deleteTransaction;
const updateTransaction = async (req, res) => {
    try {
        const userId = (0, userController_1.resolveRequestUserId)(req);
        const { id } = req.params;
        const { title, merchant, amount, type, category, walletName, businessName, businessEntityId, note, fundingSource, isRecurring, attachment, date, } = req.body;
        const existing = await db_1.prisma.transaction.findFirst({
            where: { id, userId },
            select: transactionSelect,
        });
        if (!existing) {
            return res.status(404).json({ success: false, error: 'Transaction not found' });
        }
        // Revert previous account balance impact
        if (existing.fundingSource) {
            const prevAccount = await db_1.prisma.account.findFirst({
                where: { userId, name: existing.fundingSource },
            });
            if (prevAccount) {
                await db_1.prisma.account.update({
                    where: { id: prevAccount.id },
                    data: { balance: prevAccount.balance - existing.amount },
                });
            }
        }
        const numericAmount = amount !== undefined ? parseFloat(amount) : Math.abs(existing.amount);
        const finalType = normalizeTransactionType(type !== undefined ? type : existing.type, numericAmount);
        const finalAmount = finalType === TRANSACTION_TYPE.EXPENSE ? -Math.abs(numericAmount) : Math.abs(numericAmount);
        const selectedEntity = businessEntityId
            ? await db_1.prisma.businessEntity.findFirst({ where: { id: businessEntityId, userId } })
            : businessName
                ? await db_1.prisma.businessEntity.findFirst({ where: { userId, name: businessName } })
                : null;
        const finalBusinessName = selectedEntity?.name || businessName || title || merchant || existing.businessName || existing.title;
        const finalFundingSource = fundingSource || walletName || existing.fundingSource || 'Account';
        const displayTitle = finalBusinessName;
        const uploadedFile = req.file;
        const attachmentPath = uploadedFile
            ? `/uploads/transaction_attachments/${uploadedFile.filename}`
            : attachment !== undefined
                ? attachment
                : existing.attachment || null;
        const updated = await db_1.prisma.transaction.update({
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
            },
            select: transactionSelect,
        });
        if (attachmentPath) {
            await storeTransactionAttachment(updated.id, attachmentPath);
        }
        // Apply new account balance impact
        const newAccount = await db_1.prisma.account.findFirst({
            where: { userId, name: finalFundingSource },
        });
        if (newAccount) {
            await db_1.prisma.account.update({
                where: { id: newAccount.id },
                data: { balance: newAccount.balance + finalAmount },
            });
        }
        res.json({ success: true, data: { ...updated, attachment: attachmentPath } });
    }
    catch (error) {
        console.error('Failed to update transaction:', error);
        res.status(500).json({ success: false, error: 'Failed to update transaction' });
    }
};
exports.updateTransaction = updateTransaction;
