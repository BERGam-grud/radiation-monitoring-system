// ========== КОНФІГУРАЦІЯ ==========
const API_URL = 'http://192.168.4.223:5002';
let authToken = localStorage.getItem('authToken');
let currentUser = null;
let currentLang = 'uk';
let selectedDevice = null;
let deviceChart = null;
let hourChart = null;

// ========== ТИПИ ПРИЛАДІВ ==========
const deviceTypes = {
    gamma: { name: 'Гама-детектор', icon: '📡', unit: 'мкЗв/год' },
    spectro: { name: 'Спектрометричний детектор', icon: '🔬', unit: 'кБк/м³' },
    vfu: { name: 'ВФУ', icon: '💨', unit: 'м/с' },
    weather: { name: 'Метеостанція Gill MAXIMET 500', icon: '🌡️', unit: '°C' }
};

const locations = ['Київська', 'Житомирська', 'Чернігівська', 'Харківська', 'Львівська', 'Одеська', 'Дніпропетровська', 'Запорізька', 'Полтавська', 'Вінницька'];

// ========== ДОПОМІЖНІ ФУНКЦІЇ ==========
function generateRandomValue(type) {
    switch(type) {
        case 'gamma': return (Math.random() * 0.8).toFixed(3);
        case 'spectro': return (Math.random() * 0.5).toFixed(3);
        case 'vfu': return (Math.random() * 10).toFixed(1);
        case 'weather': return (Math.random() * 30 - 5).toFixed(1);
        default: return '0.00';
    }
}

function generateHistory(baseValue, count = 100) {
    const history = [];
    for (let i = 0; i < count; i++) {
        const variation = (Math.random() - 0.5) * 0.2 * parseFloat(baseValue);
        history.push({ 
            timestamp: Date.now() - (count - i) * 3600000,
            value: Math.max(0, parseFloat(baseValue) + variation)
        });
    }
    return history;
}

function generateHourHistory(baseValue) {
    const history = [];
    for (let i = 0; i < 60; i++) {
        const variation = (Math.random() - 0.5) * 0.1 * parseFloat(baseValue);
        history.push({
            minute: i,
            value: Math.max(0, parseFloat(baseValue) + variation)
        });
    }
    return history;
}

function generateRandomLogs(deviceName, count = 20) {
    const logMessages = {
        info: ['Дані успішно передано', 'Пристрій запущено', 'Калібрування завершено', 'Синхронізація часу', 'З\'єднання встановлено'],
        warning: ['Рівень сигналу низький', 'Температура вище норми', 'Інтервал опитування збільшено', 'Втрата пакетів', 'Затримка відповіді'],
        error: ['Втрата зв\'язку', 'Помилка калібрування', 'Невірні дані', 'Таймаут очікування', 'Відмова датчика']
    };
    const logs = [];
    for (let i = 0; i < count; i++) {
        const rand = Math.random();
        let type = 'info';
        if (rand < 0.1) type = 'error';
        else if (rand < 0.2) type = 'warning';
        const msgList = logMessages[type];
        logs.push({
            timestamp: Date.now() - (count - i) * 60000,
            type: type,
            message: `${msgList[Math.floor(Math.random() * msgList.length)]} (${deviceName})`
        });
    }
    return logs;
}

// ========== СТВОРЕННЯ 10 РОБОЧИХ МІСЦЬ ==========
let workplaces = [];
for (let i = 1; i <= 10; i++) {
    const location = locations[(i-1) % locations.length];
    workplaces.push({
        id: i,
        name: `РМ-${i}`,
        location: location,
        area: location,
        equipment: [
            { 
                id: `wp${i}_gamma`, type: 'gamma', name: deviceTypes.gamma.name, 
                model: `AT-${1000 + i}`, serial: `GAM-${2024000 + i}`,
                value: parseFloat(generateRandomValue('gamma')), status: 'normal',
                channel: 'Гамма-випромінювання', unit: deviceTypes.gamma.unit,
                ip: `192.168.4.${180 + i}`, port: 5000 + i,
                uptime: Math.floor(Math.random() * 30) + 1,
                lastUpdate: new Date(),
                history: [],
                hourHistory: [],
                logs: [],
                errors: Math.floor(Math.random() * 10)
            },
            { 
                id: `wp${i}_spectro`, type: 'spectro', name: deviceTypes.spectro.name,
                model: `MKS-${100 + i}`, serial: `SPE-${2024000 + i}`,
                value: parseFloat(generateRandomValue('spectro')), status: 'normal',
                channel: 'Активність', unit: deviceTypes.spectro.unit,
                ip: `192.168.4.${200 + i}`, port: 6000 + i,
                uptime: Math.floor(Math.random() * 30) + 1,
                lastUpdate: new Date(),
                history: [],
                hourHistory: [],
                logs: [],
                errors: Math.floor(Math.random() * 5)
            },
            { 
                id: `wp${i}_vfu`, type: 'vfu', name: deviceTypes.vfu.name,
                model: `VFU-${100 + i}`, serial: `VFU-${2024000 + i}`,
                value: parseFloat(generateRandomValue('vfu')), status: 'normal',
                channel: 'Швидкість вітру', unit: deviceTypes.vfu.unit,
                ip: `192.168.4.${220 + i}`, port: 7000 + i,
                uptime: Math.floor(Math.random() * 30) + 1,
                lastUpdate: new Date(),
                history: [],
                hourHistory: [],
                logs: [],
                errors: Math.floor(Math.random() * 3)
            },
            { 
                id: `wp${i}_weather`, type: 'weather', name: deviceTypes.weather.name,
                model: `Gill-${500 + i}`, serial: `WEA-${2024000 + i}`,
                value: parseFloat(generateRandomValue('weather')), status: 'normal',
                channel: 'Температура', unit: deviceTypes.weather.unit,
                ip: `192.168.4.${240 + i}`, port: 8000 + i,
                uptime: Math.floor(Math.random() * 30) + 1,
                lastUpdate: new Date(),
                history: [],
                hourHistory: [],
                logs: [],
                errors: Math.floor(Math.random() * 2)
            }
        ]
    });
    
    // Генерація історії та логів
    workplaces[i-1].equipment.forEach(dev => {
        dev.history = generateHistory(dev.value, 100);
        dev.hourHistory = generateHourHistory(dev.value);
        dev.logs = generateRandomLogs(dev.name, 20);
        const rand = Math.random();
        if (rand < 0.1) dev.status = 'danger';
        else if (rand < 0.2) dev.status = 'warning';
        else dev.status = 'normal';
    });
}

let allDevices = workplaces.flatMap(wp => wp.equipment.map(dev => ({ ...dev, workplace: wp.name, location: wp.location, area: wp.area })));

// ========== СИСТЕМА СПОВІЩЕНЬ ==========
let notifications = [];
let notificationId = 0;

