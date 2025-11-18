// public/app.js
(() => {
  const socket = io();

  const usernameInput = document.getElementById('usernameInput');
  const roomCodeInput = document.getElementById('roomCodeInput');
  const maxMembersInput = document.getElementById('maxMembersInput');
  const createRoomBtn = document.getElementById('createRoomBtn');
  const joinRoomBtn = document.getElementById('joinRoomBtn');
  const roomStatus = document.getElementById('roomStatus');
  const chatArea = document.getElementById('chatArea');
  const messagesDiv = document.getElementById('messages');
  const chatForm = document.getElementById('chatForm');
  const chatInput = document.getElementById('chatInput');

  let currentRoom = null;
  let currentCapacity = null;

  function appendSystemMessage (text) {
    const div = document.createElement('div');
    div.className = 'system';
    div.textContent = text;
    messagesDiv.appendChild(div);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  function appendChatMessage ({ username, message, time }) {
    const div = document.createElement('div');
    div.className = 'message';

    const meta = document.createElement('span');
    meta.className = 'meta';
    meta.textContent = `[${time}] ${username}:`;

    const textSpan = document.createElement('span');
    textSpan.className = 'text';
    textSpan.textContent = ' ' + message;

    div.appendChild(meta);
    div.appendChild(textSpan);

    messagesDiv.appendChild(div);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  function generateRoomCode () {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  function joinRoom (roomCode, maxMembers) {
    const username = usernameInput.value.trim() || 'Guest';
    if (!roomCode) {
      roomStatus.textContent = 'Please enter a room code.';
      return;
    }

    roomCode = roomCode.toUpperCase();

    socket.emit('join-room', {
      roomCode,
      username,
      maxMembers
    });
  }

  /* ---------- Socket events ---------- */

  socket.on('connect', () => {
    console.log('Connected to server as', socket.id);
  });

  socket.on('joined-room', ({ roomCode, maxMembers }) => {
    currentRoom = roomCode;
    currentCapacity = maxMembers;
    roomStatus.textContent =
        `Joined room: ${roomCode} (capacity: ${maxMembers}). Share this code with your friends.`;
    chatArea.style.display = 'block';
    appendSystemMessage(`You joined room ${roomCode}. Room capacity: ${maxMembers}.`);
  });

  socket.on('system-message', (text) => {
    appendSystemMessage(text);
  });

  socket.on('chat-message', (payload) => {
    appendChatMessage(payload);
  });

  socket.on('room-full', ({ roomCode, maxMembers }) => {
    roomStatus.textContent =
        `Room ${roomCode} is full. Max allowed members: ${maxMembers}.`;
    appendSystemMessage(`Cannot join. Room ${roomCode} is full (${maxMembers} users).`);
    chatArea.style.display = 'none';
  });

  /* ---------- UI events ---------- */

  createRoomBtn.addEventListener('click', () => {
    const code = generateRoomCode();
    roomCodeInput.value = code;
    const maxMembers = Number(maxMembersInput.value) || 2;
    joinRoom(code, maxMembers);
  });

  joinRoomBtn.addEventListener('click', () => {
    const code = roomCodeInput.value.trim().toUpperCase();
    joinRoom(code);
  });

  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const msg = chatInput.value.trim();
    if (!msg || !currentRoom) return;

    socket.emit('chat-message', {
      roomCode: currentRoom,
      message: msg
    });

    chatInput.value = '';
    chatInput.focus();
  });
})();
