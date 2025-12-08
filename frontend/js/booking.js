/**
 * Booking functionality
 */

/**
 * Show toast notification
 */
function showToast(message, icon = 'success') {
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: icon,
            title: message,
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true
        });
    } else {
        // Fallback to alert if SweetAlert2 is not loaded
        alert(message);
    }
}

// Initialize booking page
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('sessions-list')) {
        loadSessions();
    }

    if (document.getElementById('booking-details')) {
        loadBookingDetails();
    }

    if (document.getElementById('my-bookings-list')) {
        loadMyBookings();
    }
});

/**
 * Load all gym sessions
 */
async function loadSessions() {
    const sessionsList = document.getElementById('sessions-list');
    const loading = document.getElementById('loading');
    const errorMsg = document.getElementById('error-message');

    if (loading) loading.style.display = 'block';
    if (errorMsg) errorMsg.style.display = 'none';

    try {
        const response = await apiClient.get('/sessions?future_only=true', false);

        if (loading) loading.style.display = 'none';

        if (response.success && response.data.success) {
            const sessions = response.data.data;
            displaySessions(sessions);
        } else {
            showError(response.data.message || 'Failed to load sessions');
        }
    } catch (error) {
        if (loading) loading.style.display = 'none';
        showError('An error occurred while loading sessions');
        console.error('Error loading sessions:', error);
    }
}

/**
 * Display sessions in the list
 */
function displaySessions(sessions) {
    const sessionsList = document.getElementById('sessions-list');
    if (!sessionsList) return;

    if (sessions.length === 0) {
        sessionsList.innerHTML = '<p class="no-sessions">No upcoming sessions available.</p>';
        return;
    }

    // Default image - you can replace this with a local image path like 'images/default-session.png'
    const defaultImage = 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'400\' height=\'200\'%3E%3Crect width=\'400\' height=\'200\' fill=\'%23e5e7eb\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' text-anchor=\'middle\' dy=\'.3em\' fill=\'%239ca3af\' font-size=\'16\' font-weight=\'bold\'%3EGym Session%3C/text%3E%3C/svg%3E';
    
    sessionsList.innerHTML = sessions.map(session => {
        const imageUrl = session.image || defaultImage;
        return `
        <div class="session-card ${session.is_full ? 'full' : ''}">
            <div class="session-image">
                <img src="${imageUrl}" alt="${escapeHtml(session.name)}" onerror="this.src='${defaultImage}'">
            </div>
            <div class="session-header">
                <h3>${escapeHtml(session.name)}</h3>
                ${session.is_full ? '<span class="badge full-badge">Full</span>' : ''}
            </div>
            <div class="session-details">
                <p><strong>Date:</strong> ${formatDate(session.date)}</p>
                <p><strong>Time:</strong> ${formatTime(session.start_time)} - ${formatTime(session.end_time)}</p>
                <p><strong>Available Spots:</strong> ${session.available_spots} / ${session.capacity}</p>
            </div>
            <div class="session-actions">
                <a href="booking.html?id=${session.id}" class="btn btn-primary ${session.is_full ? 'disabled' : ''}">
                    ${session.is_full ? 'View Details' : 'Book Now'}
                </a>
            </div>
        </div>
    `;
    }).join('');
}

/**
 * Load booking details for a specific session
 */
async function loadBookingDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('id');

    if (!sessionId) {
        window.location.href = 'sessions.html';
        return;
    }

    const bookingDetails = document.getElementById('booking-details');
    const loading = document.getElementById('loading');
    const errorMsg = document.getElementById('error-message');

    if (loading) loading.style.display = 'block';
    if (errorMsg) errorMsg.style.display = 'none';

    try {
        const response = await apiClient.get(`/sessions/${sessionId}`, false);

        if (loading) loading.style.display = 'none';

        if (response.success && response.data.success) {
            const session = response.data.data;
            displayBookingDetails(session);
        } else {
            showError(response.data.message || 'Failed to load session details');
        }
    } catch (error) {
        if (loading) loading.style.display = 'none';
        showError('An error occurred while loading session details');
        console.error('Error loading session details:', error);
    }
}

