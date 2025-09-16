let recognition;
let isListening = false;
const API_URL = 'https://68b98eb76aaf059a5b57f7e9.mockapi.io/commands/API-VOICE';

// Kiểm tra trạng thái mới nhất từ API
async function checkLatestStatus() {
    try {
        updateLog('🔄 Đang kiểm tra trạng thái từ API...');
        
        const response = await fetch(API_URL);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        // Tìm entry có ID lớn nhất (mới nhất)
        const latestEntry = data.reduce((latest, current) => {
            return parseInt(current.id) > parseInt(latest.id) ? current : latest;
        });
        
        const status = latestEntry.status;
        const timestamp = new Date(latestEntry.createAt * 1000);
        
        updateLightDisplay(status, latestEntry.id, timestamp);
        updateLog(`✅ Trạng thái hiện tại: ${status} (ID: ${latestEntry.id}, Mode: ${latestEntry.mode})`);
        
    } catch (error) {
        updateLog(`❌ Lỗi kiểm tra trạng thái: ${error.message}`);
        updateLightDisplay('ERROR');
    }
}

// Cập nhật hiển thị đèn theo trạng thái
function updateLightDisplay(status, id = null, timestamp = null) {
    const lightBulb = document.getElementById('lightBulb');
    const lightStatus = document.getElementById('lightStatus');
    const lastUpdated = document.getElementById('lastUpdated');
    
    // Reset classes
    lightBulb.className = 'light-bulb';
    lightStatus.className = 'light-status';
    
    if (status === 'ON') {
        lightBulb.classList.add('on');
        lightStatus.classList.add('on');
        lightStatus.textContent = '🔆 ĐANG BẬT';
    } else if (status === 'OFF') {
        lightBulb.classList.add('off');
        lightStatus.classList.add('off');
        lightStatus.textContent = '🔅 ĐANG TẮT';
    } else {
        lightBulb.classList.add('off');
        lightStatus.classList.add('off');
        lightStatus.textContent = '❌ LỖI';
    }
    
    if (id && timestamp) {
        lastUpdated.textContent = `Cập nhật: ${timestamp.toLocaleString('vi-VN')}`;
    } else {
        lastUpdated.textContent = 'Không thể tải thông tin thời gian';
    }
}

// Khởi tạo Speech Recognition
function initSpeechRecognition() {
    if ('webkitSpeechRecognition' in window) {
        recognition = new webkitSpeechRecognition();
    } else if ('SpeechRecognition' in window) {
        recognition = new SpeechRecognition();
    } else {
        alert('Trình duyệt không hỗ trợ Speech Recognition');
        return false;
    }

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'vi-VN';

    recognition.onstart = function() {
        updateStatus('Đang nghe... Hãy nói "ON"/"BẬT" hoặc "OFF"/"TẮT"');
        updateLog('🎤 Bắt đầu nghe giọng nói');
    };

    recognition.onresult = function(event) {
        const command = event.results[0][0].transcript.toLowerCase().trim();
        updateLog(`👂 Đã nghe: "${command}"`);
        
        if (command.includes('on') || command.includes('bật')) {
            sendCommand('ON');
        } else if (command.includes('off') || command.includes('tắt')) {
            sendCommand('OFF');
        } else {
            updateLog('❓ Lệnh không được nhận diện. Vui lòng nói "ON"/"BẬT" hoặc "OFF"/"TẮT"');
        }
        
        stopListening();
    };

    recognition.onerror = function(event) {
        updateLog(`❌ Lỗi nhận diện: ${event.error}`);
        stopListening();
    };

    recognition.onend = function() {
        stopListening();
    };

    return true;
}

// Gửi lệnh lên API với cấu trúc mới
async function sendCommand(status) {
    try {
        const data = {
            status: status,
            createAt: Math.floor(Date.now() / 1000),
            mode: "VOICE"
        };

        updateLog(`📡 Đang gửi lệnh: ${status} (Mode: VOICE)`);
        
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            const result = await response.json();
            updateLog(`✅ Gửi thành công! ID: ${result.id}, Status: ${result.status}, Mode: ${result.mode}`);
            updateStatus(`Lệnh "${status}" đã được gửi thành công!`);
            
            // Cập nhật hiển thị đèn ngay lập tức
            const timestamp = new Date(result.createAt * 1000);
            updateLightDisplay(result.status, result.id, timestamp);
            
        } else {
            throw new Error(`HTTP ${response.status}`);
        }
    } catch (error) {
        updateLog(`❌ Lỗi gửi API: ${error.message}`);
        updateStatus('Lỗi khi gửi lệnh!');
    }
}

