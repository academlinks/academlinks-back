const jsonwebtoken = require("jsonwebtoken");
const { promisify } = require("util");
const { APP_ORIGINS } = require("../config");

class JWT {
  constructor() {
    this.NODE_MODE = process.env.NODE_MODE;
    this.JWT_SECRET = process.env.JWT_SECRET;
    this.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
    this.JWT_EXPIRES = "1h";
  }

  async verifyToken({ token, refreshToken = false }) {
    const validator = promisify(jsonwebtoken.verify);
    return await validator(
      token,
      refreshToken ? this.JWT_REFRESH_SECRET : this.JWT_SECRET
    );
  }

  async asignToken({ user, res }) {
    const payload = {
      id: user._id,
      role: user.role,
      userName: user.userName,
      email: user?.email,
    };

    const accessToken = jsonwebtoken.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES,
    });

    const cookieOptions = {
      httpOnly: true,
      origin: APP_ORIGINS,
      secure: false,
    };

    if (this.NODE_MODE !== "DEV") {
      cookieOptions.secure = true;
      cookieOptions.sameSite = "none";
    }

    const refreshToken = jsonwebtoken.sign(payload, this.JWT_REFRESH_SECRET);
    res.cookie("authorization", `Bearer ${refreshToken}`, cookieOptions);

    return { accessToken };
  }
}

module.exports = new JWT();
