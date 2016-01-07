import express from 'express';
import sqlite from 'sqlite3';
import data from './data.json';
import bodyParser from 'body-parser';

const sqlite3 = sqlite.verbose();
const db = new sqlite3.Database(':memory:');
const DEFAULT_PAGE_SIZE = 100;

db.serialize(() => {
  db.run(`
    CREATE TABLE items (
      id int primary key,
      brand text not null,
      title text not null,
      price numeric,
      gender text not null,
      type text not null,
      recentSold int,
      totalSold int
    );`);
  db.run(`CREATE INDEX brand_idx ON items (brand);`);
  db.run(`CREATE INDEX type_idx ON items (type);`);
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO items
    (id, type, brand, title, price, gender, recentSold, totalSold)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?);`);
  for (const item of data) {
    const {id, properties} = item;
    const {brand, type, title, price, gender, recentSold, totalSold} = properties;
    stmt.run(id, type, brand, title, price, gender, recentSold, totalSold);
  }
  stmt.finalize();
});

const app = express();
app.use(bodyParser.json());
app.set('json spaces', 2);

app.get('/', (req, res) => {
  res.send('你好世界');
});

const router = express.Router();

router
  .get('/items', (req, res, next) => {
    const limit = req.query.limit || DEFAULT_PAGE_SIZE;
    const after = req.query.after || -1;
    db.all('SELECT * FROM items WHERE id > ? ORDER BY id ASC LIMIT ?', after, limit, (err, rows) => {
      if (err) {
        next(err);
      } else {
        res.json(rows);
      }
    });
  })
  .get('/items/:item_id', (req, res, next) => {
    db.get('SELECT * FROM items WHERE id = ? ORDER BY id ASC', req.params.item_id, (err, row) => {
      if (err) {
        next(err);
      } else if (row) {
        res.json(row);
      } else {
        next('id not found');
      }
    })
  })
  .get('/item_types/', (req, res, next) => {
    db.all('SELECT DISTINCT type FROM items ORDER BY type', (err, rows) => {
      if (err) {
        next(err);
      } else {
        res.json(rows.map(r => r.type));
      }
    });
  })
  .get('/item_types/:item_type', (req, res, next) => {
    const limit = req.query.limit || DEFAULT_PAGE_SIZE;
    const after = req.query.after || -1;
    db.all('SELECT * FROM items WHERE type = ? AND id > ? LIMIT ?', req.params.item_type, after, limit, (err, rows) => {
      if (err) {
        next(err);
      } else {
        res.json(rows);
      }
    });
  })
  .get('/item_brands/', (req, res, next) => {
    db.all('SELECT DISTINCT brand FROM items ORDER BY brand', (err, rows) => {
      if (err) {
        next(err);
      } else {
        res.json(rows.map(r => r.brand));
      }
    });
  })
  .get('/item_brands/:item_brand', (req, res, next) => {
    const limit = req.query.limit || DEFAULT_PAGE_SIZE;
    const after = req.query.after || -1;
    db.all('SELECT * FROM items WHERE brand = ? AND id > ? LIMIT ?', req.params.item_brand, after, limit, (err, rows) => {
      if (err) {
        next(err);
      } else {
        res.json(rows);
      }
    });
  })
;

app.use('/api', router);

const server = app.listen(process.env.PORT || 3000, () => {
  const {address, port} = server.address();
  console.log('server listening on http://%s:%s', address, port);
});