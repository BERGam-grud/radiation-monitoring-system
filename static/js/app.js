// ========== КОНФІГУРАЦІЯ ==========
const API_URL = 'http://192.168.4.223:5002';
let authToken = localStorage.getItem('authToken');
let currentUser = null;
let currentLang = 'uk';
let selectedDevice = null;
let deviceChart = null;
let hourChart = null;
let map = null;
let markers = [];

// Координати для різних областей (приблизні)
const areaCoordinates = {
    'Київська': { lat: 50.45, lng: 30.52 },
    'Житомирська': { lat: 50.25, lng: 28.67 },
    'Чернігівська': { lat: 51.50, lng: 31.30 },
    'Харківська': { lat: 50.00, lng: 36.23 },
    'Львівська': { lat: 49.84, lng: 24.03 },
    'Одеська': { lat: 46.48, lng: 30.73 },
    'Дніпропетровська': { lat: 48.46, lng: 35.05 },
    'Запорізька': { lat: 47.84, lng: 35.14 },
    'Полтавська': { lat: 49.59, lng: 34.55 },
    'Вінницька': { lat: 49.23, lng: 28.48 }
};

// ========== ТИПИ ПРИЛАДІВ ==========
const deviceTypes = {
    gamma: { name: 'Гама-детектор', icon: '📡', unit: 'мкЗв/год', color: '#4ade80' },
    spectro: { name: 'Спектрометричний детектор', icon: '🔬', unit: 'кБк/м³', color: '#fbbf24' },
    vfu: { name: 'ВФУ', icon: '💨', unit: 'м/с', color: '#60a5fa' },
    weather: { name: 'Метеостанція Gill MAXIMET 500', icon: '🌡️', unit: '°C', color: '#f97316' }
};

const locations = ['Київська', 'Житомирська', 'Чернігівська', 'Харківська', 'Львівська', 'Одеська', 'Дніпропетровська', 'Запорізька', 'Полтавська', 'Вінницька'];

// Отримання унікальних областей та РМ для фільтрів
let uniqueAreas = [];
let uniqueWorkplaces = [];

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
    const coords = areaCoordinates[location] || { lat: 49.0, lng: 32.0 };
    // Додаємо невеликий зсув для кожного РМ в межах області
    const latOffset = (Math.random() - 0.5) * 0.5;
    const lngOffset = (Math.random() - 0.5) * 0.5;
    
    workplaces.push({
        id: i,
        name: `РМ-${i}`,
        location: location,
        area: location,
        lat: coords.lat + latOffset,
        lng: coords.lng + lngOffset,
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
                errors: Math.floor(Math.random() * 10),
                alarmLevels: { warning: 0.15, danger: 0.25, critical: 0.30 }
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
                errors: Math.floor(Math.random() * 5),
                alarmLevels: { warning: 0.20, danger: 0.35, critical: 0.50 }
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
                errors: Math.floor(Math.random() * 3),
                alarmLevels: { warning: 5.0, danger: 8.0, critical: 10.0 }
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
                errors: Math.floor(Math.random() * 2),
                alarmLevels: { warning: 25, danger: 30, critical: 35 }
            }
        ]
    });
    
    // Генерація історії та логів
    workplaces[i-1].equipment.forEach(dev => {
        dev.history = generateHistory(dev.value, 100);
        dev.hourHistory = generateHourHistory(dev.value);
        dev.logs = generateRandomLogs(dev.name, 20);
        if (dev.value >= dev.alarmLevels.critical) dev.status = 'critical';
        else if (dev.value >= dev.alarmLevels.danger) dev.status = 'danger';
        else if (dev.value >= dev.alarmLevels.warning) dev.status = 'warning';
        else dev.status = 'normal';
    });
}

let allDevices = workplaces.flatMap(wp => wp.equipment.map(dev => ({ ...dev, workplace: wp.name, location: wp.location, area: wp.area, lat: wp.lat, lng: wp.lng })));

uniqueAreas = [...new Set(allDevices.map(d => d.area))];
uniqueWorkplaces = [...new Set(allDevices.map(d => d.workplace))];

// ========== СИСТЕМА КОРИСТУВАЧІВ ТА ПРАВ ДОСТУПУ ==========
let users = [];
let roles = [
    { id: 'admin', name: 'Адміністратор', permissions: { read: true, edit: true, admin: true, delete: true, export: true, manageUsers: true, managePermissions: true } },
    { id: 'moderator', name: 'Модератор', permissions: { read: true, edit: true, admin: false, delete: false, export: true, manageUsers: false, managePermissions: false } },
    { id: 'viewer', name: 'Спостерігач', permissions: { read: true, edit: false, admin: false, delete: false, export: false, manageUsers: false, managePermissions: false } }
];

function initUsers() {
    const savedUsers = localStorage.getItem('systemUsers');
    if (savedUsers) {
        users = JSON.parse(savedUsers);
    } else {
        users = [
            { id: 1, email: 'admin@example.com', full_name: 'Адміністратор', role: 'admin', created_at: new Date().toISOString(), status: 'active' },
            { id: 2, email: 'moderator@example.com', full_name: 'Модератор', role: 'moderator', created_at: new Date().toISOString(), status: 'active' },
            { id: 3, email: 'viewer@example.com', full_name: 'Спостерігач', role: 'viewer', created_at: new Date().toISOString(), status: 'active' }
        ];
        saveUsers();
    }
    updateCurrentUserPermissions();
}

function saveUsers() {
    localStorage.setItem('systemUsers', JSON.stringify(users));
}

function getCurrentUserPermissions() {
    if (!currentUser) return roles.find(r => r.id === 'viewer').permissions;
    const user = users.find(u => u.email === currentUser.email);
    if (!user) return roles.find(r => r.id === 'viewer').permissions;
    const userRole = roles.find(r => r.id === user.role);
    return userRole ? userRole.permissions : roles.find(r => r.id === 'viewer').permissions;
}

function updateCurrentUserPermissions() {
    if (currentUser) {
        const user = users.find(u => u.email === currentUser.email);
        if (user) {
            currentUser.role = user.role;
            currentUser.permissions = getCurrentUserPermissions();
        }
    }
}

function hasPermission(permission) {
    const perms = getCurrentUserPermissions();
    return perms[permission] === true;
}

