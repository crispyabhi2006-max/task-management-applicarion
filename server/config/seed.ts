import bcrypt from 'bcryptjs';
import { getPool } from './db.ts';

export async function seedDemoData(): Promise<void> {
  try {
    const pool = getPool();

    // Check if demo user exists
    const [existing] = await pool.execute<any[]>(
      'SELECT id FROM users WHERE email = ?',
      ['demo@taskmanager.com']
    );

    let userId: number;

    if (existing.length === 0) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('demo123456', salt);

      const [res] = await pool.execute<any>(
        'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
        ['Intern Developer', 'demo@taskmanager.com', hashedPassword]
      );
      userId = res.insertId;
      console.log(`[SEED] Created default demo user with ID: ${userId}`);
    } else {
      userId = existing[0].id;
    }

    // Check if demo user has tasks
    const [taskCountRows] = await pool.execute<any[]>(
      'SELECT COUNT(*) as count FROM tasks WHERE user_id = ?',
      [userId]
    );

    if (taskCountRows[0]?.count === 0) {
      console.log('[SEED] Populating sample tasks for demo user in MySQL...');

      const sampleTasks = [
        {
          title: 'Implement MySQL connection pool and schema migrations',
          description: 'Set up mysql2/promise connection pool with automatic reconnection and table verification.',
          status: 'Completed',
          priority: 'High',
          dueDate: new Date(Date.now() - 86400000).toISOString().split('T')[0], // yesterday
          category: 'Backend',
        },
        {
          title: 'Design responsive task dashboard with KPI metrics',
          description: 'Build summary cards for total, pending, in progress, completed, high priority, and overdue counts.',
          status: 'Completed',
          priority: 'Medium',
          dueDate: new Date(Date.now() - 43200000).toISOString().split('T')[0],
          category: 'Frontend',
        },
        {
          title: 'Build JWT authentication with bcrypt password hashing',
          description: 'Secure registration and login endpoints with tokens, salt rounds of 10, and input validation.',
          status: 'In Progress',
          priority: 'High',
          dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // tomorrow
          category: 'Security',
        },
        {
          title: 'Integrate real-time Socket.IO synchronization',
          description: 'Emit events for task creation, edits, deletions, and status toggles for multi-client sync.',
          status: 'In Progress',
          priority: 'Medium',
          dueDate: new Date(Date.now() + 172800000).toISOString().split('T')[0], // 2 days
          category: 'Realtime',
        },
        {
          title: 'Write unit tests and prepare assignment documentation',
          description: 'Draft the README with architecture diagram, MySQL schema details, and API curl commands.',
          status: 'Pending',
          priority: 'Medium',
          dueDate: new Date(Date.now() + 345600000).toISOString().split('T')[0],
          category: 'Documentation',
        },
        {
          title: 'Deploy to Cloud container and verify SSL/reverse proxy',
          description: 'Ensure port 3000 ingress and environment variable secrets are configured safely.',
          status: 'Pending',
          priority: 'Low',
          dueDate: new Date(Date.now() + 518400000).toISOString().split('T')[0],
          category: 'DevOps',
        },
      ];

      for (const t of sampleTasks) {
        await pool.execute(
          `INSERT INTO tasks (user_id, title, description, status, priority, due_date, category) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [userId, t.title, t.description, t.status, t.priority, t.dueDate, t.category]
        );
      }
      console.log(`[SEED] Seeded ${sampleTasks.length} tasks into MySQL.`);
    }
  } catch (err: any) {
    console.error('[SEED] Seeding error:', err.message);
  }
}
