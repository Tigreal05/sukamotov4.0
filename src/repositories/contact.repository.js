const { getPool } = require("../config/database");

async function insertMessage({ name, phone, email, message }, exec = getPool()) {
  const [res] = await exec.execute(
    "INSERT INTO contact_messages (name, phone, email, message) VALUES (?, ?, ?, ?)",
    [name, phone, email, message]);
  return Number(res.insertId);
}
module.exports = { insertMessage };
