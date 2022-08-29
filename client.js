// client.js
const readline = require("readline").createInterface({
  input: process.stdin,
  output: process.stdout,
});

const { Console } = require("console");
const WebSocket = require("ws");
const url = "ws://localhost:8080";
const connection = new WebSocket(url);
let name, sessionID, members, instances;

function getUniqueID() {
  return Math.floor((1 + Math.random()) * 0x10000)
    .toString(16)
    .substring(1);
}
name = getUniqueID();
// name = "startInstance";
// let sessionID = getUniqueID();

connection.onopen = () => {
  // connection.send("Message From Client");
  readline.question("Enter session Id :", (sid) => {
    if (sid != "null") {
      connection.send(
        JSON.stringify({
          action: "setNameAndSession",
          name,
          sessionID: sid,
        })
      );
    } else {
      connection.send(
        JSON.stringify({
          action: "setNameAndSession",
          name,
        })
      );
    }
    readline.close();
  });
};
connection.onerror = (error) => {
  console.log(`WebSocket error: ${JSON.stringify(error)}`);
};
connection.onmessage = (e) => {
  let data = JSON.parse(e.data);
  switch (data?.type) {
    case "initialData":
      members = data.members;
      instances = data.instances;
      sessionID = data.sessionID
      console.log("members", members);
      console.log("instances",instances);
      console.log("sessionID", sessionID);
      connection.send(
        JSON.stringify({
          action: "createNewInstance",
          instanceName: getUniqueID(),
          sessionID,
        })
      );
      break;

    // case "onNewNote":
    // let note = "this is a test note";
    // connection.send(JSON.stringify({
    //   action: "onNewNote",
    //   note: note
    // }))
    // case "newInstanceData":
    //   console.log(data);
    //   break;

    default:
      console.log(data);
  }
};
