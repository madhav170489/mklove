// Global Variables
let currentPlayer = '';
let gameState = {};
let chatMessages = [];
let isOnline = false;
let isHost = false;
let isConnected = false;
let remotePlayer = '';
let roomId = '';

// Multiplayer Variables
let peerConnection = null;
let dataChannel = null;
let localMessages = [];
let connectionStatus = 'disconnected'; // disconnected, connecting, connected

// Sound effects using Web Audio API
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

// Sound generation functions
function playSound(type) {
    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        let frequency, duration;
        
        switch(type) {
            case 'happy':
                frequency = 523.25; // C5
                duration = 0.3;
                break;
            case 'laugh':
                frequency = 659.25; // E5
                duration = 0.2;
                break;
            case 'love':
                frequency = 783.99; // G5
                duration = 0.4;
                break;
            case 'cool':
                frequency = 440; // A4
                duration = 0.3;
                break;
            case 'party':
                frequency = 880; // A5
                duration = 0.5;
                break;
            case 'angry':
                frequency = 196; // G3
                duration = 0.3;
                break;
            case 'think':
                frequency = 349.23; // F4
                duration = 0.2;
                break;
            case 'clap':
                frequency = 1046.50; // C6
                duration = 0.1;
                break;
            case 'click':
                frequency = 800;
                duration = 0.1;
                break;
            case 'win':
                frequency = 523.25;
                duration = 0.6;
                break;
            default:
                frequency = 440;
                duration = 0.2;
        }
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);    } catch (error) {
        console.log('Audio not supported');
    }
}

// ================== MULTIPLAYER FUNCTIONALITY ==================

// WebRTC Configuration
const rtcConfiguration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

// Initialize WebRTC Connection
function initializeWebRTC() {
    peerConnection = new RTCPeerConnection(rtcConfiguration);
    
    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            sendSignalingMessage({
                type: 'ice-candidate',
                candidate: event.candidate,
                roomId: roomId,
                from: currentPlayer
            });
        }
    };
    
    // Handle data channel from remote peer
    peerConnection.ondatachannel = (event) => {
        const channel = event.channel;
        channel.onmessage = handleRemoteMessage;
        channel.onopen = () => {
            console.log('Data channel opened');
            connectionStatus = 'connected';
            isConnected = true;
            updateConnectionStatus();
        };
        channel.onclose = () => {
            console.log('Data channel closed');
            connectionStatus = 'disconnected';
            isConnected = false;
            updateConnectionStatus();
        };
    };
}

// Create Room (Host)
async function createRoom() {
    if (!currentPlayer) {
        alert('Please select a player first!');
        return;
    }
    
    roomId = generateRoomId();
    isHost = true;
    connectionStatus = 'connecting';
    
    initializeWebRTC();
    
    // Create data channel
    dataChannel = peerConnection.createDataChannel('game-data');
    dataChannel.onopen = () => {
        console.log('Data channel opened');
        connectionStatus = 'connected';
        isConnected = true;
        updateConnectionStatus();
    };
    dataChannel.onmessage = handleRemoteMessage;
    
    // Create offer
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    
    // Send offer through signaling
    sendSignalingMessage({
        type: 'offer',
        offer: offer,
        roomId: roomId,
        from: currentPlayer
    });
    
    displayRoomInfo();
    startSignalingListener();
}

// Join Room (Guest)
async function joinRoom() {
    const inputRoomId = prompt('Enter Room ID to join:');
    if (!inputRoomId || !currentPlayer) {
        if (!currentPlayer) alert('Please select a player first!');
        return;
    }
    
    roomId = inputRoomId.trim().toUpperCase();
    isHost = false;
    connectionStatus = 'connecting';
    
    initializeWebRTC();
    startSignalingListener();
    updateConnectionStatus();
}

