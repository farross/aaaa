const express = require('express');
const pool = require('./db');

const app = express();

app.get("/", async (req, res) => {

  const result = await pool.query("SELECT * FROM orders ORDER BY date DESC");
  const total = await pool.query("SELECT COALESCE(SUM(price),0) as total FROM orders");

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
    <body style="background:#111;color:white;font-family:Arial;text-align:center;">
      <h1>BOOSTFIY Dashboard 👑</h1>
      <h2>Total Profit: $${total.rows[0].total}</h2>
      <table border="1" style="margin:auto;width:95%;">
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
});

const PORT = process.env.PORT || 3000;
app.listen(PORT);
