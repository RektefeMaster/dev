#!/bin/bash

# Railway Backend Test
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Railway Backend E2E Test${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Railway URL'i environment variable'dan veya parametre olarak al
if [ -n "$1" ]; then
    RAILWAY_API_URL="$1"
elif [ -n "$RAILWAY_API_URL" ]; then
    RAILWAY_API_URL="$RAILWAY_API_URL"
else
    echo -e "${YELLOW}Railway API URL'i gerekli!${NC}"
    echo ""
    echo "Kullanım:"
    echo "  $0 https://your-app.railway.app/api"
    echo ""
    echo "veya environment variable:"
    echo "  export RAILWAY_API_URL=https://your-app.railway.app/api"
    echo "  $0"
    echo ""
    exit 1
fi

echo -e "${BLUE}API URL: $RAILWAY_API_URL${NC}"
echo ""

# Backend kontrolü
echo -e "${YELLOW}[KONTROL] Backend bağlantısı...${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$RAILWAY_API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test","password":"test"}' 2>/dev/null || echo "000")

if [ "$HTTP_CODE" != "000" ] && [ -n "$HTTP_CODE" ]; then
    echo -e "${GREEN}✓ Backend erişilebilir (HTTP $HTTP_CODE)${NC}"
    echo ""
    echo -e "${BLUE}E2E test başlatılıyor...${NC}"
    echo ""
    
    # Test'i çalıştır
    API_BASE_URL="$RAILWAY_API_URL" bash e2e-test-bodywork-flow.sh
else
    echo -e "${RED}✗ Backend erişilemiyor (HTTP $HTTP_CODE)${NC}"
    echo ""
    echo "URL kontrolü:"
    echo "  curl -I $RAILWAY_API_URL/auth/login"
    exit 1
fi