function addNotification(type, title, message, source = null) {
    const id = ++notificationId;
    notifications.unshift({
        id: id, type: type, title: title, message: message,
        source: source, timestamp: Date.now(), read: false
    });
    if (notifications.length > 50) notifications.pop();
    updateNotificationBadge();
    renderNotificationsList();
    localStorage.setItem('notifications', JSON.stringify(notifications));
    if ((type === 'error' || type === 'warning') && navigator.vibrate) navigator.vibrate(200);
}

function updateNotificationBadge() {
    const unreadCount = notifications.filter(n => !n.read).length;
    const badge = document.getElementById('notificationBadge');
    if (badge) {
        if (unreadCount > 0) {
            badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }
}

function renderNotificationsList() {
    const container = document.getElementById('notificationsList');
    if (!container) return;
    if (notifications.length === 0) {
        container.innerHTML = '<div style="padding:20px;text-align:center;color:#8a8a9a;">Немає сповіщень</div>';
        return;
    }
    container.innerHTML = notifications.map(notif => `
        <div class="notification-item ${notif.type} ${!notif.read ? 'unread' : ''}" onclick="markNotificationRead(${notif.id})">
            <div><strong>${notif.type === 'error' ? '🔴' : notif.type === 'warning' ? '🟡' : '🟢'} ${notif.title}</strong></div>
            <div style="margin-top:4px;">${notif.message}</div>
            <div class="notification-time">${formatTime(notif.timestamp)}</div>
        </div>
    `).join('');
}

function formatTime(timestamp) {
    const diff = Date.now() - timestamp;
    if (diff < 60000) return 'щойно';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} хв тому`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} год тому`;
    return new Date(timestamp).toLocaleDateString();
}

function toggleNotifications() {
    const dropdown = document.getElementById('notificationsDropdown');
    if (dropdown) {
        dropdown.classList.toggle('hidden');
        if (!dropdown.classList.contains('hidden')) {
            notifications.forEach(n => n.read = true);
            updateNotificationBadge();
            renderNotificationsList();
            localStorage.setItem('notifications', JSON.stringify(notifications));
        }
    }
}

function clearAllNotifications() {
    notifications = [];
    updateNotificationBadge();
    renderNotificationsList();
    localStorage.setItem('notifications', JSON.stringify(notifications));
}

function loadNotifications() {
    const saved = localStorage.getItem('notifications');
    if (saved) {
        notifications = JSON.parse(saved);
        notificationId = notifications.length > 0 ? Math.max(...notifications.map(n => n.id)) : 0;
        updateNotificationBadge();
    }
}

function generateDeviceNotifications() {
    for (const device of allDevices) {
        if (device.status === 'danger') {
            addNotification('error', '⚠️ АВАРІЯ!', `${device.workplace}: ${device.name} - перевищено рівень (${device.value} ${device.unit})`, device.id);
        } else if (device.status === 'warning') {
            addNotification('warning', '⚠️ Попередження', `${device.workplace}: ${device.name} - рівень наближається до критичного (${device.value} ${device.unit})`, device.id);
        }
    }
    setInterval(() => {
        if (Math.random() < 0.05) {
            const randomDevice = allDevices[Math.floor(Math.random() * allDevices.length)];
            const events = [
                { type: 'info', title: '📡 Дані оновлено', msg: `${randomDevice.workplace}: ${randomDevice.name} - успішне оновлення` },
                { type: 'warning', title: '⚠️ Затримка сигналу', msg: `${randomDevice.workplace}: ${randomDevice.name} - затримка передачі` },
                { type: 'error', title: '🔴 Втрата зв\'язку', msg: `${randomDevice.workplace}: ${randomDevice.name} - тимчасова втрата зв\'язку` },
                { type: 'info', title: '🔄 Перепідключення', msg: `${randomDevice.workplace}: ${randomDevice.name} - відновлено з\'єднання` }
            ];
            const event = events[Math.floor(Math.random() * events.length)];
            addNotification(event.type, event.title, event.msg, randomDevice.id);
        }
    }, 30000);
}

function markNotificationRead(id) {
    const notif = notifications.find(n => n.id === id);
    if (notif) { notif.read = true; updateNotificationBadge(); renderNotificationsList(); localStorage.setItem('notifications', JSON.stringify(notifications)); }
}

// ========== МЕНЮ АДМІНІСТРУВАННЯ ==========
let isAdminMenuOpen = localStorage.getItem('adminMenuOpen') === 'true';

function toggleAdminMenu() {
    isAdminMenuOpen = !isAdminMenuOpen;
    localStorage.setItem('adminMenuOpen', isAdminMenuOpen);
    const submenu = document.getElementById('adminSubmenu');
    const parent = document.querySelector('.admin-parent');
    if (submenu && parent) {
        if (isAdminMenuOpen) {
            submenu.classList.add('show');
            parent.classList.add('open');
        } else {
            submenu.classList.remove('show');
            parent.classList.remove('open');
        }
    }
}

function initAdminMenu() {
    const submenu = document.getElementById('adminSubmenu');
    const parent = document.querySelector('.admin-parent');
    if (submenu && parent) {
        if (isAdminMenuOpen) {
            submenu.classList.add('show');
            parent.classList.add('open');
        } else {
            submenu.classList.remove('show');
            parent.classList.remove('open');
        }
    }
}

// ========== УПРАВЛІННЯ КОРИСТУВАЧАМИ ==========
function renderUsersListTable() {
    const tbody = document.getElementById('usersListTableBody');
    if (!tbody) return;
    
    fetch(`${API_URL}/api/users`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            tbody.innerHTML = data.users.map(user => `
                <tr>
                    <td>${user.id}</td>
                    <td>${user.email}</td>
                    <td><input type="text" id="name_${user.id}" value="${user.full_name}" class="edit-input" style="background:#1e1e2e;border:1px solid #3a3a4a;border-radius:4px;padding:4px;color:#e0e0e0;"></td>
                    <td>
                        <select id="role_${user.id}" class="edit-select" style="background:#1e1e2e;border:1px solid #3a3a4a;border-radius:4px;padding:4px;color:#e0e0e0;">
                            <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Адмін</option>
                            <option value="user" ${user.role === 'user' ? 'selected' : ''}>Користувач</option>
                        </select>
                    </td>
                    <td>${user.created_at}</td>
                    <td>
                        <button class="action-btn" onclick="saveUserEdit(${user.id})">💾</button>
                        <button class="action-btn danger" onclick="deleteUser(${user.id})">🗑</button>
                    </td>
                </tr>
            `).join('');
        }
    });
}

