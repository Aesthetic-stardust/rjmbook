# RJMBook

**RJMBook** is a Machine Learning–powered resort booking and service platform for **Naruwan Resort**. It automates reservations, provides personalized recommendations, and applies predictive analytics for occupancy forecasting.

## Features

- **Smart booking** — Check availability and reserve rooms in real time
- **AI recommendations** — Personalized room types and services based on guest history and popularity
- **Occupancy forecasting** — Predictive analytics (linear regression on historical data) for the next 14 days
- **Guest & reservations management** — Guests, bookings, and resort services in one place
- **Data-driven dashboard** — KPIs, forecast table, and top recommendations

## Tech stack

- **Backend:** Node.js, Express, Sequelize (MySQL)
- **Views:** Handlebars (`.xian`), Tailwind CSS
- **ML:** `simple-statistics` (linear regression for forecasting); custom scoring for recommendations
- **Desktop:** Electron (optional)

## Setup

1. **Prerequisites:** Node.js 18+, MySQL.

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Database:** Create a MySQL database (or let migrate create it). Update `models/db.js` with your credentials:
   ```js
   export const sequelize = new Sequelize("RJMBook", "root", "YOUR_PASSWORD", {
     host: "localhost",
     dialect: "mysql"
   });
   ```

4. **Migrate and seed:**
   ```bash
   npm run migrate
   npm run seed
   ```

5. **Run the app:**
   ```bash
   npm run xian-start
   ```
   Open http://localhost:3000

## Scripts

| Script | Description |
|--------|-------------|
| `npm run xian-start` | Start Express server |
| `npm run xian` | Start with nodemon |
| `npm run migrate` | Create DB and sync all tables (force) |
| `npm run seed` | Seed room types, rooms, services |
| `npm run xianca` | Run Electron app (server must be running) |

## Routes

| Path | Description |
|------|-------------|
| `/` | Home / landing |
| `/rooms` | Room types (with AI recommendations) |
| `/bookings/book` | Booking form; check availability, then confirm |
| `/bookings` | List reservations |
| `/bookings/:id` | Booking details |
| `/guests` | Guest list |
| `/services` | Resort services (with recommendations) |
| `/dashboard` | Analytics: occupancy, forecast, recommendations |
| `/dashboard/api/forecast?days=14` | JSON occupancy forecast |
| `/dashboard/api/recommendations/rooms?guestId=` | JSON room recommendations |
| `/dashboard/api/recommendations/services?guestId=` | JSON service recommendations |
| `POST /dashboard/api/snapshot` | Record daily occupancy snapshot |

## ML components

- **Recommendations** (`services/ml/recommendationEngine.js`): Scores room types and services by past bookings and popularity; supports optional `guestId` for personalization.
- **Occupancy forecast** (`services/ml/occupancyForecast.js`): Uses historical occupancy (from `OccupancySnapshot` or derived from bookings) and simple-statistics linear regression to predict occupancy rate for the next N days. Call `recordOccupancySnapshot()` daily (e.g. via cron) to build history.

## License

MIT. Built with XianFire Framework — Mindoro State University.
