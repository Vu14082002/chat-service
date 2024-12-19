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

// send to doctor
app.post('/api/notify/appointment/new', (req, res) => {
  const { userId, fromTime, toTime } = req.body; // Ensure isSuccess is part of the request body
  if (!userId) {
    return res.status(400).json({ error: 'Missing userId or isSuccess in request body' });
  }
  const message = {
    message: `Bạn vừa có một cuộc hẹn mới vào lúc ${fromTime} đến ${toTime}, vui lòng kiểm tra lịch hẹn của bạn để xem thêm thông tin.`,
  };
  try {
    io.to(userId).emit('notifyNewAppointment', message);
    return res.status(200).json({ success: true, message: 'Thông báo đã được gửi qua Socket' });
  } catch (error) {
    console.error('Error sending notification:', error);
    return res.status(500).json({ error: 'Failed to send notification' });
  }
});

app.post('/api/notify', (req, res) => {
  console.log('call socket with data', req.body);
  const { userId, id, title, message, createdAt, totalUnread } = req.body; // Ensure isSuccess is part of the request body
  if (!userId) {
    return res.status(400).json({ error: 'Missing userId or isSuccess in request body' });
  }
  try {
    _dataSend = {
      id,
      title,
      message,
      createdAt,
      totalUnread,
    };
    io.to(userId).emit('notify', _dataSend);
    return res.status(200).json({ success: true, message: 'Thông báo đã được gửi qua Socket' });
  } catch (error) {
    console.error('Error sending notification:', error);
    return res.status(500).json({ error: 'Failed to send notification' });
  }
});