// Generate Room ID
function generateRoomId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Simple signaling using a public API (no server needed)
async function sendSignalingMessage(message) {
    try {
        // Using a simple HTTP-based signaling approach
        // In production, you'd use a proper signaling server
        localStorage.setItem(`mkgames_signal_${roomId}`, JSON.stringify({
            ...message,
            timestamp: Date.now()
        }));
        
        // Also try using a simple web service for cross-device communication
        const response = await fetch('https://api.jsonbin.io/v3/b', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': '$2b$10$5I8g1K0YYo1n3kZ5c7Q4O.V8xJ4L9F2A0W3X1P5M6H8K4B2G6Y9E',
                'X-Bin-Name': `mkgames-${roomId}`
            },
            body: JSON.stringify(message)
        });
        
        if (!response.ok) {
            console.log('Fallback to localStorage signaling');
        }
    } catch (error) {
        console.log('Using localStorage for signaling');
    }
}

// Listen for signaling messages
function startSignalingListener() {
    const checkForMessages = async () => {
        try {
            // Check localStorage first
            const localMessage = localStorage.getItem(`mkgames_signal_${roomId}`);
            if (localMessage) {
                const message = JSON.parse(localMessage);
                if (message.from !== currentPlayer && Date.now() - message.timestamp < 30000) {
                    handleSignalingMessage(message);
                    localStorage.removeItem(`mkgames_signal_${roomId}`);
                }
            }
            
            // Also check web service
            try {
                const response = await fetch(`https://api.jsonbin.io/v3/b/mkgames-${roomId}/latest`, {
                    headers: {
                        'X-Master-Key': '$2b$10$5I8g1K0YYo1n3kZ5c7Q4O.V8xJ4L9F2A0W3X1P5M6H8K4B2G6Y9E'
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.record && data.record.from !== currentPlayer) {
                        handleSignalingMessage(data.record);
                    }
                }
            } catch (e) {
                // Web service not available, continue with localStorage
            }
            
        } catch (error) {
            console.log('Signaling error:', error);
        }
        
        if (connectionStatus !== 'connected') {
            setTimeout(checkForMessages, 2000);
        }
    };
    
    checkForMessages();
}

// Handle signaling messages
async function handleSignalingMessage(message) {
    if (message.roomId !== roomId) return;
    
    switch (message.type) {
        case 'offer':
            if (!isHost) {
                await peerConnection.setRemoteDescription(message.offer);
                const answer = await peerConnection.createAnswer();
                await peerConnection.setLocalDescription(answer);
                
                sendSignalingMessage({
                    type: 'answer',
                    answer: answer,
                    roomId: roomId,
                    from: currentPlayer
                });
                
                remotePlayer = message.from;
                updateConnectionStatus();
            }
            break;
            
        case 'answer':
            if (isHost) {
                await peerConnection.setRemoteDescription(message.answer);
                remotePlayer = message.from;
                updateConnectionStatus();
            }
            break;
            
        case 'ice-candidate':
            await peerConnection.addIceCandidate(message.candidate);
            break;
    }
}

// Send game data to remote player
function sendGameData(data) {
    if (dataChannel && dataChannel.readyState === 'open') {
        dataChannel.send(JSON.stringify({
            type: 'game-data',
            data: data,
            from: currentPlayer,
            timestamp: Date.now()
        }));
    }
}

// Handle messages from remote player
function handleRemoteMessage(event) {
    try {
        const message = JSON.parse(event.data);
        
        switch (message.type) {
            case 'game-data':
                handleRemoteGameData(message.data);
                break;
            case 'chat-message':
                addMessage(message.from, message.data.message);
                break;
            case 'emoji':
                createFloatingEmoji(message.data.emoji);
                playSound(message.data.soundType);
                break;
            case 'game-action':
                handleRemoteGameAction(message.data);
                break;
        }
    } catch (error) {
        console.log('Error handling remote message:', error);
    }
}

// Handle remote game data
function handleRemoteGameData(data) {
    // Sync game state with remote player
    if (data.gameState) {
        gameState = { ...gameState, ...data.gameState };
        updateGameDisplay();
    }
}

// Handle remote game actions
function handleRemoteGameAction(data) {
    switch (data.action) {
        case 'tic-tac-toe-move':
            // Sync the game state first
            if (data.gameState) {
                gameState.ticTacToe = data.gameState;
            }
            // Update the board display
            updateTicTacToeDisplay();
            break;
        case 'game-reset':
            if (data.game === 'tic-tac-toe') {
                resetTicTacToe();
                addSystemMessage(`${remotePlayer} reset the game! 🔄`);
            }
            break;
    }
}

// Update Tic Tac Toe display
function updateTicTacToeDisplay() {
    const cells = document.querySelectorAll('.tictactoe-cell');
    const status = document.getElementById('ticTacStatus');
    
    if (gameState.ticTacToe && cells.length > 0) {
        // Update board display
        cells.forEach((cell, index) => {
            cell.textContent = gameState.ticTacToe.board[index] || '';
            if (gameState.ticTacToe.board[index]) {
                cell.style.color = gameState.ticTacToe.board[index] === 'X' ? '#667eea' : '#764ba2';
            }
        });
        
        // Update status
        if (status) {
            if (gameState.ticTacToe.gameOver) {
                if (checkTicTacToeWinner()) {
                    status.textContent = `Player ${gameState.ticTacToe.currentPlayer} Wins! 🎉`;
                } else {
                    status.textContent = "It's a Draw! 🤝";
                }
            } else {
                if (isConnected) {
                    const currentPlayerName = (gameState.ticTacToe.currentPlayer === 'X' && isHost) || 
                                            (gameState.ticTacToe.currentPlayer === 'O' && !isHost) ? 
                                            currentPlayer : remotePlayer;
                    status.textContent = `${currentPlayerName || gameState.ticTacToe.currentPlayer}'s Turn`;
                } else {
                    status.textContent = `Player ${gameState.ticTacToe.currentPlayer}'s Turn`;
                }
            }
        }
    }
}

// Update connection status display
function updateConnectionStatus() {
    const statusElement = document.getElementById('connectionStatus');
    if (statusElement) {
        switch (connectionStatus) {
            case 'connected':
                statusElement.innerHTML = `🟢 Connected to ${remotePlayer}`;
                statusElement.className = 'status-connected';
                break;
            case 'connecting':
                statusElement.innerHTML = '🟡 Connecting...';
                statusElement.className = 'status-connecting';
                break;
            default:
                statusElement.innerHTML = '🔴 Not Connected';
                statusElement.className = 'status-disconnected';
        }
    }
}

// Display room information
function displayRoomInfo() {
    const roomInfo = document.getElementById('roomInfo');
    if (roomInfo) {
        roomInfo.innerHTML = `
            <div class="room-card">
                <h4>🎮 Room Created!</h4>
                <p><strong>Room ID:</strong> <span class="room-id">${roomId}</span></p>
                <p>Share this ID with ${currentPlayer === 'Madhav' ? 'Khushi' : 'Madhav'} to join the game!</p>
                <button class="game-btn" onclick="copyRoomId()">📋 Copy Room ID</button>
            </div>
        `;
        roomInfo.style.display = 'block';
    }
}

// Copy room ID to clipboard
function copyRoomId() {
    navigator.clipboard.writeText(roomId).then(() => {
        alert('Room ID copied to clipboard!');
    }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = roomId;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert('Room ID copied to clipboard!');
    });
}

