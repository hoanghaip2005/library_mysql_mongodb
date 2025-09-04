// Smart Library Platform - Frontend JavaScript

class SmartLibraryApp {
    constructor() {
        this.currentUser = null;
        this.currentSection = 'home';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadInitialData();
        this.checkAuthStatus();
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = e.target.getAttribute('href').substring(1);
                this.showSection(section);
            });
        });

        // Mobile menu
        const hamburger = document.getElementById('hamburger');
        const navMenu = document.getElementById('nav-menu');
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });

        // Auth buttons
        document.getElementById('login-btn').addEventListener('click', () => this.showModal('login-modal'));
        document.getElementById('register-btn').addEventListener('click', () => this.showModal('register-modal'));
        document.getElementById('logout-btn').addEventListener('click', () => this.logout());

        // Forms
        document.getElementById('login-form').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('register-form').addEventListener('submit', (e) => this.handleRegister(e));

        // Search
        document.getElementById('search-btn').addEventListener('click', () => this.searchBooks());
        document.getElementById('search-query').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchBooks();
        });
        
        // Search suggestions
        document.getElementById('search-query').addEventListener('input', (e) => {
            this.handleSearchInput(e.target.value);
        });

        // Tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target));
        });

        // Analytics tabs
        document.querySelectorAll('.analytics-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchAnalyticsTab(e.target));
        });

        // Admin buttons
        document.getElementById('add-book-btn')?.addEventListener('click', () => this.showModal('add-book-modal'));
        document.getElementById('add-author-btn')?.addEventListener('click', () => this.showModal('add-author-modal'));
        document.getElementById('add-book-form')?.addEventListener('submit', (e) => this.handleAddBook(e));
        document.getElementById('add-author-form')?.addEventListener('submit', (e) => this.handleAddAuthor(e));
        document.getElementById('review-book-form')?.addEventListener('submit', (e) => this.handleReviewBook(e));

        // Modal close buttons
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => this.hideModal(e.target.closest('.modal')));
        });

        // Close modal on outside click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.hideModal(modal);
            });
        });
    }

    async loadInitialData() {
        try {
            await Promise.all([
                this.loadLibraryStats(),
                this.loadFeaturedBooks(),
                this.loadRecentReviews(),
                this.loadGenres(),
                this.loadPublishers()
            ]);
        } catch (error) {
            console.error('Error loading initial data:', error);
        }
    }

    async checkAuthStatus() {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const response = await this.apiCall('/api/auth/verify', 'GET');
                if (response.success) {
                    this.currentUser = response.data;
                    this.updateAuthUI();
                } else {
                    localStorage.removeItem('token');
                }
            } catch (error) {
                localStorage.removeItem('token');
            }
        }
    }

    updateAuthUI() {
        const navAuth = document.getElementById('nav-auth');
        const navUser = document.getElementById('nav-user');
        const myBooksLink = document.getElementById('my-books-link');
        const adminLink = document.getElementById('admin-link');

        if (this.currentUser) {
            navAuth.style.display = 'none';
            navUser.style.display = 'flex';
            document.getElementById('user-name').textContent = this.currentUser.username;
            
            if (this.currentUser.userType === 'reader') {
                myBooksLink.style.display = 'block';
            } else if (this.currentUser.userType === 'staff') {
                adminLink.style.display = 'block';
            }
        } else {
            navAuth.style.display = 'flex';
            navUser.style.display = 'none';
            myBooksLink.style.display = 'none';
            adminLink.style.display = 'none';
        }
    }

    showSection(sectionName) {
        // Hide all sections
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });

        // Show selected section
        const targetSection = document.getElementById(sectionName);
        if (targetSection) {
            targetSection.classList.add('active');
            this.currentSection = sectionName;

            // Load section-specific data
            this.loadSectionData(sectionName);
        }

        // Close mobile menu
        document.getElementById('hamburger').classList.remove('active');
        document.getElementById('nav-menu').classList.remove('active');
    }

    async loadSectionData(sectionName) {
        switch (sectionName) {
            case 'my-books':
                if (this.currentUser?.userType === 'reader') {
                    await this.loadCurrentCheckouts();
                }
                break;
            case 'admin':
                if (this.currentUser?.userType === 'staff') {
                    await this.loadAdminData();
                }
                break;
        }
    }

    async loadLibraryStats() {
        try {
            const response = await this.apiCall('/api/reports/library-statistics', 'GET');
            if (response.success) {
                const stats = response.data.basicStatistics;
                document.getElementById('total-books').textContent = stats.total_books || 0;
                document.getElementById('total-readers').textContent = stats.total_readers || 0;
                document.getElementById('total-reviews').textContent = stats.total_reviews || 0;
            }
        } catch (error) {
            console.error('Error loading library stats:', error);
        }
    }

    async loadFeaturedBooks() {
        try {
            const response = await this.apiCall('/api/books/popular/list?limit=6', 'GET');
            if (response.success) {
                this.renderBooks(response.data, 'featured-books');
            }
        } catch (error) {
            console.error('Error loading featured books:', error);
        }
    }

    async loadRecentReviews() {
        try {
            const response = await this.apiCall('/api/reviews/recent/list?limit=5', 'GET');
            if (response.success) {
                this.renderReviews(response.data, 'recent-reviews');
            }
        } catch (error) {
            console.error('Error loading recent reviews:', error);
        }
    }

    async loadGenres() {
        try {
            const response = await this.apiCall('/api/books/genres/list', 'GET');
            if (response.success) {
                const genreSelect = document.getElementById('genre-filter');
                genreSelect.innerHTML = '<option value="">All Genres</option>';
                response.data.forEach(genre => {
                    const option = document.createElement('option');
                    option.value = genre.genre;
                    option.textContent = `${genre.genre} (${genre.book_count})`;
                    genreSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading genres:', error);
        }
    }

    async loadPublishers() {
        try {
            const response = await this.apiCall('/api/books/publishers/list', 'GET');
            if (response.success) {
                const publisherSelect = document.getElementById('publisher-filter');
                publisherSelect.innerHTML = '<option value="">All Publishers</option>';
                response.data.forEach(publisher => {
                    const option = document.createElement('option');
                    option.value = publisher.publisher;
                    option.textContent = `${publisher.publisher} (${publisher.book_count})`;
                    publisherSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading publishers:', error);
        }
    }

    async searchBooks() {
        const query = document.getElementById('search-query').value;
        const genre = document.getElementById('genre-filter').value;
        const publisher = document.getElementById('publisher-filter').value;
        const availableOnly = document.getElementById('available-only').checked;

        const params = new URLSearchParams();
        if (query) params.append('q', query);
        if (genre) params.append('genre', genre);
        if (publisher) params.append('publisher', publisher);
        if (availableOnly) params.append('available', 'true');

        try {
            this.showLoading();
            const response = await this.apiCall(`/api/books/search?${params}`, 'GET');
            if (response.success) {
                this.renderBooks(response.data.books, 'search-results');
                this.hideSearchSuggestions();
            }
        } catch (error) {
            this.showToast('Error searching books', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async handleSearchInput(query) {
        if (query.length < 2) {
            this.hideSearchSuggestions();
            return;
        }

        try {
            const response = await this.apiCall(`/api/books/search?q=${encodeURIComponent(query)}&limit=5`, 'GET');
            if (response.success) {
                this.showSearchSuggestions(response.data.books);
            }
        } catch (error) {
            // Silently fail for suggestions
        }
    }

    showSearchSuggestions(books) {
        const container = document.getElementById('search-suggestions');
        if (!container) {
            // Create suggestions container
            const searchContainer = document.querySelector('.search-input-group');
            const suggestionsDiv = document.createElement('div');
            suggestionsDiv.id = 'search-suggestions';
            suggestionsDiv.className = 'search-suggestions';
            searchContainer.appendChild(suggestionsDiv);
        }

        const suggestionsContainer = document.getElementById('search-suggestions');
        if (books.length === 0) {
            suggestionsContainer.innerHTML = '<div class="suggestion-item">No books found</div>';
        } else {
            suggestionsContainer.innerHTML = books.map(book => `
                <div class="suggestion-item" onclick="app.selectSuggestion('${this.escapeHtml(book.title)}')">
                    <strong>${this.escapeHtml(book.title)}</strong>
                    <span class="suggestion-author">${this.escapeHtml(book.authors || 'Unknown Author')}</span>
                </div>
            `).join('');
        }
        suggestionsContainer.style.display = 'block';
    }

    hideSearchSuggestions() {
        const container = document.getElementById('search-suggestions');
        if (container) {
            container.style.display = 'none';
        }
    }

    selectSuggestion(title) {
        document.getElementById('search-query').value = title;
        this.hideSearchSuggestions();
        this.searchBooks();
    }

    renderBooks(books, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (books.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">No books found</p>';
            return;
        }

        container.innerHTML = books.map(book => `
            <div class="book-card" onclick="app.showBookDetails(${book.book_id})">
                <h3>${this.escapeHtml(book.title)}</h3>
                <p class="author">${this.escapeHtml(book.authors || 'Unknown Author')}</p>
                <div class="book-info">
                    <div class="rating">
                        <span class="stars">${this.renderStars(book.average_rating || 0)}</span>
                        <span>(${book.total_reviews || 0})</span>
                    </div>
                    <span class="availability ${book.available_copies > 0 ? 'available' : 'unavailable'}">
                        ${book.available_copies > 0 ? 'Available' : 'Unavailable'}
                    </span>
                </div>
                <p class="text-muted">${book.genre || 'Unknown Genre'} • ${book.publisher || 'Unknown Publisher'}</p>
            </div>
        `).join('');
    }

    renderReviews(reviews, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (reviews.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">No reviews found</p>';
            return;
        }

        container.innerHTML = reviews.map(review => `
            <div class="review-item">
                <div class="review-header">
                    <span class="review-user">${this.escapeHtml(review.first_name)} ${this.escapeHtml(review.last_name)}</span>
                    <div class="review-rating">
                        <span class="stars">${this.renderStars(review.rating)}</span>
                        <span>${new Date(review.review_date).toLocaleDateString()}</span>
                    </div>
                </div>
                <div class="review-book">${this.escapeHtml(review.title)}</div>
                <div class="review-comment">${this.escapeHtml(review.comment || 'No comment provided')}</div>
            </div>
        `).join('');
    }

    renderStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

        return '★'.repeat(fullStars) + 
               (hasHalfStar ? '☆' : '') + 
               '☆'.repeat(emptyStars);
    }

    async showBookDetails(bookId) {
        try {
            this.showLoading();
            const response = await this.apiCall(`/api/books/${bookId}`, 'GET');
            if (response.success) {
                const book = response.data;
                document.getElementById('book-details-title').textContent = book.title;
                document.getElementById('book-details-content').innerHTML = `
                    <div class="book-details">
                        <div class="book-info">
                            <h3>${this.escapeHtml(book.title)}</h3>
                            <p><strong>Authors:</strong> ${this.escapeHtml(book.authors || 'Unknown')}</p>
                            <p><strong>Publisher:</strong> ${this.escapeHtml(book.publisher || 'Unknown')}</p>
                            <p><strong>Genre:</strong> ${this.escapeHtml(book.genre || 'Unknown')}</p>
                            <p><strong>ISBN:</strong> ${this.escapeHtml(book.isbn || 'N/A')}</p>
                            <p><strong>Pages:</strong> ${book.pages || 'N/A'}</p>
                            <p><strong>Available Copies:</strong> ${book.available_copies} / ${book.total_copies}</p>
                            <div class="rating">
                                <strong>Rating:</strong> 
                                <span class="stars">${this.renderStars(book.average_rating)}</span>
                                <span>(${book.total_reviews} reviews)</span>
                            </div>
                        </div>
                        <div class="book-description">
                            <h4>Description</h4>
                            <p>${this.escapeHtml(book.description || 'No description available')}</p>
                        </div>
                        <div class="book-actions">
                            ${this.currentUser?.userType === 'reader' && book.isAvailable ? 
                                `<button class="btn btn-primary" onclick="app.borrowBook(${book.book_id})">Borrow Book</button>` : 
                                ''
                            }
                            ${this.currentUser?.userType === 'reader' ? 
                                `<button class="btn btn-secondary" onclick="app.showReviewForm(${book.book_id})">Write Review</button>` : 
                                ''
                            }
                        </div>
                        <div class="recent-reviews">
                            <h4>Recent Reviews</h4>
                            ${book.recentReviews && book.recentReviews.length > 0 ? 
                                this.renderReviews(book.recentReviews, null) : 
                                '<p class="text-muted">No reviews yet</p>'
                            }
                        </div>
                    </div>
                `;
                this.showModal('book-details-modal');
            }
        } catch (error) {
            this.showToast('Error loading book details', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async borrowBook(bookId) {
        if (!this.currentUser) {
            this.showToast('Please login to borrow books', 'warning');
            return;
        }

        try {
            this.showLoading();
            const response = await this.apiCall('/api/checkouts/borrow', 'POST', {
                bookId: bookId,
                dueDays: 14
            });
            
            if (response.success) {
                this.showToast('Book borrowed successfully!', 'success');
                this.hideModal(document.getElementById('book-details-modal'));
                this.loadCurrentCheckouts();
            } else {
                this.showToast(response.message, 'error');
            }
        } catch (error) {
            this.showToast('Error borrowing book', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async loadCurrentCheckouts() {
        try {
            const response = await this.apiCall('/api/checkouts/my-checkouts?status=active', 'GET');
            if (response.success) {
                this.renderCheckouts(response.data.checkouts, 'current-checkouts');
            }
        } catch (error) {
            console.error('Error loading current checkouts:', error);
        }
    }

    async loadCheckoutHistory() {
        try {
            const response = await this.apiCall('/api/checkouts/my-checkouts?status=returned', 'GET');
            if (response.success) {
                this.renderCheckouts(response.data.checkouts, 'checkout-history');
            }
        } catch (error) {
            console.error('Error loading checkout history:', error);
        }
    }

    async loadMyReviews() {
        try {
            const response = await this.apiCall('/api/reviews/my-reviews', 'GET');
            if (response.success) {
                this.renderMyReviews(response.data.reviews, 'my-reviews');
            }
        } catch (error) {
            console.error('Error loading my reviews:', error);
        }
    }

    renderCheckouts(checkouts, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (checkouts.length === 0) {
            const message = containerId === 'current-checkouts' ? 'No current checkouts' : 'No checkout history';
            container.innerHTML = `<p class="text-center text-muted">${message}</p>`;
            return;
        }

        container.innerHTML = checkouts.map(checkout => `
            <div class="book-card">
                <h3>${this.escapeHtml(checkout.title)}</h3>
                <p class="author">${this.escapeHtml(checkout.authors || 'Unknown Author')}</p>
                <div class="book-info">
                    <p><strong>Borrowed:</strong> ${new Date(checkout.checkout_date).toLocaleDateString()}</p>
                    <p><strong>Due:</strong> ${new Date(checkout.due_date).toLocaleDateString()}</p>
                    <p><strong>Status:</strong> <span class="availability ${checkout.status}">${checkout.status}</span></p>
                    ${checkout.return_date ? `<p><strong>Returned:</strong> ${new Date(checkout.return_date).toLocaleDateString()}</p>` : ''}
                    ${checkout.late_fee > 0 ? `<p><strong>Late Fee:</strong> $${checkout.late_fee}</p>` : ''}
                </div>
                <div class="book-actions">
                    ${checkout.status === 'active' ? `
                        <button class="btn btn-success btn-small" onclick="app.returnBook(${checkout.checkout_id})">Return Book</button>
                        <button class="btn btn-secondary btn-small" onclick="app.renewBook(${checkout.checkout_id})">Renew</button>
                    ` : ''}
                    ${checkout.status === 'returned' ? `
                        <button class="btn btn-primary btn-small" onclick="app.showReviewForm(${checkout.book_id})">Write Review</button>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    renderMyReviews(reviews, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (reviews.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">No reviews written yet</p>';
            return;
        }

        container.innerHTML = reviews.map(review => `
            <div class="review-item">
                <div class="review-header">
                    <span class="review-book">${this.escapeHtml(review.title)}</span>
                    <div class="review-rating">
                        <span class="stars">${this.renderStars(review.rating)}</span>
                        <span>${new Date(review.review_date).toLocaleDateString()}</span>
                    </div>
                </div>
                <div class="review-comment">${this.escapeHtml(review.comment || 'No comment provided')}</div>
                <div class="review-actions">
                    <button class="btn btn-secondary btn-small" onclick="app.editReview(${review.review_id})">Edit</button>
                    <button class="btn btn-danger btn-small" onclick="app.deleteReview(${review.review_id})">Delete</button>
                </div>
            </div>
        `).join('');
    }

    async returnBook(checkoutId) {
        try {
            this.showLoading();
            const response = await this.apiCall('/api/checkouts/return', 'POST', {
                checkoutId: checkoutId
            });
            
            if (response.success) {
                this.showToast(response.message, 'success');
                this.loadCurrentCheckouts();
            } else {
                this.showToast(response.message, 'error');
            }
        } catch (error) {
            this.showToast('Error returning book', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async renewBook(checkoutId) {
        try {
            this.showLoading();
            const response = await this.apiCall('/api/checkouts/renew', 'POST', {
                checkoutId: checkoutId,
                additionalDays: 7
            });
            
            if (response.success) {
                this.showToast('Book renewed successfully!', 'success');
                this.loadCurrentCheckouts();
            } else {
                this.showToast(response.message, 'error');
            }
        } catch (error) {
            this.showToast('Error renewing book', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;

        try {
            this.showLoading();
            const response = await this.apiCall('/api/auth/login', 'POST', {
                username,
                password
            });

            if (response.success) {
                localStorage.setItem('token', response.data.token);
                this.currentUser = response.data;
                this.updateAuthUI();
                this.hideModal(document.getElementById('login-modal'));
                this.showToast('Login successful!', 'success');
                document.getElementById('login-form').reset();
            } else {
                this.showToast(response.message, 'error');
            }
        } catch (error) {
            this.showToast('Login failed', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        const formData = {
            username: document.getElementById('register-username').value,
            email: document.getElementById('register-email').value,
            password: document.getElementById('register-password').value,
            firstName: document.getElementById('register-firstname').value,
            lastName: document.getElementById('register-lastname').value,
            userType: document.getElementById('register-type').value
        };

        try {
            this.showLoading();
            const response = await this.apiCall('/api/auth/register', 'POST', formData);

            if (response.success) {
                localStorage.setItem('token', response.data.token);
                this.currentUser = response.data;
                this.updateAuthUI();
                this.hideModal(document.getElementById('register-modal'));
                this.showToast('Registration successful!', 'success');
                document.getElementById('register-form').reset();
            } else {
                this.showToast(response.message, 'error');
            }
        } catch (error) {
            this.showToast('Registration failed', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async handleAddBook(e) {
        e.preventDefault();
        const formData = {
            title: document.getElementById('book-title').value,
            isbn: document.getElementById('book-isbn').value,
            publisher: document.getElementById('book-publisher').value,
            genre: document.getElementById('book-genre').value,
            totalCopies: parseInt(document.getElementById('book-copies').value),
            pages: parseInt(document.getElementById('book-pages').value) || null,
            description: document.getElementById('book-description').value,
            authorIds: Array.from(document.getElementById('book-authors').selectedOptions).map(option => parseInt(option.value))
        };

        try {
            this.showLoading();
            const response = await this.apiCall('/api/admin/books', 'POST', formData);

            if (response.success) {
                this.showToast('Book added successfully!', 'success');
                this.hideModal(document.getElementById('add-book-modal'));
                document.getElementById('add-book-form').reset();
                this.loadAdminData();
            } else {
                this.showToast(response.message, 'error');
            }
        } catch (error) {
            this.showToast('Error adding book', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async handleAddAuthor(e) {
        e.preventDefault();
        const formData = {
            firstName: document.getElementById('author-firstname').value,
            lastName: document.getElementById('author-lastname').value,
            birthDate: document.getElementById('author-birthdate').value || null,
            nationality: document.getElementById('author-nationality').value || null,
            biography: document.getElementById('author-biography').value || null
        };

        try {
            this.showLoading();
            const response = await this.apiCall('/api/admin/authors', 'POST', formData);

            if (response.success) {
                this.showToast('Author added successfully!', 'success');
                this.hideModal(document.getElementById('add-author-modal'));
                document.getElementById('add-author-form').reset();
                this.loadAuthors();
            } else {
                this.showToast(response.message, 'error');
            }
        } catch (error) {
            this.showToast('Error adding author', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async handleReviewBook(e) {
        e.preventDefault();
        const bookId = document.getElementById('review-book-id').value;
        const rating = document.querySelector('input[name="rating"]:checked')?.value;
        const comment = document.getElementById('review-comment').value;

        if (!rating) {
            this.showToast('Please select a rating', 'warning');
            return;
        }

        try {
            this.showLoading();
            const response = await this.apiCall('/api/reviews', 'POST', {
                bookId: parseInt(bookId),
                rating: parseInt(rating),
                comment: comment || null
            });

            if (response.success) {
                this.showToast('Review submitted successfully!', 'success');
                this.hideModal(document.getElementById('review-book-modal'));
                document.getElementById('review-book-form').reset();
                // Refresh book details if modal is open
                if (document.getElementById('book-details-modal').style.display === 'block') {
                    const bookId = document.getElementById('review-book-id').value;
                    this.showBookDetails(bookId);
                }
            } else {
                this.showToast(response.message, 'error');
            }
        } catch (error) {
            this.showToast('Error submitting review', 'error');
        } finally {
            this.hideLoading();
        }
    }

    showReviewForm(bookId) {
        if (!this.currentUser) {
            this.showToast('Please login to write reviews', 'warning');
            return;
        }

        document.getElementById('review-book-id').value = bookId;
        document.getElementById('review-book-form').reset();
        this.showModal('review-book-modal');
    }

    async editReview(reviewId) {
        try {
            const response = await this.apiCall(`/api/reviews/${reviewId}`, 'GET');
            if (response.success) {
                const review = response.data;
                document.getElementById('review-book-id').value = review.book_id;
                document.querySelector(`input[name="rating"][value="${review.rating}"]`).checked = true;
                document.getElementById('review-comment').value = review.comment || '';
                this.showModal('review-book-modal');
            }
        } catch (error) {
            this.showToast('Error loading review', 'error');
        }
    }

    async deleteReview(reviewId) {
        if (!confirm('Are you sure you want to delete this review?')) {
            return;
        }

        try {
            this.showLoading();
            const response = await this.apiCall(`/api/reviews/${reviewId}`, 'DELETE');
            
            if (response.success) {
                this.showToast('Review deleted successfully!', 'success');
                this.loadMyReviews();
            } else {
                this.showToast(response.message, 'error');
            }
        } catch (error) {
            this.showToast('Error deleting review', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async loadAdminData() {
        await Promise.all([
            this.loadBooks(),
            this.loadAuthors(),
            this.loadAnalyticsData()
        ]);
    }

    async loadBooks() {
        try {
            const response = await this.apiCall('/api/books/search?limit=50', 'GET');
            if (response.success) {
                this.renderAdminBooks(response.data.books);
            }
        } catch (error) {
            console.error('Error loading books:', error);
        }
    }

    async loadAuthors() {
        try {
            const response = await this.apiCall('/api/admin/authors?limit=100', 'GET');
            if (response.success) {
                this.renderAdminAuthors(response.data.authors);
                this.populateAuthorSelect(response.data.authors);
            }
        } catch (error) {
            console.error('Error loading authors:', error);
        }
    }

    async loadAnalyticsData(tabName = 'session-time') {
        try {
            switch (tabName) {
                case 'session-time':
                    await this.loadSessionTimeData();
                    break;
                case 'highlights':
                    await this.loadHighlightsData();
                    break;
                case 'reading-time':
                    await this.loadReadingTimeData();
                    break;
                case 'device-patterns':
                    await this.loadDevicePatternsData();
                    break;
                case 'time-activity':
                    await this.loadTimeActivityData();
                    break;
            }
        } catch (error) {
            console.error('Error loading analytics data:', error);
        }
    }

    async loadSessionTimeData() {
        try {
            const response = await this.apiCall('/api/analytics/average-session-time', 'GET');
            if (response.success) {
                this.renderSessionTimeData(response.data);
            }
        } catch (error) {
            console.error('Error loading session time data:', error);
        }
    }

    async loadHighlightsData() {
        try {
            const response = await this.apiCall('/api/analytics/most-highlighted-books', 'GET');
            if (response.success) {
                this.renderHighlightsData(response.data);
            }
        } catch (error) {
            console.error('Error loading highlights data:', error);
        }
    }

    async loadReadingTimeData() {
        try {
            const response = await this.apiCall('/api/analytics/top-books-reading-time', 'GET');
            if (response.success) {
                this.renderReadingTimeData(response.data);
            }
        } catch (error) {
            console.error('Error loading reading time data:', error);
        }
    }

    async loadDevicePatternsData() {
        try {
            const response = await this.apiCall('/api/analytics/reading-patterns-by-device', 'GET');
            if (response.success) {
                this.renderDevicePatternsData(response.data);
            }
        } catch (error) {
            console.error('Error loading device patterns data:', error);
        }
    }

    async loadTimeActivityData() {
        try {
            const response = await this.apiCall('/api/analytics/reading-activity-by-time', 'GET');
            if (response.success) {
                this.renderTimeActivityData(response.data);
            }
        } catch (error) {
            console.error('Error loading time activity data:', error);
        }
    }

    renderSessionTimeData(data) {
        const container = document.getElementById('session-time-data');
        if (!container) return;

        if (data.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">No session data available</p>';
            return;
        }

        container.innerHTML = `
            <table class="analytics-data-table">
                <thead>
                    <tr>
                        <th>User ID</th>
                        <th>Total Sessions</th>
                        <th>Total Reading Time (Hours)</th>
                        <th>Average Session Time (Minutes)</th>
                        <th>Longest Session (Minutes)</th>
                        <th>Shortest Session (Minutes)</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map(item => `
                        <tr>
                            <td>${item.user_id}</td>
                            <td>${item.total_sessions}</td>
                            <td>${(item.total_reading_time_minutes / 60).toFixed(2)}</td>
                            <td>${item.average_session_time_minutes}</td>
                            <td>${item.longest_session_minutes}</td>
                            <td>${item.shortest_session_minutes}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    renderHighlightsData(data) {
        const container = document.getElementById('highlights-data');
        if (!container) return;

        if (data.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">No highlights data available</p>';
            return;
        }

        container.innerHTML = `
            <table class="analytics-data-table">
                <thead>
                    <tr>
                        <th>Book ID</th>
                        <th>Total Highlights</th>
                        <th>Unique Users</th>
                        <th>Highlight Types</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map(item => `
                        <tr>
                            <td>${item.book_id}</td>
                            <td>${item.total_highlights}</td>
                            <td>${item.unique_users_count}</td>
                            <td>${item.highlight_types.join(', ')}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    renderReadingTimeData(data) {
        const container = document.getElementById('reading-time-data');
        if (!container) return;

        if (data.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">No reading time data available</p>';
            return;
        }

        container.innerHTML = `
            <table class="analytics-data-table">
                <thead>
                    <tr>
                        <th>Book ID</th>
                        <th>Total Reading Time (Hours)</th>
                        <th>Total Sessions</th>
                        <th>Unique Readers</th>
                        <th>Average Session Time (Minutes)</th>
                        <th>Total Pages Read</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map(item => `
                        <tr>
                            <td>${item.book_id}</td>
                            <td>${item.total_reading_time_hours}</td>
                            <td>${item.total_sessions}</td>
                            <td>${item.unique_readers_count}</td>
                            <td>${item.average_session_time_minutes}</td>
                            <td>${item.total_pages_read}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    renderDevicePatternsData(data) {
        const container = document.getElementById('device-patterns-data');
        if (!container) return;

        if (data.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">No device patterns data available</p>';
            return;
        }

        container.innerHTML = `
            <table class="analytics-data-table">
                <thead>
                    <tr>
                        <th>Device Type</th>
                        <th>Total Sessions</th>
                        <th>Total Reading Time (Hours)</th>
                        <th>Average Session Time (Minutes)</th>
                        <th>Average Pages per Session</th>
                        <th>Total Highlights</th>
                        <th>Unique Users</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map(item => `
                        <tr>
                            <td>${item.device_type}</td>
                            <td>${item.total_sessions}</td>
                            <td>${item.total_reading_time_hours}</td>
                            <td>${item.average_session_time_minutes}</td>
                            <td>${item.average_pages_per_session}</td>
                            <td>${item.total_highlights}</td>
                            <td>${item.unique_users_count}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    renderTimeActivityData(data) {
        const container = document.getElementById('time-activity-data');
        if (!container) return;

        if (data.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">No time activity data available</p>';
            return;
        }

        container.innerHTML = `
            <table class="analytics-data-table">
                <thead>
                    <tr>
                        <th>Hour of Day</th>
                        <th>Total Sessions</th>
                        <th>Total Reading Time (Hours)</th>
                        <th>Average Session Time (Minutes)</th>
                        <th>Unique Users</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map(item => `
                        <tr>
                            <td>${item.hour_of_day}:00</td>
                            <td>${item.total_sessions}</td>
                            <td>${item.total_reading_time_hours}</td>
                            <td>${item.average_session_time_minutes}</td>
                            <td>${item.unique_users_count}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    renderAdminBooks(books) {
        const container = document.getElementById('books-content');
        if (!container) return;

        container.innerHTML = `
            <table class="table">
                <thead>
                    <tr>
                        <th>Title</th>
                        <th>Authors</th>
                        <th>Genre</th>
                        <th>Copies</th>
                        <th>Available</th>
                        <th>Rating</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${books.map(book => `
                        <tr>
                            <td>${this.escapeHtml(book.title)}</td>
                            <td>${this.escapeHtml(book.authors || 'Unknown')}</td>
                            <td>${this.escapeHtml(book.genre || 'Unknown')}</td>
                            <td>${book.total_copies}</td>
                            <td>${book.available_copies}</td>
                            <td>
                                <span class="stars">${this.renderStars(book.average_rating)}</span>
                                (${book.total_reviews})
                            </td>
                            <td>
                                <button class="btn btn-secondary btn-small" onclick="app.updateBookInventory(${book.book_id}, ${book.total_copies})">Update Inventory</button>
                                <button class="btn btn-danger btn-small" onclick="app.retireBook(${book.book_id})">Retire</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    renderAdminAuthors(authors) {
        const container = document.getElementById('authors-content');
        if (!container) return;

        container.innerHTML = `
            <table class="table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Birth Date</th>
                        <th>Nationality</th>
                        <th>Books</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${authors.map(author => `
                        <tr>
                            <td>${this.escapeHtml(author.first_name)} ${this.escapeHtml(author.last_name)}</td>
                            <td>${author.birth_date ? new Date(author.birth_date).toLocaleDateString() : 'N/A'}</td>
                            <td>${this.escapeHtml(author.nationality || 'N/A')}</td>
                            <td>${author.book_count}</td>
                            <td>
                                <button class="btn btn-secondary btn-small">Edit</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    populateAuthorSelect(authors) {
        const select = document.getElementById('book-authors');
        select.innerHTML = '';
        authors.forEach(author => {
            const option = document.createElement('option');
            option.value = author.author_id;
            option.textContent = `${author.first_name} ${author.last_name}`;
            select.appendChild(option);
        });
    }

    switchTab(btn) {
        const tabName = btn.getAttribute('data-tab');
        
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Update tab panels
        document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
        document.getElementById(`${tabName}-panel`).classList.add('active');

        // Load tab-specific data
        if (this.currentUser?.userType === 'reader') {
            switch (tabName) {
                case 'current':
                    this.loadCurrentCheckouts();
                    break;
                case 'history':
                    this.loadCheckoutHistory();
                    break;
                case 'reviews':
                    this.loadMyReviews();
                    break;
            }
        }
    }

    switchAnalyticsTab(btn) {
        const tabName = btn.getAttribute('data-analytics-tab');
        
        // Update analytics tab buttons
        document.querySelectorAll('.analytics-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Update analytics panels
        document.querySelectorAll('.analytics-panel').forEach(panel => panel.classList.remove('active'));
        document.getElementById(`${tabName}-panel`).classList.add('active');

        // Load analytics data
        this.loadAnalyticsData(tabName);
    }

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';
        }
    }

    hideModal(modal) {
        if (modal) {
            modal.style.display = 'none';
        }
    }

    showLoading() {
        document.getElementById('loading-spinner').style.display = 'block';
    }

    hideLoading() {
        document.getElementById('loading-spinner').style.display = 'none';
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 5000);
    }

    logout() {
        localStorage.removeItem('token');
        this.currentUser = null;
        this.updateAuthUI();
        this.showSection('home');
        this.showToast('Logged out successfully', 'success');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async apiCall(endpoint, method = 'GET', data = null) {
        const token = localStorage.getItem('token');
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        if (data) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(endpoint, options);
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'API call failed');
        }

        return result;
    }
}

// Initialize the app
const app = new SmartLibraryApp();
