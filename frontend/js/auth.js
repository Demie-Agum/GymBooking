// ========================================
// Configuration
// ========================================
// Load configuration - make sure config.js is loaded before this file
const API_BASE_URL = (typeof CONFIG !== 'undefined' && CONFIG.API_BASE_URL) 
    ? CONFIG.API_BASE_URL 
    : 'http://127.0.0.1:8000/api'; // Fallback for local development
const TOKEN_KEY = (typeof CONFIG !== 'undefined' && CONFIG.TOKEN_KEY) 
    ? CONFIG.TOKEN_KEY 
    : 'auth_token';
const USER_KEY = (typeof CONFIG !== 'undefined' && CONFIG.USER_KEY) 
    ? CONFIG.USER_KEY 
    : 'user_data';
const PENDING_EMAIL_KEY = (typeof CONFIG !== 'undefined' && CONFIG.PENDING_EMAIL_KEY) 
    ? CONFIG.PENDING_EMAIL_KEY 
    : 'pending_verification_email';

// ========================================
// Axios Configuration
// ========================================

axios.defaults.baseURL = API_BASE_URL;
axios.defaults.headers.common['Content-Type'] = 'application/json';
axios.defaults.headers.common['Accept'] = 'application/json';

// Add token to requests if available
axios.interceptors.request.use(
    config => {
        const token = localStorage.getItem(TOKEN_KEY);
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    error => Promise.reject(error)
);

// Handle response errors globally
axios.interceptors.response.use(
    response => response,
    error => {
        if (error.response?.status === 401) {
            clearAuth();
            showToast('Session expired. Please login again.', 'error');
        }
        return Promise.reject(error);
    }
);

// ========================================
// DOM Elements
// ========================================

const loginToggle = document.getElementById('loginToggle');
const signupToggle = document.getElementById('signupToggle');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const themeToggle = document.getElementById('themeToggle');
const sunIcon = document.getElementById('sunIcon');
const moonIcon = document.getElementById('moonIcon');

// ========================================
// Theme Toggle
// ========================================

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function updateThemeIcon(theme) {
    if (theme === 'dark') {
        sunIcon.classList.add('hidden');
        moonIcon.classList.remove('hidden');
    } else {
        sunIcon.classList.remove('hidden');
        moonIcon.classList.add('hidden');
    }
}

themeToggle.addEventListener('click', () => {
    const currentTheme = document.body.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
});

// ========================================
// Form Toggle
// ========================================

loginToggle.addEventListener('click', () => {
    loginToggle.classList.add('active');
    signupToggle.classList.remove('active');
    loginForm.classList.remove('form-hidden');
    signupForm.classList.add('form-hidden');
    clearErrors();
});

signupToggle.addEventListener('click', () => {
    signupToggle.classList.add('active');
    loginToggle.classList.remove('active');
    signupForm.classList.remove('form-hidden');
    loginForm.classList.add('form-hidden');
    clearErrors();
});

// ========================================
// Password Toggle Visibility
// ========================================

document.querySelectorAll('.password-toggle').forEach(btn => {
    btn.addEventListener('click', function() {
        const targetId = this.getAttribute('data-target');
        const input = document.getElementById(targetId);
        
        if (input.type === 'password') {
            input.type = 'text';
        } else {
            input.type = 'password';
        }
    });
});

// ========================================
// Utility Functions
// ========================================

function setLoading(button, isLoading) {
    if (isLoading) {
        button.disabled = true;
        button.classList.add('btn-loading');
    } else {
        button.disabled = false;
        button.classList.remove('btn-loading');
    }
}

function showError(inputId, message) {
    const input = document.getElementById(inputId);
    const errorSpan = document.getElementById(`${inputId}Error`);
    
    if (input && errorSpan) {
        input.classList.add('error');
        errorSpan.textContent = message;
        errorSpan.classList.add('show');
    }
}

function clearErrors() {
    document.querySelectorAll('.form-input').forEach(input => {
        input.classList.remove('error');
    });
    document.querySelectorAll('.error-message').forEach(error => {
        error.classList.remove('show');
        error.textContent = '';
    });
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

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validatePassword(password) {
    return password.length >= 8;
}

function saveAuth(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearAuth() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(PENDING_EMAIL_KEY);
}

function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

function getUser() {
    const user = localStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
}

// ========================================
// Login Handler
// ========================================

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const loginBtn = document.getElementById('loginBtn');

    // Validation
    let isValid = true;

    if (!email) {
        showError('loginEmail', 'Email is required');
        isValid = false;
    } else if (!validateEmail(email)) {
        showError('loginEmail', 'Please enter a valid email');
        isValid = false;
    }

    if (!password) {
        showError('loginPassword', 'Password is required');
        isValid = false;
    }

    if (!isValid) return;

    // Submit
    setLoading(loginBtn, true);

    try {
        const response = await axios.post('/login', {
            email: email,
            password: password
        });

        if (response.data.success) {
            const { token, user } = response.data.data;
            saveAuth(token, user);
            
            await Swal.fire({
                icon: 'success',
                title: 'Login Successful!',
                text: `Welcome back, ${user.firstname}!`,
                showConfirmButton: false,
                timer: 2000
            });

            console.log('Token:', token);
            console.log('User:', user);
            
            window.location.href = 'dashboard.html';
        }
    } catch (error) {
        console.error('Login error:', error);
        console.error('Error details:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
            statusText: error.response?.statusText,
            request: error.request,
            config: error.config
        });
        
        // Network error (backend not reachable)
        if (!error.response) {
            Swal.fire({
                icon: 'error',
                title: 'Connection Error',
                html: `
                    <p>Cannot connect to the server.</p>
                    <p style="margin-top: 10px; font-size: 14px; color: #6b7280;">
                        Please check:
                    </p>
                    <ul style="text-align: left; margin-top: 10px; font-size: 14px; color: #6b7280;">
                        <li>Backend server is running (cd backend && php artisan serve)</li>
                        <li>Backend is on port 8000</li>
                        <li>API URL: ${API_BASE_URL}/login</li>
                    </ul>
                    <p style="margin-top: 10px; font-size: 12px; color: #ef4444;">
                        Error: ${error.message}
                    </p>
                `,
                confirmButtonText: 'OK'
            });
            return;
        }
        
        // Check if email verification is required
        if (error.response?.data?.requires_verification) {
            const userEmail = error.response.data.email;
            
            const result = await Swal.fire({
                icon: 'warning',
                title: 'Email Not Verified',
                html: `
                    <p>Your email address has not been verified yet.</p>
                    <p style="margin-top: 10px;">We've sent a verification code to:</p>
                    <p style="font-weight: 600; color: #667eea; margin-top: 5px;">${userEmail}</p>
                    <p style="margin-top: 10px; font-size: 14px; color: #6b7280;">Check your inbox and enter the code to verify your account.</p>
                `,
                showCancelButton: true,
                confirmButtonText: '📧 Resume Verification',
                cancelButtonText: 'Cancel',
                confirmButtonColor: '#667eea'
            });
            
            if (result.isConfirmed) {
                // Store email and redirect to verification
                localStorage.setItem(PENDING_EMAIL_KEY, userEmail);
                sessionStorage.setItem('returning_to_verify', 'true');
                window.location.href = 'verify.html';
            }
        } else if (error.response?.data?.message) {
            Swal.fire({
                icon: 'error',
                title: 'Login Failed',
                html: `
                    <p>${error.response.data.message}</p>
                    ${error.response.status ? `<p style="margin-top: 10px; font-size: 12px; color: #6b7280;">Status: ${error.response.status}</p>` : ''}
                `,
                confirmButtonText: 'OK'
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Login Failed',
                html: `
                    <p>An error occurred. Please try again.</p>
                    <p style="margin-top: 10px; font-size: 12px; color: #6b7280;">
                        Status: ${error.response?.status || 'Unknown'}
                    </p>
                `,
                confirmButtonText: 'OK'
            });
        }
    } finally {
        setLoading(loginBtn, false);
    }
});

