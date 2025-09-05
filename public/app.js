// Smart Library Platform - Frontend JavaScript
// @ts-nocheck
/* eslint-disable */

// Create a global variable for the app instance
window.app = null;

class SmartLibraryApp {
    constructor() {
        this.currentUser = null;
        this.currentSection = 'home';
        this.init();

        // Set the app instance to the global scope
        window.app = this;
    }

    init() {
        this.setupEventListeners();
        this.loadInitialData();
        this.checkAuthStatus();
    }

    showToast(message, type = 'success') {
        const toastContainer = document.getElementById('toast-container');

        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;

        // Add toast to container
        toastContainer.appendChild(toast);

        // Trigger animation
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);

        // Remove toast after animation
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toastContainer.removeChild(toast);
            }, 300);
        }, 3000);
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

        // Modal close buttons
        document.querySelectorAll('.modal-close').forEach(closeBtn => {
            closeBtn.addEventListener('click', () => {
                const modal = closeBtn.closest('.modal');
                this.hideModal(modal);
            });
        });

        // Close modal when clicking outside
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModal(modal);
                }
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
        const searchInput = document.getElementById('search-query');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.handleSearchInput(e.target.value);
            });

            // Show suggestions when focusing on search input if there's text
            searchInput.addEventListener('focus', () => {
                const query = searchInput.value;
                if (query && query.length >= 2) {
                    this.handleSearchInput(query);
                }
            });
        }

        // Click outside listener to hide search suggestions
        document.addEventListener('click', (e) => {
            const searchSuggestions = document.getElementById('search-suggestions');
            const searchInput = document.getElementById('search-query');

            if (searchSuggestions && searchInput) {
                // Check if click is outside both the search input and suggestions
                if (!searchInput.contains(e.target) && !searchSuggestions.contains(e.target)) {
                    this.hideSearchSuggestions();
                }
            }
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
        document.getElementById('edit-author-form')?.addEventListener('submit', (e) => this.handleEditAuthor(e));
        document.getElementById('review-book-form')?.addEventListener('submit', (e) => this.handleReviewBook(e));

        // Admin panel dynamic button handlers
        document.addEventListener('click', (e) => {
            const target = e.target;

            // Edit Author button
            if (target.matches('.edit-author-btn')) {
                const authorId = target.dataset.authorId;
                if (authorId) {
                    this.editAuthor(parseInt(authorId));
                }
            }

            // Delete Author button
            if (target.matches('.delete-author-btn')) {
                const authorId = target.dataset.authorId;
                if (authorId) {
                    this.deleteAuthor(parseInt(authorId));
                }
            }

            // Delete Author button
            if (target.matches('.delete-author-btn')) {
                const authorId = target.dataset.authorId;
                if (authorId) {
                    if (confirm('Are you sure you want to delete this author? This cannot be undone.')) {
                        this.deleteAuthor(parseInt(authorId));
                    }
                }
            }

            // Update Inventory button
            if (target.matches('.update-inventory-btn')) {
                const bookId = target.dataset.bookId;
                const totalCopies = target.dataset.totalCopies;
                if (bookId && totalCopies) {
                    this.updateBookInventory(parseInt(bookId), parseInt(totalCopies));
                }
            }

            // Retire Book button
            if (target.matches('.retire-book-btn')) {
                const bookId = target.dataset.bookId;
                if (bookId) {
                    this.retireBook(parseInt(bookId));
                }
            }
        });

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
            case 'reviews':
                await this.loadAllReviews();
                break;
            case 'home':
                await Promise.all([
                    this.loadLibraryStats(),
                    this.loadFeaturedBooks(),
                    this.loadRecentReviews()
                ]);
                break;
        }
    }

    async loadAllReviews() {
        try {
            const response = await this.apiCall('/api/reviews/list', 'GET');
            if (response.success) {
                this.renderReviews(response.data, 'all-reviews');
            } else {
                this.showToast('Failed to load reviews', 'error');
            }
        } catch (error) {
            console.error('Error loading all reviews:', error);
            this.showToast('Error loading reviews', 'error');
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
            if (response.success && Array.isArray(response.data)) {
                console.log('API Response Data:', response.data);
                // Process each book object
                const processedBooks = response.data.map(book => ({
                    ...book,
                    genre: book.genre || 'General',
                    publisher: book.publisher || 'Not Specified',
                    authors: book.authors || 'Unknown Author',
                    average_rating: Number(book.average_rating) || 0,
                    total_reviews: Number(book.total_reviews) || 0,
                    available_copies: Number(book.available_copies) || 0,
                    total_copies: Number(book.total_copies) || 0
                }));
                console.log('Processed Books:', processedBooks);
                this.renderBooks(processedBooks, 'featured-books');
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
        try {
            const query = document.getElementById('search-query')?.value || '';
            const genre = document.getElementById('genre-filter')?.value || '';
            const publisher = document.getElementById('publisher-filter')?.value || '';
            const availableOnly = document.getElementById('available-only')?.checked || false;

            const params = new URLSearchParams();
            if (query) params.append('q', query);
            if (genre) params.append('genre', genre);
            if (publisher) params.append('publisher', publisher);
            if (availableOnly) params.append('available', 'true');
            params.append('limit', '50');

            const searchResultsDiv = document.getElementById('search-results');
            if (!searchResultsDiv) {
                console.error('Search results container not found');
                return;
            }

            searchResultsDiv.innerHTML = '<div class="loading">Searching books...</div>';

            const response = await this.apiCall(`/api/books/search?${params}`, 'GET');

            if (response.success && response.data?.books) {
                if (response.data.books.length === 0) {
                    searchResultsDiv.innerHTML = '<div class="no-results">No books found matching your criteria</div>';
                } else {
                    this.renderBooks(response.data.books, 'search-results');
                }
            } else {
                console.error('Search failed:', response.message);
                searchResultsDiv.innerHTML = '<div class="error">Failed to search books</div>';
            }
        } catch (error) {
            console.error('Search error:', error);
            const errorMessage = error.message || 'Error searching books';
            this.showToast(errorMessage, 'error');
            const searchResultsDiv = document.getElementById('search-results');
            if (searchResultsDiv) {
                searchResultsDiv.innerHTML = `<div class="error">${errorMessage}</div>`;
            }
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
            const searchInput = document.getElementById('search-query');
            const searchContainer = searchInput.parentElement;
            const suggestionsDiv = document.createElement('div');
            suggestionsDiv.id = 'search-suggestions';
            suggestionsDiv.className = 'search-suggestions';
            searchContainer.appendChild(suggestionsDiv);
        }

        const suggestionsContainer = document.getElementById('search-suggestions');
        if (!suggestionsContainer) return;

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

        if (!Array.isArray(books) || books.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">No books found</p>';
            return;
        }

        console.log('Rendering books:', books);

        container.innerHTML = books.map(book => {
            // Convert values and provide defaults
            const genre = typeof book.genre === 'string' && book.genre.trim() !== '' ? book.genre : 'General';
            const publisher = typeof book.publisher === 'string' && book.publisher.trim() !== '' ? book.publisher : 'Not Specified';
            const title = book.title || 'Untitled';
            const authors = book.authors || 'Unknown Author';
            const avgRating = Number(book.average_rating) || 0;
            const totalReviews = Number(book.total_reviews) || 0;
            const availableCopies = Number(book.available_copies) || 0;

            console.log(`Book ${book.book_id}:`, {
                title,
                genre,
                publisher,
                authors,
                avgRating,
                totalReviews,
                availableCopies
            });
            
            return `
            <div class="book-card" onclick="app.showBookDetails(${book.book_id})">
                <h3>${this.escapeHtml(title)}</h3>
                <p class="author">${this.escapeHtml(authors)}</p>
                <div class="book-info">
                    <div class="rating">
                        <span class="stars">${this.renderStars(avgRating)}</span>
                        <span>(${totalReviews})</span>
                    </div>
                    <span class="availability ${availableCopies > 0 ? 'available' : 'unavailable'}">
                        ${availableCopies > 0 ? 'Available' : 'Unavailable'}
                    </span>
                </div>
                <p class="text-muted">${this.escapeHtml(genre)} • ${this.escapeHtml(publisher)}</p>
            </div>`;
        }).join('');
    }

    renderSearchResults(books) {
        const container = document.getElementById('search-results');
        if (!container) return;

        if (!books || books.length === 0) {
            container.innerHTML = '<div class="no-results">No books found matching your criteria</div>';
            return;
        }

        container.innerHTML = books.map(book => `
            <div class="book-card">
                <div class="book-info">
                    <h3 class="book-title">${this.escapeHtml(book.title)}</h3>
                    <p class="book-authors">${this.escapeHtml(book.author_names ? book.author_names.join(', ') : 'Unknown Author')}</p>
                    <p class="book-details">
                        <span class="isbn">ISBN: ${this.escapeHtml(book.isbn || 'N/A')}</span>
                        <span class="genre">${this.escapeHtml(book.genre || 'Unknown Genre')}</span>
                        <span class="publisher">${this.escapeHtml(book.publisher || 'Unknown Publisher')}</span>
                    </p>
                    <p class="book-availability">
                        <span class="copies">Copies: ${book.available_copies}/${book.total_copies}</span>
                        <span class="status ${book.available_copies > 0 ? 'available' : 'unavailable'}">
                            ${book.available_copies > 0 ? 'Available' : 'Not Available'}
                        </span>
                    </p>
                    ${this.currentUser ? `
                        <div class="book-actions">
                            ${book.available_copies > 0 ? `
                                <button class="btn btn-primary btn-sm" onclick="app.checkoutBook(${book.book_id})">
                                    Checkout
                                </button>
                            ` : ''}
                            <button class="btn btn-secondary btn-sm" onclick="app.showBookDetails(${book.book_id})">
                                Details
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    formatReadingTime(minutes) {
        if (!minutes) return 'N/A';

        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;

        if (hours === 0) {
            return `${remainingMinutes}m`;
        } else if (remainingMinutes === 0) {
            return `${hours}h`;
        } else {
            return `${hours}h ${remainingMinutes}m`;
        }
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 7) {
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } else if (days > 0) {
            return `${days} day${days > 1 ? 's' : ''} ago`;
        } else if (hours > 0) {
            return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        } else if (minutes > 0) {
            return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        } else {
            return 'Just now';
        }
    }

    renderReviews(reviews, containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Review container '${containerId}' not found`);
            return;
        }

        if (!Array.isArray(reviews) || reviews.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-book-reader"></i>
                    <p>No reviews found</p>
                    ${this.currentUser ? '<p class="text-muted">Be the first to write a review!</p>' : ''}
                </div>
            `;
            return;
        }

        // Sort reviews by date, newest first
        reviews.sort((a, b) => new Date(b.created_at || b.review_date) - new Date(a.created_at || a.review_date));

        console.log('Current user:', this.currentUser);
        console.log('Reviews:', reviews);
        
        container.innerHTML = reviews.map(review => {
            // For debugging
            console.log('Comparing user IDs:', {
                currentUserId: this.currentUser?.user_id,
                reviewUserId: review.user_id,
                isMatch: this.currentUser?.user_id === review.user_id
            });
            
            return `
            <div class="review-item">
                <div class="review-header">
                    <div class="review-user-info">
                        <i class="fas fa-user-circle"></i>
                        <div>
                            <span class="review-user">${this.escapeHtml(review.first_name || '')} ${this.escapeHtml(review.last_name || '')}</span>
                            <span class="review-date">${this.formatDate(review.created_at || review.review_date)}</span>
                        </div>
                    </div>
                    <div class="review-rating">
                        ${Array(5).fill(0).map((_, i) =>
                `<i class="fas fa-star${i < (review.rating || 0) ? ' active' : ''}"></i>`
            ).join('')}
                    </div>
                </div>
                <div class="review-book">
                    <i class="fas fa-book"></i>
                    <a href="#" onclick="app.showBookDetails(${review.book_id}); return false;">
                        ${this.escapeHtml(review.title)}
                    </a>
                </div>
                <div class="review-content">${this.escapeHtml(review.comment || 'No comment provided')}</div>
                ${this.currentUser && Number(this.currentUser.user_id) === Number(review.user_id) ? `
                    <div class="review-actions">
                        <button class="btn btn-sm btn-outline" onclick="app.editReview(${review.review_id})">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="app.deleteReview(${review.review_id})">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                ` : ''}
            </div>`;
        }).join('');
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
                ${this.currentUser && Number(this.currentUser.user_id) === Number(review.user_id) ? `
                    <div class="review-actions">
                        <button class="btn btn-secondary btn-small" onclick="app.editReview(${review.review_id})">Edit</button>
                        <button class="btn btn-danger btn-small" onclick="app.deleteReview(${review.review_id})">Delete</button>
                    </div>
                ` : ''}
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
        
        // Get form values
        const title = document.getElementById('book-title').value.trim();
        const isbn = document.getElementById('book-isbn').value.trim();
        const publisher = document.getElementById('book-publisher').value.trim();
        const publicationDate = document.getElementById('book-publication-date').value || null;
        const genre = document.getElementById('book-genre').value.trim();
        const language = document.getElementById('book-language').value.trim() || 'English';
        const totalCopies = parseInt(document.getElementById('book-copies').value);
        const pages = document.getElementById('book-pages').value ? parseInt(document.getElementById('book-pages').value) : null;
        const description = document.getElementById('book-description').value.trim();
        const authorIds = Array.from(document.getElementById('book-authors').selectedOptions).map(option => parseInt(option.value));

        // Basic client-side validation
        if (!title) {
            this.showToast('Title is required', 'error');
            return;
        }

        if (!authorIds.length) {
            this.showToast('Please select at least one author', 'error');
            return;
        }

        if (!totalCopies || totalCopies < 1) {
            this.showToast('Please enter a valid number of copies', 'error');
            return;
        }

        const formData = {
            title,
            isbn: isbn || null,
            publisher: publisher || null,
            publicationDate,
            genre: genre || null,
            language,
            totalCopies,
            pages,
            description: description || null,
            authorIds
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
            this.showLoading();
            const response = await this.apiCall(`/api/reviews/${reviewId}`, 'GET');
            if (response.success) {
                const review = response.data;
                // Store review ID for update operation
                document.getElementById('review-book-id').value = review.book_id;
                document.getElementById('review-id').value = reviewId; // Add this hidden input to the form
                document.querySelector(`input[name="rating"][value="${review.rating}"]`).checked = true;
                document.getElementById('review-comment').value = review.comment || '';
                // Change form submit handler
                const form = document.getElementById('review-book-form');
                form.onsubmit = (e) => this.handleUpdateReview(e);
                this.showModal('review-book-modal');
            }
        } catch (error) {
            this.showToast('Error loading review', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async handleUpdateReview(e) {
        e.preventDefault();
        const reviewId = document.getElementById('review-id').value;
        const rating = document.querySelector('input[name="rating"]:checked')?.value;
        const comment = document.getElementById('review-comment').value;

        if (!rating) {
            this.showToast('Please select a rating', 'warning');
            return;
        }

        try {
            this.showLoading();
            const response = await this.apiCall(`/api/reviews/${reviewId}`, 'PUT', {
                rating: parseInt(rating),
                comment: comment || null
            });

            if (response.success) {
                this.showToast('Review updated successfully!', 'success');
                this.hideModal(document.getElementById('review-book-modal'));
                document.getElementById('review-book-form').reset();
                // Reset form submit handler
                document.getElementById('review-book-form').onsubmit = (e) => this.handleReviewBook(e);
                // Refresh reviews based on current section
                if (this.currentSection === 'reviews') {
                    this.loadAllReviews();
                } else if (this.currentSection === 'my-books') {
                    this.loadMyReviews();
                }
            } else {
                this.showToast(response.message, 'error');
            }
        } catch (error) {
            this.showToast('Error updating review', 'error');
        } finally {
            this.hideLoading();
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
                // Refresh reviews based on current section
                if (this.currentSection === 'reviews') {
                    this.loadAllReviews();
                } else if (this.currentSection === 'my-books') {
                    this.loadMyReviews();
                }
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
            this.loadAnalyticsData(),
            this.loadReportsData()
        ]);
    }

    async loadBooks() {
        try {
            const response = await this.apiCall('/api/books/search?limit=50', 'GET');
            if (response.success) {
                this.renderAdminBooks(response.data.books);
            } else {
                console.error('Failed to load books:', response.message);
            }
        } catch (error) {
            console.error('Error loading books:', error);
            this.showToast('Error loading books', 'error');
        }
    }

    async loadAuthors() {
        try {
            const response = await this.apiCall('/api/books/authors', 'GET');
            if (response.success) {
                this.renderAdminAuthors(response.data.authors);
                this.populateAuthorSelect(response.data.authors);
            } else {
                console.error('Failed to load authors:', response.message);
            }
        } catch (error) {
            console.error('Error loading authors:', error);
            this.showToast('Error loading authors', 'error');
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
                                <button class="btn btn-secondary btn-small update-inventory-btn" data-book-id="${book.book_id}" data-total-copies="${book.total_copies}" type="button">Update Inventory</button>
                                <button class="btn btn-danger btn-small retire-book-btn" data-book-id="${book.book_id}" type="button">Retire</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    async updateBookInventory(bookId, currentCopies) {
        console.log('updateBookInventory called with:', { bookId, currentCopies });
        const newCopies = prompt('Enter new total number of copies:', currentCopies);
        if (newCopies === null) {
            console.log('User cancelled input');
            return;
        }

        const newTotalCopies = parseInt(newCopies);
        if (isNaN(newTotalCopies) || newTotalCopies < 0) {
            console.log('Invalid input:', newCopies);
            this.showToast('Please enter a valid number', 'error');
            return;
        }

        try {
            console.log('Updating inventory:', { bookId, newTotalCopies });
            this.showLoading();
            const response = await this.apiCall(`/api/admin/books/${bookId}/inventory`, 'PUT', {
                newTotalCopies
            });

            if (response.success) {
                console.log('Inventory updated successfully');
                this.showToast('Inventory updated successfully', 'success');
                await this.loadBooks(); // Reload the books list
            }
        } catch (error) {
            console.error('Error updating inventory:', error);
            this.showToast(error.message || 'Failed to update inventory', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async retireBook(bookId) {
        console.log('retireBook called with:', { bookId });
        if (!confirm('Are you sure you want to retire this book? This action cannot be undone.')) {
            console.log('User cancelled retirement');
            return;
        }

        try {
            console.log('Retiring book:', { bookId });
            this.showLoading();
            const response = await this.apiCall(`/api/admin/books/${bookId}/retire`, 'PUT');

            if (response.success) {
                console.log('Book retired successfully');
                this.showToast('Book retired successfully', 'success');
                await this.loadBooks(); // Reload the books list
            }
        } catch (error) {
            console.error('Error retiring book:', error);
            this.showToast(error.message || 'Failed to retire book', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async deleteAuthor(authorId) {
        console.log('Delete author called with ID:', authorId);
        try {
            if (!confirm('Are you sure you want to delete this author? This action cannot be undone.')) {
                return;
            }

            this.showLoading();
            const response = await this.apiCall(`/api/admin/authors/${authorId}`, 'DELETE');

            if (response.success) {
                this.showToast('Author deleted successfully!', 'success');
                await this.loadAdminData(); // Reload all admin data including authors
            } else {
                this.showToast(response.message || 'Failed to delete author', 'error');
            }
        } catch (error) {
            console.error('Error deleting author:', error);
            this.showToast(error.message || 'Failed to delete author', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async editAuthor(authorId) {
        console.log('Edit author called with ID:', authorId);
        try {
            this.showLoading();
            const response = await this.apiCall(`/api/admin/authors/${authorId}`, 'GET');
            console.log('Author details response:', response);

            if (response.success) {
                const author = response.data;
                document.getElementById('edit-author-id').value = author.author_id;
                document.getElementById('edit-author-first-name').value = author.first_name;
                document.getElementById('edit-author-last-name').value = author.last_name;
                document.getElementById('edit-author-birth-date').value = author.birth_date ? author.birth_date.split('T')[0] : '';
                document.getElementById('edit-author-nationality').value = author.nationality || '';
                document.getElementById('edit-author-biography').value = author.biography || '';
                console.log('Showing edit author modal');
                this.showModal('edit-author-modal');
            }
        } catch (error) {
            this.showToast(error.message || 'Failed to load author details', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async handleEditAuthor(e) {
        e.preventDefault();

        try {
            const authorId = document.getElementById('edit-author-id').value;
            const firstName = document.getElementById('edit-author-first-name').value;
            const lastName = document.getElementById('edit-author-last-name').value;
            const birthDate = document.getElementById('edit-author-birth-date').value;
            const nationality = document.getElementById('edit-author-nationality').value;
            const biography = document.getElementById('edit-author-biography').value;

            this.showLoading();
            const response = await this.apiCall(`/api/admin/authors/${authorId}`, 'PUT', {
                firstName,
                lastName,
                birthDate: birthDate || null,
                nationality: nationality || null,
                biography: biography || null
            });

            if (response.success) {
                this.showToast('Author updated successfully', 'success');
                this.hideModal(document.getElementById('edit-author-modal'));
                await this.loadAuthors(); // Reload the authors list
            } else {
                this.showToast(response.message || 'Failed to update author', 'error');
            }
        } catch (error) {
            console.error('Error updating author:', error);
            this.showToast(error.message || 'Failed to update author', 'error');
        } finally {
            this.hideLoading();
        }
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
                                <button class="btn btn-secondary btn-small edit-author-btn" data-author-id="${author.author_id}" type="button">Edit</button>
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

    async loadAllReviews() {
        try {
            const response = await this.apiCall('/api/reviews/recent/list?limit=20', 'GET');
            if (response.success) {
                const container = document.getElementById('all-reviews');
                if (container) {
                    if (response.data.length === 0) {
                        container.innerHTML = '<p class="text-center text-muted">No reviews found</p>';
                    } else {
                        this.renderReviews(response.data, 'all-reviews');
                    }
                }
            }
        } catch (error) {
            console.error('Error loading reviews:', error);
            const reviewsContainer = document.getElementById('all-reviews');
            if (reviewsContainer) {
                reviewsContainer.innerHTML = '<div class="error">Error loading reviews. Please try again later.</div>';
            }
        }
    }

    switchTab(btn) {
        const tabName = btn.getAttribute('data-tab');

        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Update tab panels
        document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
        document.getElementById(`${tabName}-panel`)?.classList.add('active');

        // Load tab-specific data
        if (tabName === 'reviews') {
            // For the main reviews tab
            this.loadAllReviews();
        } else if (this.currentUser?.userType === 'reader') {
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
        } else if (this.currentUser?.userType === 'staff') {
            // Admin subtabs
            switch (tabName) {
                case 'books':
                    this.loadBooks();
                    break;
                case 'authors':
                    this.loadAuthors();
                    break;
                case 'reports':
                    this.loadReportsData();
                    break;
                case 'analytics':
                    this.loadAnalyticsData();
                    break;
            }
        }
    }

    renderReportTable(data, columns) {
        if (!data || data.length === 0) {
            return '<p class="text-muted">No data available</p>';
        }

        return `
            <div class="table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            ${columns.map(col => `<th>${col.header}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(row => `
                            <tr>
                                ${columns.map(col => `<td>${col.render ? col.render(row) : this.escapeHtml(row[col.field] ?? 'N/A')}</td>`).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    renderMostBorrowedBooks(books) {
        if (!books || !books.length) {
            return '<p class="text-muted">No data available</p>';
        }

        return `
            <div class="report-section">
                <h3>Most Borrowed Books (Last 30 Days)</h3>
                <table class="table">
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>Authors</th>
                            <th>Total Checkouts</th>
                            <th>Rating</th>
                            <th>Availability</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${books.map(book => `
                            <tr>
                                <td>${this.escapeHtml(book.title)}</td>
                                <td>${this.escapeHtml(book.authors || 'Unknown')}</td>
                                <td>${book.total_checkouts}</td>
                                <td><span class="stars">${this.renderStars(book.average_rating)}</span></td>
                                <td>${book.available_copies}/${book.total_copies}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    renderTopReaders(readers) {
        if (!readers || !readers.length) {
            return '<p class="text-muted">No data available</p>';
        }

        return `
            <div class="report-section">
                <h3>Top Active Readers</h3>
                <table class="table">
                    <thead>
                        <tr>
                            <th>Reader</th>
                            <th>Total Checkouts</th>
                            <th>Books Returned</th>
                            <th>Active Checkouts</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${readers.map(reader => `
                            <tr>
                                <td>${this.escapeHtml(reader.first_name)} ${this.escapeHtml(reader.last_name)}</td>
                                <td>${reader.total_checkouts}</td>
                                <td>${reader.books_returned}</td>
                                <td>${reader.total_checkouts - reader.books_returned}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    renderLowAvailability(books) {
        if (!books || !books.length) {
            return '<p class="text-muted">No data available</p>';
        }

        return `
            <div class="report-section">
                <h3>Books with Low Availability</h3>
                <table class="table">
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>Authors</th>
                            <th>Available/Total</th>
                            <th>Availability %</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${books.map(book => `
                            <tr>
                                <td>${this.escapeHtml(book.title)}</td>
                                <td>${this.escapeHtml(book.authors || 'Unknown')}</td>
                                <td>${book.available_copies}/${book.total_copies}</td>
                                <td>${((book.available_copies / book.total_copies) * 100).toFixed(1)}%</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    async loadReportsData() {
        const container = document.getElementById('reports-content');
        if (!container) return;

        try {
            container.innerHTML = '<p class="text-center text-muted">Loading reports...</p>';

            const now = new Date();
            const end = now.toISOString().slice(0, 10);
            const startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()).toISOString().slice(0, 10);

            const [mostBorrowed, topReaders, lowAvailability] = await Promise.all([
                this.apiCall(`/api/reports/most-borrowed-books?startDate=${startDate}&endDate=${end}&limit=10`, 'GET'),
                this.apiCall('/api/reports/top-active-readers?limit=10', 'GET'),
                this.apiCall('/api/reports/low-availability-books?threshold=2&limit=10', 'GET')
            ]);

            const createSection = (title, content) => `
                <div class="report-section">
                    <h3>${this.escapeHtml(title)}</h3>
                    ${content}
                </div>
            `;

            const mostBorrowedSection = mostBorrowed.success
                ? this.renderMostBorrowedBooks(mostBorrowed.data.results)
                : '<p class="text-muted">No data available for most borrowed books</p>';

            const topReadersSection = topReaders.success
                ? this.renderTopReaders(topReaders.data.results)
                : '<p class="text-muted">No data available for top readers</p>';

            const lowAvailabilitySection = lowAvailability.success
                ? this.renderLowAvailability(lowAvailability.data.results)
                : '<p class="text-muted">No data available for low availability books</p>';

            container.innerHTML = `
                <div class="reports-container">
                    ${createSection('Most Borrowed Books (Last 30 Days)', mostBorrowedSection)}
                    ${createSection('Top Active Readers', topReadersSection)}
                    ${createSection('Books with Low Availability', lowAvailabilitySection)}
                </div>
            `;

        } catch (error) {
            console.error('Error loading reports:', error);
            container.innerHTML = '<div class="alert alert-danger">Error loading reports. Please try again later.</div>';
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
        try {
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

            console.log('Making API call:', { endpoint, method, options });
            const response = await fetch(endpoint, options);
            const result = await response.json();
            console.log('API response:', result);

            if (!response.ok) {
                throw {
                    status: response.status,
                    message: result.message || 'API call failed',
                    error: result.error
                };
            }

            return result;
        } catch (error) {
            console.error('API call error:', error);
            throw error;
        }
    }

    renderStars(rating) {
        const fullStars = Math.floor(rating);
        const halfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

        return `${'★'.repeat(fullStars)}${halfStar ? '½' : ''}${'☆'.repeat(emptyStars)}`;
    }

    async loadReportsData() {
        const container = document.getElementById('reports-content');
        if (!container) return;

        try {
            this.showLoading();
            const response = await this.apiCall('/api/reports/library-statistics', 'GET');
            if (!response.success) {
                throw new Error('Failed to load reports data');
            }

            const data = response.data;
            container.innerHTML = `
                <div class="reports-grid">
                    <div class="report-section">
                        <h3>Most Borrowed Books</h3>
                        <div class="table-responsive">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>Title</th>
                                        <th>Author</th>
                                        <th>Times Borrowed</th>
                                        <th>Current Availability</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${data.popularBooks?.map(book => `
                                        <tr>
                                            <td>${this.escapeHtml(book.title)}</td>
                                            <td>${this.escapeHtml(book.authors || 'Unknown')}</td>
                                            <td>${book.borrow_count}</td>
                                            <td>${book.available_copies}/${book.total_copies}</td>
                                        </tr>
                                    `).join('') || '<tr><td colspan="4">No data available</td></tr>'}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div class="report-section">
                        <h3>Top Readers</h3>
                        <div class="table-responsive">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>Reader</th>
                                        <th>Books Borrowed</th>
                                        <th>Total Reading Time</th>
                                        <th>Average Rating Given</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${data.activeReaders?.map(reader => `
                                        <tr>
                                            <td>${this.escapeHtml(reader.first_name + ' ' + reader.last_name)}</td>
                                            <td>${reader.books_borrowed}</td>
                                            <td>${this.formatReadingTime(reader.total_reading_time)}</td>
                                            <td>${reader.average_rating ? reader.average_rating.toFixed(1) : 'N/A'}</td>
                                        </tr>
                                    `).join('') || '<tr><td colspan="4">No data available</td></tr>'}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div class="report-section">
                        <h3>Books Running Low</h3>
                        <div class="table-responsive">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>Title</th>
                                        <th>Available Copies</th>
                                        <th>Total Copies</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${data.lowAvailabilityBooks?.map(book => `
                                        <tr>
                                            <td>${this.escapeHtml(book.title)}</td>
                                            <td>${book.available_copies}</td>
                                            <td>${book.total_copies}</td>
                                            <td>
                                                <span class="status-badge ${book.available_copies === 0 ? 'critical' : 'warning'}">
                                                    ${book.available_copies === 0 ? 'Out of Stock' : 'Running Low'}
                                                </span>
                                            </td>
                                        </tr>
                                    `).join('') || '<tr><td colspan="4">No data available</td></tr>'}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error loading reports:', error);
            container.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3>Error Loading Reports</h3>
                    <p>Sorry, we couldn't load the reports data. Please try again later.</p>
                </div>
            `;
        } finally {
            this.hideLoading();
        }

        container.innerHTML = `
            <div class="reports-container">
                ${topReadersSection}
                ${lowAvailabilitySection}
            </div>
        `;
    }

    renderMostBorrowedBooks(books) {
        if (!books || !books.length) {
            return '<p class="text-muted">No data available</p>';
        }

        return `
            <div class="report-section">
                <h3>Most Borrowed Books (Last 30 Days)</h3>
                <table class="table">
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>Authors</th>
                            <th>Total Checkouts</th>
                            <th>Rating</th>
                            <th>Availability</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${books.map(book => `
                            <tr>
                                <td>${this.escapeHtml(book.title)}</td>
                                <td>${this.escapeHtml(book.authors || 'Unknown')}</td>
                                <td>${book.total_checkouts}</td>
                                <td><span class="stars">${this.renderStars(book.average_rating)}</span></td>
                                <td>${book.available_copies}/${book.total_copies}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    renderTopReaders(readers) {
        if (!readers || !readers.length) {
            return '<p class="text-muted">No data available</p>';
        }

        return `
            <div class="report-section">
                <h3>Top Active Readers</h3>
                <table class="table">
                    <thead>
                        <tr>
                            <th>Reader</th>
                            <th>Total Checkouts</th>
                            <th>Books Returned</th>
                            <th>Active Checkouts</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${readers.map(reader => `
                            <tr>
                                <td>${this.escapeHtml(reader.first_name)} ${this.escapeHtml(reader.last_name)}</td>
                                <td>${reader.total_checkouts}</td>
                                <td>${reader.books_returned}</td>
                                <td>${reader.total_checkouts - reader.books_returned}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    renderLowAvailability(books) {
        if (!books || !books.length) {
            return '<p class="text-muted">No data available</p>';
        }

        return `
            <div class="report-section">
                <h3>Books with Low Availability</h3>
                <table class="table">
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>Authors</th>
                            <th>Available/Total</th>
                            <th>Availability %</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${books.map(book => `
                            <tr>
                                <td>${this.escapeHtml(book.title)}</td>
                                <td>${this.escapeHtml(book.authors || 'Unknown')}</td>
                                <td>${book.available_copies}/${book.total_copies}</td>
                                <td>${((book.available_copies / book.total_copies) * 100).toFixed(1)}%</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    async deleteAuthor(authorId) {
        try {
            this.showLoading();
            const response = await this.apiCall(`/api/authors/${authorId}/delete`, 'DELETE');
            if (response.success) {
                this.showToast('Author deleted successfully', 'success');
                this.loadAuthors(); // Reload the authors list
            } else {
                this.showToast(response.message || 'Failed to delete author', 'error');
            }
        } catch (error) {
            console.error('Error deleting author:', error);
            this.showToast('Error deleting author', 'error');
        } finally {
            this.hideLoading();
        }
    }

    // Các phương thức tiện ích
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    renderAuthors(authors, containerId = 'admin-authors-list') {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (!authors || authors.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">No authors found</p>';
            return;
        }

        container.innerHTML = authors.map(author => `
            <div class="author-card">
                <div class="author-info">
                    <h3>${this.escapeHtml(author.first_name)} ${this.escapeHtml(author.last_name)}</h3>
                    <p>${this.escapeHtml(author.biography || 'No biography available')}</p>
                    <p class="text-muted">Books: ${author.book_count || 0}</p>
                </div>
                <div class="author-actions">
                    <button class="btn btn-primary edit-author-btn" data-author-id="${author.author_id}">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-danger delete-author-btn" data-author-id="${author.author_id}">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `).join('');
    }

    async deleteAuthor(authorId) {
        try {
            this.showLoading();
            const response = await this.apiCall(`/api/authors/${authorId}/delete`, 'DELETE');
            if (response.success) {
                this.showToast('Author deleted successfully', 'success');
                await this.loadAdminData(); // Reload the authors list
            } else {
                this.showToast(response.message || 'Failed to delete author', 'error');
            }
        } catch (error) {
            console.error('Error deleting author:', error);
            this.showToast('Error deleting author', 'error');
        } finally {
            this.hideLoading();
        }
    }

    showLoading() {
        const loading = document.getElementById('loading');
        if (loading) loading.style.display = 'flex';
    }

    hideLoading() {
        const loading = document.getElementById('loading');
        if (loading) loading.style.display = 'none';
    }

    static initialize() {
        if (typeof window !== 'undefined' && !window.app) {
            window.app = new SmartLibraryApp();
            console.log('SmartLibrary app initialized');
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    SmartLibraryApp.initialize();
});

// Khởi tạo app khi DOM đã sẵn sàng
document.addEventListener('DOMContentLoaded', () => {
    SmartLibraryApp.initialize();
});

// Khởi tạo app khi DOM đã sẵn sàng
document.addEventListener('DOMContentLoaded', () => {
    SmartLibraryApp.initialize();
});