// Check if it's current player's turn
function isCurrentPlayerTurn() {
    // Simple turn management - can be enhanced
    return gameState.ticTacToe && 
           ((gameState.ticTacToe.currentPlayer === 'X' && isHost) ||
            (gameState.ticTacToe.currentPlayer === 'O' && !isHost));
}

// ================== END MULTIPLAYER FUNCTIONALITY ==================

// Player Management
function setActivePlayer() {
    const select = document.getElementById('playerSelect');
    const indicator = document.getElementById('onlineIndicator');
    const playerInfo = document.getElementById('playerInfo');
    const playerName = document.getElementById('playerName');
    
    currentPlayer = select.value;
    
    if (currentPlayer) {
        isOnline = true;
        indicator.textContent = 'Online';
        indicator.className = 'status-online';
        playerInfo.style.display = 'block';
        playerName.textContent = currentPlayer;
        playerInfo.classList.add('fade-in');
        
        // Add welcome message to chat
        addSystemMessage(`${currentPlayer} is now online! 🎮`);
        playSound('party');
    } else {
        isOnline = false;
        indicator.textContent = 'Offline';
        indicator.className = 'status-offline';
        playerInfo.style.display = 'none';
    }
}

// Chat Functionality
function toggleChat() {
    const chatContainer = document.getElementById('chatContainer');
    const toggleBtn = document.getElementById('toggleChat');
    
    if (chatContainer.style.display === 'none') {
        chatContainer.style.display = 'block';
        toggleBtn.innerHTML = '<i class="fas fa-comment"></i>';
    } else {
        chatContainer.style.display = 'none';
        toggleBtn.innerHTML = '<i class="fas fa-comment-slash"></i>';
    }
}

