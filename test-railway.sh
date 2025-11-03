#!/bin/bash

# ========================================
# Railway Backend Test Script
# ========================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Railway Backend Test${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Railway URL'ini environment variable'dan al veya kullanıcıdan sor
if [ -z "$RAILWAY_API_URL" ]; then
    echo -e "${YELLOW}Railway API URL'i bulunamadı.${NC}"
    echo ""
    echo "Railway URL'inizi girin (örn: https://your-app.railway.app/api)"
    echo "veya environment variable olarak ayarlayın:"
    echo "  export RAILWAY_API_URL=https://your-app.railway.app/api"
    echo ""
    
    # Railway CLI kontrolü
    if command -v railway >/dev/null 2>&1; then
        echo "Railway CLI bulundu, URL'i almaya çalışılıyor..."
        RAILWAY_DOMAIN=$(railway status 2>/dev/null | grep -o 'https://[^ ]*\.railway\.app' | head -1)
        if [ -n "$RAILWAY_DOMAIN" ]; then
            RAILWAY_API_URL="${RAILWAY_DOMAIN}/api"
            echo -e "${GREEN}Railway URL bulundu: $RAILWAY_API_URL${NC}"
        fi
    fi
    
    if [ -z "$RAILWAY_API_URL" ]; then
        read -p "Railway API URL: " RAILWAY_API_URL
    fi
fi

if [ -z "$RAILWAY_API_URL" ]; then
    echo -e "${RED}URL girilmedi, test edilemiyor!${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}API URL: $RAILWAY_API_URL${NC}"
echo ""

# Backend bağlantı testi
echo -e "${YELLOW}[TEST] Backend bağlantısı...${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$RAILWAY_API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test","password":"test"}' 2>/dev/null || echo "000")

if [ "$HTTP_CODE" != "000" ] && [ -n "$HTTP_CODE" ]; then
    echo -e "${GREEN}✓ Backend erişilebilir (HTTP $HTTP_CODE)${NC}"
    echo ""
    
    # Tam test'i çalıştır
    echo -e "${BLUE}Tam E2E test'i başlatılıyor...${NC}"
    echo ""
    API_BASE_URL="$RAILWAY_API_URL" bash e2e-test-bodywork-flow.sh
else
    echo -e "${RED}✗ Backend erişilemiyor (HTTP $HTTP_CODE)${NC}"
    echo ""
    echo "Kontrol edin:"
    echo "1. Railway'de servis çalışıyor mu?"
    echo "2. URL doğru mu? ($RAILWAY_API_URL)"
    echo "3. Port 3000 açık mı?"
    exit 1
fi

