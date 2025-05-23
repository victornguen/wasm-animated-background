#!/bin/bash

# Build script for WASM animation project

echo "Building WASM module..."
cd wasm_animation && wasm-pack build --target web --out-dir ../pkg

if [ $? -eq 0 ]; then
    echo "WASM build successful!"
    echo "Starting development server..."
    cd .. && npm run dev
else
    echo "WASM build failed!"
    exit 1
fi
