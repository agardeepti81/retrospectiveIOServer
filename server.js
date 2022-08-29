const WebSocket = require("ws");
const wss = new WebSocket.Server({ port: 8080 });
var pdf = require("pdf-creator-node");
var fs = require("fs");

let members = [];
let notes = [];
let wsList = {};
let sessionInfo = {};

wss.getUniqueID = function () {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + "-" + s4();
};

getInstanceId = () => {
  return Math.floor((1 + Math.random()) * 0x10000)
    .toString(16)
    .substring(1);
};

wss.on("connection", (ws) => {
  let newUID = wss.getUniqueID();
  ws.id = newUID;
  console.log("Connection Established: ", ws.id);
  ws.on("message", async (data) => {
    let message = JSON.parse(data);
    console.log(message);
    switch (message?.action) {
      case "setNameAndSession":
        let sessionID;
        if (message.sessionID == "" || message.sessionID) {
          sessionID = message.sessionID;
        } else {
          sessionID = wss.getUniqueID();
          sessionInfo[sessionID] = {
            members: {},
            instances: {},
            wsList: {},
          };
        }
        console.log(
          Object.keys(sessionInfo),
          sessionID,
          Object.keys(sessionInfo).findIndex((sid) => sid == sessionID)
        );
        if (
          Object.keys(sessionInfo).findIndex((sid) => sid == sessionID) == -1
        ) {
          ws.send(
            JSON.stringify({
              type: "wrongSessionID",
            })
          );
          break;
        }
        let newMember = {};
        newMember[ws.id] = message.name;
        Object.values(sessionInfo[sessionID].wsList).forEach((wst) => {
          wst?.send(
            JSON.stringify({
              type: "newMember",
              memberInfo: newMember,
            })
          );
        });
        ws.send(
          JSON.stringify({
            type: "initialData",
            members: sessionInfo[sessionID].members,
            instances: sessionInfo[sessionID].instances,
            sessionID,
          })
        );
        sessionInfo[sessionID].members[ws.id] = message.name;
        sessionInfo[sessionID].wsList[ws.id] = ws;
        break;

      case "createNewInstance":
        let instanceID = getInstanceId();
        sessionInfo[message.sessionID].instances[instanceID] = {
          name: message.instanceName,
          notes: {},
        };
        Object.values(sessionInfo[message.sessionID].wsList).forEach((wst) => {
          wst?.send(
            JSON.stringify({
              type: "updatedInstancesData",
              instance: sessionInfo[message.sessionID].instances,
            })
          );
        });
        break;

      case "deleteInstance":
        let deleteInstanceID = message.instanceID;
        let deletedInstanceName =
          sessionInfo[message.sessionID].instances[deleteInstanceID].name;
        delete sessionInfo[message.sessionID].instances[deleteInstanceID];
        Object.values(sessionInfo[message.sessionID].wsList).forEach((wst) => {
          wst?.send(
            JSON.stringify({
              type: "updatedInstancesData",
              instance: sessionInfo[message.sessionID].instances,
              deletedInstanceName,
            })
          );
        });
        console.log(`${deletedInstanceName} instance is closed. `);
        break;

      case "onNewNote":
        let membername = sessionInfo[message.sessionID].members[ws.id];
        let newNote = message.note;
        let noteId =
          Object.keys(
            sessionInfo[message.sessionID].instances[message.instanceID].notes
          ).length + 1;
        console.log(noteId);
        sessionInfo[message.sessionID].instances[message.instanceID].notes[
          noteId
        ] = {
          userid: ws.id,
          name: membername,
          note: newNote,
        };
        Object.values(sessionInfo[message.sessionID].wsList).forEach((wst) => {
          wst?.send(
            JSON.stringify({
              type: "updatedInstancesData",
              instance: sessionInfo[message.sessionID].instances,
            })
          );
        });
        break;

      case "deleteNote":
        let deleteNoteId = message.noteId;
        delete sessionInfo[message.sessionID].instances[message.instanceID]
          .notes[deleteNoteId];
        Object.values(sessionInfo[message.sessionID].wsList).forEach((wst) => {
          wst?.send(
            JSON.stringify({
              type: "updatedInstancesData",
              instance: sessionInfo[message.sessionID].instances,
            })
          );
        });
        break;

      case "createPDF":
        var currentDate = new Date();
        currentDate = currentDate.toLocaleString();
        var html = fs.readFileSync("template.html", "utf8");
        let instances = Object.values(sessionInfo[message.sessionID].instances);
        let notes = [];
        let tempnotes = [];
        Object.keys(sessionInfo[message.sessionID].instances).forEach((id) => {
          notes[id] = Object.values(
            sessionInfo[message.sessionID].instances[id].notes
          );
          tempnotes = notes[id];
        });

        const document = {
          html: html,
          data: {
            Instances: instances,
            notes: tempnotes,
            date: currentDate
          },
          type: "buffer",
        };
        
        const pdfStream = await pdf.create(document, {
          format: "A4"
        })

        ws.send(pdfStream, {binary: true});
        break;
    }
  });
  ws.on("close", function () {
    let deleteMemberIndex = members.findIndex(
      (member) => member.uid == wsList[ws.id]
    );
    if (deleteMemberIndex !== -1) {
      members.splice(deleteMemberIndex, 1);
    }
    delete wsList[ws.id];
    members.forEach((member) => {
      wsList[member.uid]?.send(
        JSON.stringify({
          type: "memberLeft",
          uid: ws.id,
        })
      );
    });
    console.log("member left: ", ws.id);
  });
});

/*
{
  "action":"setName",
  "name": "User"
}
*/
// let sessionInfotest = {
//   sessionID_1: {
//     members: {
//       memberId1: "name",
//       memberId2: "name2",
//       memberId3: "name3",
//     },
//     instances: {
//       instanceId1: {
//         name: "instanceName1",
//         notes: {
//           noteId1: {
//             userid: "memberID1",
//             note: "note",
//           },
//           noteId2: {
//             userid: "user1",
//             note: "note",
//           },
//         },
//       },
//       instanceId2: {
//         name: "instanceName1",
//         notes: {
//           noteId1: {
//             userid: "user1",
//             note: "note",
//           },
//         },
//       },
//     },
//     wsList: {
//       member1: "ws",
//       member2: "ws",
//       member3: "ws",
//     },
//   },
//   sessionID_2: {
//     members: {
//       memberId1: "name",
//       memberId2: "name2",
//       memberId3: "name3",
//     },
//     instances: {
//       instanceId1: {
//         name: "instanceName1",
//         notes: {
//           noteId1: {
//             userid: "user1",
//             note: "note",
//           },
//         },
//       },
//     },
//     wsList: {
//       member1: "ws",
//       member2: "ws",
//       member3: "ws",
//     },
//   },
// };
