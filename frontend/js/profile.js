// ========================================
// Configuration
// ========================================
// Note: API_BASE_URL is defined in app.js, don't redeclare it here

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user_data';
const DEFAULT_AVATAR = 'images/default-avatar.png';

// Global variables
let currentProfilePicture = null;

// ========================================
// API Client Configuration
// ========================================
// Using apiClient from app.js (jQuery-based)

// ========================================
// Utility Functions
// ========================================

function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

function getUser() {
    const user = localStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
}

function clearAuth() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
}

function showToast(message, icon = 'success') {
    Swal.fire({
        toast: true,
        position: 'top-end',
        icon: icon,
        title: message,
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true
    });
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

// ========================================
// Theme Toggle
// ========================================

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function updateThemeIcon(theme) {
    const sunIcon = document.getElementById('sunIconProfile');
    const moonIcon = document.getElementById('moonIconProfile');
    
    if (sunIcon && moonIcon) {
        if (theme === 'dark') {
            sunIcon.classList.add('hidden');
            moonIcon.classList.remove('hidden');
        } else {
            sunIcon.classList.remove('hidden');
            moonIcon.classList.add('hidden');
        }
    }
}

const themeToggle = document.getElementById('themeToggleProfile');
if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.body.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.body.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
    });
}

// ========================================
// Check Authentication
// ========================================

