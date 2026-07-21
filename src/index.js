import express from 'express';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { engine } from 'express-handlebars';
import session from 'express-session';
import connectMySQLStore from 'express-mysql-session';

import pool, { testConnection } from './config/database.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { notFoundHandler } from './middlewares/notFound.middleware.js';
import webRoutes from './routes/web.routes.js';
import apiRoutes from './routes/api/index.js';

dotenv.config();

// ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Database
testConnection();

// 2. Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

app.use(morgan('dev'));

// 3. Session (MySQL)
const MySQLStore = connectMySQLStore(session);
const sessionStore = new MySQLStore({
  clearExpired: true,
  checkExpirationInterval: 900000,
  expiration: 86400000
}, pool);

app.use(
  session({
    key: 'badminton_shop_session',
    secret: process.env.SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 24
    }
  })
);

// 4. Template Engine
app.engine(
  '.hbs',
  engine({
    extname: '.hbs',
    helpers: {
      eq: (a, b) => a === b,
    },
    defaultLayout: 'main',
    layoutsDir: path.join(__dirname, 'views', 'layouts'),
    partialsDir: path.join(__dirname, 'views', 'partials'),
  })
);
app.set('view engine', '.hbs');
app.set('views', path.join(__dirname, 'views'));

// Locals
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// 5. Routes
app.use('/api', apiRoutes);
app.use('/', webRoutes);

// 6. Error handlers (đặt cuối cùng)
app.use(notFoundHandler);

app.use(errorHandler);

// 7. Start
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`🚀 Server is running in ${process.env.NODE_ENV} mode on http://localhost:${PORT}`);
});