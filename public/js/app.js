// UptimeMonitor Frontend JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Handle "Check Now" buttons
    const checkNowButtons = document.querySelectorAll('.check-now');
    checkNowButtons.forEach(button => {
        button.addEventListener('click', async function() {
            const websiteId = this.dataset.id;
            const originalText = this.textContent;

            this.textContent = 'Checking...';
            this.disabled = true;

            try {
                const response = await fetch(`/websites/${websiteId}/check`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                const data = await response.json();

                if (data.success) {
                    // Reload the page to show updated status
                    window.location.reload();
                } else {
                    alert('Failed to check website: ' + (data.error || 'Unknown error'));
                }
            } catch (error) {
                alert('Error checking website: ' + error.message);
            } finally {
                this.textContent = originalText;
                this.disabled = false;
            }
        });
    });

    // Auto-refresh dashboard every 60 seconds
    if (window.location.pathname === '/dashboard') {
        setInterval(async () => {
            try {
                const response = await fetch('/dashboard/api/stats');
                const data = await response.json();

                // Update stats cards
                const statCards = document.querySelectorAll('.stats-grid .stat-card');
                if (statCards.length >= 3) {
                    statCards[0].querySelector('.stat-value').textContent = data.total;
                    statCards[1].querySelector('.stat-value').textContent = data.up;
                    statCards[2].querySelector('.stat-value').textContent = data.down;
                }

                // Update website cards status
                data.websites.forEach(website => {
                    const card = document.querySelector(`.website-card[data-id="${website.id}"]`);
                    if (card) {
                        card.classList.remove('up', 'down');
                        card.classList.add(website.is_up ? 'up' : 'down');

                        const statusIndicator = card.querySelector('.status-indicator');
                        if (statusIndicator) {
                            statusIndicator.classList.remove('status-up', 'status-down');
                            statusIndicator.classList.add(website.is_up ? 'status-up' : 'status-down');
                        }

                        const statusText = card.querySelector('.website-status');
                        if (statusText) {
                            statusText.innerHTML = `
                                <span class="status-indicator ${website.is_up ? 'status-up' : 'status-down'}"></span>
                                ${website.is_up ? 'Up' : 'Down'}
                            `;
                        }
                    }
                });
            } catch (error) {
                console.error('Failed to refresh stats:', error);
            }
        }, 60000); // Every 60 seconds
    }

    // Format dates to local time
    document.querySelectorAll('[data-timestamp]').forEach(el => {
        const timestamp = el.dataset.timestamp;
        if (timestamp) {
            el.textContent = new Date(timestamp).toLocaleString();
        }
    });

    // Confirm delete actions
    document.querySelectorAll('form[data-confirm]').forEach(form => {
        form.addEventListener('submit', function(e) {
            const message = this.dataset.confirm || 'Are you sure?';
            if (!confirm(message)) {
                e.preventDefault();
            }
        });
    });
});

// Helper function to format duration
function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
}

// Helper function to format relative time
function formatRelativeTime(date) {
    const now = new Date();
    const diff = now - new Date(date);

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
}
