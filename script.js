// Configuration
const API_URL = 'https://api.jsonbin.io/v3/b'; // JSONBin.io API URL
const API_KEY = '$2a$10$F1fId.oFBNUrtnDImC3MNOy6o1ecqmO.nP76OF2tpg57RMGEYMULe'; // Your JSONBin.io API key
let BIN_ID = ''; // Will be set during initialization

// DOM Elements
const cameraFeed = document.getElementById('camera-feed');
const snapshotCanvas = document.getElementById('snapshot-canvas');
const violenceButton = document.getElementById('violence-button');
const historyList = document.getElementById('history-list');
const clearHistoryButton = document.getElementById('clear-history');
const notification = document.getElementById('notification');
const notificationText = document.getElementById('notification-text');

// Local storage for history
let eventHistory = JSON.parse(localStorage.getItem('eventHistory')) || [];

// Camera setup
async function setupCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'environment' 
            }, 
            audio: false 
        });
        cameraFeed.srcObject = stream;
        showNotification('Camera connected successfully');
    } catch (error) {
        console.error('Error accessing camera:', error);
        showNotification('Error accessing camera. Please check permissions.', 'error');
    }
}


function takeSnapshot() {
    const context = snapshotCanvas.getContext('2d');
    
    // Reduce the canvas size to half the video size
    snapshotCanvas.width = cameraFeed.videoWidth / 2;
    snapshotCanvas.height = cameraFeed.videoHeight / 2;
    
    context.drawImage(cameraFeed, 0, 0, snapshotCanvas.width, snapshotCanvas.height);
    
    // Reduce JPEG quality to 0.5 (50%)
    return snapshotCanvas.toDataURL('image/jpeg', 0.2);
}
// Create or update the JSONBin with all events
async function updateJSONBin(events) {
    try {
        const response = await fetch(`${API_URL}/${BIN_ID}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': API_KEY
            },
            body: JSON.stringify({ events })
        });
        
        if (!response.ok) {
            throw new Error('Failed to update JSONBin');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error updating JSONBin:', error);
        showNotification('Error syncing with server. Events saved locally.', 'error');
        return null;
    }
}

// Send event to JSONBin
async function sendEvent(imageDataUrl) {
    const timestamp = new Date().toISOString();
    const eventId = Date.now().toString();
    
    // Create the event data
    const eventData = {
        id: eventId,
        timestamp: timestamp,
        cameraName: 'Camera 1',
        imageUrl: imageDataUrl,
        status: 'new'
    };
    
    // Add to local history
    addToHistory(eventData);
    
    // Update JSONBin with all events
    await updateJSONBin(eventHistory);
    
    showNotification('Event reported successfully');
    return eventData;
}

// Add event to history
function addToHistory(eventData) {
    // Add to the beginning of the array
    eventHistory.unshift(eventData);
    
    // Save to local storage
    localStorage.setItem('eventHistory', JSON.stringify(eventHistory));
    
    // Update UI
    renderHistory();
}

// Render history items
function renderHistory() {
    historyList.innerHTML = '';
    
    if (eventHistory.length === 0) {
        historyList.innerHTML = '<div class="empty-history">No events recorded yet</div>';
        return;
    }
    
    eventHistory.forEach(event => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.dataset.id = event.id;
        
        historyItem.innerHTML = `
            <img src="${event.imageUrl}" alt="Event at ${formatTimestamp(event.timestamp)}" class="history-image">
            <div class="history-details">
                <div class="history-timestamp">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    ${formatTimestamp(event.timestamp)}
                </div>
            </div>
            <button class="delete-history" data-id="${event.id}">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        `;
        
        // Add swipe to delete functionality
        setupSwipeToDelete(historyItem);
        
        historyList.appendChild(historyItem);
    });
    
    // Add event listeners for delete buttons
    document.querySelectorAll('.delete-history').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = button.dataset.id;
            deleteHistoryItem(id);
        });
    });
}

// Format timestamp for display
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString();
}

// Delete history item
async function deleteHistoryItem(id) {
    // Remove from local array
    eventHistory = eventHistory.filter(event => event.id !== id);
    
    // Save to local storage
    localStorage.setItem('eventHistory', JSON.stringify(eventHistory));
    
    // Update UI with animation
    const item = document.querySelector(`.history-item[data-id="${id}"]`);
    if (item) {
        item.classList.add('removing');
        setTimeout(() => {
            renderHistory();
        }, 300);
    }
    
    // Update JSONBin
    await updateJSONBin(eventHistory);
}

// Clear all history
async function clearAllHistory() {
    if (confirm('Are you sure you want to clear all history?')) {
        eventHistory = [];
        localStorage.setItem('eventHistory', JSON.stringify(eventHistory));
        renderHistory();
        
        // Update JSONBin
        await updateJSONBin(eventHistory);
        
        showNotification('History cleared');
    }
}

// Show notification
function showNotification(message, type = 'success', duration = 3000) {
    notificationText.textContent = message;
    notification.className = `notification ${type} show`;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, duration);
}

// Setup swipe to delete functionality
function setupSwipeToDelete(element) {
    let startX, moveX, startTime;
    const threshold = 100; // Minimum distance to trigger delete
    
    element.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        startTime = new Date().getTime();
        element.classList.add('swiping');
    }, { passive: true });
    
    element.addEventListener('touchmove', (e) => {
        moveX = e.touches[0].clientX;
        const diff = moveX - startX;
        
        // Only allow swiping left
        if (diff < 0) {
            element.style.transform = `translateX(${diff}px)`;
        }
    }, { passive: true });
    
    element.addEventListener('touchend', (e) => {
        const endTime = new Date().getTime();
        const timeDiff = endTime - startTime;
        const diff = moveX - startX;
        
        element.classList.remove('swiping');
        element.style.transform = '';
        
        // Delete if swiped far enough or fast enough
        if (diff < -threshold || (diff < -50 && timeDiff < 300)) {
            const id = element.dataset.id;
            deleteHistoryItem(id);
        }
    });
}

// Create a new JSONBin if it doesn't exist
async function createJSONBin() {
    try {
        // Check if we have a bin ID stored
        const storedBinId = localStorage.getItem('jsonBinId');
        if (storedBinId) {
            // Use the stored bin ID
            BIN_ID = storedBinId;
            console.log(`Using stored bin ID: ${BIN_ID}`);
            
            // Add bin ID display to UI
            addBinIdDisplay();
            return;
        }
        
        // Create a new bin
        const response = await fetch(`${API_URL}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': API_KEY
            },
            body: JSON.stringify({ events: [] })
        });
        
        if (!response.ok) {
            throw new Error('Failed to create JSONBin');
        }
        
        const data = await response.json();
        // Store the bin ID
        BIN_ID = data.metadata.id;
        localStorage.setItem('jsonBinId', BIN_ID);
        
        // Add bin ID display to UI
        addBinIdDisplay();
        
        showNotification(`New bin created: ${BIN_ID}`, 'success', 5000);
        console.log(`New bin created: ${BIN_ID}`);
    } catch (error) {
        console.error('Error creating JSONBin:', error);
        showNotification('Error connecting to server. Working in offline mode.', 'error');
    }
}

