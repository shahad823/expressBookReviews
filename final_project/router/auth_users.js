const express = require('express');
const jwt = require('jsonwebtoken');
const {scryptSync, randomBytes, timingSafeEqual} = require('crypto');
const books = require('./booksdb');
const regd_users = express.Router();
const users = [];
const isValid = username => users.some(user => user.username === username);
const authenticatedUser = (username,password) => {
  const user = users.find(user => user.username === username);
  return !!user && typeof password === 'string' && timingSafeEqual(Buffer.from(user.hash,'hex'),scryptSync(password,user.salt,64));
};
regd_users.post('/login', (req,res) => {
  const {username,password} = req.body;
  if (!authenticatedUser(username,password)) return res.status(401).json({message:'Invalid username or password'});
  req.session.regenerate(err => {
    if (err) return res.status(500).json({message:'Login failed'});
    req.session.authorization = {accessToken:jwt.sign({username},req.app.locals.jwtSecret,{expiresIn:'1h'})};
    res.json({message:'Customer successfully logged in'});
  });
});
regd_users.put('/auth/review/:isbn', (req,res) => {
  const book = books[req.params.isbn];
  if (!Object.hasOwn(books,req.params.isbn)) return res.status(404).json({message:'Book not found'});
  const review = req.query.review ?? req.body.review;
  if (typeof review !== 'string' || !review.trim()) return res.status(400).json({message:'A review is required'});
  Object.defineProperty(book.reviews,req.user.username,{value:review,writable:true,enumerable:true,configurable:true});
  res.json({message:'Review successfully added or updated',reviews:book.reviews});
});
regd_users.delete('/auth/review/:isbn', (req,res) => {
  if (!Object.hasOwn(books,req.params.isbn)) return res.status(404).json({message:'Book not found'});
  const reviews = books[req.params.isbn].reviews;
  if (!Object.hasOwn(reviews,req.user.username)) return res.status(404).json({message:'No review found for this user'});
  delete reviews[req.user.username];
  res.json({message:'Review successfully deleted',reviews});
});
module.exports = {authenticated:regd_users,isValid,users,authenticatedUser};
