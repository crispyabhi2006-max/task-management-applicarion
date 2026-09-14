import { Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { getPool } from '../config/db.ts';
import { AuthRequest } from '../middleware/auth.ts';
import { emitTaskEvent } from '../socket/index.ts';

/**
 * Get all tasks for authenticated user with search, filters, sorting, and pagination
 * GET /api/tasks
 */
export async function getTasks(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const pool = getPool();

    const {
      search,
      status,
      priority,
      category,
      dueDate,
      sort = 'newest',
      page = '1',
      limit = '10',
    } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * limitNum;

    // Build parameterized query dynamically
    const whereClauses: string[] = ['user_id = ?'];
    const params: any[] = [userId];

    // Search filter
    if (search && search.trim()) {
      whereClauses.push('(title LIKE ? OR description LIKE ? OR category LIKE ?)');
      const searchPattern = `%${search.trim()}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    // Status filter
    if (status && ['Pending', 'In Progress', 'Completed'].includes(status)) {
      whereClauses.push('status = ?');
      params.push(status);
    }

    // Priority filter
    if (priority && ['Low', 'Medium', 'High'].includes(priority)) {
      whereClauses.push('priority = ?');
      params.push(priority);
    }

    // Category filter
    if (category && category.trim()) {
      whereClauses.push('category = ?');
      params.push(category.trim());
    }

    // Due Date filter
    if (dueDate) {
      if (dueDate === 'today') {
        whereClauses.push('due_date = CURDATE()');
      } else if (dueDate === 'overdue') {
        whereClauses.push('due_date < CURDATE() AND status != "Completed"');
      } else if (dueDate === 'upcoming') {
        whereClauses.push('due_date > CURDATE()');
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
        whereClauses.push('due_date = ?');
        params.push(dueDate);
      }
    }

    const whereSql = whereClauses.join(' AND ');

    // Safe sorting whitelist
    let orderBySql = 'created_at DESC';
    switch (sort) {
      case 'oldest':
        orderBySql = 'created_at ASC';
        break;
      case 'due_date':
        // Null due dates last
        orderBySql = 'CASE WHEN due_date IS NULL THEN 1 ELSE 0 END, due_date ASC';
        break;
      case 'priority':
        orderBySql = "FIELD(priority, 'High', 'Medium', 'Low'), created_at DESC";
        break;
      case 'title':
        orderBySql = 'title ASC';
        break;
      case 'newest':
      default:
        orderBySql = 'created_at DESC';
        break;
    }

    // 1. Get total count for pagination
    const countQuery = `SELECT COUNT(*) AS total FROM tasks WHERE ${whereSql}`;
    const [countRows] = await pool.execute<any[]>(countQuery, params);
    const total = countRows[0]?.total || 0;

    // 2. Fetch tasks with pagination
    const tasksQuery = `
      SELECT id, user_id, title, description, status, priority, 
             DATE_FORMAT(due_date, '%Y-%m-%d') as due_date, 
             category, created_at, updated_at 
      FROM tasks 
      WHERE ${whereSql} 
      ORDER BY ${orderBySql} 
      LIMIT ? OFFSET ?
    `;

    // Note: MySQL LIMIT and OFFSET must be numbers
    const [taskRows] = await pool.query<any[]>(tasksQuery, [...params, limitNum, offset]);

    res.status(200).json({
      success: true,
      data: {
        tasks: taskRows,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum) || 1,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get dashboard statistics for authenticated user directly from MySQL
 * GET /api/tasks/stats
 */
export async function getTaskStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const pool = getPool();

    // MySQL single aggregated query for maximum performance
    const statsQuery = `
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) AS inProgress,
        SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN priority = 'High' THEN 1 ELSE 0 END) AS highPriority,
        SUM(CASE WHEN due_date < CURDATE() AND status != 'Completed' THEN 1 ELSE 0 END) AS overdue
      FROM tasks
      WHERE user_id = ?
    `;

    const [statsRows] = await pool.execute<any[]>(statsQuery, [userId]);
    const row = statsRows[0] || {};

    // Also get breakdown by priority and recent tasks
    const priorityQuery = `
      SELECT priority, COUNT(*) as count 
      FROM tasks 
      WHERE user_id = ? 
      GROUP BY priority
    `;
    const [priorityRows] = await pool.execute<any[]>(priorityQuery, [userId]);

    // Breakdown by category
    const categoryQuery = `
      SELECT COALESCE(category, 'General') as category, COUNT(*) as count 
      FROM tasks 
      WHERE user_id = ? 
      GROUP BY category 
      ORDER BY count DESC 
      LIMIT 6
    `;
    const [categoryRows] = await pool.execute<any[]>(categoryQuery, [userId]);

    res.status(200).json({
      success: true,
      data: {
        total: Number(row.total || 0),
        pending: Number(row.pending || 0),
        inProgress: Number(row.inProgress || 0),
        completed: Number(row.completed || 0),
        highPriority: Number(row.highPriority || 0),
        overdue: Number(row.overdue || 0),
        priorityBreakdown: priorityRows,
        categoryBreakdown: categoryRows,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get single task by ID (authorized to user)
 * GET /api/tasks/:id
 */
export async function getTaskById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const taskId = req.params.id;
    const userId = req.user!.id;
    const pool = getPool();

    const [rows] = await pool.execute<any[]>(
      `SELECT id, user_id, title, description, status, priority, 
              DATE_FORMAT(due_date, '%Y-%m-%d') as due_date, 
              category, created_at, updated_at 
       FROM tasks 
       WHERE id = ? AND user_id = ?`,
      [taskId, userId]
    );

    if (rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Task not found or access forbidden.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: rows[0],
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Create a new task
 * POST /api/tasks
 */
export async function createTask(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
        errors: errors.array(),
      });
      return;
    }

    const userId = req.user!.id;
    const { title, description, status = 'Pending', priority = 'Medium', dueDate, category } = req.body;
    const pool = getPool();

    const formattedDueDate = dueDate && dueDate.trim() !== '' ? dueDate.trim() : null;
    const formattedCategory = category && category.trim() !== '' ? category.trim() : null;

    const [result] = await pool.execute<any>(
      `INSERT INTO tasks (user_id, title, description, status, priority, due_date, category) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        title.trim(),
        description ? description.trim() : null,
        status,
        priority,
        formattedDueDate,
        formattedCategory,
      ]
    );

    const insertedId = result.insertId;

    // Retrieve the newly created task
    const [rows] = await pool.execute<any[]>(
      `SELECT id, user_id, title, description, status, priority, 
              DATE_FORMAT(due_date, '%Y-%m-%d') as due_date, 
              category, created_at, updated_at 
       FROM tasks 
       WHERE id = ?`,
      [insertedId]
    );

    const newTask = rows[0];

    // Real-time notification via Socket.IO
    emitTaskEvent(userId, 'task_created', newTask);

    res.status(201).json({
      success: true,
      message: 'Task created successfully.',
      data: newTask,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Update an existing task
 * PUT /api/tasks/:id
 */
export async function updateTask(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
        errors: errors.array(),
      });
      return;
    }

    const taskId = req.params.id;
    const userId = req.user!.id;
    const pool = getPool();

    // 1. Verify task ownership
    const [existing] = await pool.execute<any[]>(
      'SELECT id FROM tasks WHERE id = ? AND user_id = ?',
      [taskId, userId]
    );

    if (existing.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Task not found or access forbidden.',
      });
      return;
    }

    const { title, description, status, priority, dueDate, category } = req.body;
    const formattedDueDate = dueDate && dueDate.trim() !== '' ? dueDate.trim() : null;
    const formattedCategory = category && category.trim() !== '' ? category.trim() : null;

    // 2. Parameterized update
    await pool.execute(
      `UPDATE tasks 
       SET title = ?, description = ?, status = ?, priority = ?, due_date = ?, category = ? 
       WHERE id = ? AND user_id = ?`,
      [
        title.trim(),
        description ? description.trim() : null,
        status || 'Pending',
        priority || 'Medium',
        formattedDueDate,
        formattedCategory,
        taskId,
        userId,
      ]
    );

    // 3. Fetch updated task
    const [rows] = await pool.execute<any[]>(
      `SELECT id, user_id, title, description, status, priority, 
              DATE_FORMAT(due_date, '%Y-%m-%d') as due_date, 
              category, created_at, updated_at 
       FROM tasks 
       WHERE id = ?`,
      [taskId]
    );

    const updatedTask = rows[0];

    // Real-time notification via Socket.IO
    emitTaskEvent(userId, 'task_updated', updatedTask);

    res.status(200).json({
      success: true,
      message: 'Task updated successfully.',
      data: updatedTask,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Update task status
 * PATCH /api/tasks/:id/status
 */
export async function updateTaskStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const taskId = req.params.id;
    const userId = req.user!.id;
    const { status } = req.body;

    if (!['Pending', 'In Progress', 'Completed'].includes(status)) {
      res.status(400).json({
        success: false,
        message: 'Status must be one of: Pending, In Progress, Completed.',
      });
      return;
    }

    const pool = getPool();

    // 1. Verify ownership
    const [existing] = await pool.execute<any[]>(
      'SELECT id FROM tasks WHERE id = ? AND user_id = ?',
      [taskId, userId]
    );

    if (existing.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Task not found or access forbidden.',
      });
      return;
    }

    // 2. Update status
    await pool.execute(
      'UPDATE tasks SET status = ? WHERE id = ? AND user_id = ?',
      [status, taskId, userId]
    );

    // 3. Retrieve updated task
    const [rows] = await pool.execute<any[]>(
      `SELECT id, user_id, title, description, status, priority, 
              DATE_FORMAT(due_date, '%Y-%m-%d') as due_date, 
              category, created_at, updated_at 
       FROM tasks 
       WHERE id = ?`,
      [taskId]
    );

    const updatedTask = rows[0];

    // Real-time notification via Socket.IO
    emitTaskEvent(userId, 'task_status_changed', updatedTask);

    res.status(200).json({
      success: true,
      message: `Task status updated to ${status}.`,
      data: updatedTask,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Delete a task
 * DELETE /api/tasks/:id
 */
export async function deleteTask(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const taskId = req.params.id;
    const userId = req.user!.id;
    const pool = getPool();

    // Verify ownership
    const [existing] = await pool.execute<any[]>(
      'SELECT id, title FROM tasks WHERE id = ? AND user_id = ?',
      [taskId, userId]
    );

    if (existing.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Task not found or access forbidden.',
      });
      return;
    }

    // Delete
    await pool.execute('DELETE FROM tasks WHERE id = ? AND user_id = ?', [taskId, userId]);

    // Real-time notification via Socket.IO
    emitTaskEvent(userId, 'task_deleted', { id: Number(taskId) });

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully.',
      data: { id: Number(taskId) },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get distinct categories for authenticated user
 * GET /api/tasks/categories
 */
export async function getCategories(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const pool = getPool();

    const [rows] = await pool.execute<any[]>(
      `SELECT DISTINCT category 
       FROM tasks 
       WHERE user_id = ? AND category IS NOT NULL AND category != '' 
       ORDER BY category ASC`,
      [userId]
    );

    const categories = rows.map((r) => r.category);

    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (err) {
    next(err);
  }
}
