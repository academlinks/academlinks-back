import JWT from 'jsonwebtoken';
import { promisify } from 'util';

export const verifyToken = async (token) => {
  const SECRET = process.env.JWT_SECRET;
  const validator = promisify(JWT.verify);
  const user = await validator(token, SECRET);
  return user;
};
