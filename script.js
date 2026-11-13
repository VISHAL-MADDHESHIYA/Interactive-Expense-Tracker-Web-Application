

(() => {
  'use strict';

  /* ==========================================================================
     1. CONFIGURATION & CONSTANTS
     ========================================================================== */
  const STORAGE_KEY = 'spendwise_expenses_v1';

  const CATEGORY_META = {
    'Food & Dining':       { className: 'cat-food',          color: '#f97316' },
    'Transportation':      { className: 'cat-transport',     color: '#3b82f6' },
    'Housing & Utilities': { className: 'cat-housing',       color: '#8b5cf6' },
    'Shopping':            { className: 'cat-shopping',      color: '#ec4899' },
    'Entertainment':       { className: 'cat-entertainment', color: '#eab308' },
    'Healthcare':          { className: 'cat-health',        color: '#10b981' },
    'Education':           { className: 'cat-education',     color: '#06b6d4' },
    'Other':               { className: 'cat-other',         color: '#64748b' }
  };

  /* ==========================================================================
     2. APPLICATION STATE (Single Source of Truth)
     ========================================================================== */
  const state = {
    expenses: [],
    editingId: null,
    filters: {
      search: '',
      category: 'all',
      startDate: '',
      endDate: '',
      sortBy: 'date-desc'
    }
  };

  /* ==========================================================================
     3. DOM ELEMENT REFERENCES
     ========================================================================== */
  const dom = {
    // Form Elements
    formCard:         document.getElementById('form-card'),
    formHeading:      document.getElementById('form-heading'),
    editModeBadge:    document.getElementById('edit-mode-badge'),
    form:             document.getElementById('expense-form'),
    descInput:        document.getElementById('expense-description'),
    amountInput:      document.getElementById('expense-amount'),
    categoryInput:    document.getElementById('expense-category'),
    dateInput:        document.getElementById('expense-date'),
    submitBtn:        document.getElementById('btn-submit'),
    cancelEditBtn:    document.getElementById('btn-cancel-edit'),

    // Validation Error Containers
    errorDesc:        document.getElementById('error-description'),
    errorAmount:      document.getElementById('error-amount'),
    errorCategory:    document.getElementById('error-category'),
    errorDate:        document.getElementById('error-date'),

    // Filter & Sort Controls
    filterSearch:     document.getElementById('filter-search'),
    filterCategory:   document.getElementById('filter-category'),
    filterStartDate:  document.getElementById('filter-start-date'),
    filterEndDate:    document.getElementById('filter-end-date'),
    sortBy:           document.getElementById('sort-by'),
    resetFiltersBtn:  document.getElementById('btn-reset-filters'),

    // Summary Elements
    totalAmount:      document.getElementById('summary-total-amount'),
    periodLabel:      document.getElementById('summary-period-label'),
    totalCount:       document.getElementById('summary-total-count'),
    averageAmount:    document.getElementById('summary-average-amount'),
    highestAmount:    document.getElementById('summary-highest-amount'),
    highestCategory:  document.getElementById('summary-highest-category'),
    topCategoryBadge: document.getElementById('top-category-badge'),
    progressBar:      document.getElementById('category-progress-bar'),
    categoryLegend:   document.getElementById('category-legend'),

    // Listing & Global Actions
    expenseList:      document.getElementById('expense-list'),
    emptyState:       document.getElementById('empty-state'),
    emptyStateTitle:  document.getElementById('empty-state-title'),
    emptyStateMsg:    document.getElementById('empty-state-message'),
    listFooter:       document.getElementById('list-footer'),
    showingCountText: document.getElementById('showing-count-text'),
    clearAllBtn:      document.getElementById('btn-clear-all'),
    seedDataBtn:      document.getElementById('btn-seed-data'),
    exportCsvBtn:     document.getElementById('btn-export-csv'),
    toastContainer:   document.getElementById('toast-container')
  };

  /* ==========================================================================
     4. UTILITY & FORMATTING FUNCTIONS
     ========================================================================== */
  const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  const formatCurrency = (value) => currencyFormatter.format(Number(value) || 0);

  /**
   * Formats a YYYY-MM-DD date string into a readable local date (e.g., "Oct 24, 2025")
   * Appends T00:00:00 to avoid UTC timezone off-by-one-day shift.
   */
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(`${dateString}T00:00:00`);
    if (Number.isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };

  const getTodayISO = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `exp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  };

  const escapeHTML = (str) => {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  };

  const showToast = (message, type = 'success') => {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    dom.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 200ms ease';
      setTimeout(() => toast.remove(), 200);
    }, 3000);
  };

  /* ==========================================================================
     5. LOCALSTORAGE PERSISTENCE LAYER
     ========================================================================== */
  const loadFromStorage = () => {
    try {
      const rawData = localStorage.getItem(STORAGE_KEY);
      if (!rawData) return [];
      const parsed = JSON.parse(rawData);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('Failed to read expenses from LocalStorage:', error);
      return [];
    }
  };

  const saveToStorage = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.expenses));
    } catch (error) {
      console.error('Failed to save expenses to LocalStorage:', error);
      showToast('Storage quota exceeded or disabled.', 'danger');
    }
  };

  /* ==========================================================================
     6. FORM VALIDATION LOGIC
     ========================================================================== */
  const clearValidationErrors = () => {
    const inputs = [dom.descInput, dom.amountInput, dom.categoryInput, dom.dateInput];
    const errors = [dom.errorDesc, dom.errorAmount, dom.errorCategory, dom.errorDate];

    inputs.forEach((input) => input.classList.remove('input-error'));
    errors.forEach((err) => { err.textContent = ''; });
  };

  const setFieldError = (inputEl, errorEl, message) => {
    inputEl.classList.add('input-error');
    errorEl.textContent = message;
  };

  const validateForm = () => {
    clearValidationErrors();
    let isValid = true;

    const description = dom.descInput.value.trim();
    const amountRaw = dom.amountInput.value.trim();
    const amount = parseFloat(amountRaw);
    const category = dom.categoryInput.value;
    const date = dom.dateInput.value;

    if (!description) {
      setFieldError(dom.descInput, dom.errorDesc, 'Please enter a description.');
      isValid = false;
    } else if (description.length < 2) {
      setFieldError(dom.descInput, dom.errorDesc, 'Description must be at least 2 characters.');
      isValid = false;
    }

    if (!amountRaw || Number.isNaN(amount)) {
      setFieldError(dom.amountInput, dom.errorAmount, 'Please enter a valid numeric amount.');
      isValid = false;
    } else if (amount <= 0) {
      setFieldError(dom.amountInput, dom.errorAmount, 'Amount must be greater than $0.00.');
      isValid = false;
    } else if (amount > 1000000) {
      setFieldError(dom.amountInput, dom.errorAmount, 'Amount cannot exceed $1,000,000.00.');
      isValid = false;
    }

    if (!category || !CATEGORY_META[category]) {
      setFieldError(dom.categoryInput, dom.errorCategory, 'Please select a valid category.');
      isValid = false;
    }

    if (!date) {
      setFieldError(dom.dateInput, dom.errorDate, 'Please select a transaction date.');
      isValid = false;
    }

    return {
      isValid,
      data: isValid
        ? {
            description,
            amount: Math.round(amount * 100) / 100,
            category,
            date
          }
        : null
    };
  };

  /* ==========================================================================
     7. CRUD OPERATIONS (ADD, EDIT, DELETE)
     ========================================================================== */
  const handleFormSubmit = (event) => {
    event.preventDefault();
    const { isValid, data } = validateForm();
    if (!isValid) return;

    if (state.editingId) {
      // Update Existing Expense
      state.expenses = state.expenses.map((expense) =>
        expense.id === state.editingId
          ? { ...expense, ...data, updatedAt: Date.now() }
          : expense
      );
      showToast('Expense updated successfully!', 'info');
      exitEditMode();
    } else {
      // Create New Expense
      const newExpense = {
        id: generateId(),
        ...data,
        createdAt: Date.now()
      };
      state.expenses.unshift(newExpense);
      showToast('Expense added successfully!', 'success');
      resetFormFields();
    }

    saveToStorage();
    renderApp();
  };

  const startEditExpense = (id) => {
    const target = state.expenses.find((exp) => exp.id === id);
    if (!target) return;

    state.editingId = id;
    clearValidationErrors();

    // Populate Form Fields
    dom.descInput.value = target.description;
    dom.amountInput.value = target.amount.toFixed(2);
    dom.categoryInput.value = target.category;
    dom.dateInput.value = target.date;

    // Update Form UI State
    dom.formCard.classList.add('editing-active');
    dom.formHeading.textContent = 'Edit Expense';
    dom.editModeBadge.classList.remove('hidden');
    dom.submitBtn.textContent = 'Update Expense';
    dom.cancelEditBtn.classList.remove('hidden');

    // Smooth scroll form into view on smaller screens
    dom.formCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    dom.descInput.focus();

    renderExpenseList(getFilteredAndSortedExpenses());
  };

  const exitEditMode = () => {
    state.editingId = null;
    dom.formCard.classList.remove('editing-active');
    dom.formHeading.textContent = 'Add New Expense';
    dom.editModeBadge.classList.add('hidden');
    dom.submitBtn.textContent = 'Add Expense';
    dom.cancelEditBtn.classList.add('hidden');
    resetFormFields();
    renderExpenseList(getFilteredAndSortedExpenses());
  };

  const resetFormFields = () => {
    dom.form.reset();
    dom.dateInput.value = getTodayISO();
    clearValidationErrors();
  };

  const deleteExpense = (id, rowElement) => {
    if (state.editingId === id) {
      exitEditMode();
    }

    // Play slide-out animation before mutating state
    if (rowElement) {
      rowElement.classList.add('removing');
    }

    setTimeout(() => {
      state.expenses = state.expenses.filter((exp) => exp.id !== id);
      saveToStorage();
      renderApp();
      showToast('Expense deleted.', 'danger');
    }, 200);
  };

  /* ==========================================================================
     8. FILTERING, SORTING & AGGREGATION (Array Methods)
     ========================================================================== */
  const getFilteredAndSortedExpenses = () => {
    const { search, category, startDate, endDate, sortBy } = state.filters;
    const normalizedSearch = search.trim().toLowerCase();

    // 1. Filter using Array.prototype.filter()
    const filtered = state.expenses.filter((expense) => {
      const matchesSearch =
        !normalizedSearch ||
        expense.description.toLowerCase().includes(normalizedSearch) ||
        expense.category.toLowerCase().includes(normalizedSearch);

      const matchesCategory =
        category === 'all' || expense.category === category;

      const matchesStartDate =
        !startDate || expense.date >= startDate;

      const matchesEndDate =
        !endDate || expense.date <= endDate;

      return (
        matchesSearch &&
        matchesCategory &&
        matchesStartDate &&
        matchesEndDate
      );
    });

    // 2. Sort using Array.prototype.sort()
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'date-asc':
          return a.date.localeCompare(b.date) || (a.createdAt - b.createdAt);
        case 'amount-desc':
          return b.amount - a.amount;
        case 'amount-asc':
          return a.amount - b.amount;
        case 'date-desc':
        default:
          return b.date.localeCompare(a.date) || (b.createdAt - a.createdAt);
      }
    });
  };

  /* ==========================================================================
     9. UI RENDERING FUNCTIONS
     ========================================================================== */
  const renderSummaryMetrics = (filteredExpenses) => {
    const count = filteredExpenses.length;

    // Calculate Total Spending via Array.prototype.reduce()
    const total = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const average = count > 0 ? total / count : 0;

    // Find Highest Single Expense
    const highestExpense = filteredExpenses.reduce(
      (max, exp) => (exp.amount > max.amount ? exp : max),
      { amount: 0, description: '', category: '' }
    );

    // Update Summary Card DOM
    dom.totalAmount.textContent = formatCurrency(total);
    dom.totalCount.textContent = String(count);
    dom.averageAmount.textContent = `Avg: ${formatCurrency(average)} / expense`;
    dom.highestAmount.textContent = formatCurrency(highestExpense.amount);
    dom.highestCategory.textContent =
      count > 0
        ? `${highestExpense.description} (${highestExpense.category})`
        : 'No matching records';

    // Update Active Filter Period Subtext
    const { startDate, endDate, category } = state.filters;
    if (startDate && endDate) {
      dom.periodLabel.textContent = `${formatDate(startDate)} – ${formatDate(endDate)}`;
    } else if (startDate) {
      dom.periodLabel.textContent = `From ${formatDate(startDate)}`;
    } else if (endDate) {
      dom.periodLabel.textContent = `Up to ${formatDate(endDate)}`;
    } else if (category !== 'all') {
      dom.periodLabel.textContent = `Category: ${category}`;
    } else {
      dom.periodLabel.textContent = 'All-time recorded expenses';
    }

    // Render Category Distribution Bar & Legend
    renderCategoryBreakdown(filteredExpenses, total);
  };

  const renderCategoryBreakdown = (filteredExpenses, totalAmount) => {
    if (filteredExpenses.length === 0 || totalAmount <= 0) {
      dom.topCategoryBadge.textContent = 'Top: None';
      dom.progressBar.innerHTML = '';
      dom.categoryLegend.innerHTML =
        '<span class="legend-empty">Add expenses to view category distribution</span>';
      return;
    }

    // Group totals by category using .reduce()
    const categoryTotals = filteredExpenses.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
      return acc;
    }, {});

    // Convert to sorted array descending by amount
    const sortedCategories = Object.entries(categoryTotals)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: (amount / totalAmount) * 100,
        color: CATEGORY_META[category]?.color || '#64748b'
      }))
      .sort((a, b) => b.amount - a.amount);

    const topCat = sortedCategories[0];
    dom.topCategoryBadge.textContent = `Top: ${topCat.category} (${Math.round(topCat.percentage)}%)`;

    // Build Progress Bar Segments
    dom.progressBar.innerHTML = sortedCategories
      .map(
        (item) => `
        <div
          class="progress-segment"
          style="width: ${item.percentage.toFixed(2)}%; background-color: ${item.color};"
          title="${escapeHTML(item.category)}: ${formatCurrency(item.amount)} (${item.percentage.toFixed(1)}%)"
        ></div>`
      )
      .join('');

    // Build Top 3 Legend Items
    dom.categoryLegend.innerHTML = sortedCategories
      .slice(0, 3)
      .map(
        (item) => `
        <span class="legend-item">
          <span class="legend-dot" style="background-color: ${item.color};"></span>
          ${escapeHTML(item.category)} (${Math.round(item.percentage)}%)
        </span>`
      )
      .join('');
  };

  const renderExpenseList = (filteredExpenses) => {
    const totalStored = state.expenses.length;
    const filteredCount = filteredExpenses.length;

    // Handle Empty States
    if (filteredCount === 0) {
      dom.expenseList.innerHTML = '';
      dom.emptyState.classList.remove('hidden');

      if (totalStored === 0) {
        dom.emptyStateTitle.textContent = 'No expenses recorded yet';
        dom.emptyStateMsg.textContent =
          'Use the form on the left to log your first expense, or click "Load Demo Data" in the top bar to explore.';
        dom.listFooter.classList.add('hidden');
      } else {
        dom.emptyStateTitle.textContent = 'No matching expenses found';
        dom.emptyStateMsg.textContent =
          'Try adjusting your category, search keyword, or date range filters.';
        dom.listFooter.classList.remove('hidden');
        dom.showingCountText.textContent = `Showing 0 of ${totalStored} total expenses`;
      }
      return;
    }

    dom.emptyState.classList.add('hidden');
    dom.listFooter.classList.remove('hidden');
    dom.showingCountText.textContent = `Showing ${filteredCount} of ${totalStored} expense${totalStored === 1 ? '' : 's'}`;

    // Map expenses to DOM HTML strings via Array.prototype.map()
    dom.expenseList.innerHTML = filteredExpenses
      .map((expense) => {
        const meta = CATEGORY_META[expense.category] || CATEGORY_META['Other'];
        const isEditing = state.editingId === expense.id;

        return `
          <li class="expense-item ${isEditing ? 'item-editing' : ''}" data-id="${escapeHTML(expense.id)}">
            <div class="expense-desc">${escapeHTML(expense.description)}</div>
            <div class="expense-cat-col">
              <span class="category-badge ${meta.className}">
                ${escapeHTML(expense.category)}
              </span>
            </div>
            <div class="expense-date">${formatDate(expense.date)}</div>
            <div class="expense-amount">${formatCurrency(expense.amount)}</div>
            <div class="expense-actions">
              <button
                type="button"
                class="action-btn edit-btn"
                data-action="edit"
                aria-label="Edit ${escapeHTML(expense.description)}"
                title="Edit Expense"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 20h9"></path>
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                </svg>
              </button>
              <button
                type="button"
                class="action-btn delete-btn"
                data-action="delete"
                aria-label="Delete ${escapeHTML(expense.description)}"
                title="Delete Expense"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          </li>
        `;
      })
      .join('');
  };

  const renderApp = () => {
    const processedExpenses = getFilteredAndSortedExpenses();
    renderSummaryMetrics(processedExpenses);
    renderExpenseList(processedExpenses);
  };

  /* ==========================================================================
     10. BONUS FEATURES: DEMO DATA SEEDING & CSV EXPORT
     ========================================================================== */
  const loadDemoData = () => {
    const today = new Date();
    const daysAgo = (n) => {
      const d = new Date(today);
      d.setDate(d.getDate() - n);
      return d.toISOString().split('T')[0];
    };

    const sampleExpenses = [
      { id: generateId(), description: 'Monthly Apartment Rent & Utilities', amount: 1250.00, category: 'Housing & Utilities', date: daysAgo(12), createdAt: Date.now() - 600000 },
      { id: generateId(), description: 'Whole Foods Market Groceries', amount: 142.85, category: 'Food & Dining', date: daysAgo(9), createdAt: Date.now() - 500000 },
      { id: generateId(), description: 'Monthly Metro Transit Pass', amount: 85.00, category: 'Transportation', date: daysAgo(7), createdAt: Date.now() - 400000 },
      { id: generateId(), description: 'Cloud Computing & Frontend Course', amount: 49.99, category: 'Education', date: daysAgo(5), createdAt: Date.now() - 300000 },
      { id: generateId(), description: 'Dental Checkup & Cleaning', amount: 110.00, category: 'Healthcare', date: daysAgo(3), createdAt: Date.now() - 200000 },
      { id: generateId(), description: 'Wireless Mechanical Keyboard', amount: 129.50, category: 'Shopping', date: daysAgo(2), createdAt: Date.now() - 100000 },
      { id: generateId(), description: 'IMAX Movie Night & Snacks', amount: 44.20, category: 'Entertainment', date: daysAgo(1), createdAt: Date.now() - 50000 },
      { id: generateId(), description: 'Specialty Coffee & Pastry', amount: 14.75, category: 'Food & Dining', date: daysAgo(0), createdAt: Date.now() }
    ];

    state.expenses = [...sampleExpenses, ...state.expenses];
    saveToStorage();
    renderApp();
    showToast('Loaded 8 sample expenses!', 'info');
  };

  const exportToCSV = () => {
    const records = getFilteredAndSortedExpenses();
    if (records.length === 0) {
      showToast('No records available to export.', 'danger');
      return;
    }

    const headers = ['Date', 'Description', 'Category', 'Amount (USD)'];
    const rows = records.map((exp) => [
      exp.date,
      `"${exp.description.replace(/"/g, '""')}"`,
      `"${exp.category}"`,
      exp.amount.toFixed(2)
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `spendwise_expenses_${getTodayISO()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();

    showToast('CSV exported successfully!', 'success');
  };

  /* ==========================================================================
     11. EVENT LISTENERS & DELEGATION
     ========================================================================== */
  const bindEvents = () => {
    // Form Submission & Cancel Edit
    dom.form.addEventListener('submit', handleFormSubmit);
    dom.cancelEditBtn.addEventListener('click', exitEditMode);

    // Clear individual field error on input
    [dom.descInput, dom.amountInput, dom.categoryInput, dom.dateInput].forEach((input) => {
      input.addEventListener('input', () => {
        input.classList.remove('input-error');
      });
    });

    // Event Delegation for Edit and Delete Buttons in Expense List
    dom.expenseList.addEventListener('click', (event) => {
      const actionBtn = event.target.closest('button[data-action]');
      if (!actionBtn) return;

      const listItem = actionBtn.closest('.expense-item');
      if (!listItem) return;

      const expenseId = listItem.dataset.id;
      const action = actionBtn.dataset.action;

      if (action === 'edit') {
        startEditExpense(expenseId);
      } else if (action === 'delete') {
        deleteExpense(expenseId, listItem);
      }
    });

    // Real-time Filter & Sort Listeners
    dom.filterSearch.addEventListener('input', (e) => {
      state.filters.search = e.target.value;
      renderApp();
    });

    dom.filterCategory.addEventListener('change', (e) => {
      state.filters.category = e.target.value;
      renderApp();
    });

    dom.filterStartDate.addEventListener('change', (e) => {
      state.filters.startDate = e.target.value;
      renderApp();
    });

    dom.filterEndDate.addEventListener('change', (e) => {
      state.filters.endDate = e.target.value;
      renderApp();
    });

    dom.sortBy.addEventListener('change', (e) => {
      state.filters.sortBy = e.target.value;
      renderApp();
    });

    // Reset Filters
    dom.resetFiltersBtn.addEventListener('click', () => {
      state.filters = {
        search: '',
        category: 'all',
        startDate: '',
        endDate: '',
        sortBy: 'date-desc'
      };
      dom.filterSearch.value = '';
      dom.filterCategory.value = 'all';
      dom.filterStartDate.value = '';
      dom.filterEndDate.value = '';
      dom.sortBy.value = 'date-desc';
      renderApp();
      showToast('Filters reset.', 'info');
    });

    // Header & Footer Utility Buttons
    dom.seedDataBtn.addEventListener('click', loadDemoData);
    dom.exportCsvBtn.addEventListener('click', exportToCSV);

    dom.clearAllBtn.addEventListener('click', () => {
      if (state.expenses.length === 0) return;
      const confirmed = window.confirm(
        'Are you sure you want to permanently delete all recorded expenses?'
      );
      if (confirmed) {
        if (state.editingId) exitEditMode();
        state.expenses = [];
        saveToStorage();
        renderApp();
        showToast('All expenses cleared.', 'danger');
      }
    });
  };

  /* ==========================================================================
     12. APPLICATION INITIALIZATION
     ========================================================================== */
  const init = () => {
    state.expenses = loadFromStorage();
    dom.dateInput.value = getTodayISO();
    bindEvents();
    renderApp();
  };

  document.addEventListener('DOMContentLoaded', init);
})();