/**
 * Display booking details
 */
function displayBookingDetails(session) {
    const bookingDetails = document.getElementById('booking-details');
    if (!bookingDetails) return;

    // Default image - you can replace this with a local image path like 'images/default-session.png'
    const defaultImage = 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'800\' height=\'300\'%3E%3Crect width=\'800\' height=\'300\' fill=\'%23e5e7eb\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' text-anchor=\'middle\' dy=\'.3em\' fill=\'%239ca3af\' font-size=\'24\' font-weight=\'bold\'%3EGym Session%3C/text%3E%3C/svg%3E';
    const imageUrl = session.image || defaultImage;

    bookingDetails.innerHTML = `
        <div class="booking-card">
            <div class="session-image" style="width: 100%; height: 300px; overflow: hidden; border-radius: 12px 12px 0 0; margin: -1.5rem -1.5rem 1.5rem -1.5rem; background: #f3f4f6;">
                <img src="${imageUrl}" alt="${escapeHtml(session.name)}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='${defaultImage}'">
            </div>
            <h2>${escapeHtml(session.name)}</h2>
            <div class="booking-info">
                <p><strong>Date:</strong> ${formatDate(session.date)}</p>
                <p><strong>Time:</strong> ${formatTime(session.start_time)} - ${formatTime(session.end_time)}</p>
                <p><strong>Capacity:</strong> ${session.capacity} attendees</p>
                <p><strong>Available Spots:</strong> ${session.available_spots}</p>
                ${session.is_full ? '<p class="warning">This session is full. Platinum members will be added to the queue.</p>' : ''}
            </div>
            <button id="book-btn" class="btn btn-primary ${session.is_full ? 'disabled' : ''}" 
                    onclick="bookSession(${session.id})" ${session.is_full ? 'disabled' : ''}>
                ${session.is_full ? 'Session Full' : 'Book This Session'}
            </button>
        </div>
    `;
}

/**
 * Book a session
 */
async function bookSession(sessionId) {
    if (!apiClient.isAuthenticated()) {
        showToast('Please login to book a session', 'warning');
        window.location.href = 'login.html';
        return;
    }

    const bookBtn = document.getElementById('book-btn');
    if (bookBtn) {
        bookBtn.disabled = true;
        bookBtn.textContent = 'Booking...';
    }

    try {
        const response = await apiClient.post('/bookings', {
            gym_session_id: sessionId
        });

        if (response.success && response.data && response.data.success) {
            showToast(response.data.message || 'Booking created successfully!', 'success');
            // Always go to dashboard to see updated count
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        } else {
            // Show error toast with the message from backend
            let errorMessage = 'Failed to create booking';
            
            // Check for validation errors
            if (response.data?.errors) {
                const errors = response.data.errors;
                const errorList = Object.values(errors).flat().join(', ');
                errorMessage = errorList || response.data?.message || errorMessage;
            } else if (response.data?.message) {
                errorMessage = response.data.message;
            } else if (response.data?.error) {
                errorMessage = response.data.error;
            }
            
            console.error('Booking failed:', errorMessage);
            showToast(errorMessage, 'error');
            
            if (bookBtn) {
                bookBtn.disabled = false;
                bookBtn.textContent = 'Book This Session';
            }
        }
    } catch (error) {
        // Handle network errors or other exceptions
        const errorMessage = error.response?.data?.message || 
                           error.data?.message || 
                           error.message ||
                           'An error occurred while booking';
        console.error('Booking exception:', error.message);
        showToast(errorMessage, 'error');
        if (bookBtn) {
            bookBtn.disabled = false;
            bookBtn.textContent = 'Book This Session';
        }
    }
}

/**
 * Load user's bookings
 */
