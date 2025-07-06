// Connection Diagnostic Script
console.log('🔧 MK Love Games - Connection Diagnostic');

// Test function to verify connection functionality
function diagnoseConnection() {
    console.log('=== CONNECTION DIAGNOSTIC ===');
    
    // Check global variables
    console.log('Current Player:', typeof currentPlayer !== 'undefined' ? currentPlayer : 'UNDEFINED');
    console.log('Connection Status:', typeof connectionStatus !== 'undefined' ? connectionStatus : 'UNDEFINED');
    console.log('Is Connected:', typeof isConnected !== 'undefined' ? isConnected : 'UNDEFINED');
    console.log('Remote Player:', typeof remotePlayer !== 'undefined' ? remotePlayer : 'UNDEFINED');
    
    // Check required functions
    console.log('updateConnectionStatus function:', typeof updateConnectionStatus);
    console.log('addSystemMessage function:', typeof addSystemMessage);
    console.log('displayRoomInfo function:', typeof displayRoomInfo);
    
    // Check DOM elements
    const statusElement = document.getElementById('connectionStatus');
    console.log('Connection Status Element:', statusElement ? 'FOUND' : 'MISSING');
    
    const playerSelect = document.getElementById('playerSelect');
    console.log('Player Select Element:', playerSelect ? 'FOUND' : 'MISSING');
    
    console.log('=== END DIAGNOSTIC ===');
}

// Auto-run diagnostic when page loads
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(diagnoseConnection, 1000);
});

// Make available globally for manual testing
window.diagnoseConnection = diagnoseConnection;
