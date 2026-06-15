from flask import Flask, request, jsonify, send_from_directory, render_template
from flask_cors import CORS
import jwt
import datetime
import sqlite3
import hashlib
import os
import random

app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app)

app.config['SECRET_KEY'] = 'your-secret-key-2024'

# ========== БАЗА ДАНИХ ==========
def init_db():
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            full_name TEXT NOT NULL,
            role TEXT DEFAULT 'user',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS workplaces (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            location TEXT NOT NULL,
            description TEXT,
            created_by INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS devices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            ip TEXT NOT NULL,
            port INTEGER NOT NULL,
            channel TEXT,
            unit TEXT,
            workplace_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS alarm_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            device_id INTEGER NOT NULL UNIQUE,
            threshold REAL DEFAULT 100.0,
            alarm_type TEXT DEFAULT 'value',
            color_status TEXT DEFAULT 'green',
            FOREIGN KEY (device_id) REFERENCES devices (id) ON DELETE CASCADE
        )
    ''')

    cursor.execute("SELECT id FROM devices")
    devices = cursor.fetchall()
    for (device_id,) in devices:
        cursor.execute("SELECT id FROM alarm_settings WHERE device_id = ?", (device_id,))
        if not cursor.fetchone():
            cursor.execute('''
                INSERT INTO alarm_settings (device_id, threshold, alarm_type, color_status)
                VALUES (?, ?, ?, ?)
            ''', (device_id, 100.0, 'value', 'green'))

    conn.commit()
    conn.close()

init_db()

# ========== ДОПОМІЖНІ ФУНКЦІЇ ==========
def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password, hashed):
    return hash_password(password) == hashed

def generate_token(user_id, email, role):
    payload = {
        'user_id': user_id,
        'email': email,
        'role': role,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    }
    return jwt.encode(payload, app.config['SECRET_KEY'], algorithm='HS256')

def decode_token(token):
    try:
        payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        return payload
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None

def get_user_from_token():
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return None
    parts = auth_header.split()
    if parts[0] != 'Bearer' or len(parts) != 2:
        return None
    return decode_token(parts[1])

# ========== МАРШРУТИ АВТОРИЗАЦІЇ ==========
@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    full_name = data.get('full_name')

    if not email or not password or not full_name:
        return jsonify({'error': 'Всі поля обов\'язкові'}), 400

    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    try:
        cursor.execute('''
            INSERT INTO users (email, password, full_name, role)
            VALUES (?, ?, ?, ?)
        ''', (email, hash_password(password), full_name, 'user'))
        conn.commit()
        return jsonify({'message': 'Реєстрація успішна'}), 201
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Email вже існує'}), 400
    finally:
        conn.close()

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')

    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    cursor.execute('SELECT id, email, password, role FROM users WHERE email = ?', (email,))
    user = cursor.fetchone()
    conn.close()

    if user and verify_password(password, user[2]):
        token = generate_token(user[0], user[1], user[3])
        return jsonify({'token': token, 'user': {'id': user[0], 'email': user[1], 'role': user[3]}})
    else:
        return jsonify({'error': 'Невірний email або пароль'}), 401

# ========== МАРШРУТИ РОБОЧИХ МІСЦЬ ТА ПРИЛАДІВ ==========
@app.route('/api/workplaces', methods=['GET', 'POST'])
def workplaces():
    user = get_user_from_token()
    if not user:
        return jsonify({'error': 'Неавторизований'}), 401

    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    if request.method == 'GET':
        cursor.execute('SELECT * FROM workplaces')
        workplaces_list = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return jsonify(workplaces_list)

    if request.method == 'POST':
        data = request.json
        cursor.execute('''
            INSERT INTO workplaces (name, location, description, created_by)
            VALUES (?, ?, ?, ?)
        ''', (data['name'], data['location'], data.get('description', ''), user['user_id']))
        conn.commit()
        new_id = cursor.lastrowid
        conn.close()
        return jsonify({'id': new_id, 'message': 'Робоче місце створено'}), 201

@app.route('/api/devices', methods=['GET', 'POST'])
def devices():
    user = get_user_from_token()
    if not user:
        return jsonify({'error': 'Неавторизований'}), 401

    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    if request.method == 'GET':
        cursor.execute('SELECT * FROM devices')
        devices_list = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return jsonify(devices_list)

    if request.method == 'POST':
        data = request.json
        cursor.execute('''
            INSERT INTO devices (name, type, ip, port, channel, unit, workplace_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (data['name'], data['type'], data['ip'], data['port'], data.get('channel'), data.get('unit'), data.get('workplace_id')))
        conn.commit()
        device_id = cursor.lastrowid
        cursor.execute('''
            INSERT INTO alarm_settings (device_id, threshold, alarm_type, color_status)
            VALUES (?, ?, ?, ?)
        ''', (device_id, 100.0, 'value', 'green'))
        conn.commit()
        conn.close()
        return jsonify({'id': device_id, 'message': 'Прилад додано'}), 201

# ========== МАРШРУТИ ДЛЯ ТРИВОГ ==========
@app.route('/api/devices_with_alarms')
def devices_with_alarms():
    # Для тестування перевірку токена тимчасово вимкнено
    # user = get_user_from_token()
    # if not user:
    #     return jsonify({'error': 'Неавторизований'}), 401

    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute('''
        SELECT d.id, d.name, d.type, d.unit,
               COALESCE(a.threshold, 100.0) as threshold,
               COALESCE(a.alarm_type, 'value') as alarm_type,
               COALESCE(a.color_status, 'green') as color_setting
        FROM devices d
        LEFT JOIN alarm_settings a ON d.id = a.device_id
    ''')
    devices = cursor.fetchall()
    conn.close()

    result = []
    for dev in devices:
        current_value = round(random.uniform(0, dev['threshold'] * 1.5), 2)
        if current_value > dev['threshold']:
            color = 'red'
        elif current_value > dev['threshold'] * 0.7:
            color = 'orange'
        else:
            color = 'green'

        result.append({
            'id': dev['id'],
            'name': dev['name'],
            'type': dev['type'],
            'unit': dev['unit'] or '',
            'current_value': current_value,
            'threshold': dev['threshold'],
            'alarm_type': dev['alarm_type'],
            'color': color,
            'color_setting': dev['color_setting']
        })
    return jsonify(result)

@app.route('/api/alarm_settings/<int:device_id>', methods=['PUT'])
def update_alarm_settings(device_id):
    # Для тестування перевірку токена тимчасово вимкнено
    # user = get_user_from_token()
    # if not user:
    #     return jsonify({'error': 'Неавторизований'}), 401

    data = request.json
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE alarm_settings
        SET threshold = ?, alarm_type = ?, color_status = ?
        WHERE device_id = ?
    ''', (data['threshold'], data['alarm_type'], data['color_status'], device_id))
    if cursor.rowcount == 0:
        cursor.execute('''
            INSERT INTO alarm_settings (device_id, threshold, alarm_type, color_status)
            VALUES (?, ?, ?, ?)
        ''', (device_id, data['threshold'], data['alarm_type'], data['color_status']))
    conn.commit()
    conn.close()
    return jsonify({'status': 'success'})

@app.route('/alarms')
def alarms_page():
    return render_template('alarms.html')

# ========== СТАТИЧНІ ФАЙЛИ ==========
@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('static', path)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5002)