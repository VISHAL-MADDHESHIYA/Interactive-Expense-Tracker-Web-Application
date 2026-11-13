# 💰 Interactive Expense Tracker Web Application

A modern, responsive, and feature-rich expense tracker built from scratch using **Vanilla HTML5, CSS3, and JavaScript (ES6+)**. This application allows users to seamlessly manage their daily expenses, providing real-time totals, robust filtering, and persistent data storage without the need for any external frameworks or libraries.

## 🚀 Live Demo
*You can view the live application here: [Insert your GitHub Pages link here once deployed]*

## ✨ Features

- **Full CRUD Functionality**: Add, view, edit, and delete expense records effortlessly.
- **Advanced Filtering**: Dynamically filter expenses by Category or a specific Date Range (Start Date to End Date).
- **Dynamic Sorting**: Sort your expenses by Date (Newest/Oldest) or Amount (Highest/Lowest).
- **Real-Time Calculations**: The total spending summary automatically recalculates and updates based on the active filtered and sorted list.
- **Data Persistence**: All state changes (add, edit, delete) are automatically synced to `localStorage`. Refreshing the page will not lose your data.
- **Responsive UI/UX**: Designed with a modern dark theme, utilizing CSS Grid and Flexbox to ensure it looks great on mobile, tablet, and desktop screens.
- **Smooth Animations**: Includes subtle CSS transitions for adding, editing, deleting, and displaying empty states.
- **Accessibility**: Built with semantic HTML5 and ARIA labels for screen readers.

## 🛠️ Tech Stack

- **HTML5**: Semantic structure.
- **CSS3**: Custom properties (variables), Flexbox, CSS Grid, animations, and responsive media queries.
- **JavaScript (ES6+)**: Array methods (`.map()`, `.filter()`, `.reduce()`, `.sort()`), Event Delegation, DOM Manipulation, and State Management.
- **Web Storage API**: `localStorage` for client-side data persistence.

## 📂 Project Structure

The project follows a clean, modular structure:
```text
├── index.html      # Semantic HTML structure and UI layout
├── style.css       # Modern dark theme, responsive design, animations
├── app.js          # Application state, logic, event handlers, and rendering
└── README.md       # Project documentation