function sendMessage() {
    const input = document.getElementById('messageInput');
    const message = input.value.trim();
    
    if (message && currentPlayer) {
        addMessage(currentPlayer, message);
        
        // Send to remote player if connected
        if (isConnected && dataChannel && dataChannel.readyState === 'open') {
            dataChannel.send(JSON.stringify({
                type: 'chat-message',
                from: currentPlayer,
                data: { message: message },
                timestamp: Date.now()
            }));
        }
        
        input.value = '';
        playSound('click');
    }
}

function addMessage(sender, message) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message ' + (sender === currentPlayer ? 'own' : 'other');
    messageDiv.innerHTML = `<strong>${sender}:</strong> ${message}`;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addSystemMessage(message) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'system-message';
    messageDiv.textContent = message;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addEmoji(emoji, soundType) {
    const input = document.getElementById('messageInput');
    input.value += emoji;
    
    // Create floating emoji animation
    createFloatingEmoji(emoji);
    
    // Play sound
    playSound(soundType);
    
    // Send emoji to remote player if connected
    if (isConnected && dataChannel && dataChannel.readyState === 'open') {
        dataChannel.send(JSON.stringify({
            type: 'emoji',
            from: currentPlayer,
            data: { emoji: emoji, soundType: soundType },
            timestamp: Date.now()
        }));
    }
    
    // Send emoji as message if there's text
    if (input.value.trim() && currentPlayer) {
        sendMessage();
    }
}

function createFloatingEmoji(emoji) {
    const emojiElement = document.createElement('div');
    emojiElement.textContent = emoji;
    emojiElement.className = 'emoji-float';
    emojiElement.style.left = Math.random() * window.innerWidth + 'px';
    emojiElement.style.top = window.innerHeight - 100 + 'px';
    
    document.body.appendChild(emojiElement);
    
    setTimeout(() => {
        document.body.removeChild(emojiElement);
    }, 3000);
}

function handleEnter(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

// Game Management
function openGame(gameType) {
    if (!currentPlayer) {
        alert('Please select a player first!');
        return;
    }
    
    const modal = document.getElementById('gameModal');
    const gameTitle = document.getElementById('gameTitle');
    const gameContainer = document.getElementById('gameContainer');
    
    playSound('click');
    
    // Set game title and load game content
    switch(gameType) {
        case 'ludo':
            gameTitle.textContent = 'Ludo Game';
            loadLudoGame(gameContainer);
            break;
        case 'carrom':
            gameTitle.textContent = 'Carrom Board';
            loadCarromGame(gameContainer);
            break;
        case 'snakes':
            gameTitle.textContent = 'Snakes & Ladders';
            loadSnakesGame(gameContainer);
            break;
        case 'tictac':
            gameTitle.textContent = 'Tic Tac Toe';
            loadTicTacToeGame(gameContainer);
            break;
        case 'tennis':
            gameTitle.textContent = 'Tennis Match';
            loadTennisGame(gameContainer);
            break;
        case 'race':
            gameTitle.textContent = 'Racing Game';
            loadRaceGame(gameContainer);
            break;
        case 'fight':
            gameTitle.textContent = 'Fight Arena';
            loadFightGame(gameContainer);
            break;
        case 'isto':
            gameTitle.textContent = 'Isto Game';
            loadIstoGame(gameContainer);
            break;
    }
    
    modal.style.display = 'block';
    addSystemMessage(`${currentPlayer} started playing ${gameTitle.textContent}! 🎯`);
}

function closeGame() {
    const modal = document.getElementById('gameModal');
    modal.style.display = 'none';
    playSound('click');
}

// Game Implementations

// Tic Tac Toe
function loadTicTacToeGame(container) {
    const playerAssignment = isConnected ? 
        `<div class="player-assignment">
            <p><strong>${currentPlayer}:</strong> ${isHost ? 'X' : 'O'} | 
            <strong>${remotePlayer || 'Waiting...'}</strong> ${isHost ? 'O' : 'X'}</p>
        </div>` : '';
    
    container.innerHTML = `
        ${playerAssignment}
        <div class="game-status" id="ticTacStatus">${isConnected ? 
            (isHost ? currentPlayer + "'s Turn (X)" : remotePlayer + "'s Turn (X)") : 
            "Player X's Turn"}</div>
        <div class="tictactoe-board" id="ticTacBoard"></div>
        <div class="game-controls">
            <button class="game-btn" onclick="resetTicTacToe()">New Game</button>
            ${isConnected ? '<button class="game-btn" onclick="syncGameState()">Sync Game</button>' : ''}
        </div>
    `;
    
    gameState.ticTacToe = {
        board: Array(9).fill(''),
        currentPlayer: 'X',
        gameOver: false
    };
    
    createTicTacToeBoard();
}
}

