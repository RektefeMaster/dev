#!/bin/bash

# REKTEFE - KAPSAMLI E2E TEST
# Tüm uygulama fonksiyonlarını baştan sona test eder

BASE_URL="http://localhost:3000"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASSED=0
FAILED=0
TOTAL=0

# Test helper function
run_test() {
    local test_name=$1
    local test_command=$2
    local expected_pattern=$3
    
    TOTAL=$((TOTAL + 1))
    echo -e "${BLUE}📍 Test $TOTAL: $test_name${NC}"
    
    RESULT=$(eval "$test_command" 2>&1)
    
    if echo "$RESULT" | grep -q "$expected_pattern"; then
        echo -e "${GREEN}  ✅ PASS${NC}"
        PASSED=$((PASSED + 1))
        return 0
    else
        echo -e "${RED}  ❌ FAIL${NC}"
        echo -e "${YELLOW}  Response: ${RESULT:0:200}${NC}"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

echo "╔════════════════════════════════════════════════╗"
echo "║   REKTEFE KAPSAMLI E2E TEST SÜİTİ             ║"
echo "╔════════════════════════════════════════════════╗"
echo ""

# ============================================
# BÖLÜM 1: AUTHENTICATION & AUTHORIZATION
# ============================================
echo -e "${BLUE}═══ BÖLÜM 1: AUTHENTICATION ═══${NC}"
echo ""

# Test 1.1: Health Check
run_test "Backend Health Check" \
    "curl -s '$BASE_URL/health'" \
    '"status":"UP"'

# Test 1.2: Mechanic Login
echo ""
MECHANIC_LOGIN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email": "testus@gmail.com", "password": "123", "userType": "mechanic"}')

MECHANIC_TOKEN=$(echo "$MECHANIC_LOGIN" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
MECHANIC_ID=$(echo "$MECHANIC_LOGIN" | grep -o '"userId":"[^"]*' | cut -d'"' -f4)

if [ ! -z "$MECHANIC_TOKEN" ]; then
    TOTAL=$((TOTAL + 1))
    PASSED=$((PASSED + 1))
    echo -e "${BLUE}📍 Test $TOTAL: Mechanic Login${NC}"
    echo -e "${GREEN}  ✅ PASS - Token: ${MECHANIC_TOKEN:0:40}...${NC}"
    echo -e "  UserId: $MECHANIC_ID"
else
    TOTAL=$((TOTAL + 1))
    FAILED=$((FAILED + 1))
    echo -e "${RED}  ❌ FAIL - Login başarısız${NC}"
fi

# Test 1.3: Token Validation
echo ""
run_test "Token Validation - Protected Endpoint" \
    "curl -s '$BASE_URL/api/mechanic/me' -H 'Authorization: Bearer $MECHANIC_TOKEN'" \
    '"success":true'

# ============================================
# BÖLÜM 2: MECHANIC PROFILE & SERVICE CATEGORIES
# ============================================
echo ""
echo -e "${BLUE}═══ BÖLÜM 2: MECHANIC PROFILE ═══${NC}"
echo ""

# Test 2.1: Get Mechanic Profile
PROFILE=$(curl -s "$BASE_URL/api/mechanic/me" -H "Authorization: Bearer $MECHANIC_TOKEN")
SERVICE_CATS=$(echo "$PROFILE" | grep -o '"serviceCategories":\[[^]]*\]')

TOTAL=$((TOTAL + 1))
if [ ! -z "$SERVICE_CATS" ]; then
    echo -e "${BLUE}📍 Test $TOTAL: Get Mechanic Profile${NC}"
    echo -e "${GREEN}  ✅ PASS${NC}"
    echo -e "  ServiceCategories: $SERVICE_CATS"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}  ❌ FAIL${NC}"
    FAILED=$((FAILED + 1))
fi

# Test 2.2: Update Profile
echo ""
run_test "Update Mechanic Profile" \
    "curl -s -X PUT '$BASE_URL/api/mechanic/profile' \
        -H 'Authorization: Bearer $MECHANIC_TOKEN' \
        -H 'Content-Type: application/json' \
        -d '{\"bio\":\"E2E Test Bio\",\"experience\":5}'" \
    '"success":true'

# ============================================
# BÖLÜM 3: MECHANIC SEARCH & FILTERING
# ============================================
echo ""
echo -e "${BLUE}═══ BÖLÜM 3: MECHANIC SEARCH & FILTERING ═══${NC}"
echo ""

# Test 3.1-3.7: ServiceCategory Search Tests
SEARCH_TESTS=(
    "repair:English category search"
    "Tamir:Turkish partial match"
    "Genel Bakım:Full Turkish name"
    "towing:Towing category"
    "çekici:Turkish towing"
    "wash:Wash category"
    "Yıkama:Turkish wash"
)

for TEST in "${SEARCH_TESTS[@]}"; do
    TERM=$(echo $TEST | cut -d':' -f1)
    DESC=$(echo $TEST | cut -d':' -f2)
    echo ""
    run_test "Search: '$TERM' ($DESC)" \
        "curl -s '$BASE_URL/api/mechanic/search?q=$TERM'" \
        '"success":true'
done

# Test 3.8: List All Mechanics
echo ""
run_test "List All Mechanics" \
    "curl -s '$BASE_URL/api/mechanic/all'" \
    '"success":true'

# Test 3.9-3.13: Specialization Filtering
echo ""
SPECIALIZATIONS=("repair" "towing" "wash" "tire" "bodywork")
for SPEC in "${SPECIALIZATIONS[@]}"; do
    echo ""
    run_test "Specialization Filter: $SPEC" \
        "curl -s '$BASE_URL/api/mechanic/list?specialization=$SPEC&limit=10'" \
        '"success":true'
done

# ============================================
# BÖLÜM 4: APPOINTMENTS - SERVICE TYPE VALIDATION
# ============================================
echo ""
echo -e "${BLUE}═══ BÖLÜM 4: APPOINTMENTS - SERVICE TYPE ═══${NC}"
echo ""

# Test 4.1-4.11: Tüm ServiceType'ları Test Et
SERVICE_TYPES=(
    "genel-bakim"
    "agir-bakim"
    "alt-takim"
    "ust-takim"
    "kaporta-boya"
    "elektrik-elektronik"
    "yedek-parca"
    "lastik"
    "egzoz-emisyon"
    "arac-yikama"
    "cekici"
)

for TYPE in "${SERVICE_TYPES[@]}"; do
    echo ""
    APPT_DATE=$(date -u -v+$((RANDOM % 10 + 1))d +%Y-%m-%dT%H:%M:%S.000Z)
    run_test "ServiceType: $TYPE" \
        "curl -s -X POST '$BASE_URL/api/appointments' \
            -H 'Authorization: Bearer $MECHANIC_TOKEN' \
            -H 'Content-Type: application/json' \
            -d '{\"mechanicId\":\"$MECHANIC_ID\",\"serviceType\":\"$TYPE\",\"appointmentDate\":\"$APPT_DATE\",\"timeSlot\":\"10:00-11:00\",\"description\":\"Test $TYPE\"}'" \
        '"success":true'
done

# Test 4.12: Geçersiz ServiceType
echo ""
run_test "Invalid ServiceType Rejection" \
    "curl -s -X POST '$BASE_URL/api/appointments' \
        -H 'Authorization: Bearer $MECHANIC_TOKEN' \
        -H 'Content-Type: application/json' \
        -d '{\"mechanicId\":\"$MECHANIC_ID\",\"serviceType\":\"INVALID_TYPE\",\"appointmentDate\":\"2025-10-20T10:00:00Z\",\"timeSlot\":\"10:00-11:00\",\"description\":\"Test\"}'" \
    'Geçersiz hizmet tipi'

# Test 4.13: Get Appointments List
echo ""
run_test "Get Mechanic Appointments" \
    "curl -s '$BASE_URL/api/appointments/mechanic' -H 'Authorization: Bearer $MECHANIC_TOKEN'" \
    '"success":true'

# Test 4.14: Get Single Appointment
echo ""
APPT_ID=$(curl -s "$BASE_URL/api/appointments/mechanic" -H "Authorization: Bearer $MECHANIC_TOKEN" | grep -o '"_id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ ! -z "$APPT_ID" ]; then
    run_test "Get Appointment Details" \
        "curl -s '$BASE_URL/api/appointments/$APPT_ID' -H 'Authorization: Bearer $MECHANIC_TOKEN'" \
        '"serviceType"'
else
    echo -e "${YELLOW}  ⚠️  Skipped - No appointments found${NC}"
fi

# Test 4.15: Update Appointment Status
echo ""
if [ ! -z "$APPT_ID" ]; then
    run_test "Update Appointment Status" \
        "curl -s -X PUT '$BASE_URL/api/appointments/$APPT_ID/status' \
            -H 'Authorization: Bearer $MECHANIC_TOKEN' \
            -H 'Content-Type: application/json' \
            -d '{\"status\":\"confirmed\"}'" \
        '"success":true'
else
    echo -e "${YELLOW}  ⚠️  Skipped - No appointment ID${NC}"
fi

# ============================================
# BÖLÜM 5: FAULT REPORTS - CATEGORY MAPPING
# ============================================
echo ""
echo -e "${BLUE}═══ BÖLÜM 5: FAULT REPORTS ═══${NC}"
echo ""

# Test 5.1: Get Mechanic Fault Reports (Category Filtering)
run_test "Get Mechanic Fault Reports (Category Filter)" \
    "curl -s '$BASE_URL/api/fault-reports/mechanic' -H 'Authorization: Bearer $MECHANIC_TOKEN'" \
    '"success":true'

# Test 5.2: Get Fault Reports by Status
echo ""
run_test "Fault Reports - Status: pending" \
    "curl -s '$BASE_URL/api/fault-reports/mechanic?status=pending' -H 'Authorization: Bearer $MECHANIC_TOKEN'" \
    '"success":true'

# ============================================
# BÖLÜM 6: VEHICLES
# ============================================
echo ""
echo -e "${BLUE}═══ BÖLÜM 6: VEHICLES ═══${NC}"
echo ""

# Test 6.1: List Vehicles
run_test "List User Vehicles" \
    "curl -s '$BASE_URL/api/vehicles' -H 'Authorization: Bearer $MECHANIC_TOKEN'" \
    '"success":true'

# ============================================
# BÖLÜM 7: MESSAGES & CONVERSATIONS
# ============================================
echo ""
echo -e "${BLUE}═══ BÖLÜM 7: MESSAGES ═══${NC}"
echo ""

# Test 7.1: Get Conversations
run_test "Get Conversations" \
    "curl -s '$BASE_URL/api/messages/conversations' -H 'Authorization: Bearer $MECHANIC_TOKEN'" \
    '"success":true'

# ============================================
# BÖLÜM 8: NOTIFICATIONS
# ============================================
echo ""
echo -e "${BLUE}═══ BÖLÜM 8: NOTIFICATIONS ═══${NC}"
echo ""

# Test 8.1: Get Notifications
run_test "Get Notifications" \
    "curl -s '$BASE_URL/api/notifications' -H 'Authorization: Bearer $MECHANIC_TOKEN'" \
    '"success":true'

# Test 8.2: Notification Settings
echo ""
run_test "Get Notification Settings" \
    "curl -s '$BASE_URL/api/notifications/settings' -H 'Authorization: Bearer $MECHANIC_TOKEN'" \
    '"success":true'

# ============================================
# BÖLÜM 9: WALLET & TEFE POINTS
# ============================================
echo ""
echo -e "${BLUE}═══ BÖLÜM 9: WALLET & TEFE POINTS ═══${NC}"
echo ""

# Test 9.1: Get Wallet Balance
run_test "Get Wallet Balance" \
    "curl -s '$BASE_URL/api/wallet/balance' -H 'Authorization: Bearer $MECHANIC_TOKEN'" \
    '"success":true'

# Test 9.2: Get Wallet Transactions
echo ""
run_test "Get Wallet Transactions" \
    "curl -s '$BASE_URL/api/wallet/transactions' -H 'Authorization: Bearer $MECHANIC_TOKEN'" \
    '"success":true'

# Test 9.3: Get TefePuan Balance
echo ""
run_test "Get TefePuan Balance" \
    "curl -s '$BASE_URL/api/tefe-points/balance' -H 'Authorization: Bearer $MECHANIC_TOKEN'" \
    '"success":true'

# Test 9.4: Get TefePuan History
echo ""
run_test "Get TefePuan History" \
    "curl -s '$BASE_URL/api/tefe-points/history' -H 'Authorization: Bearer $MECHANIC_TOKEN'" \
    '"success":true'

# ============================================
# BÖLÜM 10: MECHANIC EARNINGS
# ============================================
echo ""
echo -e "${BLUE}═══ BÖLÜM 10: MECHANIC EARNINGS ═══${NC}"
echo ""

# Test 10.1: Get Earnings Summary
run_test "Get Earnings Summary" \
    "curl -s '$BASE_URL/api/mechanic-earnings' -H 'Authorization: Bearer $MECHANIC_TOKEN'" \
    '"success":true'

# Test 10.2: Get Withdrawal Requests
echo ""
run_test "Get Withdrawal Requests" \
    "curl -s '$BASE_URL/api/mechanic-earnings/withdrawals' -H 'Authorization: Bearer $MECHANIC_TOKEN'" \
    '"success":true'

# ============================================
# BÖLÜM 11: SPECIAL SERVICES
# ============================================
echo ""
echo -e "${BLUE}═══ BÖLÜM 11: SPECIAL SERVICES ═══${NC}"
echo ""

# Test 11.1: Car Wash Packages
run_test "Get Car Wash Packages" \
    "curl -s '$BASE_URL/api/car-wash/packages'" \
    '"success":true'

# Test 11.2: Tire Hotel Info
echo ""
run_test "Get Tire Hotel Info" \
    "curl -s '$BASE_URL/api/tire-hotel/info' -H 'Authorization: Bearer $MECHANIC_TOKEN'" \
    '"success":true'

# Test 11.3: Bodywork Templates
echo ""
run_test "Get Bodywork Templates" \
    "curl -s '$BASE_URL/api/bodywork/templates' -H 'Authorization: Bearer $MECHANIC_TOKEN'" \
    '"success":true'

# ============================================
# BÖLÜM 12: SERVICE REQUESTS
# ============================================
echo ""
echo -e "${BLUE}═══ BÖLÜM 12: SERVICE REQUESTS ═══${NC}"
echo ""

# Test 12.1: Get Mechanics by Service Type
echo ""
WASH_SERVICE="arac-yikama"
run_test "Get Mechanics for Service: $WASH_SERVICE" \
    "curl -s '$BASE_URL/api/service-requests/mechanics-by-service/$WASH_SERVICE'" \
    '"success":true'

# ============================================
# BÖLÜM 13: RATINGS & REVIEWS
# ============================================
echo ""
echo -e "${BLUE}═══ BÖLÜM 13: RATINGS ═══${NC}"
echo ""

# Test 13.1: Get Mechanic Ratings
run_test "Get Mechanic Ratings" \
    "curl -s '$BASE_URL/api/ratings/mechanic/$MECHANIC_ID'" \
    '"success":true'

# ============================================
# FINAL ÖZET
# ============================================
echo ""
echo "╔════════════════════════════════════════════════╗"
echo "║              TEST SONUÇLARI                    ║"
echo "╠════════════════════════════════════════════════╣"
echo -e "║  ${GREEN}✅ Başarılı: $PASSED${NC}                              ║"
echo -e "║  ${RED}❌ Başarısız: $FAILED${NC}                             ║"
echo -e "║  📊 Toplam: $TOTAL                                  ║"

PERCENTAGE=$((PASSED * 100 / TOTAL))
echo "║  📈 Başarı Oranı: %$PERCENTAGE                        ║"
echo "╚════════════════════════════════════════════════╝"

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 TÜM TESTLER BAŞARILI!${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️  $FAILED test başarısız oldu${NC}"
    exit 1
fi

