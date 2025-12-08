# Quick Deployment Guide

## 🚀 Quick Steps

### 1. Update API URL for Production

**Before deploying to GitHub Pages**, update the API URL:

1. Open `js/config.js`
2. Change this line:
   ```javascript
   API_BASE_URL: 'http://127.0.0.1:8000/api',
   ```
   To your Hostinger backend URL:
   ```javascript
   API_BASE_URL: 'https://yourdomain.com/api',
   ```
   Replace `yourdomain.com` with your actual Hostinger domain.

### 2. Deploy Frontend to GitHub Pages

1. **Initialize Git** (if not done):
   ```bash
   cd frontend
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. **Create GitHub Repository**:
   - Go to GitHub.com
   - Create new repository
   - Copy repository URL

3. **Push to GitHub**:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git branch -M main
   git push -u origin main
   ```

4. **Enable GitHub Pages**:
   - Go to repository Settings → Pages
   - Source: `main` branch, `/ (root)` folder
   - Click Save
   - Your site will be at: `https://YOUR_USERNAME.github.io/YOUR_REPO/`

### 3. Deploy Backend to Hostinger

1. **Upload Files**:
   - Upload all backend files to `public_html` via FTP/cPanel
   - Exclude: `node_modules/`, `.git/`, `storage/logs/*.log`

2. **Create Database**:
   - In cPanel → MySQL Databases
   - Create database and user
   - Note credentials

3. **Configure `.env`**:
   - Create `.env` file on server
   - Update database credentials
   - Set `APP_URL=https://yourdomain.com`
   - Set `APP_DEBUG=false`

4. **Set Permissions**:
   ```bash
   chmod -R 755 storage bootstrap/cache
   chmod -R 775 storage bootstrap/cache
   ```

5. **Run Migrations** (via SSH or cPanel terminal):
   ```bash
   php artisan migrate --force
   php artisan config:cache
   ```

6. **Update CORS** (`config/cors.php`):
   ```php
   'allowed_origins' => [
       'https://YOUR_USERNAME.github.io',
       'http://localhost:3000', // For local testing
   ],
   ```

### 4. Update Frontend with Production URL

After backend is live, update `js/config.js` with production URL and push to GitHub again.

---

## 📝 Important Notes

- **CORS**: Make sure your backend CORS allows your GitHub Pages URL
- **HTTPS**: Both frontend and backend should use HTTPS in production
- **Environment**: Set `APP_ENV=production` and `APP_DEBUG=false` in backend `.env`
- **Database**: Use MySQL on Hostinger (not SQLite)

---

## 🔍 Testing

1. Test frontend: Visit your GitHub Pages URL
2. Test backend: Visit `https://yourdomain.com/api/health` (if you have health endpoint)
3. Test login: Try logging in from the frontend

---

## 🐛 Common Issues

**CORS Error**: Update `config/cors.php` on Hostinger with your GitHub Pages URL

**500 Error**: Check Laravel logs at `storage/logs/laravel.log` on Hostinger

**Database Error**: Verify database credentials in `.env` file

**404 on Routes**: Ensure `.htaccess` is in `public` folder and mod_rewrite is enabled

---

For detailed instructions, see `DEPLOYMENT_GUIDE.md` in the root directory.

