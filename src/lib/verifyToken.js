import JWT from 'jsonwebtoken';
import { promisify } from 'util';

export const verifyToken = async (token, refresher = false) => {
  const SECRET = process.env.JWT_SECRET;
  const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

  const validator = promisify(JWT.verify);

  const user = await validator(token, refresher ? REFRESH_SECRET : SECRET);

  return user;
};