async function checkAuth() {
    // Check if apiClient is available
    if (typeof apiClient === 'undefined') {
        console.error('apiClient is not defined');
        return false;
    }
    
    if (!apiClient.isAuthenticated()) {
        console.log('User is not authenticated, redirecting to login...');
        window.location.href = 'login.html';
        return false;
    }
    
    try {
        const response = await apiClient.get('/user');
        console.log('Auth check response:', response);
        
        if (response.success && response.data) {
            // /user returns: { success: true, data: { user: { ... } } }
            // apiClient wraps it: { success: true, status: 200, data: { success: true, data: { user: { ... } } } }
            const user = response.data.data?.user || response.data.user;
            if (user) {
            // Store user with role for navigation
            localStorage.setItem(USER_KEY, JSON.stringify(user));
            return true;
            }
        }
        
        console.warn('Auth check failed - response not successful');
        return false;
    } catch (error) {
        console.error('Auth check error:', error);
        // Don't redirect immediately - might be a network issue
        // Check if we have cached user data
        const cachedUser = getUser();
        if (cachedUser && cachedUser.firstname) {
            console.log('Using cached user data due to API error');
            return true; // Allow page to load with cached data
        }
        
        // Only redirect if we have no cached data
        apiClient.removeToken();
        clearAuth();
        showToast('Session expired. Please login again.', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
        return false;
    }
}

// ========================================
// Load User Profile
// ========================================

async function loadUserProfile() {
    console.log('=== loadUserProfile START ===');
    
    const user = getUser();
    console.log('Cached user:', user);
    
    // Display cached data first immediately
    if (user && user.firstname) {
        console.log('Displaying cached user immediately:', user);
        displayUserInfo(user);
    } else {
        console.warn('No cached user data found');
    }
    
    // Fetch fresh data from /profile endpoint (includes profile_picture)
    try {
        console.log('Attempting to fetch from /profile endpoint...');
        const response = await apiClient.get('/profile');
        
        console.log('Profile response:', response);
        console.log('Response success:', response.success);
        console.log('Response data:', response.data);
        
        if (response && response.success && response.data) {
            // /profile returns: { success: true, data: { id, firstname, ... } }
            // apiClient wraps it: { success: true, status: 200, data: { success: true, data: { id, firstname, ... } } }
            const freshUser = response.data.data || response.data;
            console.log('Fresh user data received:', freshUser);
            
            if (freshUser && freshUser.firstname) {
            localStorage.setItem(USER_KEY, JSON.stringify(freshUser));
            displayUserInfo(freshUser);
            console.log('=== loadUserProfile SUCCESS (from /profile) ===');
            return;
            } else {
                console.warn('Profile endpoint returned invalid user data:', freshUser);
            }
        } else {
            console.warn('Profile endpoint returned unsuccessful response:', response);
        }
    } catch (error) {
        console.error('Error fetching from /profile:', error);
        console.error('Error details:', {
            message: error.message,
            data: error.data,
            status: error.status
        });
    }
    
    // Fallback to /user endpoint
    try {
        console.log('Attempting to fetch from /user endpoint (fallback)...');
        const userResponse = await apiClient.get('/user');
        console.log('User endpoint response:', userResponse);
        console.log('User response success:', userResponse.success);
        console.log('User response data:', userResponse.data);
        
        if (userResponse && userResponse.success && userResponse.data) {
            // /user returns: { success: true, data: { user: { id, firstname, ... } } }
            // apiClient wraps it: { success: true, status: 200, data: { success: true, data: { user: { ... } } } }
            const freshUser = userResponse.data.data?.user || userResponse.data.user || userResponse.data;
            console.log('User from /user endpoint:', freshUser);
            
            if (freshUser && freshUser.firstname) {
            // Merge with existing user data to preserve profile_picture
            const existingUser = getUser();
            const mergedUser = {
                ...freshUser,
                profile_picture: freshUser.profile_picture || existingUser?.profile_picture || null
            };
            
            console.log('Merged user data:', mergedUser);
            localStorage.setItem(USER_KEY, JSON.stringify(mergedUser));
            displayUserInfo(mergedUser);
            console.log('=== loadUserProfile SUCCESS (from /user) ===');
            return;
        } else {
                console.error('User endpoint returned invalid user data:', freshUser);
            }
            } else {
            console.error('User endpoint returned unsuccessful response:', userResponse);
        }
    } catch (userError) {
        console.error('Error fetching from /user:', userError);
        console.error('Error details:', {
            message: userError.message,
            data: userError.data,
            status: userError.status
        });
    }
    
    // If we get here, both API calls failed - use cached data if available
        if (user && user.firstname) {
        console.log('Using cached data due to API failure');
            displayUserInfo(user);
        } else {
            console.error('No cached data available, showing error');
            showToast('Failed to load profile data. Please refresh the page.', 'error');
    }
    
    console.log('=== loadUserProfile END ===');
}

// ========================================
// Display User Information
// ========================================

function displayUserInfo(user) {
    console.log('=== displayUserInfo START ===');
    console.log('User data:', user);
    
    if (!user) {
        console.error('displayUserInfo called with no user data');
        return;
    }
    
    try {
        // Build full name
        let fullName = user.firstname || '';
        if (user.middlename) {
            fullName += ' ' + user.middlename;
        }
        if (user.lastname) {
            fullName += ' ' + user.lastname;
        }
        
        console.log('Full name:', fullName);
        
        // Profile header
        const nameDisplay = document.getElementById('profileNameDisplay');
        const emailDisplay = document.getElementById('profileEmailDisplay');
        
        console.log('Name display element:', nameDisplay);
        console.log('Email display element:', emailDisplay);
        
        if (nameDisplay) {
            nameDisplay.textContent = fullName || 'User';
            console.log('Set name display to:', fullName || 'User');
        } else {
            console.error('profileNameDisplay element not found!');
        }
        
        if (emailDisplay) {
            emailDisplay.textContent = user.email || 'No email';
            console.log('Set email display to:', user.email || 'No email');
        } else {
            console.error('profileEmailDisplay element not found!');
        }
        
        // Profile info section
        const infoName = document.getElementById('infoName');
        const infoEmail = document.getElementById('infoEmail');
        
        console.log('Info name element:', infoName);
        console.log('Info email element:', infoEmail);
        
        if (infoName) {
            infoName.textContent = fullName || 'User';
            console.log('Set info name to:', fullName || 'User');
        } else {
            console.error('infoName element not found!');
        }
        
        if (infoEmail) {
            infoEmail.textContent = user.email || 'No email';
            console.log('Set info email to:', user.email || 'No email');
        } else {
            console.error('infoEmail element not found!');
        }
        
        // Format created date
        const infoCreatedAt = document.getElementById('infoCreatedAt');
        if (infoCreatedAt) {
            if (user.created_at) {
                infoCreatedAt.textContent = formatDate(user.created_at);
                console.log('Set created date to:', formatDate(user.created_at));
            } else {
                infoCreatedAt.textContent = 'N/A';
                console.log('Set created date to: N/A');
            }
        } else {
            console.error('infoCreatedAt element not found!');
        }
        
        // Profile picture
        const profilePicDisplay = document.getElementById('profilePictureDisplay');
        if (profilePicDisplay) {
            if (user.profile_picture) {
                profilePicDisplay.src = user.profile_picture;
                currentProfilePicture = user.profile_picture;
                console.log('Set profile picture to:', user.profile_picture);
            } else {
                profilePicDisplay.src = DEFAULT_AVATAR;
                currentProfilePicture = null;
                console.log('Set profile picture to default avatar');
            }
            
            profilePicDisplay.onerror = function() {
                console.warn('Profile picture failed to load, using default');
                this.src = DEFAULT_AVATAR;
            };
        } else {
            console.error('profilePictureDisplay element not found!');
        }

        // Membership and Subscription Information
        const membershipInfoRow = document.getElementById('membershipInfoRow');
        const subscriptionInfoRow = document.getElementById('subscriptionInfoRow');
        const subscriptionWarning = document.getElementById('subscriptionWarning');
        
        if (user.membership_level) {
            // Show membership level
            if (membershipInfoRow) {
                membershipInfoRow.style.display = 'flex';
                const infoMembershipLevel = document.getElementById('infoMembershipLevel');
                if (infoMembershipLevel) {
                    infoMembershipLevel.textContent = user.membership_level.name || 'N/A';
                }
            }

            // Show subscription expiry
            if (subscriptionInfoRow) {
                subscriptionInfoRow.style.display = 'flex';
                const infoSubscriptionExpiry = document.getElementById('infoSubscriptionExpiry');
                
                if (!user.subscription_expires_at) {
                    if (infoSubscriptionExpiry) {
                        infoSubscriptionExpiry.innerHTML = '<span style="color: #10b981; font-weight: 600;">No Expiry</span>';
                    }
                } else {
                    const expiryDate = new Date(user.subscription_expires_at);
                    const formattedDate = formatDate(user.subscription_expires_at);
                    const daysUntil = user.days_until_expiry ? Math.floor(user.days_until_expiry) : null;
                    
                    let statusColor = '#10b981';
                    let statusText = 'Active';
                    
                    if (daysUntil === 0 || expiryDate < new Date()) {
                        statusColor = '#ef4444';
                        statusText = 'Expired';
                    } else if (user.subscription_expiring_soon) {
                        statusColor = '#f59e0b';
                        statusText = `Expiring Soon (${daysUntil} days)`;
                    } else {
                        statusText = `${daysUntil} days remaining`;
                    }
                    
                    if (infoSubscriptionExpiry) {
                        infoSubscriptionExpiry.innerHTML = `
                            <div>
                                <span style="color: ${statusColor}; font-weight: 600;">${statusText}</span>
                                <br>
                                <small style="color: #6b7280; font-size: 0.85rem;">${formattedDate}</small>
                            </div>
                        `;
                    }

                    // Show warning if expiring soon or expired
                    if (subscriptionWarning) {
                        if (daysUntil === 0 || expiryDate < new Date()) {
                            subscriptionWarning.style.display = 'block';
                            subscriptionWarning.innerHTML = `
                                <div style="padding: 1rem; background: #fee2e2; border-left: 4px solid #ef4444; border-radius: 4px;">
                                    <p style="margin: 0; color: #991b1b; font-weight: 600;">⚠️ Your subscription has expired!</p>
                                    <p style="margin: 0.5rem 0 0 0; color: #7f1d1d; font-size: 0.9rem;">Please renew your membership to continue booking sessions.</p>
                                </div>
                            `;
                        } else if (user.subscription_expiring_soon) {
                            subscriptionWarning.style.display = 'block';
                            subscriptionWarning.innerHTML = `
                                <div style="padding: 1rem; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
                                    <p style="margin: 0; color: #92400e; font-weight: 600;">⚠️ Your subscription expires in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}!</p>
                                    <p style="margin: 0.5rem 0 0 0; color: #78350f; font-size: 0.9rem;">Please renew your membership soon to avoid interruption.</p>
                                </div>
                            `;
                        } else {
                            subscriptionWarning.style.display = 'none';
                        }
                    }
                }
            }
        } else {
            // Hide membership and subscription rows if no membership
            if (membershipInfoRow) membershipInfoRow.style.display = 'none';
            if (subscriptionInfoRow) subscriptionInfoRow.style.display = 'none';
            if (subscriptionWarning) subscriptionWarning.style.display = 'none';
        }
        
        console.log('=== displayUserInfo SUCCESS ===');
    } catch (error) {
        console.error('Error displaying user info:', error);
        console.error('Error stack:', error.stack);
        showToast('Error displaying profile information', 'error');
    }
}

// ========================================
// Load Contact Statistics (Removed)
// ========================================
// Statistics section removed from profile page

// ========================================
// Logout Handler
// ========================================

async function handleLogout() {
    const result = await Swal.fire({
        title: 'Logout?',
        text: 'Are you sure you want to logout?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes, logout',
        cancelButtonText: 'Cancel'
    });
    
    if (result.isConfirmed) {
        try {
            await apiClient.post('/logout');
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            apiClient.removeToken();
            clearAuth();
            showToast('Logged out successfully', 'success');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1000);
        }
    }
}

