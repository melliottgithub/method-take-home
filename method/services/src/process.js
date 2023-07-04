const fs = require('fs');
const xml2js = require('xml2js');
const { Pool } = require('pg');

// Read XML data from file
const xmlFile = 'file.xml';
const xmlData = fs.readFileSync(xmlFile, 'utf8');

// Parse the XML data
const parser = new xml2js.Parser();
parser.parseString(xmlData, async (err, result) => {
  if (err) {
    console.error('Error parsing XML:', err);
    return;
  }

  // Extract information from XML and create an array of objects
  const data = result.root.row.map(row => {
    const employee = row.Employee[0];
    const payor = row.Payor[0];
    const payee = row.Payee[0];

    // Extract the numeric portion from the amount string
    const amountStr = row.Amount[0];
    const amountMatch = amountStr.match(/\d+(\.\d+)?/);
    const amount = amountMatch ? parseFloat(amountMatch[0]) : NaN;

    // Check if amount is a valid number
    if (Number.isNaN(amount)) {
      console.error('Invalid amount:', row.Amount[0]);
      return null; // Skip this entry
    }

    return {
      Employee: {
        DunkinId: employee.DunkinId[0],
        DunkinBranch: employee.DunkinBranch[0],
        FirstName: employee.FirstName[0],
        LastName: employee.LastName[0],
        DOB: employee.DOB[0],
        PhoneNumber: employee.PhoneNumber[0]
      },
      Payor: {
        DunkinId: payor.DunkinId[0],
        ABARouting: payor.ABARouting[0],
        AccountNumber: payor.AccountNumber[0],
        Name: payor.Name[0],
        DBA: payor.DBA[0],
        EIN: payor.EIN[0],
        Address: {
          Line1: payor.Address[0].Line1[0],
          City: payor.Address[0].City[0],
          State: payor.Address[0].State[0],
          Zip: payor.Address[0].Zip[0]
        }
      },
      Payee: {
        PlaidId: payee.PlaidId[0],
        LoanAccountNumber: payee.LoanAccountNumber[0]
      },
      Amount: amount
    };
  });

  // Remove null entries
  const validData = data.filter(entry => entry !== null);

  // Create a PostgreSQL connection pool
  const pool = new Pool({
    user: 'postgres',
    password: 'mellio',
    host: 'localhost',
    port: 5432,
    database: 'method'
  });

  let client;

  try {
    // Connect to the database
    client = await pool.connect();
    console.log('Connected to the database');

    // Insert data into the database
    await client.query('BEGIN');

    // Insert employee data
    for (const obj of validData) {
      const { Employee, Payor, Payee, Amount } = obj;

      // Insert employee data
      await client.query(
        'INSERT INTO employees (dunkin_id, branch, first_name, last_name, dob, phone_number) VALUES ($1, $2, $3, $4, $5, $6)',
        [Employee.DunkinId, Employee.DunkinBranch, Employee.FirstName, Employee.LastName, Employee.DOB, Employee.PhoneNumber]
      );

      // Insert payor data
      await client.query(
        'INSERT INTO payors (dunkin_id, routing_number, account_number, name, dba, ein, address_line1, city, state, zip) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
        [Payor.DunkinId, Payor.ABARouting, Payor.AccountNumber, Payor.Name, Payor.DBA, Payor.EIN, Payor.Address.Line1, Payor.Address.City, Payor.Address.State, Payor.Address.Zip]
      );

      // Insert payee data
      await client.query(
        'INSERT INTO payees (plaid_id, loan_account_number) VALUES ($1, $2)',
        [Payee.PlaidId, Payee.LoanAccountNumber]
      );

      // Insert payment data
      await client.query(
        'INSERT INTO payments (employee_id, payor_id, payee_id, amount) VALUES (currval(\'employees_id_seq\'), currval(\'payors_id_seq\'), currval(\'payees_id_seq\'), $1)',
        [Amount]
      );
    }

    await client.query('COMMIT');
    console.log('Data successfully inserted into the database');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error inserting data:', error);

  } finally {
    if (client) {
      client.release();
    }
    pool.end();
    console.log('Database connection closed');
  }
});
