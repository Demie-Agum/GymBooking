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

// ========================================
// DOM Elements
// ========================================

const otpInputs = document.querySelectorAll('.otp-input');
const otpForm = document.getElementById('otpForm');
const verifyBtn = document.getElementById('verifyBtn');
const resendBtn = document.getElementById('resendBtn');
const timerElement = document.getElementById('timer');
const userEmailElement = document.getElementById('userEmail');
const verifyIcon = document.getElementById('verifyIcon');
const successIcon = document.getElementById('successIcon');

// ========================================
// Variables
// ========================================

let resendTimer = 60;
let timerInterval = null;
let userEmail = '';

// ========================================
// Initialize
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    checkPendingVerification();
    setupOTPInputs();
    startResendTimer();
    
    // Check if coming from link verification (optional - remove if you don't want link verification)
    // checkTokenVerification();
});

// ========================================
// Theme
// ========================================

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.setAttribute('data-theme', savedTheme);
}

// ========================================
// Check Pending Verification
// ========================================

function checkPendingVerification() {
    const pendingEmail = localStorage.getItem(PENDING_EMAIL_KEY);
    
    if (!pendingEmail) {
        Swal.fire({
            icon: 'warning',
            title: 'No Pending Verification',
            text: 'Please register first to verify your email.',
            confirmButtonText: 'Go to Register',
            allowOutsideClick: false
        }).then(() => {
            window.location.href = 'login.html';
        });
        return;
    }
    
    userEmail = pendingEmail;
    userEmailElement.textContent = userEmail;
    
    // Show helpful message if returning to page
    const isReturning = sessionStorage.getItem('returning_to_verify');
    if (isReturning) {
        showToast('Welcome back! Enter your verification code or request a new one.', 'info');
        sessionStorage.removeItem('returning_to_verify');
    }
}

// ========================================
// Check Token Verification (from email link)
// OPTIONAL - Comment out if you only want OTP verification
// ========================================

async function checkTokenVerification() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (token) {
        // Show loading
        Swal.fire({
            title: 'Verifying...',
            text: 'Please wait while we verify your email',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
        
        try {
            const response = await axios.post('/verify-token', { token });
            
            if (response.data.success) {
                const { user } = response.data.data;
                
                // Remove pending verification (don't save token yet)
                localStorage.removeItem(PENDING_EMAIL_KEY);
                
                // Set flag for success message
                sessionStorage.setItem('just_verified', 'true');
                
                // Show success
                showSuccess();
                
                await Swal.fire({
                    icon: 'success',
                    title: 'Email Verified!',
                    text: `Welcome, ${user.firstname}! Your email has been verified successfully. Please login to continue.`,
                    confirmButtonText: 'Go to Login'
                });
                
                window.location.href = 'login.html';
            }
        } catch (error) {
            console.error('Token verification error:', error);
            
            Swal.fire({
                icon: 'error',
                title: 'Verification Failed',
                text: error.response?.data?.message || 'Invalid or expired verification link. Please use the OTP code instead.',
                confirmButtonText: 'Enter OTP'
            });
        }
    }
}

// ========================================
// Setup OTP Inputs
// ========================================

function setupOTPInputs() {
    otpInputs.forEach((input, index) => {
        // Only allow numbers
        input.addEventListener('input', (e) => {
            const value = e.target.value;
            
            // Remove non-numeric characters
            if (!/^\d*$/.test(value)) {
                e.target.value = '';
                return;
            }
            
            // Add filled class
            if (value) {
                e.target.classList.add('filled');
                e.target.classList.remove('error');
                
                // Move to next input
                if (index < otpInputs.length - 1) {
                    otpInputs[index + 1].focus();
                }
            } else {
                e.target.classList.remove('filled');
            }
        });
        
        // Handle backspace
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                otpInputs[index - 1].focus();
                otpInputs[index - 1].value = '';
                otpInputs[index - 1].classList.remove('filled');
            }
        });
        
        // Handle paste
        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const pastedData = e.clipboardData.getData('text').trim();
            
            if (/^\d{6}$/.test(pastedData)) {
                pastedData.split('').forEach((char, i) => {
                    if (otpInputs[i]) {
                        otpInputs[i].value = char;
                        otpInputs[i].classList.add('filled');
                    }
                });
                otpInputs[5].focus();
            }
        });
        
        // Auto-focus first input
        if (index === 0) {
            input.focus();
        }
    });
}