// Add bin ID display to UI
function addBinIdDisplay() {
    // Create a small display for the bin ID
    const statusIndicator = document.querySelector('.status-indicator');
    if (statusIndicator) {
        // Check if it already exists
        if (document.querySelector('.bin-id-display')) {
            return;
        }
        
        const binIdDisplay = document.createElement('div');
        binIdDisplay.className = 'bin-id-display';
        binIdDisplay.innerHTML = `
            <span class="bin-id-label">Bin ID:</span> 
            <span id="bin-id-value">${BIN_ID}</span>
        `;
        binIdDisplay.style.marginLeft = '15px';
        binIdDisplay.style.fontSize = '0.75rem';
        binIdDisplay.style.opacity = '0.7';
        binIdDisplay.style.cursor = 'pointer';
        binIdDisplay.title = 'Click to copy Bin ID';
        
        // Add click to copy functionality
        binIdDisplay.addEventListener('click', () => {
            navigator.clipboard.writeText(BIN_ID)
                .then(() => showNotification('Bin ID copied to clipboard'))
                .catch(err => console.error('Could not copy text: ', err));
        });
        
        statusIndicator.appendChild(binIdDisplay);
    }
}

// Add CSS for bin ID display
function addBinIdStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .bin-id-display {
            display: inline-flex;
            align-items: center;
            background-color: rgba(0, 0, 0, 0.2);
            padding: 4px 8px;
            border-radius: 4px;
            margin-left: 10px;
            transition: background-color 0.3s;
        }
        
        .bin-id-display:hover {
            background-color: rgba(0, 0, 0, 0.4);
        }
        
        .bin-id-label {
            margin-right: 5px;
            font-weight: 500;
        }
        
        #bin-id-value {
            font-family: monospace;
        }
    `;
    document.head.appendChild(style);
}

// Event Listeners
violenceButton.addEventListener('click', async () => {
    if (!cameraFeed.srcObject) {
        showNotification('Camera not available', 'error');
        return;
    }
    
    // Visual feedback for button press
    violenceButton.classList.add('active');
    setTimeout(() => violenceButton.classList.remove('active'), 200);
    
    // Take snapshot and send event
    const imageDataUrl = takeSnapshot();
    await sendEvent(imageDataUrl);
});

clearHistoryButton.addEventListener('click', clearAllHistory);

// Initialize
window.addEventListener('DOMContentLoaded', async () => {
    addBinIdStyles();
    await setupCamera();
    await createJSONBin();
    renderHistory();
});
