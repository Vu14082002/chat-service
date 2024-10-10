let userOnline = [];
const calls = {};

const socketServer = (socket, io) => {
  socket.on('online', ({ userId }) => {
    console.log('userId', userId);
    if (!userId) return;
    // Cho user vào room có tên là chính userId của họ
    socket.join(userId);

    // Kiểm tra xem người dùng đã tồn tại trong danh sách hay chưa
    const existingUserIndex = userOnline.findIndex((u) => u.userId === userId);

    // Nếu người dùng chưa tồn tại, thêm vào danh sách
    if (existingUserIndex === -1) {
      userOnline.push({ userId, socketId: socket.id });
    } else {
      // Nếu người dùng đã tồn tại, cập nhật lại socketId
      userOnline[existingUserIndex].socketId = socket.id;
    }

    // Phát danh sách các user đang online cho tất cả mọi người
    const onlineIds = userOnline.map((u) => u.userId);
    io.emit('usersOnline', onlineIds);
  });

  // Xử lý sự kiện ngắt kết nối
  socket.on('disconnect', () => {
    let userId = -1;
    // Tìm userId của socket ngắt kết nối
    const user = userOnline.find((u) => u.socketId === socket.id);
    if (user) {
      userId = user.userId;
    }
    // Cập nhật lại danh sách userOnline, loại bỏ user đã ngắt kết nối
    userOnline = userOnline.filter((u) => u.socketId !== socket.id);
    // Phát lại danh sách user online mới cho mọi người
    const onlineIds = userOnline.map((u) => u.userId);
    io.emit('usersOnline', onlineIds);
  });
  // tạo room socket và join vào
  // conversation = response.data
  socket.on('openConversation', ({ conversation, userId }) => {
    socket.join(conversation.id);

    conversation.users.forEach((e) => {
      // ko gui lai tin nhan cho nguoi da gui
      if (e === userId) return;
      socket.in(e).emit('openConversation', conversation);
    });
  });
  // gui doi nguyen model Message  de tao lay id join vòa room
  // message = response.data
  socket.on('sendMessage', (message) => {
    const conversation = message.conversation_id;
    if (!conversation) {
      return;
    }
    message.users.forEach((userId) => {
      // ko gui lai tin nhan cho nguoi da gui
      if (userId === message.sender_id) {
        return;
      }
      //  gui thang den nguoi nhan luon, ko gui vao room ::)
      socket.in(userId).emit('receivedMessage', message);
    });
  });
  // typing
  // self la obj cua nguoi dung dang login, conversation = response.data cua api create conversaiton
  socket.on('typing', ({ conversation, self }) => {
    socket.in(conversation.id).emit('typing', self);
    conversation.users.forEach((userId) => {
      if (userId === self.id) {
        return;
      }
      socket.in(userId).emit('typing', { conversationId: conversation.id, self });
    });
  });
  // stop typing
  socket.on('stopTyping', ({ conversation, self }) => {
    socket.in(conversation.id).emit('stopTyping', self);

    conversation.users.forEach((userId) => {
      // ko gui lai tin nhan cho nguoi da gui
      if (userId === self.id) {
        return;
      }
      //  chi nhung nguoi co trong room moi dc nhan chat
      socket.in(userId).emit('stopTyping', { conversationId: conversation.id, self });
    });
  });

  // Call....
  socket.on('call', ({ sender, users, type, _id, conversationName, isGroup }) => {
    console.log('🚀 ~ socket.on ~ users:', users);
    if (!users?.length) return;

    users.forEach((user) =>
      socket.in(user._id).emit('call', { sender, users, type, _id, conversationName, isGroup })
    );

    const id = setTimeout(() => {
      const call = calls[_id];
      if (!call) return;

      const { users, acceptUserIds, rejectUserIds, endedUserIds, busyUserIds } = call;
      const missedUserIds = users.reduce((missedUserIds, user) => {
        if (
          !acceptUserIds.includes(user._id) &&
          !rejectUserIds.includes(user._id) &&
          !endedUserIds.includes(user._id) &&
          !busyUserIds.includes(user._id)
        )
          missedUserIds.push(user._id);
        return missedUserIds;
      }, []);

      call.missedUserIds = missedUserIds;

      missedUserIds.forEach((missedUserId) => {
        io.in(missedUserId).emit('missedCall', {
          _id,
          conversationName: isGroup ? conversationName : sender.name,
        });
      });

      users.forEach((user) =>
        io.in(user._id).emit('missedCallToAccepter', { missedUserIds, _id, conversationName })
      );
    }, 30000);

    calls[_id] = {
      sender,
      users,
      type,
      acceptUserIds: [sender._id],
      rejectUserIds: [],
      endedUserIds: [],
      busyUserIds: [],
      missedUserIds: [],
      timeoutId: id,
      conversationName,
      isGroup,
    };
  });

  socket.on('acceptCall', ({ receiver, _id }) => {
    if (!receiver || !calls[_id]) return;

    calls[_id].users.forEach((user) => socket.in(user._id).emit('acceptCall', { receiver, _id }));
    if (!calls[_id]) return;
    calls[_id].acceptUserIds.push(receiver._id);
  });

  socket.on('rejectCall', ({ sender, _id }) => {
    if (!calls[_id]) return;

    calls[_id].users.forEach((user, _index, users) =>
      socket.in(user._id).emit('rejectCall', { sender, _id, users })
    );
    calls[_id].rejectUserIds.push(sender._id);
  });

  socket.on('busyCall', ({ sender, _id }) => {
    const call = calls[_id];

    if (!call) return;

    call.users.forEach((user) => {
      if (user._id === sender._id) return;
      socket.in(user._id).emit('busyCall', { sender, _id });
    });
    call.busyUserIds.push(sender._id);
  });

  socket.on('endCall', ({ sender, _id }) => {
    const call = calls[_id];

    if (!call) return;

    call.users.forEach((user, _index, users) =>
      socket.in(user._id).emit('endCall', { sender, _id, users })
    );
    call.endedUserIds.push(sender._id);
    call.acceptUserIds = call.acceptUserIds.filter((id) => id !== sender._id);

    if (call.acceptUserIds.length === 0) {
      clearTimeout(call.timeoutId);

      delete call;
    }
  });
};

module.exports = { socketServer };
