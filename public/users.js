// Users management functionality
class UsersManager {
    constructor() {
        this.currentPage = 1;
        this.pageSize = 10;
        this.userDetailsModal = new bootstrap.Modal(document.getElementById('user-details-modal'));
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Search users
        const searchInput = document.getElementById('user-search');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce(() => {
                this.currentPage = 1;
                this.loadUsers();
            }, 300));
        }

        // Refresh users button
        const refreshButton = document.getElementById('refresh-users-btn');
        if (refreshButton) {
            refreshButton.addEventListener('click', () => this.loadUsers());
        }
    }

    async loadUsers(page = 1) {
        try {
            this.currentPage = page;
            const searchQuery = document.getElementById('user-search')?.value || '';
            const token = localStorage.getItem('token');
            
            if (!token) {
                showToast('error', 'Please login to continue');
                window.location.href = '/login.html';
                return;
            }
            
            const response = await fetch(`/api/admin/users?page=${page}&limit=${this.pageSize}&search=${encodeURIComponent(searchQuery)}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();

            if (data.success) {
                this.displayUsers(data.data);
                this.updatePagination(data.data.pagination);
            } else {
                showToast('error', data.message || 'Failed to load users');
            }
        } catch (error) {
            console.error('Load users error:', error);
            showToast('error', 'Failed to load users');
        }
    }

    displayUsers(data) {
        const tbody = document.getElementById('users-table-body');
        if (!tbody) return;

        tbody.innerHTML = data.users.map(user => `
            <tr>
                <td>${this.escapeHtml(user.username)}</td>
                <td>${this.escapeHtml(user.email)}</td>
                <td>${this.escapeHtml(user.first_name)} ${this.escapeHtml(user.last_name)}</td>
                <td>
                    <span class="badge ${user.user_type === 'staff' ? 'bg-primary' : 'bg-secondary'}">
                        ${this.escapeHtml(user.user_type)}
                    </span>
                </td>
                <td>${new Date(user.date_joined).toLocaleDateString()}</td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="usersManager.viewUserDetails(${user.user_id})">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm ${user.is_active ? 'btn-danger' : 'btn-success'}" 
                            onclick="usersManager.toggleUserStatus(${user.user_id}, ${!user.is_active})">
                        <i class="fas fa-${user.is_active ? 'ban' : 'check'}"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    updatePagination(pagination) {
        const container = document.getElementById('users-pagination');
        if (!container) return;

        const pages = [];
        const currentPage = pagination.currentPage;
        const totalPages = pagination.totalPages;

        // Previous button
        if (currentPage > 1) {
            pages.push(`<button class="btn btn-sm btn-outline" onclick="usersManager.loadUsers(${currentPage - 1})">Previous</button>`);
        }

        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
                pages.push(`
                    <button class="btn btn-sm ${i === currentPage ? 'btn-primary' : 'btn-outline'}" 
                            onclick="usersManager.loadUsers(${i})">${i}</button>
                `);
            } else if (i === currentPage - 3 || i === currentPage + 3) {
                pages.push('<span class="pagination-ellipsis">...</span>');
            }
        }

        // Next button
        if (currentPage < totalPages) {
            pages.push(`<button class="btn btn-sm btn-outline" onclick="usersManager.loadUsers(${currentPage + 1})">Next</button>`);
        }

        container.innerHTML = pages.join('');
    }

    async viewUserDetails(userId) {
        try {
            const response = await fetch(`/api/admin/users/${userId}`);
            const data = await response.json();

            if (data.success) {
                this.displayUserDetails(data.data);
                this.userDetailsModal.show();
            } else {
                showToast('error', data.message || 'Failed to load user details');
            }
        } catch (error) {
            console.error('View user details error:', error);
            showToast('error', 'Failed to load user details');
        }
    }

    displayUserDetails(data) {
        const user = data.user;
        
        // Update personal information
        document.getElementById('detail-username').textContent = user.username;
        document.getElementById('detail-fullname').textContent = `${user.first_name} ${user.last_name}`;
        document.getElementById('detail-email').textContent = user.email;
        document.getElementById('detail-usertype').textContent = user.user_type;
        document.getElementById('detail-joindate').textContent = new Date(user.date_joined).toLocaleDateString();
        document.getElementById('detail-status').innerHTML = `
            <span class="badge ${user.is_active ? 'bg-success' : 'bg-danger'}">
                ${user.is_active ? 'Active' : 'Inactive'}
            </span>
        `;

        // Update checkout history
        const checkoutsTable = document.getElementById('user-checkouts');
        if (checkoutsTable && data.checkouts) {
            checkoutsTable.innerHTML = data.checkouts.map(checkout => `
                <tr>
                    <td>${this.escapeHtml(checkout.book_title)}</td>
                    <td>${new Date(checkout.checkout_date).toLocaleDateString()}</td>
                    <td>${new Date(checkout.due_date).toLocaleDateString()}</td>
                    <td>${checkout.return_date ? new Date(checkout.return_date).toLocaleDateString() : '-'}</td>
                    <td>
                        <span class="badge ${this.getCheckoutStatusClass(checkout)}">
                            ${this.getCheckoutStatusText(checkout)}
                        </span>
                    </td>
                </tr>
            `).join('');
        }

        // Update checkout pagination if needed
        if (data.pagination) {
            this.updateCheckoutPagination(data.pagination);
        }
    }

    getCheckoutStatusClass(checkout) {
        if (checkout.return_date) return 'bg-success';
        if (new Date(checkout.due_date) < new Date()) return 'bg-danger';
        return 'bg-primary';
    }

    getCheckoutStatusText(checkout) {
        if (checkout.return_date) return 'Returned';
        if (new Date(checkout.due_date) < new Date()) return 'Overdue';
        return 'Active';
    }

    updateCheckoutPagination(pagination) {
        const container = document.getElementById('checkout-pagination');
        if (!container) return;

        // Similar pagination logic as updatePagination but for checkouts
        // ... (implement if needed)
    }

    async toggleUserStatus(userId, newStatus) {
        try {
            const response = await fetch(`/api/admin/users/${userId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ isActive: newStatus })
            });

            const data = await response.json();

            if (data.success) {
                showToast('success', data.message || 'User status updated successfully');
                this.loadUsers(this.currentPage);
            } else {
                showToast('error', data.message || 'Failed to update user status');
            }
        } catch (error) {
            console.error('Toggle user status error:', error);
            showToast('error', 'Failed to update user status');
        }
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the users manager
const usersManager = new UsersManager();

// Load users when the users tab is shown
document.addEventListener('DOMContentLoaded', () => {
    const usersTab = document.querySelector('button[data-tab="users"]');
    if (usersTab) {
        usersTab.addEventListener('click', () => usersManager.loadUsers());
    }
});