function createTicTacToeBoard() {
    const board = document.getElementById('ticTacBoard');
    board.innerHTML = '';
    
    for (let i = 0; i < 9; i++) {
        const cell = document.createElement('div');
        cell.className = 'tictactoe-cell';
        cell.onclick = () => makeTicTacToeMove(i);
        board.appendChild(cell);
    }
}

function makeTicTacToeMove(index, fromRemote = false) {
    if (gameState.ticTacToe.gameOver || gameState.ticTacToe.board[index]) return;
    
    // In multiplayer, check if it's the player's turn
    if (isConnected && !fromRemote) {
        const playerSymbol = isHost ? 'X' : 'O';
        if (gameState.ticTacToe.currentPlayer !== playerSymbol) {
            addSystemMessage("It's not your turn! 🛑");
            return;
        }
    }
    
    const cells = document.querySelectorAll('.tictactoe-cell');
    const status = document.getElementById('ticTacStatus');
    
    gameState.ticTacToe.board[index] = gameState.ticTacToe.currentPlayer;
    cells[index].textContent = gameState.ticTacToe.currentPlayer;
    cells[index].style.color = gameState.ticTacToe.currentPlayer === 'X' ? '#667eea' : '#764ba2';
    
    playSound('click');
    
    // Send move to remote player if not from remote
    if (isConnected && !fromRemote && dataChannel && dataChannel.readyState === 'open') {
        dataChannel.send(JSON.stringify({
            type: 'game-action',
            from: currentPlayer,
            data: { 
                action: 'tic-tac-toe-move', 
                index: index,
                gameState: gameState.ticTacToe
            },
            timestamp: Date.now()
        }));
    }
    
    if (checkTicTacToeWinner()) {
        status.textContent = `Player ${gameState.ticTacToe.currentPlayer} Wins! 🎉`;
        gameState.ticTacToe.gameOver = true;
        playSound('win');
        createFloatingEmoji('🎉');
        
        const winnerName = (gameState.ticTacToe.currentPlayer === 'X' && isHost) || 
                          (gameState.ticTacToe.currentPlayer === 'O' && !isHost) ? 
                          currentPlayer : remotePlayer;
        addSystemMessage(`${winnerName || currentPlayer} won Tic Tac Toe! 🏆`);
    } else if (gameState.ticTacToe.board.every(cell => cell)) {
        status.textContent = "It's a Draw! 🤝";
        gameState.ticTacToe.gameOver = true;
        playSound('think');
        addSystemMessage("It's a draw! Great game! 🤝");
    } else {
        gameState.ticTacToe.currentPlayer = gameState.ticTacToe.currentPlayer === 'X' ? 'O' : 'X';
        
        if (isConnected) {
            const currentPlayerName = (gameState.ticTacToe.currentPlayer === 'X' && isHost) || 
                                    (gameState.ticTacToe.currentPlayer === 'O' && !isHost) ? 
                                    currentPlayer : remotePlayer;
            status.textContent = `${currentPlayerName || gameState.ticTacToe.currentPlayer}'s Turn`;
        } else {
            status.textContent = `Player ${gameState.ticTacToe.currentPlayer}'s Turn`;
        }
    }
}

function checkTicTacToeWinner() {
    const board = gameState.ticTacToe.board;
    const winPatterns = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
        [0, 4, 8], [2, 4, 6] // Diagonals
    ];
    
    return winPatterns.some(pattern => {
        const [a, b, c] = pattern;
        return board[a] && board[a] === board[b] && board[a] === board[c];
    });
}

