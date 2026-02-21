# Mobile Optimization Quick Reference

## 🎯 Quick Checklist for Mobile-Friendly Components

### ✅ Essential Mobile Rules

#### 1. Touch Targets
```css
/* Minimum size for all interactive elements */
button, a, input, select {
    min-height: 48px;
    min-width: 48px;
}
```

#### 2. Font Sizes
```css
/* Prevent iOS zoom on input focus */
input, select, textarea {
    font-size: 16px !important;
}

/* Body text */
p, span, div {
    font-size: clamp(14px, 3.5vw, 16px);
}
```

#### 3. Responsive Containers
```css
@media (max-width: 767px) {
    .container {
        padding: 16px !important;
        width: 100% !important;
    }
}
```

#### 4. Full-Width Buttons on Mobile
```css
@media (max-width: 767px) {
    button, .btn {
        width: 100% !important;
        display: block !important;
    }
}
```

---

## 📱 Common Mobile Patterns

### Pattern 1: Responsive Grid
```css
.grid {
    display: grid;
    grid-template-columns: 1fr; /* Mobile: 1 column */
    gap: 12px;
}

@media (min-width: 768px) {
    .grid {
        grid-template-columns: repeat(2, 1fr); /* Tablet: 2 columns */
    }
}

@media (min-width: 1024px) {
    .grid {
        grid-template-columns: repeat(4, 1fr); /* Desktop: 4 columns */
    }
}
```

### Pattern 2: Stack on Mobile
```css
.flex-row {
    display: flex;
    flex-direction: row;
    gap: 12px;
}

@media (max-width: 767px) {
    .flex-row {
        flex-direction: column !important;
    }
}
```

### Pattern 3: Mobile Modal
```css
.modal {
    width: 75%;
    max-width: 900px;
    padding: 32px;
}

@media (max-width: 767px) {
    .modal {
        width: 95% !important;
        max-width: 95% !important;
        padding: 20px !important;
        max-height: 85vh !important;
        overflow-y: auto !important;
    }
}
```

### Pattern 4: Responsive Map
```css
.map-container {
    height: 80vh;
    min-height: 600px;
}

@media (max-width: 767px) {
    .map-container {
        height: 60vh !important;
        min-height: 300px !important;
    }
}
```

---

## 🛠️ Utility Classes

### Visibility
```html
<!-- Hide on mobile -->
<div class="hide-mobile">Desktop only content</div>

<!-- Show only on mobile -->
<div class="show-mobile">Mobile only content</div>

<!-- Hide on tablet and above -->
<div class="hide-tablet-up">Mobile only content</div>
```

### Layout
```html
<!-- Full width on mobile -->
<button class="full-width-mobile">Button</button>

<!-- Stack on mobile -->
<div class="stack-mobile">
    <button>Button 1</button>
    <button>Button 2</button>
</div>

<!-- Center text on mobile -->
<div class="text-center-mobile">Centered on mobile</div>
```

---

## 🎨 Component Examples

### Responsive Header
```jsx
<div className="dashboard-header" style={{
    padding: '20px 48px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap'
}}>
    <h1>Dashboard</h1>
    <div className="header-actions stack-mobile" style={{
        display: 'flex',
        gap: '12px'
    }}>
        <button>Action 1</button>
        <button>Action 2</button>
    </div>
</div>
```

### Responsive Card
```jsx
<div className="card" style={{
    padding: '24px',
    borderRadius: '16px',
    marginBottom: '20px'
}}>
    <h2>Card Title</h2>
    <p>Card content</p>
</div>
```

### Responsive Form
```jsx
<form className="form-grid" style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '20px'
}}>
    <input type="text" placeholder="Name" />
    <input type="email" placeholder="Email" />
    <input type="tel" placeholder="Phone" />
    <textarea className="full-width" placeholder="Message"></textarea>
    <button type="submit" className="full-width">Submit</button>
</form>
```

---

## 🔧 Common Fixes

### Fix 1: Prevent Horizontal Scroll
```css
html, body {
    overflow-x: hidden !important;
    width: 100%;
    max-width: 100vw;
}
```

### Fix 2: iOS Viewport Height
```javascript
// In useEffect or componentDidMount
const setVH = () => {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
};

setVH();
window.addEventListener('resize', setVH);
```

### Fix 3: Smooth Touch Scrolling
```css
* {
    -webkit-overflow-scrolling: touch;
    scroll-behavior: smooth;
}
```

