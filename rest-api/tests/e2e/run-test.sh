#!/bin/bash

# Railway'de test çalıştırma script'i
# Kullanım: ./run-test.sh

echo "=== Rektefe E2E Test - Railway ==="
echo ""
echo "Railway URL'inizi girin (örn: https://your-app.railway.app)"
echo "Veya Enter'a basarak localhost kullanın"
read -p "API URL: " RAILWAY_URL

if [ -z "$RAILWAY_URL" ]; then
  RAILWAY_URL="http://localhost:3000"
  echo "Localhost kullanılıyor: $RAILWAY_URL"
else
  echo "Railway URL kullanılıyor: $RAILWAY_URL"
fi

echo ""
echo "Test başlatılıyor..."
echo ""

API_URL="$RAILWAY_URL" ./tests/e2e/test-flow.sh

