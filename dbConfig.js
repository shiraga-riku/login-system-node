const Sequelize = require('sequelize');

const pool = new Sequelize('login_system', 'postgres', 'admin', {
  host: 'localhost',
  port: 5432,
  dialect: 'postgres',
});

module.exports = pool;