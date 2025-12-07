// ========================================
// Configuration
// ========================================
// Load configuration - make sure config.js is loaded before this file
const API_BASE_URL = (typeof CONFIG !== 'undefined' && CONFIG.API_BASE_URL) 
    ? CONFIG.API_BASE_URL 
    : 'http://127.0.0.1:8000/api'; // Fallback for local development

// ========================================
// Axios Configuration
// ========================================

axios.defaults.baseURL = API_BASE_URL;
axios.defaults.headers.common['Content-Type'] = 'application/json';
axios.defaults.headers.common['Accept'] = 'application/json';

// Add CORS headers
axios.defaults.withCredentials = false;

// ========================================
// Global Variables
// ========================================

let resetEmail = '';
let resetToken = '';
let currentTheme = 'light'; // Store theme in memory instead of localStorage

// ========================================
// Utility Functions
// ========================================

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

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
}

function clearError(elementId) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = '';
        errorElement.style.display = 'none';
    }
}

// ========================================
// Theme Toggle
// ========================================

function initTheme() {
    document.body.setAttribute('data-theme', currentTheme);
    updateThemeIcon(currentTheme);
}

function updateThemeIcon(theme) {
    const sunIcon = document.getElementById('sunIcon');
    const moonIcon = document.getElementById('moonIcon');
    
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

const themeToggle = document.getElementById('themeToggle');
if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        currentTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.body.setAttribute('data-theme', currentTheme);
        updateThemeIcon(currentTheme);
    });
}

// ========================================
// Step Navigation
// ========================================

function showStep(stepId) {
    document.querySelectorAll('.reset-step').forEach(step => {
        step.style.display = 'none';
    });
    
    const targetStep = document.getElementById(stepId);
    if (targetStep) {
        targetStep.style.display = 'block';
    }
}

// ========================================
// Check for Reset Token in URL
// ========================================

function checkUrlForToken() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const email = urlParams.get('email');
    
    if (token && email) {
        resetToken = token;
        resetEmail = email;
        
        // Show reset password step directly
        showStep('resetStep');
        const passwordInput = document.getElementById('newPassword');
        if (passwordInput) {
            passwordInput.focus();
        }
        
        showToast('Enter your new password', 'info');
    }
}

// ========================================
// STEP 1: Request Reset Email
// ========================================

const requestResetForm = document.getElementById('requestResetForm');
const requestResetBtn = document.getElementById('requestResetBtn');

if (requestResetForm) {
    requestResetForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('✅ Form submitted via JavaScript (not browser default)');
        
        const email = document.getElementById('resetEmail').value.trim();
        
        clearError('resetEmailError');
        
        // Validate email
        if (!email) {
            showError('resetEmailError', 'Please enter your email address');
            return;
        }
        
        if (!isValidEmail(email)) {
            showError('resetEmailError', 'Please enter a valid email address');
            return;
        }
        
        // Store email globally
        resetEmail = email;
        
        // Show loading state
        requestResetBtn.classList.add('btn-loading');
        requestResetBtn.disabled = true;
        
        try {
            console.log('📤 Sending POST request to:', API_BASE_URL + '/forgot-password');
            console.log('📧 Email:', email);
            
            const response = await axios.post('/forgot-password', {
                email: email
            });
            
            console.log('✅ Response received:', response.data);
            
            if (response.data.success) {
                await Swal.fire({
                    icon: 'success',
                    title: 'Email Sent!',
                    html: `
                        <p>${response.data.message}</p>
                        <p class="mt-3"><strong>Check your email inbox for the reset link.</strong></p>
                    `,
                    confirmButtonText: 'OK'
                });
                
                // Optionally redirect back to login
                // window.location.href = 'login.html';
            }
        } catch (error) {
            console.error('❌ Request reset error:', error);
            console.error('📋 Error details:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status,
                url: error.config?.url
            });
            
            let errorMessage = 'Failed to send reset link. Please try again.';
            
            if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.response?.data?.error) {
                errorMessage = error.response.data.error;
            } else if (error.response?.status === 404) {
                errorMessage = 'No account found with this email address.';
            } else if (error.code === 'ERR_NETWORK') {
                errorMessage = 'Cannot connect to server. Make sure the backend is running at ' + API_BASE_URL;
            }
            
            showError('resetEmailError', errorMessage);
            showToast(errorMessage, 'error');
        } finally {
            requestResetBtn.classList.remove('btn-loading');
            requestResetBtn.disabled = false;
        }
    });
}

