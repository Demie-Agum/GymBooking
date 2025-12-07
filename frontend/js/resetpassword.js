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
        timer: 4000,
        timerProgressBar: true
    });
}

function getUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    return {
        token: urlParams.get('token'),
        email: urlParams.get('email')
    };
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
        const currentTheme = document.body.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.body.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
    });
}

// ========================================
// Password Toggle Visibility
// ========================================

document.querySelectorAll('.toggle-password').forEach(button => {
    button.addEventListener('click', function() {
        const targetId = this.getAttribute('data-target');
        const input = document.getElementById(targetId);
        const eyeIcon = this.querySelector('.eye-icon');
        const eyeOffIcon = this.querySelector('.eye-off-icon');
        
        if (input.type === 'password') {
            input.type = 'text';
            eyeIcon.classList.add('hidden');
            eyeOffIcon.classList.remove('hidden');
        } else {
            input.type = 'password';
            eyeIcon.classList.remove('hidden');
            eyeOffIcon.classList.add('hidden');
        }
    });
});

// ========================================
// Password Validation
// ========================================

function validatePassword(password) {
    if (password.length < 8) {
        return {
            valid: false,
            message: 'Password must be at least 8 characters long'
        };
    }
    
    return {
        valid: true,
        message: ''
    };
}

function passwordsMatch(password, confirmation) {
    return password === confirmation;
}

// ========================================
// Check Token and Email
// ========================================

function validateTokenAndEmail() {
    const { token, email } = getUrlParams();
    
    if (!token || !email) {
        Swal.fire({
            icon: 'error',
            title: 'Invalid Reset Link',
            text: 'The password reset link is invalid or has expired.',
            confirmButtonText: 'Go to Login',
            allowOutsideClick: false
        }).then(() => {
            window.location.href = 'login.html';
        });
        return false;
    }
    
    // Set hidden fields
    document.getElementById('token').value = token;
    document.getElementById('email').value = decodeURIComponent(email);
    
    return true;
}

// ========================================
// Reset Password Handler
// ========================================

const resetPasswordForm = document.getElementById('resetPasswordForm');
const resetPasswordBtn = document.getElementById('resetPasswordBtn');

if (resetPasswordForm) {
    resetPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const token = document.getElementById('token').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const passwordConfirmation = document.getElementById('password_confirmation').value;
        
        // Validate password
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.valid) {
            showToast(passwordValidation.message, 'error');
            return;
        }
        
        // Check if passwords match
        if (!passwordsMatch(password, passwordConfirmation)) {
            showToast('Passwords do not match', 'error');
            return;
        }
        
        // Show loading state
        resetPasswordBtn.classList.add('btn-loading');
        resetPasswordBtn.disabled = true;
        
        try {
            const response = await axios.post('/reset-password', {
                email: email,
                token: token,
                password: password,
                password_confirmation: passwordConfirmation
            });
            
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
            console.error('Reset password error:', error);
            
            let errorMessage = 'Failed to reset password. Please try again.';
            
            if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.response?.status === 404) {
                errorMessage = 'Invalid or expired reset token.';
            } else if (error.response?.status === 401) {
                errorMessage = 'Reset token has expired. Please request a new one.';
            } else if (error.response?.data?.errors) {
                const errors = error.response.data.errors;
                errorMessage = Object.values(errors).flat().join('\n');
            }
            
            Swal.fire({
                icon: 'error',
                title: 'Reset Failed',
                text: errorMessage,
                confirmButtonText: 'Try Again'
            });
        } finally {
            resetPasswordBtn.classList.remove('btn-loading');
            resetPasswordBtn.disabled = false;
        }
    });
}

// ========================================
// Password Strength Indicator (Optional)
// ========================================

const passwordInput = document.getElementById('password');
if (passwordInput) {
    passwordInput.addEventListener('input', (e) => {
        const password = e.target.value;
        
        // You can add password strength indicator here
        // For now, just validate length
        if (password.length >= 8) {
            passwordInput.style.borderColor = 'var(--primary)';
        } else {
            passwordInput.style.borderColor = 'var(--input-border)';
        }
    });
}

// ========================================
// Initialize Page
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    
    // Validate token and email from URL
    const isValid = validateTokenAndEmail();
    
    if (isValid) {
        // Auto-focus on password input
        const passwordInput = document.getElementById('password');
        if (passwordInput) {
            passwordInput.focus();
        }
    }
    
    console.log('Reset Password page initialized');
});