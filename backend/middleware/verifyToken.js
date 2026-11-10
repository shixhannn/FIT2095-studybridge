import jwt from "jsonwebtoken"; 
import User from "../models/user.js"; 

export async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization; 
  if (!authHeader ) {
    return res.status(401).json({ error: "Missing Authorization header "}); 
  } 
  if ( !authHeader.startsWith("Bearer ") ) {
    return res.status(401).json({ error: "Malformed Authorization header" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
    const user = await User.findById(decoded.userId); 
    if (!user) {
      return res.status(401).json({ error: "Invalid token"}); 
    }
    if ( user.tokenVersion !== decoded.tokenVersion) {
      return res.status(401).json({ error: "Token has been logged out"}); 
    }
    req.user = { userId: user._id, role: user.role, fullName: user.fullName }; 
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token has expired, please log in again" });
    }
    return res.status(401).json({ error: "Invalid token" });
  }
};