// ========================================
// Password Toggle Visibility
// ========================================

document.querySelectorAll('.password-toggle').forEach(button => {
    button.addEventListener('click', function(e) {
        e.preventDefault(); // Prevent any default button behavior
        
        const targetId = this.getAttribute('data-target');
        const input = document.getElementById(targetId);
        
        if (input) {
            if (input.type === 'password') {
                input.type = 'text';
                this.classList.add('active');
            } else {
                input.type = 'password';
                this.classList.remove('active');
            }
        }
    });
});

// ========================================
// STEP 2: Reset Password (from email link)
// ========================================

const resetPasswordForm = document.getElementById('resetPasswordForm');
const resetPasswordBtn = document.getElementById('resetPasswordBtn');

if (resetPasswordForm) {
    resetPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('✅ Reset password form submitted');
        
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmNewPassword').value;
        
        clearError('newPasswordError');
        clearError('confirmNewPasswordError');
        
        // Validate password
        if (!newPassword) {
            showError('newPasswordError', 'Please enter a password');
            return;
        }
        
        if (newPassword.length < 8) {
            showError('newPasswordError', 'Password must be at least 8 characters');
            return;
        }
        
        if (!confirmPassword) {
            showError('confirmNewPasswordError', 'Please confirm your password');
            return;
        }
        
        if (newPassword !== confirmPassword) {
            showError('confirmNewPasswordError', 'Passwords do not match');
            return;
        }
        
        if (!resetToken || !resetEmail) {
            showToast('Invalid reset link. Please request a new one.', 'error');
            showStep('requestStep');
            return;
        }
        
        // Show loading state
        resetPasswordBtn.classList.add('btn-loading');
        resetPasswordBtn.disabled = true;
        
        try {
            console.log('📤 Sending password reset request...');
            
            const response = await axios.post('/reset-password', {
                email: resetEmail,
                token: resetToken,
                password: newPassword,
                password_confirmation: confirmPassword
            });
            
            console.log('✅ Password reset response:', response.data);
            
            if (response.data.success) {
                await Swal.fire({
                    icon: 'success',
                    title: 'Password Reset Successful!',
                    text: response.data.message,
                    confirmButtonText: 'Go to Login',
                    allowOutsideClick: false
                });
                
                window.location.href = 'login.html';
            }
        } catch (error) {
            console.error('❌ Reset password error:', error);
            
            let errorMessage = 'Failed to reset password';
            
            if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.response?.data?.errors) {
                const errors = error.response.data.errors;
                errorMessage = Object.values(errors).flat()[0];
            } else if (error.code === 'ERR_NETWORK') {
                errorMessage = 'Cannot connect to server. Make sure the backend is running.';
            }
            
            showError('newPasswordError', errorMessage);
            showToast(errorMessage, 'error');
        } finally {
            resetPasswordBtn.classList.remove('btn-loading');
            resetPasswordBtn.disabled = false;
        }
    });
}

// ========================================
// Initialize Page
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Forgot Password page loaded');
    console.log('📍 API URL:', API_BASE_URL);
    console.log('📍 Current URL:', window.location.href);
    
    initTheme();
    
    // Check if coming from email link
    checkUrlForToken();
    
    // If no token in URL, show request step
    if (!resetToken) {
        showStep('requestStep');
        
        // Focus on email input
        const emailInput = document.getElementById('resetEmail');
        if (emailInput) {
            emailInput.focus();
        }
    }
    
    console.log('✅ Page initialization complete');
});