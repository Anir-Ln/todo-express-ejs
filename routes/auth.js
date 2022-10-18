const expres = require('express')
const passport = require('passport')
const LocalStrategy = require('passport-local')
const crypto = require('crypto')
const db = require('../db')


/* Configure password authentication strategy.
 *
 * The `LocalStrategy` authenticates users by verifying a username and password.
 * The strategy parses the username and password from the request and calls the
 * `verify` function.
 *
 * The `verify` function queries the database for the user record and verifies
 * the password by hashing the password supplied by the user and comparing it to
 * the hashed password stored in the database.  If the comparison succeeds, the
 * user is authenticated; otherwise, not.
 */
passport.use(new LocalStrategy((username, password, done) => {
  db.get("SELECT * FROM users WHERE username = ?", [username], (err, row) => {
    if (err) return done(err)
    if (!row) return done(null, false, {message: "Incorrect username or passowrd"})

    crypto.pbkdf2(password, row.salt, 310000, 32, 'sha256', (err, hashed_password) => {
      if (err) return done(err)
      if (!crypto.timingSafeEqual(hashed_password, row.hashed_password))
        return done(null, false, {message: "Incorrect username or password"})
      
      return done(null, row)
    })
  })
}))


/* Configure session management.
 *
 * When a login session is established, information about the user will be
 * stored in the session.  This information is supplied by the `serializeUser`
 * function, which is yielding the user ID and username.
 *
 * As the user interacts with the app, subsequent requests will be authenticated
 * by verifying the session.  The same user information that was serialized at
 * session establishment will be restored when the session is authenticated by
 * the `deserializeUser` function.
 *
 * Since every request to the app needs the user ID and username, in order to
 * fetch todo records and render the user element in the navigation bar, that
 * information is stored in the session.
 */

/* save the user in the session
*
* serializeUser determines which data of the user object should be stored in the session. 
* The result of the serializeUser method is attached to the session as 
* req.session.passport.user = {}. Here for instance, it would be (as we provide the user id as the key) 
* req.session.passport.user = {id: 'xyz'}*
*
*/
passport.serializeUser((user, done) => {
  process.nextTick(() => {
    return done(null, {id: user.id, username: user.username})
  })
})

/*
*
* We are calling passport.deserializeUser right after it where does it fit in the workflow?
* The first argument of deserializeUser corresponds to the key of the user object that was given
* to the done function (see 1.). So your whole object is retrieved with help of that key. 
* That key here is the user id (key can be any key of the user object i.e. name,email etc). 
* In deserializeUser that key is matched with the in memory array / database or any data resource.
* The fetched object is attached to the request object as req.user
*/
passport.deserializeUser((user, done) => {
  process.nextTick(() => {
    return done(null, user)
  })
})


const router = expres.Router()


// GET / login -> render an html form wich will send a post request to POST login/password
router.get('/login', (req, res) => {
  res.render('login')
})

/* POST /login/password
 *
 * This route authenticates the user by verifying a username and password.
 *
 * A username and password are submitted to this route via an HTML form, which
 * was rendered by the `GET /login` route.  The username and password is
 * authenticated using the `local` strategy.  The strategy will parse the
 * username and password from the request and call the `verify` function.
 *
 * Upon successful authentication, a login session will be established.  As the
 * user interacts with the app, by clicking links and submitting forms, the
 * subsequent requests will be authenticated by verifying the session.
 *
 * When authentication fails, the user will be re-prompted to login and shown
 * a message informing them of what went wrong.
 */

router.post('/login/password', passport.authenticate('local', {
  successReturnToOrRedirect: '/',
  failureRedirect: '/login',
  failureMessage: true
}))


// POST /logout
// https://www.passportjs.org/concepts/authentication/logout/
// logout exposed by passport
// it's better to use POST or DELETE requirest when terminating a session
router.post('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err)
    return res.redirect('/')
  })
})

/* GET /signup
 *
 * This route prompts the user to sign up.
 *
 * The 'signup' view renders an HTML form, into which the user enters their
 * desired username and password.  When the user submits the form, a request
 * will be sent to the `POST /signup` route.
 */
router.get('/signup', (req, res, next) => {
  return res.render('signup')
})


/* POST /signup
 *
 * This route creates a new user account.
 *
 * A desired username and password are submitted to this route via an HTML form,
 * which was rendered by the `GET /signup` route.  The password is hashed and
 * then a new user record is inserted into the database.  If the record is
 * successfully created, the user is logged in.
 */
router.post('/signup', (req, res, next) => {
  const salt = crypto.randomBytes(16)
  crypto.pbkdf2(req.body.password, salt, 310000, 32, 'sha256', (err, hashed_password) => {
    if (err) return next(err)
    db.run('INSERT INTO users (username, hashed_password, salt) VALUES (?, ?, ?)', [
      req.body.username,
      hashed_password,
      salt
    ], (err) => {
      if (err) return next(err)
      const user = {
        id: this.lastId,
        username: req.body.username
      }
      // login exposed by passport
      req.login(user, (err) => {
        if(err) return next(err)
        res.redirect('/')
      })
    })
  })
})


module.exports = router