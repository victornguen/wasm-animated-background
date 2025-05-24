// Test script to verify WASM functionality
console.log('🔍 WASM Module Test Starting...');

// Test basic WASM loading
import init, { AnimationEngine } from './pkg/wasm_animation.js';

async function testWasmModule() {
    try {
        console.log('Loading WASM module...');
        await init();
        
        console.log('Creating AnimationEngine...');
        const engine = new AnimationEngine(800, 600);
        
        console.log('Testing basic operations...');
        console.log('Points count:', engine.get_points_count());
        
        // Test setting target
        engine.set_target(400, 300);
        console.log('Target set successfully');
        
        // Test update function
        console.log('Testing update function...');
        engine.update();
        console.log('Update completed successfully');
        
        // Test getting points
        const point = engine.get_point(0);
        if (point) {
            console.log('First point:', { x: point.x, y: point.y, active: point.active });
        } else {
            console.log('No points found');
        }
        
        // Test closest points
        const closestCount = engine.get_closest_count(0);
        console.log('Closest points for point 0:', closestCount);
        
        if (closestCount > 0) {
            const closestPoint = engine.get_point_closest(0, 0);
            if (closestPoint) {
                console.log('First closest point:', { x: closestPoint.x, y: closestPoint.y });
            }
        }
        
        console.log('✅ All WASM tests passed!');
        return true;
        
    } catch (error) {
        console.error('❌ WASM test failed:', error);
        return false;
    }
}

// Auto-run test when script loads
testWasmModule().then(success => {
    if (success) {
        console.log('🎉 WASM module is working correctly!');
    } else {
        console.log('⚠️  WASM module has issues, will fallback to JavaScript');
    }
});

// Make test function available globally
window.testWasmModule = testWasmModule;
