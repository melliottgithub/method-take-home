const db = require('./db');
const { sleep, chunkArray } = require('./utils');

class DataInserter {
  constructor(rows) {
    this.rows = rows;
  }

  async insertData() {
    await Promise.all(this.rows.map(async (row) => {
      const employee = row.Employee[0];
      const payor = row.Payor[0];
      const payee = row.Payee[0];
      const amountString = row.Amount[0];
      const amount = parseFloat(amountString.replace(/[^0-9.-]+/g, ''));

      await db.none('INSERT INTO Employees (employee_id, branch_id, first_name, last_name, dob, phone_number) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING',
        [employee.DunkinId[0], employee.DunkinBranch[0], employee.FirstName[0], employee.LastName[0], new Date(employee.DOB[0]), employee.PhoneNumber[0]]);

      await db.none('INSERT INTO Payors (payor_id, aba_routing, account_number, name, dba, ein, address_line1, city, state, zip) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT DO NOTHING',
        [payor.DunkinId[0], payor.ABARouting[0], payor.AccountNumber[0], payor.Name[0], payor.DBA[0], payor.EIN[0], payor.Address[0].Line1[0], payor.Address[0].City[0], payor.Address[0].State[0], payor.Address[0].Zip[0]]);

      await db.none('INSERT INTO Payments (employee_id, payor_id, plaid_id, loan_account_number, amount) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING',
        [employee.DunkinId[0], payor.DunkinId[0], payee.PlaidId[0], payee.LoanAccountNumber[0], amount]);
    }));
  }
}

class EntityProcessor {
  constructor(method) {
    this.method = method;
  }

  async getEmployees() {
    const client = await db.connect();
    const employees = await client.query('SELECT * FROM employees');
    return employees;
  }

  async getPayors() {
    const client = await db.connect();
    const payors = await client.query('SELECT * FROM payors');
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
    const MAX_CONCURRENCY = 100;
    const INTERVAL_MS = 1000;
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
    const MAX_CONCURRENCY = 100;
    const INTERVAL_MS = 1;
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

module.exports = { DataInserter, EntityProcessor };
