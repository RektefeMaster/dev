#!/bin/bash

# Yedek Parça E2E Test Script
# Tüm parts fonksiyonlarını test eder

set -e  # Hata durumunda dur

BASE_URL="${BASE_URL:-http://localhost:3000/api}"
COLOR_GREEN='\033[0;32m'
COLOR_RED='\033[0;31m'
COLOR_YELLOW='\033[1;33m'
COLOR_BLUE='\033[0;34m'
COLOR_RESET='\033[0m'

echo -e "${COLOR_BLUE}========================================${COLOR_RESET}"
echo -e "${COLOR_BLUE}  YEDEK PARÇA E2E TEST BAŞLATIYOR${COLOR_RESET}"
echo -e "${COLOR_BLUE}========================================${COLOR_RESET}"
echo ""

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function
print_test() {
    echo -e "${COLOR_YELLOW}[TEST]${COLOR_RESET} $1"
}

print_success() {
    echo -e "${COLOR_GREEN}✓ PASS${COLOR_RESET} $1"
    ((TESTS_PASSED++))
}

print_error() {
    echo -e "${COLOR_RED}✗ FAIL${COLOR_RESET} $1"
    ((TESTS_FAILED++))
}

print_info() {
    echo -e "${COLOR_BLUE}ℹ INFO${COLOR_RESET} $1"
}

# ============================================
# 0. BACKEND BAĞLANTI KONTROLÜ
# ============================================
print_test "0. Backend bağlantı kontrolü"
HEALTH_CHECK=$(curl -s -w "\n%{http_code}" "$BASE_URL/parts/market?limit=1" 2>/dev/null || echo "")
HTTP_CODE=$(echo "$HEALTH_CHECK" | tail -n1)

if [ -z "$HEALTH_CHECK" ] || [ "$HTTP_CODE" = "000" ]; then
    echo -e "${COLOR_RED}Backend bağlantısı başarısız!${COLOR_RESET}"
    echo "Base URL: $BASE_URL"
    echo ""
    echo "Backend'i başlatmak için:"
    echo "  cd rest-api"
    echo "  npm run dev"
    echo ""
    echo "Veya Railway/Production için:"
    echo "  export BASE_URL='https://your-api-url.com/api'"
    echo "  bash test-parts-e2e.sh"
    exit 1
elif echo "$HEALTH_CHECK" | head -n-1 | grep -q '"success"'; then
    print_success "Backend bağlantısı başarılı"
else
    echo -e "${COLOR_YELLOW}Backend yanıt veriyor ancak beklenmeyen format${COLOR_RESET}"
    print_info "Devam ediliyor..."
fi

# ============================================
# 1. USTA OLARAK LOGIN (MECHANIC)
# ============================================
print_test "1.1 Usta login (mechanic)"
USTA_LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usta@test.com",
    "password": "Test123!",
    "userType": "mechanic"
  }')

if [ -z "$USTA_LOGIN_RESPONSE" ]; then
    print_error "Backend yanıt vermiyor. Backend çalışıyor mu?"
    echo "Base URL: $BASE_URL"
    exit 1
fi

USTA_TOKEN=$(echo $USTA_LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$USTA_TOKEN" ]; then
    echo "Usta login başarısız. Yeni usta oluşturuluyor..."
    # Register yap
    USTA_REGISTER=$(curl -s -X POST "$BASE_URL/auth/register" \
      -H "Content-Type: application/json" \
      -d '{
        "email": "usta@test.com",
        "password": "Test123!",
        "name": "Test",
        "surname": "Usta",
        "phone": "5551234567",
        "userType": "mechanic"
      }')
    
    USTA_TOKEN=$(echo $USTA_REGISTER | grep -o '"token":"[^"]*' | cut -d'"' -f4)
fi

if [ -z "$USTA_TOKEN" ]; then
    print_error "Usta login/register başarısız"
    echo "Response: $USTA_LOGIN_RESPONSE"
    exit 1
else
    print_success "Usta login başarılı"
    echo "Token: ${USTA_TOKEN:0:20}..."
fi

# ============================================
# 2. ŞÖFÖR OLARAK LOGIN (DRIVER)
# ============================================
print_test "1.2 Şoför login (driver)"
SOFOR_LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "sofor@test.com",
    "password": "Test123!",
    "userType": "driver"
  }')

