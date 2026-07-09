# Render Deployment Guide - Quality Inspection Agent

## 🚀 Quick Deploy Using render.yaml

1. **Commit and Push the render.yaml file:**
   ```bash
   git add render.yaml
   git commit -m "Add Render deployment configuration"
   git push origin main
   ```

2. **In Render Dashboard:**
   - Click "New" → "Blueprint"
   - Connect your GitHub repository
   - Render will automatically detect `render.yaml` and create your services

3. **Add Secret Environment Variables:**
   After services are created, add these manually:
   - `GEMINI_API_KEY`: Your Google Gemini API key
   - `JAVA_API_URL`: URL of your Java backend (if deployed separately)
   - `FRONTEND_URL`: URL of your frontend after deployment

---

## 📝 Manual Configuration (Alternative Method)

### Node.js Backend Service

#### Basic Settings:
- **Name**: `quality-inspection-node-server`
- **Runtime**: Node
- **Region**: Oregon (or your preferred region)
- **Branch**: `main`
- **Root Directory**: `node-server` ⚠️ **CRITICAL!**
- **Build Command**: `npm install`
- **Start Command**: `npm start`

#### Environment Variables to Add:

| Key | Value | Notes |
|-----|-------|-------|
| `NODE_ENV` | `production` | Required |
| `PORT` | `10000` | Render default port |
| `JWT_SECRET` | `[Your secure secret]` | ⚠️ Generate a new secure key for production! |
| `JWT_EXPIRES_IN` | `24h` | Token expiration |
| `GEMINI_API_KEY` | `[Your API key]` | ⚠️ Get from Google AI Studio |
| `UPLOAD_DIR` | `uploads` | File upload directory |
| `MAX_FILE_SIZE_MB` | `10` | Max upload size |
| `ALLOWED_TYPES` | `image/jpeg,image/png,image/webp,image/gif` | Allowed file types |
| `JAVA_API_URL` | `[Your Java backend URL]` | Optional: if Java backend is deployed |
| `FRONTEND_URL` | `[Your frontend URL]` | For CORS configuration |

---

## 🔐 Important Security Notes

### 1. Generate New Secrets for Production

**DO NOT use your development secrets in production!**

Generate a new JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 2. Gemini API Key
- Get your API key from: https://aistudio.google.com/app/apikey
- Never commit API keys to your repository
- Add it only in Render's environment variables dashboard

### 3. MongoDB Connection
Your current setup uses Java backend with MySQL. If you need MongoDB:
- Use MongoDB Atlas (free tier available)
- Set `MONGODB_URI` environment variable

---

## 🌐 Frontend Deployment

### Option 1: Static Site on Render
1. Create a new "Static Site" service
2. **Build Command**: `echo "No build needed"`
3. **Publish Directory**: `frontend`
4. Connect to same repository

### Option 2: Frontend with Backend
If you want to serve frontend from Node.js:

Add to your `node-server/server.js`:
```javascript
// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});
```

Update `render.yaml` rootDir to `.` (root) instead of `node-server`.

---

## 🔧 Troubleshooting

### Build Fails: "Unknown command: build"
✅ **Solution**: Change Build Command to `npm install` (not `npm build`)

### App Crashes: "Cannot find module"
✅ **Solution**: Ensure Root Directory is set to `node-server`

### CORS Errors
✅ **Solution**: Set `FRONTEND_URL` environment variable to your actual frontend URL

### File Upload Issues
✅ **Solution**: Render's free tier has ephemeral storage. Consider using cloud storage (AWS S3, Cloudinary) for production

---

## 📊 After Deployment

1. **Test your endpoints:**
   ```bash
   curl https://your-app.onrender.com/health
   ```

2. **Update frontend API URLs:**
   Edit `frontend/js/api.js` to use your Render backend URL

3. **Monitor logs:**
   - Go to Render Dashboard → Your Service → Logs
   - Enable "Live Tail" for real-time monitoring

---

## 🎯 Next Steps

- [ ] Deploy Node.js backend to Render
- [ ] Add all environment variables
- [ ] Test API endpoints
- [ ] Deploy frontend (static site or with backend)
- [ ] Update frontend to use production API URL
- [ ] Set up custom domain (optional)
- [ ] Configure monitoring and alerts

---

## 📚 Additional Resources

- [Render Node.js Deployment Docs](https://render.com/docs/deploy-node-express-app)
- [Render Environment Variables](https://render.com/docs/environment-variables)
- [Render Free Tier Limits](https://render.com/docs/free)
