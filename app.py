from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import jwt
import datetime
import sqlite3
import hashlib
import os

app = Flask(__name__, static_folder='static')
CORS(app)

app.config['SECRET_KEY'] = 'your-secret-key-2024'

# ========== БАЗА ДАНИХ ==========
def init_db():
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    
    # Таблиця користувачів
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
    
    # Таблиця робочих місць
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
    
    # Таблиця приладів
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
    
    # Таблиця доступу до РМ
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS workplace_access (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workplace_id INTEGER,
            user_id INTEGER
        )
    ''')
    
    # Тестові користувачі
    cursor.execute("SELECT * FROM users WHERE email = 'admin@test.com'")
    if not cursor.fetchone():
        cursor.execute(
            "INSERT INTO users (email, password, full_name, role) VALUES (?, ?, ?, ?)",
            ('admin@test.com', hashlib.sha256('admin123'.encode()).hexdigest(), 'Адміністратор', 'admin')
        )
    
    cursor.execute("SELECT * FROM users WHERE email = 'user@test.com'")
    if not cursor.fetchone():
        cursor.execute(
            "INSERT INTO users (email, password, full_name, role) VALUES (?, ?, ?, ?)",
            ('user@test.com', hashlib.sha256('user123'.encode()).hexdigest(), 'Користувач', 'user')
        )
    
    conn.commit()
    conn.close()
    print("✅ База даних ініціалізована")

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def get_user_by_email(email):
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
    user = cursor.fetchone()
    conn.close()
    return user

def get_user_by_id(user_id):
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    conn.close()
    return user

def token_required(f):
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'success': False, 'error': 'Токен відсутній'}), 401
        if token.startswith('Bearer '):
            token = token[7:]
        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            current_user = get_user_by_id(data['user_id'])
            if not current_user:
                return jsonify({'success': False, 'error': 'Користувача не знайдено'}), 401
        except:
            return jsonify({'success': False, 'error': 'Невірний токен'}), 401
        return f(current_user, *args, **kwargs)
    return decorated

# ========== API РОУТИ ==========
@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        
        user = get_user_by_email(email)
        if not user or hash_password(password) != user['password']:
            return jsonify({'success': False, 'error': 'Невірний email або пароль'}), 401
        
        token = jwt.encode({
            'user_id': user['id'],
            'email': user['email'],
            'role': user['role'],
            'exp': datetime.datetime.utcnow() + datetime.timedelta(days=1)
        }, app.config['SECRET_KEY'], algorithm='HS256')
        
        return jsonify({
            'success': True,
            'token': token,
            'user': {
                'id': user['id'],
                'email': user['email'],
                'full_name': user['full_name'],
                'role': user['role']
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/users', methods=['GET'])
@token_required
def get_users(current_user):
    if current_user['role'] != 'admin':
        return jsonify({'success': False, 'error': 'Доступ заборонено'}), 403
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT id, email, full_name, role, created_at FROM users")
    users = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify({'success': True, 'users': users})

@app.route('/api/users/<int:user_id>', methods=['PUT'])
@token_required
def update_user(current_user, user_id):
    if current_user['role'] != 'admin':
        return jsonify({'success': False, 'error': 'Доступ заборонено'}), 403
    
    data = request.get_json()
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    
    updates = []
    params = []
    if 'full_name' in data:
        updates.append("full_name = ?")
        params.append(data['full_name'])
    if 'role' in data:
        updates.append("role = ?")
        params.append(data['role'])
    if 'password' in data and data['password']:
        updates.append("password = ?")
        params.append(hash_password(data['password']))
    
    if updates:
        params.append(user_id)
        cursor.execute(f"UPDATE users SET {', '.join(updates)} WHERE id = ?", params)
        conn.commit()
    
    conn.close()
    return jsonify({'success': True, 'message': 'Користувача оновлено'})

@app.route('/api/users/<int:user_id>', methods=['DELETE'])
@token_required
def delete_user(current_user, user_id):
    if current_user['role'] != 'admin':
        return jsonify({'success': False, 'error': 'Доступ заборонено'}), 403
    if user_id == current_user['id']:
        return jsonify({'success': False, 'error': 'Не можна видалити самого себе'}), 400
    
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
    conn.commit()
    conn.close()
    return jsonify({'success': True, 'message': 'Користувача видалено'})

@app.route('/api/users', methods=['POST'])
@token_required
def create_user(current_user):
    if current_user['role'] != 'admin':
        return jsonify({'success': False, 'error': 'Доступ заборонено'}), 403
    
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    full_name = data.get('full_name')
    role = data.get('role', 'user')
    
    if not email or not password or not full_name:
        return jsonify({'success': False, 'error': 'Всі поля обов\'язкові'}), 400
    
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    
    cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
    if cursor.fetchone():
        conn.close()
        return jsonify({'success': False, 'error': 'Email вже використовується'}), 400
    
    cursor.execute(
        "INSERT INTO users (email, password, full_name, role) VALUES (?, ?, ?, ?)",
        (email, hash_password(password), full_name, role)
    )
    conn.commit()
    conn.close()
    return jsonify({'success': True, 'message': 'Користувача додано'})

@app.route('/api/workplaces', methods=['GET'])
@token_required
def get_workplaces(current_user):
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    if current_user['role'] == 'admin':
        cursor.execute("SELECT * FROM workplaces ORDER BY id")
    else:
        cursor.execute('''
            SELECT w.* FROM workplaces w
            JOIN workplace_access wa ON w.id = wa.workplace_id
            WHERE wa.user_id = ?
            ORDER BY w.id
        ''', (current_user['id'],))
    
    workplaces = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify({'success': True, 'workplaces': workplaces})

@app.route('/api/devices', methods=['GET'])
@token_required
def get_devices(current_user):
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    if current_user['role'] == 'admin':
        cursor.execute('''
            SELECT d.*, w.name as workplace_name 
            FROM devices d
            LEFT JOIN workplaces w ON d.workplace_id = w.id
            ORDER BY d.id
        ''')
    else:
        cursor.execute('''
            SELECT d.*, w.name as workplace_name 
            FROM devices d
            JOIN workplaces w ON d.workplace_id = w.id
            JOIN workplace_access wa ON w.id = wa.workplace_id
            WHERE wa.user_id = ?
            ORDER BY d.id
        ''', (current_user['id'],))
    
    devices = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify({'success': True, 'devices': devices})

@app.route('/')
def serve_index():
    return send_from_directory('static', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('static', path)

@app.route('/favicon.ico')
def favicon():
    return '', 204

if __name__ == '__main__':
    init_db()
    print("\n" + "="*50)
    print("🚀 СЕРВЕР ЗАПУЩЕНО")
    print("="*50)
    print(f"🌐 http://localhost:5002")
    print(f"🔑 admin@test.com / admin123")
    print(f"👤 user@test.com / user123")
    print("="*50 + "\n")
    app.run(debug=True, host='0.0.0.0', port=5002)
