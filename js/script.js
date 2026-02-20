// Enhanced Todo Application with Modern Features
class TodoApp {
    constructor() {
        this.todos = [];
        this.currentStatusFilter = 'all';
        this.currentPriorityFilter = 'all';
        this.searchQuery = '';
        this.sortAscending = true;
        this.editingId = null;
        
        // Priority colors and labels
        this.priorityConfig = {
            low: { color: '#10b981', label: 'Low', icon: 'fa-flag', bg: 'rgba(16, 185, 129, 0.15)' },
            medium: { color: '#3b82f6', label: 'Medium', icon: 'fa-flag', bg: 'rgba(59, 130, 246, 0.15)' },
            high: { color: '#f59e0b', label: 'High', icon: 'fa-flag', bg: 'rgba(245, 158, 11, 0.15)' },
            urgent: { color: '#ef4444', label: 'Urgent', icon: 'fa-exclamation-triangle', bg: 'rgba(239, 68, 68, 0.15)' }
        };
        
        this.initElements();
        this.initEventListeners();
        this.loadFromStorage();
        this.render();
    }

    initElements() {
        // Form elements
        this.form = document.getElementById('todoForm');
        this.todoInput = document.getElementById('todoInput');
        this.dateInput = document.getElementById('dateInput');
        this.prioritySelect = document.getElementById('prioritySelect');
        this.addBtn = document.getElementById('addBtn');
        this.errorMessage = document.querySelector('.error-message');
        this.errorMessageSpan = this.errorMessage.querySelector('span');
        
        // Stats elements
        this.totalTasksEl = document.getElementById('totalTasks');
        this.completedTasksEl = document.getElementById('completedTasks');
        this.pendingTasksEl = document.getElementById('pendingTasks');
        this.tasksCountEl = document.getElementById('tasksCount');
        
        // Control elements
        this.searchInput = document.getElementById('searchInput');
        this.statusFilter = document.getElementById('statusFilter');
        this.priorityFilter = document.getElementById('priorityFilter');
        this.filterBtn = document.getElementById('filterBtn');
        this.sortBtn = document.getElementById('sortBtn');
        this.exportBtn = document.getElementById('exportBtn');
        this.clearCompletedBtn = document.getElementById('clearCompletedBtn');
        this.deleteAllBtn = document.getElementById('deleteAllBtn');
        
        // Container
        this.tasksContainer = document.getElementById('tasksContainer');
        
        // Modal elements
        this.modal = document.getElementById('confirmModal');
        this.modalMessage = document.getElementById('modalMessage');
        this.modalCancel = document.getElementById('modalCancel');
        this.modalConfirm = document.getElementById('modalConfirm');
        
        // Toast
        this.toast = document.getElementById('toast');
        this.toastMessage = this.toast.querySelector('.toast-message');
        
        // Current action for modal
        this.currentAction = null;
        this.currentId = null;
        
        // Set min date for date input to today
        if (this.dateInput) {
            const today = new Date().toISOString().split('T')[0];
            this.dateInput.min = today;
        }
    }

