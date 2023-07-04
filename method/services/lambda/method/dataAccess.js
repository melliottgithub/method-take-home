const pgp = require('pg-promise')();

class DataAccess {
  constructor(connectionOptions) {
    this.db = pgp(connectionOptions);
  }

  async fetchEmployees() {
    try {
      return await this.db.any('SELECT * FROM employees limit 5');
    } catch (error) {
      console.error('Fetch Employees Error:', error);
      throw error;
    }
  }

  async fetchPayors() {
    try {
      return await this.db.any('SELECT * FROM payors limit 5');
    } catch (error) {
      console.error('Fetch Payors Error:', error);
      throw error;
    }
  }
}

module.exports = DataAccess;
