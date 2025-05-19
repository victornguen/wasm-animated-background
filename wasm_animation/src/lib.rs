use wasm_bindgen::prelude::*;
use fixed_queue::Vec as LinearVec;
use std::f64;

#[wasm_bindgen]
pub struct Point {
    x: f64,
    y: f64,
    origin_x: f64,
    origin_y: f64,
    closest: LinearVec<[f64; 2], 5>,
}

#[wasm_bindgen]
pub struct AnimationEngine {
    points: Vec<Point>,
    width: f64,
    height: f64,
}

#[wasm_bindgen]
impl AnimationEngine {
    pub fn new(width: f64, height: f64) -> Self {
        // Initialize points similar to JS version
        let mut points = Vec::new();
        let x_step = width / 20.0;
        let y_step = height / 20.0;

        for x in (0..=width as usize).step_by(x_step as usize) {
            for y in (0..=height as usize).step_by(y_step as usize) {
                let px = x as f64 + (js_sys::Math::random() * x_step);
                let py = y as f64 + (js_sys::Math::random() * y_step);
                points.push(Point {
                    x: px,
                    y: py,
                    origin_x: px,
                    origin_y: py,
                    closest: LinearVec::new(),
                });
            }
        }

        // Calculate closest points
        for i in 0..points.len() {
            let mut closest = LinearVec::new();
            for j in 0..points.len() {
                if i != j {
                    let dist = distance_sq(&points[i], &points[j]);
                    closest.push([dist, j as f64]).expect("Failed to push to closest");
                }
            }
            points[i].closest = closest;
        }

        AnimationEngine { points, width, height }
    }

    pub fn update_points(&mut self, target_x: f64, target_y: f64) -> *const Point {
        let target = [target_x, target_y];

        for point in &mut self.points {
            // Calculate position updates using SIMD-optimized operations
            let dx = point.origin_x - point.x;
            let dy = point.origin_y - point.y;
            point.x += dx * 0.1;
            point.y += dy * 0.1;

            // Apply mouse influence
            let mouse_dist = (point.x - target[0]).powi(2) + (point.y - target[1]).powi(2);
            if mouse_dist < 4000.0 {
                point.x += (target[0] - point.x) * 0.01;
                point.y += (target[1] - point.y) * 0.01;
            }
        }

        self.points.as_ptr()
    }
}

fn distance_sq(a: &Point, b: &Point) -> f64 {
    (a.x - b.x).powi(2) + (a.y - b.y).powi(2)
}