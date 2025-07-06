// Test Connection Functions for MK Love Games
// Simple demo mode for testing multiplayer features

function testConnection() {
    if (!currentPlayer) {
        alert('Please select a player first!');
        return;
    }
    
    // Simulate connection
    connectionStatus = 'connecting';
    updateConnectionStatus();
    
    setTimeout(() => {
        connectionStatus = 'connected';
        isConnected = true;
        remotePlayer = currentPlayer === 'Madhav' ? 'Khushi' : 'Madhav';
        updateConnectionStatus();
        addSystemMessage(`🎮 Test Mode: Connected to ${remotePlayer}!`);
        addSystemMessage('You can now test all multiplayer features! 🎯');
        
        // Show test room info
        roomId = 'TEST123';
        displayRoomInfo();
    }, 2000);
}

// Add this function to the global scope
window.testConnection = testConnection;