const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
}

// ========================================
// Edit Profile Modal
// ========================================

function openEditProfileModal() {
    const user = getUser();
    
    if (user) {
        // Populate firstname
        document.getElementById('editFirstname').value = user.firstname || '';
        // Populate lastname
        document.getElementById('editLastname').value = user.lastname || '';
        // Populate middlename
        document.getElementById('editMiddlename').value = user.middlename || '';
        // Email is not editable in your backend, but we can display it
        document.getElementById('editEmail').value = user.email || '';
    }
    
    const modal = document.getElementById('editProfileModal');
    modal.classList.add('show');
}

function closeEditProfileModal() {
    const modal = document.getElementById('editProfileModal');
    modal.classList.remove('show');
    document.getElementById('editProfileForm').reset();
}

// Close modal when clicking outside
const editProfileModal = document.getElementById('editProfileModal');
if (editProfileModal) {
    editProfileModal.addEventListener('click', (e) => {
        if (e.target.id === 'editProfileModal') {
            closeEditProfileModal();
        }
    });
}

window.closeEditProfileModal = closeEditProfileModal;

// ========================================
// Save Profile
// ========================================

const saveProfileBtn = document.getElementById('saveProfileBtn');
if (saveProfileBtn) {
    saveProfileBtn.addEventListener('click', async () => {
        const firstname = document.getElementById('editFirstname').value.trim();
        const lastname = document.getElementById('editLastname').value.trim();
        const middlename = document.getElementById('editMiddlename').value.trim();
        
        if (!firstname) {
            showToast('Please enter your first name', 'error');
            return;
        }
        
        if (!lastname) {
            showToast('Please enter your last name', 'error');
            return;
        }
        
        const profileData = {
            firstname: firstname,
            lastname: lastname,
            middlename: middlename || null
        };
        
        console.log('Sending profile data:', profileData);
        
        saveProfileBtn.classList.add('btn-loading');
        saveProfileBtn.disabled = true;
        
        try {
            const response = await apiClient.put('/profile', profileData);
            
            console.log('Profile update response:', response.data);
            
            if (response.success && response.data.success) {
                // Update local storage with full user data from response
                const updatedUser = response.data.data;
                const user = getUser();
                user.firstname = updatedUser.firstname;
                user.lastname = updatedUser.lastname;
                user.middlename = updatedUser.middlename;
                user.email = updatedUser.email;
                user.profile_picture = updatedUser.profile_picture;
                user.id = updatedUser.id;
                user.is_verified = updatedUser.is_verified;
                user.created_at = updatedUser.created_at;
                localStorage.setItem(USER_KEY, JSON.stringify(user));
                
                showToast('Profile updated successfully', 'success');
                closeEditProfileModal();
                displayUserInfo(user);
            } else {
                showToast(response.data?.message || 'Failed to update profile', 'error');
            }
        } catch (error) {
            console.error('Update profile error:', error);
            console.error('Error response:', error);
            
            // Show specific error message
            let message = 'Failed to update profile';
            if (error.data?.message) {
                message = error.data.message;
            } else if (error.data?.errors) {
                const errors = error.data.errors;
                const firstError = Object.values(errors)[0];
                message = Array.isArray(firstError) ? firstError[0] : firstError;
            }
            showToast(message, 'error');
        } finally {
            saveProfileBtn.classList.remove('btn-loading');
            saveProfileBtn.disabled = false;
        }
    });
}

