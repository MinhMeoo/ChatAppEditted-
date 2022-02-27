const express = require("express");
const http = require("http");
const socketio = require("socket.io");
const db = require("./database/db");
const bodyParser = require('body-parser');
const fs = require("fs");
const multer  = require('multer')
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const path = '../client/uploads/';
    fs.mkdirSync(path, { recursive: true });
    cb(null, path);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
})
const upload = multer({ storage: storage })
const app = express();
const server = http.createServer(app); // Tạo một http server với listener là express
const io = socketio(server, { // Khởi tạo socket io với http server ở trên
  cors: {
    origin: "*", // Disable CORS để mọi origin đều connect được, môi trường production thì nên setup chuẩn
  },
});

let onlineUsers = []; // Array này mình dùng để lưu các user đang online

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("../client")); // Dùng express để phục vụ các file ở folder client(frontend)
server.listen(3000).on("listening", () => { // Khởi tạo http server ở port 3000
  console.info("Chatbox server is listening on port 3000");
});

io.on("connection", (socket) => { // Handle event connection khi một user connect vào chatbox
  socket.on("online", (user) => { // Handle event online được gửi từ frontend
    onlineUsers = [...onlineUsers, user]; // Thêm user mới online vào danh sách
    io.emit("user-online-changed", onlineUsers); // Gửi danh sách user online mới nhất tới toàn bộ client đang connect
  });

  io.to(socket.id).emit("message", db.get("messages").takeRight(50)); // Gửi danh sách message trong chatbox trước đó(lấy tối đa 50 message), frontend khi scroll sẽ load thêm(infinity scroll)

  socket.on("update-profile", (user) => { // Đoạn này chỉ để handle event và update thông tin user
    const index = onlineUsers.findIndex((ol) => ol.socketId === user.socketId);
    if (!user.avatar) {
      user.avatar = "./image/guest.png";
    }
    onlineUsers[index] = user;

    db.get("users").find({id: user.id}).assign({displayName: user.displayName, avatar: user.avatar}).write();
    const messages = db.get('messages').filter(mess => mess.senderId === user.id).value();
    messages.forEach(mess => {
      db.get("messages").find({id: mess.id}).assign({displayName: user.displayName, avatar: user.avatar}).write();
    });
    io.emit("user-online-changed", onlineUsers);
    io.emit("message", db.get("messages").takeRight(50));
  });

  socket.on("disconnect", () => { // Handle khi một socket bị disconnect thì xóa user tương ứng và gửi lại danh sách user online
    onlineUsers = onlineUsers.filter((ol) => ol.socketId !== socket.id);
    io.emit("user-online-changed", onlineUsers);
  });

  socket.on("get-old-messages", (id) => { // Dùng khi frontend muốn load thêm message cũ hơn bằng cách scroll(infinity scroll)
    const messages = db.get("messages").cloneDeep().reverse();
    const index = messages.findIndex((m) => m.id === id).value();
    if (index >= 0) {
      io.to(socket.id).emit(
        "old-messages",
        messages.slice(index + 1, index + 51)
      );
    }
  });

  socket.on("chat", (message) => { // Gửi các đoạn chat message vào chatbox
    if (!message.avatar) {
      message.avatar = "guest.png";
    }
    db.get("messages").push(message).write();
    io.emit("new-message", message);
  });
});

// API đăng ký
app.post('/api/v1/register', async (req, res) => {
  if (db.get("users").find({username: req.body.username}).value()) {
    res.send({error_code: 1, message: 'Tài khoản đã tồn tại'});  
  } else {
    const shortid = require('shortid')
    db.get("users").push({id: shortid.generate(), username: req.body.username, displayName: req.body['display-name'], password: req.body.password}).write();
    res.send({error_code: 0, message: 'Đăng ký tài khoản thành công'});  
  }
});

// API đăng nhập
app.post('/api/v1/login', (req, res) => {
  const user = db.get("users").find({username: req.body.username}).value();
  if (user && user.password === req.body.password) {
    res.send({error_code: 0, message: 'Đăng nhập thành công', data: {id: user.id, username: user.username, displayName: user.displayName, avatar: user.avatar}});
  } else {
    res.send({error_code: 1, message: 'Tài khoản hoặc mật khẩu không đúng'});
  }
});

// API upload avatar
app.post('/api/v1/upload', upload.single('avatar'), (req, res) => {
  res.send({error_code: 0, message: 'Cập nhật thành công', data: {avatar: req.file.path.substring(9)}});
});