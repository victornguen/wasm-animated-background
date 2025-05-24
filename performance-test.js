/**
 * Performance Test Script for WASM vs JavaScript Animation Engines
 * Run this in browser console to perform automated performance testing
 */

async function runPerformanceTest() {
    console.log('🚀 Starting automated performance test...');
    
    const testDuration = 10000; // 10 seconds per test
    const switchDelay = 2000; // 2 seconds between switches
    
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    function collectFPSData(duration) {
        return new Promise(resolve => {
            const fps_samples = [];
            const start_time = performance.now();
            
            function collect() {
                const fps_element = document.getElementById('fps');
                if (fps_element) {
                    const fps = parseInt(fps_element.textContent);
                    if (!isNaN(fps)) {
                        fps_samples.push(fps);
                    }
                }
                
                if (performance.now() - start_time < duration) {
                    setTimeout(collect, 100); // Sample every 100ms
                } else {
                    resolve(fps_samples);
                }
            }
            collect();
        });
    }
    
    try {
        // Test WASM engine
        console.log('📊 Testing WASM engine...');
        const toggleButton = document.getElementById('toggle-engine');
        const currentEngine = document.getElementById('current-engine');
        
        // Ensure we're using WASM
        if (currentEngine.textContent.includes('JavaScript')) {
            toggleButton.click();
            await sleep(switchDelay);
        }
        
        const wasmFPS = await collectFPSData(testDuration);
        const wasmAvg = wasmFPS.reduce((a, b) => a + b, 0) / wasmFPS.length;
        const wasmMin = Math.min(...wasmFPS);
        const wasmMax = Math.max(...wasmFPS);
        
        console.log(`WASM Results: Avg=${wasmAvg.toFixed(1)} Min=${wasmMin} Max=${wasmMax}`);
        
        // Switch to JavaScript engine
        console.log('📊 Testing JavaScript engine...');
        toggleButton.click();
        await sleep(switchDelay);
        
        const jsFPS = await collectFPSData(testDuration);
        const jsAvg = jsFPS.reduce((a, b) => a + b, 0) / jsFPS.length;
        const jsMin = Math.min(...jsFPS);
        const jsMax = Math.max(...jsFPS);
        
        console.log(`JavaScript Results: Avg=${jsAvg.toFixed(1)} Min=${jsMin} Max=${jsMax}`);
        
        // Calculate performance improvement
        const improvement = ((wasmAvg - jsAvg) / jsAvg * 100);
        const consistencyWasm = ((wasmMax - wasmMin) / wasmAvg * 100);
        const consistencyJS = ((jsMax - jsMin) / jsAvg * 100);
        
        console.log('\n📈 PERFORMANCE TEST RESULTS:');
        console.log('==========================================');
        console.log(`WASM Engine:      ${wasmAvg.toFixed(1)} FPS (${wasmMin}-${wasmMax})`);
        console.log(`JavaScript Engine: ${jsAvg.toFixed(1)} FPS (${jsMin}-${jsMax})`);
        console.log(`Performance Gain:  ${improvement.toFixed(1)}%`);
        console.log(`WASM Consistency:  ${(100-consistencyWasm).toFixed(1)}%`);
        console.log(`JS Consistency:    ${(100-consistencyJS).toFixed(1)}%`);
        console.log('==========================================');
        
        if (improvement > 0) {
            console.log('✅ WASM engine shows performance improvement!');
        } else {
            console.log('❌ JavaScript engine is currently faster.');
        }
        
        return {
            wasm: { avg: wasmAvg, min: wasmMin, max: wasmMax, samples: wasmFPS },
            js: { avg: jsAvg, min: jsMin, max: jsMax, samples: jsFPS },
            improvement: improvement,
            wasmConsistency: 100 - consistencyWasm,
            jsConsistency: 100 - consistencyJS
        };
        
    } catch (error) {
        console.error('❌ Performance test failed:', error);
        return null;
    }
}

// Make it available globally
window.runPerformanceTest = runPerformanceTest;

console.log('Performance test script loaded. Run runPerformanceTest() to start.');
