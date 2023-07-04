const XMLProcessor = require('./xmlProcessor');
const { DataInserter, EntityProcessor } = require('./dataInserter.js');
const { Method, Environments } = require('method-node');

const method = new Method({
    apiKey: process.env.METHOD_API_KEY,
    env: Environments.dev,
});

exports.handler = async function (event) {
    try {
        const bucketName = event.Records[0].s3.bucket.name;
        const fileName = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));

        const processor = new XMLProcessor(bucketName, fileName);
        const fileContent = await processor.downloadFile();

        const rows = await processor.parseXML(fileContent);

        const inserter = new DataInserter(rows);
        await inserter.insertData();

        const entityProcessor = new EntityProcessor(method);
        const employees = await entityProcessor.getEmployees();
        await entityProcessor.createIndividualEntities(employees);

        const payors = await entityProcessor.getPayors();
        await entityProcessor.createPayorEntities(payors);

        return {
            statusCode: 200,
            body: `Entities created.`,
        };
    } catch (error) {
        console.error(`An error occurred: ${error.message}`);
        return {
            statusCode: 500,
            body: `An error occurred: ${error.message}`,
        };
    }
};
