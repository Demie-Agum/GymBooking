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
const DEFAULT_AVATAR = (typeof CONFIG !== 'undefined' && CONFIG.DEFAULT_AVATAR) 
    ? CONFIG.DEFAULT_AVATAR 
    : 'images/default-avatar.png';

// Global variables
let allContacts = [];
let currentEditingId = null;
let currentContactPicture = null;

// ========================================
// Axios Configuration
// ========================================

axios.defaults.baseURL = API_BASE_URL;
axios.defaults.headers.common['Content-Type'] = 'application/json';
axios.defaults.headers.common['Accept'] = 'application/json';

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

axios.interceptors.response.use(
    response => response,
    error => {
        if (error.response?.status === 401) {
            clearAuth();
            showToast('Session expired. Please login again.', 'error');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);
        }
        return Promise.reject(error);
    }
);

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
    const sunIcon = document.getElementById('sunIconDash');
    const moonIcon = document.getElementById('moonIconDash');
    
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

const themeToggle = document.getElementById('themeToggleDashboard');
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
    const token = getToken();
    const user = getUser();
    
    if (!token || !user) {
        window.location.href = 'login.html';
        return false;
    }
    
    try {
        const response = await axios.get('/user');
        return response.data.success;
    } catch (error) {
        clearAuth();
        showToast('Session expired. Please login again.', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
        return false;
    }
}

// ========================================
// Load User Data
// ========================================

async function loadUserData() {
    const user = getUser();
    
    if (user) {
        const userNameEl = document.getElementById('userName');
        if (userNameEl) {
            userNameEl.textContent = user.firstname;
        }
    }
    
    try {
        const response = await axios.get('/user');
        if (response.data.success) {
            const freshUser = response.data.data.user;
            localStorage.setItem(USER_KEY, JSON.stringify(freshUser));
            
            const userNameEl = document.getElementById('userName');
            if (userNameEl) {
                userNameEl.textContent = freshUser.firstname;
            }
        }
    } catch (error) {
        console.error('Failed to fetch user data:', error);
    }
}

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
            await axios.post('/logout');
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
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
// Load Contacts
// ========================================

async function loadContacts() {
    const contactsGrid = document.getElementById('contactsGrid');
    
    contactsGrid.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <p>Loading contacts...</p>
        </div>
    `;
    
    try {
        const response = await axios.get('/contacts');
        
        if (response.data.success) {
            allContacts = response.data.data;
            displayContacts(allContacts);
            updateContactCount(allContacts.length);
        }
    } catch (error) {
        console.error('Failed to load contacts:', error);
        contactsGrid.innerHTML = `
            <div class="empty-state">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <h3>Failed to Load Contacts</h3>
                <p>Please try again later</p>
            </div>
        `;
        showToast('Failed to load contacts', 'error');
    }
}

// ========================================
// Display Contacts
// ========================================

function displayContacts(contacts) {
    const contactsGrid = document.getElementById('contactsGrid');
    
    if (contacts.length === 0) {
        contactsGrid.innerHTML = `
            <div class="table-empty-state">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                </svg>
                <h3>No Contacts Yet</h3>
                <p>Start by adding your first contact</p>
                <button class="btn btn-primary" onclick="openAddContactModal()">
                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                    </svg>
                    Add Contact
                </button>
            </div>
        `;
        return;
    }
    
    const tableRows = contacts.map(contact => {
        const avatarSrc = contact.contact_picture || DEFAULT_AVATAR;
        
        return `
            <tr>
                <td>
                    <div class="contact-info">
                        <img src="${avatarSrc}" 
                             alt="${contact.contact_name}" 
                             class="contact-avatar"
                             onerror="this.src='${DEFAULT_AVATAR}'">
                        <div class="contact-details">
                            <div class="contact-table-name">${contact.contact_name}</div>
                            <div class="contact-table-number">${contact.contact_number}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <div class="contact-table-actions">
                        <button class="btn-table-icon btn-table-edit" onclick="editContact(${contact.id})">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                            </svg>
                            <span>Edit</span>
                        </button>
                        <button class="btn-table-icon btn-table-delete" onclick="deleteContact(${contact.id})">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                            <span>Delete</span>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    contactsGrid.innerHTML = `
        <div class="contacts-table-container">
            <table class="contacts-table">
                <thead>
                    <tr>
                        <th>Contact</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
        </div>
    `;
}

// ========================================
// Update Contact Count
// ========================================

function updateContactCount(count) {
    const contactCountEl = document.getElementById('contactCount');
    if (contactCountEl) {
        contactCountEl.textContent = `You have ${count} contact${count !== 1 ? 's' : ''}`;
    }
}

// ========================================
// Search Contacts
// ========================================

const searchInput = document.getElementById('searchInput');
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();
        
        if (searchTerm === '') {
            displayContacts(allContacts);
        } else {
            const filtered = allContacts.filter(contact => 
                contact.contact_name.toLowerCase().includes(searchTerm) ||
                contact.contact_number.includes(searchTerm)
            );
            displayContacts(filtered);
        }
    });
}

// ========================================
// Modal Functions (FIXED)
// ========================================

function openAddContactModal() {
    currentEditingId = null;
    currentContactPicture = null;
    
    document.getElementById('modalTitle').textContent = 'Add Contact';
    document.getElementById('contactId').value = '';
    document.getElementById('contactName').value = '';
    document.getElementById('contactNumber').value = '';
    document.getElementById('contactPicturePreview').src = DEFAULT_AVATAR;
    
    // FIXED: Reset the file input
    const fileInput = document.getElementById('contactPictureInput');
    if (fileInput) {
        fileInput.value = '';
    }
    
    const modal = document.getElementById('contactModal');
    modal.classList.add('show');
}