function saveUserEdit(userId) {
    const newName = document.getElementById(`name_${userId}`).value;
    const newRole = document.getElementById(`role_${userId}`).value;
    
    fetch(`${API_URL}/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify({ full_name: newName, role: newRole })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            alert('Користувача оновлено');
            renderUsersListTable();
        } else {
            alert(data.error || 'Помилка');
        }
    });
}

function deleteUser(userId) {
    if (confirm('Видалити користувача?')) {
        fetch(`${API_URL}/api/users/${userId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                alert('Користувача видалено');
                renderUsersListTable();
            } else {
                alert(data.error || 'Помилка');
            }
        });
    }
}

function showAddUserModal() {
    const modalHtml = `
        <div id="addUserModal" class="modal">
            <div class="modal-content">
                <h3>➕ Додати користувача</h3>
                <div class="form-group"><label>Email</label><input type="email" id="newUserEmail"></div>
                <div class="form-group"><label>Пароль</label><input type="password" id="newUserPassword"></div>
                <div class="form-group"><label>ПІБ</label><input type="text" id="newUserName"></div>
                <div class="form-group"><label>Роль</label><select id="newUserRole"><option value="user">Користувач</option><option value="admin">Адміністратор</option></select></div>
                <div class="modal-buttons"><button class="btn-primary" onclick="addUser()">Додати</button><button class="action-btn" onclick="closeModal()">Скасувати</button></div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.getElementById('addUserModal').style.display = 'flex';
}

function addUser() {
    const email = document.getElementById('newUserEmail').value;
    const password = document.getElementById('newUserPassword').value;
    const full_name = document.getElementById('newUserName').value;
    const role = document.getElementById('newUserRole').value;
    
    fetch(`${API_URL}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify({ email, password, full_name, role })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            alert('Користувача додано');
            closeModal();
            renderUsersListTable();
        } else {
            alert(data.error || 'Помилка');
        }
    });
}

// ========== ПРАВА ДОСТУПУ ==========
function renderPermissionsTable() {
    const tbody = document.getElementById('permissionsTableBody');
    if (!tbody) return;
    
    const permissions = [
        { role: 'admin', rm_access: '✅ Всі', edit_sensors: '✅ Так', settings: '✅ Так', admin_panel: '✅ Так', export: '✅ Так' },
        { role: 'user', rm_access: '✅ Призначені', edit_sensors: '❌ Ні', settings: '❌ Ні', admin_panel: '❌ Ні', export: '✅ Так' }
    ];
    
    tbody.innerHTML = permissions.map(perm => `
        <tr>
            <td><span class="role-badge ${perm.role}">${perm.role.toUpperCase()}</span></td>
            <td>${perm.rm_access}</td>
            <td>${perm.edit_sensors}</td>
            <td>${perm.settings}</td>
            <td>${perm.admin_panel}</td>
            <td>${perm.export}</td>
        </tr>
    `).join('');
}

// ========== ФІЛЬТРАЦІЯ ПРИЛАДІВ ==========
function renderFilteredDevices() {
    const typeFilter = document.getElementById('devFilterType')?.value || 'all';
    const workplaceFilter = document.getElementById('devFilterWorkplace')?.value || 'all';
    const areaFilter = document.getElementById('devFilterArea')?.value || 'all';
    const statusFilter = document.getElementById('devFilterStatus')?.value || 'all';
    
    let filtered = [...allDevices];
    if (typeFilter !== 'all') filtered = filtered.filter(d => d.type === typeFilter);
    if (workplaceFilter !== 'all') filtered = filtered.filter(d => d.workplace === workplaceFilter);
    if (areaFilter !== 'all') filtered = filtered.filter(d => d.area === areaFilter);
    if (statusFilter !== 'all') filtered = filtered.filter(d => d.status === statusFilter);
    
    const tbody = document.getElementById('allDevicesTableBody');
    if (tbody) {
        tbody.innerHTML = filtered.map(dev => `
            <tr onclick="showDeviceDetail('${dev.id}')" style="cursor:pointer">
                <td>${deviceTypes[dev.type].icon} ${deviceTypes[dev.type].name}</td>
                <td>${dev.name}</td>
                <td>${dev.model}</td>
                <td>${dev.workplace}</td>
                <td>${dev.location}</td>
                <td class="${dev.status}">${dev.value} ${dev.unit}</td>
                <td><span class="status-dot ${dev.status}"></span> ${dev.status === 'normal' ? 'Норма' : (dev.status === 'warning' ? 'Попередження' : 'Тривога')}</td>
                <td><button class="action-btn" onclick="event.stopPropagation(); showDeviceDetail('${dev.id}')">📊</button></td>
            </tr>
        `).join('');
    }
}

// ========== НАЛАШТУВАННЯ ТРИВОГ ==========
function saveAlarmSettings() {
    localStorage.setItem('warning', document.getElementById('warningThreshold').value);
    localStorage.setItem('alarm', document.getElementById('alarmThreshold').value);
    alert('Налаштування збережено!');
}

function loadAlarmSettings() {
    const warning = localStorage.getItem('warning');
    const alarm = localStorage.getItem('alarm');
    if (warning) document.getElementById('warningThreshold').value = warning;
    if (alarm) document.getElementById('alarmThreshold').value = alarm;
}

// ========== ГРАФІК ЗА ОСТАННЮ ГОДИНУ ==========
function showHourGraph(deviceId) {
    const device = allDevices.find(d => d.id === deviceId);
    if (!device) return;
    
    const ctx = document.getElementById('hourHistoryChart');
    if (ctx) {
        if (hourChart) hourChart.destroy();
        hourChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: device.hourHistory.map(h => `${h.minute} хв`),
                datasets: [{
                    label: `${device.channel} за останню годину (${device.unit})`,
                    data: device.hourHistory.map(h => h.value),
                    borderColor: '#4a9eff',
                    backgroundColor: 'rgba(74,158,255,0.1)',
                    fill: true,
                    tension: 0.2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: { legend: { labels: { color: '#e0e0e0' } } }
            }
        });
    }
}

