require('dotenv').config();
const session = require('express-session');
const db = require('./data/db_model');
const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const KnexSessionStore = require('connect-session-knex')(session);

const server = express();
const sessionConfig = {
  name: 'monkey', 
  secret: "blah blah", 
  resave: true, 
  saveUninitialized: true,
  store: new KnexSessionStore({
    knex: require('./data/dbConfig'),
    createTable: true,
    clearInterval: 60000 * 15
  }),
  cookie: {
    maxAge: 1*24*60*60*1000, //days*hoursofaday*minsofanhour*secondsofamin*msofasecond
    secure: true,
    httpOnly: true, 
  },
};

server.use(helmet());
server.use(express.json());
server.use(cors());
server.use(session(sessionConfig));

// endpoints here
const port = process.env.PORT || 3000; 

server.listen(port, function() {
  console.log(`\n=== Web API Listening on http://localhost:${port} ===\n`);
});


server.get("/api/users/:id", protected,
  (req,res) => { db.find(req.headers.username, req.headers.token, req.params.id)
  .then(result => res.status(200).json(result))
  .catch(err => res.status(400).json({error: err, message: "could not gather from database"}))}
);

server.get("/api/users/",protected,
(req,res) => 
db.find(req.headers.username, req.headers.token)
.then(result => res.status(200).json(result))
.catch(err => res.status(400).json({error: err, message: "could not gather from database"}))
);

server.post("/api/register",
  (req,res,next) =>
  {
  db.userExists(req.body.username).then(() => 
  {
     if(!/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])[0-9a-zA-Z]{8,}$/.exec(req.body.password))
      return res.status(400).json({error: "badd password", message: "password must contain 8 characters and have one upper, one lower, and one number"}); 
    db.register(req.body.username, req.body.password)
        .then(result => res.status(201).json(result))
        .catch(err => res.status(500).json({error: err, message: "interal error"}))
  }
  ).catch(err => res.status(400).json({error: err, message: "username is already in use"}))
  }
);

server.post("/api/login",
  (req,res,next) => 
  db.login(req.body.username, req.body.password)
  .then(result => {
    req.session.token = result.token;
    res.status(200).json({...result, session: req.session})
  })
  .catch(err => res.status(400).json({error: err, message: "incorrect username or password"}))
);

server.get("/api/logout", (req,res) =>
{
  if (req.session) {
    req.session.destroy(err => {
      if (err) {
        res.send('error logging out');
      } else {
        res.send('good bye');
      }
    });
  }
});


function logger(req,res,next)
  {
    console.log(`${req.method} is being used at ${req.url} at ${Date.now()} ${res.body && (res.method === "post" || res.method === "put") `with ${res.body} data`}`);
    next();
  }

function protected(req, res, next) {
  if (req.session && req.session.token) {
    next();
  } else {
    res.status(401).json({ message: 'you shall not pass!!' });
  }
}