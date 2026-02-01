// All the logic to validate an incoming request for its token.

const HttpError = require("../models/http-error");
const jwt = require("jsonwebtoken"); // for verifying the token.

module.exports = (req, res, next) => {
  if (req.method === "OPTIONS") {
    return next();
  }
  try {
    const token = req.headers.authorization.split(" ")[1]; //Authorization: "Bearer TOKEN"
    if (!token) {
      throw new Error("Authentication failed!");
    }
    const decodedToken = jwt.verify(token, "supersecret_donot_share"); // returns the payload that was encoded into the token. If this verification didn't fail, i.e., didn't throw an error, then the user is authenticated.
    req.userData = { userId: decodedToken.userId };
    next(); // allowing the request to continue its journey so that it is able to reach any other routes thereafter that require authentication.
  } catch (err) {
    const error = new HttpError("Authentication failed!", 403);
    return next(error);
  }
};
