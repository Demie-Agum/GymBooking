/**
 * Main API wrapper for jQuery AJAX requests
 * Handles authentication tokens and API communication
 */

// Load configuration - make sure config.js is loaded before this file
const API_BASE_URL = (typeof CONFIG !== 'undefined' && CONFIG.API_BASE_URL) 
    ? CONFIG.API_BASE_URL 
    : 'http://127.0.0.1:8000/api'; // Fallback for local development

class ApiClient {
    constructor() {
        this.baseURL = API_BASE_URL;
    }

    /**
     * Get authentication token from localStorage
     */
    getToken() {
        return localStorage.getItem('auth_token');
    }

    /**
     * Set authentication token in localStorage
     */
    setToken(token) {
        localStorage.setItem('auth_token', token);
    }

    /**
     * Remove authentication token from localStorage
     */
    removeToken() {
        localStorage.removeItem('auth_token');
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return !!this.getToken();
    }

    /**
     * Make a jQuery AJAX request
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const requireAuth = options.requireAuth !== false;
        const method = options.method || 'GET';
        const body = options.body || null;

        return new Promise((resolve) => {
            // Check if jQuery is available
            if (typeof $ === 'undefined' || typeof $.ajax === 'undefined') {
                console.error('[API] jQuery is not loaded. Please include jQuery library.');
                resolve({
                    success: false,
                    status: 0,
                    data: {
                        success: false,
                        message: 'jQuery library is not loaded',
                    },
                });
                return;
            }

            const ajaxOptions = {
                url: url,
                method: method,
                dataType: 'json',
                contentType: 'application/json',
                processData: false, // Don't process data - send as-is for JSON strings
                headers: {
                    'Accept': 'application/json',
                },
                beforeSend: (xhr) => {
                    // Add Authorization header if authentication is required
                    if (requireAuth && this.isAuthenticated()) {
                        xhr.setRequestHeader('Authorization', `Bearer ${this.getToken()}`);
                    }
                },
                statusCode: {
                    401: () => {
                        // If token is invalid, clear it and redirect to login
                        if (this.isAuthenticated()) {
                            console.error('[API] 401 Unauthorized - clearing token');
                            this.removeToken();
                            window.location.href = 'login.html';
                        }
                        resolve({
                            success: false,
                            status: 401,
                            data: { success: false, message: 'Unauthorized' }
                        });
                    },
                    403: (xhr) => {
                        // If forbidden, return error without redirecting
                        console.error('[API] 403 Forbidden');
                        let errorData = { success: false, message: 'Forbidden - Insufficient permissions' };
                        try {
                            const responseText = xhr.responseText;
                            if (responseText) {
                                const parsed = JSON.parse(responseText);
                                errorData = parsed;
                            }
                        } catch (e) {
                            // If parsing fails, use default message
                        }
                        resolve({
                            success: false,
                            status: 403,
                            data: errorData
                        });
                    }
                },
                success: (data, textStatus, xhr) => {
                    resolve({
                        success: true,
                        status: xhr.status,
                        data: data || {},
                    });
                },
                error: (xhr, textStatus, errorThrown) => {
                    // Handle network errors or other AJAX errors
                    let errorData = {
                        success: false,
                        message: 'Network error. Please check your connection.',
                        error: errorThrown || textStatus,
                    };

                    // Try to parse error response if available
                    if (xhr.responseText) {
                        try {
                            const parsed = JSON.parse(xhr.responseText);
                            errorData = parsed;
                        } catch (e) {
                            // If not JSON, use the response text
                            if (xhr.responseText.length < 200) {
                                errorData.message = xhr.responseText;
                            }
                        }
                    }

                    // Only resolve if status code handlers haven't already handled it
                    if (xhr.status !== 401 && xhr.status !== 403) {
                        resolve({
                            success: false,
                            status: xhr.status || 0,
                            data: errorData,
                        });
                    }
                }
            };

            // Add request body for POST, PUT, PATCH methods
            if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
                ajaxOptions.data = body;
            }

            // Merge any additional headers from options
            if (options.headers) {
                Object.assign(ajaxOptions.headers, options.headers);
            }

            $.ajax(ajaxOptions);
        });
    }

    /**
     * GET request
     */
    async get(endpoint, requireAuth = true) {
        return this.request(endpoint, {
            method: 'GET',
            requireAuth,
        });
    }

    /**
     * POST request
     */
    async post(endpoint, body, requireAuth = true) {
        return this.request(endpoint, {
            method: 'POST',
            body: typeof body === 'string' ? body : JSON.stringify(body),
            requireAuth,
        });
    }

    /**
     * PUT request
     */
    async put(endpoint, body, requireAuth = true) {
        return this.request(endpoint, {
            method: 'PUT',
            body: typeof body === 'string' ? body : JSON.stringify(body),
            requireAuth,
        });
    }

    /**
     * DELETE request
     */
    async delete(endpoint, requireAuth = true) {
        return this.request(endpoint, {
            method: 'DELETE',
            requireAuth,
        });
    }

