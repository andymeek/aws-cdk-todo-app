import * as AWS from "aws-sdk";
import { create } from "domain";
import { v4 } from "uuid";

// the table name that we get from an env variable
const tableName = process.env.TABLE_NAME || "";
// for interacting with dynamoDB from JavaScript / nodeJS
const dynamo = new AWS.DynamoDB.DocumentClient();

const createResponse = (
  body: string | AWS.DynamoDB.DocumentClient.ItemList,
  statusCode = 200
) => {
  return {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "DELETE,GET,OPTIONS,POST",
    },
    statusCode,
    body: JSON.stringify(body, null, 2),
  };
};
// DynamoDB Scan operation scans and returns all of the items in the db
const getAllTodos = async () => {
  const scanResult = await dynamo
    .scan({
      TableName: tableName,
    })
    .promise();

  return scanResult;
};

const addTodoItem = async (data: { todo: string; id: string }) => {
  const { id, todo } = data;
  if (todo) {
    await dynamo
      .put({
        // params object with two properties (TableName is our env variable)
        TableName: tableName,
        Item: {
          id: id || v4(),
          todo,
        },
      })
      .promise();
  }
  return todo;
};

const deleteTodoItem = async (data: { id: string }) => {
  const { id } = data;

  if (id) {
    await dynamo
      .delete({
        TableName: tableName,
        Key: {
          id,
        },
      })
      .promise();
  }

  return id;
};

// async function that response to apiGateway events
exports.handler = async function (event: AWSLambda.APIGatewayEvent) {
  try {
    const { httpMethod, body: requestBody } = event;

    if (httpMethod === "PUT") {
      return createResponse("OK");
    }

    // if GET return todos
    if (httpMethod === "GET") {
      const response = await getAllTodos();

      return createResponse(response.Items || []);
    }
    if (!requestBody) {
      return createResponse("Missing request body", 500);
    }

    // parsing the data we sent to the server
    const data = JSON.parse(requestBody);
    // if POST add a todo
    if (httpMethod === "POST") {
      const todo = await addTodoItem(data);
      return todo
        ? createResponse(`${todo} added to the database`)
        : createResponse("Todo is missing", 500);
    }
    // if DELETE, delete todo (we'll imlement that in the next lesson)
    if (httpMethod === "DELETE") {
      const id = await deleteTodoItem(data);
      return id
        ? createResponse(
            `Todo item with an id of ${id} deleted from the database`
          )
        : createResponse("ID is missing", 500);
    }

    return createResponse(
      `We only accept GET, POST, OPTIONS and DELETE, not ${httpMethod}`,
      500
    );
  } catch (error) {
    console.log(error);
    return createResponse(error, 500);
  }
};
