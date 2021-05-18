'use strict';
const AWS = require('aws-sdk');
const db = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10' });
const { v4: uuid } = require('uuid');

const thankYouTable = process.env.THANK_YOU_NOTES_TABLE_HSBC;
// Create a response
function response(statusCode, message) {
  return {
    statusCode: statusCode,
    body: JSON.stringify(message)
  };
}
function sortByDate(a, b) {
  if (a.createdAt > b.createdAt) {
    return -1;
  } else return 1;
}
// Create a post
module.exports.createNote = (event, context, callback) => {
  const reqBody = JSON.parse(event.body);

  if (
    !reqBody.from ||
    reqBody.from.trim() === '' ||
    !reqBody.noteData ||
    reqBody.noteData.trim() === '' ||
    !reqBody.to ||
    reqBody.to.trim() === '' 
  ) {
    return callback(
      null,
      response(400, {
        error: 'Thank you notemust not be empty'
      })
    );
  }

  const note = {
    id: uuid(),
    createdAt: new Date().toISOString(),
    userId: 1,
    from: reqBody.from,
    noteData: reqBody.noteData,
    to: reqBody.to
  };

  return db
    .put({
      TableName: thankYouTable,
      Item: note
    })
    .promise()
    .then(() => {
      callback(null, response(201, note));
    })
    .catch((err) => response(null, response(err.statusCode, err)));
};
// Get all notes
module.exports.getAllNotes = (event, context, callback) => {
  return db
    .scan({
      TableName: thankYouTable
    })
    .promise()
    .then((res) => {
      callback(null, response(200, res.Items.sort(sortByDate)));
    })
    .catch((err) => callback(null, response(err.statusCode, err)));
};
// Get number of notes
module.exports.getNotes = (event, context, callback) => {
  const numberOfNotes = event.pathParameters.number;
  const params = {
    TableName: thankYouTable,
    Limit: numberOfNotes
  };
  return db
    .scan(params)
    .promise()
    .then((res) => {
      callback(null, response(200, res.Items.sort(sortByDate)));
    })
    .catch((err) => callback(null, response(err.statusCode, err)));
};
// Get a single note
module.exports.getPost = (event, context, callback) => {
  const id = event.pathParameters.id;

  const params = {
    Key: {
      id: id
    },
    TableName: thankYouTable
  };

  return db
    .get(params)
    .promise()
    .then((res) => {
      if (res.Item) callback(null, response(200, res.Item));
      else callback(null, response(404, { error: 'Note not found' }));
    })
    .catch((err) => callback(null, response(err.statusCode, err)));
};
// Update a post
module.exports.updateNote = (event, context, callback) => {
  const id = event.pathParameters.id;
  const reqBody = JSON.parse(event.body);
  const { noteData, from, to } = reqBody;

  const params = {
    Key: {
      id: id
    },
    TableName: thankYouTable,
    ConditionExpression: 'attribute_exists(id)',
    UpdateExpression: 'SET from = :from, noteData = :noteData, to = :to',
    ExpressionAttributeValues: {
      ':from': from,
      ':noteData': noteData,
      ':to': to
    },
    ReturnValues: 'ALL_NEW'
  };
  console.log('Updating');

  return db
    .update(params)
    .promise()
    .then((res) => {
      console.log(res);
      callback(null, response(200, res.Attributes));
    })
    .catch((err) => callback(null, response(err.statusCode, err)));
};
// Delete a post
module.exports.deleteNote = (event, context, callback) => {
  const id = event.pathParameters.id;
  const params = {
    Key: {
      id: id
    },
    TableName: thankYouTable
  };
  return db
    .delete(params)
    .promise()
    .then(() =>
      callback(null, response(200, { message: 'Note deleted successfully' }))
    )
    .catch((err) => callback(null, response(err.statusCode, err)));
};