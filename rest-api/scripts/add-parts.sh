#!/bin/bash

# Backend URL
BASE_URL="https://dev-production-8a3d.up.railway.app/api"

# Önce mechanic olarak login yapın (testydk1@gmail.com veya testydk@gmail.com)
# Aşağıdaki komutları çalıştırın:

# 1. Mechanic Login (serviceCategories: ["parts"] olan bir usta ile)
echo "🔐 Step 1: Mechanic Login"
echo "Email: testydk1@gmail.com"
echo "Password: (mevcut şifre)"
echo ""
echo "curl -X POST $BASE_URL/auth/login \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"email\": \"testydk1@gmail.com\", \"password\": \"YOUR_PASSWORD\"}'"
echo ""
echo "Yukarıdaki komutu çalıştırıp token'ı alın (response.data.token)"
echo "TOKEN değişkenine atayın: export TOKEN='your_token_here'"
echo ""
echo "---"
echo ""

# Token aldıktan sonra aşağıdaki komutları çalıştırın:

# 2. Parça Ekle - Motor Yağı Filtresi
echo "📦 Step 2: Parça Ekle - Motor Yağı Filtresi"
curl -X POST "$BASE_URL/parts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "partName": "Motor Yağı Filtresi",
    "brand": "Bosch",
    "partNumber": "BOS-OF123",
    "description": "Yüksek kaliteli motor yağı filtresi. Tüm 1.6L motorlu araçlar için uygundur.",
    "photos": [],
    "category": "engine",
    "compatibility": {
      "makeModel": ["Toyota", "Corolla", "Honda", "Civic"],
      "years": {
        "start": 2010,
        "end": 2020
      },
      "engine": ["1.6L", "1.8L"],
      "notes": "Tüm 1.6L ve 1.8L motorlu araçlara uyumludur"
    },
    "stock": {
      "quantity": 25,
      "lowThreshold": 5
    },
    "pricing": {
      "unitPrice": 450,
      "oldPrice": 550,
      "currency": "TRY",
      "isNegotiable": true
    },
    "condition": "new",
    "warranty": {
      "months": 12,
      "description": "12 ay garanti"
    },
    "isPublished": true
  }'
echo ""
echo "---"
echo ""

# 3. Parça Ekle - Fren Balata Seti
echo "📦 Step 3: Parça Ekle - Fren Balata Seti"
curl -X POST "$BASE_URL/parts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "partName": "Fren Balata Seti Ön",
    "brand": "Brembo",
    "partNumber": "BRM-FB456",
    "description": "Ön fren balata seti. Yüksek performans ve dayanıklılık.",
    "photos": [],
    "category": "brake",
    "compatibility": {
      "makeModel": ["Audi", "A1", "A3", "BMW", "1 Series"],
      "years": {
        "start": 2015,
        "end": 2024
      },
      "engine": ["1.4L", "1.6L", "2.0L"],
      "notes": "Ön frenler için uygundur"
    },
    "stock": {
      "quantity": 15,
      "lowThreshold": 3
    },
    "pricing": {
      "unitPrice": 1250,
      "currency": "TRY",
      "isNegotiable": false
    },
    "condition": "new",
    "warranty": {
      "months": 24,
      "description": "24 ay garanti, 50.000 km"
    },
    "isPublished": true
  }'
echo ""
echo "---"
echo ""

# 4. Parça Ekle - Alternatör
echo "📦 Step 4: Parça Ekle - Alternatör"
curl -X POST "$BASE_URL/parts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "partName": "Alternatör",
    "brand": "Valeo",
    "partNumber": "VAL-ALT789",
    "description": "Yenilenmiş alternatör. Test edilmiş ve garantilidir.",
    "photos": [],
    "category": "electrical",
    "compatibility": {
      "makeModel": ["Renault", "Clio", "Megane", "Peugeot", "208"],
      "years": {
        "start": 2012,
        "end": 2018
      },
      "engine": ["1.5L DCI", "1.6L"],
      "notes": "Yenilenmiş ürün, 6 ay garanti"
    },
    "stock": {
      "quantity": 8,
      "lowThreshold": 2
    },
    "pricing": {
      "unitPrice": 3200,
      "oldPrice": 4500,
      "currency": "TRY",
      "isNegotiable": true
    },
    "condition": "refurbished",
    "warranty": {
      "months": 6,
      "description": "6 ay garanti"
    },
    "isPublished": true
  }'