// Edit profile button
const editProfileBtn = document.getElementById('editProfileBtn');
if (editProfileBtn) {
    editProfileBtn.addEventListener('click', openEditProfileModal);
}

// ========================================
// Change Password Modal
// ========================================

function openChangePasswordModal() {
    document.getElementById('changePasswordModal').classList.add('show');
}

function closeChangePasswordModal() {
    const modal = document.getElementById('changePasswordModal');
    modal.classList.remove('show');
    document.getElementById('changePasswordForm').reset();
}

// Close modal when clicking outside
const changePasswordModal = document.getElementById('changePasswordModal');
if (changePasswordModal) {
    changePasswordModal.addEventListener('click', (e) => {
        if (e.target.id === 'changePasswordModal') {
            closeChangePasswordModal();
        }
    });
}

window.closeChangePasswordModal = closeChangePasswordModal;

// ========================================
// Change Password
// ========================================

const savePasswordBtn = document.getElementById('savePasswordBtn');
if (savePasswordBtn) {
    savePasswordBtn.addEventListener('click', async () => {
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        if (!currentPassword || !newPassword || !confirmPassword) {
            showToast('Please fill in all fields', 'error');
            return;
        }
        
        if (newPassword.length < 8) {
            showToast('New password must be at least 8 characters', 'error');
            return;
        }
        
        if (newPassword !== confirmPassword) {
            showToast('New passwords do not match', 'error');
            return;
        }
        
        const passwordData = {
            current_password: currentPassword,
            new_password: newPassword,
            new_password_confirmation: confirmPassword
        };
        
        savePasswordBtn.classList.add('btn-loading');
        savePasswordBtn.disabled = true;
        
        try {
            // Use POST /profile/change-password instead of PUT /user/password
            const response = await apiClient.post('/profile/change-password', passwordData);
            
            if (response.success && response.data.success) {
                showToast('Password changed successfully', 'success');
                closeChangePasswordModal();
            } else {
                showToast(response.data?.message || 'Failed to change password', 'error');
            }
        } catch (error) {
            console.error('Change password error:', error);
            const message = error.data?.message || 'Failed to change password';
            showToast(message, 'error');
        } finally {
            savePasswordBtn.classList.remove('btn-loading');
            savePasswordBtn.disabled = false;
        }
    });
}

