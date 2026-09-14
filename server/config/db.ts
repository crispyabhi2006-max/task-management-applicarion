import mysql, { Pool, PoolOptions } from 'mysql2/promise';
import dotenv from 'dotenv';
import { exec } from 'child_process';

dotenv.config();

// Ensure local MariaDB/MySQL service is running if in Linux container environment
export function ensureDatabaseServiceRunning(): Promise<void> {
  return new Promise((resolve) => {
    // Only attempt system service command on Linux platforms
    if (process.platform !== 'linux') {
      return resolve();
    }
    exec('service mariadb status || service mariadb start', (err, stdout) => {
      if (err) {
        console.log('[DB-INIT] Service check:', stdout || err.message);
      }
      resolve();
    });
  });
}

const poolConfig: PoolOptions = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '',
  database: process.env.DB_NAME || 'task_management',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
  timezone: '+00:00',
};

let pool: Pool;

export function getPool(): Pool {
  if (!pool) {
    pool = mysql.createPool(poolConfig);
  }
  return pool;
}

/**
 * Checks connectivity and verifies existing MySQL tables without recreating them
 */
export async function initDatabase(): Promise<{ success: boolean; message: string }> {
  try {
    await ensureDatabaseServiceRunning();

    const currentPool = getPool();

    // 1. Verify connection to MySQL
    const [ping] = await currentPool.query<any[]>('SELECT 1 + 1 AS test_connection');
    if (!ping || ping.length === 0) {
      throw new Error('Could not execute ping query on MySQL database.');
    }

    // 2. Check if existing tables are already present
    const [existingTasks] = await currentPool.query<any[]>("SHOW TABLES LIKE 'tasks'");
    const [existingUsers] = await currentPool.query<any[]>("SHOW TABLES LIKE 'users'");

    if (existingTasks && existingTasks.length > 0 && existingUsers && existingUsers.length > 0) {
      console.log('[DB-INIT] Connected to existing MySQL tables (users, tasks) successfully.');
      return { success: true, message: 'Existing MySQL database tables detected and verified' };
    }

    // 3. If tables are missing on a fresh installation, create them safely
    console.log('[DB-INIT] Tables not detected. Initializing schema...');

    await currentPool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await currentPool.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status ENUM('Pending', 'In Progress', 'Completed') DEFAULT 'Pending',
        priority ENUM('Low', 'Medium', 'High') DEFAULT 'Medium',
        due_date DATE NULL,
        category VARCHAR(100) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_tasks_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Safe index creation
    const [indexes] = await currentPool.query<any[]>(
      `SHOW INDEX FROM tasks WHERE Key_name = 'idx_tasks_user_id'`
    );
    if (!indexes || indexes.length === 0) {
      await currentPool.query(`CREATE INDEX idx_users_email ON users(email)`);
      await currentPool.query(`CREATE INDEX idx_tasks_user_id ON tasks(user_id)`);
      await currentPool.query(`CREATE INDEX idx_tasks_status ON tasks(status)`);
      await currentPool.query(`CREATE INDEX idx_tasks_priority ON tasks(priority)`);
      await currentPool.query(`CREATE INDEX idx_tasks_due_date ON tasks(due_date)`);
    }

    console.log('[DB-INIT] MySQL database and tables successfully initialized.');
    return { success: true, message: 'MySQL database initialized' };
  } catch (err: any) {
    console.error('[DB-INIT] MySQL initialization error:', err.message);
    return { success: false, message: err.message };
  }
}

export default getPool;
