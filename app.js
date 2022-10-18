const express = require('express')
const createError = require('http-errors') // Create HTTP errors for Express, Koa, Connect, etc. with ease.
const session = require('express-session') // this module takes care of the session
const cookieParser = require('cookie-parser')
const path = require('path')
const passport = require('passport') // authentication middleware
const logger = require('morgan') // HTTP request logger middleware for node.js
const csrf = require('csurf')


// create the sqliteSotre by passwing the session to the connect-sqlite3
const SQLiteStore = require('connect-sqlite3')(session)



const app = express()
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')

// set to dev envirenmenet
app.set('env', 'development')
// app.locals.pluralize = require('pluralize')

app.use(logger('dev'))
app.use(express.json())
app.use(express.urlencoded({extended: true}))
app.use(cookieParser())
app.use(express.static(path.join(__dirname, 'public')))

// session
// resave : false -> Forces the session to be saved back to the session store, even if the session was never modified during the request
// saveUnitialized: false -> // Forces a session that is “uninitialized” to be saved to the store. A session is uninitialized when it is new but not modified.
// secret : The use of environment variables to store the secret, ensuring the secret itself does not exist in your repository.
// Periodic updates of the secret, while ensuring the previous secret is in the array.
let sess = {
 secret: process.env.SESSION_SECRET,
 resave: false,  // don't save when unmodified
 saveUninitialized: false, // don't create session until something stored
 cookie: {},
 store: new SQLiteStore({db: 'session.db', dir: './var/db'})
}
// cookie.secure = true is recommended, however need https-enabled
// if we access the website over http, the cookies will not be set
// if we have the app behine a proxy and we are using secure : true, we need to set "trust proxy"

if (app.get('env') === 'production') {
  app.set("trust proxy", 1) // trust first proxy
  sess.cookie.secure = true // server secure cookies
}
// set session
app.use(session(sess))

// csrf
app.use(csrf())
// authentication using passport
//  the user navigates from page to page, the session itself can be authenticated using the built-in session strategy. Because an authenticated session is typically needed for the majority of routes in an application, it is common to use this as application-level middleware
// app.use(passport.authenticate('session'))
// or
app.use(passport.session())

// res.locals -> when using a view engine with Express, you can set intermediate data on res.locals in your middleware, and that data will be available in your view.
app.use((req, res, next) => {
  const msgs = req.session.messages || []
  res.locals.messages = msgs
  res.locals.hasMessages = !!msgs.length
  req.session.messages = []
  next()
})

app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken()
  next()
})

// routers
app.use(require('./routes/index'))
app.use(require('./routes/auth'))

// no routed was taken
// 404
app.use((req, res, next) => {
  next(createError(404))
})

app.use((err, req, res, next) => {
  // set locals, only providing errors in development
  res.locals.message = err.message
  res.locals.error = req.app.get('env') === 'development' ? err : {}

  res.status(err.status || 500)
  res.render('error')
})


module.exports = app