// ========== ЕКСПОРТ ЗВІТУ В PDF ==========
function exportToPDF(deviceId) {
    const device = allDevices.find(d => d.id === deviceId);
    if (!device) return;
    
    const printContent = `
        <html>
        <head>
            <title>Звіт: ${device.name}</title>
            <style>
                body { font-family: monospace; padding: 20px; }
                h1 { color: #4a9eff; }
                table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background: #f0f0f0; }
            </style>
        </head>
        <body>
            <h1>📊 Звіт: ${device.name}</h1>
            <p><strong>Модель:</strong> ${device.model}</p>
            <p><strong>Серійний номер:</strong> ${device.serial}</p>
            <p><strong>Робоче місце:</strong> ${device.workplace}</p>
            <p><strong>IP адреса:</strong> ${device.ip}:${device.port}</p>
            <p><strong>Поточне значення:</strong> ${device.value} ${device.unit}</p>
            <p><strong>Статус:</strong> ${device.status === 'normal' ? 'Нормальний' : (device.status === 'warning' ? 'Попередження' : 'Тривога')}</p>
            <p><strong>Час роботи:</strong> ${device.uptime} днів</p>
            <p><strong>Дата створення звіту:</strong> ${new Date().toLocaleString()}</p>
            
            <h2>📈 Історія вимірювань (останні 20 точок)</h2>
            <table>
                <tr><th>Дата/Час</th><th>Значення (${device.unit})</th></tr>
                ${device.history.slice(-20).reverse().map(h => `<tr><td>${new Date(h.timestamp).toLocaleString()}</td><td>${h.value.toFixed(3)}</td></tr>`).join('')}
            </table>
            
            <h2>📋 Журнал подій (останні 15)</h2>
            <table>
                <tr><th>Дата/Час</th><th>Тип</th><th>Повідомлення</th></tr>
                ${device.logs.slice(-15).reverse().map(log => `<tr><td>${new Date(log.timestamp).toLocaleString()}</td><td>${log.type.toUpperCase()}</td><td>${log.message}</td></tr>`).join('')}
            </table>
            
            <p style="margin-top: 30px; font-size: 11px; color: #888;">Звіт згенеровано системою моніторингу радіації</p>
        </body>
        </html>
    `;
    
    const win = window.open();
    win.document.write(printContent);
    win.document.close();
    win.print();
}

// ========== ВІДОБРАЖЕННЯ ==========
function renderLogin() {
    document.getElementById('app').innerHTML = `
        <div class="login-container">
            <div class="login-card">
                <h2>🔐 Система моніторингу радіації</h2>
                <input type="email" id="loginEmail" placeholder="EMAIL">
                <input type="password" id="loginPassword" placeholder="PASSWORD">
                <button onclick="handleLogin()">Увійти</button>
                <div id="loginError" class="error-msg"></div>
            </div>
        </div>
    `;
}

function renderMainApp() {
    document.getElementById('app').innerHTML = `
        <div class="app-container">
            <div class="sidebar" id="sidebar">
                <div class="sidebar-header">
                    <h2>🔬 RM</h2>
                    <p>RADIATION MONITOR</p>
                    <button class="collapse-btn" onclick="toggleSidebar()">◀</button>
                </div>
                <div class="nav-menu">
                    <div class="nav-item active" data-window="monitoring" onclick="openWindow('monitoring')">
                        <div class="nav-icon">📊</div>
                        <div class="nav-text">МОНІТОРИНГ</div>
                    </div>
                    <div class="nav-item" data-window="devices" onclick="openWindow('devices')">
                        <div class="nav-icon">📡</div>
                        <div class="nav-text">ДАТЧИКИ</div>
                    </div>
                    <div class="nav-item admin-parent" onclick="toggleAdminMenu()">
                        <div class="nav-icon">⚙️</div>
                        <div class="nav-text">АДМІНІСТРУВАННЯ</div>
                        <div class="nav-arrow">▼</div>
                    </div>
                    <div class="admin-submenu" id="adminSubmenu">
                        <div class="nav-item sub-item" data-window="users" onclick="openWindow('users')">
                            <div class="nav-icon">👥</div>
                            <div class="nav-text">КОРИСТУВАЧІ</div>
                        </div>
                        <div class="nav-item sub-item" data-window="permissions" onclick="openWindow('permissions')">
                            <div class="nav-icon">🔐</div>
                            <div class="nav-text">ПРАВА ДОСТУПУ</div>
                        </div>
                        <div class="nav-item sub-item" data-window="alarms" onclick="openWindow('alarms')">
                            <div class="nav-icon">⚠️</div>
                            <div class="nav-text">НАЛАШТУВАННЯ ТРИВОГ</div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="main-content">
                <div class="top-bar">
                    <div class="page-title"><span id="currentWindowTitle">МОНІТОРИНГ</span></div>
                    <div style="display:flex; align-items:center;">
                        <div class="notification-bell">
                            <button class="bell-btn" onclick="toggleNotifications()">
                                <span class="bell-icon">🔔</span>
                                <span id="notificationBadge" class="notification-badge" style="display:none;">0</span>
                            </button>
                            <div id="notificationsDropdown" class="notifications-dropdown hidden">
                                <div class="notifications-header"><span>📢 Сповіщення</span><button onclick="clearAllNotifications()" class="clear-notif-btn">Очистити всі</button></div>
                                <div id="notificationsList" class="notifications-list"></div>
                            </div>
                        </div>
                        <div class="language-selector">
                            <div class="lang-dropdown" id="langDropdown">
                                <button class="lang-dropdown-btn" onclick="toggleLangDropdown()">
                                    <span id="currentLangFlag">🇺🇦</span>
                                    <span id="currentLangName">Українська</span>
                                    <span class="dropdown-arrow">▼</span>
                                </button>
                                <div class="lang-dropdown-content" id="langDropdownContent">
                                    <div class="lang-option" onclick="selectLanguage('uk', '🇺🇦', 'Українська')"><span>🇺🇦</span> Українська</div>
                                    <div class="lang-option" onclick="selectLanguage('en', '🇬🇧', 'English')"><span>🇬🇧</span> English</div>
                                    <div class="lang-option" onclick="selectLanguage('es', '🇪🇸', 'Español')"><span>🇪🇸</span> Español</div>
                                </div>
                            </div>
                        </div>
                        <div class="user-menu">
                            <button class="user-menu-btn" onclick="toggleUserMenu()">
                                <div class="user-avatar">U</div>
                                <span>Користувач</span>
                                <span>▼</span>
                            </button>
                            <div class="user-dropdown hidden" id="userDropdown">
                                <div class="dropdown-header">user@example.com</div>
                                <div class="dropdown-divider"></div>
                                <div class="dropdown-item danger" onclick="logout()"><span>🚪</span> <span id="logoutText">ВИХІД</span></div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="windows-container" id="windowsContainer">
                    <div id="window-monitoring" class="window active">
                        <div class="window-header"><div class="window-title">📊 МОНІТОРИНГ РАДІАЦІЙНОЇ ОБСТАНОВКИ</div><button class="close-btn" onclick="closeWindow('monitoring')">✕</button></div>
                        <div class="filter-bar">
                            <select id="filterDeviceType" class="filter-select" onchange="renderWorkplaces()"><option value="all">Всі прилади</option><option value="gamma">Гама-детектори</option><option value="spectro">Спектрометри</option><option value="vfu">ВФУ</option><option value="weather">Метеостанції</option></select>
                            <select id="filterWorkplace" class="filter-select" onchange="renderWorkplaces()"><option value="all">Всі РМ</option>${workplaces.map(w => `<option value="${w.name}">${w.name}</option>`).join('')}</select>
                            <select id="filterArea" class="filter-select" onchange="renderWorkplaces()"><option value="all">Всі області</option>${[...new Set(workplaces.map(w => w.area))].map(a => `<option value="${a}">${a}</option>`).join('')}</select>
                            <select id="filterStatus" class="filter-select" onchange="renderWorkplaces()"><option value="all">Всі стани</option><option value="normal">Норма</option><option value="warning">Попередження</option><option value="danger">Тривога</option></select>
                        </div>
                        <div class="workplaces-grid" id="workplacesGrid"></div>
                        <div id="detailPanel" class="detail-panel"></div>
                    </div>
                    <div id="window-devices" class="window">
                        <div class="window-header"><div class="window-title">📡 СПИСОК ВСІХ ПРИЛАДІВ</div><button class="close-btn" onclick="closeWindow('devices')">✕</button></div>
                        <div class="filter-bar">
                            <select id="devFilterType" class="filter-select" onchange="renderFilteredDevices()"><option value="all">Всі типи</option><option value="gamma">Гама-детектори</option><option value="spectro">Спектрометри</option><option value="vfu">ВФУ</option><option value="weather">Метеостанції</option></select>
                            <select id="devFilterWorkplace" class="filter-select" onchange="renderFilteredDevices()"><option value="all">Всі РМ</option>${workplaces.map(w => `<option value="${w.name}">${w.name}</option>`).join('')}</select>
                            <select id="devFilterArea" class="filter-select" onchange="renderFilteredDevices()"><option value="all">Всі області</option>${[...new Set(workplaces.map(w => w.area))].map(a => `<option value="${a}">${a}</option>`).join('')}</select>
                            <select id="devFilterStatus" class="filter-select" onchange="renderFilteredDevices()"><option value="all">Всі стани</option><option value="normal">Норма</option><option value="warning">Попередження</option><option value="danger">Тривога</option></select>
                        </div>
                        <div style="overflow-x:auto;"><table class="devices-table"><thead><tr><th>ТИП</th><th>НАЗВА</th><th>МОДЕЛЬ</th><th>РМ</th><th>ЛОКАЦІЯ</th><th>ЗНАЧЕННЯ</th><th>СТАН</th><th>ДІЇ</th></tr></thead><tbody id="allDevicesTableBody"></tbody></table></div>
                    </div>
                    <div id="window-users" class="window">
                        <div class="window-header"><div class="window-title">👥 УПРАВЛІННЯ КОРИСТУВАЧАМИ</div><button class="close-btn" onclick="closeWindow('users')">✕</button></div>
                        <div class="window-content"><div class="filter-bar"><button class="btn-primary" onclick="showAddUserModal()">➕ ДОДАТИ КОРИСТУВАЧА</button></div><table class="permissions-table"><thead><tr><th>ID</th><th>EMAIL</th><th>ПІБ</th><th>РОЛЬ</th><th>СТВОРЕНО</th><th>ДІЇ</th></tr></thead><tbody id="usersListTableBody"></tbody></table></div>
                    </div>
                    <div id="window-permissions" class="window">
                        <div class="window-header"><div class="window-title">🔐 ПРАВА ДОСТУПУ</div><button class="close-btn" onclick="closeWindow('permissions')">✕</button></div>
                        <div class="window-content"><table class="permissions-table"><thead><tr><th>РОЛЬ</th><th>ДОСТУП ДО РМ</th><th>РЕДАГУВАННЯ</th><th>НАЛАШТУВАННЯ</th><th>АДМІН ПАНЕЛЬ</th><th>ЕКСПОРТ</th></tr></thead><tbody id="permissionsTableBody"></tbody><table></div>
                    </div>
                    <div id="window-alarms" class="window">
                        <div class="window-header"><div class="window-title">⚠️ НАЛАШТУВАННЯ ТРИВОГ</div><button class="close-btn" onclick="closeWindow('alarms')">✕</button></div>
                        <div class="window-content"><div class="form-group"><label>ПОПЕРЕДЖЕННЯ (ЖОВТИЙ) - мкЗв/год</label><input type="number" id="warningThreshold" step="0.01" value="0.3"></div><div class="form-group"><label>НЕБЕЗПЕКА (ЧЕРВОНИЙ) - мкЗв/год</label><input type="number" id="alarmThreshold" step="0.01" value="0.5"></div><button class="btn-primary" onclick="saveAlarmSettings()">💾 ЗБЕРЕГТИ</button></div>
                    </div>
                </div>
            </div>
        </div>
    `;
    renderWorkplaces();
    renderFilteredDevices();
    renderUsersListTable();
    renderPermissionsTable();
    initAdminMenu();
    loadNotifications();
    generateDeviceNotifications();
    loadAlarmConfigs();
    loadAlarmSettings();
}

