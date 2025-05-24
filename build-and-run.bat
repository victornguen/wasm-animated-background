@echo off
echo Building WASM module...
cd wasm_animation
wasm-pack build --target web --out-dir ../pkg

if %errorlevel% equ 0 (
    echo WASM build successful!
    echo Starting development server...
    cd ..
    npm run dev
) else (
    echo WASM build failed!
    exit /b 1
)
