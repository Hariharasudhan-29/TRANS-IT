# TRANS-IT: Vercel Deployment Guide

## Overview
This guide will walk you through deploying both the Student Panel and Driver/Admin Panel to Vercel.

---

## Prerequisites

### 1. Create a Vercel Account
- Go to [vercel.com](https://vercel.com)
- Sign up using GitHub, GitLab, or Bitbucket (recommended: GitHub)
- Verify your email address

### 2. Install Vercel CLI (Optional but Recommended)
```bash
npm install -g vercel
```

### 3. Prepare Your Firebase Configuration
You'll need your Firebase configuration details from the Firebase Console:
- API Key
- Auth Domain
- Project ID
- Storage Bucket
- Messaging Sender ID
- App ID

---

## Deployment Steps

### STEP 1: Prepare Your Project for Deployment

#### 1.1 Ensure Git Repository
Make sure your project is in a Git repository:

```bash
# Navigate to project root
cd d:/projects/TRANS---IT-main

# Initialize git if not already done
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit for Vercel deployment"
```

#### 1.2 Create GitHub Repository
1. Go to [github.com](https://github.com)
2. Click "New Repository"
3. Name it: `trans-it` or `TRANS-IT`
4. Don't initialize with README (you already have files)
5. Click "Create Repository"

#### 1.3 Push to GitHub
```bash
# Add remote origin (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/trans-it.git

# Push to GitHub
git branch -M main
git push -u origin main
```

---

### STEP 2: Deploy Student Panel

#### 2.1 Import Project to Vercel
1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Click **"Import Git Repository"**
4. Select your `trans-it` repository
5. Click **"Import"**

#### 2.2 Configure Student Panel Deployment
When the import screen appears:

**Project Settings:**
- **Project Name:** `trans-it-student` (or your preferred name)
- **Framework Preset:** Next.js (should auto-detect)
- **Root Directory:** Click **"Edit"** → Select `apps/student`
- **Build Command:** `npm run build` (default)
- **Output Directory:** `.next` (default)
- **Install Command:** `npm install` (default)

#### 2.3 Add Environment Variables
Click **"Environment Variables"** and add the following:

```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain_here
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id_here
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket_here
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id_here
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id_here
```

**Important:** 
- Copy these values from your `apps/student/.env.local` file
- Make sure to use `NEXT_PUBLIC_` prefix for client-side access
- Add them for all environments (Production, Preview, Development)

#### 2.4 Deploy
1. Click **"Deploy"**
2. Wait for the build to complete (2-5 minutes)
3. Once deployed, you'll get a URL like: `https://trans-it-student.vercel.app`

---

### STEP 3: Deploy Driver/Admin Panel

#### 3.1 Add Another Project
1. Go back to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Click **"Import Git Repository"**
4. Select the **same** `trans-it` repository
5. Click **"Import"**

#### 3.2 Configure Driver/Admin Panel Deployment
**Project Settings:**
- **Project Name:** `trans-it-driver` (or your preferred name)
- **Framework Preset:** Next.js
- **Root Directory:** Click **"Edit"** → Select `apps/driver`
- **Build Command:** `npm run build`
- **Output Directory:** `.next`
- **Install Command:** `npm install`

#### 3.3 Add Environment Variables
Add the same Firebase environment variables:

```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain_here
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id_here
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket_here
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id_here
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id_here
```

#### 3.4 Deploy
1. Click **"Deploy"**
2. Wait for the build to complete
3. You'll get a URL like: `https://trans-it-driver.vercel.app`

---

### STEP 4: Configure Firebase for Production

#### 4.1 Update Firebase Authorized Domains
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to **Authentication** → **Settings** → **Authorized domains**
4. Click **"Add domain"**
5. Add your Vercel domains:
   - `trans-it-student.vercel.app`
   - `trans-it-driver.vercel.app`
   - Any custom domains you plan to use

#### 4.2 Update Firestore Security Rules (if needed)
Ensure your Firestore rules allow access from the new domains.

---

### STEP 5: Test Your Deployments

#### 5.1 Test Student Panel
1. Visit your student panel URL: `https://trans-it-student.vercel.app`
2. Test the following:
   - Sign up / Sign in
   - Registration form
   - Bus tracking
   - QR code scanning (requires HTTPS - Vercel provides this)
   - Profile editing
   - Dark mode toggle

#### 5.2 Test Driver Panel
1. Visit your driver panel URL: `https://trans-it-driver.vercel.app`
2. Test:
   - Driver login
   - Start trip
   - GPS tracking
   - Delay reporting
   - End trip

#### 5.3 Test Admin Panel
1. Visit: `https://trans-it-driver.vercel.app/admin-login`
2. Test:
   - Admin login
   - View registered students
   - Delay report acknowledgment
   - Live fleet tracking
   - Announcements
   - All other admin features

---

### STEP 6: Set Up Custom Domains (Optional)

#### 6.1 Purchase Domain
Purchase a domain from providers like:
- Namecheap
- GoDaddy
- Google Domains
- Cloudflare

#### 6.2 Add Custom Domain to Vercel
1. Go to your project in Vercel Dashboard
2. Click **"Settings"** → **"Domains"**
3. Enter your domain (e.g., `student.trans-it.com`)
4. Follow Vercel's DNS configuration instructions
5. Repeat for driver panel (e.g., `driver.trans-it.com`)

#### 6.3 Update Firebase Authorized Domains
Add your custom domains to Firebase authorized domains list.

---

## Continuous Deployment

### Automatic Deployments
Vercel automatically deploys when you push to GitHub:

```bash
# Make changes to your code
# Commit changes
git add .
git commit -m "Update feature X"

# Push to GitHub
git push origin main

# Vercel automatically detects the push and redeploys
```

### Preview Deployments
- Every pull request gets a unique preview URL
- Test changes before merging to main
- Automatic cleanup after merge

---

## Environment-Specific Configuration

### Production vs Development
You can set different environment variables for:
- **Production:** Live users
- **Preview:** Pull request previews
- **Development:** Local development

### Managing Secrets
- Never commit `.env.local` files to Git
- Use Vercel's Environment Variables dashboard
- Rotate API keys periodically

---

## Troubleshooting

### Build Failures

#### Issue: "Module not found"
**Solution:**
```bash
# Ensure all dependencies are in package.json
cd apps/student  # or apps/driver
npm install
```

#### Issue: "Environment variable not defined"
**Solution:**
- Check that all `NEXT_PUBLIC_` variables are set in Vercel dashboard
- Redeploy after adding variables

#### Issue: "Build exceeded maximum duration"
**Solution:**
- Optimize images and assets
- Check for infinite loops in build scripts
- Contact Vercel support for limit increase

### Runtime Errors

#### Issue: "Firebase: Error (auth/unauthorized-domain)"
**Solution:**
- Add your Vercel domain to Firebase Authorized Domains
- Wait 5-10 minutes for changes to propagate

#### Issue: "Camera not working for QR scanner"
**Solution:**
- Ensure you're accessing via HTTPS (Vercel provides this automatically)
- Check browser permissions

#### Issue: "Map not loading"
**Solution:**
- Check browser console for errors
- Ensure Leaflet CSS is imported
- Verify no CSP (Content Security Policy) issues

### Performance Issues

#### Issue: "Slow page loads"
**Solution:**
- Enable Vercel Analytics to identify bottlenecks
- Optimize images using Next.js Image component
- Implement code splitting
- Use dynamic imports for heavy components

---

## Monitoring & Analytics

### Vercel Analytics
1. Go to your project in Vercel Dashboard
2. Click **"Analytics"**
3. Enable Web Analytics
4. View real-time performance metrics

### Firebase Console
- Monitor Firestore usage
- Check Authentication logs
- Review error reports

---

## Backup & Rollback

### Rollback to Previous Deployment
1. Go to Vercel Dashboard → Your Project
2. Click **"Deployments"**
3. Find the working deployment
4. Click **"..."** → **"Promote to Production"**

### Download Deployment
You can download any deployment for backup:
1. Go to specific deployment
2. Click **"..."** → **"Download Deployment"**

---

## Cost Considerations

### Vercel Free Tier Includes:
- Unlimited deployments
- 100 GB bandwidth per month
- Automatic HTTPS
- Preview deployments
- Analytics (basic)

### Upgrade to Pro if you need:
- More bandwidth
- Team collaboration
- Advanced analytics
- Password protection
- Custom deployment regions

### Firebase Free Tier (Spark Plan):
- 50,000 reads/day
- 20,000 writes/day
- 20,000 deletes/day
- 1 GB storage
- 10 GB/month bandwidth

**Monitor usage to avoid unexpected charges!**

---

## Security Best Practices

### 1. Environment Variables
- Never expose Firebase private keys
- Use `NEXT_PUBLIC_` only for client-safe variables
- Rotate credentials periodically

### 2. Firestore Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Only authenticated users can read tracking data
    match /tracking/{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    // Only admins can write to certain collections
    match /announcements/{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
                     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

### 3. CORS Configuration
Vercel handles CORS automatically, but ensure Firebase is configured correctly.

---

## Quick Reference Commands

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy from command line (from project root)
cd apps/student
vercel

# Deploy to production
vercel --prod

# Check deployment status
vercel ls

# View logs
vercel logs [deployment-url]

# Remove deployment
vercel remove [deployment-name]
```

---

## Post-Deployment Checklist

- [ ] Student Panel deployed and accessible
- [ ] Driver Panel deployed and accessible
- [ ] Admin Panel accessible at `/admin-login`
- [ ] Firebase domains authorized
- [ ] All environment variables set
- [ ] Sign up/Sign in working
- [ ] QR code scanner working (HTTPS required)
- [ ] Real-time tracking functional
- [ ] Maps loading correctly
- [ ] Dark mode working
- [ ] Mobile responsive
- [ ] All forms submitting correctly
- [ ] Firestore security rules configured
- [ ] Analytics enabled
- [ ] Custom domains configured (if applicable)

---

## Support & Resources

### Vercel Documentation
- [Vercel Docs](https://vercel.com/docs)
- [Next.js on Vercel](https://vercel.com/docs/frameworks/nextjs)
- [Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

### Firebase Documentation
- [Firebase Console](https://console.firebase.google.com)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Auth](https://firebase.google.com/docs/auth)

### Community Support
- [Vercel Community](https://github.com/vercel/vercel/discussions)
- [Next.js Discord](https://nextjs.org/discord)
- [Firebase Stack Overflow](https://stackoverflow.com/questions/tagged/firebase)

---

## Conclusion

Your TRANS-IT application is now live on Vercel! 🚀

**Your URLs:**
- Student Panel: `https://trans-it-student.vercel.app`
- Driver Panel: `https://trans-it-driver.vercel.app`
- Admin Panel: `https://trans-it-driver.vercel.app/admin-login`

Remember to:
1. Monitor usage and performance
2. Keep dependencies updated
3. Regularly backup your Firebase data
4. Test new features in preview deployments before production

---

**Last Updated:** February 9, 2026  
**Version:** 1.0
