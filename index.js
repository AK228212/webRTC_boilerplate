"use strict";

var os = require("os");

var express = require("express");

var app = express();

var http = require("http");

// For signalling in webRTC we're using Socket.io
var socketIO = require("socket.io");

// Defining folder which containing CSS and JS for frontend
app.use(express.static("public"));

// Defining routes
app.get("/", function (req, res) {
  //Render a view (located in the directory views/) on this route
  res.render("index.ejs");
});

var server = http.createServer(app);

const port = process.env.PORT || 8888;

server.listen(port);

var io = socketIO(server);

//Implementing Socket.io
//connection is a synonym of reserved event connect
//connection event is fired as soon as a client connects to this socket.
io.sockets.on("connection", function (socket) {
  // Convenience function to log server messages on the client.
  // Arguments is an array like object which contains all the arguments of log().
  // To push all the arguments of log() in array, we have to use apply().

  function log() {
    var array = ["Message from server:"];
    array.push.apply(array, arguments);
    socket.emit("log", array);
  }

  //Defining Server behaviours on different Socket Events
  socket.on("message", function (message, room) {
    log("Client said: ", message);
    //server should send the receive only in room
    socket.in(room).emit("message", message, room);
  });

  socket.on("create or join", function (room) {
    log("Received request to create or join room " + room);

    var clientsInRoom = io.sockets.adapter.rooms[room];
    var numClients = clientsInRoom
      ? Object.keys(clientsInRoom.sockets).length
      : 0;
    log("Room " + room + " now has " + numClients + " client(s)");

    if (numClients === 0) {
      socket.join(room);
      log("Client ID " + socket.id + " created room " + room);
      socket.emit("created", room, socket.id);
    } else if (numClients === 1) {
      log("Client ID " + socket.id + " joined room " + room);
      io.sockets.in(room).emit("join", room);
      socket.join(room);
      socket.emit("joined", room, socket.id);
      io.sockets.in(room).emit("ready");
    } else {
      // max two clients
      socket.emit("full", room);
    }
  });

  //Utility event
  socket.on("ipaddr", function () {
    var ifaces = os.networkInterfaces();
    for (var dev in ifaces) {
      ifaces[dev].forEach(function (details) {
        if (details.family === "IPv4" && details.address !== "127.0.0.1") {
          socket.emit("ipaddr", details.address);
        }
      });
    }
  });

  //Event for notifying other clients when a client leaves the room
  socket.on("bye", function () {
    console.log("received bye");
  });
});
