
from flask import Flask, render_template, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import json
import random

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Моделі даних
class Device(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    type = db.Column(db.String(50), nullable=False)
    value = db.Column(db.Float, default=0)
    status = db.Column(db.String(20), default='normal')
    updated_at = db.Column(db.DateTime, default=datetime.utcnow)

class AlarmSetting(db.Model):
    __tablename__ = 'alarm_settings'
    id = db.Column(db.Integer, primary_key=True)
    device_id = db.Column(db.Integer, db.ForeignKey('device.id'), nullable=False)
    threshold = db.Column(db.Float, default=100.0)
    alarm_type = db.Column(db.String(20), default='value')
    color_status = db.Column(db.String(20), default='green')
    device = db.relationship('Device', backref='alarm_settings')

# Створення таблиць
with app.app_context():
    db.create_all()
    # Додавання тестових приладів, якщо їх немає
    if Device.query.count() == 0:
        test_devices = [
            Device(name='Gamma Detector 1', type='gamma_detector', value=120.5),
            Device(name='Gamma Detector 2', type='gamma_detector', value=75.2),
            Device(name='Spectrometric 1', type='spectrometric', value=3.8),
            Device(name='VFU 1', type='vfu', value=45.3)
        ]
        for device in test_devices:
            db.session.add(device)
        db.session.commit()
        
        # Додаємо налаштування тривог для тестових приладів
        for device in Device.query.all():
            alarm = AlarmSetting(device_id=device.id, threshold=100.0, alarm_type='value', color_status='green')
            db.session.add(alarm)
        db.session.commit()

# ========== НОВІ МАРШРУТИ ДЛЯ ТРИВОГ ==========

# API: отримати всі прилади з їхніми поточними даними
@app.route('/api/devices')
def api_devices():
    devices = Device.query.all()
    devices_data = []
    for device in devices:
        # Отримуємо налаштування тривоги для приладу
        alarm = AlarmSetting.query.filter_by(device_id=device.id).first()
        threshold = alarm.threshold if alarm else 100.0
        alarm_type = alarm.alarm_type if alarm else 'value'
        color_setting = alarm.color_status if alarm else 'green'
        
        # Визначаємо колір на основі поточного значення
        if device.value > threshold:
            color = 'red'
        elif device.value > threshold * 0.7:
            color = 'orange'
        else:
            color = 'green'
        
        devices_data.append({
            'id': device.id,
            'name': device.name,
            'type': device.type,
            'current_value': device.value,
            'threshold': threshold,
            'alarm_type': alarm_type,
            'color': color,
            'color_setting': color_setting,
            'status': device.status
        })
    return jsonify(devices_data)

# API: отримати всі налаштування тривог
@app.route('/api/alarms')
def api_get_alarms():
    alarms = AlarmSetting.query.all()
    return jsonify([{
        'id': alarm.id,
        'device_id': alarm.device_id,
        'threshold': alarm.threshold,
        'alarm_type': alarm.alarm_type,
        'color_status': alarm.color_status
    } for alarm in alarms])

# API: оновити налаштування тривоги для конкретного приладу
@app.route('/api/alarms/<int:device_id>', methods=['PUT'])
def api_update_alarm(device_id):
    data = request.json
    alarm = AlarmSetting.query.filter_by(device_id=device_id).first()
    if alarm:
        alarm.threshold = data.get('threshold', alarm.threshold)
        alarm.alarm_type = data.get('alarm_type', alarm.alarm_type)
        alarm.color_status = data.get('color_status', alarm.color_status)
        db.session.commit()
        return jsonify({'status': 'success', 'message': 'Налаштування оновлено'})
    return jsonify({'status': 'error', 'message': 'Прилад не знайдено'}), 404

# API: оновити поточне значення приладу (для симуляції)
@app.route('/api/devices/<int:device_id>/value', methods=['POST'])
def update_device_value(device_id):
    data = request.json
    device = Device.query.get(device_id)
    if device:
        device.value = data.get('value', device.value)
        device.updated_at = datetime.utcnow()
        
        # Оновлюємо статус на основі тривоги
        alarm = AlarmSetting.query.filter_by(device_id=device_id).first()
        if alarm and device.value > alarm.threshold:
            device.status = 'alarm'
        elif alarm and device.value > alarm.threshold * 0.7:
            device.status = 'warning'
        else:
            device.status = 'normal'
            
        db.session.commit()
        return jsonify({'status': 'success'})
    return jsonify({'status': 'error'}), 404

# Сторінка керування тривогами
@app.route('/alarms')
def alarms_page():
    return render_template('alarms.html')

# Головна сторінка
@app.route('/')
def index():
    return render_template('index.html')

# Сторінка дашборду
@app.route('/dashboard')
def dashboard():
    return render_template('dashboard.html')

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)

