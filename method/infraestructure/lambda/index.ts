import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { S3 } from 'aws-sdk';

const s3 = new S3({signatureVersion: 'v4'});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const bucketName = process.env.BUCKET_NAME;

    const currentDate = new Date();
    const dateString = currentDate.toISOString().split("T")[0];

    const fileName = `dunkin_${dateString}.xml`;

    const params = {
      Bucket: bucketName,
      Key: fileName,
      ContentType: event.headers['Content-Type'],
      Expires: 3600, // Presigned URL expiration time in seconds
    };

    const uploadUrl = await s3.getSignedUrlPromise('putObject', params);

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*', // Replace * with the allowed origin(s) of your API Gateway
        'Access-Control-Allow-Methods': 'GET, POST, PUT', // Specify the allowed HTTP methods
        'Access-Control-Allow-Headers': 'Content-Type', // Specify the allowed request headers
      },
      body: JSON.stringify({ uploadUrl }),
    };
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*', // Replace * with the allowed origin(s) of your API Gateway
      },
      body: JSON.stringify({ message: 'Internal Server Error' }),
    };
  }
};