    /**
     * POST request with FormData (for file uploads)
     */
    async postFormData(endpoint, formData, requireAuth = true) {
        const url = `${this.baseURL}${endpoint}`;
        
        return new Promise((resolve) => {
            if (typeof $ === 'undefined' || typeof $.ajax === 'undefined') {
                console.error('[API] jQuery is not loaded. Please include jQuery library.');
                resolve({
                    success: false,
                    status: 0,
                    data: {
                        success: false,
                        message: 'jQuery library is not loaded',
                    },
                });
                return;
            }

            const ajaxOptions = {
                url: url,
                method: 'POST',
                dataType: 'json',
                contentType: false, // Let jQuery set it automatically for FormData
                processData: false, // Don't process FormData
                data: formData,
                beforeSend: (xhr) => {
                    if (requireAuth && this.isAuthenticated()) {
                        xhr.setRequestHeader('Authorization', `Bearer ${this.getToken()}`);
                    }
                },
                statusCode: {
                    401: () => {
                        if (this.isAuthenticated()) {
                            console.error('[API] 401 Unauthorized - clearing token');
                            this.removeToken();
                            window.location.href = 'login.html';
                        }
                        resolve({
                            success: false,
                            status: 401,
                            data: { success: false, message: 'Unauthorized' }
                        });
                    },
                    403: (xhr) => {
                        console.error('[API] 403 Forbidden');
                        let errorData = { success: false, message: 'Forbidden - Insufficient permissions' };
                        try {
                            const responseText = xhr.responseText;
                            if (responseText) {
                                const parsed = JSON.parse(responseText);
                                errorData = parsed;
                            }
                        } catch (e) {
                            // If parsing fails, use default message
                        }
                        resolve({
                            success: false,
                            status: 403,
                            data: errorData
                        });
                    }
                },
                success: (data, textStatus, xhr) => {
                    resolve({
                        success: true,
                        status: xhr.status,
                        data: data || {},
                    });
                },
                error: (xhr, textStatus, errorThrown) => {
                    let errorData = {
                        success: false,
                        message: 'Network error. Please check your connection.',
                        error: errorThrown || textStatus,
                    };

                    if (xhr.responseText) {
                        try {
                            const parsed = JSON.parse(xhr.responseText);
                            errorData = parsed;
                        } catch (e) {
                            if (xhr.responseText.length < 200) {
                                errorData.message = xhr.responseText;
                            }
                        }
                    }

                    if (xhr.status !== 401 && xhr.status !== 403) {
                        resolve({
                            success: false,
                            status: xhr.status || 0,
                            data: errorData,
                        });
                    }
                }
            };

            $.ajax(ajaxOptions);
        });
    }

    /**
     * PUT request with FormData (for file uploads)
     */
    async putFormData(endpoint, formData, requireAuth = true) {
        const url = `${this.baseURL}${endpoint}`;
        
        return new Promise((resolve) => {
            if (typeof $ === 'undefined' || typeof $.ajax === 'undefined') {
                console.error('[API] jQuery is not loaded. Please include jQuery library.');
                resolve({
                    success: false,
                    status: 0,
                    data: {
                        success: false,
                        message: 'jQuery library is not loaded',
                    },
                });
                return;
            }

            const ajaxOptions = {
                url: url,
                method: 'POST', // Laravel doesn't support PUT with FormData, so we use POST with _method
                dataType: 'json',
                contentType: false,
                processData: false,
                data: formData,
                beforeSend: (xhr) => {
                    if (requireAuth && this.isAuthenticated()) {
                        xhr.setRequestHeader('Authorization', `Bearer ${this.getToken()}`);
                    }
                },
                statusCode: {
                    401: () => {
                        if (this.isAuthenticated()) {
                            console.error('[API] 401 Unauthorized - clearing token');
                            this.removeToken();
                            window.location.href = 'login.html';
                        }
                        resolve({
                            success: false,
                            status: 401,
                            data: { success: false, message: 'Unauthorized' }
                        });
                    },
                    403: (xhr) => {
                        console.error('[API] 403 Forbidden');
                        let errorData = { success: false, message: 'Forbidden - Insufficient permissions' };
                        try {
                            const responseText = xhr.responseText;
                            if (responseText) {
                                const parsed = JSON.parse(responseText);
                                errorData = parsed;
                            }
                        } catch (e) {
                            // If parsing fails, use default message
                        }
                        resolve({
                            success: false,
                            status: 403,
                            data: errorData
                        });
                    }
                },
                success: (data, textStatus, xhr) => {
                    resolve({
                        success: true,
                        status: xhr.status,
                        data: data || {},
                    });
                },
                error: (xhr, textStatus, errorThrown) => {
                    let errorData = {
                        success: false,
                        message: 'Network error. Please check your connection.',
                        error: errorThrown || textStatus,
                    };

                    if (xhr.responseText) {
                        try {
                            const parsed = JSON.parse(xhr.responseText);
                            errorData = parsed;
                        } catch (e) {
                            if (xhr.responseText.length < 200) {
                                errorData.message = xhr.responseText;
                            }
                        }
                    }

                    if (xhr.status !== 401 && xhr.status !== 403) {
                        resolve({
                            success: false,
                            status: xhr.status || 0,
                            data: errorData,
                        });
                    }
                }
            };

            $.ajax(ajaxOptions);
        });
    }
}

// Create a singleton instance
const apiClient = new ApiClient();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = apiClient;
}




