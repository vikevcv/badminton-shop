import express from 'express';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { engine } from 'express-handlebars';
import cookieParser from 'cookie-parser';

import pool, { testConnection } from './config/database.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { notFoundHandler } from './middlewares/notFound.middleware.js';
import { setViewLocals } from './middlewares/auth.middleware.js';
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

app.use(cookieParser(process.env.REFRESH_COOKIE_SECRET));

// 3. Template Engine
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

// 4. Set res.locals.user cho Handlebars templates
app.use(setViewLocals);

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

// 8. Cleanup expired tokens every hour
const CLEANUP_INTERVAL = 60 * 60 * 1000;
setInterval(async () => {
  try {
    const { default: refreshTokenModel } = await import('./models/refresh-token.model.js');
    const cleaned = await refreshTokenModel.cleanExpired();
    if (cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} expired refresh tokens`);
    }
  } catch (_) {
    // Silently ignore cleanup errors
  }
}, CLEANUP_INTERVAL);