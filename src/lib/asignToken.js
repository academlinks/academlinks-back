import JWT from "jsonwebtoken";
import { getOrigins } from "./getOrigins.js";

async function signToken(res, user) {
  const SECRET = process.env.JWT_SECRET;
  const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

  const payload = {
    id: user._id,
    role: user.role,
    userName: user.userName,
    email: user?.email,
  };

  const accessToken = JWT.sign(payload, SECRET, { expiresIn: "1h" });

  const cookieOptions = {
    httpOnly: true,
    origin: getOrigins(),
    secure: false,
  };

  if (process.env.NODE_MODE !== "DEV") cookieOptions.secure = true;

  const refreshToken = JWT.sign(payload, REFRESH_SECRET);
  res.cookie("authorization", `Bearer ${refreshToken}`, cookieOptions);

  return { accessToken };
}

export default signToken;
