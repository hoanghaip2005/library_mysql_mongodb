// Admin panel functionality
class AdminPanel {
    constructor() {
        this.currentTab = 'books';  // Default tab
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.currentUserFilters = {
            search: '',
            userType: '',
            status: 'all'
        };
        this.init();
    }

    init() {
        this.setupTabListeners();
        this.setupSearchListeners();
        this.setupFilterListeners();
        this.setupActionButtons();
        this.loadInitialData();
    }

    setupTabListeners() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tab = button.dataset.tab;
                this.switchTab(tab);
            });
        });
    }

    setupSearchListeners() {
        const searchInput = document.getElementById('user-search');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce(() => {
                this.currentPage = 1;
                this.loadCurrentTabData();
            }, 500));
        }
    }

    async switchTab(tab) {
        console.log('Switching to tab:', tab);
        
        // Update active tab button
        const tabButtons = document.querySelectorAll('.tab-btn');
        tabButtons.forEach(button => {
            button.classList.remove('active');
            if (button.dataset.tab === tab) {
                button.classList.add('active');
            }
        });

        // Hide all tab panels and show the selected one
        const panels = document.querySelectorAll('.tab-panel');
        panels.forEach(panel => {
            panel.classList.remove('active');
        });
        
        const targetPanel = document.getElementById(`${tab}-panel`);
        console.log('Target panel element:', targetPanel);
        if (targetPanel) {
            targetPanel.classList.add('active');
            console.log('Panel classes after adding active:', targetPanel.className);
        } else {
            console.error(`Panel ${tab}-panel not found!`);
        }

        this.currentTab = tab;
        this.currentPage = 1;
        
        // Add a small delay to ensure DOM is updated
        setTimeout(async () => {
            await this.loadCurrentTabData();
        }, 100);
    }

    async loadCurrentTabData() {
        switch (this.currentTab) {
            case 'users':
                await this.loadUsers();
                break;
            case 'books':
                await this.loadBooks();
                break;
            case 'authors':
                await this.loadAuthors();
                break;
            case 'reports':
                await this.loadReports();
                break;
            case 'analytics':
                await this.loadAnalytics();
                break;
        }
    }

    async loadUsers() {
        try {
            console.log('loadUsers called');
            
            const filters = {
                search: document.getElementById('user-search-filter')?.value?.trim() || '',
                userType: document.getElementById('user-type-filter')?.value || '',
                status: document.getElementById('user-status-filter')?.value || 'all'
            };

            const queryParams = new URLSearchParams();
            
            // Only add valid parameters
            if (this.currentPage) queryParams.append('page', this.currentPage.toString());
            if (this.itemsPerPage) queryParams.append('limit', this.itemsPerPage.toString());
            if (filters.search) queryParams.append('search', filters.search);
            if (filters.userType && ['reader', 'staff'].includes(filters.userType)) {
                queryParams.append('userType', filters.userType);
            }
            if (filters.status && ['active', 'inactive', 'all'].includes(filters.status)) {
                queryParams.append('status', filters.status);
            }

            // Show loading state
            const usersContent = document.getElementById('users-content');
            if (usersContent) {
                // Only show loading if the table doesn't exist yet
                const existingTable = usersContent.querySelector('.users-table-container');
                if (!existingTable) {
                    usersContent.innerHTML = `
                        <div class="loading">
                            <i class="fas fa-spinner fa-spin"></i>
                            Loading users...
                        </div>
                    `;
                } else {
                    // Show loading in the table area
                    const tbody = document.getElementById('users-table-body');
                    if (tbody) {
                        tbody.innerHTML = '<tr><td colspan="7" class="text-center"><i class="fas fa-spinner fa-spin"></i> Loading users...</td></tr>';
                    }
                }
            }

            const response = await this.makeApiCall(`/api/admin/users?${queryParams.toString()}`);
            
            if (response.success) {
                console.log('API response successful, calling displayUsers');
                this.displayUsers(response.data.users);
                this.updateUserStats(response.data.stats);
                this.updatePagination(response.data.pagination);
            } else {
                throw new Error(response.message);
            }
        } catch (error) {
            console.error('Load users error:', error);
            this.showError('Failed to load users');
        }
    }

    updateUserStats(stats) {
        if (stats) {
            const totalUsersEl = document.getElementById('total-users');
            const activeUsersEl = document.getElementById('active-users');
            const staffUsersEl = document.getElementById('staff-users');
            
            if (totalUsersEl) totalUsersEl.textContent = stats.total || '0';
            if (activeUsersEl) activeUsersEl.textContent = stats.active || '0';
            if (staffUsersEl) staffUsersEl.textContent = stats.staff || '0';
        }
    }

    displayUsers(users) {
        console.log('displayUsers called with:', users);
        
        // Ensure the HTML structure exists
        const usersContent = document.getElementById('users-content');
        if (!usersContent) {
            console.error('users-content element not found!');
            return;
        }

        // Check if table structure exists, if not create it
        let tbody = document.getElementById('users-table-body');
        if (!tbody) {
            console.log('Creating users table structure');
            usersContent.innerHTML = `
                <div class="user-stats">
                    <div class="stat-card">
                        <h4>Total Users</h4>
                        <span id="total-users">0</span>
                    </div>
                    <div class="stat-card">
                        <h4>Active Users</h4>
                        <span id="active-users">0</span>
                    </div>
                    <div class="stat-card">
                        <h4>Staff Members</h4>
                        <span id="staff-users">0</span>
                    </div>
                </div>
                <div class="users-table-container">
                    <table class="users-table table">
                        <thead>
                            <tr>
                                <th>Username</th>
                                <th>Email</th>
                                <th>Name</th>
                                <th>Account Type</th>
                                <th>Status</th>
                                <th>Join Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="users-table-body">
                            <!-- Users will be loaded here -->
                        </tbody>
                    </table>
                </div>
                <div id="pagination" class="pagination">
                    <!-- Pagination will be loaded here -->
                </div>
            `;
            tbody = document.getElementById('users-table-body');
        }

        console.log('users-table-body element:', tbody);
        
        if (!tbody) {
            console.error('users-table-body element still not found after creation!');
            return;
        }

        if (!users || users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No users found</td></tr>';
            return;
        }

        const html = users.map(user => `
            <tr>
                <td>${this.escapeHtml(user.username)}</td>
                <td>${this.escapeHtml(user.email)}</td>
                <td>${this.escapeHtml(user.first_name)} ${this.escapeHtml(user.last_name)}</td>
                <td><span class="badge ${user.user_type === 'staff' ? 'bg-primary' : 'bg-secondary'}">${this.escapeHtml(user.user_type)}</span></td>
                <td><span class="badge ${user.is_active ? 'bg-success' : 'bg-danger'}">${user.is_active ? 'Active' : 'Inactive'}</span></td>
                <td>${new Date(user.date_joined).toLocaleDateString()}</td>
                <td>
                    <button class="btn btn-sm btn-info view-user-btn" data-user-id="${user.user_id}">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-warning edit-user-btn" data-user-id="${user.user_id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm ${user.is_active ? 'btn-danger' : 'btn-success'} toggle-user-btn" data-user-id="${user.user_id}">
                        <i class="fas ${user.is_active ? 'fa-user-slash' : 'fa-user-check'}"></i>
                    </button>
                </td>
            </tr>
        `).join('');
        
        console.log('Setting tbody innerHTML with:', html);
        tbody.innerHTML = html;
        
        // Add event listeners for action buttons
        this.setupUserActionButtons();
    }

    async loadBooks() {
        try {
            const response = await this.makeApiCall(`/api/admin/books?page=${this.currentPage}&limit=${this.itemsPerPage}`);
            
            if (response.success) {
                this.displayBooks(response.data);
                this.updatePagination(response.pagination);
            } else {
                throw new Error(response.message);
            }
        } catch (error) {
            console.error('Load books error:', error);
            this.showError('Failed to load books');
        }
    }

    async loadReports() {
        try {
            const response = await this.makeApiCall('/api/reports/library-statistics');
            
            if (response.success) {
                this.displayReports(response.data);
            } else {
                throw new Error(response.message);
            }
        } catch (error) {
            console.error('Load reports error:', error);
            this.showError('Failed to load reports');
        }
    }


    displayBooks(books) {
        const container = document.getElementById('books-container');
        if (!container) return;

        container.innerHTML = '';
        books.forEach(book => {
            const bookElement = document.createElement('div');
            bookElement.className = 'book-item';
            bookElement.innerHTML = `
                <h3>${this.escapeHtml(book.title)}</h3>
                <p>Copies: ${book.available_copies}/${book.total_copies}</p>
                <button class="btn btn-primary btn-sm" onclick="adminPanel.editBook(${book.book_id})">
                    Edit
                </button>
            `;
            container.appendChild(bookElement);
        });
    }

    displayReports(data) {
        const container = document.getElementById('reports-container');
        if (!container) return;

        const {userStats, bookStats, checkoutStats, topReaders, topBooks} = data;

        container.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <h3>Users</h3>
                    <p>Total Users: ${userStats.total_users}</p>
                    <p>Readers: ${userStats.total_readers}</p>
                    <p>Staff: ${userStats.total_staff}</p>
                </div>
                <div class="stat-card">
                    <h3>Books</h3>
                    <p>Total Books: ${bookStats.total_books}</p>
                    <p>Total Copies: ${bookStats.total_copies}</p>
                    <p>Available: ${bookStats.available_copies}</p>
                </div>
                <div class="stat-card">
                    <h3>Checkouts</h3>
                    <p>Total: ${checkoutStats.total_checkouts}</p>
                    <p>Active: ${checkoutStats.active_checkouts}</p>
                    <p>Overdue: ${checkoutStats.overdue_checkouts}</p>
                </div>
            </div>

            <div class="top-lists">
                <div class="top-readers">
                    <h3>Top Readers</h3>
                    <ul>
                        ${topReaders.map(reader => `
                            <li>${this.escapeHtml(reader.first_name)} ${this.escapeHtml(reader.last_name)} - ${reader.total_checkouts} checkouts</li>
                        `).join('')}
                    </ul>
                </div>
                <div class="top-books">
                    <h3>Most Popular Books</h3>
                    <ul>
                        ${topBooks.map(book => `
                            <li>${this.escapeHtml(book.title)} - ${book.checkout_count} checkouts</li>
                        `).join('')}
                    </ul>
                </div>
            </div>
        `;
    }

    updatePagination(pagination) {
        const paginationEl = document.getElementById('pagination');
        if (!paginationEl) return;

        const totalPages = Math.ceil(pagination.total / pagination.limit);
        
        paginationEl.innerHTML = `
            <button class="btn btn-sm btn-secondary" 
                    onclick="adminPanel.changePage(${this.currentPage - 1})" 
                    ${this.currentPage === 1 ? 'disabled' : ''}>
                Previous
            </button>
            <span class="mx-3">
                Page ${this.currentPage} of ${totalPages}
            </span>
            <button class="btn btn-sm btn-secondary" 
                    onclick="adminPanel.changePage(${this.currentPage + 1})" 
                    ${this.currentPage === totalPages ? 'disabled' : ''}>
                Next
            </button>
        `;
    }

    async makeApiCall(endpoint, method = 'GET', body = null) {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(endpoint, options);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    }

    showError(message) {
        const alertContainer = document.getElementById('alert-container');
        if (!alertContainer) return;

        const alert = document.createElement('div');
        alert.className = 'alert alert-danger alert-dismissible fade show';
        alert.innerHTML = `
            ${this.escapeHtml(message)}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        alertContainer.appendChild(alert);
    }

    async viewUserDetails(userId) {
        console.log('viewUserDetails called with userId:', userId);
        try {
            const response = await this.makeApiCall(`/api/admin/users/${userId}`);
            if (response.success) {
                this.displayUserDetailsModal(response.data);
            }
        } catch (error) {
            console.error('View user details error:', error);
            this.showError('Failed to load user details');
        }
    }

    displayUserDetailsModal(data) {
        // Use vanilla JavaScript to show modal
        const modal = document.getElementById('user-details-modal');
        const modalContent = document.getElementById('user-details-content');
        
        modalContent.innerHTML = this.generateUserDetailsHtml(data);
        
        // Show modal using Bootstrap 4 classes
        modal.style.display = 'block';
        modal.classList.add('show');
        document.body.classList.add('modal-open');
        
        // Add backdrop
        const backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop fade show';
        backdrop.id = 'modal-backdrop';
        document.body.appendChild(backdrop);
        
        // Add close functionality
        this.setupModalCloseHandlers(modal, backdrop);
    }
    
    setupModalCloseHandlers(modal, backdrop) {
        // Close button handler
        const closeBtn = modal.querySelector('.user-details-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.closeModal(modal, backdrop);
            });
        }
        
        // Backdrop click handler
        if (backdrop) {
            backdrop.addEventListener('click', () => {
                this.closeModal(modal, backdrop);
            });
        }
        
        // Modal click handler (click outside content)
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal(modal, backdrop);
            }
        });
        
        // ESC key handler
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                this.closeModal(modal, backdrop);
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }
    
    closeModal(modal, backdrop) {
        modal.style.display = 'none';
        modal.classList.remove('show');
        document.body.classList.remove('modal-open');
        
        if (backdrop) {
            backdrop.remove();
        }
    }

    generateUserDetailsHtml(data) {
        const { user, checkouts } = data;
        const initials = `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase();
        const activeCheckouts = checkouts.filter(c => c.return_date === null).length;
        const returnedCheckouts = checkouts.filter(c => c.return_date !== null).length;
        
        return `
            <div class="user-details-header">
                <h3>User Details - ${user.first_name} ${user.last_name}</h3>
                <button class="user-details-close" onclick="this.closest('#user-details-modal').style.display='none'; document.getElementById('modal-backdrop')?.remove();">&times;</button>
            </div>
            
            <div class="user-details-body">
                <div class="user-info">
                    <div class="user-avatar">${initials}</div>
                    <div class="user-details-info">
                        <h4>${user.first_name} ${user.last_name}</h4>
                        <p><strong>Email:</strong> ${user.email}</p>
                        <p><strong>Username:</strong> ${user.username}</p>
                        <p><strong>Type:</strong> <span class="badge ${user.user_type === 'staff' ? 'bg-primary' : 'bg-secondary'}">${user.user_type}</span></p>
                        <p><strong>Status:</strong> <span class="badge ${user.is_active ? 'bg-success' : 'bg-danger'}">${user.is_active ? 'Active' : 'Inactive'}</span></p>
                        <p><strong>Joined:</strong> ${new Date(user.date_joined).toLocaleDateString()}</p>
                        ${user.phone ? `<p><strong>Phone:</strong> ${user.phone}</p>` : ''}
                        ${user.address ? `<p><strong>Address:</strong> ${user.address}</p>` : ''}
                    </div>
                </div>
                
                <div class="quick-stats">
                    <div class="stat-item">
                        <span class="stat-number">${checkouts.length}</span>
                        <span class="stat-label">Total Checkouts</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${activeCheckouts}</span>
                        <span class="stat-label">Active Checkouts</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${returnedCheckouts}</span>
                        <span class="stat-label">Returned</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">0</span>
                        <span class="stat-label">Overdue</span>
                    </div>
                </div>
                
                <div class="checkout-history">
                    <h4>Recent Checkouts</h4>
                    ${checkouts.length > 0 ? 
                        checkouts.map(checkout => `
                            <div class="checkout-item">
                                <h5>${checkout.book_title}</h5>
                                <div class="checkout-meta">
                                    <span><i class="fas fa-barcode"></i> ISBN: ${checkout.isbn}</span>
                                    <span><i class="fas fa-calendar-alt"></i> Checkout: ${new Date(checkout.checkout_date).toLocaleDateString()}</span>
                                    <span><i class="fas fa-calendar-check"></i> Due: ${new Date(checkout.due_date).toLocaleDateString()}</span>
                                    <span><i class="fas fa-info-circle"></i> Status: <span class="status-badge ${checkout.return_date ? 'status-returned' : 'status-active'}">${checkout.return_date ? 'Returned' : 'Active'}</span></span>
                                </div>
                            </div>
                        `).join('') : 
                        '<div class="no-data"><i class="fas fa-book-open"></i><p>No recent checkouts found</p></div>'
                    }
                </div>
            </div>
        `;
    }

    changePage(page) {
        this.currentPage = page;
        this.loadCurrentTabData();
    }

    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    debounce(func, wait) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    async loadAuthors() {
        try {
            const container = document.getElementById('authors-content');
            container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading authors...</div>';

            const response = await this.makeApiCall('/api/admin/authors');
            if (response.success) {
                this.displayAuthors(response.data.authors);
            } else {
                throw new Error(response.message);
            }
        } catch (error) {
            console.error('Load authors error:', error);
            this.showError('Failed to load authors');
        }
    }

    displayAuthors(authors) {
        const container = document.getElementById('authors-content');
        if (!container) return;

        // Handle case where authors is not an array
        if (!authors || !Array.isArray(authors) || authors.length === 0) {
            container.innerHTML = '<div class="no-data">No authors found</div>';
            return;
        }

        container.innerHTML = `
            <div class="table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Nationality</th>
                            <th>Birth Date</th>
                            <th>Books Count</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${authors.map(author => `
                            <tr>
                                <td>${author.first_name} ${author.last_name}</td>
                                <td>${author.nationality || '-'}</td>
                                <td>${author.birth_date ? new Date(author.birth_date).toLocaleDateString() : '-'}</td>
                                <td>${author.book_count || 0}</td>
                                <td>
                                    <button class="btn btn-sm btn-primary edit-author-btn" data-author-id="${author.author_id}">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn btn-sm btn-danger delete-author-btn" data-author-id="${author.author_id}">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        // Add event listeners for edit and delete buttons
        this.setupAuthorActionListeners();
    }

    setupAuthorActionListeners() {
        // Edit author buttons
        const editButtons = document.querySelectorAll('.edit-author-btn');
        editButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const authorId = e.target.closest('.edit-author-btn').getAttribute('data-author-id');
                this.editAuthor(authorId);
            });
        });

        // Delete author buttons
        const deleteButtons = document.querySelectorAll('.delete-author-btn');
        deleteButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const authorId = e.target.closest('.delete-author-btn').getAttribute('data-author-id');
                this.deleteAuthor(authorId);
            });
        });
    }

    async loadAnalytics() {
        try {
            // Map panel names to actual API endpoints
            const panelEndpoints = {
                'session-time': '/api/analytics/average-session-time',
                'highlights': '/api/analytics/most-highlighted-books',
                'reading-time': '/api/analytics/top-books-reading-time',
                'device-patterns': '/api/analytics/reading-patterns-by-device',
                'time-activity': '/api/analytics/reading-activity-by-time'
            };
            
            const panels = Object.keys(panelEndpoints);
            
            for (const panel of panels) {
                const container = document.getElementById(`${panel}-data`);
                if (container) {
                    container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading data...</div>';
                }
                
                const endpoint = panelEndpoints[panel];
                const response = await this.makeApiCall(endpoint);
                if (response.success) {
                    this.displayAnalyticsData(panel, response.data);
                } else {
                    console.error(`Failed to load ${panel} data:`, response.message);
                    if (container) {
                        container.innerHTML = '<div class="no-data">Failed to load data</div>';
                    }
                }
            }
        } catch (error) {
            console.error('Load analytics error:', error);
            this.showError('Failed to load analytics data');
        }
    }

    displayAnalyticsData(panel, data) {
        const container = document.getElementById(`${panel}-data`);
        if (!container) return;

        if (!data || Object.keys(data).length === 0) {
            container.innerHTML = '<div class="no-data">No data available</div>';
            return;
        }

        // Format and display data based on panel type
        switch (panel) {
            case 'session-time':
                container.innerHTML = this.formatSessionTimeData(data);
                break;
            case 'highlights':
                container.innerHTML = this.formatHighlightsData(data);
                break;
            case 'reading-time':
                container.innerHTML = this.formatReadingTimeData(data);
                break;
            case 'device-patterns':
                container.innerHTML = this.formatDevicePatternsData(data);
                break;
            case 'time-activity':
                container.innerHTML = this.formatTimeActivityData(data);
                break;
        }
    }

    formatSessionTimeData(data) {
        if (!Array.isArray(data) || data.length === 0) {
            return '<div class="no-data">No session time data available</div>';
        }
        
        return `<div class="analytics-list">
            ${data.map(user => `
                <div class="analytics-item">
                    <h4>User ID: ${user.user_id}</h4>
                    <p>Total Sessions: ${user.total_sessions}</p>
                    <p>Total Reading Time: ${user.total_reading_time_minutes} minutes</p>
                    <p>Average Session Time: ${user.average_session_time_minutes} minutes</p>
                    <p>Longest Session: ${user.longest_session_minutes} minutes</p>
                    <p>Shortest Session: ${user.shortest_session_minutes} minutes</p>
                </div>
            `).join('')}
        </div>`;
    }

    formatHighlightsData(data) {
        if (!Array.isArray(data) || data.length === 0) {
            return '<div class="no-data">No highlights data available</div>';
        }
        
        return `<div class="analytics-list">
            ${data.map(book => `
                <div class="analytics-item">
                    <h4>Book ID: ${book.book_id}</h4>
                    <p>Total Highlights: ${book.total_highlights}</p>
                    <p>Unique Users: ${book.unique_users_count}</p>
                    <p>Highlight Types: ${book.highlight_types ? book.highlight_types.join(', ') : 'N/A'}</p>
                </div>
            `).join('')}
        </div>`;
    }

    formatReadingTimeData(data) {
        if (!Array.isArray(data) || data.length === 0) {
            return '<div class="no-data">No reading time data available</div>';
        }
        
        return `<div class="analytics-list">
            ${data.map(book => `
                <div class="analytics-item">
                    <h4>Book ID: ${book.book_id}</h4>
                    <p>Total Reading Time: ${book.total_reading_time_hours} hours</p>
                    <p>Total Sessions: ${book.total_sessions}</p>
                    <p>Unique Readers: ${book.unique_readers_count}</p>
                    <p>Average Session Time: ${book.average_session_time_minutes} minutes</p>
                    <p>Total Pages Read: ${book.total_pages_read}</p>
                </div>
            `).join('')}
        </div>`;
    }

    formatDevicePatternsData(data) {
        if (!Array.isArray(data) || data.length === 0) {
            return '<div class="no-data">No device patterns data available</div>';
        }
        
        return `<div class="analytics-list">
            ${data.map(device => `
                <div class="analytics-item">
                    <h4>Device Type: ${device.device_type || 'Unknown'}</h4>
                    <p>Total Sessions: ${device.total_sessions}</p>
                    <p>Total Reading Time: ${device.total_reading_time_hours} hours</p>
                    <p>Average Session Time: ${device.average_session_time_minutes} minutes</p>
                    <p>Average Pages per Session: ${device.average_pages_per_session}</p>
                    <p>Total Highlights: ${device.total_highlights}</p>
                    <p>Unique Users: ${device.unique_users_count}</p>
                </div>
            `).join('')}
        </div>`;
    }

    formatTimeActivityData(data) {
        if (!Array.isArray(data) || data.length === 0) {
            return '<div class="no-data">No time activity data available</div>';
        }
        
        return `<div class="analytics-list">
            ${data.map(timeSlot => `
                <div class="analytics-item">
                    <h4>Hour: ${timeSlot.hour_of_day}:00</h4>
                    <p>Total Sessions: ${timeSlot.total_sessions}</p>
                    <p>Total Reading Time: ${timeSlot.total_reading_time_hours} hours</p>
                    <p>Average Session Time: ${timeSlot.average_session_time_minutes} minutes</p>
                    <p>Unique Users: ${timeSlot.unique_users_count}</p>
                </div>
            `).join('')}
        </div>`;
    }

    loadInitialData() {
        // Load the initial tab data
        this.loadCurrentTabData();
    }

    async applyUserFilters() {
        this.currentPage = 1;
        await this.loadUsers();
    }

    async editUser(userId) {
        console.log('editUser called with userId:', userId);
        try {
            // Get user data first
            const response = await this.makeApiCall(`/api/admin/users/${userId}`);
            if (response.success) {
                this.showEditUserModal(response.data.user);
            } else {
                this.showError('Failed to load user data');
            }
        } catch (error) {
            console.error('Edit user error:', error);
            this.showError('Failed to load user data');
        }
    }
    
    showEditUserModal(user) {
        const modal = document.getElementById('user-details-modal');
        const modalContent = document.getElementById('user-details-content');
        
        modalContent.innerHTML = this.generateEditUserHtml(user);
        
        // Show modal
        modal.style.display = 'block';
        modal.classList.add('show');
        document.body.classList.add('modal-open');
        
        // Add backdrop
        const backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop fade show';
        backdrop.id = 'modal-backdrop';
        document.body.appendChild(backdrop);
        
        // Add close functionality
        this.setupModalCloseHandlers(modal, backdrop);
        
        // Setup form submission
        this.setupEditFormHandlers(user.user_id);
    }
    
    generateEditUserHtml(user) {
        return `
            <div class="user-details-header">
                <h3>Edit User - ${user.first_name} ${user.last_name}</h3>
                <button class="user-details-close" onclick="this.closest('#user-details-modal').style.display='none'; document.getElementById('modal-backdrop')?.remove();">&times;</button>
            </div>
            
            <div class="user-details-body">
                <form id="edit-user-form" class="edit-user-form">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="edit-first-name">First Name *</label>
                            <input type="text" id="edit-first-name" value="${user.first_name}" required>
                        </div>
                        <div class="form-group">
                            <label for="edit-last-name">Last Name *</label>
                            <input type="text" id="edit-last-name" value="${user.last_name}" required>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="edit-email">Email *</label>
                            <input type="email" id="edit-email" value="${user.email}" required>
                        </div>
                        <div class="form-group">
                            <label for="edit-username">Username *</label>
                            <input type="text" id="edit-username" value="${user.username}" required>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="edit-user-type">User Type *</label>
                            <select id="edit-user-type" required>
                                <option value="member" ${user.user_type === 'member' ? 'selected' : ''}>Member</option>
                                <option value="staff" ${user.user_type === 'staff' ? 'selected' : ''}>Staff</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="edit-status">Status *</label>
                            <select id="edit-status" required>
                                <option value="true" ${user.is_active ? 'selected' : ''}>Active</option>
                                <option value="false" ${!user.is_active ? 'selected' : ''}>Inactive</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="edit-phone">Phone</label>
                            <input type="tel" id="edit-phone" value="${user.phone || ''}">
                        </div>
                        <div class="form-group">
                            <label for="edit-address">Address</label>
                            <input type="text" id="edit-address" value="${user.address || ''}">
                        </div>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" onclick="this.closest('#user-details-modal').style.display='none'; document.getElementById('modal-backdrop')?.remove();">Cancel</button>
                        <button type="submit" class="btn btn-primary">Save Changes</button>
                    </div>
                </form>
            </div>
        `;
    }
    
    setupEditFormHandlers(userId) {
        const form = document.getElementById('edit-user-form');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.submitEditUser(userId);
            });
        }
    }
    
    async submitEditUser(userId) {
        try {
            const formData = {
                first_name: document.getElementById('edit-first-name').value,
                last_name: document.getElementById('edit-last-name').value,
                email: document.getElementById('edit-email').value,
                username: document.getElementById('edit-username').value,
                user_type: document.getElementById('edit-user-type').value,
                is_active: document.getElementById('edit-status').value === 'true',
                phone: document.getElementById('edit-phone').value,
                address: document.getElementById('edit-address').value
            };
            
            const response = await this.makeApiCall(`/api/admin/users/${userId}`, 'PUT', formData);
            
            if (response.success) {
                this.showSuccess('User updated successfully!');
                this.closeModal(document.getElementById('user-details-modal'), document.getElementById('modal-backdrop'));
                this.loadUsers(); // Refresh user list
            } else {
                this.showError(response.message || 'Failed to update user');
            }
        } catch (error) {
            console.error('Submit edit user error:', error);
            this.showError('Failed to update user');
        }
    }

    async toggleUserStatus(userId) {
        console.log('toggleUserStatus called with userId:', userId);
        try {
            // First get current user status
            const response = await this.makeApiCall(`/api/admin/users/${userId}`);
            if (response.success) {
                const currentStatus = response.data.user.is_active;
                const newStatus = !currentStatus;
                
                const updateResponse = await this.makeApiCall(`/api/admin/users/${userId}/status`, 'PUT', {
                    isActive: newStatus
                });
                
                if (updateResponse.success) {
                    this.showSuccess(`User ${newStatus ? 'activated' : 'deactivated'} successfully`);
                    await this.loadUsers(); // Refresh the list
                } else {
                    this.showError(updateResponse.message);
                }
            }
        } catch (error) {
            console.error('Toggle user status error:', error);
            this.showError('Failed to update user status');
        }
    }

    setupUserActionButtons() {
        // Remove existing event listeners to avoid duplicates
        const existingListeners = document.querySelectorAll('.view-user-btn, .edit-user-btn, .toggle-user-btn');
        existingListeners.forEach(btn => {
            btn.replaceWith(btn.cloneNode(true));
        });

        // Add event listeners for view buttons
        document.querySelectorAll('.view-user-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const userId = e.target.closest('.view-user-btn').dataset.userId;
                console.log('View button clicked for user:', userId);
                this.viewUserDetails(parseInt(userId));
            });
        });

        // Add event listeners for edit buttons
        document.querySelectorAll('.edit-user-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const userId = e.target.closest('.edit-user-btn').dataset.userId;
                console.log('Edit button clicked for user:', userId);
                this.editUser(parseInt(userId));
            });
        });

        // Add event listeners for toggle buttons
        document.querySelectorAll('.toggle-user-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const userId = e.target.closest('.toggle-user-btn').dataset.userId;
                console.log('Toggle button clicked for user:', userId);
                this.toggleUserStatus(parseInt(userId));
            });
        });
    }

    showSuccess(message) {
        const alertContainer = document.getElementById('alert-container');
        if (!alertContainer) return;

        const alert = document.createElement('div');
        alert.className = 'alert alert-success alert-dismissible fade show';
        alert.innerHTML = `
            ${this.escapeHtml(message)}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        alertContainer.appendChild(alert);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (alert.parentNode) {
                alert.parentNode.removeChild(alert);
            }
        }, 5000);
    }

    showMessage(message, type = 'info') {
        const alertContainer = document.getElementById('alert-container');
        if (!alertContainer) return;

        const alertClass = type === 'success' ? 'alert-success' : 
                          type === 'error' ? 'alert-danger' : 
                          type === 'warning' ? 'alert-warning' : 'alert-info';

        const alert = document.createElement('div');
        alert.className = `alert ${alertClass} alert-dismissible fade show`;
        alert.innerHTML = `
            ${this.escapeHtml(message)}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        alertContainer.appendChild(alert);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (alert.parentNode) {
                alert.parentNode.removeChild(alert);
            }
        }, 5000);
    }
    // Edit an author
    async editAuthor(authorId) {
        console.log('Edit author called with ID:', authorId, 'Type:', typeof authorId);
        
        try {
            // Ensure authorId is a number
            const numericAuthorId = parseInt(authorId);
            if (isNaN(numericAuthorId)) {
                this.showMessage('Invalid author ID', 'error');
                return;
            }

            const response = await this.makeApiCall(`/api/admin/authors/${numericAuthorId}`, 'GET');
            
            if (response.success) {
                this.showEditAuthorModal(response.data);
            } else {
                this.showMessage(response.message || 'Failed to load author details', 'error');
            }
        } catch (error) {
            console.error('Edit author error:', error);
            this.showMessage('Failed to load author details', 'error');
        }
    }

    // Show edit author modal
    showEditAuthorModal(author) {
        const modal = document.getElementById('user-details-modal');
        const modalContent = modal.querySelector('.user-details-modal-content');
        
        modalContent.innerHTML = `
            <div class="user-details-header">
                <h3>Edit Author</h3>
                <button class="user-details-close" onclick="adminPanel.closeModal()">&times;</button>
            </div>
            <div class="user-details-body">
                <form id="edit-author-form" class="edit-user-form">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="edit-first-name">First Name</label>
                            <input type="text" id="edit-first-name" name="first_name" value="${author.first_name || ''}" required>
                        </div>
                        <div class="form-group">
                            <label for="edit-last-name">Last Name</label>
                            <input type="text" id="edit-last-name" name="last_name" value="${author.last_name || ''}" required>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="edit-birth-date">Birth Date</label>
                            <input type="date" id="edit-birth-date" name="birth_date" value="${author.birth_date ? author.birth_date.split('T')[0] : ''}">
                        </div>
                        <div class="form-group">
                            <label for="edit-nationality">Nationality</label>
                            <input type="text" id="edit-nationality" name="nationality" value="${author.nationality || ''}">
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="edit-biography">Biography</label>
                        <textarea id="edit-biography" name="biography" rows="4">${author.biography || ''}</textarea>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" onclick="adminPanel.closeModal()">Cancel</button>
                        <button type="submit" class="btn btn-primary">Update Author</button>
                    </div>
                </form>
            </div>
        `;
        
        modal.style.display = 'flex';
        document.body.classList.add('modal-open');
        
        // Setup form handler
        document.getElementById('edit-author-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitEditAuthor(author.author_id);
        });
    }

    // Submit edit author form
    async submitEditAuthor(authorId) {
        const form = document.getElementById('edit-author-form');
        const formData = new FormData(form);
        
        const authorData = {
            first_name: formData.get('first_name'),
            last_name: formData.get('last_name'),
            birth_date: formData.get('birth_date'),
            nationality: formData.get('nationality'),
            biography: formData.get('biography')
        };

        try {
            const response = await this.makeApiCall(`/api/admin/authors/${authorId}`, 'PUT', authorData);
            
            if (response.success) {
                this.showMessage('Author updated successfully', 'success');
                this.closeModal();
                this.loadAuthors(); // Refresh the authors list
            } else {
                this.showMessage(response.message || 'Failed to update author', 'error');
            }
        } catch (error) {
            console.error('Update author error:', error);
            this.showMessage('Failed to update author', 'error');
        }
    }

    // Close modal
    closeModal() {
        const modal = document.getElementById('user-details-modal');
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
    }

    // Delete an author
    async deleteAuthor(authorId) {
        console.log('Delete author called with ID:', authorId, 'Type:', typeof authorId);
        
        if (!confirm('Are you sure you want to delete this author? This action cannot be undone.')) {
            return;
        }

        try {
            // Ensure authorId is a number
            const numericAuthorId = parseInt(authorId);
            if (isNaN(numericAuthorId)) {
                this.showMessage('Invalid author ID', 'error');
                return;
            }

            const response = await this.makeApiCall(`/api/admin/authors/${numericAuthorId}`, 'DELETE');
            
            if (response.success) {
                this.showMessage('Author deleted successfully', 'success');
                this.loadAuthors(); // Refresh the authors list
            } else {
                this.showMessage(response.message || 'Failed to delete author', 'error');
            }
        } catch (error) {
            console.error('Delete author error:', error);
            this.showMessage('Failed to delete author', 'error');
        }
    }
}

// Initialize admin panel when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.adminPanel = new AdminPanel();
});
