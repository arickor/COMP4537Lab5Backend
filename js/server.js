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
    const query = `
            CREATE TABLE IF NOT EXISTS patient (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255),
                age INT,
                diagnosis TEXT
            ) ENGINE=InnoDB;
        `;
    this.connection.query(query, (err, result) => {
      if (err) throw err;
      console.log("Table created or exists already!");
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
  user: "your-username",
  password: "your-password",
  database: "patient_db",
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
    if (sqlQuery.startsWith("SELECT")) {
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
      res.writeHead(403, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Only SELECT queries allowed for GET" }));
    }
  }
});

server.listen(8080, () => {
  console.log("Server running on port 8080");
});
