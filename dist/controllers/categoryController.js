"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCategory = exports.updateCategory = exports.createCategory = exports.getCategories = void 0;
const db_1 = require("../db");
const userController_1 = require("./userController");
// GET /api/categories
const getCategories = async (req, res) => {
    try {
        const userId = (0, userController_1.resolveRequestUserId)(req);
        const categories = await db_1.prisma.category.findMany({
            where: { userId },
            orderBy: { name: 'asc' },
        });
        res.json({ success: true, data: categories });
    }
    catch (error) {
        console.error('getCategories error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch categories' });
    }
};
exports.getCategories = getCategories;
// POST /api/categories
const createCategory = async (req, res) => {
    try {
        const userId = (0, userController_1.resolveRequestUserId)(req);
        const { name, icon, color } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, error: 'Category name is required' });
        }
        const category = await db_1.prisma.category.create({
            data: {
                userId,
                name: name.trim(),
                icon: icon || 'tag',
                color: color || '#8B5CF6',
            },
        });
        res.status(201).json({ success: true, data: category });
    }
    catch (error) {
        if (error?.code === 'P2002') {
            return res.status(400).json({ success: false, error: 'A category with this name already exists' });
        }
        console.error('createCategory error:', error);
        res.status(500).json({ success: false, error: 'Failed to create category' });
    }
};
exports.createCategory = createCategory;
// PUT /api/categories/:id
const updateCategory = async (req, res) => {
    try {
        const userId = (0, userController_1.resolveRequestUserId)(req);
        const { id } = req.params;
        const { name, icon, color } = req.body;
        const existing = await db_1.prisma.category.findFirst({ where: { id, userId } });
        if (!existing) {
            return res.status(404).json({ success: false, error: 'Category not found' });
        }
        const updated = await db_1.prisma.category.update({
            where: { id },
            data: {
                ...(name !== undefined && { name: name.trim() }),
                ...(icon !== undefined && { icon }),
                ...(color !== undefined && { color }),
            },
        });
        res.json({ success: true, data: updated });
    }
    catch (error) {
        if (error?.code === 'P2002') {
            return res.status(400).json({ success: false, error: 'A category with this name already exists' });
        }
        console.error('updateCategory error:', error);
        res.status(500).json({ success: false, error: 'Failed to update category' });
    }
};
exports.updateCategory = updateCategory;
// DELETE /api/categories/:id
const deleteCategory = async (req, res) => {
    try {
        const userId = (0, userController_1.resolveRequestUserId)(req);
        const { id } = req.params;
        const existing = await db_1.prisma.category.findFirst({ where: { id, userId } });
        if (!existing) {
            return res.status(404).json({ success: false, error: 'Category not found' });
        }
        await db_1.prisma.category.delete({ where: { id } });
        res.json({ success: true, message: 'Category deleted' });
    }
    catch (error) {
        console.error('deleteCategory error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete category' });
    }
};
exports.deleteCategory = deleteCategory;