function closeContactModal() {
    const modal = document.getElementById('contactModal');
    modal.classList.remove('show');
    
    // Reset form
    document.getElementById('contactForm').reset();
    
    // FIXED: Reset file input
    const fileInput = document.getElementById('contactPictureInput');
    if (fileInput) {
        fileInput.value = '';
    }
    
    currentEditingId = null;
    currentContactPicture = null;
}

// Close modal when clicking outside
document.getElementById('contactModal').addEventListener('click', (e) => {
    if (e.target.id === 'contactModal') {
        closeContactModal();
    }
});

// ========================================
// Image Upload Handler (FIXED)
// ========================================

const contactPictureInput = document.getElementById('contactPictureInput');
if (contactPictureInput) {
    contactPictureInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        
        if (file) {
            if (!file.type.startsWith('image/')) {
                showToast('Please select an image file', 'error');
                return;
            }
            
            if (file.size > 2 * 1024 * 1024) {
                showToast('Image size should be less than 2MB', 'error');
                return;
            }
            
            const reader = new FileReader();
            reader.onload = (event) => {
                // FIXED: Mark that user uploaded a NEW image
                currentContactPicture = event.target.result;
                document.getElementById('contactPicturePreview').src = currentContactPicture;
            };
            reader.readAsDataURL(file);
        }
    });
}

// ========================================
// Save Contact (FIXED - Add/Edit)
// ========================================

const saveContactBtn = document.getElementById('saveContactBtn');
if (saveContactBtn) {
    saveContactBtn.addEventListener('click', async () => {
        const name = document.getElementById('contactName').value.trim();
        const number = document.getElementById('contactNumber').value.trim();
        
        if (!name) {
            showToast('Please enter contact name', 'error');
            return;
        }
        
        if (!number) {
            showToast('Please enter contact number', 'error');
            return;
        }
        
        const contactData = {
            contact_name: name,
            contact_number: number
        };
        
        // FIXED: Only include picture if it's a new base64 upload
        if (currentContactPicture && 
            currentContactPicture !== DEFAULT_AVATAR && 
            currentContactPicture.startsWith('data:image')) {
            contactData.contact_picture = currentContactPicture;
        }
        
        saveContactBtn.classList.add('btn-loading');
        saveContactBtn.disabled = true;
        
        try {
            let response;
            
            if (currentEditingId) {
                console.log('Updating contact:', currentEditingId, contactData);
                response = await axios.put(`/contacts/${currentEditingId}`, contactData);
            } else {
                console.log('Creating contact:', contactData);
                response = await axios.post('/contacts', contactData);
            }
            
            if (response.data.success) {
                showToast(response.data.message, 'success');
                closeContactModal();
                await loadContacts();
            }
        } catch (error) {
            console.error('Save contact error:', error);
            console.error('Error details:', error.response?.data);
            const message = error.response?.data?.message || 'Failed to save contact';
            showToast(message, 'error');
        } finally {
            saveContactBtn.classList.remove('btn-loading');
            saveContactBtn.disabled = false;
        }
    });
}

// ========================================
// Edit Contact (FIXED)
// ========================================

async function editContact(id) {
    try {
        const response = await axios.get(`/contacts/${id}`);
        
        if (response.data.success) {
            const contact = response.data.data;
            
            currentEditingId = id;
            // FIXED: Store original picture, don't modify it
            currentContactPicture = contact.contact_picture || null;
            
            document.getElementById('modalTitle').textContent = 'Edit Contact';
            document.getElementById('contactId').value = contact.id;
            document.getElementById('contactName').value = contact.contact_name;
            document.getElementById('contactNumber').value = contact.contact_number;
            document.getElementById('contactPicturePreview').src = contact.contact_picture || DEFAULT_AVATAR;
            
            // FIXED: Reset file input when editing
            const fileInput = document.getElementById('contactPictureInput');
            if (fileInput) {
                fileInput.value = '';
            }
            
            const modal = document.getElementById('contactModal');
            modal.classList.add('show');
        }
    } catch (error) {
        console.error('Failed to fetch contact:', error);
        showToast('Failed to load contact details', 'error');
    }
}

window.editContact = editContact;

// ========================================
// Delete Contact
// ========================================

async function deleteContact(id) {
    const result = await Swal.fire({
        title: 'Delete Contact?',
        text: 'This action cannot be undone',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, delete it',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#ef4444'
    });
    
    if (result.isConfirmed) {
        try {
            const response = await axios.delete(`/contacts/${id}`);
            
            if (response.data.success) {
                showToast('Contact deleted successfully', 'success');
                await loadContacts();
            }
        } catch (error) {
            console.error('Delete contact error:', error);
            showToast('Failed to delete contact', 'error');
        }
    }
}

window.deleteContact = deleteContact;

// ========================================
// Add Contact Button
// ========================================

const addContactBtn = document.getElementById('addContactBtn');
if (addContactBtn) {
    addContactBtn.addEventListener('click', openAddContactModal);
}

window.openAddContactModal = openAddContactModal;
window.closeContactModal = closeContactModal;

// ========================================
// Initialize Dashboard
// ========================================

document.addEventListener('DOMContentLoaded', async () => {
    const isAuthenticated = await checkAuth();
    
    if (isAuthenticated) {
        initTheme();
        await loadUserData();
        await loadContacts();
        
        console.log('Dashboard initialized');
    }
});