function renderWorkplaces() {
    const container = document.getElementById('workplacesGrid');
    if (!container) return;
    const typeFilter = document.getElementById('filterDeviceType')?.value || 'all';
    const workplaceFilter = document.getElementById('filterWorkplace')?.value || 'all';
    const areaFilter = document.getElementById('filterArea')?.value || 'all';
    const statusFilter = document.getElementById('filterStatus')?.value || 'all';
    
    let filteredWorkplaces = workplaces;
    if (workplaceFilter !== 'all') filteredWorkplaces = filteredWorkplaces.filter(w => w.name === workplaceFilter);
    if (areaFilter !== 'all') filteredWorkplaces = filteredWorkplaces.filter(w => w.area === areaFilter);
    
    container.innerHTML = filteredWorkplaces.map(wp => {
        let equipmentList = wp.equipment;
        if (typeFilter !== 'all') equipmentList = equipmentList.filter(e => e.type === typeFilter);
        if (statusFilter !== 'all') equipmentList = equipmentList.filter(e => e.status === statusFilter);
        
        return '<div class="workplace-card"><div class="workplace-header" onclick="toggleWorkplace(\'wp-' + wp.id + '\')"><div><div class="workplace-name">🏭 ' + wp.name + '</div><div class="workplace-location">📍 ' + wp.location + ' (' + wp.area + ')</div></div><span>📡 ' + equipmentList.length + ' приладів ▼</span></div><div class="workplace-equipment" id="wp-' + wp.id + '">' + equipmentList.map(dev => '<div class="equipment-item" onclick="showDeviceDetail(\'' + dev.id + '\')"><div><div class="equipment-name">' + deviceTypes[dev.type].icon + ' ' + dev.name + '</div><div style="font-size:11px;color:#8a8a9a;">' + dev.model + '</div></div><div class="equipment-status"><span class="status-dot ' + dev.status + '"></span><span>' + dev.value + ' ' + dev.unit + '</span></div></div>').join('') + '</div></div>';
    }).join('');
}

