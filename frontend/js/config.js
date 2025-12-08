/**
 * Frontend Configuration
 * 
 * IMPORTANT: Update API_BASE_URL to your production backend URL when deploying
 * 
 * For local development: 'http://127.0.0.1:8000/api'
 * For production (Hostinger): 'https://yourdomain.com/api' (replace with your actual domain)
 */

// API Configuration
const CONFIG = {
    // Change this to your Hostinger backend URL when deploying
    // Example: 'https://yourdomain.com/api' or 'https://api.yourdomain.com/api'
    API_BASE_URL: 'https://muccs.site/gym/backend/public/api',
    
    // Storage keys
    TOKEN_KEY: 'auth_token',
    USER_KEY: 'user_data',
    PENDING_EMAIL_KEY: 'pending_verification_email',
    DEFAULT_AVATAR: 'images/default-avatar.png'
};

// Export for use in other files
if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
}

