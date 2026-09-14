import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  getTasks,
  getTaskStats,
  getTaskById,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
  getCategories,
} from '../controllers/taskController.ts';
import { authenticateToken } from '../middleware/auth.ts';

const router = Router();

// All task routes require authentication
router.use(authenticateToken);

// 1. Dashboard statistics (placed before /:id)
router.get('/stats', getTaskStats);

// 2. Categories
router.get('/categories', getCategories);

// 3. Task CRUD and list
router.get('/', getTasks);

router.get(
  '/:id',
  [param('id').isInt().withMessage('Task ID must be an integer')],
  getTaskById
);

router.post(
  '/',
  [
    body('title')
      .trim()
      .notEmpty()
      .withMessage('Task title is required')
      .isLength({ max: 255 })
      .withMessage('Title cannot exceed 255 characters'),
    body('description')
      .optional({ nullable: true })
      .isString()
      .withMessage('Description must be text'),
    body('status')
      .optional()
      .isIn(['Pending', 'In Progress', 'Completed'])
      .withMessage('Status must be Pending, In Progress, or Completed'),
    body('priority')
      .optional()
      .isIn(['Low', 'Medium', 'High'])
      .withMessage('Priority must be Low, Medium, or High'),
    body('dueDate')
      .optional({ nullable: true, checkFalsy: true })
      .isISO8601()
      .withMessage('Due date must be a valid date (YYYY-MM-DD)'),
    body('category')
      .optional({ nullable: true })
      .trim()
      .isLength({ max: 100 })
      .withMessage('Category cannot exceed 100 characters'),
  ],
  createTask
);

router.put(
  '/:id',
  [
    param('id').isInt().withMessage('Task ID must be an integer'),
    body('title')
      .trim()
      .notEmpty()
      .withMessage('Task title is required')
      .isLength({ max: 255 })
      .withMessage('Title cannot exceed 255 characters'),
    body('status')
      .optional()
      .isIn(['Pending', 'In Progress', 'Completed'])
      .withMessage('Status must be Pending, In Progress, or Completed'),
    body('priority')
      .optional()
      .isIn(['Low', 'Medium', 'High'])
      .withMessage('Priority must be Low, Medium, or High'),
    body('dueDate')
      .optional({ nullable: true, checkFalsy: true })
      .isISO8601()
      .withMessage('Due date must be a valid date (YYYY-MM-DD)'),
    body('category')
      .optional({ nullable: true })
      .trim()
      .isLength({ max: 100 })
      .withMessage('Category cannot exceed 100 characters'),
  ],
  updateTask
);

router.patch(
  '/:id/status',
  [
    param('id').isInt().withMessage('Task ID must be an integer'),
    body('status')
      .notEmpty()
      .withMessage('Status is required')
      .isIn(['Pending', 'In Progress', 'Completed'])
      .withMessage('Status must be Pending, In Progress, or Completed'),
  ],
  updateTaskStatus
);

router.delete(
  '/:id',
  [param('id').isInt().withMessage('Task ID must be an integer')],
  deleteTask
);

export default router;
