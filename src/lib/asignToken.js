import JWT from 'jsonwebtoken';
import Refresher from '../models/Refreshers.js';

async function signToken(res, user) {
  const SECRET = process.env.JWT_SECRET;
  const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

  const payload = {
    id: user._id,
    role: user.role,
    userName: user.userName,
    email: user.email,
  };

  const accessToken = JWT.sign(payload, SECRET, { expiresIn: '1h' });
  const cookieOptions = {
    httpOnly: true,
  };
  res.cookie('Authorization', `Bearer ${accessToken}`, cookieOptions);

  const refreshToken = JWT.sign(payload, REFRESH_SECRET);
  await Refresher.create({ refresher: refreshToken });

  return { refreshToken };
}

export default signToken;
