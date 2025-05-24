use wasm_bindgen::prelude::*;
use std::f64;

// Import console.log for debugging if needed
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

// Macro for logging
macro_rules! console_log {
    ($($t:tt)*) => (log(&format_args!($($t)*).to_string()))
}

#[wasm_bindgen]
#[derive(Clone)]
pub struct Point {
    x: f64,
    y: f64,
    origin_x: f64,
    origin_y: f64,
    active: f64,
    radius: f64,
    closest_indices: Vec<usize>,
}

#[wasm_bindgen]
impl Point {
    #[wasm_bindgen(getter)]
    pub fn x(&self) -> f64 { self.x }
    
    #[wasm_bindgen(getter)]
    pub fn y(&self) -> f64 { self.y }
    
    #[wasm_bindgen(getter)]
    pub fn active(&self) -> f64 { self.active }
    
    #[wasm_bindgen(getter)]
    pub fn radius(&self) -> f64 { self.radius }
    
    #[wasm_bindgen(getter)]
    pub fn origin_x(&self) -> f64 { self.origin_x }
    
    #[wasm_bindgen(getter)]
    pub fn origin_y(&self) -> f64 { self.origin_y }
    
    pub fn get_closest_indices(&self) -> Vec<usize> {
        self.closest_indices.clone()
    }
}

#[wasm_bindgen]
pub struct AnimationEngine {
    points: Vec<Point>,
    width: f64,
    height: f64,
    target_x: f64,
    target_y: f64,
}

#[wasm_bindgen]
impl AnimationEngine {
    pub fn new(width: f64, height: f64) -> Self {
        let mut points = Vec::new();
        let grid_size = 20.0;
        let x_step = width / grid_size;
        let y_step = height / grid_size;

        // Create points grid
        let mut x = 0.0;
        while x < width {
            let mut y = 0.0;
            while y < height {
                let px = x + js_sys::Math::random() * x_step;
                let py = y + js_sys::Math::random() * y_step;
                points.push(Point {
                    x: px,
                    y: py,
                    origin_x: px,
                    origin_y: py,
                    active: 0.0,
                    radius: 2.0 + js_sys::Math::random() * 2.0,
                    closest_indices: Vec::new(),
                });
                y += y_step;
            }
            x += x_step;
        }

        // Find 5 closest points for each point
        for i in 0..points.len() {
            let mut distances: Vec<(f64, usize)> = Vec::new();
            
            for j in 0..points.len() {
                if i != j {
                    let dist = distance_squared(&points[i], &points[j]);
                    distances.push((dist, j));
                }
            }
            
            // Sort by distance and take 5 closest
            distances.sort_by(|a, b| a.0.partial_cmp(&b.0).unwrap());
            points[i].closest_indices = distances.iter().take(5).map(|(_, idx)| *idx).collect();
        }

        console_log!("WASM Animation Engine initialized with {} points", points.len());

        AnimationEngine { 
            points, 
            width, 
            height,
            target_x: width / 2.0,
            target_y: height / 2.0,
        }
    }

    pub fn set_target(&mut self, x: f64, y: f64) {
        self.target_x = x;
        self.target_y = y;
    }

    pub fn update(&mut self) {
        // Validate engine state before updating
        if self.points.is_empty() {
            return;
        }
        
        // Only update activity levels based on distance to target
        // Point movement will be handled by GSAP on the JavaScript side
        for point in &mut self.points {
            // Calculate distance to mouse/target (using squared distance to avoid sqrt)
            let dist_to_target = distance_squared_coords(point.x, point.y, self.target_x, self.target_y);
            
            // Set activity level based on distance to target (matching original JS thresholds)
            point.active = if dist_to_target < 4000.0 {
                0.3
            } else if dist_to_target < 20000.0 {
                0.1
            } else if dist_to_target < 40000.0 {
                0.02
            } else {
                0.0
            };
        }
    }

    pub fn get_points_count(&self) -> usize {
        self.points.len()
    }

    pub fn get_point(&self, index: usize) -> Point {
        if index >= self.points.len() {
            return Point {
                x: 0.0,
                y: 0.0,
                origin_x: 0.0,
                origin_y: 0.0,
                active: 0.0,
                radius: 0.0,
                closest_indices: Vec::new(),
            };
        }
        self.points.get(index).cloned().unwrap_or_else(|| Point {
            x: 0.0,
            y: 0.0,
            origin_x: 0.0,
            origin_y: 0.0,
            active: 0.0,
            radius: 0.0,
            closest_indices: Vec::new(),
        })
    }

    pub fn get_point_closest(&self, point_index: usize, closest_index: usize) -> Point {
        let default_point = Point {
            x: 0.0,
            y: 0.0,
            origin_x: 0.0,
            origin_y: 0.0,
            active: 0.0,
            radius: 0.0,
            closest_indices: Vec::new(),
        };
        
        if point_index >= self.points.len() {
            return default_point;
        }
        
        if let Some(point) = self.points.get(point_index) {
            if closest_index >= point.closest_indices.len() {
                return default_point;
            }
            if let Some(&closest_idx) = point.closest_indices.get(closest_index) {
                if closest_idx >= self.points.len() {
                    return default_point;
                }
                return self.points.get(closest_idx).cloned().unwrap_or(default_point);
            }
        }
        default_point
    }

    pub fn get_closest_count(&self, point_index: usize) -> usize {
        if point_index >= self.points.len() {
            return 0;
        }
        self.points.get(point_index).map(|p| p.closest_indices.len()).unwrap_or(0)
    }

    pub fn resize(&mut self, width: f64, height: f64) {
        self.width = width;
        self.height = height;
        
        // Update target to center
        self.target_x = width / 2.0;
        self.target_y = height / 2.0;
    }

    pub fn update_point_position(&mut self, index: usize, x: f64, y: f64) {
        if index < self.points.len() {
            self.points[index].x = x;
            self.points[index].y = y;
        }
    }

    // Bulk operations for better performance
    pub fn get_active_points_data(&self) -> Vec<f64> {
        let mut data = Vec::new();
        for point in &self.points {
            if point.active > 0.0 {
                data.push(point.x);
                data.push(point.y);
                data.push(point.active);
                data.push(point.radius);
                // Add closest points count
                data.push(point.closest_indices.len() as f64);
                // Add closest points indices
                for &idx in &point.closest_indices {
                    data.push(idx as f64);
                }
            }
        }
        data
    }
}

#[inline]
fn distance_squared(a: &Point, b: &Point) -> f64 {
    let dx = a.x - b.x;
    let dy = a.y - b.y;
    dx * dx + dy * dy
}

#[inline]
fn distance_squared_coords(x1: f64, y1: f64, x2: f64, y2: f64) -> f64 {
    let dx = x1 - x2;
    let dy = y1 - y2;
    dx * dx + dy * dy
}