// Bật/tắt listening
function toggleListening() {
    if (!recognition && !initSpeechRecognition()) {
        return;
    }

    if (isListening) {
        stopListening();
    } else {
        startListening();
    }
}

function startListening() {
    isListening = true;
    recognition.start();
    document.getElementById('micButton').classList.add('listening');
}

function stopListening() {
    isListening = false;
    if (recognition) {
        recognition.stop();
    }
    document.getElementById('micButton').classList.remove('listening');
    updateStatus('Nhấn để bắt đầu nghe');
}

// Cập nhật UI
function updateStatus(message) {
    const statusElement = document.getElementById('status');
    if (statusElement) {
        statusElement.textContent = message;
        
        // Add pulse animation for status updates
        statusElement.style.transform = 'scale(1.02)';
        setTimeout(() => {
            statusElement.style.transform = 'scale(1)';
        }, 150);
    }
}

function updateLog(message) {
    // Determine icon based on message content
    let icon = '📝'; // Default icon
    
    if (message.includes('đang kiểm tra') || message.includes('đang gửi')) {
        icon = '🔄';
    } else if (message.includes('thành công') || message.includes('✅')) {
        icon = '✅';
    } else if (message.includes('lỗi') || message.includes('❌')) {
        icon = '❌';
    } else if (message.includes('nghe') || message.includes('🎤')) {
        icon = '🎤';
    } else if (message.includes('đã nghe') || message.includes('👂')) {
        icon = '👂';
    } else if (message.includes('gửi lệnh') || message.includes('📡')) {
        icon = '📡';
    } else if (message.includes('sẵn sàng') || message.includes('🚀')) {
        icon = '🚀';
    }
    
    updateLogWithIcon(message, icon);
}

// Theme Management
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = savedTheme === 'auto' ? (prefersDark ? 'dark' : 'light') : savedTheme;
    
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeIcon(theme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
    
    // Smooth transition effect
    document.body.style.transition = 'background 0.3s ease, color 0.3s ease';
    setTimeout(() => {
        document.body.style.transition = '';
    }, 300);
}

function updateThemeIcon(theme) {
    const themeIcon = document.querySelector('.theme-icon');
    if (themeIcon) {
        themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
}

// Clear log functionality
function clearLog() {
    const log = document.getElementById('log');
    log.innerHTML = '<div class="log-item welcome"><div class="log-icon">🚀</div><div class="log-content">Nhật ký đã được xóa. Sẵn sàng để nghe lệnh...</div></div>';
    updateLog('🧹 Đã xóa nhật ký hoạt động');
}

// Enhanced updateLog with better formatting
function updateLogWithIcon(message, icon = '📝') {
    const log = document.getElementById('log');
    const logItem = document.createElement('div');
    logItem.className = 'log-item';
    
    const timestamp = new Date().toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    
    logItem.innerHTML = `
        <div class="log-icon">${icon}</div>
        <div class="log-content">[${timestamp}] ${message}</div>
    `;
    
    log.appendChild(logItem);
    log.scrollTop = log.scrollHeight;
    
    // Add entrance animation
    logItem.style.opacity = '0';
    logItem.style.transform = 'translateX(-20px)';
    
    requestAnimationFrame(() => {
        logItem.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        logItem.style.opacity = '1';
        logItem.style.transform = 'translateX(0)';
    });
    
    // Giới hạn số lượng log items
    if (log.children.length > 20) {
        log.removeChild(log.firstChild);
    }
}

// Khởi tạo khi tải trang
window.onload = function() {
    initTheme();
    initSpeechRecognition();
    checkLatestStatus(); // Kiểm tra trạng thái ngay khi load trang
    
    // Tự động kiểm tra trạng thái mỗi 5 giây
    setInterval(checkLatestStatus, 5000);
    
    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addListener((e) => {
        if (localStorage.getItem('theme') === 'auto') {
            const theme = e.matches ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', theme);
            updateThemeIcon(theme);
        }
    });
};
