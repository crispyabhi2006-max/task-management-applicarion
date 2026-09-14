import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Plus,
  Filter,
  Calendar,
  Tag,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Eye,
  LayoutGrid,
  List as ListIcon,
  RotateCcw,
  Loader2,
  Clock,
} from 'lucide-react';
import { Task, TaskFilterParams, Pagination } from '../types.ts';
import { taskService } from '../services/api.ts';
import { subscribeToTaskEvents } from '../services/socket.ts';
import { StatusBadge } from '../components/StatusBadge.tsx';
import { PriorityBadge } from '../components/PriorityBadge.tsx';
import { TaskModal } from '../components/TaskModal.tsx';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal.tsx';
import { useToast } from '../context/ToastContext.tsx';

export const TasksPage: React.FC = () => {
  const { success, error: toastError } = useToast();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });

  const [filters, setFilters] = useState<TaskFilterParams>({
    search: '',
    status: '',
    priority: '',
    category: '',
    dueDate: '',
    sort: 'newest',
    page: 1,
    limit: 10,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Modal States
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [selectedTaskForDetails, setSelectedTaskForDetails] = useState<Task | null>(null);

  // Fetch tasks
  const loadTasks = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await taskService.getTasks(filters);
      if (res.success && res.data) {
        setTasks(res.data.tasks);
        setPagination(res.data.pagination);
      }
    } catch (err: any) {
      toastError(err.response?.data?.message || 'Failed to fetch tasks');
    } finally {
      setIsLoading(false);
    }
  }, [filters, toastError]);

  // Load categories
  const loadCategories = useCallback(async () => {
    try {
      const res = await taskService.getCategories();
      if (res.success && res.data) {
        setCategories(res.data);
      }
    } catch (err) {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // Subscribe to real-time events via Socket.IO
  useEffect(() => {
    const unsubscribe = subscribeToTaskEvents({
      onTaskCreated: () => {
        loadTasks();
        loadCategories();
      },
      onTaskUpdated: () => {
        loadTasks();
      },
      onTaskDeleted: () => {
        loadTasks();
        loadCategories();
      },
      onTaskStatusChanged: () => {
        loadTasks();
      },
    });

    return () => {
      unsubscribe();
    };
  }, [loadTasks, loadCategories]);

  // Handlers
  const handleSearchChange = (val: string) => {
    setFilters((prev) => ({ ...prev, search: val, page: 1 }));
  };

  const handleFilterChange = (key: keyof TaskFilterParams, val: any) => {
    setFilters((prev) => ({ ...prev, [key]: val, page: 1 }));
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      status: '',
      priority: '',
      category: '',
      dueDate: '',
      sort: 'newest',
      page: 1,
      limit: 10,
    });
  };

  const handleQuickStatus = async (taskId: number, newStatus: string) => {
    try {
      const res = await taskService.updateStatus(taskId, newStatus);
      if (res.success) {
        success(`Status updated to ${newStatus}`);
        loadTasks();
      }
    } catch (err: any) {
      toastError(err.response?.data?.message || 'Failed to update status');
    }
  };

  const openCreateModal = () => {
    setEditingTask(null);
    setIsTaskModalOpen(true);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  const openDeleteModal = (task: Task) => {
    setDeletingTask(task);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingTask) return;
    setIsDeleting(true);
    try {
      const res = await taskService.deleteTask(deletingTask.id);
      if (res.success) {
        success('Task deleted successfully');
        setIsDeleteModalOpen(false);
        setDeletingTask(null);
        loadTasks();
      }
    } catch (err: any) {
      toastError(err.response?.data?.message || 'Failed to delete task');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & New Task Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Task Management</h2>
          <p className="text-xs text-slate-500 mt-1">
            Search, filter, categorize, and prioritize tasks persisted in MySQL.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="bg-white border border-slate-200 rounded-lg p-1 flex items-center shadow-2xs">
            <button
              id="view-mode-table-btn"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                viewMode === 'table' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Table View"
            >
              <ListIcon className="w-4 h-4" />
            </button>
            <button
              id="view-mode-grid-btn"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                viewMode === 'grid' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          <button
            id="tasks-create-task-btn"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Task</span>
          </button>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="md:col-span-5 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              id="task-search-input"
              type="text"
              value={filters.search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search by title, description, or category..."
              className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Status Filter */}
          <div className="md:col-span-2">
            <select
              id="filter-status-select"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div className="md:col-span-2">
            <select
              id="filter-priority-select"
              value={filters.priority}
              onChange={(e) => handleFilterChange('priority', e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="">All Priorities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* Sort Option */}
          <div className="md:col-span-3">
            <select
              id="filter-sort-select"
              value={filters.sort}
              onChange={(e) => handleFilterChange('sort', e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="newest">Sort: Newest First</option>
              <option value="oldest">Sort: Oldest First</option>
              <option value="due_date">Sort: Due Date (Earliest)</option>
              <option value="priority">Sort: Priority (High to Low)</option>
              <option value="title">Sort: Title (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Secondary Filter Row: Category, Due Date preset, and Reset */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-slate-600">
              <Tag className="w-3.5 h-3.5" />
              <select
                id="filter-category-select"
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="bg-transparent border-0 font-medium text-slate-700 focus:ring-0 cursor-pointer"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-slate-600">
              <Calendar className="w-3.5 h-3.5" />
              <select
                id="filter-duedate-select"
                value={filters.dueDate}
                onChange={(e) => handleFilterChange('dueDate', e.target.value)}
                className="bg-transparent border-0 font-medium text-slate-700 focus:ring-0 cursor-pointer"
              >
                <option value="">Any Due Date</option>
                <option value="today">Due Today</option>
                <option value="upcoming">Upcoming</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>

          <button
            id="reset-filters-btn"
            type="button"
            onClick={resetFilters}
            className="text-slate-500 hover:text-slate-800 flex items-center gap-1.5 py-1 px-2 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset filters</span>
          </button>
        </div>
      </div>

      {/* Task Content: Table or Grid */}
      {isLoading ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200 text-center flex items-center justify-center gap-2 text-slate-500 text-sm">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
          <span>Loading tasks from MySQL...</span>
        </div>
      ) : tasks.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200 text-center">
          <Filter className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">No tasks found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {filters.search || filters.status || filters.priority || filters.category || filters.dueDate
              ? 'No tasks match your current filter parameters. Try clearing some filters.'
              : 'You have not created any tasks yet. Create one to get started!'}
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            {(filters.search || filters.status || filters.priority || filters.category || filters.dueDate) && (
              <button
                onClick={resetFilters}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Clear Filters
              </button>
            )}
            <button
              onClick={openCreateModal}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer"
            >
              + Create Task
            </button>
          </div>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Title & Details</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tasks.map((task) => (
                  <tr
                    key={task.id}
                    id={`task-row-${task.id}`}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    {/* Title */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-semibold text-slate-900 text-sm">{task.title}</div>
                      {task.description && (
                        <p className="text-slate-500 text-[11px] truncate mt-0.5 max-w-sm">
                          {task.description}
                        </p>
                      )}
                    </td>

                    {/* Status with Quick Toggle */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={task.status} size="sm" />
                        <select
                          id={`table-quick-status-${task.id}`}
                          value={task.status}
                          onChange={(e) => handleQuickStatus(task.id, e.target.value)}
                          className="text-[11px] bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-slate-600 focus:outline-none cursor-pointer"
                          aria-label="Change status"
                        >
                          <option value="Pending">Pending</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Completed">Completed</option>
                        </select>
                      </div>
                    </td>

                    {/* Priority */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <PriorityBadge priority={task.priority} size="sm" />
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {task.category ? (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-medium text-[11px]">
                          {task.category}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">Unassigned</span>
                      )}
                    </td>

                    {/* Due Date */}
                    <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px] text-slate-600">
                      {task.due_date ? (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {task.due_date}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">None</span>
                      )}
                    </td>

                    {/* Action buttons */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          id={`view-task-btn-${task.id}`}
                          onClick={() => setSelectedTaskForDetails(task)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          id={`edit-task-btn-${task.id}`}
                          onClick={() => openEditModal(task)}
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors cursor-pointer"
                          title="Edit Task"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          id={`delete-task-btn-${task.id}`}
                          onClick={() => openDeleteModal(task)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                          title="Delete Task"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map((task) => (
            <div
              key={task.id}
              id={`task-card-${task.id}`}
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <StatusBadge status={task.status} size="sm" />
                  <PriorityBadge priority={task.priority} size="sm" />
                </div>

                <h3 className="font-semibold text-slate-900 text-sm line-clamp-1">{task.title}</h3>
                {task.description && (
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {task.description}
                  </p>
                )}

                <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  {task.category && (
                    <span className="px-2 py-0.5 bg-slate-100 rounded-md text-[11px] font-medium text-slate-700">
                      {task.category}
                    </span>
                  )}
                  {task.due_date && (
                    <span className="flex items-center gap-1 font-mono text-[11px]">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {task.due_date}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions on Card */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <select
                  value={task.status}
                  onChange={(e) => handleQuickStatus(task.id, e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setSelectedTaskForDetails(task)}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors cursor-pointer"
                    title="View"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => openEditModal(task)}
                    className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors cursor-pointer"
                    title="Edit"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => openDeleteModal(task)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Footer */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
        <div>
          Showing{' '}
          <span className="font-semibold text-slate-900">
            {tasks.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0}
          </span>{' '}
          to{' '}
          <span className="font-semibold text-slate-900">
            {Math.min(pagination.page * pagination.limit, pagination.total)}
          </span>{' '}
          of <span className="font-semibold text-slate-900">{pagination.total}</span> tasks
        </div>

        <div className="flex items-center gap-2">
          {/* Items per page */}
          <div className="flex items-center gap-1.5 mr-2">
            <span>Per page:</span>
            <select
              id="pagination-limit-select"
              value={filters.limit}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, limit: Number(e.target.value), page: 1 }))
              }
              className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
          </div>

          <button
            id="pagination-prev-btn"
            onClick={() => setFilters((prev) => ({ ...prev, page: Math.max(1, (prev.page || 1) - 1) }))}
            disabled={pagination.page <= 1}
            className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-2 font-medium">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            id="pagination-next-btn"
            onClick={() =>
              setFilters((prev) => ({
                ...prev,
                page: Math.min(pagination.totalPages, (prev.page || 1) + 1),
              }))
            }
            disabled={pagination.page >= pagination.totalPages}
            className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
            aria-label="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Create / Edit Task Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSuccess={() => {
          loadTasks();
          loadCategories();
        }}
        taskToEdit={editingTask}
        existingCategories={categories}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        taskTitle={deletingTask?.title || ''}
        isDeleting={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => {
          setIsDeleteModalOpen(false);
          setDeletingTask(null);
        }}
      />

      {/* View Task Details Modal */}
      {selectedTaskForDetails && (
        <div
          id="task-details-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
        >
          <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 p-6 animate-in zoom-in-95">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{selectedTaskForDetails.title}</h3>
                <span className="text-xs text-slate-400 font-mono">Task ID: #{selectedTaskForDetails.id}</span>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={selectedTaskForDetails.status} />
                <PriorityBadge priority={selectedTaskForDetails.priority} />
              </div>
            </div>

            <div className="space-y-3 py-2 text-xs">
              <div>
                <span className="font-semibold text-slate-700 block mb-1">Description:</span>
                <div className="p-3 bg-slate-50 rounded-lg text-slate-700 whitespace-pre-wrap leading-relaxed border border-slate-100">
                  {selectedTaskForDetails.description || 'No description provided.'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-500 block">Category</span>
                  <span className="font-semibold text-slate-800">
                    {selectedTaskForDetails.category || 'General / None'}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-500 block">Due Date</span>
                  <span className="font-semibold text-slate-800 font-mono">
                    {selectedTaskForDetails.due_date || 'No due date'}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-500 block">Created At</span>
                  <span className="font-semibold text-slate-800 font-mono">
                    {new Date(selectedTaskForDetails.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-500 block">Updated At</span>
                  <span className="font-semibold text-slate-800 font-mono">
                    {new Date(selectedTaskForDetails.updated_at).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const task = selectedTaskForDetails;
                    setSelectedTaskForDetails(null);
                    openEditModal(task);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors cursor-pointer"
                >
                  Edit Task
                </button>
                <button
                  onClick={() => {
                    const task = selectedTaskForDetails;
                    setSelectedTaskForDetails(null);
                    openDeleteModal(task);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                >
                  Delete Task
                </button>
              </div>

              <button
                id="close-details-modal-btn"
                onClick={() => setSelectedTaskForDetails(null)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
