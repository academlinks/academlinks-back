import { config } from 'dotenv';
import mongoose from 'mongoose';
import App from './app.js';

//prettier-ignore
const {parsed: { PORT, DB_APP_CONNECTION }} = config();

process.on('uncaughtException', (err) => {
  console.log('uncaughtException ! process is exited', err);
  process.exit(1);
});

mongoose
  .connect(DB_APP_CONNECTION)
  .then(() => {
    console.log(`DB Is Connected Successfully`);
    App.listen(PORT, () => console.log(`App Listens On Port ${PORT}`));
  })
  .catch((err) => {
    process.on('unhandledRejection', (err) => {
      console.log('Unhandled Rejection, server is closed >', err.message);
      SERVER.close(() => process.exit(1));
    });
  });