SOFOR_TOKEN=$(echo $SOFOR_LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$SOFOR_TOKEN" ]; then
    echo "Şoför login başarısız. Yeni şoför oluşturuluyor..."
    SOFOR_REGISTER=$(curl -s -X POST "$BASE_URL/auth/register" \
      -H "Content-Type: application/json" \
      -d '{
        "email": "sofor@test.com",
        "password": "Test123!",
        "name": "Test",
        "surname": "Şoför",
        "phone": "5557654321",
        "userType": "driver"
      }')
    
    SOFOR_TOKEN=$(echo $SOFOR_REGISTER | grep -o '"token":"[^"]*' | cut -d'"' -f4)
fi

if [ -z "$SOFOR_TOKEN" ]; then
    print_error "Şoför login/register başarısız"
    exit 1
else
    print_success "Şoför login başarılı"
    echo "Token: ${SOFOR_TOKEN:0:20}..."
fi

echo ""
echo -e "${COLOR_BLUE}========================================${COLOR_RESET}"
echo -e "${COLOR_BLUE}  USTA İŞLEMLERİ TESTLERİ${COLOR_RESET}"
echo -e "${COLOR_BLUE}========================================${COLOR_RESET}"
echo ""

# ============================================
# 3. PARÇA OLUŞTUR (USTA)
# ============================================
print_test "2.1 Parça oluştur (Usta)"
PART_CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL/parts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USTA_TOKEN" \
  -d '{
    "partName": "Test Fren Balata Seti",
    "brand": "Test Brand",
    "partNumber": "TEST-FB-001",
    "description": "E2E test için oluşturulan parça",
    "photos": [],
    "category": "brake",
    "compatibility": {
      "makeModel": ["Toyota", "Corolla"],
      "years": {
        "start": 2010,
        "end": 2020
      },
      "engine": ["1.6L", "1.8L"],
      "notes": "Test uyumluluk notu"
    },
    "stock": {
      "quantity": 50,
      "lowThreshold": 10
    },
    "pricing": {
      "unitPrice": 500,
      "oldPrice": 600,
      "currency": "TRY",
      "isNegotiable": true
    },
    "condition": "new",
    "warranty": {
      "months": 12,
      "description": "1 yıl garanti"
    },
    "isPublished": true
  }')

PART_ID=$(echo $PART_CREATE_RESPONSE | grep -o '"_id":"[^"]*' | head -1 | cut -d'"' -f4)

if echo "$PART_CREATE_RESPONSE" | grep -q '"success":true'; then
    print_success "Parça oluşturuldu (ID: $PART_ID)"
else
    print_error "Parça oluşturulamadı"
    echo "Response: $PART_CREATE_RESPONSE"
    exit 1
fi

# ============================================
# 4. USTA PARÇALARINI LİSTELE
# ============================================
print_test "2.2 Usta parçalarını listele"
USTA_PARTS_RESPONSE=$(curl -s -X GET "$BASE_URL/parts/mechanic" \
  -H "Authorization: Bearer $USTA_TOKEN")

if echo "$USTA_PARTS_RESPONSE" | grep -q '"success":true'; then
    print_success "Usta parçaları listelendi"
else
    print_error "Usta parçaları listelenemedi"
    echo "Response: $USTA_PARTS_RESPONSE"
fi

# ============================================
# 5. PARÇA GÜNCELLE (USTA)
# ============================================
print_test "2.3 Parça güncelle (Usta)"
PART_UPDATE_RESPONSE=$(curl -s -X PUT "$BASE_URL/parts/$PART_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USTA_TOKEN" \
  -d '{
    "partName": "Test Fren Balata Seti (Güncellenmiş)",
    "pricing": {
      "unitPrice": 450,
      "oldPrice": 600,
      "currency": "TRY",
      "isNegotiable": true
    },
    "stock": {
      "quantity": 60,
      "lowThreshold": 10
    }
  }')

if echo "$PART_UPDATE_RESPONSE" | grep -q '"success":true'; then
    print_success "Parça güncellendi"
else
    print_error "Parça güncellenemedi"
    echo "Response: $PART_UPDATE_RESPONSE"
