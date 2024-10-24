import crypto from "node:crypto";

import {
  S3Client,
  PutObjectCommand,
  ListObjectsCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";

const s3 = new S3Client();
const BUCKET_NAME = "notification-logs-test";

export const uploadLogToBucket = async (logData: string) => {
  const putNotificationLog = {
    Body: JSON.stringify({ msg: logData }),
    Bucket: BUCKET_NAME,
    Key: crypto.randomUUID(),
  };

  try {
    await s3.send(new PutObjectCommand(putNotificationLog));
  } catch (error) {
    console.log(error);
  }
};

export const retrieveLogsFromBucket = async () => {
  const { Contents } = await s3.send(
    new ListObjectsCommand({ Bucket: BUCKET_NAME })
  );

  if (Contents) {
    for (const content of Contents) {
      const obj = await s3.send(
        new GetObjectCommand({ Bucket: BUCKET_NAME, Key: content.Key })
      );

      if (obj.Body) {
        const logString = await obj.Body.transformToString();
        console.log(logString);
      }
    }
  }
};
