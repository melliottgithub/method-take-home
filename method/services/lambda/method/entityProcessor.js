const { sleep, chunkArray } = require('./utils');

class EntityProcessor {
  constructor(pool, method) {
    this.pool = pool;
    this.method = method;
  }

  async getEmployees() {
    const client = await this.pool.connect();
    const result = await client.query('SELECT * FROM employees');
    const employees = result.rows;
    client.release();
    return employees;
  }

  async getPayors() {
    const client = await this.pool.connect();
    const result = await client.query('SELECT * FROM payors');
    const payors = result.rows;
    client.release();
    return payors;
  }

  async createEntity(data) {
    try {
      const entity = await this.method.entities.create(data);
      return entity;
    } catch (error) {
      console.error('Create Entity Error:', error);
      throw error;
    }
  }

  async createIndividualEntities(employees) {
    const MAX_CONCURRENCY = 200;
    const INTERVAL_MS = 10;
    const batches = chunkArray(employees, MAX_CONCURRENCY);

    for (const batch of batches) {
      const apiPromises = [];

      for (const employee of batch) {
        const dob = employee.dob instanceof Date ? employee.dob.toISOString().split('T')[0] : null;

        const data = {
          type: 'individual',
          individual: {
            first_name: employee.first_name,
            last_name: employee.last_name,
            phone: '15121231111',
            dob,
          },
        };

        const apiPromise = this.createEntity(data).catch((error) => {
          console.error('Create Individual Entity Error:', error);
          throw error;
        });

        apiPromises.push(apiPromise);
      }

      await Promise.all(apiPromises);
      await sleep(INTERVAL_MS);
    }
  }

  async createPayorEntities(payors) {
    const MAX_CONCURRENCY = 200;
    const INTERVAL_MS = 10;
    const batches = chunkArray(payors, MAX_CONCURRENCY);

    for (const batch of batches) {
      const apiPromises = [];

      for (const payor of batch) {
        const data = {
          type: 'c_corporation',
          corporation: {
            name: payor.name,
            dba: payor.dba,
            ein: payor.ein,
            owners: [],
          },
          address: {
            line1: payor.address_line1,
            city: payor.city,
            state: payor.state,
            zip: '50309',
          },
        };

        const apiPromise = this.createEntity(data).catch((error) => {
          console.error('Create Payor Entity Error:', error);
          throw error;
        });

        apiPromises.push(apiPromise);
      }

      await Promise.all(apiPromises);
      await sleep(INTERVAL_MS);
    }
  }
}

module.exports = EntityProcessor;