fi

echo ""
echo -e "${COLOR_BLUE}========================================${COLOR_RESET}"
echo -e "${COLOR_BLUE}  MARKET İŞLEMLERİ TESTLERİ (PUBLIC)${COLOR_RESET}"
echo -e "${COLOR_BLUE}========================================${COLOR_RESET}"
echo ""

# ============================================
# 6. MARKETTE PARÇA ARA (PUBLIC)
# ============================================
print_test "3.1 Markette parça ara (public)"
MARKET_SEARCH_RESPONSE=$(curl -s -X GET "$BASE_URL/parts/market?query=Test&page=1&limit=10")

if echo "$MARKET_SEARCH_RESPONSE" | grep -q '"success":true'; then
    print_success "Market arama başarılı"
else
    print_error "Market arama başarısız"
    echo "Response: $MARKET_SEARCH_RESPONSE"
fi

# ============================================
# 7. PARÇA DETAYINI GETİR (PUBLIC)
# ============================================
print_test "3.2 Parça detayını getir (public)"
PART_DETAIL_RESPONSE=$(curl -s -X GET "$BASE_URL/parts/$PART_ID")

if echo "$PART_DETAIL_RESPONSE" | grep -q '"success":true'; then
    print_success "Parça detayı getirildi"
else
    print_error "Parça detayı getirilemedi"
    echo "Response: $PART_DETAIL_RESPONSE"
fi

echo ""
echo -e "${COLOR_BLUE}========================================${COLOR_RESET}"
echo -e "${COLOR_BLUE}  ŞÖFÖR İŞLEMLERİ TESTLERİ${COLOR_RESET}"
echo -e "${COLOR_BLUE}========================================${COLOR_RESET}"
echo ""

# ============================================
# 8. REZERVASYON OLUŞTUR (ŞÖFÖR)
# ============================================
print_test "4.1 Rezervasyon oluştur (Şoför)"
if [ -z "$PART_ID" ] || [ "$PART_ID" = "unknown" ]; then
    print_error "Rezervasyon oluşturulamadı (PART_ID yok)"
    RESERVATION_ID="unknown"
else
    RESERVATION_CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL/parts/reserve" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $SOFOR_TOKEN" \
      -d '{
        "partId": "'$PART_ID'",
        "quantity": 2,
        "delivery": {
          "method": "standard",
          "address": "Test Adresi, Test Mahallesi, Test Şehir"
        },
        "payment": {
          "method": "cash"
        }
      }')

    RESERVATION_ID=$(echo $RESERVATION_CREATE_RESPONSE | grep -o '"_id":"[^"]*' | head -1 | cut -d'"' -f4)

    if echo "$RESERVATION_CREATE_RESPONSE" | grep -q '"success":true'; then
        print_success "Rezervasyon oluşturuldu (ID: $RESERVATION_ID)"
        # Stok güncellemesini kontrol et
        STOCK_INFO=$(echo $RESERVATION_CREATE_RESPONSE | grep -o '"stock"[^}]*')
        if [ ! -z "$STOCK_INFO" ]; then
            print_info "Stok güncellendi: $STOCK_INFO"
        fi
    else
        print_error "Rezervasyon oluşturulamadı"
        echo "Response: $RESERVATION_CREATE_RESPONSE"
        # Devam et, belki rezervasyon zaten var veya stok yetersiz
        RESERVATION_ID="unknown"
    fi
fi

# ============================================
# 9. ŞÖFÖR REZERVASYONLARINI LİSTELE
# ============================================
print_test "4.2 Şoför rezervasyonlarını listele"
SOFOR_RESERVATIONS_RESPONSE=$(curl -s -X GET "$BASE_URL/parts/my-reservations" \
  -H "Authorization: Bearer $SOFOR_TOKEN")

if echo "$SOFOR_RESERVATIONS_RESPONSE" | grep -q '"success":true'; then
    print_success "Şoför rezervasyonları listelendi"
    # Rezervasyon ID'yi güncelle
    if [ "$RESERVATION_ID" = "unknown" ]; then
        RESERVATION_ID=$(echo $SOFOR_RESERVATIONS_RESPONSE | grep -o '"_id":"[^"]*' | head -1 | cut -d'"' -f4)
    fi