echo ""
echo "---"
echo ""

# 5. Parça Ekle - Amortisör Seti
echo "📦 Step 5: Parça Ekle - Amortisör Seti"
curl -X POST "$BASE_URL/parts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "partName": "Amortisör Seti Ön",
    "brand": "Monroe",
    "partNumber": "MON-AMS321",
    "description": "Ön amortisör seti. Konforlu sürüş için ideal.",
    "photos": [],
    "category": "suspension",
    "compatibility": {
      "makeModel": ["Ford", "Focus", "Fiesta", "Opel", "Astra"],
      "years": {
        "start": 2010,
        "end": 2015
      },
      "engine": ["1.4L", "1.6L", "1.8L"],
      "notes": "Ön süspansiyon için komple set"
    },
    "stock": {
      "quantity": 12,
      "lowThreshold": 2
    },
    "pricing": {
      "unitPrice": 2800,
      "currency": "TRY",
      "isNegotiable": true
    },
    "condition": "new",
    "warranty": {
      "months": 18,
      "description": "18 ay garanti"
    },
    "isPublished": true
  }'
echo ""
echo "---"
echo ""

# 6. Parça Ekle - Hava Filtresi
echo "📦 Step 6: Parça Ekle - Hava Filtresi"
curl -X POST "$BASE_URL/parts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "partName": "Hava Filtresi",
    "brand": "Mann",
    "partNumber": "MAN-AF654",
    "description": "Hava filtresi. Motor performansını artırır.",
    "photos": [],
    "category": "engine",
    "compatibility": {
      "makeModel": ["Volkswagen", "Golf", "Polo", "Passat"],
      "years": {
        "start": 2008,
        "end": 2020
      },
      "engine": ["1.4L TSI", "1.6L", "2.0L TDI"],
      "notes": "Tüm VW modelleri için uyumlu"
    },
    "stock": {
      "quantity": 30,
      "lowThreshold": 10
    },
    "pricing": {
      "unitPrice": 180,
      "currency": "TRY",
      "isNegotiable": false
    },
    "condition": "new",
    "isPublished": true
  }'
echo ""
echo "---"
echo ""

# 7. Parça Ekle - Radyatör
echo "📦 Step 7: Parça Ekle - Radyatör"
curl -X POST "$BASE_URL/parts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "partName": "Radyatör",
    "brand": "Nissens",
    "partNumber": "NIS-RAD987",
    "description": "Soğutma radyatörü. Orijinal eşdeğer kalite.",
    "photos": [],
    "category": "cooling",
    "compatibility": {
      "makeModel": ["Mercedes", "C-Class", "E-Class", "BMW", "3 Series"],
      "years": {
        "start": 2014,
        "end": 2022
      },
      "engine": ["2.0L", "2.2L CDI", "3.0L"],
      "notes": "Soğutma sistemi için"
    },
    "stock": {
      "quantity": 6,
      "lowThreshold": 1
    },
    "pricing": {
      "unitPrice": 4500,
      "oldPrice": 5800,
      "currency": "TRY",
      "isNegotiable": true
    },
    "condition": "oem",
    "warranty": {
      "months": 12,
      "description": "12 ay garanti"
    },
    "isPublished": true
  }'
echo ""
echo "---"
echo ""

