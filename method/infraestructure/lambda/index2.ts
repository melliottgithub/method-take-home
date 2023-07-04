import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { S3 } from "aws-sdk";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const bucketName = process.env.BUCKET_NAME;

  if (!bucketName) {
    console.error("Bucket name not provided in environment variables.");
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal Server Error" }),
    };
  }

  const s3 = new S3();

  try {
    if (!event.body) {
      console.error("No file content provided.");
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Bad Request: No file content provided." }),
      };
    }

    const fileContent = event.body;

    const currentDate = new Date();
    const dateString = currentDate.toISOString().split("T")[0];

    const fileName = `dunkin_${dateString}.xml`;

    await s3
      .upload({ Bucket: bucketName, Key: fileName, Body: fileContent })
      .promise();

    console.log(`File ${fileName} uploaded to bucket ${bucketName}`);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "File uploaded successfully" }),
    };
  } catch (error) {
    console.error(`Error uploading file to bucket ${bucketName}:`, error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal Server Error" }),
    };
  }
};
