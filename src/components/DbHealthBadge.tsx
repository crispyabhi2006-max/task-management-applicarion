import React, { useEffect, useState } from 'react';
import { Database, CheckCircle, AlertCircle } from 'lucide-react';
import { taskService } from '../services/api.ts';

export const DbHealthBadge: React.FC = () => {
  const [health, setHealth] = useState<{
    connected: boolean;
    engine: string;
    database: string;
    version?: string;
  } | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function checkDb() {
      try {
        const res = await taskService.checkHealth();
        if (isMounted) {
          if (res.success && res.database) {
            setHealth({
              connected: res.database.status === 'connected',
              engine: res.database.engine || 'MySQL',
              database: res.database.database || 'task_management',
              version: res.database.version,
            });
          } else {
            setHealth({
              connected: false,
              engine: 'MySQL',
              database: 'task_management',
            });
          }
        }
      } catch (e) {
        if (isMounted) {
          setHealth({
            connected: false,
            engine: 'MySQL',
            database: 'task_management',
          });
        }
      }
    }

    checkDb();
    const interval = setInterval(checkDb, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  if (!health) return null;

  return (
    <div
      id="db-health-indicator"
      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-medium border ${
        health.connected
          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
          : 'bg-rose-50 text-rose-800 border-rose-200'
      }`}
      title={
        health.connected
          ? `Live connection to MySQL database: ${health.database} (${health.version || 'v10.11'})`
          : 'Database disconnected'
      }
    >
      <Database className="w-3.5 h-3.5" />
      <span className="font-semibold uppercase tracking-wider">{health.engine}</span>
      <span className="text-[11px] opacity-80">({health.database})</span>
      {health.connected ? (
        <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
      ) : (
        <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
      )}
    </div>
  );
};