    initEventListeners() {
        // Form submission
        this.form.addEventListener('submit', (e) => this.handleAddTodo(e));
        
        // Input validation on blur
        this.todoInput.addEventListener('blur', () => this.validateField(this.todoInput));
        this.dateInput.addEventListener('blur', () => this.validateField(this.dateInput));
        
        // Search with debounce
        let searchTimeout;
        this.searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.searchQuery = e.target.value;
                this.render();
            }, 300);
        });
        
        // Filter and sort
        this.filterBtn.addEventListener('click', () => this.handleFilter());
        this.sortBtn.addEventListener('click', () => this.handleSort());
        this.exportBtn.addEventListener('click', () => this.handleExport());
        this.clearCompletedBtn.addEventListener('click', () => this.handleClearCompleted());
        this.deleteAllBtn.addEventListener('click', () => this.handleDeleteAll());
        
        // Modal events
        this.modalCancel.addEventListener('click', () => this.hideModal());
        this.modalConfirm.addEventListener('click', () => this.executeModalAction());
        
        // Click outside modal to close
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.hideModal();
        });
        
        // Real-time priority filter
        if (this.priorityFilter) {
            this.priorityFilter.addEventListener('change', () => this.handleFilter());
        }
        if (this.statusFilter) {
            this.statusFilter.addEventListener('change', () => this.handleFilter());
        }
    }

    validateField(field) {
        if (field === this.todoInput && !field.value.trim()) {
            this.showError('Task cannot be empty!');
            return false;
        }
        
        if (field === this.dateInput && !field.value) {
            this.showError('Please select a due date!');
            return false;
        }
        
        return true;
    }

    handleAddTodo(e) {
        e.preventDefault();
        
        const task = this.todoInput.value.trim();
        const dueDate = this.dateInput.value;
        const priority = this.prioritySelect ? this.prioritySelect.value : 'medium';

        if (!this.validateField(this.todoInput) || !this.validateField(this.dateInput)) {
            return;
        }

        // Format date for display
        const formattedDate = this.formatDateForDisplay(dueDate);

        if (this.editingId) {
            // Update existing todo
            const todo = this.todos.find(t => t.id === this.editingId);
            if (todo) {
                todo.task = task;
                todo.dueDate = formattedDate;
                todo.rawDate = dueDate;
                todo.priority = priority;
                todo.updatedAt = new Date().toISOString();
                this.showToast('Task updated successfully!', 'success');
                this.editingId = null;
                this.addBtn.innerHTML = '<i class="fas fa-plus"></i><span>Add Task</span>';
            }
        } else {
            // Add new todo
            const newTodo = {
                id: Date.now().toString(),
                task: task,
                dueDate: formattedDate,
                rawDate: dueDate,
                priority: priority,
                completed: false,
                createdAt: new Date().toISOString(),
            };

            this.todos.push(newTodo);
            this.showToast('Task added successfully!', 'success');
        }

        this.saveToStorage();
        this.render();
        
        // Clear form
        this.todoInput.value = '';
        this.dateInput.value = '';
        if (this.prioritySelect) this.prioritySelect.value = 'medium';
    }

    formatDateForDisplay(dateString) {
        const date = new Date(dateString);
        const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
        return date.toLocaleDateString('en-US', options).replace(/\//g, '/');
    }

    handleFilter() {
        this.currentStatusFilter = this.statusFilter ? this.statusFilter.value : 'all';
        this.currentPriorityFilter = this.priorityFilter ? this.priorityFilter.value : 'all';
        this.render();
        
        let filterMsg = 'Showing: ';
        if (this.currentStatusFilter !== 'all') filterMsg += `${this.currentStatusFilter} `;
        if (this.currentPriorityFilter !== 'all') filterMsg += `${this.currentPriorityFilter} priority `;
        if (this.currentStatusFilter === 'all' && this.currentPriorityFilter === 'all') filterMsg += 'all tasks';
        
        this.showToast(filterMsg, 'info');
    }

    handleSort() {
        this.sortAscending = !this.sortAscending;
        this.sortBtn.innerHTML = this.sortAscending ? 
            '<i class="fas fa-sort-amount-down"></i>' : 
            '<i class="fas fa-sort-amount-up"></i>';
        this.render();
        this.showToast(`Sorted by date ${this.sortAscending ? '(oldest first)' : '(newest first)'}`, 'info');
    }

    handleToggleComplete(id) {
        const todo = this.todos.find(t => t.id === id);
        if (todo) {
            todo.completed = !todo.completed;
            todo.completedAt = todo.completed ? new Date().toISOString() : null;
            this.saveToStorage();
            this.render();
            
            // Show motivational message for completed tasks
            if (todo.completed) {
                const messages = ['Great job! 🎉', 'Task completed!', 'Well done! 🌟', 'Another one down!'];
                const randomMsg = messages[Math.floor(Math.random() * messages.length)];
                this.showToast(randomMsg, 'success');
            } else {
                this.showToast('Task reopened', 'info');
            }
        }
    }

    handleEdit(id) {
        const todo = this.todos.find(t => t.id === id);
        if (todo) {
            this.todoInput.value = todo.task;
            // Convert display date back to input format
            if (todo.rawDate) {
                this.dateInput.value = todo.rawDate;
            } else {
                // Fallback for old tasks
                const [month, day, year] = todo.dueDate.split('/');
                this.dateInput.value = `${year}-${month}-${day}`;
            }
            if (this.prioritySelect) this.prioritySelect.value = todo.priority || 'medium';
            this.editingId = id;
            this.addBtn.innerHTML = '<i class="fas fa-save"></i><span>Update Task</span>';
            this.todoInput.focus();
            
            // Scroll to form
            this.form.scrollIntoView({ behavior: 'smooth' });
        }
    }

    handleDelete(id) {
        this.currentAction = 'delete';
        this.currentId = id;
        this.modalMessage.textContent = 'This task will be permanently removed.';
        this.showModal();
    }

    handleDeleteAll() {
        if (this.todos.length === 0) {
            this.showToast('No tasks to delete', 'warning');
            return;
        }
        
        this.currentAction = 'deleteAll';
        this.modalMessage.textContent = `All ${this.todos.length} tasks will be permanently removed.`;
        this.showModal();
    }

    handleClearCompleted() {
        const completedCount = this.todos.filter(t => t.completed).length;
        if (completedCount === 0) {
            this.showToast('No completed tasks to clear', 'warning');
            return;
        }
        
        this.currentAction = 'clearCompleted';
        this.modalMessage.textContent = `${completedCount} completed tasks will be removed.`;
        this.showModal();
    }

    handleExport() {
        if (this.todos.length === 0) {
            this.showToast('No tasks to export', 'warning');
            return;
        }

        const prioritySummary = {
            urgent: this.todos.filter(t => t.priority === 'urgent').length,
            high: this.todos.filter(t => t.priority === 'high').length,
            medium: this.todos.filter(t => t.priority === 'medium').length,
            low: this.todos.filter(t => t.priority === 'low').length
        };

        const data = {
            exportedAt: new Date().toISOString(),
            totalTasks: this.todos.length,
            completedTasks: this.todos.filter(t => t.completed).length,
            pendingTasks: this.todos.filter(t => !t.completed).length,
            prioritySummary: prioritySummary,
            tasks: this.todos
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tasks-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showToast('Tasks exported successfully!', 'success');
    }

    executeModalAction() {
        switch (this.currentAction) {
            case 'delete':
                const deletedTodo = this.todos.find(t => t.id === this.currentId);
                this.todos = this.todos.filter(t => t.id !== this.currentId);
                this.showToast(`Task "${deletedTodo?.task}" deleted`, 'success');
                break;
            case 'deleteAll':
                this.todos = [];
                this.showToast('All tasks deleted', 'success');
                break;
            case 'clearCompleted':
                this.todos = this.todos.filter(t => !t.completed);
                this.showToast('Completed tasks cleared', 'success');
                break;
        }
        
        this.saveToStorage();
        this.render();
        this.hideModal();
    }

    getFilteredAndSearchedTodos() {
        let filtered = [...this.todos];
        
        // Apply status filter
        switch (this.currentStatusFilter) {
            case 'pending':
                filtered = filtered.filter(t => !t.completed);
                break;
            case 'completed':
                filtered = filtered.filter(t => t.completed);
                break;
        }
        
        // Apply priority filter
        if (this.currentPriorityFilter !== 'all') {
            filtered = filtered.filter(t => t.priority === this.currentPriorityFilter);
        }
        
        // Apply search
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            filtered = filtered.filter(t => 
                t.task.toLowerCase().includes(query) || 
                t.dueDate.includes(query) ||
                (t.priority && t.priority.toLowerCase().includes(query))
            );
        }
        
        // Apply sort (by date)
        filtered.sort((a, b) => {
            const dateA = new Date(a.rawDate || this.convertToRawDate(a.dueDate));
            const dateB = new Date(b.rawDate || this.convertToRawDate(b.dueDate));
            return this.sortAscending ? dateA - dateB : dateB - dateA;
        });
        
        return filtered;
    }

    convertToRawDate(displayDate) {
        const [month, day, year] = displayDate.split('/');
        return `${year}-${month}-${day}`;
    }

    getPriorityInfo(priority) {
        return this.priorityConfig[priority] || this.priorityConfig.medium;
    }

    isOverdue(todo) {
        if (todo.completed) return false;
        const dueDate = new Date(todo.rawDate || this.convertToRawDate(todo.dueDate));
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return dueDate < today;
    }

    updateStats() {
        const total = this.todos.length;
        const completed = this.todos.filter(t => t.completed).length;
        const pending = total - completed;
        
        // Priority stats
        const urgentCount = this.todos.filter(t => t.priority === 'urgent' && !t.completed).length;
        
        if (this.totalTasksEl) this.totalTasksEl.textContent = total;
        if (this.completedTasksEl) this.completedTasksEl.textContent = completed;
        if (this.pendingTasksEl) this.pendingTasksEl.textContent = pending;
        if (this.tasksCountEl) this.tasksCountEl.textContent = `${total} ${total === 1 ? 'task' : 'tasks'}`;
        
        // Update document title with urgent count
        if (urgentCount > 0) {
            document.title = `(${urgentCount}) FlowTask - Urgent Tasks`;
        } else {
            document.title = 'FlowTask - Modern Todo App';
        }
    }

    render() {
        const filteredTodos = this.getFilteredAndSearchedTodos();
        this.updateStats();

        if (filteredTodos.length === 0) {
            let emptyMessage = 'No tasks found';
            let emptySubMessage = '';
            
            if (this.searchQuery) {
                emptySubMessage = 'Try different search terms';
            } else if (this.currentPriorityFilter !== 'all' || this.currentStatusFilter !== 'all') {
                emptySubMessage = 'Try changing your filters';
            } else {
                emptySubMessage = 'Add a new task to get started';
            }
            
            this.tasksContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-clipboard-list"></i>
                    <h3>${emptyMessage}</h3>
                    <p>${emptySubMessage}</p>
                </div>
            `;
            return;
        }

        this.tasksContainer.innerHTML = filteredTodos.map(todo => {
            const isOverdue = this.isOverdue(todo);
            const priorityInfo = this.getPriorityInfo(todo.priority);
            
            return `
                <div class="task-card ${todo.completed ? 'completed' : ''} ${isOverdue ? 'overdue' : ''}" 
                     data-id="${todo.id}">
                    <div class="task-checkbox ${todo.completed ? 'checked' : ''}" 
                         onclick="app.handleToggleComplete('${todo.id}')">
                        ${todo.completed ? '<i class="fas fa-check"></i>' : ''}
                    </div>
                    
                    <div class="task-content" onclick="app.handleToggleComplete('${todo.id}')">
                        <h4 class="task-title">${this.escapeHtml(todo.task)}</h4>
                        <div class="task-meta">
                            <span class="task-date">
                                <i class="far fa-calendar-alt"></i>
                                ${todo.dueDate}
                                ${isOverdue ? '<i class="fas fa-exclamation-circle" style="color: #ef4444; margin-left: 4px;" title="Overdue"></i>' : ''}
                            </span>
                            
                            <span class="priority-badge" style="background: ${priorityInfo.bg}; color: ${priorityInfo.color}">
                                <i class="fas ${priorityInfo.icon}"></i>
                                ${priorityInfo.label}
                            </span>
                            
                            <span class="task-badge ${todo.completed ? 'completed' : ''}">
                                ${todo.completed ? 'Completed' : 'Pending'}
                            </span>
                        </div>
                    </div>
                    
                    <div class="task-actions">
                        ${!todo.completed ? `
                            <button class="task-action-btn edit" onclick="app.handleEdit('${todo.id}')" title="Edit">
                                <i class="fas fa-pencil-alt"></i>
                            </button>
                        ` : ''}
                        <button class="task-action-btn" onclick="app.handleDelete('${todo.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showError(message) {
        if (this.errorMessageSpan) {
            this.errorMessageSpan.textContent = message;
        }
        if (this.errorMessage) {
            this.errorMessage.classList.add('show');
        }
        
        setTimeout(() => {
            if (this.errorMessage) {
                this.errorMessage.classList.remove('show');
            }
        }, 3000);
    }

    showToast(message, type = 'success') {
        if (this.toastMessage) {
            this.toastMessage.textContent = message;
        }
        if (this.toast) {
            this.toast.className = `toast ${type}`;
            this.toast.classList.add('show');
        }
        
        setTimeout(() => {
            if (this.toast) {
                this.toast.classList.remove('show');
            }
        }, 3000);
    }

    showModal() {
        if (this.modal) {
            this.modal.classList.add('show');
        }
    }

    hideModal() {
        if (this.modal) {
            this.modal.classList.remove('show');
        }
        this.currentAction = null;
        this.currentId = null;
    }

    saveToStorage() {
        localStorage.setItem('todos', JSON.stringify(this.todos));
    }

    loadFromStorage() {
        const saved = localStorage.getItem('todos');
        if (saved) {
            try {
                this.todos = JSON.parse(saved);
                // Migrate old tasks to have priority if they don't
                this.todos = this.todos.map(todo => ({
                    ...todo,
                    priority: todo.priority || 'medium',
                    rawDate: todo.rawDate || (todo.dueDate ? this.convertToRawDate(todo.dueDate) : null)
                }));
            } catch {
                this.todos = [];
            }
        }
    }
}

// Initialize app
const app = new TodoApp();
window.app = app;