// Change password button
const changePasswordBtn = document.getElementById('changePasswordBtn');
if (changePasswordBtn) {
    changePasswordBtn.addEventListener('click', openChangePasswordModal);
}

// ========================================
// Profile Picture Upload
// ========================================

const editProfilePicBtn = document.getElementById('editProfilePicBtn');
const profilePictureInput = document.getElementById('profilePictureInput');

if (editProfilePicBtn && profilePictureInput) {
    editProfilePicBtn.addEventListener('click', () => {
        profilePictureInput.click();
    });
    
    profilePictureInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        
        if (!file) return;
        
        if (!file.type.startsWith('image/')) {
            showToast('Please select an image file', 'error');
            profilePictureInput.value = '';
            return;
        }
        
        if (file.size > 2 * 1024 * 1024) {
            showToast('Image size should be less than 2MB', 'error');
            profilePictureInput.value = '';
            return;
        }
        
        const reader = new FileReader();
        reader.onload = async (event) => {
            const base64Image = event.target.result;
            
            // Preview image immediately
            document.getElementById('profilePictureDisplay').src = base64Image;
            
            // Upload to server
            await uploadProfilePicture(base64Image);
            
            // Reset file input
            profilePictureInput.value = '';
        };
        reader.readAsDataURL(file);
    });
}

