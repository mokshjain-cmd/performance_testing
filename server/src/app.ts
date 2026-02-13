import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';

export const createApp = (): Express => {
  const app: Express = express();

  // Middleware
  app.use(helmet()); // Security headers
  app.use(cors()); // Enable CORS
  app.use(morgan('dev')); // Logging
  app.use(express.json()); // Parse JSON bodies
  app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

  // API Routes
  app.use('/api', routes);

  // Root route
  app.get('/', (req, res) => {
    res.json({
      success: true,
      message: 'Performance Testing Platform API',
      version: '1.0.0'
    });
  });

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
