const  jwt = require("jsonwebtoken");
const  dotenv= require("dotenv");
dotenv.config();
const jwtSecret="3##"
const generateJwt = (email) => {
  return jwt.sign(email,jwtSecret, { expiresIn: "1h" });
};

module.exports = { generateJwt };

