const express = require('express');
const session = require('express-session');
const jwt = require('jsonwebtoken');
const { randomBytes } = require('crypto');
const app = express();
app.locals.jwtSecret = process.env.JWT_SECRET || randomBytes(32).toString('hex');
app.use(express.json());
app.use('/customer', session({secret: process.env.SESSION_SECRET || randomBytes(32).toString('hex'), resave:false, saveUninitialized:false, cookie:{httpOnly:true, sameSite:'lax'}}));
app.use('/customer/auth', (req,res,next) => {
  try {
    const token = req.session.authorization?.accessToken;
    if (!token) return res.status(401).json({message:'Please login first'});
    req.user = jwt.verify(token, app.locals.jwtSecret);
    next();
  } catch { return res.status(401).json({message:'Invalid or expired login'}); }
});
app.use('/customer', require('./router/auth_users').authenticated);
app.use('/', require('./router/general').general);
app.use((err,req,res,next) => res.status(500).json({message:'Unable to process request'}));
const server = app.listen(process.env.PORT || 5000, '127.0.0.1', () => {
  app.locals.catalogURL = `http://127.0.0.1:${server.address().port}/catalog`;
  console.log(`Server running on port ${server.address().port}`);
});
