import './config/env';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import router from './routes';
import { errorHandler, notFound } from './middleware/errorHandler';

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

const limiter = rateLimit({
  windowMs: parseInt(env.RATE_LIMIT_WINDOW_MS),
  max: parseInt(env.RATE_LIMIT_MAX_REQUESTS),
  message: {
    error: 'Too Many Requests',
    message: 'The Grid cannot process your runes that fast. Slow down, Initiate.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

const submissionLimiter = rateLimit({
  windowMs: 60000,
  max: 10,
  message: {
    error: 'Submission Limit Reached',
    message: 'Too many submissions. The Oracle needs a moment to breathe.',
  },
});
app.use('/api/submissions', submissionLimiter);

app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/api', router);
app.use(notFound);
app.use(errorHandler);

const PORT = parseInt(env.PORT);
app.listen(PORT, async () => {
  console.log(`\n🐉 CodeNova Backend — Emberwood Grid Online`);
  console.log(`   Port: ${PORT}`);
  console.log(`   Environment: ${env.NODE_ENV}`);
  console.log(`   Frontend: ${env.FRONTEND_URL}\n`);

});

export default app;