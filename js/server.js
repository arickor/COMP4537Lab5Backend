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
                    patientid INT(11) AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(100),
                    dateOfBirth DATETIME
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
  // Set CORS headers to allow cross-origin requests
  res.setHeader(
    "Access-Control-Allow-Origin",
    "https://nice-ground-06ffb4610.5.azurestaticapps.net"
  ); // Allows all origins (for more security, replace '*' with Server 1's origin)
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight requests (OPTIONS method)
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  let method = req.method;

  if (method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", () => {
      const requestData = JSON.parse(body);

      // Check if a custom query is provided (from textarea) or fallback to static data
      if (
        requestData.query &&
        requestData.query.trim().toUpperCase().startsWith("INSERT")
      ) {
        // Execute the custom INSERT query from the textarea
        const query = requestData.query;
        db.executeQuery(query, (err, result) => {
          if (err) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: err.message }));
          } else {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: result }));
          }
        });
      } else {
        // If no query is provided, fallback to inserting the static rows
        const patients = [
          { name: "Sara Brown", dateOfBirth: "1901-01-01" },
          { name: "John Smith", dateOfBirth: "1941-01-01" },
          { name: "Jack Ma", dateOfBirth: "1961-01-30" },
          { name: "Elon Musk", dateOfBirth: "1999-01-01" },
        ];

        let query = "INSERT INTO patient (name, dateOfBirth) VALUES ";
        const values = patients
          .map((p) => `('${p.name}', '${p.dateOfBirth}')`)
          .join(", ");
        query += values;

        db.executeQuery(query, (err, result) => {
          if (err) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: err.message }));
          } else {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: result }));
          }
        });
      }
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