function resetTicTacToe() {
    gameState.ticTacToe = {
        board: Array(9).fill(''),
        currentPlayer: 'X',
        gameOver: false
    };
    
    const status = document.getElementById('ticTacStatus');
    if (isConnected) {
        status.textContent = isHost ? `${currentPlayer}'s Turn (X)` : `${remotePlayer || 'Remote Player'}'s Turn (X)`;
        
        // Send reset to remote player
        if (dataChannel && dataChannel.readyState === 'open') {
            dataChannel.send(JSON.stringify({
                type: 'game-action',
                from: currentPlayer,
                data: { 
                    action: 'game-reset', 
                    game: 'tic-tac-toe',
                    gameState: gameState.ticTacToe
                },
                timestamp: Date.now()
            }));
        }
    } else {
        status.textContent = "Player X's Turn";
    }
    
    createTicTacToeBoard();
    playSound('click');
}

// Sync game state with remote player
function syncGameState() {
    if (isConnected && dataChannel && dataChannel.readyState === 'open') {
        dataChannel.send(JSON.stringify({
            type: 'game-action',
            from: currentPlayer,
            data: { 
                action: 'sync-game-state',
                gameState: gameState.ticTacToe
            },
            timestamp: Date.now()
        }));
        addSystemMessage('Game state synced! 🔄');
    }
}

// Ludo Game
function loadLudoGame(container) {
    container.innerHTML = `
        <h3>🎲 Ludo Game</h3>
        <p>Classic board game for 2-4 players</p>
        <div class="game-board" style="width: 400px; height: 400px; background: linear-gradient(45deg, #ff6b6b, #4ecdc4); border-radius: 20px; display: flex; align-items: center; justify-content: center; margin: 20px auto;">
            <div style="text-align: center; color: white;">
                <i class="fas fa-dice" style="font-size: 4rem; margin-bottom: 20px;"></i>
                <p style="font-size: 1.2rem;">Ludo Board</p>
                <p style="margin-top: 10px;">Roll the dice and move your pieces!</p>
            </div>
        </div>
        <div class="game-controls">
            <button class="game-btn" onclick="rollDice()">🎲 Roll Dice</button>
            <button class="game-btn" onclick="addSystemMessage('${currentPlayer} is setting up Ludo game! 🎲')">Start Game</button>
        </div>
        <div id="diceResult" style="margin-top: 20px; font-size: 1.5rem; text-align: center;"></div>
    `;
}

// Carrom Game
function loadCarromGame(container) {
    container.innerHTML = `
        <h3>⚫ Carrom Board</h3>
        <p>Strike and pocket the coins</p>
        <div class="game-board" style="width: 400px; height: 400px; background: linear-gradient(45deg, #8b4513, #daa520); border-radius: 20px; border: 10px solid #654321; display: flex; align-items: center; justify-content: center; margin: 20px auto; position: relative;">
            <div style="width: 20px; height: 20px; background: white; border-radius: 50%; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);"></div>
            <div style="position: absolute; top: 30px; left: 30px; width: 15px; height: 15px; background: black; border-radius: 50%;"></div>
            <div style="position: absolute; top: 30px; right: 30px; width: 15px; height: 15px; background: white; border-radius: 50%;"></div>
            <div style="position: absolute; bottom: 30px; left: 30px; width: 15px; height: 15px; background: black; border-radius: 50%;"></div>
            <div style="position: absolute; bottom: 30px; right: 30px; width: 15px; height: 15px; background: white; border-radius: 50%;"></div>
        </div>
        <div class="game-controls">
            <button class="game-btn" onclick="strikeCarrom()">🎯 Strike</button>
            <button class="game-btn" onclick="addSystemMessage('${currentPlayer} is playing Carrom! ⚫')">Join Game</button>
        </div>
    `;
}

