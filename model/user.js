const Sequelize = require('sequelize');
const dbConfig = require('../dbConfig');

/**
 * users テーブルの Entity モデル
 */
const user = dbConfig.define('users', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true 
  },
  name: {
    type: Sequelize.STRING
  },
  password: {
    type: Sequelize.STRING
  },
  email: {
    type: Sequelize.STRING
  },
}, {
  // タイムスタンプの属性 (updatedAt, createdAt) が不要ならば次のプロパティは false
  timestamps: false,
});

module.exports = user;