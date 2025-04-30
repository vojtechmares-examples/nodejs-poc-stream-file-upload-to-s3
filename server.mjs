import express from "express";
import formidable from "formidable";
import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { PassThrough } from "stream";
import dotenv from "dotenv";

const validateConfig = (config) => {
  if (!config.s3.endpoint) {
    throw new Error("S3_ENDPOINT_URL is required");
  }
  if (!config.s3.region) {
    throw new Error("AWS_REGION is required");
  }
  if (!config.s3.credentials.accessKeyId) {
    throw new Error("AWS_ACCESS_KEY_ID is required");
  }
  if (!config.s3.credentials.secretAccessKey) {
    throw new Error("AWS_SECRET_ACCESS_KEY is required");
  }
  if (!config.bucket) {
    throw new Error("BUCKET_NAME is required");
  }
};

const main = async () => {
  dotenv.config();

  const app = express();
  const port = process.env.PORT || 3000;

  // Use the AWS SDK credential/provider chain,
  // or set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION in env.

  const config = {
    s3: {
      endpoint: process.env.S3_ENDPOINT_URL,
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    },
    bucket: process.env.BUCKET_NAME,
  };

  validateConfig(config);

  const s3 = new S3Client({
    ...config.s3,
    requestChecksumCalculation: "WHEN_REQUIRED",
  });

  app.post("/upload", (req, res) => {
    const uploads = [];

    // Create a Formidable form parser.
    const form = formidable({
      // Override how files are “written”:
      // instead of writing to disk, return a PassThrough
      // which we’ll pipe into S3.
      fileWriteStreamHandler: (file) => {
        const pass = new PassThrough();
        const key = `${Date.now()}-${file.originalFilename}`;

        const upload = new Upload({
          client: s3,
          params: {
            Bucket: config.bucket,
            Key: key,
            Body: pass,
            ContentType: file.mimetype,
          },
          // optional tuning:
          // queueSize: 4,       // concurrency of parts
          // partSize: 5 * 1024 * 1024,  // 5MB per part
        });

        uploads.push(upload.done()); // returns a Promise

        return pass;
      },
    });

    // Start parsing. Formidable will call fileWriteStreamHandler
    // for each file chunk under the hood.
    form.parse(req);

    form
      .on("error", (err) => {
        console.error("Formidable error:", err);
        res.status(500).send("Upload failed");
      })
      .on("end", async () => {
        try {
          await Promise.all(uploads);
          res.status(200).send("Upload complete");
        } catch (err) {
          console.error("S3 multipart upload error:", err);
          res.status(500).send("Upload failed");
        }
      });
  });

  app.listen(port, () => {
    console.log(`Listening on http://localhost:${port}`);
  });
};

await main();
