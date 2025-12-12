/**
 * Membership level functionality
 */

/**
 * Load membership levels
 */
async function loadMembershipLevels() {
    try {
        const response = await apiClient.get('/membership-levels', false);

        if (response.success && response.data.success) {
            return response.data.data;
        }
        return [];
    } catch (error) {
        console.error('Error loading membership levels:', error);
        return [];
    }
}

/**
 * Get user's current membership level
 */
async function getUserMembershipLevel() {
    if (!apiClient.isAuthenticated()) {
        return null;
    }

    try {
        const response = await apiClient.get('/user');

        if (response.success && response.data.success) {
            return response.data.data.user.membership_level;
        }
        return null;
    } catch (error) {
        console.error('Error loading user membership level:', error);
        return null;
    }
}

/**
 * Get user's weekly booking count
 * Counts all pending and confirmed bookings
 */
async function getWeeklyBookingCount() {
    if (!apiClient.isAuthenticated()) {
        return 0;
    }

    try {
        const response = await apiClient.get('/bookings/me');
        
        if (response && response.success && response.data && response.data.success) {
            const bookings = response.data.data;
            
            if (!Array.isArray(bookings) || bookings.length === 0) {
                return 0;
            }

            // Count all pending and confirmed bookings (excluding cancelled)
            const weeklyCount = bookings.filter(booking => {
                if (!booking || !booking.gym_session) {
                    return false;
                }
                // Count pending, confirmed, and queued bookings
                return booking.status === 'confirmed' || 
                       booking.status === 'pending' || 
                       booking.status === 'queued';
            }).length;
            
            return weeklyCount;
        }
        return 0;
    } catch (error) {
        console.error('Error loading weekly booking count:', error);
        return 0;
    }
}

/**
 * Display membership info on dashboard
 */
async function displayMembershipInfo() {
    const membershipInfo = document.getElementById('membership-info');
    if (!membershipInfo) return;

    // Get full user data to access subscription info
    let user = null;
    try {
        const userResponse = await apiClient.get('/user');
        if (userResponse.success && userResponse.data.success) {
            user = userResponse.data.data.user;
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }

    const membershipLevel = user?.membership_level || await getUserMembershipLevel();
    const weeklyCount = await getWeeklyBookingCount();

    if (!membershipLevel) {
        membershipInfo.innerHTML = `
            <div class="membership-card" style="background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h3 style="margin-top: 0; color: #1f2937;">No Membership</h3>
                <p style="color: #6b7280; margin: 0;">You don't have a membership level assigned. Please contact admin.</p>
            </div>
        `;
        return;
    }

    const limitText = membershipLevel.weekly_limit === null 
        ? 'Unlimited' 
        : `${weeklyCount} / ${membershipLevel.weekly_limit}`;

    const membershipColors = {
        'free': { bg: '#f3f4f6', border: '#9ca3af' },
        'silver': { bg: '#e5e7eb', border: '#6b7280' },
        'gold': { bg: '#fef3c7', border: '#f59e0b' },
        'platinum': { bg: '#dbeafe', border: '#3b82f6' }
    };

    const color = membershipColors[membershipLevel.name.toLowerCase()] || membershipColors.free;

    // Subscription expiry information
    let subscriptionHtml = '';
    if (user) {
        if (!user.subscription_expires_at) {
            subscriptionHtml = `
                <p style="margin: 0.5rem 0; color: #374151;">
                    <strong>Subscription:</strong> 
                    <span style="color: #10b981; font-weight: 600;">No Expiry</span>
                </p>
            `;
        } else {
            const expiryDate = new Date(user.subscription_expires_at);
            const formattedDate = expiryDate.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
            const daysUntil = user.days_until_expiry;
            
            let statusColor = '#10b981';
            let statusText = 'Active';
            let warningHtml = '';
            
            if (daysUntil === 0 || expiryDate < new Date()) {
                statusColor = '#ef4444';
                statusText = 'Expired';
                warningHtml = `
                    <div style="margin-top: 1rem; padding: 1rem; background: #fee2e2; border-left: 4px solid #ef4444; border-radius: 4px;">
                        <p style="margin: 0; color: #991b1b; font-weight: 600;">⚠️ Your subscription has expired!</p>
                        <p style="margin: 0.5rem 0 0 0; color: #7f1d1d; font-size: 0.9rem;">Please renew your membership to continue booking sessions.</p>
                    </div>
                `;
            } else if (user.subscription_expiring_soon) {
                statusColor = '#f59e0b';
                statusText = `Expiring Soon (${daysUntil} days)`;
                warningHtml = `
                    <div style="margin-top: 1rem; padding: 1rem; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
                        <p style="margin: 0; color: #92400e; font-weight: 600;">⚠️ Your subscription expires in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}!</p>
                        <p style="margin: 0.5rem 0 0 0; color: #78350f; font-size: 0.9rem;">Please renew your membership soon to avoid interruption.</p>
                    </div>
                `;
            } else {
                statusText = `${daysUntil} days remaining`;
            }
            
            subscriptionHtml = `
                <p style="margin: 0.5rem 0; color: #374151;">
                    <strong>Subscription Expires:</strong> 
                    <span style="color: ${statusColor}; font-weight: 600;">${statusText}</span>
                </p>
                <p style="margin: 0.25rem 0 0.5rem 0; color: #6b7280; font-size: 0.9rem;">Expiry Date: ${formattedDate}</p>
                ${warningHtml}
            `;
        }
    }

    membershipInfo.innerHTML = `
        <div class="membership-card" style="background: ${color.bg}; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); border-left: 4px solid ${color.border};">
            <h3 style="margin-top: 0; color: #1f2937; font-size: 1.5rem;">${escapeHtml(membershipLevel.name)} Membership</h3>
            <div class="membership-details" style="margin-top: 1rem;">
                <p style="margin: 0.5rem 0; color: #374151;"><strong>Weekly Limit:</strong> ${limitText}</p>
                ${subscriptionHtml}
                ${membershipLevel.priority === 1 ? '<p style="margin: 0.5rem 0; padding: 0.5rem; background: #3b82f6; color: white; border-radius: 4px; display: inline-block; font-weight: 600;">⭐ Priority Queue Enabled</p>' : ''}
            </div>
        </div>
    `;
}

/**
 * Utility function
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}




