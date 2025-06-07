# ✅ QR Ordering Platform – Prelaunch Checklist

This file tracks all important tasks to complete before launching the platform.

---

## 🔒 Security & Authentication

- [x] Admin login with JWT token
- [x] Middleware protection for admin routes
- [ ] Password hashing (make sure `hashpassword.js` is used properly)
- [ ] Admin password reset or change mechanism (optional for v1)

---

## 🍽️ Core Features

### Customer Side

- [x] QR-based menu loading via `/outlet/[slug]`
- [x] Add/remove items to cart
- [x] Quantity management
- [x] Total price calculation
- [x] Image and fallback image support
- [x] Order placement with session_id (dine-in & takeaway)
- [ ] Close session button works correctly
- [ ] Proper mobile responsiveness (test on real phone)

### Admin Side

- [x] Real-time order updates via Socket.IO
- [x] Order grouping by session
- [x] View customer name, table number, items, and total
- [x] Mark order as completed
- [x] Outlet filter
- [x] Search bar
- [x] Sound notification
- [ ] Pagination or "Load more" for large number of orders (optional)

---

## 🛠️ Menu & Outlet Management

- [x] Menu editor UI with add/edit/delete
- [x] Dish form with name, price, image
- [x] Image upload route and file handling
- [x] Menu.json kept in `public/outlets/[slug]/menu.json` ✅
- [ ] Add category support (optional but helpful)

---

## 💾 Backend & DB

- [x] PostgreSQL integration
- [x] Tables: orders, dishes, menus, outlets, sessions
- [x] Orders correctly saved with session_id
- [x] Order status updates with PATCH
- [ ] Avoid `/api/orders/undefined/status` issue in all cases (double check)

---

## 🔔 Real-Time & Socket.IO

- [x] Admin receives `newOrder` and `orderStatusUpdate` in real time
- [x] SocketClient connects without duplication
- [x] Notification sound plays once
- [ ] UI updates on second order in same session (already fixed – recheck stability)

---

## 💄 UI & UX Polish

- [x] Show logo and outlet name on top
- [x] Cart UI with scrollable item list
- [x] Admin dashboard layout clean & responsive
- [ ] Customer ordering UI looks nice (test fonts/colors/images)
- [ ] Loading indicators (optional)
- [ ] Error messages (network/API failed)

---

## 📦 Deployment Readiness

- [ ] Environment variables stored in `.env.local` correctly
- [ ] Node, npm version compatible
- [ ] `next.config.mjs` clean (no unused settings)
- [ ] Disable test APIs before production (`/api/test/route.js`)
- [ ] Add license file / terms (optional)

---

## 🧪 Testing

- [ ] Manual testing on:
  - [ ] Chrome desktop
  - [ ] Chrome Android
  - [ ] Safari iOS (if possible)
- [ ] Multiple outlets tested with different logos and menus
- [ ] Invalid slugs or routes return fallback/404

---

## 🚀 Final Launch Steps

- [ ] Add a logo for each outlet in `uploads/outlets/[slug]/`
- [ ] Backup `menu.json` files
- [ ] Notify first clients/outlets
- [ ] Monitor real-time orders in production

---

### ✅ Status Summary:
- **Core features complete:** 90%  
- **Ready for testing phase & soft launch**
- **Goal:** Launch beta with 1–2 outlets and get feedback

