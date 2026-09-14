import React, { useState, useEffect } from 'react';
import { X, Loader2, Calendar, Tag, AlertCircle } from 'lucide-react';
import { Task, TaskPriority, TaskStatus } from '../types.ts';
import { taskService } from '../services/api.ts';
import { useToast } from '../context/ToastContext.tsx';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (task: Task) => void;
  taskToEdit?: Task | null;
  existingCategories?: string[];
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  taskToEdit,
  existingCategories = [],
}) => {
  const { success, error: toastError } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('Pending');
  const [priority, setPriority] = useState<TaskPriority>('Medium');
  const [dueDate, setDueDate] = useState('');
  const [category, setCategory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title || '');
      setDescription(taskToEdit.description || '');
      setStatus(taskToEdit.status || 'Pending');
      setPriority(taskToEdit.priority || 'Medium');
      setDueDate(taskToEdit.due_date ? taskToEdit.due_date.split('T')[0] : '');
      setCategory(taskToEdit.category || '');
    } else {
      setTitle('');
      setDescription('');
      setStatus('Pending');
      setPriority('Medium');
      setDueDate('');
      setCategory('');
    }
    setErrors({});
  }, [taskToEdit, isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!title.trim()) {
      errs.title = 'Title is required';
    } else if (title.trim().length > 255) {
      errs.title = 'Title must be less than 255 characters';
    }

    if (category && category.length > 100) {
      errs.category = 'Category must be less than 100 characters';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        priority,
        dueDate: dueDate || null,
        category: category.trim() || null,
      };

      if (taskToEdit) {
        const res = await taskService.updateTask(taskToEdit.id, payload);
        if (res.success) {
          success('Task updated successfully');
          onSuccess(res.data);
          onClose();
        } else {
          toastError(res.message || 'Failed to update task');
        }
      } else {
        const res = await taskService.createTask(payload);
        if (res.success) {
          success('Task created successfully');
          onSuccess(res.data);
          onClose();
        } else {
          toastError(res.message || 'Failed to create task');
        }
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'An error occurred';
      toastError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const defaultSuggestedCategories = ['Work', 'Personal', 'Development', 'Design', 'Urgent', 'Study'];
  const allCategories = Array.from(new Set([...defaultSuggestedCategories, ...existingCategories]));

  return (
    <div
      id="task-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto"
    >
      <div
        id="task-modal-container"
        className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 my-8"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h2 id="task-modal-heading" className="text-lg font-semibold text-slate-900">
            {taskToEdit ? 'Edit Task' : 'Create New Task'}
          </h2>
          <button
            id="task-modal-close-btn"
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title Field */}
          <div>
            <label htmlFor="task-title-input" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Task Title <span className="text-rose-500">*</span>
            </label>
            <input
              id="task-title-input"
              type="text"
              required
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errors.title) setErrors((prev) => ({ ...prev, title: '' }));
              }}
              placeholder="e.g., Finalize API authentication endpoints"
              className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${
                errors.title ? 'border-rose-300 ring-1 ring-rose-300' : 'border-slate-300'
              }`}
            />
            {errors.title && (
              <p className="mt-1 text-xs text-rose-500 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {errors.title}
              </p>
            )}
          </div>

          {/* Description Field */}
          <div>
            <label htmlFor="task-desc-input" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Description
            </label>
            <textarea
              id="task-desc-input"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide context, acceptance criteria, or notes..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
            />
          </div>

          {/* Status & Priority Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="task-status-select" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Status
              </label>
              <select
                id="task-status-select"
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all cursor-pointer"
              >
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div>
              <label htmlFor="task-priority-select" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Priority
              </label>
              <select
                id="task-priority-select"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all cursor-pointer"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
          </div>

          {/* Due Date & Category Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="task-duedate-input" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                Due Date
              </label>
              <input
                id="task-duedate-input"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all cursor-pointer"
              />
            </div>

            <div>
              <label htmlFor="task-category-input" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-slate-500" />
                Category
              </label>
              <input
                id="task-category-input"
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g., Engineering, Marketing"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Suggested Category Chips */}
          <div>
            <span className="text-[11px] text-slate-500 font-medium block mb-1.5">Quick categories:</span>
            <div className="flex flex-wrap gap-1.5">
              {allCategories.slice(0, 6).map((cat) => (
                <button
                  type="button"
                  key={cat}
                  id={`cat-chip-${cat.toLowerCase()}`}
                  onClick={() => setCategory(cat)}
                  className={`px-2.5 py-1 text-xs rounded-md transition-colors cursor-pointer border ${
                    category === cat
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200 font-medium'
                      : 'bg-slate-100 text-slate-600 border-transparent hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              id="task-modal-cancel"
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="task-modal-submit"
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSubmitting ? (taskToEdit ? 'Updating...' : 'Creating...') : (taskToEdit ? 'Save Changes' : 'Create Task')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