else
    print_error "Şoför rezervasyonları listelenemedi"
    echo "Response: $SOFOR_RESERVATIONS_RESPONSE"
fi

# ============================================
# 10. PAZARLIK TEKLİFİ GÖNDER (ŞÖFÖR)
# ============================================
if [ "$RESERVATION_ID" != "unknown" ]; then
    print_test "4.3 Pazarlık teklifi gönder (Şoför)"
    NEGOTIATE_RESPONSE=$(curl -s -X POST "$BASE_URL/parts/reservations/$RESERVATION_ID/negotiate" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $SOFOR_TOKEN" \
      -d '{
        "requestedPrice": 700,
        "message": "E2E test pazarlık teklifi"
      }')

    if echo "$NEGOTIATE_RESPONSE" | grep -q '"success":true'; then
        print_success "Pazarlık teklifi gönderildi"
    else
        print_error "Pazarlık teklifi gönderilemedi"
        echo "Response: $NEGOTIATE_RESPONSE"
    fi
else
    print_test "4.3 Pazarlık teklifi gönder (Şoför) - SKIPPED (rezervasyon yok)"
fi

echo ""
echo -e "${COLOR_BLUE}========================================${COLOR_RESET}"
echo -e "${COLOR_BLUE}  USTA REZERVASYON İŞLEMLERİ${COLOR_RESET}"
echo -e "${COLOR_BLUE}========================================${COLOR_RESET}"
echo ""

# ============================================
# 11. USTA REZERVASYONLARINI LİSTELE
# ============================================
print_test "5.1 Usta rezervasyonlarını listele"
USTA_RESERVATIONS_RESPONSE=$(curl -s -X GET "$BASE_URL/parts/mechanic/reservations?status=pending" \
  -H "Authorization: Bearer $USTA_TOKEN")

if echo "$USTA_RESERVATIONS_RESPONSE" | grep -q '"success":true'; then
    print_success "Usta rezervasyonları listelendi"
    # Rezervasyon ID'yi güncelle
    if [ "$RESERVATION_ID" = "unknown" ]; then
        RESERVATION_ID=$(echo $USTA_RESERVATIONS_RESPONSE | grep -o '"_id":"[^"]*' | head -1 | cut -d'"' -f4)
    fi
else
    print_error "Usta rezervasyonları listelenemedi"
    echo "Response: $USTA_RESERVATIONS_RESPONSE"
fi

# ============================================
# 12. PAZARLIK YANITI (USTA - KABUL)
# ============================================
if [ "$RESERVATION_ID" != "unknown" ]; then
    print_test "5.2 Pazarlık yanıtı - KABUL ET (Usta)"
    NEGOTIATE_ACCEPT_RESPONSE=$(curl -s -X POST "$BASE_URL/parts/reservations/$RESERVATION_ID/negotiation-response" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $USTA_TOKEN" \
      -d '{
        "action": "accept"
      }')

    if echo "$NEGOTIATE_ACCEPT_RESPONSE" | grep -q '"success":true'; then
        print_success "Pazarlık teklifi kabul edildi"
    else
        print_error "Pazarlık teklifi kabul edilemedi"
        echo "Response: $NEGOTIATE_ACCEPT_RESPONSE"
    fi
else
    print_test "5.2 Pazarlık yanıtı - SKIPPED (rezervasyon yok)"
fi

# ============================================
# 13. YENİ REZERVASYON OLUŞTUR (PAZARLIK İÇİN)
# ============================================
print_test "5.3 Yeni rezervasyon oluştur (pazarlık testi için)"
if [ -z "$PART_ID" ] || [ "$PART_ID" = "unknown" ]; then
    print_test "5.3-5.4 Pazarlık karşı teklif testi - SKIPPED (PART_ID yok)"
    RESERVATION_ID_2=""
