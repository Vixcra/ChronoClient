//! 2D Camera with smooth exponential interpolation and orthographic matrix generation.

use glam::{Mat4, Vec2, Vec3};

#[derive(Debug, Clone)]
pub struct Camera2D {
    pub position: Vec2,
    pub target_position: Vec2,
    pub zoom: f32,
    pub viewport_size: Vec2,
    pub smoothing: f32,
}

impl Camera2D {
    pub fn new(viewport_size: Vec2) -> Self {
        Self {
            position: Vec2::ZERO,
            target_position: Vec2::ZERO,
            zoom: 1.0,
            viewport_size,
            smoothing: 8.0,
        }
    }

    /// Resizes the viewport.
    pub fn resize(&mut self, new_size: Vec2) {
        self.viewport_size = new_size;
    }

    /// Updates camera position, interpolating smoothly toward `target_pos`.
    pub fn update(&mut self, dt: f32, target_pos: Vec2) {
        self.target_position = target_pos;
        let factor = 1.0 - (-self.smoothing * dt).exp();
        self.position = self.position.lerp(self.target_position, factor.clamp(0.0, 1.0));
    }

    /// Snaps camera immediately to target without interpolation.
    pub fn snap_to(&mut self, pos: Vec2) {
        self.position = pos;
        self.target_position = pos;
    }

    /// Converts world coordinates to screen pixel coordinates.
    pub fn world_to_screen(&self, world_pos: Vec2) -> Vec2 {
        (world_pos - self.position) * self.zoom + self.viewport_size * 0.5
    }

    /// Converts screen pixel coordinates to world coordinates.
    pub fn screen_to_world(&self, screen_pos: Vec2) -> Vec2 {
        (screen_pos - self.viewport_size * 0.5) / self.zoom + self.position
    }

    /// Generates a combined Orthographic Projection * View matrix.
    pub fn view_projection_matrix(&self) -> Mat4 {
        let w = self.viewport_size.x.max(1.0);
        let h = self.viewport_size.y.max(1.0);

        // Screen space: (0,0) top-left to (w, h) bottom-right
        let proj = Mat4::orthographic_rh_gl(0.0, w, h, 0.0, -1.0, 1.0);

        let translation = Vec3::new(
            -self.position.x * self.zoom + w * 0.5,
            -self.position.y * self.zoom + h * 0.5,
            0.0,
        );

        let view = Mat4::from_scale_rotation_translation(
            Vec3::new(self.zoom, self.zoom, 1.0),
            glam::Quat::IDENTITY,
            translation,
        );

        proj * view
    }
}