// ========================================
// Signup Handler
// ========================================

signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    const firstname = document.getElementById('signupFirstname').value.trim();
    const lastname = document.getElementById('signupLastname').value.trim();
    const middlename = document.getElementById('signupMiddlename').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const passwordConfirm = document.getElementById('signupPasswordConfirm').value;
    const signupBtn = document.getElementById('signupBtn');

    // Validation
    let isValid = true;

    if (!firstname) {
        showError('signupFirstname', 'First name is required');
        isValid = false;
    }

    if (!lastname) {
        showError('signupLastname', 'Last name is required');
        isValid = false;
    }

    if (!email) {
        showError('signupEmail', 'Email is required');
        isValid = false;
    } else if (!validateEmail(email)) {
        showError('signupEmail', 'Please enter a valid email');
        isValid = false;
    }

    if (!password) {
        showError('signupPassword', 'Password is required');
        isValid = false;
    } else if (!validatePassword(password)) {
        showError('signupPassword', 'Password must be at least 8 characters');
        isValid = false;
    }

    if (!passwordConfirm) {
        showError('signupPasswordConfirm', 'Please confirm your password');
        isValid = false;
    } else if (password !== passwordConfirm) {
        showError('signupPasswordConfirm', 'Passwords do not match');
        isValid = false;
    }

    if (!isValid) return;

    // Submit
    setLoading(signupBtn, true);

    try {
        const response = await axios.post('/register', {
            firstname: firstname,
            lastname: lastname,
            middlename: middlename || null,
            email: email,
            password: password,
            password_confirmation: passwordConfirm
        });

        if (response.data.success) {
            // Store email for verification page
            localStorage.setItem(PENDING_EMAIL_KEY, email);
            
            await Swal.fire({
                icon: 'success',
                title: 'Registration Successful!',
                html: `
                    <p>A verification code has been sent to:</p>
                    <p style="font-weight: 600; color: #667eea;">${email}</p>
                    <p style="margin-top: 10px; font-size: 14px;">Please check your email and enter the 6-digit code to verify your account.</p>
                `,
                confirmButtonText: 'Verify Now',
                allowOutsideClick: false
            });

            // Redirect to verification page
            window.location.href = 'verify.html';
        }
    } catch (error) {
        console.error('Signup error:', error);
        
        if (error.response?.data?.errors) {
            const errors = error.response.data.errors;
            
            if (errors.email) {
                showError('signupEmail', errors.email[0]);
            }
            if (errors.password) {
                showError('signupPassword', errors.password[0]);
            }
            if (errors.firstname) {
                showError('signupFirstname', errors.firstname[0]);
            }
            if (errors.lastname) {
                showError('signupLastname', errors.lastname[0]);
            }
        } else if (error.response?.data?.message) {
            Swal.fire({
                icon: 'error',
                title: 'Registration Failed',
                text: error.response.data.message
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Registration Failed',
                text: 'An error occurred. Please try again.'
            });
        }
    } finally {
        setLoading(signupBtn, false);
    }
});