// Snakes & Ladders
function loadSnakesGame(container) {
    container.innerHTML = `
        <h3>🐍 Snakes & Ladders</h3>
        <p>Climb the ladders, avoid the snakes!</p>
        <div class="game-board" style="width: 400px; height: 400px; background: linear-gradient(checkerboard, #90EE90 25%, #32CD32 25%); border-radius: 20px; display: grid; grid-template-columns: repeat(10, 1fr); gap: 2px; padding: 10px; margin: 20px auto; border: 3px solid #228B22;">
            ${Array.from({length: 100}, (_, i) => `<div style="background: ${(Math.floor(i/10) + i) % 2 ? '#90EE90' : '#32CD32'}; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; color: #006400; font-weight: bold;">${100-i}</div>`).join('')}
        </div>
        <div class="game-controls">
            <button class="game-btn" onclick="rollDice()">🎲 Roll Dice</button>
            <button class="game-btn" onclick="addSystemMessage('${currentPlayer} started Snakes & Ladders! 🐍')">Start Game</button>
        </div>
        <div id="snakesPosition" style="margin-top: 20px; text-align: center;">Position: 1</div>
    `;
}

// Tennis Game
function loadTennisGame(container) {
    container.innerHTML = `
        <h3>🎾 Tennis Match</h3>
        <p>Serve and volley to victory!</p>
        <div class="game-board" style="width: 400px; height: 200px; background: linear-gradient(90deg, #228B22, #32CD32); border-radius: 10px; position: relative; margin: 20px auto; border: 3px solid #006400;">
            <div style="position: absolute; top: 50%; left: 50%; width: 2px; height: 100%; background: white; transform: translateX(-50%);"></div>
            <div style="position: absolute; top: 10px; left: 10px; width: 15px; height: 15px; background: yellow; border-radius: 50%;"></div>
            <div style="position: absolute; bottom: 10px; right: 50px; width: 20px; height: 80px; background: #8B4513; border-radius: 10px;"></div>
        </div>
        <div class="game-controls">
            <button class="game-btn" onclick="serveTennis()">🎾 Serve</button>
            <button class="game-btn" onclick="addSystemMessage('${currentPlayer} is playing Tennis! 🎾')">Join Match</button>
        </div>
        <div id="tennisScore" style="margin-top: 20px; text-align: center;">Score: 0 - 0</div>
    `;
}

// Race Game
function loadRaceGame(container) {
    container.innerHTML = `
        <h3>🏎️ Racing Game</h3>
        <p>Speed to the finish line!</p>
        <div class="game-board" style="width: 400px; height: 100px; background: linear-gradient(90deg, #333, #666); border-radius: 50px; position: relative; margin: 20px auto; border: 3px solid #000; overflow: hidden;">
            <div style="position: absolute; top: 50%; left: 10px; transform: translateY(-50%); font-size: 2rem;">🏎️</div>
            <div style="position: absolute; top: 50%; right: 10px; transform: translateY(-50%); font-size: 2rem;">🏁</div>
            <div style="position: absolute; top: 10px; left: 0; right: 0; height: 2px; background: white;"></div>
            <div style="position: absolute; bottom: 10px; left: 0; right: 0; height: 2px; background: white;"></div>
        </div>
        <div class="game-controls">
            <button class="game-btn" onclick="accelerate()">⚡ Accelerate</button>
            <button class="game-btn" onclick="addSystemMessage('${currentPlayer} joined the race! 🏎️')">Join Race</button>
        </div>
        <div id="raceSpeed" style="margin-top: 20px; text-align: center;">Speed: 0 km/h</div>
    `;
}

// Fight Game
function loadFightGame(container) {
    container.innerHTML = `
        <h3>👊 Fight Arena</h3>
        <p>Battle in the arena!</p>
        <div class="game-board" style="width: 400px; height: 200px; background: linear-gradient(45deg, #8B0000, #FF4500); border-radius: 20px; position: relative; margin: 20px auto; border: 3px solid #654321;">
            <div style="position: absolute; left: 20px; bottom: 20px; font-size: 3rem;">🥊</div>
            <div style="position: absolute; right: 20px; bottom: 20px; font-size: 3rem;">🥊</div>
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; font-size: 2rem;">VS</div>
        </div>
        <div class="game-controls">
            <button class="game-btn" onclick="punch()">👊 Punch</button>
            <button class="game-btn" onclick="block()">🛡️ Block</button>
            <button class="game-btn" onclick="addSystemMessage('${currentPlayer} entered the fight arena! 👊')">Join Fight</button>
        </div>
        <div id="fightHealth" style="margin-top: 20px; text-align: center;">Health: 100 HP</div>
    `;
}

