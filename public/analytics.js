// Analytics Dashboard JavaScript

document.addEventListener('DOMContentLoaded', () => {
    // Initialize charts
    initializeCharts();
    
    // Load initial data
    loadAnalyticsData();
    
    // Set up real-time updates
    setupWebSocket();
});

// Initialize Chart.js charts
function initializeCharts() {
    // Reading Time Chart
    const readingTimeCtx = document.getElementById('readingTimeChart').getContext('2d');
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

    // Highlights Chart
    const highlightsCtx = document.getElementById('highlightsChart').getContext('2d');
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
}

// Load analytics data from API
async function loadAnalyticsData() {
    try {
        const [readingTime, highlights, progress] = await Promise.all([
            fetch('/api/analytics/reading-time').then(r => r.json()),
            fetch('/api/analytics/highlights').then(r => r.json()),
            fetch('/api/analytics/progress').then(r => r.json())
        ]);

        updateReadingTimeChart(readingTime);
        updateHighlightsChart(highlights);
        updateProgressStats(progress);
    } catch (error) {
        console.error('Error loading analytics:', error);
        showError('Failed to load analytics data');
    }
}

// Update Reading Time Chart
function updateReadingTimeChart(data) {
    window.readingTimeChart.data.labels = data.map(item => item.bookTitle);
    window.readingTimeChart.data.datasets[0].data = data.map(item => item.totalHours);
    window.readingTimeChart.update();
}

// Update Highlights Chart
function updateHighlightsChart(data) {
    window.highlightsChart.data.labels = data.map(item => item.bookTitle);
    window.highlightsChart.data.datasets[0].data = data.map(item => item.highlightCount);
    window.highlightsChart.update();
}

// Update Progress Statistics
function updateProgressStats(data) {
    const statsContainer = document.getElementById('progressStats');
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
}

// Set up WebSocket for real-time updates
function setupWebSocket() {
    const ws = new WebSocket(getWebSocketUrl());
    
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
            case 'reading_update':
                updateReadingTimeChart(data.readingTime);
                break;
            case 'highlights_update':
                updateHighlightsChart(data.highlights);
                break;
            case 'progress_update':
                updateProgressStats(data.progress);
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
