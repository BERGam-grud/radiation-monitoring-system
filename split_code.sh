#!/bin/bash
cd ~/monitoring-system/static

# Виділити стилі
sed -n '/<style>/,/<\/style>/p' index.html | sed '1d;$d' > css/style.css

# Виділити JS
sed -n '/<script>/,/<\/script>/p' index.html | sed '1d;$d' > js/app.js

# Створити новий index.html без стилів та скриптів
cat > index_new.html << 'HTML'
<!DOCTYPE html>
<html lang="uk">
<head>
    <meta charset="UTF-8">
    <title>Система моніторингу радіації</title>
    <link rel="stylesheet" href="css/style.css">
    <script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.sheetjs.com/xlsx-0.20.2/package/dist/xlsx.full.min.js"></script>
</head>
<body>
    <div id="app"></div>
    <script src="js/app.js"></script>
</body>
</html>
HTML

mv index_new.html index.html
echo "✅ Код розділено!"
