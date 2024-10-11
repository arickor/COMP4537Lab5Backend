const http = require("http");
const url = require("url");
const mysql = require("mysql");

class Database {
  constructor(config) {
    this.connection = mysql.createConnection(config);
  }

  connect() {
    this.connection.connect((err) => {
      if (err) throw err;
      console.log("Connected to database!");
    });
  }

  createTable() {
    const checkTableQuery = `
        SELECT COUNT(*) AS count 
        FROM information_schema.tables 
        WHERE table_schema = 'arickorc_comp4537lab5' AND table_name = 'patient';
    `;

    this.connection.query(checkTableQuery, (err, result) => {
      if (err) throw err;

      // Check if table exists
      const tableExists = result[0].count > 0;

      if (!tableExists) {
        const createQuery = `
                CREATE TABLE patient (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(255),
                    age INT,
                    diagnosis TEXT
                ) ENGINE=InnoDB;
            `;
        this.connection.query(createQuery, (err, result) => {
          if (err) throw err;
          console.log("Table created successfully!");
        });
      } else {
        console.log("Table already exists, skipping creation.");
      }
    });
  }

  executeQuery(query, callback) {
    this.connection.query(query, (err, result) => {
      if (err) callback(err, null);
      else callback(null, result);
    });
  }
}

const dbConfig = {
  host: "localhost",
  user: "arickorc_aric",
  password: "P@$$w0rd12345",
  database: "arickorc_comp4537lab5",
};

const db = new Database(dbConfig);
db.connect();
db.createTable();

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  let method = req.method;

  if (method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      const query = JSON.parse(body).query;
      db.executeQuery(query, (err, result) => {
        if (err) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: err.message }));
        } else {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: result }));
        }
      });
    });
  } else if (method === "GET") {
    const sqlQuery = parsedUrl.query.q;

    // Check if sqlQuery is undefined or empty
    if (sqlQuery && sqlQuery.startsWith("SELECT")) {
      db.executeQuery(sqlQuery, (err, result) => {
        if (err) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: err.message }));
        } else {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(result));
        }
      });
    } else {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error: "Invalid query or missing query parameter 'q'.",
        })
      );
    }
  }
});

server.listen(8080, () => {
  console.log("Server running on port 8080");
});
