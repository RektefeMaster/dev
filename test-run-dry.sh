#!/bin/bash
# Dry-run test - Backend olmadan test komutlarını gösterir

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

API_BASE_URL="${API_BASE_URL:-http://localhost:3000/api}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}DRY-RUN Test - Komutları Göster${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "API URL: $API_BASE_URL"
echo ""
echo -e "${YELLOW}Not: Bu test gerçek API çağrıları yapmaz, sadece komutları gösterir${NC}"
echo ""

echo -e "${BLUE}[TEST 1] Driver Login Komutu${NC}"
echo "curl -X POST \"$API_BASE_URL/auth/login\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"email\": \"driver@test.com\", \"password\": \"test123\"}'"
echo ""

echo -e "${BLUE}[TEST 2] Mechanic Login Komutu${NC}"
echo "curl -X POST \"$API_BASE_URL/auth/login\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"email\": \"mechanic@test.com\", \"password\": \"test123\"}'"
echo ""

echo -e "${BLUE}[TEST 3] Kaporta/Boya Arıza Bildirimi Oluşturma${NC}"
echo "curl -X POST \"$API_BASE_URL/fault-reports\" \\"
echo "  -H \"Authorization: Bearer <driver_token>\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{"
echo "    \"vehicleId\": \"<vehicle_id>\","
echo "    \"serviceCategory\": \"Kaporta/Boya\","
echo "    \"faultDescription\": \"Ön tampon çizik var, boya gerekiyor\","
echo "    \"priority\": \"medium\","
echo "    \"photos\": [\"https://example.com/photo1.jpg\"]"
echo "  }'"
echo ""

echo -e "${BLUE}[TEST 4] Manuel Dönüşüm (Kaporta İşine Dönüştür)${NC}"
echo "curl -X POST \"$API_BASE_URL/fault-reports/<fault_report_id>/convert-to-bodywork-job\" \\"
echo "  -H \"Authorization: Bearer <mechanic_token>\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"mechanicId\": \"<mechanic_id>\"}'"
echo ""

echo -e "${GREEN}Tüm komutlar e2e-test-documentation.md dosyasında detaylı olarak açıklanmıştır.${NC}"