// Isto Game
function loadIstoGame(container) {
    container.innerHTML = `
        <h3>⭐ Isto Game</h3>
        <p>Special game for MK Love!</p>
        <div class="game-board" style="width: 400px; height: 300px; background: linear-gradient(45deg, #FF69B4, #9370DB); border-radius: 20px; display: flex; align-items: center; justify-content: center; margin: 20px auto; color: white; text-align: center;">
            <div>
                <div style="font-size: 4rem; margin-bottom: 20px;">💖</div>
                <h3>MK Love Special</h3>
                <p>A special game just for Madhav & Khushi!</p>
            </div>
        </div>
        <div class="game-controls">
            <button class="game-btn" onclick="sendLove()">💖 Send Love</button>
            <button class="game-btn" onclick="addSystemMessage('${currentPlayer} is spreading love! 💖')">Spread Love</button>
        </div>
    `;
}

// Game Action Functions
function rollDice() {
    const result = Math.floor(Math.random() * 6) + 1;
    const diceResult = document.getElementById('diceResult');
    if (diceResult) {
        diceResult.innerHTML = `🎲 You rolled: ${result}`;
        diceResult.classList.add('bounce');
        setTimeout(() => diceResult.classList.remove('bounce'), 600);
    }
    playSound('click');
    addSystemMessage(`${currentPlayer} rolled a ${result}! 🎲`);
}

function strikeCarrom() {
    const strikes = ['Perfect shot! ⚫', 'Good strike! ⚪', 'Nice try! 🎯', 'Almost there! 💪'];
    const result = strikes[Math.floor(Math.random() * strikes.length)];
    playSound('click');
    addSystemMessage(`${currentPlayer}: ${result}`);
}

function serveTennis() {
    const serves = ['Ace! 🎾', 'Great serve! 💪', 'In play! 🏃‍♂️', 'Net! 😅'];
    const result = serves[Math.floor(Math.random() * serves.length)];
    playSound('click');
    addSystemMessage(`${currentPlayer}: ${result}`);
}

function accelerate() {
    const speed = Math.floor(Math.random() * 200) + 50;
    const speedDisplay = document.getElementById('raceSpeed');
    if (speedDisplay) {
        speedDisplay.textContent = `Speed: ${speed} km/h`;
    }
    playSound('click');
    addSystemMessage(`${currentPlayer} is racing at ${speed} km/h! 🏎️`);
}

function punch() {
    const punches = ['Critical hit! 💥', 'Good punch! 👊', 'Counter attack! ⚡', 'Missed! 😅'];
    const result = punches[Math.floor(Math.random() * punches.length)];
    playSound('click');
    addSystemMessage(`${currentPlayer}: ${result}`);
}

function block() {
    playSound('click');
    addSystemMessage(`${currentPlayer} blocked the attack! 🛡️`);
}

function sendLove() {
    createFloatingEmoji('💖');
    playSound('love');
    addSystemMessage(`${currentPlayer} sent love! 💖✨`);
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Add initial system message
    addSystemMessage('Welcome to MK Love Games! Select a player to start. 🎮💖');
    
    // Initialize audio context on first user interaction
    document.addEventListener('click', function initAudio() {
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
        document.removeEventListener('click', initAudio);
    }, { once: true });
    
    // Close modal when clicking outside
    window.onclick = function(event) {
        const modal = document.getElementById('gameModal');
        if (event.target === modal) {
            closeGame();
        }
    }
    
    // Add some fun interactions
    setInterval(() => {
        if (isOnline && Math.random() < 0.1) {
            const funMessages = [
                '🎮 Games are more fun together!',
                '💖 Love is in the air!',
                '🌟 You\'re both amazing!',
                '🎯 Ready for the next challenge?',
                '🎪 Let the games begin!'
            ];
            const randomMessage = funMessages[Math.floor(Math.random() * funMessages.length)];
            // Occasionally show fun messages (but not too often)
            if (Math.random() < 0.2) {
                setTimeout(() => addSystemMessage(randomMessage), 1000);
            }
        }
    }, 30000); // Check every 30 seconds
});
