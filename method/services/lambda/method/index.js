const { Pool } = require('pg');
const EntityProcessor = require('../process/entityProcessor');
const { Method, Environments } = require('method-node');


const method = new Method({
  apiKey: 'sk_fNVqdz7A9LzkRzkLrHHiMwrx',
  env: Environments.dev,
});

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'method',
  password: 'mellio',
  port: 5432,
});

const entityProcessor = new EntityProcessor(pool, method);

exports.handler = async () => {
  try {
    const startTime = new Date();

    const employees = await entityProcessor.getEmployees();

    await entityProcessor.createIndividualEntities(employees);
  
    const payors = await entityProcessor.getPayors();

    await entityProcessor.createPayorEntities(payors);

    const endTime = new Date();
    const processingTime = (endTime - startTime) / 1000;

    return {
      statusCode: 200,
      body: `Entities created for ${employees.length} employees. Processing time: ${processingTime} seconds.`,
    };
  } catch (error) {
    console.error('Lambda Handler Error:', error);
    throw error;
  }
};
