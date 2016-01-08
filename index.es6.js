import express from 'express';
import sqlite from 'sqlite3';
import data from './data.json';
import brands from './brand.json';
import companies from './company.json';
import bodyParser from 'body-parser';
import morgan from 'morgan';

function initData(db) {
  db.run(`
    CREATE TABLE items (
      id int PRIMARY KEY,
      brand text NOT NULL,
      title text NOT NULL,
      price numeric,
      gender text NOT NULL,
      type text NOT NULL,
      recentSold int,
      totalSold int,
      FOREIGN KEY(brand) REFERENCES brands(name) ON UPDATE CASCADE
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
}

function initCompany(db) {
  db.run(`
    CREATE TABLE companies (
      name text PRIMARY KEY,
      foundingYear int,
      revenue numeric,
      country text
    );`);
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO companies
    (name, foundingYear, revenue, country)
    VALUES (?, ?, ?, ?);`);
  for (const c of companies) {
    const {properties} = c;
    const {name, foundingYear, revenue, country} = properties;
    stmt.run(name, foundingYear, revenue, country);
  }
  stmt.finalize();
}

function initBrand(db) {
  db.run(`
    CREATE TABLE brands (
      name PRIMARY KEY,
      foundingYear int,
      revenue numeric,
      holdingCompany text,
      numEmployees int,
      country text,
      FOREIGN KEY(holdingCompany) REFERENCES companies(name) ON UPDATE CASCADE
    );`);
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO brands
    (name, foundingYear, revenue, holdingCompany, numEmployees, country)
    VALUES (?, ?, ?, ?, ?, ?);`);
  for (const b of brands) {
    const {properties} = b;
    const {name, foundingYear, revenue, holdingCompany, numEmployees, country} = properties;
    stmt.run(name, foundingYear, revenue, holdingCompany, numEmployees, country);
  }
  stmt.finalize();
}

const sqlite3 = sqlite.verbose();
const db = new sqlite3.Database(':memory:');
const DEFAULT_PAGE_SIZE = 100;

db.serialize(() => {
  initCompany(db);
  initBrand(db);
  initData(db);
});

const app = express();
app.use(bodyParser.json());
app.use(morgan('common'));
app.set('json spaces', 2);

app.get('/', (req, res) => {
  res.send('你好世界');
});

const router = express.Router();

router
  .get('/items', (req, res, next) => {
    const limit = req.query.limit || DEFAULT_PAGE_SIZE;
    const after = req.query.after || -1;
    db.all(`SELECT *
      FROM items
      WHERE id > ?
      ORDER BY id ASC
      LIMIT ?`, after, limit, (err, rows) => {
      if (err) {
        next(err);
      } else {
        res.json(rows);
      }
    });
  })
  .get('/item_types', (req, res, next) => {
    db.all('SELECT DISTINCT type FROM items ORDER BY type', (err, rows) => {
      if (err) {
        next(err);
      } else {
        res.json(rows.map(r => r.type));
      }
    });
  })
  .get('/brands', (req, res, next) => {
    db.all(`SELECT *
      FROM brands
      ORDER BY name`, (err, rows) => {
      if (err) {
        next(err);
      } else {
        res.json(rows);
      }
    });
  })
  .get('/brands/:brand_name/items', (req, res, next) => {
    const limit = req.query.limit || DEFAULT_PAGE_SIZE;
    const after = req.query.after || -1;
    db.all(`SELECT *
      FROM items
      WHERE items.brand == ?
      AND id > ?
      ORDER BY id ASC
      LIMIT ?`, req.params.brand_name, after, limit, (err, rows) => {
      if (err) {
        next(err);
      } else {
        res.json(rows);
      }
    });
  })
  .get('/companies', (req, res, next) => {
    db.all(`SELECT *
      FROM companies
      ORDER BY name`, (err, rows) => {
      if (err) {
        next(err);
      } else {
        res.json(rows);
      }
    });
  })
  .get('/companies/:company_name/brands', (req, res, next) => {
    db.all(`SELECT *
      FROM brands
      WHERE holdingCompany == ?
      ORDER BY name`, req.params.company_name, (err, rows) => {
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