### Fix 4: Remove Tap Highlight
```css
* {
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout: none;
}

/* Add custom tap feedback */
button:active {
    opacity: 0.7;
    transform: scale(0.97);
}
```

---

## 📏 Breakpoints Reference

```css
/* Mobile (Default) */
/* 320px - 767px */

/* Tablet */
@media (min-width: 768px) and (max-width: 1023px) {
    /* Styles */
}

/* Desktop */
@media (min-width: 1024px) {
    /* Styles */
}

/* Large Desktop */
@media (min-width: 1440px) {
    /* Styles */
}

/* Landscape Mobile */
@media (max-height: 600px) and (orientation: landscape) {
    /* Styles */
}

/* Touch Devices */
@media (hover: none) and (pointer: coarse) {
    /* Styles */
}
```

---

## ⚡ Performance Tips

### 1. Use CSS Transforms for Animations
```css
/* Good */
.element {
    transform: translateX(100px);
    transition: transform 0.3s;
}

/* Avoid */
.element {
    left: 100px;
    transition: left 0.3s;
}
```

### 2. Lazy Load Heavy Components
```javascript
import dynamic from 'next/dynamic';

const Map = dynamic(() => import('../components/Map'), { 
    ssr: false,
    loading: () => <div>Loading map...</div>
});
```

### 3. Optimize Images
```jsx
<img 
    src="/image.jpg" 
    alt="Description"
    loading="lazy"
    style={{ maxWidth: '100%', height: 'auto' }}
/>
```

---

## 🎯 Testing Commands

### Test on Different Viewports
```bash
# Chrome DevTools
# Press F12 > Toggle Device Toolbar (Ctrl+Shift+M)
# Select device or custom dimensions
```

### Test Responsive Design
```bash
# Firefox
# Press F12 > Responsive Design Mode (Ctrl+Shift+M)
```

### Test on Real Device
```bash
# Get local IP
ipconfig  # Windows
ifconfig  # Mac/Linux

# Access from mobile
http://YOUR_IP:3000  # Student app
http://YOUR_IP:3001  # Driver app
```

---

## 📱 Mobile-Specific CSS Classes

### Already Available in mobile-enhanced.css

```css
.hide-mobile          /* Hide on mobile */
.show-mobile          /* Show only on mobile */
.full-width-mobile    /* Full width on mobile */
.text-center-mobile   /* Center text on mobile */
.stack-mobile         /* Stack vertically on mobile */
.responsive-padding   /* Scales from 16px to 32px */
.text-responsive      /* Scales from 14px to 18px */
.heading-responsive   /* Scales from 20px to 32px */
```

---

## 🚀 Quick Start for New Components

### 1. Start with Mobile Layout
```jsx
<div style={{
    padding: '16px',
    width: '100%'
}}>
    {/* Mobile-first content */}
</div>
```

### 2. Add Responsive Classes
```jsx
<div className="responsive-padding">
    <h1 className="heading-responsive">Title</h1>
    <p className="text-responsive">Content</p>
</div>
```

### 3. Test on Mobile
- Open Chrome DevTools
- Toggle device toolbar
- Test on iPhone SE (375px)
- Test on iPad (768px)
- Test on Desktop (1024px+)

---

## ✅ Pre-Launch Checklist

- [ ] All text is at least 14px (16px for inputs)
- [ ] All buttons are at least 48px tall
- [ ] No horizontal scrolling on any page
- [ ] Forms work properly on mobile
- [ ] Modals fit on screen
- [ ] Maps are properly sized
- [ ] Tables are accessible (card layout or scroll)
- [ ] Navigation works on touch devices
- [ ] Images scale correctly
- [ ] Tested on real mobile device

---

## 📞 Need Help?

### Common Issues
1. **Element too small**: Add `min-height: 48px`
2. **Text too small**: Use `clamp(14px, 3.5vw, 16px)`
3. **Layout breaks**: Add `@media (max-width: 767px)` rule
4. **Horizontal scroll**: Check for fixed widths, use `max-width: 100%`
5. **Modal too large**: Set `max-height: 85vh` and `overflow-y: auto`

### Resources
- See `MOBILE_OPTIMIZATION.md` for detailed guide
- Check existing components for examples
- Use browser DevTools for debugging

---

**Happy Mobile Optimizing!** 📱✨
