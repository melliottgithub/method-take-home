const xml2js = require('xml2js');
const AWS = require('aws-sdk');
const s3 = new AWS.S3({region: 'us-west-2'});

class XMLProcessor {
    constructor(bucketName, fileName) {
        this.bucketName = bucketName;
        this.fileName = fileName;
    }

    async downloadFile() {
        const params = {
            Bucket: this.bucketName,
            Key: this.fileName
        };
        const data = await s3.getObject(params).promise();
        return data.Body;
    }

    async parseXML(fileContent) {
        const result = await xml2js.parseStringPromise(fileContent.toString());
        const rows = result.root.row;
        return rows;
    }
}

module.exports = XMLProcessor;
