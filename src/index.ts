// src/index.ts
import express, { Express, Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import apiRoutes from "./routes/routes";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";

// Initialize dotenv to read and parse `.env` file contents into `process.env`.
dotenv.config();

// Instantiate an Express application and store it in the variable 'app'.
const app: Express = express();
const port = process.env.PORT || 3000;

const db = new DynamoDBClient({ region: process.env.REGION });
const dynamoDb = DynamoDBDocumentClient.from(db);

// Apply CORS middleware to the Express app to allow cross-origin requests.
app.use(cors());
app.use(express.json()); // REQUIRED TO PARSE JSON BODY

app.use("/api", apiRoutes);

app.get("/", (_req: Request, res: Response) => {
  res.send("Express + TypeScript Server");
});

// use client table to store ids
let client: Response;

app.get("/sse", (_req: Request, res: Response) => {
  console.log("sse visited");
  client = res;
  client.writeHead(200, {
    Connection: "keep-alive",
    "Cache-Control": "no-cache",
    "Content-Type": "text/event-stream",
  });

  client.on("close", () => {
    client.end();
  });
});

interface NotificationRequestBody {
  id: string;
  message: string;
}

app.post(
  "/notifications",
  (req: Request<{}, {}, NotificationRequestBody>, res: Response) => {
    let { id, message } = req.body;
    const chunk = JSON.stringify({ id, message });
    client.write(`data: ${chunk}\n\n`);
    res.status(200).send("success");
  }
);

app.post("/adduser", async (req, res) => {
  const { id, name, email } = req.body;

  const putParams = {
    TableName: "notification-users",
    // all properties are required
    Item: {
      id,
      name,
      email,
    },
  };

  const getParams = {
    TableName: "notification-users",
    Key: {
      id: +id,
    },
  };

  try {
    // don't add user if id already exists in db
    const data = await dynamoDb.send(new GetCommand(getParams));
    if (data.Item) {
      res.status(500).send("Could not add user: id already exists");
    } else {
      await dynamoDb.send(new PutCommand(putParams));
      res.status(200).json({ message: "User added" });
    }
  } catch (error) {
    res.status(500).json({ error: "Could not create user", details: error });
  }
});

app.delete("/deleteuser/:id", async (req, res) => {
  // todo: should not send 200 "User deleted" if user did not exists
  const params = {
    TableName: "notification-users",
    Key: {
      id: +req.params.id,
    },
  };

  try {
    await dynamoDb.send(new DeleteCommand(params));
    res.status(200).json({ message: "User deleted" });
  } catch (error) {
    res.status(500).json({ error: "Could not delete user", details: error });
  }
});

// Start the Express app and listen for incoming requests on the specified port
app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
