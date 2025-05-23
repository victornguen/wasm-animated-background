import {gsap} from 'gsap';
import './style.css';

// WASM module will be loaded dynamically
let wasmModule = null;
let animationEngine = null;

document.addEventListener('DOMContentLoaded', async () => {
    let width, height, largeHeader, canvas, ctx, target, animateHeader = true;
    let useWasm = true; // Flag to switch between WASM and JS implementation
    let frameCount = 0;
    let lastTime = performance.now();
    let benchmarkMode = false; // For comparing performance
    let performanceSamples = { wasm: [], js: [] };
    
    // JavaScript fallback implementation - declare points early
    let points = [];

    await initWasm();
    initHeader();
    initAnimation();
    addListeners();
    showPerformanceInfo();

    async function initWasm() {
        try {
            // Try to load WASM module
            wasmModule = await import('../pkg/wasm_animation.js');
            await wasmModule.default(); // Initialize the WASM module
            console.log('WASM module loaded and initialized successfully');
        } catch (error) {
            console.warn('Failed to load WASM module, falling back to JavaScript:', error);
            useWasm = false;
        }
    }

    function initHeader() {
        width = window.innerWidth;
        height = window.innerHeight;
        target = {x: width/2, y: height/2};

        largeHeader = document.getElementById('large-header');
        largeHeader.style.height = height+'px';

        canvas = document.getElementById('demo-canvas');
        canvas.width = width;
        canvas.height = height;
        ctx = canvas.getContext('2d');

        if (useWasm && wasmModule) {
            try {
                // Initialize WASM animation engine using static new method
                console.log('Creating WASM AnimationEngine with dimensions:', width, height);
                animationEngine = wasmModule.AnimationEngine.new(width, height);
                console.log('WASM AnimationEngine created successfully');
                console.log('Using WASM for animation');
                
                // Start GSAP animations for WASM points
                initWasmAnimation();
            } catch (error) {
                console.error('Failed to create WASM AnimationEngine:', error);
                useWasm = false;
                animationEngine = null;
                initJSAnimation();
                console.log('Fell back to JavaScript animation');
            }
        } else {
            // Fallback to JavaScript implementation
            initJSAnimation();
            console.log('Using JavaScript for animation');
        }
    }
    
    function initJSAnimation() {
        points = [];
        for(let x = 0; x < width; x = x + width/20) {
            for(let y = 0; y < height; y = y + height/20) {
                let px = x + Math.random() * width / 20;
                let py = y + Math.random() * height / 20;
                let p = {x: px, originX: px, y: py, originY: py};
                points.push(p);
            }
        }

        // for each point find the 5 closest points
        for(let i = 0; i < points.length; i++) {
            let closest = [];
            let p1 = points[i];
            for(let j = 0; j < points.length; j++) {
                let p2 = points[j]
                if(!(p1 === p2)) {
                    let placed = false;
                    for(let k = 0; k < 5; k++) {
                        if(!placed) {
                            if(closest[k] === undefined) {
                                closest[k] = p2;
                                placed = true;
                            }
                        }
                    }

                    for(let k = 0; k < 5; k++) {
                        if(!placed) {
                            if(getDistance(p1, p2) < getDistance(p1, closest[k])) {
                                closest[k] = p2;
                                placed = true;
                            }
                        }
                    }
                }
            }
            p1.closest = closest;
        }

        // assign a circle to each point
        for(let i in points) {
            points[i].circle = new Circle(points[i], 2 + Math.random() * 2, 'rgba(255,255,255,0.3)');
        }
    }
    
    function initWasmAnimation() {
        // Start GSAP animations for WASM points
        const pointCount = animationEngine.get_points_count();
        for(let i = 0; i < pointCount; i++) {
            shiftWasmPoint(i);
        }
    }

    // Event handling
    function addListeners() {
        if(!('ontouchstart' in window)) {
            window.addEventListener('mousemove', mouseMove);
        }
        window.addEventListener('scroll', ()=>
            animateHeader = document.body.scrollTop <= height
        );
        window.addEventListener('resize', resize);
    }

    function mouseMove(e) {
        let posx = 0;
        let posy = 0;
        if (e.pageX || e.pageY) {
            posx = e.pageX;
            posy = e.pageY;
        }
        else if (e.clientX || e.clientY)    {
            posx = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
            posy = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
        }
        target.x = posx;
        target.y = posy;

        if (useWasm && animationEngine) {
            animationEngine.set_target(posx, posy);
        }
    }

    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;
        largeHeader.style.height = height+'px';
        canvas.width = width;
        canvas.height = height;

        if (useWasm && animationEngine) {
            animationEngine.resize(width, height);
        }
    }

    // animation
    function initAnimation() {
        animate();
        if (!useWasm) {
            for(let i in points) {
                shiftPoint(points[i]);
            }
        }
        // WASM animations are started in initWasmAnimation()
    }

    function animate() {
        if(animateHeader) {
            ctx.clearRect(0, 0, width, height);
            
            if (useWasm && animationEngine) {
                try {
                    // WASM animation with error handling
                    animationEngine.update();
                    drawWasmPoints();
                } catch (error) {
                    console.warn('WASM animation failed, falling back to JavaScript:', error);
                    useWasm = false;
                    animationEngine = null;
                    if (points.length === 0) {
                        initJSAnimation();
                    }
                    drawJSPoints();
                }
            } else {
                // JavaScript fallback animation
                drawJSPoints();
            }
            
            frameCount++;
        }
        requestAnimationFrame(animate);
    }

    function drawWasmPoints() {
        if (!animationEngine) {
            console.warn('Animation engine is null in drawWasmPoints');
            return;
        }
        
        try {
            const pointCount = animationEngine.get_points_count();
            
            for (let i = 0; i < pointCount; i++) {
                const point = animationEngine.get_point(i);
                if (!point) continue;

                // Draw connections to closest points (matching original style)
                if (point.active > 0) {
                    const closestCount = animationEngine.get_closest_count(i);
                    for (let j = 0; j < closestCount; j++) {
                        const closestPoint = animationEngine.get_point_closest(i, j);
                        if (closestPoint && closestPoint.active > 0) {
                            ctx.beginPath();
                            ctx.moveTo(point.x, point.y);
                            ctx.lineTo(closestPoint.x, closestPoint.y);
                            ctx.strokeStyle = `rgba(9,210,78,${point.active})`;
                            ctx.stroke();
                        }
                    }
                }

                // Draw circle (matching original style)
                if (point.active > 0) {
                    ctx.beginPath();
                    ctx.arc(point.x, point.y, point.radius, 0, 2 * Math.PI, false);
                    ctx.fillStyle = `rgba(19,99,5,${point.active * 2})`; // Double the alpha for circles like original
                    ctx.fill();
                }
            }
        } catch (error) {
            console.error('Error in drawWasmPoints:', error);
            // Fall back to JavaScript
            useWasm = false;
            animationEngine = null;
            if (points.length === 0) {
                initJSAnimation();
            }
        }
    }

    function drawJSPoints() {
        for(let i in points) {
            // detect points in range
            if(Math.abs(getDistance(target, points[i])) < 4000) {
                points[i].active = 0.3;
                points[i].circle.active = 0.6;
            } else if(Math.abs(getDistance(target, points[i])) < 20000) {
                points[i].active = 0.1;
                points[i].circle.active = 0.3;
            } else if(Math.abs(getDistance(target, points[i])) < 40000) {
                points[i].active = 0.02;
                points[i].circle.active = 0.1;
            } else {
                points[i].active = 0;
                points[i].circle.active = 0;
            }

            drawLines(points[i]);
            points[i].circle.draw();
        }
    }

    function shiftPoint(p) {
        gsap.to(p, {
            duration: 1 + Math.random(),
            x: p.originX - 80 + Math.random() * 99,
            y: p.originY - 20 + Math.random() * 99,
            ease: "circ.inOut",
            onComplete: () => shiftPoint(p)
        });
    }
    
    function shiftWasmPoint(index) {
        if (!animationEngine) return;
        
        const point = animationEngine.get_point(index);
        const originX = point.origin_x;
        const originY = point.origin_y;
        
        // Create a temporary object for GSAP to animate
        const tempPoint = { x: point.x, y: point.y };
        
        gsap.to(tempPoint, {
            duration: 1 + Math.random(),
            x: originX - 80 + Math.random() * 99,
            y: originY - 20 + Math.random() * 99,
            ease: "circ.inOut",
            onUpdate: () => {
                // Update the WASM point position during animation
                if (animationEngine) {
                    animationEngine.update_point_position(index, tempPoint.x, tempPoint.y);
                }
            },
            onComplete: () => shiftWasmPoint(index)
        });
    }

    // Canvas manipulation
    function drawLines(p) {
        if(!p.active) return;
        for(let i in p.closest) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.closest[i].x, p.closest[i].y);
            ctx.strokeStyle = 'rgba(9,210,78,'+ p.active+')';
            ctx.stroke();
        }
    }

    function Circle(pos,rad,color) {
        let _this = this;

        // constructor
        (function() {
            _this.pos = pos || null;
            _this.radius = rad || null;
            _this.color = color || null;
        })();

        this.draw = function() {
            if(!_this.active) return;
            ctx.beginPath();
            ctx.arc(_this.pos.x, _this.pos.y, _this.radius, 0, 2 * Math.PI, false);
            ctx.fillStyle = 'rgba(19,99,5,'+ _this.active+')';
            ctx.fill();
        };
    }

    // Util
    function getDistance(p1, p2) {
        return Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2);
    }

    function showPerformanceInfo() {
        const infoDiv = document.createElement('div');
        infoDiv.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 12px;
            border-radius: 8px;
            font-family: 'Courier New', monospace;
            font-size: 11px;
            z-index: 1000;
            border: 1px solid rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(5px);
        `;
        infoDiv.innerHTML = `
            Engine: <span id="engine-type">${useWasm ? 'WASM (Optimized)' : 'JavaScript (Fallback)'}</span><br>
            FPS: <span id="fps">--</span><br>
            Points: <span id="point-count">--</span><br>
            Avg Frame Time: <span id="frame-time">--</span>ms<br>
            <button id="toggle-engine" style="margin-top: 5px; padding: 3px 6px; font-size: 10px;">
                ${wasmModule ? 'Toggle Engine' : 'WASM Unavailable'}
            </button>
            <button id="benchmark-mode" style="margin-top: 2px; padding: 3px 6px; font-size: 10px;">
                ${benchmarkMode ? 'Stop Benchmark' : 'Start Benchmark'}
            </button>
        `;
        document.body.appendChild(infoDiv);

        // Add toggle functionality
        if (wasmModule) {
            document.getElementById('toggle-engine').addEventListener('click', () => {
                useWasm = !useWasm;
                document.getElementById('engine-type').textContent = 
                    useWasm ? 'WASM (Optimized)' : 'JavaScript (Fallback)';
                
                // Reinitialize the appropriate engine
                if (useWasm && !animationEngine) {
                    animationEngine = wasmModule.AnimationEngine.new(width, height);
                    animationEngine.set_target(target.x, target.y);
                    initWasmAnimation();
                } else if (!useWasm && points.length === 0) {
                    initJSAnimation();
                    for(let i in points) {
                        shiftPoint(points[i]);
                    }
                }
            });

            // Benchmark mode
            document.getElementById('benchmark-mode').addEventListener('click', () => {
                benchmarkMode = !benchmarkMode;
                document.getElementById('benchmark-mode').textContent = 
                    benchmarkMode ? 'Stop Benchmark' : 'Start Benchmark';
                
                if (benchmarkMode) {
                    console.log('🚀 Starting performance benchmark...');
                    performanceSamples = { wasm: [], js: [] };
                } else {
                    const wasmAvg = performanceSamples.wasm.reduce((a, b) => a + b, 0) / performanceSamples.wasm.length;
                    const jsAvg = performanceSamples.js.reduce((a, b) => a + b, 0) / performanceSamples.js.length;
                    console.log(`📊 Benchmark Results:`);
                    console.log(`   WASM avg FPS: ${wasmAvg?.toFixed(1) || 'N/A'}`);
                    console.log(`   JavaScript avg FPS: ${jsAvg?.toFixed(1) || 'N/A'}`);
                    if (wasmAvg && jsAvg) {
                        const improvement = ((wasmAvg - jsAvg) / jsAvg * 100);
                        console.log(`   Performance improvement: ${improvement.toFixed(1)}%`);
                    }
                }
            });
        }

        // Enhanced FPS counter with frame time tracking
        let frameTimeSum = 0;
        let frameSamples = 0;
        setInterval(() => {
            const currentTime = performance.now();
            const fps = Math.round(frameCount * 1000 / (currentTime - lastTime));
            const avgFrameTime = frameTimeSum / Math.max(frameSamples, 1);
            
            document.getElementById('fps').textContent = fps;
            document.getElementById('frame-time').textContent = avgFrameTime.toFixed(2);
            document.getElementById('point-count').textContent = 
                useWasm && animationEngine ? animationEngine.get_points_count() : points.length;
            
            // Store benchmark data
            if (benchmarkMode) {
                if (useWasm) {
                    performanceSamples.wasm.push(fps);
                } else {
                    performanceSamples.js.push(fps);
                }
            }
            
            frameCount = 0;
            frameTimeSum = 0;
            frameSamples = 0;
            lastTime = currentTime;
        }, 1000);

        // Track individual frame times
        let lastFrameTime = performance.now();
        function trackFrameTime() {
            const now = performance.now();
            frameTimeSum += (now - lastFrameTime);
            frameSamples++;
            lastFrameTime = now;
            requestAnimationFrame(trackFrameTime);
        }
        trackFrameTime();
    }
});