// ========== УПРАВЛІННЯ КОРИСТУВАЧАМИ ==========
function renderUsersListTable() {
    const tbody = document.getElementById('usersListTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = users.map(user => {
        return `
            <tr>
                <td>${user.id}</td>
                <td>${user.email}</td>
                <td><input type="text" id="name_${user.id}" value="${user.full_name}" class="edit-input" style="background:#1e1e2e;border:1px solid #3a3a4a;border-radius:4px;padding:4px;color:#e0e0e0;" ${!hasPermission('manageUsers') ? 'disabled' : ''}></td>
                <td>
                    <select id="role_${user.id}" class="edit-select" onchange="updateUserRole(${user.id}, this.value)" style="background:#1e1e2e;border:1px solid #3a3a4a;border-radius:4px;padding:4px;color:#e0e0e0;" ${!hasPermission('manageUsers') ? 'disabled' : ''}>
                        ${roles.map(r => `<option value="${r.id}" ${user.role === r.id ? 'selected' : ''}>${r.name}</option>`).join('')}
                    </select>
                </td>
                <td>${user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}</td>
                <td class="status-cell">
                    <span class="status-badge ${user.status === 'active' ? 'active' : 'inactive'}" style="cursor:pointer" onclick="${hasPermission('manageUsers') ? `toggleUserStatus(${user.id})` : ''}">
                        ${user.status === 'active' ? '🟢 Активний' : '🔴 Заблокований'}
                    </span>
                </td>
                <td>
                    ${!hasPermission('manageUsers') ? '<span style="color:#666;">—</span>' : `<button class="action-btn danger" onclick="deleteUser(${user.id})">🗑️</button>`}
                </td>
            </tr>
        `;
    }).join('');
}

function updateUserRole(userId, newRole) {
    const user = users.find(u => u.id === userId);
    if (user) {
        user.role = newRole;
        saveUsers();
        renderUsersListTable();
        if (currentUser && currentUser.email === user.email) {
            updateCurrentUserPermissions();
        }
        addNotification('info', '👥 Права оновлено', `Користувачу ${user.email} призначено роль ${roles.find(r => r.id === newRole).name}`);
    }
}

function toggleUserStatus(userId) {
    const user = users.find(u => u.id === userId);
    if (user) {
        user.status = user.status === 'active' ? 'inactive' : 'active';
        saveUsers();
        renderUsersListTable();
        addNotification('info', '👥 Статус змінено', `Користувач ${user.email} ${user.status === 'active' ? 'активований' : 'заблокований'}`);
    }
}

function saveUserEdit(userId) {
    const newName = document.getElementById(`name_${userId}`).value;
    const user = users.find(u => u.id === userId);
    if (user) {
        user.full_name = newName;
        saveUsers();
        renderUsersListTable();
        addNotification('info', '👥 Користувача оновлено', `Ім\'я користувача ${user.email} змінено на ${newName}`);
    }
}

function deleteUser(userId) {
    const user = users.find(u => u.id === userId);
    if (user && confirm(`Видалити користувача ${user.email}?`)) {
        users = users.filter(u => u.id !== userId);
        saveUsers();
        renderUsersListTable();
        addNotification('info', '👥 Користувача видалено', `Користувача ${user.email} видалено з системи`);
    }
}

