import express from 'express';

import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';

import path from 'path';
import { fileURLToPath } from 'url';

import { errorController } from './src/lib/errorController.js';
import AppError from './src/lib/AppError.js';

import authenticationRoutes from './src/routes/authenticationRoutes.js';
import postRoutes from './src/routes/postRoutes.js';
import commentRoutes from './src/routes/commentRoutes.js';
import userRoutes from './src/routes/userRoutes.js';
import friendsRoutes from './src/routes/friendsRoutes.js';
import userInfoRoutes from './src/routes/userInfoRoutes.js';
import notificationRoutes from './src/routes/notificationRoutes.js';
import conversationRoutes from './src/routes/conversationRoutes.js';

const App = express();

App.use(express.json());
App.use(express.urlencoded({ extended: false }));
App.use(cookieParser());
App.use(cors({ credentials: true, origin: 'http://localhost:3000' }));
App.use(morgan('dev'));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
App.use(express.static(path.join(__dirname, 'public/images')));

App.use('/api/v1/authentication', authenticationRoutes);
App.use('/api/v1/posts', postRoutes);
App.use('/api/v1/comments', commentRoutes);
App.use('/api/v1/user', userRoutes, friendsRoutes);
App.use('/api/v1/about', userInfoRoutes);
App.use('/api/v1/notifications', notificationRoutes);
App.use('/api/v1/conversation', conversationRoutes);

App.all('*', (req, res, next) => {
  next(new AppError(404, `can't find ${req.originalUrl} on this server`));
});

App.use(errorController);

export default App;