// ========================================
// Get OTP Value
// ========================================

function getOTPValue() {
    return Array.from(otpInputs).map(input => input.value).join('');
}

// ========================================
// Clear OTP Inputs
// ========================================

function clearOTPInputs() {
    otpInputs.forEach(input => {
        input.value = '';
        input.classList.remove('filled', 'error');
    });
    otpInputs[0].focus();
}

// ========================================
// Set OTP Error State
// ========================================

function setOTPError() {
    otpInputs.forEach(input => {
        input.classList.add('error');
        input.classList.remove('filled');
    });
}

// ========================================
// Verify OTP Form Submit
// ========================================

otpForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const otp = getOTPValue();
    
    // Validate OTP
    if (otp.length !== 6) {
        Swal.fire({
            icon: 'warning',
            title: 'Incomplete Code',
            text: 'Please enter all 6 digits',
            confirmButtonText: 'OK'
        });
        return;
    }
    
    // Set loading state
    setLoading(verifyBtn, true);
    
    try {
        const response = await axios.post('/verify-otp', {
            email: userEmail,
            otp: otp
        });
        
        if (response.data.success) {
            const { user } = response.data.data;
            
            // Remove pending verification (don't save token yet)
            localStorage.removeItem(PENDING_EMAIL_KEY);
            
            // Set flag for success message
            sessionStorage.setItem('just_verified', 'true');
            
            // Show success animation
            showSuccess();
            
            await Swal.fire({
                icon: 'success',
                title: 'Email Verified!',
                text: `Welcome, ${user.firstname}! Your account has been verified successfully. Please login to continue.`,
                confirmButtonText: 'Go to Login',
                allowOutsideClick: false
            });
            
            window.location.href = 'login.html';
        }
    } catch (error) {
        console.error('OTP verification error:', error);
        
        setOTPError();
        
        Swal.fire({
            icon: 'error',
            title: 'Verification Failed',
            text: error.response?.data?.message || 'Invalid or expired OTP. Please try again.',
            confirmButtonText: 'Try Again'
        }).then(() => {
            clearOTPInputs();
        });
    } finally {
        setLoading(verifyBtn, false);
    }
});

// ========================================
// Resend OTP
// ========================================

resendBtn.addEventListener('click', async () => {
    if (resendBtn.disabled) return;
    
    setLoading(resendBtn, true);
    
    try {
        const response = await axios.post('/resend-otp', {
            email: userEmail
        });
        
        if (response.data.success) {
            Swal.fire({
                icon: 'success',
                title: 'Code Sent!',
                text: 'A new verification code has been sent to your email.',
                timer: 2000,
                showConfirmButton: false
            });
            
            // Reset timer
            resendTimer = 60;
            startResendTimer();
            clearOTPInputs();
        }
    } catch (error) {
        console.error('Resend OTP error:', error);
        
        Swal.fire({
            icon: 'error',
            title: 'Failed to Resend',
            text: error.response?.data?.message || 'Could not resend verification code. Please try again.',
            confirmButtonText: 'OK'
        });
    } finally {
        setLoading(resendBtn, false);
    }
});

// ========================================
// Resend Timer
// ========================================

function startResendTimer() {
    resendBtn.disabled = true;
    
    // Clear existing interval
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    
    timerInterval = setInterval(() => {
        resendTimer--;
        
        if (resendTimer > 0) {
            timerElement.textContent = `(${resendTimer}s)`;
        } else {
            clearInterval(timerInterval);
            timerElement.textContent = '';
            resendBtn.disabled = false;
        }
    }, 1000);
    
    timerElement.textContent = `(${resendTimer}s)`;
}

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

function showSuccess() {
    verifyIcon.style.display = 'none';
    successIcon.classList.add('show');
    
    // Add success class to all inputs
    otpInputs.forEach(input => {
        input.classList.remove('error');
        input.classList.add('filled');
        input.disabled = true;
    });
}

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

// ========================================
// Cleanup on page unload
// ========================================

window.addEventListener('beforeunload', () => {
    if (timerInterval) {
        clearInterval(timerInterval);
    }
});