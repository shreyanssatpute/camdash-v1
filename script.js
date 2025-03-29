// Configuration
const API_URL = 'https://api.jsonbin.io/v3/b'; // JSONBin.io API URL
const API_KEY = '$2a$10$F1fId.oFBNUrtnDImC3MNOy6o1ecqmO.nP76OF2tpg57RMGEYMULe'; // Your JSONBin.io API key
const BIN_ID = '67e81ce38a456b79667f01f3'; // Manually set your BIN ID

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

// Take snapshot function
function takeSnapshot() {
    const context = snapshotCanvas.getContext('2d');
    snapshotCanvas.width = cameraFeed.videoWidth / 2;
    snapshotCanvas.height = cameraFeed.videoHeight / 2;
    context.drawImage(cameraFeed, 0, 0, snapshotCanvas.width, snapshotCanvas.height);
    return snapshotCanvas.toDataURL('image/jpeg', 0.2);
}

// Update JSONBin with all events
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
    const eventData = {
        id: eventId,
        timestamp: timestamp,
        cameraName: 'Camera 1',
        imageUrl: imageDataUrl,
        status: 'new'
    };
    
    addToHistory(eventData);
    await updateJSONBin(eventHistory);
    showNotification('Event reported successfully');
    return eventData;
}

// Add event to history
function addToHistory(eventData) {
    eventHistory.unshift(eventData);
    localStorage.setItem('eventHistory', JSON.stringify(eventHistory));
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
                <div class="history-timestamp">${formatTimestamp(event.timestamp)}</div>
            </div>
            <button class="delete-history" data-id="${event.id}">X</button>
        `;
        historyList.appendChild(historyItem);
    });
}

// Format timestamp for display
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString();
}

// Delete history item
async function deleteHistoryItem(id) {
    eventHistory = eventHistory.filter(event => event.id !== id);
    localStorage.setItem('eventHistory', JSON.stringify(eventHistory));
    renderHistory();
    await updateJSONBin(eventHistory);
}

// Clear all history
async function clearAllHistory() {
    if (confirm('Are you sure you want to clear all history?')) {
        eventHistory = [];
        localStorage.setItem('eventHistory', JSON.stringify(eventHistory));
        renderHistory();
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

// Event Listeners
violenceButton.addEventListener('click', async () => {
    if (!cameraFeed.srcObject) {
        showNotification('Camera not available', 'error');
        return;
    }
    violenceButton.classList.add('active');
    setTimeout(() => violenceButton.classList.remove('active'), 200);
    const imageDataUrl = takeSnapshot();
    await sendEvent(imageDataUrl);
});

clearHistoryButton.addEventListener('click', clearAllHistory);

// Initialize
window.addEventListener('DOMContentLoaded', async () => {
    await setupCamera();
    renderHistory();
});
