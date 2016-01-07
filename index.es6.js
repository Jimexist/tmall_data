import express from 'express';
import sqlite from 'sqlite3';
import data from './data.json';

const sqlite3 = sqlite.verbose();
const db = new sqlite3.Database(':memory:');

db.serialize(() => {
  db.run(`
    CREATE TABLE items (
      id int primary key,
      brand text not null,
      title text not null,
      price float,
      gender text,
      type text,
      recentSold int,
      totalSold int
    );
`);
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO items (id, type, brand, title, price, gender, recentSold, totalSold) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
`);
  for (const item of data) {
    const {id, properties, type} = item;
    const {brand, title, price, gender, recentSold, totalSold} = properties;
    stmt.run(id, type, brand, title, price, gender, recentSold, totalSold);
  }
  stmt.finalize();
});

const app = express();

app.get('/', (req, res) => {
  res.send('你好世界');
});

const router = express.Router();

router
.get('/items', (req, res, next) => {
  db.all('SELECT id FROM items', (err, rows) => {
    if (err) {
      next(err);
    } else {
      res.json(rows);
    }
  });
})
.get('/items/:item_id', (req, res, next) => {
  db.get('SELECT * FROM items WHERE id = ?', req.params.item_id, (err, row) => {
    if (err) {
      next(err);
    } else if (row) {
      res.json(row);
    } else {
      next('id not found');
    }
  })
})
.get('/items/')
;

app.use('/api', router);

const server = app.listen(process.env.PORT || 3000, () => {
  const {address, port} = server.address();
  console.log('server listening on http://%s:%s', address, port);
});