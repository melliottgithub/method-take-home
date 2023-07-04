const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'method',
  password: 'mellio',
  port: 5432,
});

// const YOUR_METHOD_API_KEY = 'sk_VYt87UtLbaYDgXX3UfEcBi8C';

// const YOUR_METHOD_API_KEY = 'sk_fNVqdz7A9LzkRzkLrHHiMwrx';

const createIndividualEntity = async (data) => {
  try {
    const response = await fetch('https://dev.methodfi.com/entities', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${YOUR_METHOD_API_KEY}`,
      },
      body: JSON.stringify(data),
    });

    // console.log('Create Entity Response:', response);
    const responseData = await response.json();
    // console.log('Create Entity Response Data:', responseData);

    if (!response.ok) {
      console.error('Failed to create individual entity:', responseData);
      throw new Error('Failed to create individual entity');
    }

    return responseData;
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

    // console.log('Fetched Employees:', employees);

    // Split employees into batches
    const batches = chunkArray(employees, MAX_CONCURRENCY);

    for (const batch of batches) {
      // Create an array to store the promises for API calls
      const apiPromises = [];

      for (const employee of batch) {
        const dob = employee.dob instanceof Date ? employee.dob.toISOString().split('T')[0] : null;

        const data = {
          type: 'individual',
          individual: {
            first_name: employee.first_name,
            last_name: employee.last_name,
            phone: "15121231111",
            dob,
          },
        };

        // console.log('Creating Individual Entity:', data);

        const apiPromise = createIndividualEntity(data)
          .catch((error) => {
            console.error('Create Entity Error:', error);
            throw error;
          });
        apiPromises.push(apiPromise);
      }

      // Wait for all API calls in the batch to complete
      await Promise.all(apiPromises);

      // Wait for the interval before making the next batch of requests
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
    // Handle error
    console.error('Lambda Handler Error:', error);
    throw error;
  }
};

// Helper function to chunk an array into smaller arrays
function chunkArray(array, size) {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

// Helper function to introduce a delay
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// exports.handler = async (event, context) => {
//   try {
//     const startTime = new Date();
//     console.log('Processing started.');

//     const client = await pool.connect();
//     const result = await client.query('SELECT * FROM employees Limit 1000');
//     const employees = result.rows;

//     // console.log('Fetched Employees:', employees);

//     for (const employee of employees) {
//       const dob = employee.dob instanceof Date ? employee.dob.toISOString().split('T')[0] : null; 

//       const data = {
//         type: 'individual',
//         individual: {
//           first_name: employee.first_name,
//           last_name: employee.last_name,
//           phone: "15121231111",
//           dob,
//         },
//       };

//       // console.log('Creating Individual Entity:', data);

//       const createdEntity = await createIndividualEntity(data);
//       // console.log('Created Entity:', createdEntity);
//     }

//     client.release();

//     const endTime = new Date();
//     const processingTime = (endTime - startTime) / 1000; 
//     console.log(`Processing completed in ${processingTime} seconds.`);

//     return {
//       statusCode: 200,
//       body: `Individual entities created for ${employees.length} employees. Processing time: ${processingTime} seconds.`,
//     };
//   } catch (error) {
//     // Handle error
//     console.error('Lambda Handler Error:', error);
//     throw error;
//   }
// };

exports.handler();
