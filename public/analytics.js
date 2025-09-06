// Analytics Dashboard JavaScript

document.addEventListener('DOMContentLoaded', () => {
    console.log('Analytics page loaded');
    
    // Check if Chart.js is loaded
    if (typeof Chart === 'undefined') {
        console.error('Chart.js is not loaded!');
        showError('Chart.js library failed to load. Please refresh the page.');
        return;
    }
    
    console.log('Chart.js version:', Chart.version);
    
    // Initialize charts
    initializeCharts();
    
    // Load initial data after a short delay to ensure charts are ready
    setTimeout(() => {
        loadAnalyticsData();
    }, 100);
    
    // Set up real-time updates
    setupWebSocket();
});

// Initialize Chart.js charts
function initializeCharts() {
    console.log('Initializing charts...');
    
    // Reading Time Chart
    const readingTimeCanvas = document.getElementById('readingTimeChart');
    if (readingTimeCanvas) {
        const readingTimeCtx = readingTimeCanvas.getContext('2d');
        window.readingTimeChart = new Chart(readingTimeCtx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Total Reading Time (hours)',
                    data: [],
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
        console.log('Reading time chart initialized');
    } else {
        console.error('Reading time chart canvas not found');
    }

    // Highlights Chart
    const highlightsCanvas = document.getElementById('highlightsChart');
    if (highlightsCanvas) {
        const highlightsCtx = highlightsCanvas.getContext('2d');
        window.highlightsChart = new Chart(highlightsCtx, {
            type: 'pie',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.5)',
                        'rgba(54, 162, 235, 0.5)',
                        'rgba(255, 206, 86, 0.5)',
                        'rgba(75, 192, 192, 0.5)',
                        'rgba(153, 102, 255, 0.5)'
                    ]
                }]
            },
            options: {
                responsive: true
            }
        });
        console.log('Highlights chart initialized');
    } else {
        console.error('Highlights chart canvas not found');
    }
}

// Load analytics data from API
async function loadAnalyticsData() {
    try {
        console.log('Loading analytics data...');
        
        const [readingTime, highlights, progress] = await Promise.all([
            fetch('/api/analytics/public/reading-time').then(r => {
                console.log('Reading time response status:', r.status);
                if (!r.ok) {
                    throw new Error(`HTTP error! status: ${r.status}`);
                }
                return r.json();
            }).catch(err => {
                console.error('Reading time fetch error:', err);
                return { success: false, message: err.message };
            }),
            fetch('/api/analytics/public/highlights').then(r => {
                console.log('Highlights response status:', r.status);
                if (!r.ok) {
                    throw new Error(`HTTP error! status: ${r.status}`);
                }
                return r.json();
            }).catch(err => {
                console.error('Highlights fetch error:', err);
                return { success: false, message: err.message };
            }),
            fetch('/api/analytics/public/progress').then(r => {
                console.log('Progress response status:', r.status);
                if (!r.ok) {
                    throw new Error(`HTTP error! status: ${r.status}`);
                }
                return r.json();
            }).catch(err => {
                console.error('Progress fetch error:', err);
                return { success: false, message: err.message };
            })
        ]);

        console.log('API responses:', { readingTime, highlights, progress });

        if (readingTime.success) {
            updateReadingTimeChart(readingTime.data);
        } else {
            console.error('Reading time error:', readingTime.message);
            showError('Failed to load reading time data: ' + readingTime.message);
        }

        if (highlights.success) {
            updateHighlightsChart(highlights.data);
        } else {
            console.error('Highlights error:', highlights.message);
            showError('Failed to load highlights data: ' + highlights.message);
        }

        if (progress.success) {
            updateProgressStats(progress.data);
        } else {
            console.error('Progress error:', progress.message);
            showError('Failed to load progress data: ' + progress.message);
        }
    } catch (error) {
        console.error('Error loading analytics:', error);
        showError('Failed to load analytics data: ' + error.message);
    }
}

// Update Reading Time Chart
function updateReadingTimeChart(data) {
    console.log('Updating reading time chart with data:', data);
    
    // Hide loading indicator
    const loadingEl = document.getElementById('readingTimeLoading');
    const chartEl = document.getElementById('readingTimeChart');
    
    if (loadingEl) loadingEl.style.display = 'none';
    if (chartEl) chartEl.style.display = 'block';
    
    if (data && data.length > 0) {
        window.readingTimeChart.data.labels = data.map(item => item.bookTitle);
        window.readingTimeChart.data.datasets[0].data = data.map(item => item.totalHours);
        window.readingTimeChart.update();
    } else {
        console.log('No data for reading time chart');
        // Show no data message
        if (chartEl) {
            chartEl.style.display = 'none';
            if (loadingEl) {
                loadingEl.innerHTML = '<p class="text-muted">No reading time data available</p>';
                loadingEl.style.display = 'block';
            }
        }
    }
}

// Update Highlights Chart
function updateHighlightsChart(data) {
    console.log('Updating highlights chart with data:', data);
    
    // Hide loading indicator
    const loadingEl = document.getElementById('highlightsLoading');
    const chartEl = document.getElementById('highlightsChart');
    
    if (loadingEl) loadingEl.style.display = 'none';
    if (chartEl) chartEl.style.display = 'block';
    
    if (data && data.length > 0) {
        window.highlightsChart.data.labels = data.map(item => item.bookTitle);
        window.highlightsChart.data.datasets[0].data = data.map(item => item.highlightCount);
        window.highlightsChart.update();
    } else {
        console.log('No data for highlights chart');
        // Show no data message
        if (chartEl) {
            chartEl.style.display = 'none';
            if (loadingEl) {
                loadingEl.innerHTML = '<p class="text-muted">No highlights data available</p>';
                loadingEl.style.display = 'block';
            }
        }
    }
}

// Update Progress Statistics
function updateProgressStats(data) {
    console.log('Updating progress stats with data:', data);
    const statsContainer = document.getElementById('progressStats');
    if (data && data.length > 0) {
        statsContainer.innerHTML = data.map(book => `
            <div class="book-progress">
                <h4>${book.title}</h4>
                <div class="progress">
                    <div class="progress-bar" 
                         role="progressbar" 
                         style="width: ${book.averageProgress}%"
                         aria-valuenow="${book.averageProgress}" 
                         aria-valuemin="0" 
                         aria-valuemax="100">
                        ${book.averageProgress}%
                    </div>
                </div>
                <p>Completion rate: ${(book.completionRate * 100).toFixed(1)}%</p>
                <p>Total readers: ${book.totalReaders}</p>
            </div>
        `).join('');
    } else {
        statsContainer.innerHTML = '<p class="text-muted">No progress data available</p>';
    }
}

// Set up WebSocket for real-time updates
function setupWebSocket() {
    const ws = new WebSocket(getWebSocketUrl());
    
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
            case 'reading_update':
                if (data.readingTime && data.readingTime.success) {
                    updateReadingTimeChart(data.readingTime.data);
                }
                break;
            case 'highlights_update':
                if (data.highlights && data.highlights.success) {
                    updateHighlightsChart(data.highlights.data);
                }
                break;
            case 'progress_update':
                if (data.progress && data.progress.success) {
                    updateProgressStats(data.progress.data);
                }
                break;
        }
    };
    
    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setTimeout(setupWebSocket, 5000); // Retry connection after 5 seconds
    };
}

// Helper to show errors
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger';
    errorDiv.textContent = message;
    document.querySelector('.analytics-container').prepend(errorDiv);
    setTimeout(() => errorDiv.remove(), 5000);
}

// Helper to get WebSocket URL
function getWebSocketUrl() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws/analytics`;
}