// ========================================
// Upload Profile Picture to Server
// ========================================

async function uploadProfilePicture(base64Image) {
    try {
        const user = getUser();
        
        // Use the PUT /profile endpoint with profile_picture field
        const response = await apiClient.put('/profile', {
            firstname: user.firstname,
            lastname: user.lastname,
            middlename: user.middlename,
            profile_picture: base64Image
        });
        
        if (response.success && response.data.success) {
            // Update local storage with response data
            const updatedUser = response.data.data;
            user.firstname = updatedUser.firstname;
            user.lastname = updatedUser.lastname;
            user.middlename = updatedUser.middlename;
            user.profile_picture = updatedUser.profile_picture;
            localStorage.setItem(USER_KEY, JSON.stringify(user));
            
            showToast('Profile picture updated successfully', 'success');
            currentProfilePicture = updatedUser.profile_picture;
        } else {
            showToast(response.data?.message || 'Failed to upload profile picture', 'error');
        }
    } catch (error) {
        console.error('Upload profile picture error:', error);
        const message = error.data?.message || 'Failed to upload profile picture';
        showToast(message, 'error');
        
        // Revert to previous picture
        const user = getUser();
        if (user && user.profile_picture) {
            document.getElementById('profilePictureDisplay').src = user.profile_picture;
        } else {
            document.getElementById('profilePictureDisplay').src = DEFAULT_AVATAR;
        }
    }
}

// ========================================
// Initialize Profile Page
// ========================================

// ========================================
// Update Navigation Based on User Role
// ========================================

let navigationUpdated = false; // Flag to prevent multiple updates

function updateNavigation(user) {
    console.log('=== updateNavigation START ===');
    console.log('User for navigation:', user);
    
    const navMenu = document.getElementById('navMenu');
    if (!navMenu) {
        console.error('navMenu element not found!');
        return;
    }
    
    // Find the Profile link and Logout button to preserve them
    const profileLink = navMenu.querySelector('a[href="profile.html"]');
    if (!profileLink) {
        console.error('Profile link not found!');
        return;
    }
    
    console.log('Profile link found:', profileLink);
    
    // Check if navigation links already exist (except profile)
    const existingNavLinks = navMenu.querySelectorAll('a.btn:not([href="profile.html"])');
    console.log('Existing nav links:', existingNavLinks.length);
    
    if (existingNavLinks.length > 0 && navigationUpdated) {
        // Navigation already set up, don't update again
        console.log('Navigation already updated, skipping...');
        return;
    }
    
    // Clear existing navigation links (but keep theme toggle, profile, and logout)
    existingNavLinks.forEach(link => {
        // Only remove if it's not the theme toggle or logout button
        if (!link.id && link !== profileLink) {
            console.log('Removing existing link:', link);
            link.remove();
        }
    });
    
    // Get user role - try to get from user object or fetch from API
    let role = user?.role || 'user';
    
    console.log('User role from parameter:', role);
    
    // If role is not in user object, try to get it from the stored user data
    if (!role || role === 'user') {
        const storedUser = getUser();
        role = storedUser?.role || 'user';
        console.log('User role from storage:', role);
    }
    
    console.log('Final role for navigation:', role);
    
    // Create navigation links based on role
    const links = [];
    
    if (role === 'staff' || role === 'admin') {
        console.log('Creating staff/admin navigation');
        // Staff/Admin navigation
        links.push({
            href: role === 'admin' ? 'admin-dashboard.html' : 'staff-dashboard.html',
            text: 'Dashboard'
        });
        
        if (role === 'staff') {
            links.push({ href: 'staff-users.html', text: 'Manage Users' });
            links.push({ href: 'staff-sessions.html', text: 'Manage Sessions' });
            links.push({ href: 'staff-bookings.html', text: 'Manage Bookings' });
        } else {
            // Admin navigation
            links.push({ href: 'admin-users.html', text: 'Manage Users' });
            links.push({ href: 'admin-sessions.html', text: 'Manage Sessions' });
            links.push({ href: 'admin-bookings.html', text: 'Manage Bookings' });
        }
    } else {
        // Regular user navigation
        console.log('Creating regular user navigation');
        links.push({ href: 'dashboard.html', text: 'Dashboard' });
        links.push({ href: 'sessions.html', text: 'Browse Sessions' });
        links.push({ href: 'my-bookings.html', text: 'My Bookings' });
    }
    
    // If no links were created, default to regular user navigation
    if (links.length === 0) {
        console.warn('No navigation links created, using default user navigation');
        links.push({ href: 'dashboard.html', text: 'Dashboard' });
        links.push({ href: 'sessions.html', text: 'Browse Sessions' });
        links.push({ href: 'my-bookings.html', text: 'My Bookings' });
    }
    
    // Insert links before profile link
    console.log('Inserting navigation links:', links);
    links.forEach(linkData => {
        const link = document.createElement('a');
        link.href = linkData.href;
        link.className = 'btn btn-secondary btn-sm';
        link.textContent = linkData.text;
        console.log('Creating link:', linkData.text, '->', linkData.href);
        navMenu.insertBefore(link, profileLink);
    });
    
    navigationUpdated = true;
    console.log('=== updateNavigation SUCCESS ===');
}