function showDeviceDetail(deviceId) {
    const device = allDevices.find(d => d.id === deviceId);
    if (!device) return;
    const panel = document.getElementById('detailPanel');
    panel.style.display = 'block';
    const statusText = device.status === 'normal' ? '✅ Нормальний' : (device.status === 'warning' ? '⚠️ Попередження' : '🔴 Тривога');
    panel.innerHTML = '<div class="detail-header"><div class="detail-title">📊 ' + deviceTypes[device.type].icon + ' ' + device.name + ' (' + device.model + ')</div><div class="detail-buttons"><button onclick="exportDeviceLogs(\'' + device.id + '\')">📋 Експорт логів</button><button onclick="exportDeviceData(\'' + device.id + '\')">📊 Експорт даних</button><button onclick="exportToPDF(\'' + device.id + '\')">📄 Експорт PDF</button><button onclick="simulateError(\'' + device.id + '\')">⚠️ Симулювати помилку</button><button onclick="document.getElementById(\'detailPanel\').style.display=\'none\'">✕ Закрити</button></div></div><div class="detail-grid"><div class="detail-card"><div class="detail-label">Серійний номер</div><div class="detail-value">' + device.serial + '</div></div><div class="detail-card"><div class="detail-label">Модель</div><div class="detail-value">' + device.model + '</div></div><div class="detail-card"><div class="detail-label">IP адреса</div><div class="detail-value">' + device.ip + ':' + device.port + '</div></div><div class="detail-card"><div class="detail-label">Канал</div><div class="detail-value">' + device.channel + '</div></div><div class="detail-card"><div class="detail-label">Значення</div><div class="detail-value ' + device.status + '">' + device.value + ' ' + device.unit + '</div></div><div class="detail-card"><div class="detail-label">Статус</div><div class="detail-value ' + device.status + '">' + statusText + '</div></div><div class="detail-card"><div class="detail-label">Час роботи</div><div class="detail-value">' + device.uptime + ' днів</div></div><div class="detail-card"><div class="detail-label">Помилок</div><div class="detail-value">' + device.errors + '</div></div><div class="detail-card"><div class="detail-label">РМ</div><div class="detail-value">' + device.workplace + '</div></div></div><div class="chart-container"><div class="chart-title">📈 Графік роботи (останні 100 вимірювань)</div><canvas id="deviceHistoryChart"></canvas></div><div class="chart-container"><div class="chart-title">⏱️ Графік за останню годину (погодинно)</div><canvas id="hourHistoryChart"></canvas><button class="btn-primary" style="margin-top:10px;" onclick="showHourGraph(\'' + device.id + '\')">🔄 Оновити графік за годину</button></div><div class="logs-panel"><div class="logs-title">📋 Журнал подій</div><div id="deviceLogs">' + device.logs.slice().reverse().slice(0,15).map(log => '<div class="log-entry ' + log.type + '">[' + new Date(log.timestamp).toLocaleString() + '] ' + log.type.toUpperCase() + ': ' + log.message + '</div>').join('') + '</div></div>';
    
    const ctx = document.getElementById('deviceHistoryChart');
    if (ctx) {
        if (deviceChart) deviceChart.destroy();
        deviceChart = new Chart(ctx, {
            type: 'line',
            data: { labels: device.history.map(h => new Date(h.timestamp).toLocaleTimeString()), datasets: [{ label: device.channel + ' (' + device.unit + ')', data: device.history.map(h => h.value), borderColor: device.status === 'normal' ? '#4ade80' : (device.status === 'warning' ? '#fbbf24' : '#f87171'), fill: true, tension: 0.2 }] },
            options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { labels: { color: '#e0e0e0' } } } }
        });
    }
    
    const hourCtx = document.getElementById('hourHistoryChart');
    if (hourCtx) {
        if (hourChart) hourChart.destroy();
        hourChart = new Chart(hourCtx, {
            type: 'line',
            data: { labels: device.hourHistory.map(h => h.minute + ' хв'), datasets: [{ label: device.channel + ' за останню годину (' + device.unit + ')', data: device.hourHistory.map(h => h.value), borderColor: '#4a9eff', fill: true, tension: 0.2 }] },
            options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { labels: { color: '#e0e0e0' } } } }
        });
    }
}

