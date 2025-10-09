#!/usr/bin/env bash

# EAS Build pre-install hook
# Bu script, build sırasında parent dizindeki shared klasörünü
# project root'a symlink/copy eder.

set -e

echo "🔧 EAS Build Pre-Install: Monorepo setup başlıyor..."

# Parent directory'deki shared klasörünü kontrol et
if [ -d "../shared" ]; then
  echo "✅ Shared klasörü bulundu: ../shared"
  echo "📦 Shared klasörü workspace root'tan erişilebilir durumda"
else
  echo "⚠️  Uyarı: ../shared klasörü bulunamadı"
fi

# workspace root'u göster
echo "📂 Current directory: $(pwd)"
echo "📂 Parent directory: $(cd .. && pwd)"

# Node modules ve shared klasör bilgisi
echo "📦 Node modules yapısı:"
ls -la node_modules 2>/dev/null | head -5 || echo "node_modules henüz yok"

echo "✅ EAS Build Pre-Install tamamlandı"

