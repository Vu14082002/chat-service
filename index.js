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

app.post('/api/payment', (req, res) => {
  const { userId, isSuccess } = req.body;
  if (!userId || !isSuccess) {
    return res.status(400).json({ error: 'missing userId or status or status ' });
  }
  let messageText =
    isSuccess === true ? 'Thanh toán thành công' : 'Thanh toán thất bại, vui lòng thử lại';
  let message = {
    status: isSuccess,
    message: messageText,
  };
  io.to(userId).emit('payment', message);
  return res.status(200).json({ success: true, message: 'Thông báo đã được gửi qua Socket' });
});
