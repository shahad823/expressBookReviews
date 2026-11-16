const express = require('express');
const axios = require('axios');
const {scryptSync,randomBytes} = require('crypto');
const books = require('./booksdb');
const {isValid,users} = require('./auth_users');
const public_users = express.Router();
public_users.post('/register', (req,res) => {
  const {username,password} = req.body;
  if (typeof username !== 'string' || !username.trim() || typeof password !== 'string' || !password.trim()) return res.status(400).json({message:'Username and password are required'});
  if (isValid(username)) return res.status(409).json({message:'Username already exists'});
  const salt = randomBytes(16).toString('hex');
  users.push({username,salt,hash:scryptSync(password,salt,64).toString('hex')});
  res.status(201).json({message:'Customer successfully registered. Now you can login'});
});
// Local data endpoint serves the supplied catalog without invoking Axios again.
public_users.get('/catalog', (req,res) => res.json(books));
const catalog = req => axios.get(req.app.locals.catalogURL,{timeout:5000,proxy:false});
// Retrieve all books using an Axios promise callback.
public_users.get('/', (req,res,next) => {
  catalog(req).then(response => res.json(response.data)).catch(next);
});
// Retrieve by ISBN using async/await with Axios.
public_users.get('/isbn/:isbn', async (req,res,next) => {
  try {
    const {data} = await catalog(req);
    if (!Object.hasOwn(data,req.params.isbn)) return res.status(404).json({message:'Book not found'});
    res.json(data[req.params.isbn]);
  } catch(err) {next(err);}
});
// Concurrent requests use asynchronous I/O; there is no synchronous HTTP call.
for (const field of ['author','title']) {
  public_users.get(`/${field}/:${field}`, async (req,res,next) => {
    try {
      const {data} = await catalog(req);
      const matches = Object.fromEntries(Object.entries(data).filter(([,book]) => book[field].toLowerCase() === req.params[field].toLowerCase()));
      res.json(matches);
    } catch(err) {next(err);}
  });
}
public_users.get('/review/:isbn', (req,res) => {
  if (!Object.hasOwn(books,req.params.isbn)) return res.status(404).json({message:'Book not found'});
  res.json(books[req.params.isbn].reviews);
});
module.exports.general = public_users;