function exportDeviceLogs(deviceId) {
    const device = allDevices.find(d => d.id === deviceId);
    if (!device) return;
    const exportData = device.logs.map(log => ({ 'Дата/Час': new Date(log.timestamp).toLocaleString(), 'Тип': log.type.toUpperCase(), 'Повідомлення': log.message }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(exportData), 'Логи_' + device.name);
    XLSX.writeFile(wb, 'logs_' + device.name + '_' + new Date().toISOString().slice(0,19) + '.xlsx');
    alert('✅ Логи експортовано');
}

function exportDeviceData(deviceId) {
    const device = allDevices.find(d => d.id === deviceId);
    if (!device) return;
    const exportData = device.history.map(point => ({ 'Дата/Час': new Date(point.timestamp).toLocaleString(), 'Значення': point.value, 'Одиниці': device.unit }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(exportData), 'Дані_' + device.name);
    XLSX.writeFile(wb, 'data_' + device.name + '_' + new Date().toISOString().slice(0,19) + '.xlsx');
    alert('✅ Дані експортовано');
}

function simulateError(deviceId) {
    const device = allDevices.find(d => d.id === deviceId);
    if (!device) return;
    device.errors++;
    device.logs.push({ timestamp: Date.now(), type: 'error', message: 'Симульована помилка: Втрата зв\'язку з ' + device.name });
    if (device.logs.length > 100) device.logs.shift();
    showDeviceDetail(deviceId);
}

function toggleWorkplace(id) { 
    const el = document.getElementById(id); 
    if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none'; 
}

function openWindow(id) {
    document.querySelectorAll('.window').forEach(w => w.classList.remove('active'));
    const target = document.getElementById('window-' + id);
    if (target) target.classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const activeNav = document.querySelector('.nav-item[data-window="' + id + '"]');
    if (activeNav) activeNav.classList.add('active');
    const titles = { monitoring: 'МОНІТОРИНГ', devices: 'ДАТЧИКИ', users: 'КОРИСТУВАЧІ', permissions: 'ПРАВА ДОСТУПУ', alarms: 'НАЛАШТУВАННЯ ТРИВОГ' };
    const titleEl = document.getElementById('currentWindowTitle');
    if (titleEl) titleEl.innerText = titles[id] || 'МОНІТОРИНГ';
    if (id === 'users') renderUsersListTable();
    if (id === 'permissions') renderPermissionsTable();
    if (id === 'devices') renderFilteredDevices();
}

function closeWindow(id) { 
    const win = document.getElementById('window-' + id);
    if (win) win.classList.add('hidden');
    openWindow('monitoring');
}

function toggleSidebar() { 
    document.getElementById('sidebar').classList.toggle('collapsed'); 
}

function toggleUserMenu() { 
    document.getElementById('userDropdown').classList.toggle('show'); 
}

function closeModal() { 
    const modal = document.querySelector('.modal'); 
    if (modal) modal.remove(); 
}

function toggleLangDropdown() {
    document.getElementById('langDropdownContent').classList.toggle('show');
    const btn = document.querySelector('.lang-dropdown-btn');
    if (btn) btn.classList.toggle('active');
}

function selectLanguage(langCode, flag, langName) {
    document.getElementById('langDropdownContent').classList.remove('show');
    const btn = document.querySelector('.lang-dropdown-btn');
    if (btn) btn.classList.remove('active');
    document.getElementById('currentLangFlag').innerHTML = flag;
    document.getElementById('currentLangName').innerHTML = langName;
    currentLang = langCode;
    localStorage.setItem('language', langCode);
    const titles = { 
        uk: { monitoring: 'МОНІТОРИНГ', devices: 'ДАТЧИКИ', users: 'КОРИСТУВАЧІ', permissions: 'ПРАВА ДОСТУПУ', alarms: 'НАЛАШТУВАННЯ ТРИВОГ', logout: 'ВИХІД' },
        en: { monitoring: 'MONITORING', devices: 'DEVICES', users: 'USERS', permissions: 'PERMISSIONS', alarms: 'ALARM SETTINGS', logout: 'LOGOUT' },
        es: { monitoring: 'MONITOREO', devices: 'DISPOSITIVOS', users: 'USUARIOS', permissions: 'PERMISOS', alarms: 'AJUSTES DE ALARMA', logout: 'SALIR' } 
    };
    const navMonitoring = document.getElementById('navMonitoring');
    if (navMonitoring) navMonitoring.innerText = titles[langCode].monitoring;
    const navDevices = document.getElementById('navDevices');
    if (navDevices) navDevices.innerText = titles[langCode].devices;
    const navUsers = document.getElementById('navUsers');
    if (navUsers) navUsers.innerText = titles[langCode].users;
    const navPermissions = document.getElementById('navPermissions');
    if (navPermissions) navPermissions.innerText = titles[langCode].permissions;
    const navAlarms = document.getElementById('navAlarmsSettings');
    if (navAlarms) navAlarms.innerText = titles[langCode].alarms;
    const logoutText = document.getElementById('logoutText');
    if (logoutText) logoutText.innerText = titles[langCode].logout;
    const currentTitle = document.getElementById('currentWindowTitle');
    if (currentTitle) currentTitle.innerText = titles[langCode].monitoring;
}

function handleLogin() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    fetch(API_URL + '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, password: password })
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
        if (data.success) {
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            renderMainApp();
        } else {
            var errorDiv = document.getElementById('loginError');
            errorDiv.style.display = 'block';
            errorDiv.innerText = data.error || 'Невірний логін або пароль';
            setTimeout(function() { errorDiv.style.display = 'none'; }, 3000);
        }
    })
    .catch(function(err) {
        console.error('Login error:', err);
        var errorDiv = document.getElementById('loginError');
        errorDiv.style.display = 'block';
        errorDiv.innerText = 'Помилка підключення до сервера';
        setTimeout(function() { errorDiv.style.display = 'none'; }, 3000);
    });
}

function logout() {
    localStorage.clear();
    currentUser = null;
    authToken = null;
    renderLogin();
}

// ========== ЗАПУСК ==========
document.addEventListener('click', function(e) {
    if (!e.target.closest('.lang-dropdown')) {
        var dropdown = document.getElementById('langDropdownContent');
        if (dropdown) dropdown.classList.remove('show');
        var btn = document.querySelector('.lang-dropdown-btn');
        if (btn) btn.classList.remove('active');
    }
    if (!e.target.closest('.user-menu')) {
        var userDrop = document.getElementById('userDropdown');
        if (userDrop) userDrop.classList.remove('show');
    }
});

var savedUser = localStorage.getItem('currentUser');
var savedToken = localStorage.getItem('authToken');
if (savedUser && savedToken) {
    currentUser = JSON.parse(savedUser);
    authToken = savedToken;
    renderMainApp();
} else {
    renderLogin();
}

// Глобальні функції
window.toggleWorkplace = toggleWorkplace;
window.showDeviceDetail = showDeviceDetail;
window.exportDeviceLogs = exportDeviceLogs;
window.exportDeviceData = exportDeviceData;
window.exportToPDF = exportToPDF;
window.simulateError = simulateError;
window.showHourGraph = showHourGraph;
window.renderFilteredDevices = renderFilteredDevices;
window.openWindow = openWindow;
window.closeWindow = closeWindow;
window.toggleSidebar = toggleSidebar;
window.toggleUserMenu = toggleUserMenu;
window.toggleLangDropdown = toggleLangDropdown;
window.selectLanguage = selectLanguage;
window.handleLogin = handleLogin;
window.logout = logout;
window.saveUserEdit = saveUserEdit;
window.deleteUser = deleteUser;
window.showAddUserModal = showAddUserModal;
window.addUser = addUser;
window.closeModal = closeModal;
window.saveAlarmSettings = saveAlarmSettings;
window.toggleAdminMenu = toggleAdminMenu;
window.markNotificationRead = markNotificationRead;
window.clearAllNotifications = clearAllNotifications;
window.toggleNotifications = toggleNotifications;

// ========== НАЛАШТУВАННЯ ТРИВОГ ДЛЯ ПРИЛАДІВ ==========
let alarmConfigs = [];

function loadAlarmConfigs() {
    const saved = localStorage.getItem('alarmConfigs');
    if (saved) {
        alarmConfigs = JSON.parse(saved);
    } else {
        // Ініціалізація налаштувань за замовчуванням для всіх приладів
        alarmConfigs = allDevices.map(device => ({
            deviceId: device.id,
            deviceName: device.name,
            deviceType: device.type,
            enabled: true,
            warningThreshold: 0.3,
            alarmThreshold: 0.5,
            warningColor: '#fbbf24',
            alarmColor: '#f87171',
            normalColor: '#4ade80',
            notificationEnabled: true,
            lastTriggered: null
        }));
        saveAlarmConfigs();
    }
    renderAlarmConfigs();
}

function saveAlarmConfigs() {
    localStorage.setItem('alarmConfigs', JSON.stringify(alarmConfigs));
}

