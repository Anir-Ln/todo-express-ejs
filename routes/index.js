const express = require('express')
const ensureLogIn = require('connect-ensure-login').ensureLoggedIn
const db = require('../db')


const fetchTodos = (req, res, next) => {
  db.all("SELECT * FROM todos WHERE owner_id = ? ", [
    req.user.id
  ], (err, rows) => {
    if (err) return next(err)
    
    const todos = rows.map(row => {
      return {
        id: row.id,
        title: row.title,
        completed: row.completed === 1 ? true: false,
        url: `/${row.id}`
      }
    })

    res.locals.todos = todos
    res.locals.completedCount = todos.filter(todo => todo.completed).length
    res.locals.activeCount = todos.length - res.locals.completedCount
    next()
  })  
}


const router = express.Router()


// GET home page.
// req.user exposed by passport
router.get('/', (req, res, next) => {
  console.log("first")
  if (!req.user) return res.render('home')
  next()
}, fetchTodos, (req, res, next) => {
  res.locals.filter = null
  res.render('index', {user: req.user})
})

router.get('/active', ensureLogIn, fetchTodos, (req, res, next) => {
  res.locals.todos = res.locals.todos.filter(todo => !todo.completed)
  res.locals.filter = 'active'
  res.render('index', {user: req.user})
})

router.get('/completed', ensureLogIn, fetchTodos, (req, res, next) => {
  res.locals.todos = res.locals.todos.filter(todo => todo.completed)
  res.locals.filter = 'completed'
  res.render('index', {user: req.user})
})


// create new todo
router.post('/', ensureLogIn, (req, res, next) => {
  req.body.title = req.body.title.trim()
  if (req.body.title !== '') return next()
  return res.redirect('/' + (req.body.filter || ''))
}, (req, res, next) => {
  db.run('INSERT INTO todos (owner_id, titile, completed) VALUES (?, ?, ?)', [
    req.user.id,
    req.body.title,
    req.body.completed !== undefined ? 1 : null
  ], (err) => {
    if (err) return next(err)
    return res.redirect('/' + req.body.filter || '')
  })
})


// update a todo
// if the title is empyt means that the user wants to delete it 
router.post('/:id(\\d+)', ensureLogIn, (req, res, next) => {
  req.body.title = req.body.title.trim()
  if (req.body.title !== '') return next()
  // delete the todo from the db
  db.run("DELETE FROM todos WHERE id = ? and owner_id = ?", [
    req.params.id,
    req.user.id
  ], (err) => {
    if (err) return next(err)
    return res.redirect('/' + req.body.filter || '')
  })
}, (req, res, next) => {
  // in this case the title is provided -> update
  db.run("UPDATE todos SET title = ?, completed = ? WHERE id = ? AND owner_id = ?", [
    req.body.title,
    req.body.completed !== undefined ? 1 : null,
    req.params.id,
    req.user.id
  ], (err) => {
    if (err) return next(err)
    return redirect('/', req.body.filter || '')
  })
})

// delete a todo
router.post('/:id(\\d+)/delete', ensureLogIn, (req, res, next) => {
  db.run("DELETE FROM todos WHERE id = ? and owner_id = ?", [
    req.params.id,
    req.user.id
  ], (err) => {
    if (err) return next(err)
    return res.redirect('/' + req.body.filter || '')
  }) 
})

// make all completed or uncompleted
router.post('/toggle-all', ensureLogIn, (req, res, next) =>{
  db.run("UPDATE todos SET completed = ? WHERE owner_id = ?", [
    req.body.completed !== undefined ? 1 : null,
    req.user.id
  ], (err) => {
    if(err) return next(err)
    return redirect('/' + (req.body.filter || ''))
  })
})

// delete all
router.post('/clear-all', ensureLogIn, (req, res, next) => {
  db.run("DELETE FROM todos WHERE id_owner = ?", [
    req.user.id
  ], (err) => {
    if (err) return next(err)
    return res.redirect('/' + (req.body.filter || ''))
  })
})

// delete completed
router.post('/clear-completed', ensureLogIn, (req, res, next) => {
  db.run("DELETE FROM todos WHERE completed = 1 AND owner_id = ?", [req.user.id], (err) => {
    if (err) return next(err)
    return res.redirect('/' + (req.body.completed || ''))
  })
})


module.exports = router