// ========================================
// Forgot Password
// ========================================

const forgotPasswordLink = document.getElementById('forgotPassword');
if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', (e) => {
        e.preventDefault();
        
        Swal.fire({
            title: 'Reset Password',
            text: 'Enter your email address to receive a password reset link',
            input: 'email',
            inputPlaceholder: 'Enter your email',
            showCancelButton: true,
            confirmButtonText: 'Send Reset Link',
            showLoaderOnConfirm: true,
            preConfirm: (email) => {
                if (!validateEmail(email)) {
                    Swal.showValidationMessage('Please enter a valid email');
                    return false;
                }
                
                return axios.post('/forgot-password', { email: email })
                    .then(response => {
                        return response.data;
                    })
                    .catch(error => {
                        Swal.showValidationMessage(
                            error.response?.data?.message || 'Failed to send reset link'
                        );
                    });
            }
        }).then((result) => {
            if (result.isConfirmed) {
                Swal.fire({
                    icon: 'success',
                    title: 'Email Sent!',
                    text: 'Please check your email for password reset instructions.'
                });
            }
        });
    });
}

// ========================================
// Check if user is already logged in
// ========================================

function checkAuth() {
    const token = getToken();
    const user = getUser();
    
    if (token && user) {
        console.log('User is logged in:', user);
        // Redirect to dashboard if already logged in
        // window.location.href = 'dashboard.html';
    }
    
    // Check if just verified (show success message)
    checkJustVerified();
}
// ========================================
// Check if Just Verified
// ========================================

function checkJustVerified() {
    const justVerified = sessionStorage.getItem('just_verified');
    
    if (justVerified === 'true') {
        showToast('✅ Email verified successfully! You can now login.', 'success');
        sessionStorage.removeItem('just_verified');
    }
} // ← ADD THIS CLOSING BRACE


// ========================================
// Initialize
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    checkAuth();
    
    console.log('Auth system initialized');
    console.log('API URL:', API_BASE_URL);
});
