const express = require('express');
const pool = require('./db');

const app = express();

app.get("/", async (req, res) => {

  try {

    const result = await pool.query(`
      SELECT * FROM orders ORDER BY date DESC
    `);

    const total = await pool.query(`
      SELECT SUM(price) as total_profit FROM orders
    `);

    let rows = result.rows.map(o => `
      <tr>
        <td>${o.id}</td>
        <td>${o.user_id}</td>
        <td>${o.seller_id}</td>
        <td>${o.service}</td>
        <td>$${o.price}</td>
        <td>${o.status}</td>
        <td>${new Date(o.date).toLocaleString()}</td>
      </tr>
    `).join("");

    res.send(`
      <html>
      <head>
        <title>BOOSTFIY Dashboard</title>
        <style>
          body { font-family: Arial; background:#111; color:#fff; text-align:center; }
          table { width:90%; margin:auto; border-collapse:collapse; }
          th, td { padding:10px; border:1px solid #444; }
          th { background:#FFD700; color:#000; }
          tr:nth-child(even) { background:#222; }
          h1 { color:#FFD700; }
        </style>
      </head>
      <body>
        <h1>BOOSTFIY Dashboard 👑</h1>
        <h2>Total Profit: $${total.rows[0].total_profit || 0}</h2>

        <table>
          <tr>
            <th>ID</th>
            <th>Client</th>
            <th>Seller</th>
            <th>Product</th>
            <th>Price</th>
            <th>Status</th>
            <th>Date</th>
          </tr>
          ${rows}
        </table>
      </body>
      </html>
    `);

  } catch (err) {
    res.send("Database Error");
  }

});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Dashboard running..."));