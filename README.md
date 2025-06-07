This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).


## 🚀 Features

### ✅ Customer Side
- Scan QR code → redirect to outlet's menu page
- Dynamic, outlet-specific menu (driven by JSON or DB)
- Browse items with images and categories
- Add/remove items to cart, adjust quantity
- Total price calculation
- Place order with customer name, table number (or as takeaway)
- Session-based order tracking

### ✅ Admin Side
- Secure JWT-based admin login
- Real-time order updates via WebSocket
- View all orders grouped by customer session
- View customer name, table number, order details
- Filter by outlet, search by name or session
- Update order status (e.g., mark as completed)
- Play sound on new orders
- Fully responsive dashboard

### ✅ Super Admin
- Onboarding screen for setting up new outlets (in progress)

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev

run the backend server:

```bash
node server.js

```

Open [http://localhost:3001](http://localhost:3001) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

# 🍔 QR-Based Ordering App

A full-stack web application that lets restaurant customers scan a QR code, view a dynamic menu, and place orders — while allowing admins to manage and track those orders in real-time via a dashboard.

Built with **Next.js 15**, **PostgreSQL**, **Tailwind CSS**, **Socket.IO**, and **JWT authentication**.

---
## 🗂 Folder Structure Overview

