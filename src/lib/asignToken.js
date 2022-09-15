import JWT from 'jsonwebtoken';

function signToken(user) {
  const SECRET = process.env.JWT_SECRET;

  const payload = {
    id: user._id,
    userName: user.userName,
    email: user.email,
  };

  const token = JWT.sign(payload, SECRET);

  return { token };
}

export default signToken;
