import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { S3 } from "aws-sdk";

// default values v2 - us-east-1
const s3 = new S3({ signatureVersion: "v4", region: "us-west-2"});

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const bucketName = process.env.BUCKET_NAME;

    if (!bucketName) {
      throw new Error("BUCKET_NAME environment variable is not set");
    }

    const currentDate = new Date();
    const dateString = currentDate.toISOString().split("T")[0];

    const fileName = `dunkin_${dateString}.xml`;

    const params = {
      Bucket: bucketName,
      Key: fileName,
      ContentType: "application/xml",
      Expires: 3600,
    };

    const uploadUrl = await s3.getSignedUrlPromise("putObject", params);

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "https://method.devmellio.com",
        "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: JSON.stringify({ uploadUrl }),
    };
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ message: "Internal Server Error", error }),
    };
  }
};
