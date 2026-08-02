# 🍔 Food Hub

A modern, full-stack food ordering and delivery management web application. The platform features user authentication, restaurant and menu browsing, real-time order tracking via WebSockets, coupon systems, and an administrative dashboard for restaurant and order management.

---

## 🚀 Key Features

*   **User Authentication**: Secure signup and login for users and administrators.
*   **Restaurant Directory**: Browse nearby restaurants, view detailed menus, and filter items.
*   **Excel Data Seeding**: Pre-loaded restaurant and menu data seeded directly from a structured Excel template (`DYPIU_Nearby_Restaurants_Menu.xlsx`).
*   **Shopping Cart & Checkout**: Add/remove items, apply promo coupons, and place orders.
*   **Real-time Order Tracking**: Dynamic updates on order status (e.g., Placed, Preparing, Out for Delivery, Delivered) powered by WebSockets (Socket.IO).
*   **Admin Dashboard**: Manage restaurants, update menus, create and review discount coupons, and update order statuses in real-time.
*   **Smart Database Fallback**: Built-in system that attempts connection to MongoDB Atlas and gracefully falls back to an in-memory database (`mongodb-memory-server`) if Atlas is unreachable.

---

## 🛠️ Technology Stack

### Frontend
*   **Framework**: [React](https://react.dev/) + [Vite](https://vite.dev/)
*   **Styling**: Custom CSS (responsive design)
*   **State & API**: Fetch API with clean asynchronous utilities, custom React Contexts

### Backend
*   **Runtime & Framework**: [Node.js](https://nodejs.org/) & [Express](https://expressjs.com/)
*   **Database**: [MongoDB](https://www.mongodb.com/) via [Mongoose](https://mongoosejs.com/) OR in-memory MongoDB fallback
*   **Real-Time Sync**: [Socket.IO](https://socket.io/)
*   **Excel Parser**: [xlsx (SheetJS)](https://sheetjs.com/)

---

## 📁 Project Structure

```
Food_hub_final/
├── backend/
│   ├── controllers/      # Route request handlers
│   ├── middleware/       # Authentication and authorization guards
│   ├── models/           # Mongoose schemas (User, Restaurant, Order, Coupon)
│   ├── routes/           # Express API endpoints
│   ├── server.js         # Entry point, Socket.IO & database connection setup
│   ├── seed.js           # Generic database seeding script
│   └── seedDYPIU.js      # Excel-based specific data seeder
├── frontend/
│   ├── src/
│   │   ├── pages/        # Page components (Home, Login, Register, Checkout, Track, Admin, etc.)
│   │   ├── components/   # Reusable UI elements
│   │   ├── context/      # Auth and Cart state contexts
│   │   ├── api.js        # Backend API service helper
│   │   └── main.jsx      # Vite application mount
│   ├── index.html        # App wrapper
│   └── vite.config.js    # Vite configuration
├── package.json          # Root build and deployment configurations
├── render.yaml           # Render deployment configuration
└── DYPIU_Nearby_Restaurants_Menu.xlsx # Seed data source
```

---

## 💻 Local Setup & Installation

### Prerequisites
*   Node.js (v18 or higher recommended)
*   npm

### Installation Steps

1.  **Clone the Repository**
    ```bash
    git clone <repository-url>
    cd Food_hub_final
    ```

2.  **Environment Variables Setup**
    *   Create a `.env` file inside the `backend/` directory:
        ```env
        PORT=5000
        MONGODB_URI=your_mongodb_atlas_connection_string
        JWT_SECRET=your_jwt_secret_key
        ```
    *   Create a `.env` file inside the `frontend/` directory (if needing custom api hosts, otherwise it defaults to backend origin):
        ```env
        VITE_API_URL=http://localhost:5000
        ```

3.  **Install Dependencies and Build**
    From the root directory, run the build command which will automatically install dependencies in both frontend and backend directories and compile the frontend assets:
    ```bash
    npm run build
    ```

4.  **Run the Application**
    Start the backend Express server (which also serves the static production build of the frontend):
    ```bash
    npm start
    ```
    The application will be accessible at `http://localhost:5000`.

---

## ☁️ Deployment

This project is pre-configured for deployment on [Render](https://render.com/) using the `render.yaml` specification.

*   **Build Command**: `npm run build`
*   **Start Command**: `npm start`
*   **Environment Variables**:
    *   `NODE_ENV`: `production`
    *   `PORT`: `5000`
    *   `MONGODB_URI`: *Your MongoDB connection string*
    *   `JWT_SECRET`: *Your JWT secret*
