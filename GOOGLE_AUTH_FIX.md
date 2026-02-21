# Google Authentication Mobile Fix

## Problem
The Google Sign-In feature was failing on mobile browsers with the error:
```
Authentication error: Firebase: Error (auth/popup-blocked). (auth/popup-blocked)
```

This occurred because the app was using `signInWithPopup()`, which relies on browser popups that are commonly blocked on mobile devices.

## Solution
Replaced the popup-based authentication flow with a redirect-based flow using `signInWithRedirect()` and `getRedirectResult()`.

### Changes Made

#### Both Apps (Student & Driver)
1. **Updated Firebase Auth imports**:
   - Removed: `signInWithPopup`
   - Added: `signInWithRedirect`, `getRedirectResult`

2. **Added redirect result handling**:
   - Added `useEffect` hook that runs on component mount
   - Checks for redirect result when user returns from Google Sign-In
   - Saves user data to Firestore upon successful authentication
   - Redirects to dashboard after successful authentication

3. **Modified Google Sign-In flow**:
   - Changed from `signInWithPopup()` to `signInWithRedirect()`
   - The flow now:
     1. User clicks "Continue with Google"
     2. Page redirects to Google's authentication page
     3. User authenticates with Google
     4. Google redirects back to the app
     5. `useEffect` hook processes the result
     6. User is redirected to dashboard

4. **Added loading state**:
   - Shows "Processing authentication..." message while checking for redirect result
   - Displays animated spinner for better UX
   - Prevents flash of login form during redirect processing

### Files Modified
- `apps/student/pages/auth/signin.js`
- `apps/driver/pages/auth/signin.js`

## Benefits
✅ Works on all mobile browsers (no popup blocking issues)
✅ Better user experience with loading states
✅ More reliable authentication flow
✅ Consistent behavior across devices

## Testing
To test the fix:
1. Open the app on a mobile device or mobile browser
2. Click "Continue with Google"
3. You should be redirected to Google's sign-in page
4. After signing in, you'll be redirected back to the app
5. The app will show "Processing authentication..." briefly
6. You'll be automatically redirected to the dashboard

## Notes
- The redirect flow is the recommended approach for mobile devices according to Firebase documentation
- Email/password authentication remains unchanged and works as before
- The loading state prevents confusion during the redirect process