# 8. Parça Ekle - Debriyaj Seti
echo "📦 Step 8: Parça Ekle - Debriyaj Seti"
curl -X POST "$BASE_URL/parts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "partName": "Debriyaj Seti Komple",
    "brand": "Luk",
    "partNumber": "LUK-CLU147",
    "description": "Komple debriyaj seti. Disk, baskı, bilya dahil.",
    "photos": [],
    "category": "transmission",
    "compatibility": {
      "makeModel": ["Fiat", "Egea", "Linea", "Opel", "Corsa"],
      "years": {
        "start": 2016,
        "end": 2023
      },
      "engine": ["1.4L Fire", "1.6L"],
      "notes": "Manuel şanzıman için komple set"
    },
    "stock": {
      "quantity": 10,
      "lowThreshold": 2
    },
    "pricing": {
      "unitPrice": 3800,
      "currency": "TRY",
      "isNegotiable": true
    },
    "condition": "new",
    "warranty": {
      "months": 24,
      "description": "24 ay garanti"
    },
    "isPublished": true
  }'
echo ""
echo "---"
echo ""

# 9. Parça Ekle - Far Ampulü
echo "📦 Step 9: Parça Ekle - Far Ampulü"
curl -X POST "$BASE_URL/parts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "partName": "Far Ampulü H7",
    "brand": "Osram",
    "partNumber": "OSR-H7-55W",
    "description": "Xenon eşdeğer far ampulü. Daha parlak ışık.",
    "photos": [],
    "category": "exterior",
    "compatibility": {
      "makeModel": ["Genel"],
      "years": {
        "start": 2000,
        "end": 2024
      },
      "notes": "H7 tipi tüm araçlar için uyumlu"
    },
    "stock": {
      "quantity": 50,
      "lowThreshold": 10
    },
    "pricing": {
      "unitPrice": 120,
      "currency": "TRY",
      "isNegotiable": false
    },
    "condition": "new",
    "isPublished": true
  }'
echo ""
echo "---"
echo ""

# 10. Parça Ekle - Viraj Sinyal Ampulü
echo "📦 Step 10: Parça Ekle - Viraj Sinyal Ampulü"
curl -X POST "$BASE_URL/parts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "partName": "Viraj Sinyal Ampulü PY21W",
    "brand": "Philips",
    "partNumber": "PHI-PY21W",
    "description": "Amber renkli viraj sinyal ampulü.",
    "photos": [],
    "category": "exterior",
    "compatibility": {
      "makeModel": ["Genel"],
      "years": {
        "start": 2000,
        "end": 2024
      },
      "notes": "PY21W tipi tüm araçlar için"
    },
    "stock": {
      "quantity": 40,
      "lowThreshold": 10
    },
    "pricing": {
      "unitPrice": 45,
      "currency": "TRY",
      "isNegotiable": false
    },
    "condition": "new",
    "isPublished": true
  }'
echo ""
echo "---"
echo ""

# 11. Parça Ekle - Dizel Filtresi
echo "📦 Step 11: Parça Ekle - Dizel Filtresi"
curl -X POST "$BASE_URL/parts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "partName": "Dizel Yakıt Filtresi",
    "brand": "Mahle",
    "partNumber": "MAH-DF258",
    "description": "Dizel yakıt filtresi. Motor performansı ve yakıt ekonomisi için önemli.",
    "photos": [],
    "category": "fuel",
    "compatibility": {
      "makeModel": ["Peugeot", "308", "3008", "Citroen", "C4"],
      "years": {
        "start": 2013,
        "end": 2019
      },
      "engine": ["1.6L HDI", "2.0L HDI"],
      "notes": "Dizel motorlar için"
    },
    "stock": {
      "quantity": 18,
      "lowThreshold": 5
    },
    "pricing": {
      "unitPrice": 350,
      "oldPrice": 450,
      "currency": "TRY",
      "isNegotiable": true
    },
    "condition": "new",
    "warranty": {
      "months": 12,
      "description": "12 ay garanti"
    },
    "isPublished": true
  }'
echo ""
echo "✅ 11 parça eklendi!"
echo ""
echo "Şimdi PartsMarket sayfasını yenileyin, parçalar görünmelidir."

