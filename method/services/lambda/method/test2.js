const fs = require('fs');
const xml2js = require('xml2js');
const pgp = require('pg-promise')();

const db = pgp({
    host: 'localhost',
    port: 5432,
    database: 'method',
    user: 'postgres',
    password: 'mellio'
});

async function parseXMLAndInsertToDB() {
    const fileContent = fs.readFileSync('../../files/file.xml');

    console.time("parseXML");
    const result = await xml2js.parseStringPromise(fileContent);
    console.timeEnd("parseXML");

    const rows = result.root.row;
    console.log('Number of items after parsing:', rows.length);

    console.time("insertToDB");
    for (let row of rows) {
        const employee = row.Employee[0];
        const payor = row.Payor[0];
        const payee = row.Payee[0];
        const amountString = row.Amount[0];
        const amount = parseFloat(amountString.replace(/[^0-9.-]+/g, ''));

        // Insert into Employees table
        await db.none('INSERT INTO Employees (employee_id, branch_id, first_name, last_name, dob, phone_number) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING',
            [employee.DunkinId[0], employee.DunkinBranch[0], employee.FirstName[0], employee.LastName[0], new Date(employee.DOB[0]), employee.PhoneNumber[0]]);

        // Insert into Payors table
        await db.none('INSERT INTO Payors (payor_id, aba_routing, account_number, name, dba, ein, address_line1, city, state, zip) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT DO NOTHING',
            [payor.DunkinId[0], payor.ABARouting[0], payor.AccountNumber[0], payor.Name[0], payor.DBA[0], payor.EIN[0], payor.Address[0].Line1[0], payor.Address[0].City[0], payor.Address[0].State[0], payor.Address[0].Zip[0]]);

        // Insert into Payments table
        await db.none('INSERT INTO Payments (employee_id, payor_id, plaid_id, loan_account_number, amount) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING',
            [employee.DunkinId[0], payor.DunkinId[0], payee.PlaidId[0], payee.LoanAccountNumber[0], amount]);
    }
    console.timeEnd("insertToDB");
}

parseXMLAndInsertToDB();