function renderAlarmConfigs() {
    const container = document.getElementById('alarmConfigsList');
    if (!container) return;
    
    const typeFilter = document.getElementById('alarmFilterType')?.value || 'all';
    const statusFilter = document.getElementById('alarmFilterStatus')?.value || 'all';
    
    let filtered = [...alarmConfigs];
    if (typeFilter !== 'all') filtered = filtered.filter(c => c.deviceType === typeFilter);
    if (statusFilter !== 'all') filtered = filtered.filter(c => statusFilter === 'enabled' ? c.enabled : !c.enabled);
    
    container.innerHTML = filtered.map(config => {
        const device = allDevices.find(d => d.id === config.deviceId);
        const currentValue = device ? device.value : 0;
        const isTriggered = config.enabled && currentValue >= config.alarmThreshold;
        const isWarning = config.enabled && currentValue >= config.warningThreshold && currentValue < config.alarmThreshold;
        
        return `
            <div class="alarm-config-panel">
                <div class="alarm-config-header" onclick="toggleAlarmConfig('${config.deviceId}')">
                    <div>
                        <span class="alarm-config-title">${deviceTypes[config.deviceType].icon} ${config.deviceName}</span>
                        <span style="margin-left: 10px; font-size: 12px; color: #8a8a9a;">${deviceTypes[config.deviceType].name}</span>
                    </div>
                    <div>
                        <span class="alarm-config-status ${config.enabled ? 'enabled' : 'disabled'}">${config.enabled ? 'АКТИВНО' : 'ВИМКНЕНО'}</span>
                        ${isTriggered ? '<span style="background:#f87171; padding:3px 8px; border-radius:20px; margin-left:10px;">🔴 ТРИВОГА!</span>' : ''}
                        ${isWarning ? '<span style="background:#fbbf24; padding:3px 8px; border-radius:20px; margin-left:10px;">🟡 ПОПЕРЕДЖЕННЯ</span>' : ''}
                    </div>
                </div>
                <div class="alarm-config-content" id="alarm-config-${config.deviceId}">
                    <div class="form-group">
                        <label>Статус тривоги</label>
                        <select onchange="updateAlarmConfig('${config.deviceId}', 'enabled', this.value === 'true')">
                            <option value="true" ${config.enabled ? 'selected' : ''}>✅ Активовано</option>
                            <option value="false" ${!config.enabled ? 'selected' : ''}>❌ Вимкнено</option>
                        </select>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Поріг попередження (Жовтий) - ${deviceTypes[config.deviceType].unit}</label>
                            <input type="number" step="0.01" value="${config.warningThreshold}" onchange="updateAlarmConfig('${config.deviceId}', 'warningThreshold', parseFloat(this.value))">
                        </div>
                        <div class="form-group">
                            <label>Поріг тривоги (Червоний) - ${deviceTypes[config.deviceType].unit}</label>
                            <input type="number" step="0.01" value="${config.alarmThreshold}" onchange="updateAlarmConfig('${config.deviceId}', 'alarmThreshold', parseFloat(this.value))">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Колір норми</label>
                            <input type="color" value="${config.normalColor}" onchange="updateAlarmConfig('${config.deviceId}', 'normalColor', this.value)">
                            <div class="alarm-color-preview normal" style="background:${config.normalColor}; margin-top:5px;"></div>
                        </div>
                        <div class="form-group">
                            <label>Колір попередження</label>
                            <input type="color" value="${config.warningColor}" onchange="updateAlarmConfig('${config.deviceId}', 'warningColor', this.value)">
                            <div class="alarm-color-preview warning" style="background:${config.warningColor}; margin-top:5px;"></div>
                        </div>
                        <div class="form-group">
                            <label>Колір тривоги</label>
                            <input type="color" value="${config.alarmColor}" onchange="updateAlarmConfig('${config.deviceId}', 'alarmColor', this.value)">
                            <div class="alarm-color-preview danger" style="background:${config.alarmColor}; margin-top:5px;"></div>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Сповіщення при тривозі</label>
                        <select onchange="updateAlarmConfig('${config.deviceId}', 'notificationEnabled', this.value === 'true')">
                            <option value="true" ${config.notificationEnabled ? 'selected' : ''}>🔔 Ввімкнено</option>
                            <option value="false" ${!config.notificationEnabled ? 'selected' : ''}>🔕 Вимкнено</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Поточне значення</label>
                        <div style="padding: 8px; background: #1e1e2e; border-radius: 6px;">
                            <span style="font-size: 20px; font-weight: bold; color: ${currentValue >= config.alarmThreshold ? config.alarmColor : (currentValue >= config.warningThreshold ? config.warningColor : config.normalColor)}">
                                ${currentValue} ${deviceTypes[config.deviceType].unit}
                            </span>
                        </div>
                    </div>
                    <button class="action-btn" onclick="testAlarm('${config.deviceId}')">🔔 Тестувати тривогу</button>
                </div>
            </div>
        `;
    }).join('');
}

function toggleAlarmConfig(deviceId) {
    const content = document.getElementById(`alarm-config-${deviceId}`);
    if (content) {
        content.classList.toggle('show');
    }
}

function updateAlarmConfig(deviceId, field, value) {
    const config = alarmConfigs.find(c => c.deviceId === deviceId);
    if (config) {
        config[field] = value;
        saveAlarmConfigs();
        renderAlarmConfigs();
        // Оновлюємо відображення кольорів на приладах
        updateDeviceColors();
    }
}

function updateDeviceColors() {
    for (const device of allDevices) {
        const config = alarmConfigs.find(c => c.deviceId === device.id);
        if (config && config.enabled) {
            if (device.value >= config.alarmThreshold) {
                device.status = 'danger';
                if (config.notificationEnabled && device.lastNotification !== Date.now()) {
                    addNotification('error', '⚠️ ТРИВОГА!', `${device.workplace}: ${device.name} - значення ${device.value} перевищило поріг ${config.alarmThreshold} ${device.unit}`, device.id);
                    device.lastNotification = Date.now();
                }
            } else if (device.value >= config.warningThreshold) {
                device.status = 'warning';
            } else {
                device.status = 'normal';
            }
        }
    }
    renderWorkplaces();
    renderFilteredDevices();
}

function testAlarm(deviceId) {
    const config = alarmConfigs.find(c => c.deviceId === deviceId);
    const device = allDevices.find(d => d.id === deviceId);
    if (config && device) {
        addNotification('error', '🔴 ТЕСТОВА ТРИВОГА', `Тест: ${device.name} - перевірка системи сповіщення`, device.id);
        alert(`✅ Тест тривоги для ${device.name} виконано!`);
    }
}

function saveAllAlarmConfigs() {
    saveAlarmConfigs();
    alert('✅ Всі налаштування тривог збережено!');
}

function filterAlarmConfigs() {
    renderAlarmConfigs();
}

// Перевизначення функції перевірки статусу з урахуванням індивідуальних налаштувань
function checkDeviceStatus(device, config) {
    if (!config || !config.enabled) return 'normal';
    if (device.value >= config.alarmThreshold) return 'danger';
    if (device.value >= config.warningThreshold) return 'warning';
    return 'normal';
}
