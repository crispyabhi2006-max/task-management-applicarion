import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  Loader2,
  AlertTriangle,
  AlertCircle,
  Plus,
  ArrowRight,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { Task, TaskStats } from '../types.ts';
import { taskService } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { subscribeToTaskEvents } from '../services/socket.ts';
import { StatusBadge } from '../components/StatusBadge.tsx';
import { PriorityBadge } from '../components/PriorityBadge.tsx';
import { TaskModal } from '../components/TaskModal.tsx';
import { useToast } from '../context/ToastContext.tsx';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { success } = useToast();

  const [stats, setStats] = useState<TaskStats>({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    highPriority: 0,
    overdue: 0,
    priorityBreakdown: [],
    categoryBreakdown: [],
  });

  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      const [statsRes, tasksRes, catRes] = await Promise.all([
        taskService.getStats(),
        taskService.getTasks({ limit: 5, sort: 'newest' }),
        taskService.getCategories(),
      ]);

      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }
      if (tasksRes.success && tasksRes.data) {
        setRecentTasks(tasksRes.data.tasks);
      }
      if (catRes.success && catRes.data) {
        setCategories(catRes.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();

    // Subscribe to real-time events via Socket.IO
    const unsubscribe = subscribeToTaskEvents({
      onTaskCreated: () => {
        fetchDashboardData();
      },
      onTaskUpdated: () => {
        fetchDashboardData();
      },
      onTaskDeleted: () => {
        fetchDashboardData();
      },
      onTaskStatusChanged: () => {
        fetchDashboardData();
      },
    });

    return () => {
      unsubscribe();
    };
  }, [fetchDashboardData]);

  const handleQuickStatusChange = async (taskId: number, newStatus: string) => {
    try {
      const res = await taskService.updateStatus(taskId, newStatus);
      if (res.success) {
        success(`Status updated to ${newStatus}`);
        fetchDashboardData();
      }
    } catch (e) {
      // Toast handles error in response interceptor
    }
  };

  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Welcome back, {user?.name || 'Intern'}!
            </h2>
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Real-time task monitoring powered by Express & MySQL database.
          </p>
        </div>

        <button
          id="dashboard-new-task-btn"
          onClick={() => setIsTaskModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition-colors shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Task</span>
        </button>
      </div>

      {/* 6 Key Performance Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Tasks */}
        <div id="stat-total-tasks" className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</span>
            <TrendingUp className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{stats.total}</p>
          <span className="text-[11px] text-slate-400">All registered tasks</span>
        </div>

        {/* Pending Tasks */}
        <div id="stat-pending-tasks" className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Pending</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{stats.pending}</p>
          <span className="text-[11px] text-slate-400">Awaiting start</span>
        </div>

        {/* In Progress */}
        <div id="stat-inprogress-tasks" className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-sky-600 uppercase tracking-wider">Active</span>
            <Loader2 className="w-4 h-4 text-sky-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{stats.inProgress}</p>
          <span className="text-[11px] text-slate-400">In progress</span>
        </div>

        {/* Completed */}
        <div id="stat-completed-tasks" className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Done</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{stats.completed}</p>
          <span className="text-[11px] text-slate-400">Finished tasks</span>
        </div>

        {/* High Priority */}
        <div id="stat-highpriority-tasks" className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-600 uppercase tracking-wider">High</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{stats.highPriority}</p>
          <span className="text-[11px] text-slate-400">High priority</span>
        </div>

        {/* Overdue */}
        <div id="stat-overdue-tasks" className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-red-700 uppercase tracking-wider">Overdue</span>
            <AlertCircle className="w-4 h-4 text-red-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-red-600">{stats.overdue}</p>
          <span className="text-[11px] text-slate-400">Past due date</span>
        </div>
      </div>

      {/* Progress & Category Distribution Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Completion Progress Card */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-900">Task Completion Rate</h3>
              <span className="text-sm font-extrabold text-indigo-600">{completionRate}%</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Calculated dynamically in MySQL database
            </p>

            {/* Progress Track */}
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 transition-all duration-500 rounded-full"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-2 gap-2 text-center text-xs">
            <div className="p-2 bg-slate-50 rounded-lg">
              <span className="text-slate-500 block">Completed</span>
              <span className="font-bold text-slate-800 text-sm">{stats.completed}</span>
            </div>
            <div className="p-2 bg-slate-50 rounded-lg">
              <span className="text-slate-500 block">Remaining</span>
              <span className="font-bold text-slate-800 text-sm">
                {stats.total - stats.completed}
              </span>
            </div>
          </div>
        </div>

        {/* Priority Breakdown Card */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Priority Distribution</h3>
          <p className="text-xs text-slate-500 mb-4">Breakdown by urgency</p>
          <div className="space-y-3">
            {['High', 'Medium', 'Low'].map((p) => {
              const count = stats.priorityBreakdown?.find((item) => item.priority === p)?.count || 0;
              const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
              let barColor = 'bg-slate-400';
              if (p === 'High') barColor = 'bg-rose-500';
              if (p === 'Medium') barColor = 'bg-amber-500';
              if (p === 'Low') barColor = 'bg-emerald-500';

              return (
                <div key={p}>
                  <div className="flex justify-between text-xs font-medium mb-1">
                    <span className="text-slate-700">{p} Priority</span>
                    <span className="text-slate-500">{count} ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${barColor} transition-all duration-500`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Categories Breakdown */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Top Categories</h3>
          <p className="text-xs text-slate-500 mb-4">Active task categories</p>
          {stats.categoryBreakdown && stats.categoryBreakdown.length > 0 ? (
            <div className="space-y-2.5">
              {stats.categoryBreakdown.map((cat) => (
                <div key={cat.category} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 text-xs">
                  <span className="font-medium text-slate-800">{cat.category}</span>
                  <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 font-semibold">
                    {cat.count}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-slate-400">
              No categories assigned yet
            </div>
          )}
        </div>
      </div>

      {/* Recent Tasks List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Recent Tasks</h3>
            <span className="text-xs text-slate-500">Live synced from MySQL</span>
          </div>
          <Link
            to="/tasks"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading recent tasks...
          </div>
        ) : recentTasks.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-slate-600 font-medium">No tasks created yet</p>
            <p className="text-xs text-slate-400 mt-1">Get started by creating your first task above.</p>
            <button
              onClick={() => setIsTaskModalOpen(true)}
              className="mt-4 px-4 py-2 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
            >
              + Create Task
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentTasks.map((task) => (
              <div
                key={task.id}
                id={`dashboard-task-row-${task.id}`}
                className="p-4 sm:px-6 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-semibold text-sm text-slate-900">{task.title}</span>
                    <StatusBadge status={task.status} size="sm" />
                    <PriorityBadge priority={task.priority} size="sm" />
                    {task.category && (
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
                        {task.category}
                      </span>
                    )}
                  </div>
                  {task.description && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-1">{task.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {task.due_date && (
                    <span className="text-xs text-slate-500 flex items-center gap-1 font-mono">
                      <Clock className="w-3.5 h-3.5" />
                      {task.due_date}
                    </span>
                  )}
                  {/* Quick status dropdown */}
                  <select
                    id={`quick-status-${task.id}`}
                    value={task.status}
                    onChange={(e) => handleQuickStatusChange(task.id, e.target.value)}
                    className="text-xs bg-white border border-slate-200 rounded-md px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Task Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSuccess={() => fetchDashboardData()}
        existingCategories={categories}
      />
    </div>
  );
};
