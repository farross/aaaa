const express = require('express');
const pool = require('./db');

const app = express();

app.get("/", async (req, res) => {

  try {

    const result = await pool.query(`
      SELECT order_number, user_id, seller_id, service, price, status, date 
      FROM orders 
      ORDER BY date DESC
    `);

    const total = await pool.query(`
      SELECT COALESCE(SUM(price),0) as total FROM orders
    `);

    let rows = result.rows.map(o => `
      <tr>
        <td>#${o.order_number}</td>
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
          body { background:#111; color:white; font-family:Arial; text-align:center; }
          table { width:95%; margin:auto; border-collapse:collapse; }
          th, td { padding:10px; border:1px solid #333; }
          th { background:#FFD700; color:black; }
          tr:nth-child(even){ background:#1c1c1c; }
        </style>
      </head>
      <body>
        <h1>BOOSTFIY Dashboard 👑</h1>
        <h2>Total Profit: $${total.rows[0].total}</h2>

        <table>
          <tr>
            <th>Order</th>
            <th>Client</th>
            <th>Seller</th>
            <th>Item</th>
            <th>Price</th>
            <th>Status</th>
            <th>Date</th>
          </tr>
          ${rows || "<tr><td colspan='7'>No Orders Yet</td></tr>"}
        </table>
      </body>
      </html>
    `);

  } catch (err) {
    res.send("Database Error");
  }

});

const PORT = process.env.PORT || 3000;
app.listen(PORT);