// ========================================
// Initialize Profile Page
// ========================================

document.addEventListener('DOMContentLoaded', async () => {
    // Check if apiClient is available
    if (typeof apiClient === 'undefined') {
        console.error('apiClient is not defined. Make sure app.js is loaded before profile.js');
        showToast('Error: API client not loaded. Please refresh the page.', 'error');
        return;
    }
    
    console.log('Profile page: Starting initialization...');
    
    try {
        const isAuthenticated = await checkAuth();
        
        if (isAuthenticated) {
            console.log('Profile page: User is authenticated');
            initTheme();
            
            // Load user profile first to get user data
            console.log('Profile page: Loading user profile...');
            await loadUserProfile();
            
            // Then update navigation with the loaded user data
            const user = getUser();
            console.log('Profile page: User data from storage:', user);
            
            // Always try to update navigation
            if (user) {
                console.log('Profile page: Updating navigation with stored user');
                updateNavigation(user);
            }
            
            // If role is not in stored user, fetch from API
            if (!user || !user.role) {
                console.log('Profile page: Fetching user role from API...');
                try {
                    const response = await apiClient.get('/user');
                    if (response.success && response.data) {
                        // /user returns: { success: true, data: { user: { ... } } }
                        // apiClient wraps it: { success: true, status: 200, data: { success: true, data: { user: { ... } } } }
                        const userData = response.data.data?.user || response.data.user;
                        if (userData) {
                        console.log('Profile page: Got user data from API:', userData);
                        // Store user with role
                        localStorage.setItem(USER_KEY, JSON.stringify(userData));
                        updateNavigation(userData);
                        } else {
                            console.warn('Profile page: No user data in API response:', response);
                            if (user) {
                                updateNavigation(user);
                            }
                        }
                    } else {
                        console.warn('Profile page: API response not successful:', response);
                        // Still try to update with whatever user data we have
                        if (user) {
                            updateNavigation(user);
                        }
                    }
                } catch (error) {
                    console.error('Failed to get user data:', error);
                    // Still try to update with whatever user data we have
                    if (user) {
                        updateNavigation(user);
                    }
                }
            }
            
            console.log('Profile page initialized successfully');
        } else {
            console.log('Profile page: User is not authenticated, redirecting...');
        }
    } catch (error) {
        console.error('Profile page initialization error:', error);
        showToast('Error loading profile page. Please refresh.', 'error');
    }
});