else
    RESERVATION_CREATE_2_RESPONSE=$(curl -s -X POST "$BASE_URL/parts/reserve" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $SOFOR_TOKEN" \
      -d '{
        "partId": "'$PART_ID'",
        "quantity": 1,
        "delivery": {
          "method": "pickup"
        },
        "payment": {
          "method": "cash"
        }
      }')

    RESERVATION_ID_2=$(echo $RESERVATION_CREATE_2_RESPONSE | grep -o '"_id":"[^"]*' | head -1 | cut -d'"' -f4)

    if echo "$RESERVATION_CREATE_2_RESPONSE" | grep -q '"success":true'; then
        print_success "İkinci rezervasyon oluşturuldu (ID: $RESERVATION_ID_2)"
        
        # Pazarlık gönder
        sleep 1
        curl -s -X POST "$BASE_URL/parts/reservations/$RESERVATION_ID_2/negotiate" \
          -H "Content-Type: application/json" \
          -H "Authorization: Bearer $SOFOR_TOKEN" \
          -d '{
            "requestedPrice": 350,
            "message": "E2E test pazarlık 2"
          }' > /dev/null
        
        sleep 1
        
        # Karşı teklif gönder
        print_test "5.4 Pazarlık yanıtı - KARŞI TEKLİF GÖNDER (Usta)"
        COUNTER_OFFER_RESPONSE=$(curl -s -X POST "$BASE_URL/parts/reservations/$RESERVATION_ID_2/negotiation-response" \
          -H "Content-Type: application/json" \
          -H "Authorization: Bearer $USTA_TOKEN" \
          -d '{
            "action": "reject",
            "counterPrice": 400
          }')

        if echo "$COUNTER_OFFER_RESPONSE" | grep -q '"success":true'; then
            print_success "Karşı teklif gönderildi"
        else
            print_error "Karşı teklif gönderilemedi"
            echo "Response: $COUNTER_OFFER_RESPONSE"
        fi
    else
        print_error "İkinci rezervasyon oluşturulamadı"
        RESERVATION_ID_2=""
    fi
fi

# ============================================
# 14. REZERVASYON ONAYLA (USTA)
# ============================================
if [ "$RESERVATION_ID" != "unknown" ]; then
    print_test "5.5 Rezervasyon onayla (Usta)"
    APPROVE_RESPONSE=$(curl -s -X POST "$BASE_URL/parts/reservations/$RESERVATION_ID/approve" \
      -H "Authorization: Bearer $USTA_TOKEN")

    if echo "$APPROVE_RESPONSE" | grep -q '"success":true'; then
        print_success "Rezervasyon onaylandı"
    else
        print_error "Rezervasyon onaylanamadı (belki zaten onaylanmış)"
        echo "Response: $APPROVE_RESPONSE"
    fi
else
    print_test "5.5 Rezervasyon onayla - SKIPPED"
fi

# ============================================
# 15. REZERVASYON İPTAL (ŞÖFÖR)
# ============================================
if [ "$RESERVATION_ID_2" != "" ]; then
    print_test "5.6 Rezervasyon iptal et (Şoför)"
    CANCEL_RESPONSE=$(curl -s -X POST "$BASE_URL/parts/reservations/$RESERVATION_ID_2/cancel" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $SOFOR_TOKEN" \
      -d '{
        "reason": "E2E test iptal",
        "cancelledBy": "buyer"
      }')

    if echo "$CANCEL_RESPONSE" | grep -q '"success":true'; then
        print_success "Rezervasyon iptal edildi"
    else
        print_error "Rezervasyon iptal edilemedi"
        echo "Response: $CANCEL_RESPONSE"
    fi
else
    print_test "5.6 Rezervasyon iptal - SKIPPED"
fi

echo ""
echo -e "${COLOR_BLUE}========================================${COLOR_RESET}"
echo -e "${COLOR_BLUE}  TEST SONUÇLARI${COLOR_RESET}"
echo -e "${COLOR_BLUE}========================================${COLOR_RESET}"
echo ""
echo -e "${COLOR_GREEN}Başarılı Testler: $TESTS_PASSED${COLOR_RESET}"
echo -e "${COLOR_RED}Başarısız Testler: $TESTS_FAILED${COLOR_RESET}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${COLOR_GREEN}✓ TÜM TESTLER BAŞARILI!${COLOR_RESET}"
    exit 0
else
    echo -e "${COLOR_RED}✗ BAZI TESTLER BAŞARISIZ${COLOR_RESET}"
    exit 1
fi

