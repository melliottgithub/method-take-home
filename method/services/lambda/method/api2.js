const { Pool } = require('pg');
const method = require('method-node');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'method',
  password: 'mellio',
  port: 5432,
});

const YOUR_METHOD_API_KEY = 'sk_fNVqdz7A9LzkRzkLrHHiMwrx';

const createIndividualEntity = async (data) => {
  try {
    const entity = await method.entities.create(data, YOUR_METHOD_API_KEY);
    return entity;
  } catch (error) {
    console.error('Create Entity Error:', error);
    throw error;
  }
};

const MAX_CONCURRENCY = 200;
const INTERVAL_MS = 10;

exports.handler = async (event, context) => {
  try {
    const startTime = new Date();
    console.log('Processing started.');

    const client = await pool.connect();
    const result = await client.query('SELECT * FROM employees');
    const employees = result.rows;

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

        const apiPromise = createIndividualEntity(data)
          .catch((error) => {
            console.error('Create Entity Error:', error);
            throw error;
          });
        apiPromises.push(apiPromise);
      }

      await Promise.all(apiPromises);

      await sleep(INTERVAL_MS);
    }

    client.release();

    const endTime = new Date();
    const processingTime = (endTime - startTime) / 1000;
    console.log(`Processing completed in ${processingTime} seconds.`);

    return {
      statusCode: 200,
      body: `Individual entities created for ${employees.length} employees. Processing time: ${processingTime} seconds.`,
    };
  } catch (error) {
    console.error('Lambda Handler Error:', error);
    throw error;
  }
};

function chunkArray(array, size) {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
