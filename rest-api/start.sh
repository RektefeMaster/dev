#!/bin/bash

# TypeScript'i JavaScript'e çevir (type checking olmadan)
echo "Converting TypeScript to JavaScript..."
npx tsc --noEmitOnError false --skipLibCheck true --transpileOnly || true

# Eğer dist klasörü yoksa, src'yi direkt çalıştır
if [ ! -d "dist" ]; then
    echo "No dist folder, running TypeScript directly with ts-node-dev..."
    npx ts-node-dev --transpile-only --respawn src/index.ts
else
    echo "Running compiled JavaScript..."
    node dist/rest-api/src/index.js
fi
