"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteBusinessEntity = exports.updateBusinessEntity = exports.createBusinessEntity = exports.getBusinessEntities = void 0;
const db_1 = require("../db");
const userController_1 = require("./userController");
// GET /api/business-entities
const getBusinessEntities = async (req, res) => {
    try {
        const userId = (0, userController_1.resolveRequestUserId)(req);
        let entities = await db_1.prisma.businessEntity.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            include: { _count: { select: { transactions: true } } },
        });
        if (entities.length === 0) {
            await (0, userController_1.seedDefaultDataForUser)(userId);
            entities = await db_1.prisma.businessEntity.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                include: { _count: { select: { transactions: true } } },
            });
        }
        res.json({ success: true, data: entities });
    }
    catch (error) {
        console.error('getBusinessEntities error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch business entities' });
    }
};
exports.getBusinessEntities = getBusinessEntities;
// POST /api/business-entities
const createBusinessEntity = async (req, res) => {
    try {
        const userId = (0, userController_1.resolveRequestUserId)(req);
        const { name, subtitle, isPrimary } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, error: 'Name is required' });
        }
        if (isPrimary) {
            await db_1.prisma.businessEntity.updateMany({
                where: { userId, isPrimary: true },
                data: { isPrimary: false },
            });
        }
        const entity = await db_1.prisma.businessEntity.create({
            data: {
                userId,
                name: name.trim(),
                subtitle: subtitle?.trim() || null,
                isPrimary: Boolean(isPrimary),
            },
        });
        res.status(201).json({ success: true, data: entity });
    }
    catch (error) {
        console.error('createBusinessEntity error:', error);
        res.status(500).json({ success: false, error: 'Failed to create business entity' });
    }
};
exports.createBusinessEntity = createBusinessEntity;
// PUT /api/business-entities/:id
const updateBusinessEntity = async (req, res) => {
    try {
        const userId = (0, userController_1.resolveRequestUserId)(req);
        const { id } = req.params;
        const { name, subtitle, isPrimary } = req.body;
        const existing = await db_1.prisma.businessEntity.findFirst({ where: { id, userId } });
        if (!existing) {
            return res.status(404).json({ success: false, error: 'Entity not found' });
        }
        if (isPrimary) {
            await db_1.prisma.businessEntity.updateMany({
                where: { userId, isPrimary: true, NOT: { id } },
                data: { isPrimary: false },
            });
        }
        const updated = await db_1.prisma.businessEntity.update({
            where: { id },
            data: {
                ...(name !== undefined && { name: name.trim() }),
                ...(subtitle !== undefined && { subtitle: subtitle?.trim() || null }),
                ...(isPrimary !== undefined && { isPrimary: Boolean(isPrimary) }),
            },
        });
        res.json({ success: true, data: updated });
    }
    catch (error) {
        console.error('updateBusinessEntity error:', error);
        res.status(500).json({ success: false, error: 'Failed to update business entity' });
    }
};
exports.updateBusinessEntity = updateBusinessEntity;
// DELETE /api/business-entities/:id
const deleteBusinessEntity = async (req, res) => {
    try {
        const userId = (0, userController_1.resolveRequestUserId)(req);
        const { id } = req.params;
        const existing = await db_1.prisma.businessEntity.findFirst({ where: { id, userId } });
        if (!existing) {
            return res.status(404).json({ success: false, error: 'Entity not found' });
        }
        await db_1.prisma.transaction.updateMany({
            where: { userId, businessEntityId: id },
            data: { businessEntityId: null },
        });
        await db_1.prisma.businessEntity.delete({ where: { id } });
        res.json({ success: true, message: 'Business entity deleted' });
    }
    catch (error) {
        console.error('deleteBusinessEntity error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete business entity' });
    }
};
exports.deleteBusinessEntity = deleteBusinessEntity;
