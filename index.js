// import
const httpErrors = require('http-errors');
const { socketServer } = require('./src/Socket/socker');
const { app } = require('./src/app');
const { Server } = require('socket.io');

// ----------------------------------------------------------
const PORT = process.env.PORT || 4000;
const server = app.listen(PORT, () => {
  console.log(`server is running in PORT: ${PORT}`);
});
// socket io
const io = new Server(server, {
  pingTimeout: 60000,
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'DELETE', 'PUT', 'PATCH'],
  },
});
io.on('connection', (socket) => {
  console.log('Socket connected: ', socket.id);
  socketServer(socket, io);
});