async function loadMyBookings() {
    if (!apiClient.isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }

    const bookingsList = document.getElementById('my-bookings-list');
    const loading = document.getElementById('loading');
    const errorMsg = document.getElementById('error-message');

    if (loading) loading.style.display = 'block';
    if (errorMsg) errorMsg.style.display = 'none';

    try {
        const response = await apiClient.get('/bookings/me');

        if (loading) loading.style.display = 'none';

        if (response.success && response.data.success) {
            const bookings = response.data.data;
            displayMyBookings(bookings);
        } else {
            showError(response.data.message || 'Failed to load bookings');
        }
    } catch (error) {
        if (loading) loading.style.display = 'none';
        showError('An error occurred while loading bookings');
        console.error('Error loading bookings:', error);
    }
}

/**
 * Display user's bookings
 */
function displayMyBookings(bookings) {
    const bookingsList = document.getElementById('my-bookings-list');
    if (!bookingsList) return;

    if (bookings.length === 0) {
        bookingsList.innerHTML = '<p class="no-bookings">You have no bookings yet. <a href="sessions.html">Browse sessions</a></p>';
        return;
    }

    // Default image for sessions
    const defaultImage = 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'400\' height=\'200\'%3E%3Crect width=\'400\' height=\'200\' fill=\'%23e5e7eb\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' text-anchor=\'middle\' dy=\'.3em\' fill=\'%239ca3af\' font-size=\'16\' font-weight=\'bold\'%3EGym Session%3C/text%3E%3C/svg%3E';
    
    bookingsList.innerHTML = bookings.map(booking => {
        const imageUrl = booking.gym_session?.image || defaultImage;
        return `
        <div class="booking-card ${booking.status === 'queued' ? 'queued' : ''} ${booking.status === 'pending' ? 'pending' : ''}">
            <div class="session-image" style="width: 100%; height: 150px; overflow: hidden; border-radius: 12px 12px 0 0; margin: -1.5rem -1.5rem 1rem -1.5rem; background: #f3f4f6;">
                <img src="${imageUrl}" alt="${escapeHtml(booking.gym_session.name)}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='${defaultImage}'">
            </div>
            <div class="booking-header">
                <h3>${escapeHtml(booking.gym_session.name)}</h3>
                ${booking.status === 'queued' ? '<span class="badge queue-badge">In Queue</span>' : 
                  booking.status === 'pending' ? '<span class="badge pending-badge">Pending</span>' : 
                  '<span class="badge confirmed-badge">Confirmed</span>'}
            </div>
            <div class="booking-info">
                <p><strong>Date:</strong> ${formatDate(booking.gym_session.date)}</p>
                <p><strong>Time:</strong> ${formatTime(booking.gym_session.start_time)} - ${formatTime(booking.gym_session.end_time)}</p>
                <p><strong>Booked on:</strong> ${formatDateTime(booking.created_at)}</p>
            </div>
            ${booking.status === 'pending' || booking.status === 'queued' ? `
            <div class="booking-actions">
                <button class="btn btn-danger" onclick="cancelBooking(${booking.id})">Cancel Booking</button>
            </div>
            ` : ''}
        </div>
    `;
    }).join('');
}

/**
 * Cancel a booking
 */
async function cancelBooking(bookingId) {
    if (typeof Swal !== 'undefined') {
        const result = await Swal.fire({
            title: 'Cancel Booking?',
            text: 'Are you sure you want to cancel this booking?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, cancel it!'
        });

        if (!result.isConfirmed) {
            return;
        }
    } else {
        if (!confirm('Are you sure you want to cancel this booking?')) {
            return;
        }
    }

    try {
        const response = await apiClient.delete(`/bookings/${bookingId}`);

        if (response.success && response.data.success) {
            showToast(response.data.message || 'Booking cancelled successfully', 'success');
            loadMyBookings(); // Reload the list
        } else {
            showToast(response.data.message || 'Failed to cancel booking', 'error');
        }
    } catch (error) {
        showToast('An error occurred while cancelling booking', 'error');
        console.error('Error cancelling booking:', error);
    }
}

/**
 * Utility functions
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function formatTime(timeString) {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
}

function formatDateTime(dateTimeString) {
    const date = new Date(dateTimeString);
    return date.toLocaleString('en-US');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showError(message) {
    const errorMsg = document.getElementById('error-message');
    if (errorMsg) {
        errorMsg.textContent = message;
        errorMsg.style.display = 'block';
    }
}




