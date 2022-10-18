const sqlite3 = require('sqlite3')
const mkdirp = require('mkdirp')
const crypto = require('crypto')

mkdirp.sync('./var/db')

const db = new sqlite3.Database('./var/db/todos.db')

// Each command inside the serialize() function is guaranteed to finish executing before the next one starts.
db.serialize(() => {
  // create the table
  db.run("CREATE TABLE IF NOT EXISTS users (\
    id INTEGER PRIMARY KEY,\
    username TEXT NOT NULL UNIQUE,\
    hashed_password BLOB,\
    salt BLOB \
  )")

  db.run("CREATE TABLE IF NOT EXISTS todos (\
    id INTEGER PRIMARY KEY,\
    owner_id INTEGER NOT NULL,\
    title TEXT NOT NULL, \
    completed INTEGER\
  )")

  // CREATE AN INITIAL USER (username: anir, password, anir)
  const salt = crypto.randomBytes(16)
  db.run("INSERT INTO users(username, hashed_password, salt) VALUES(?, ?, ?)", [
    'anir',
    crypto.pbkdf2Sync('anir', salt, 310000, 32, 'sha256'),  // iterations = 310000, key lenght = 32
    salt
  ], (err) => {
    console.log("error inserting anir")
  })
})


module.exports = db