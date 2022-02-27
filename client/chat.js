const currentUser = JSON.parse(sessionStorage.getItem('user'));
if (!currentUser) {
  window.location.href = '/';
} else {
  const socket = io('http://localhost:3000'); // Khởi tạo socket.io client

  // Get các element theo id
  const chatMessagesDiv = document.getElementById("chat-messages");
  const chatInput = document.getElementById("chat-input");
  const onlineUsersDiv = document.getElementById("online-users");
  const displayNameProfileLabel = document.getElementById("display-name-profile");
  const avatarProfileImg = document.getElementById("avatar-profile");
  const displayNameProfileInput = document.getElementById("display-name-input");
  const avatarProfileInput = document.getElementById("avatar-input");

  let displayNameProfile = currentUser.displayName;
  let avatarFile = null;
  
  displayNameProfileLabel.textContent = displayNameProfile;
  displayNameProfileInput.value = displayNameProfile;
  avatarProfileImg.src = currentUser.avatar ? currentUser.avatar : './image/guest.png';

  socket.on("connect", () => { // Khi connect socket thì gửi đi event online gồm các thông tin của user
    socket.emit("online", {
      socketId: socket.id,
      id: currentUser.id,
      displayName: displayNameProfile,
      avatar: currentUser.avatar ? currentUser.avatar : './image/guest.png'
    });

    socket.on("user-online-changed", (onlineUsers) => { // Handle event khi có các thay đổi của các user online
      renderOnlineUsers(onlineUsers); // Render lại view khi có thay đổi các user online
    });

    socket.on("message", (messageList) => { // Handle event khi lần đầu vào chatbox nhận được danh sách các message gần nhất(tối đa 50)
      chatMessagesDiv.innerHTML = '';
      renderChat(messageList, false); // Render lại view khi có message mới
      setTimeout(() => {
        chatMessagesDiv.scroll({ top: chatMessagesDiv.scrollHeight }); // Tự scroll xuống cuối cùng
      });
    });

    socket.on("new-message", (newMessage) => { // Handle event có message mới
      renderChat([...[], newMessage], true); // Render message mới
      chatMessagesDiv.scroll({ top: chatMessagesDiv.scrollHeight }); // Tự scroll xuống cuối khi có message mới
    });

    chatMessagesDiv.onscroll = () => { // Infinity scroll để lấy các message cũ hơn
      const idFirstMessage = chatMessagesDiv.children[0].id;
      if (chatMessagesDiv.scrollTop === 0) {
        socket.emit("get-old-messages", idFirstMessage);
      }
    };

    socket.on("old-messages", (oldMessages) => { // Handle event khi nhận được các message cũ và render các message cũ
      renderOldChat(oldMessages);
    });

    chatInput.onkeypress = (event) =>  { // Handle event bấm phím enter thì gửi chat
      if(event.code === 'Enter') {
        chat();
      }
    };
  });

  function chat() {
    const message = {
      id: makeChatId(),
      senderId: currentUser.id,
      displayName: displayNameProfile,
      avatar: currentUser.avatar ? currentUser.avatar : './image/guest.png',
      message: chatInput.value,
    };
    socket.emit("chat", message);
    chatInput.value = "";
  }

  function readFile(file) {
    return new Promise(((resolve, reject) => {
      const fileReader = new FileReader();
      fileReader.onload = (event) => {
        resolve(event.target.result);
      };
      fileReader.readAsDataURL(file);
    }));
  }

  function avatarChange() {
    if (avatarProfileInput.files[0]) {
      avatarFile = avatarProfileInput.files[0];
      readFile(avatarProfileInput.files[0]).then(
        result => {
          avatarProfileImg.src = result;
        }
      );
    }
  }

  function updateProfile() {
    displayNameProfile = displayNameProfileInput.value;
    displayNameProfileLabel.textContent = displayNameProfile;

    if (!avatarFile) {
      // Nếu không thay đổi avatar
      toastr.success('Cập nhật thành công');
      socket.emit("update-profile", {
        socketId: socket.id,
        id: currentUser.id,
        displayName: displayNameProfile,
        avatar: currentUser.avatar ? currentUser.avatar : './image/guest.png',
      });
    } else {
      // Nếu thay đổi avatar thì gửi lên server
      const formData = new FormData();
      formData.set('avatar', avatarFile);
      formData.set('id', currentUser.id);
  
      axios({
        method: 'post',
        url: '/api/v1/upload',
        headers: {'Content-type': 'multipart/form-data'},
        data: formData
      }).then(response => {
        toastr.success(response.data.message);
        currentUser.avatar = response.data.data.avatar;
        avatarProfileImg.src = response.data.data.avatar;
        sessionStorage.setItem('user', JSON.stringify(currentUser));
        
        socket.emit("update-profile", {
          socketId: socket.id,
          id: currentUser.id,
          displayName: displayNameProfile,
          avatar: response.data.data.avatar,
        });
      }).catch(error => {
          console.log(error);
      });
    }
  }

  async function renderChat(newMessages = [], isNewMessage = false) {
    newMessages.forEach(async (message, i) => {
      let wrapperDiv = document.createElement("div");
      if(isNewMessage) {
        wrapperDiv.className +=
        "p-2 border mt-2 chat-message animate__animated animate__backInLeft";
      } else {
        wrapperDiv.className +=
        "p-2 border mt-2 chat-message animate__animated animate__fadeIn";
      }
      wrapperDiv.id = message.id;

      let avatarImg = document.createElement("img");
      avatarImg.style.width = '40px';
      avatarImg.style.height = '40px';
      avatarImg.style.objectFit = 'cover';
      avatarImg.className += "rounded-circle img-thumbnail mr-2";
      avatarImg.src = message.avatar;
      wrapperDiv.appendChild(avatarImg);

      let displayNameSpan = document.createElement("span");
      displayNameSpan.textContent = " " + message.displayName + ": ";
      displayNameSpan.style.fontWeight = 600;
      wrapperDiv.appendChild(displayNameSpan);

      let messageSpan = document.createElement("span");
      messageSpan.textContent = message.message;
      wrapperDiv.appendChild(messageSpan);

      chatMessagesDiv.appendChild(wrapperDiv);
    });
  }

  async function renderOldChat(oldMessages = []) {
    oldMessages.forEach((message) => {
      let wrapperDiv = document.createElement("div");
      wrapperDiv.className +=
        "p-2 border mt-2 chat-message animate__animated animate__fadeIn";
      wrapperDiv.id = message.id;

      let avatarImg = document.createElement("img");
      avatarImg.style.width = '40px';
      avatarImg.style.height = '40px';
      avatarImg.style.objectFit = 'cover';
      avatarImg.className += "rounded-circle img-thumbnail mr-2";
      avatarImg.src = message.avatar;
      wrapperDiv.appendChild(avatarImg);

      let displayNameSpan = document.createElement("span");
      displayNameSpan.textContent = " " + message.displayName + ": ";
      displayNameSpan.style.fontWeight = 600;
      wrapperDiv.appendChild(displayNameSpan);

      let messageSpan = document.createElement("span");
      messageSpan.textContent = message.message;
      wrapperDiv.appendChild(messageSpan);

      chatMessagesDiv.prepend(wrapperDiv);
    });
  }

  function renderOnlineUsers(onlineUsers = []) {
    onlineUsersDiv.innerHTML = "";
    let flag = document.createDocumentFragment();
    onlineUsers.forEach((user) => {
      let wrapperDiv = document.createElement("div");
      wrapperDiv.className = "m-1";

      let avatarImg = document.createElement("img");
      avatarImg.style.width = '40px';
      avatarImg.style.height = '40px';
      avatarImg.style.objectFit = 'cover';
      avatarImg.style.marginRight = '5px'
      avatarImg.className += "rounded-circle img-thumbnail mr-2";
      avatarImg.src = user.avatar;
      wrapperDiv.appendChild(avatarImg);

      let displayNameStrong = document.createElement("strong");
      displayNameStrong.textContent = user.displayName;
      wrapperDiv.appendChild(displayNameStrong);

      flag.appendChild(wrapperDiv);
    });
    onlineUsersDiv.appendChild(flag);
  }

  function makeChatId() {
    var result = "";
    var characters =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_)(:/?.,,[]-=+@!#";
    var charactersLength = characters.length;
    for (var i = 0; i < 15; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }

}