function showAddUserModal() {
    const modalHtml = `
        <div id="addUserModal" class="modal" style="display:flex; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:1000; align-items:center; justify-content:center;">
            <div class="modal-content" style="background:#1e1e2e; border-radius:12px; padding:20px; width:400px; max-width:90%;">
                <h3 style="margin-bottom:20px;">➕ Додати користувача</h3>
                <div class="form-group" style="margin-bottom:15px;">
                    <label>Email</label>
                    <input type="email" id="newUserEmail" class="form-control" style="width:100%; padding:8px; border-radius:6px; border:1px solid #3a3a4a; background:#2a2a3a; color:#e0e0e0;">
                </div>
                <div class="form-group" style="margin-bottom:15px;">
                    <label>Пароль</label>
                    <input type="password" id="newUserPassword" class="form-control" style="width:100%; padding:8px; border-radius:6px; border:1px solid #3a3a4a; background:#2a2a3a; color:#e0e0e0;">
                </div>
                <div class="form-group" style="margin-bottom:15px;">
                    <label>ПІБ</label>
                    <input type="text" id="newUserName" class="form-control" style="width:100%; padding:8px; border-radius:6px; border:1px solid #3a3a4a; background:#2a2a3a; color:#e0e0e0;">
                </div>
                <div class="form-group" style="margin-bottom:20px;">
                    <label>Роль</label>
                    <select id="newUserRole" class="form-control" style="width:100%; padding:8px; border-radius:6px; border:1px solid #3a3a4a; background:#2a2a3a; color:#e0e0e0;">
                        ${roles.map(r => `<option value="${r.id}">${r.name}</option>`).join('')}
                    </select>
                </div>
                <div style="display:flex; gap:10px; justify-content:flex-end;">
                    <button class="action-btn" onclick="closeModal()" style="padding:8px 16px;">Скасувати</button>
                    <button class="btn-primary" onclick="addUser()" style="padding:8px 16px;">Додати</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function addUser() {
    const email = document.getElementById('newUserEmail').value;
    const password = document.getElementById('newUserPassword').value;
    const full_name = document.getElementById('newUserName').value;
    const role = document.getElementById('newUserRole').value;
    
    if (!email || !password || !full_name) {
        alert('Будь ласка, заповніть всі поля');
        return;
    }
    
    if (users.find(u => u.email === email)) {
        alert('Користувач з таким email вже існує');
        return;
    }
    
    const newId = Math.max(...users.map(u => u.id), 0) + 1;
    users.push({
        id: newId,
        email: email,
        full_name: full_name,
        role: role,
        created_at: new Date().toISOString(),
        status: 'active'
    });
    saveUsers();
    closeModal();
    renderUsersListTable();
    addNotification('success', '👥 Новий користувач', `Додано користувача ${email} з роллю ${roles.find(r => r.id === role).name}`);
}

// ========== УПРАВЛІННЯ ПРАВАМИ ДОСТУПУ ==========
function renderPermissionsTable() {
    const container = document.getElementById('permissionsContainer');
    if (!container) return;
    
    const resources = [
        { id: 'monitoring', name: '📊 Моніторинг', description: 'Перегляд даних моніторингу' },
        { id: 'devices', name: '📡 Прилади', description: 'Перегляд та управління приладами' },
        { id: 'alarms', name: '⚠️ Налаштування тривог', description: 'Зміна порогів тривог для приладів' },
        { id: 'users', name: '👥 Користувачі', description: 'Управління користувачами' },
        { id: 'permissions', name: '🔐 Права доступу', description: 'Налаштування прав доступу' },
        { id: 'export', name: '📄 Експорт', description: 'Експорт даних та звітів' }
    ];
    
    container.innerHTML = `
        <div style="margin-bottom:20px;">
            <h3 style="margin-bottom:15px;">🔐 Налаштування прав доступу за ролями</h3>
            <p style="color:#8a8a9a; margin-bottom:20px;">Тут ви можете налаштувати, які дії дозволені для кожної ролі користувачів.</p>
        </div>
        <div style="overflow-x:auto;">
            <table class="permissions-table" style="width:100%; border-collapse:collapse;">
                <thead>
                    <tr style="background:#2a2a3a;">
                        <th style="padding:12px; text-align:left;">Ресурс / Дія</th>
                        ${roles.map(role => `<th style="padding:12px; text-align:center;">${role.name}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${resources.map(resource => `
                        <tr style="border-bottom:1px solid #3a3a4a;">
                            <td style="padding:12px;">
                                <strong>${resource.name}</strong><br>
                                <span style="font-size:12px; color:#8a8a9a;">${resource.description}</span>
                            </td>
                            ${roles.map(role => `
                                <td style="padding:12px; text-align:center;">
                                    <label class="permission-switch" style="display:inline-block;">
                                        <input type="checkbox" 
                                               id="perm_${role.id}_${resource.id}" 
                                               ${role.permissions[getPermissionKey(resource.id)] ? 'checked' : ''}
                                               onchange="updatePermission('${role.id}', '${resource.id}', this.checked)"
                                               ${!hasPermission('managePermissions') ? 'disabled' : ''}>
                                        <span class="permission-slider"></span>
                                    </label>
                                </td>
                            `).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        <div style="margin-top:20px; padding:15px; background:#2a2a3a; border-radius:8px;">
            <h4 style="margin-bottom:10px;">📖 Легенда прав доступу:</h4>
            <ul style="margin:0; padding-left:20px; color:#8a8a9a;">
                <li><strong>read</strong> - перегляд даних та інформації</li>
                <li><strong>edit</strong> - редагування та зміна даних</li>
                <li><strong>admin</strong> - адміністративні функції</li>
                <li><strong>delete</strong> - видалення даних</li>
                <li><strong>export</strong> - експорт даних</li>
                <li><strong>manageUsers</strong> - управління користувачами</li>
                <li><strong>managePermissions</strong> - управління правами доступу</li>
            </ul>
        </div>
    `;
}

function getPermissionKey(resourceId) {
    const mapping = {
        'monitoring': 'read',
        'devices': 'edit',
        'alarms': 'edit',
        'users': 'manageUsers',
        'permissions': 'managePermissions',
        'export': 'export'
    };
    return mapping[resourceId] || 'read';
}

function updatePermission(roleId, resourceId, isChecked) {
    const role = roles.find(r => r.id === roleId);
    if (role) {
        const permKey = getPermissionKey(resourceId);
        role.permissions[permKey] = isChecked;
        
        localStorage.setItem('systemRoles', JSON.stringify(roles));
        renderPermissionsTable();
        updateCurrentUserPermissions();
        addNotification('info', '🔐 Права доступу оновлено', `Для ролі ${role.name} змінено права на ${resourceId}`);
    }
}

function loadRoles() {
    const savedRoles = localStorage.getItem('systemRoles');
    if (savedRoles) {
        const parsed = JSON.parse(savedRoles);
        parsed.forEach(savedRole => {
            const existingRole = roles.find(r => r.id === savedRole.id);
            if (existingRole) {
                existingRole.permissions = savedRole.permissions;
            }
        });
    }
}

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
        if (device.status === 'critical') {
            addNotification('error', '🔴 КРИТИЧНО!', `${device.workplace}: ${device.name} - КРИТИЧНИЙ РІВЕНЬ (${device.value} ${device.unit})`, device.id);
        } else if (device.status === 'danger') {
            addNotification('error', '⚠️ НЕБЕЗПЕКА!', `${device.workplace}: ${device.name} - перевищено рівень небезпеки (${device.value} ${device.unit})`, device.id);
        } else if (device.status === 'warning') {
            addNotification('warning', '⚠️ Попередження', `${device.workplace}: ${device.name} - рівень перевищує норму (${device.value} ${device.unit})`, device.id);
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
                <td>${deviceTypes[dev.type]?.icon || '📡'} ${deviceTypes[dev.type]?.name || dev.type}</td>
                <td>${dev.name}</td>
                <td>${dev.model}</td>
                <td>${dev.workplace}</td>
                <td>${dev.location}</td>
                <td class="${dev.status}">${dev.value} ${dev.unit}</td>
                <td><span class="status-dot ${dev.status}"></span> ${dev.status === 'normal' ? 'Норма' : (dev.status === 'warning' ? 'Попередження' : (dev.status === 'danger' ? 'Небезпека' : 'Критично'))}</td>
                <td><button class="action-btn" onclick="event.stopPropagation(); showDeviceDetail('${dev.id}')">📊</button></td>
            </tr>
        `).join('');
    }
}

// ========== МАПА ==========
function initMap() {
    const container = document.getElementById('mapContainer');
    if (!container) return;
    
    // Очищаємо контейнер перед створенням
    container.innerHTML = '<div id="workplaceMap" style="height: 720px; width: 100%; border-radius: 12px;"></div>';
    
    // Створюємо карту
    if (map) map.remove();
    map = L.map('workplaceMap').setView([49.0, 32.0], 6);
    
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; CartoDB',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);
    
    // Додаємо маркери для кожного робочого місця
    workplaces.forEach(workplace => {
        // Визначаємо колір маркера на основі максимального статусу приладів
        let worstStatus = 'normal';
        workplace.equipment.forEach(dev => {
            if (dev.status === 'critical') worstStatus = 'critical';
            else if (dev.status === 'danger' && worstStatus !== 'critical') worstStatus = 'danger';
            else if (dev.status === 'warning' && worstStatus === 'normal') worstStatus = 'warning';
        });
        
        let markerColor = '#4ade80'; // normal
        if (worstStatus === 'warning') markerColor = '#fbbf24';
        else if (worstStatus === 'danger') markerColor = '#f87171';
        else if (worstStatus === 'critical') markerColor = '#ef4444';
        
        // Створюємо кастомну іконку
        const iconHtml = `
            <div style="background: ${markerColor}; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">
                <span style="color: white; font-size: 14px;">📍</span>
            </div>
        `;
        
        const customIcon = L.divIcon({
            html: iconHtml,
            className: 'custom-marker',
            iconSize: [30, 30],
            popupAnchor: [0, -15]
        });
        
        const marker = L.marker([workplace.lat, workplace.lng], { icon: customIcon }).addTo(map);
        
        // Створюємо HTML для popup
        const deviceListHtml = workplace.equipment.map(dev => `
            <div style="margin-bottom: 8px; padding: 5px; border-bottom: 1px solid #3a3a4a; border-radius: 6px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong>${deviceTypes[dev.type]?.icon || '📡'} ${dev.name}</strong><br>
                        <span style="font-size: 11px; color: #8a8a9a;">${dev.type}</span>
                    </div>
                    <div style="text-align: right;">
                        <span style="color: ${dev.status === 'critical' ? '#ef4444' : (dev.status === 'danger' ? '#f87171' : (dev.status === 'warning' ? '#fbbf24' : '#4ade80'))}; font-weight: bold;">
                            ${dev.value} ${dev.unit}
                        </span>
                        <br>
                        <button class="map-device-btn" onclick="event.stopPropagation(); goToDevice('${dev.id}')" style="background: #4a9eff; border: none; border-radius: 4px; padding: 2px 8px; margin-top: 4px; color: white; cursor: pointer; font-size: 11px;">
                            🔍 Переглянути прилад
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
        
        const popupContent = `
            <div style="min-width: 250px; max-width: 350px; background: #1e1e2e; border-radius: 8px;">
                <div style="background: #2a2a3a; padding: 10px; border-radius: 8px 8px 0 0;">
                    <h4 style="margin: 0; color: #e0e0e0;">🏭 ${workplace.name}</h4>
                    <p style="margin: 5px 0 0; font-size: 12px; color: #8a8a9a;">📍 ${workplace.location} область</p>
                </div>
                <div style="padding: 10px;">
                    <div style="margin-bottom: 10px;">
                        <strong>📡 Прилади (${workplace.equipment.length}):</strong>
                    </div>
                    <div style="max-height: 300px; overflow-y: auto;">
                        ${deviceListHtml}
                    </div>
                    <button onclick="goToWorkplaceDevices('${workplace.name}')" style="width: 100%; background: #4a9eff; border: none; border-radius: 6px; padding: 8px; margin-top: 10px; color: white; cursor: pointer;">
                        📊 Всі прилади РМ
                    </button>
                </div>
            </div>
        `;
        
        marker.bindPopup(popupContent);
        markers.push(marker);
    });
}

function goToDevice(deviceId) {
    // Закриваємо popup
    map.closePopup();
    
    // Переходимо на вкладку ДАТЧИКИ
    openWindow('devices');
    
    // Знаходимо прилад в allDevices
    const device = allDevices.find(d => d.id === deviceId);
    if (device) {
        // Затримка для того, щоб вкладка встигла відрендеритись
        setTimeout(() => {
            showDeviceDetail(deviceId);
            // Прокручуємо до детальної панелі
            const detailPanel = document.getElementById('detailPanel');
            if (detailPanel) {
                detailPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 300);
    }
}

function goToWorkplaceDevices(workplaceName) {
    map.closePopup();
    openWindow('devices');
    
    // Фільтруємо таблицю приладів за РМ
    setTimeout(() => {
        const workplaceFilter = document.getElementById('devFilterWorkplace');
        if (workplaceFilter) {
            workplaceFilter.value = workplaceName;
            renderFilteredDevices();
        }
        addNotification('info', '🗺️ Мапа', `Відфільтровано прилади для ${workplaceName}`);
    }, 300);
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
            <p><strong>Статус:</strong> ${device.status === 'normal' ? 'Нормальний' : (device.status === 'warning' ? 'Попередження' : (device.status === 'danger' ? 'Небезпека' : 'Критичний'))}</p>
            <p><strong>Час роботи:</strong> ${device.uptime} днів</p>
            <p><strong>Дата створення звіту:</strong> ${new Date().toLocaleString()}</p>
            
            <h2>📈 Історія вимірювань (останні 20 точок)</h2>
            <table>
                <tr><th>Дата/Час</th><th>Значення (${device.unit})</th></tr>
                ${device.history.slice(-20).reverse().map(h => `<td><td>${new Date(h.timestamp).toLocaleString()}</td><td>${h.value.toFixed(3)}</td></tr>`).join('')}
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

// ========== НОВІ ФУНКЦІЇ ДЛЯ РОЗШИРЕНОГО НАЛАШТУВАННЯ ТРИВОГ ==========
let alarmDevicesData = [];

async function loadAlarmDevices() {
    try {
        const response = await fetch('/api/devices_with_alarms', {
            headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
        });
        if (!response.ok) throw new Error('Unauthorized');
        const serverDevices = await response.json();
        
        alarmDevicesData = serverDevices.map(device => {
            const localDevice = allDevices.find(d => d.id == device.id);
            return {
                ...device,
                alarmLevels: localDevice ? localDevice.alarmLevels : { warning: 0.15, danger: 0.25, critical: 0.30 }
            };
        });
        applyAlarmFilters();
    } catch (error) {
        console.error('Помилка завантаження:', error);
        const tbody = document.getElementById('alarmDevicesTableBody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="7">Помилка завантаження даних</td></tr>';
    }
}

function renderAlarmTable(data) {
    const tbody = document.getElementById('alarmDevicesTableBody');
    if (!tbody) return;
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7">Немає приладів</td></tr>';
        return;
    }
    tbody.innerHTML = data.map(device => {
        let statusText = '', statusClass = '';
        if (device.current_value >= device.alarmLevels.critical) {
            statusText = 'КРИТИЧНО';
            statusClass = 'critical';
        } else if (device.current_value >= device.alarmLevels.danger) {
            statusText = 'НЕБЕЗПЕКА';
            statusClass = 'danger';
        } else if (device.current_value >= device.alarmLevels.warning) {
            statusText = 'ПОПЕРЕДЖЕННЯ';
            statusClass = 'warning';
        } else {
            statusText = 'НОРМА';
            statusClass = 'normal';
        }
        
        return `
            <tr class="${statusClass}-row">
                <td>${device.id}</td>
                <td>${device.name}</td>
                <td>${device.type}</td>
                <td><strong>${device.current_value}</strong> ${device.unit}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td style="min-width:200px">
                    <div class="alarm-levels">
                        <span style="color:#fbbf24">⚠️ Попередження: ${device.alarmLevels.warning}</span> |
                        <span style="color:#f87171">🔴 Небезпека: ${device.alarmLevels.danger}</span> |
                        <span style="color:#ef4444">❗ Критично: ${device.alarmLevels.critical}</span>
                    </div>
                </td>
                <td><button class="action-btn" onclick="openAlarmModal('${device.id}', '${device.name}', ${device.alarmLevels.warning}, ${device.alarmLevels.danger}, ${device.alarmLevels.critical})">⚙️ Налаштувати</button></td>
            </tr>
        `;
    }).join('');
}

function applyAlarmFilters() {
    let filtered = [...alarmDevicesData];
    
    const areaFilter = document.getElementById('alarmFilterArea')?.value || 'all';
    const workplaceFilter = document.getElementById('alarmFilterWorkplace')?.value || 'all';
    const typeFilter = document.getElementById('alarmFilterType')?.value || 'all';
    const statusFilter = document.getElementById('alarmFilterStatus')?.value || 'all';
    const sortBy = document.getElementById('alarmSortBy')?.value || 'type';
    
    if (areaFilter !== 'all') {
        filtered = filtered.filter(d => {
            const device = allDevices.find(dev => dev.id == d.id);
            return device && device.area === areaFilter;
        });
    }
    
    if (workplaceFilter !== 'all') {
        filtered = filtered.filter(d => {
            const device = allDevices.find(dev => dev.id == d.id);
            return device && device.workplace === workplaceFilter;
        });
    }
    
    if (typeFilter !== 'all') filtered = filtered.filter(d => d.type === typeFilter);
    
    if (statusFilter !== 'all') {
        filtered = filtered.filter(d => {
            const device = allDevices.find(dev => dev.id == d.id);
            if (!device) return false;
            if (statusFilter === 'normal') return device.status === 'normal';
            if (statusFilter === 'warning') return device.status === 'warning';
            if (statusFilter === 'danger') return device.status === 'danger';
            if (statusFilter === 'critical') return device.status === 'critical';
            return false;
        });
    }
    
    if (sortBy === 'type') filtered.sort((a,b) => a.type.localeCompare(b.type));
    if (sortBy === 'current_value') filtered.sort((a,b) => b.current_value - a.current_value);
    if (sortBy === 'warning') filtered.sort((a,b) => a.alarmLevels.warning - b.alarmLevels.warning);
    if (sortBy === 'danger') filtered.sort((a,b) => a.alarmLevels.danger - b.alarmLevels.danger);
    if (sortBy === 'critical') filtered.sort((a,b) => a.alarmLevels.critical - b.alarmLevels.critical);
    
    renderAlarmTable(filtered);
}

function openAlarmModal(deviceId, deviceName, currentWarning, currentDanger, currentCritical) {
    const modalHtml = `
        <div id="alarmLevelModal" class="modal" style="display:flex; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:1000; align-items:center; justify-content:center;">
            <div class="modal-content" style="background:#1e1e2e; border-radius:12px; padding:20px; width:400px; max-width:90%;">
                <h3 style="margin-bottom:20px;">⚙️ Налаштування рівнів тривоги: ${deviceName}</h3>
                <div class="form-group" style="margin-bottom:15px;">
                    <label style="color:#fbbf24; display:block; margin-bottom:5px;">⚠️ Рівень ПОПЕРЕДЖЕННЯ (жовтий)</label>
                    <input type="number" step="0.01" id="warningLevel" value="${currentWarning}" class="form-control" style="width:100%; padding:8px; border-radius:6px; border:1px solid #3a3a4a; background:#2a2a3a; color:#e0e0e0;">
                </div>
                <div class="form-group" style="margin-bottom:15px;">
                    <label style="color:#f87171; display:block; margin-bottom:5px;">🔴 Рівень НЕБЕЗПЕКИ (червоний)</label>
                    <input type="number" step="0.01" id="dangerLevel" value="${currentDanger}" class="form-control" style="width:100%; padding:8px; border-radius:6px; border:1px solid #3a3a4a; background:#2a2a3a; color:#e0e0e0;">
                </div>
                <div class="form-group" style="margin-bottom:20px;">
                    <label style="color:#ef4444; display:block; margin-bottom:5px;">❗ КРИТИЧНИЙ РІВЕНЬ (темно-червоний)</label>
                    <input type="number" step="0.01" id="criticalLevel" value="${currentCritical}" class="form-control" style="width:100%; padding:8px; border-radius:6px; border:1px solid #3a3a4a; background:#2a2a3a; color:#e0e0e0;">
                </div>
                <div style="display:flex; gap:10px; justify-content:flex-end;">
                    <button onclick="closeAlarmModal()" class="action-btn" style="padding:8px 16px;">Скасувати</button>
                    <button onclick="saveAlarmLevels('${deviceId}', '${deviceName}')" class="btn-primary" style="padding:8px 16px;">💾 Зберегти</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function closeAlarmModal() {
    const modal = document.getElementById('alarmLevelModal');
    if (modal) modal.remove();
}

function saveAlarmLevels(deviceId, deviceName) {
    const warningLevel = parseFloat(document.getElementById('warningLevel').value);
    const dangerLevel = parseFloat(document.getElementById('dangerLevel').value);
    const criticalLevel = parseFloat(document.getElementById('criticalLevel').value);
    
    if (isNaN(warningLevel) || isNaN(dangerLevel) || isNaN(criticalLevel)) {
        alert('Будь ласка, введіть коректні числові значення');
        return;
    }
    
    if (warningLevel >= dangerLevel || dangerLevel >= criticalLevel) {
        alert('Рівні повинні бути в порядку зростання: ПОПЕРЕДЖЕННЯ < НЕБЕЗПЕКА < КРИТИЧНО');
        return;
    }
    
    const device = allDevices.find(d => d.id === deviceId);
    if (device) {
        device.alarmLevels = {
            warning: warningLevel,
            danger: dangerLevel,
            critical: criticalLevel
        };
        
        if (device.value >= criticalLevel) device.status = 'critical';
        else if (device.value >= dangerLevel) device.status = 'danger';
        else if (device.value >= warningLevel) device.status = 'warning';
        else device.status = 'normal';
        
        loadAlarmDevices();
        renderFilteredDevices();
        renderWorkplaces();
        
        addNotification('info', '⚙️ Налаштування змінено', `${deviceName}: нові рівні тривог (${warningLevel}/${dangerLevel}/${criticalLevel}) ${device.unit}`, deviceId);
        
        const allAlarmSettings = JSON.parse(localStorage.getItem('deviceAlarmSettings') || '{}');
        allAlarmSettings[deviceId] = { warning: warningLevel, danger: dangerLevel, critical: criticalLevel };
        localStorage.setItem('deviceAlarmSettings', JSON.stringify(allAlarmSettings));
        
        alert(`✅ Налаштування для ${deviceName} збережено!`);
        closeAlarmModal();
    } else {
        alert('Помилка: прилад не знайдено');
    }
}

function resetAllAlarmSettings() {
    if (confirm('Скинути НАЛАШТУВАННЯ ТРИВОГ для ВСІХ приладів до значень за замовчуванням?')) {
        for (const device of allDevices) {
            let defaultLevels;
            switch(device.type) {
                case 'gamma':
                    defaultLevels = { warning: 0.15, danger: 0.25, critical: 0.30 };
                    break;
                case 'spectro':
                    defaultLevels = { warning: 0.20, danger: 0.35, critical: 0.50 };
                    break;
                case 'vfu':
                    defaultLevels = { warning: 5.0, danger: 8.0, critical: 10.0 };
                    break;
                default:
                    defaultLevels = { warning: 25, danger: 30, critical: 35 };
            }
            device.alarmLevels = defaultLevels;
            if (device.value >= defaultLevels.critical) device.status = 'critical';
            else if (device.value >= defaultLevels.danger) device.status = 'danger';
            else if (device.value >= defaultLevels.warning) device.status = 'warning';
            else device.status = 'normal';
        }
        localStorage.removeItem('deviceAlarmSettings');
        loadAlarmDevices();
        renderFilteredDevices();
        renderWorkplaces();
        addNotification('info', '🔄 Скидання налаштувань', 'Всі налаштування тривог скинуто до стандартних значень');
        alert('✅ Налаштування всіх приладів скинуто!');
    }
}

function loadSavedAlarmSettings() {
    const savedSettings = localStorage.getItem('deviceAlarmSettings');
    if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        for (const device of allDevices) {
            if (settings[device.id]) {
                device.alarmLevels = settings[device.id];
                if (device.value >= device.alarmLevels.critical) device.status = 'critical';
                else if (device.value >= device.alarmLevels.danger) device.status = 'danger';
                else if (device.value >= device.alarmLevels.warning) device.status = 'warning';
                else device.status = 'normal';
            }
        }
    }
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
    uniqueAreas = [...new Set(allDevices.map(d => d.area))];
    uniqueWorkplaces = [...new Set(allDevices.map(d => d.workplace))];
    
    document.getElementById('app').innerHTML = `
        <div class="app-container">
            <div class="sidebar" id="sidebar">
                <div class="sidebar-header">
                    <h2>🔬 RM</h2>
                    <p>RADIATION MONITOR</p>
                    <button class="collapse-btn" onclick="toggleSidebar()">◀</button>
                </div>
                <div class="nav-menu">
                    <div class="nav-item" data-window="map" onclick="openWindow('map')">
                        <div class="nav-icon">🗺️</div>
                        <div class="nav-text">МАПА</div>
                    </div>
                    <div class="nav-item" data-window="monitoring" onclick="openWindow('monitoring')">
                        <div class="nav-icon">📊</div>
                        <div class="nav-text">МОНІТОРИНГ</div>
                    </div>
                    <div class="nav-item" data-window="devices" onclick="openWindow('devices')">
                        <div class="nav-icon">📡</div>
                        <div class="nav-text">ПРИЛАДИ</div>
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
                    <div class="page-title"><span id="currentWindowTitle">МАПА</span></div>
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
                                <span>${currentUser ? currentUser.email : 'Користувач'}</span>
                                <span>▼</span>
                            </button>
                            <div class="user-dropdown hidden" id="userDropdown">
                                <div class="dropdown-header">${currentUser ? currentUser.email : 'user@example.com'}</div>
                                <div class="dropdown-divider"></div>
                                <div class="dropdown-item danger" onclick="logout()"><span>🚪</span> <span id="logoutText">ВИХІД</span></div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="windows-container" id="windowsContainer">
<div id="window-map" class="window active">
                        <div class="window-header">
                            <div class="window-title">🗺️ ІНТЕРАКТИВНА МАПА РАДІАЦІЙНОГО МОНІТОРИНГУ</div>
                            <button class="close-btn" onclick="closeWindow('map')">✕</button>
                        </div>
                        <div class="window-content" id="mapContainer" style="padding: 0;">
                            <div id="workplaceMap" style="height: 550px; width: 100%;"></div>
                        </div>
                    </div>
                    <div id="window-monitoring" class="window">
                        <div class="window-header"><div class="window-title">📊 МОНІТОРИНГ РАДІАЦІЙНОЇ ОБСТАНОВКИ</div><button class="close-btn" onclick="closeWindow('monitoring')">✕</button></div>
                        <div class="filter-bar">
                            <select id="filterDeviceType" class="filter-select" onchange="renderWorkplaces()"><option value="all">Всі прилади</option><option value="gamma">Гама-детектори</option><option value="spectro">Спектрометри</option><option value="vfu">ВФУ</option><option value="weather">Метеостанції</option></select>
                            <select id="filterWorkplace" class="filter-select" onchange="renderWorkplaces()"><option value="all">Всі РМ</option>${workplaces.map(w => `<option value="${w.name}">${w.name}</option>`).join('')}</select>
                            <select id="filterArea" class="filter-select" onchange="renderWorkplaces()"><option value="all">Всі області</option>${uniqueAreas.map(a => `<option value="${a}">${a}</option>`).join('')}</select>
                            <select id="filterStatus" class="filter-select" onchange="renderWorkplaces()"><option value="all">Всі стани</option><option value="normal">Норма</option><option value="warning">Попередження</option><option value="danger">Небезпека</option><option value="critical">Критично</option></select>
                        </div>
                        <div class="workplaces-grid" id="workplacesGrid"></div>
                        <div id="detailPanel" class="detail-panel"></div>
                    </div>
                    <div id="window-devices" class="window">
                        <div class="window-header"><div class="window-title">📡 СПИСОК ВСІХ ПРИЛАДІВ</div><button class="close-btn" onclick="closeWindow('devices')">✕</button></div>
                        <div class="filter-bar">
                            <select id="devFilterType" class="filter-select" onchange="renderFilteredDevices()"><option value="all">Всі типи</option><option value="gamma">Гама-детектори</option><option value="spectro">Спектрометри</option><option value="vfu">ВФУ</option><option value="weather">Метеостанції</option></select>
                            <select id="devFilterWorkplace" class="filter-select" onchange="renderFilteredDevices()"><option value="all">Всі РМ</option>${workplaces.map(w => `<option value="${w.name}">${w.name}</option>`).join('')}</select>
                            <select id="devFilterArea" class="filter-select" onchange="renderFilteredDevices()"><option value="all">Всі області</option>${uniqueAreas.map(a => `<option value="${a}">${a}</option>`).join('')}</select>
                            <select id="devFilterStatus" class="filter-select" onchange="renderFilteredDevices()"><option value="all">Всі стани</option><option value="normal">Норма</option><option value="warning">Попередження</option><option value="danger">Небезпека</option><option value="critical">Критично</option></select>
                        </div>
                        <div style="overflow-x:auto;"><table class="devices-table"><thead><tr><th>ТИП</th><th>НАЗВА</th><th>МОДЕЛЬ</th><th>РМ</th><th>ЛОКАЦІЯ</th><th>ЗНАЧЕННЯ</th><th>СТАН</th><th>ДІЇ</th></tr></thead><tbody id="allDevicesTableBody"></tbody></table></div>
                    </div>
                    <div id="window-users" class="window">
                        <div class="window-header"><div class="window-title">👥 УПРАВЛІННЯ КОРИСТУВАЧАМИ</div><button class="close-btn" onclick="closeWindow('users')">✕</button></div>
                        <div class="window-content">
                            <div class="filter-bar">
                                <button class="btn-primary" onclick="showAddUserModal()" ${!hasPermission('manageUsers') ? 'disabled style="opacity:0.5;"' : ''}>➕ ДОДАТИ КОРИСТУВАЧА</button>
                            </div>
                            <div style="overflow-x:auto;">
                                <table class="permissions-table">
                                    <thead>
                                        <tr><th>ID</th><th>EMAIL</th><th>ПІБ</th><th>РОЛЬ</th><th>СТВОРЕНО</th><th>СТАТУС</th><th>ДІЇ</th></tr>
                                    </thead>
                                    <tbody id="usersListTableBody"></tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    <div id="window-permissions" class="window">
                        <div class="window-header"><div class="window-title">🔐 ПРАВА ДОСТУПУ</div><button class="close-btn" onclick="closeWindow('permissions')">✕</button></div>
                        <div class="window-content" id="permissionsContainer">
                        </div>
                    </div>
                    <div id="window-alarms" class="window">
                        <div class="window-header"><div class="window-title">⚠️ НАЛАШТУВАННЯ ТРИВОГ ПРИЛАДІВ</div><button class="close-btn" onclick="closeWindow('alarms')">✕</button></div>
                        <div class="window-content">
                            <div class="filter-bar" style="flex-wrap:wrap; gap:10px;">
                                <select id="alarmFilterArea" class="filter-select" onchange="applyAlarmFilters()">
                                    <option value="all">🌍 Всі області</option>
                                    ${uniqueAreas.map(a => `<option value="${a}">${a} область</option>`).join('')}
                                </select>
                                <select id="alarmFilterWorkplace" class="filter-select" onchange="applyAlarmFilters()">
                                    <option value="all">🏭 Всі РМ</option>
                                    ${uniqueWorkplaces.map(w => `<option value="${w}">${w}</option>`).join('')}
                                </select>
                                <select id="alarmFilterType" class="filter-select" onchange="applyAlarmFilters()">
                                    <option value="all">📡 Всі типи</option>
                                    <option value="gamma">Гама-детектор</option>
                                    <option value="spectro">Спектрометричний</option>
                                    <option value="vfu">ВФУ</option>
                                    <option value="weather">Метеостанція</option>
                                </select>
                                <select id="alarmFilterStatus" class="filter-select" onchange="applyAlarmFilters()">
                                    <option value="all">🎨 Всі статуси</option>
                                    <option value="normal">🟢 Норма</option>
                                    <option value="warning">🟡 Попередження</option>
                                    <option value="danger">🔴 Небезпека</option>
                                    <option value="critical">❗ Критично</option>
                                </select>
                                <select id="alarmSortBy" class="filter-select" onchange="applyAlarmFilters()">
                                    <option value="type">📊 Сортувати за типом</option>
                                    <option value="current_value">📈 Сортувати за значенням</option>
                                    <option value="warning">⚠️ Сортувати за рівнем попередження</option>
                                    <option value="danger">🔴 Сортувати за рівнем небезпеки</option>
                                    <option value="critical">❗ Сортувати за критичним рівнем</option>
                                </select>
                                <button class="action-btn" onclick="resetAllAlarmSettings()" style="background:#dc2626; color:white;">🔄 Скинути всі налаштування</button>
                            </div>
                            <div style="overflow-x:auto; margin-top:15px;">
                                <table class="devices-table" id="alarmDevicesTable">
                                    <thead>
                                        <tr><th>ID</th><th>Назва</th><th>Тип</th><th>Поточне значення</th><th>Статус</th><th>Рівні тривоги (попередження/небезпека/критично)</th><th>Дія</th></tr>
                                    </thead>
                                    <tbody id="alarmDevicesTableBody"><tr><td colspan="7" style="text-align:center">Завантаження...</td></tr></tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Додаємо CSS для карти
    const style = document.createElement('style');
    style.textContent = `
        .custom-marker {
            background: transparent;
        }
        .map-device-btn:hover {
            background: #3a8aff !important;
        }
        .leaflet-popup-content-wrapper {
            background: #1e1e2e;
            border-radius: 12px;
        }
        .leaflet-popup-tip {
            background: #1e1e2e;
        }
    `;
    document.head.appendChild(style);
    
    renderWorkplaces();
    renderFilteredDevices();
    renderUsersListTable();
    renderPermissionsTable();
    initAdminMenu();
    loadNotifications();
    generateDeviceNotifications();
    loadSavedAlarmSettings();
    updateUserMenuDisplay();
    
    // Ініціалізуємо карту
    setTimeout(() => {
        initMap();
    }, 100);
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
        
        return '<div class="workplace-card"><div class="workplace-header" onclick="toggleWorkplace(\'wp-' + wp.id + '\')"><div><div class="workplace-name">🏭 ' + wp.name + '</div><div class="workplace-location">📍 ' + wp.location + ' (' + wp.area + ')</div></div><span>📡 ' + equipmentList.length + ' приладів ▼</span></div><div class="workplace-equipment" id="wp-' + wp.id + '">' + equipmentList.map(dev => '<div class="equipment-item" onclick="showDeviceDetail(\'' + dev.id + '\')"><div><div class="equipment-name">' + (deviceTypes[dev.type]?.icon || '📡') + ' ' + dev.name + '</div><div style="font-size:11px;color:#8a8a9a;">' + dev.model + '</div></div><div class="equipment-status"><span class="status-dot ' + dev.status + '"></span><span>' + dev.value + ' ' + dev.unit + '</span></div></div>').join('') + '</div></div>';
    }).join('');
}

function showDeviceDetail(deviceId) {
    const device = allDevices.find(d => d.id === deviceId);
    if (!device) return;
    const panel = document.getElementById('detailPanel');
    if (!panel) return;
    panel.style.display = 'block';
    
    let statusText = '';
    if (device.status === 'normal') statusText = '✅ Нормальний';
    else if (device.status === 'warning') statusText = '⚠️ Попередження';
    else if (device.status === 'danger') statusText = '🔴 Небезпека';
    else if (device.status === 'critical') statusText = '❗ Критичний';
    else statusText = device.status;
    
    const warningLevel = device.alarmLevels ? device.alarmLevels.warning : '—';
    const dangerLevel = device.alarmLevels ? device.alarmLevels.danger : '—';
    const criticalLevel = device.alarmLevels ? device.alarmLevels.critical : '—';
    
    panel.innerHTML = `
        <div class="detail-header">
            <div class="detail-title">📊 ${deviceTypes[device.type]?.icon || '📡'} ${device.name} (${device.model})</div>
            <div class="detail-buttons">
                <button onclick="exportDeviceLogs('${device.id}')">📋 Експорт логів</button>
                <button onclick="exportDeviceData('${device.id}')">📊 Експорт даних</button>
                <button onclick="exportToPDF('${device.id}')">📄 Експорт PDF</button>
                <button onclick="simulateError('${device.id}')">⚠️ Симулювати помилку</button>
                <button onclick="document.getElementById('detailPanel').style.display='none'">✕ Закрити</button>
            </div>
        </div>
        <div class="detail-grid">
            <div class="detail-card"><div class="detail-label">Серійний номер</div><div class="detail-value">${device.serial || '—'}</div></div>
            <div class="detail-card"><div class="detail-label">Модель</div><div class="detail-value">${device.model || '—'}</div></div>
            <div class="detail-card"><div class="detail-label">IP адреса</div><div class="detail-value">${device.ip || '—'}:${device.port || '—'}</div></div>
            <div class="detail-card"><div class="detail-label">Канал</div><div class="detail-value">${device.channel || '—'}</div></div>
            <div class="detail-card"><div class="detail-label">Значення</div><div class="detail-value ${device.status}">${device.value} ${device.unit}</div></div>
            <div class="detail-card"><div class="detail-label">Статус</div><div class="detail-value ${device.status}">${statusText}</div></div>
            <div class="detail-card"><div class="detail-label">Рівні тривоги</div><div class="detail-value">
                <span style="color:#fbbf24">⚠️ Попередження: ${warningLevel}</span> | 
                <span style="color:#f87171">🔴 Небезпека: ${dangerLevel}</span> | 
                <span style="color:#ef4444">❗ Критично: ${criticalLevel}</span>
            </div></div>
            <div class="detail-card"><div class="detail-label">Час роботи</div><div class="detail-value">${device.uptime || 0} днів</div></div>
            <div class="detail-card"><div class="detail-label">Помилок</div><div class="detail-value">${device.errors || 0}</div></div>
            <div class="detail-card"><div class="detail-label">РМ</div><div class="detail-value">${device.workplace || '—'}</div></div>
        </div>
        <div class="chart-container">
            <div class="chart-title">📈 Графік роботи (останні 100 вимірювань)</div>
            <canvas id="deviceHistoryChart"></canvas>
        </div>
        <div class="chart-container">
            <div class="chart-title">⏱️ Графік за останню годину (погодинно)</div>
            <canvas id="hourHistoryChart"></canvas>
            <button class="btn-primary" style="margin-top:10px;" onclick="showHourGraph('${device.id}')">🔄 Оновити графік за годину</button>
        </div>
        <div class="logs-panel">
            <div class="logs-title">📋 Журнал подій</div>
            <div id="deviceLogs">${device.logs?.slice().reverse().slice(0,15).map(log => '<div class="log-entry ' + log.type + '">[' + new Date(log.timestamp).toLocaleString() + '] ' + log.type.toUpperCase() + ': ' + log.message + '</div>').join('') || '<div>Немає записів</div>'}</div>
        </div>
    `;
    
    const ctx = document.getElementById('deviceHistoryChart');
    if (ctx && device.history && device.history.length > 0) {
        if (deviceChart) deviceChart.destroy();
        let borderColor = '#4ade80';
        if (device.status === 'warning') borderColor = '#fbbf24';
        else if (device.status === 'danger') borderColor = '#f87171';
        else if (device.status === 'critical') borderColor = '#ef4444';
        deviceChart = new Chart(ctx, {
            type: 'line',
            data: { 
                labels: device.history.map(h => new Date(h.timestamp).toLocaleTimeString()), 
                datasets: [{ 
                    label: device.channel + ' (' + device.unit + ')', 
                    data: device.history.map(h => h.value), 
                    borderColor: borderColor, 
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
    
    const hourCtx = document.getElementById('hourHistoryChart');
    if (hourCtx && device.hourHistory && device.hourHistory.length > 0) {
        if (hourChart) hourChart.destroy();
        hourChart = new Chart(hourCtx, {
            type: 'line',
            data: { 
                labels: device.hourHistory.map(h => h.minute + ' хв'), 
                datasets: [{ 
                    label: device.channel + ' за останню годину (' + device.unit + ')', 
                    data: device.hourHistory.map(h => h.value), 
                    borderColor: '#4a9eff', 
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
    const titles = { map: 'МАПА', monitoring: 'МОНІТОРИНГ', devices: 'ДАТЧИКИ', users: 'КОРИСТУВАЧІ', permissions: 'ПРАВА ДОСТУПУ', alarms: 'НАЛАШТУВАННЯ ТРИВОГ' };
    const titleEl = document.getElementById('currentWindowTitle');
    if (titleEl) titleEl.innerText = titles[id] || 'МАПА';
    if (id === 'users') renderUsersListTable();
    if (id === 'permissions') renderPermissionsTable();
    if (id === 'devices') renderFilteredDevices();
    if (id === 'alarms') loadAlarmDevices();
    if (id === 'map') {
        setTimeout(() => {
            if (map) {
                map.invalidateSize();
            } else {
                initMap();
            }
        }, 100);
    }
}

function closeWindow(id) { 
    const win = document.getElementById('window-' + id);
    if (win) win.classList.add('hidden');
    openWindow('map');
}

function updateUserMenuDisplay() {
    const userMenuBtn = document.querySelector('.user-menu-btn span:first-child');
    if (userMenuBtn && currentUser) {
        userMenuBtn.textContent = currentUser.email ? currentUser.email.charAt(0).toUpperCase() : 'U';
    }
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
        uk: { map: 'МАПА', monitoring: 'МОНІТОРИНГ', devices: 'ДАТЧИКИ', users: 'КОРИСТУВАЧІ', permissions: 'ПРАВА ДОСТУПУ', alarms: 'НАЛАШТУВАННЯ ТРИВОГ', logout: 'ВИХІД' },
        en: { map: 'MAP', monitoring: 'MONITORING', devices: 'DEVICES', users: 'USERS', permissions: 'PERMISSIONS', alarms: 'ALARM SETTINGS', logout: 'LOGOUT' },
        es: { map: 'MAPA', monitoring: 'MONITOREO', devices: 'DISPOSITIVOS', users: 'USUARIOS', permissions: 'PERMISOS', alarms: 'AJUSTES DE ALARMA', logout: 'SALIR' } 
    };
    const navMap = document.querySelector('.nav-item[data-window="map"] .nav-text');
    if (navMap) navMap.innerText = titles[langCode].map;
    const navMonitoring = document.querySelector('.nav-item[data-window="monitoring"] .nav-text');
    if (navMonitoring) navMonitoring.innerText = titles[langCode].monitoring;
    const navDevices = document.querySelector('.nav-item[data-window="devices"] .nav-text');
    if (navDevices) navDevices.innerText = titles[langCode].devices;
    const navUsers = document.querySelector('.nav-item[data-window="users"] .nav-text');
    if (navUsers) navUsers.innerText = titles[langCode].users;
    const navPermissions = document.querySelector('.nav-item[data-window="permissions"] .nav-text');
    if (navPermissions) navPermissions.innerText = titles[langCode].permissions;
    const navAlarms = document.querySelector('.nav-item[data-window="alarms"] .nav-text');
    if (navAlarms) navAlarms.innerText = titles[langCode].alarms;
    const logoutText = document.getElementById('logoutText');
    if (logoutText) logoutText.innerText = titles[langCode].logout;
    const currentTitle = document.getElementById('currentWindowTitle');
    if (currentTitle) currentTitle.innerText = titles[langCode].map;
}

function handleLogin() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    const user = users.find(u => u.email === email);
    
    if (user && user.status === 'active') {
        authToken = 'dummy-token-' + Date.now();
        currentUser = {
            email: user.email,
            full_name: user.full_name,
            role: user.role,
            permissions: roles.find(r => r.id === user.role).permissions
        };
        localStorage.setItem('authToken', authToken);
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        localStorage.setItem('userPermissions', JSON.stringify(currentUser.permissions));
        renderMainApp();
        addNotification('success', '✅ Вхід виконано', `Ласкаво просимо, ${user.full_name || user.email}`);
    } else if (user && user.status === 'inactive') {
        document.getElementById('loginError').style.display = 'block';
        document.getElementById('loginError').innerText = 'Ваш обліковий запис заблоковано. Зверніться до адміністратора.';
        setTimeout(() => document.getElementById('loginError').style.display = 'none', 3000);
    } else {
        document.getElementById('loginError').style.display = 'block';
        document.getElementById('loginError').innerText = 'Невірний логін або пароль';
        setTimeout(() => document.getElementById('loginError').style.display = 'none', 3000);
    }
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

loadRoles();
initUsers();

var savedUser = localStorage.getItem('currentUser');
if (savedUser) {
    currentUser = JSON.parse(savedUser);
    authToken = localStorage.getItem('authToken');
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
window.toggleAdminMenu = toggleAdminMenu;
window.markNotificationRead = markNotificationRead;
window.clearAllNotifications = clearAllNotifications;
window.toggleNotifications = toggleNotifications;
window.renderPermissionsTable = renderPermissionsTable;
window.updatePermission = updatePermission;
window.updateUserRole = updateUserRole;
window.toggleUserStatus = toggleUserStatus;
window.loadAlarmDevices = loadAlarmDevices;
window.applyAlarmFilters = applyAlarmFilters;
window.openAlarmModal = openAlarmModal;
window.closeAlarmModal = closeAlarmModal;
window.saveAlarmLevels = saveAlarmLevels;
window.resetAllAlarmSettings = resetAllAlarmSettings;
window.initMap = initMap;
window.goToDevice = goToDevice;
window.goToWorkplaceDevices = goToWorkplaceDevices;
