// Test runner for pixel-level parity verification between Rust and JS engines
#![allow(dead_code, unused_variables)]
use std::io::{self, Read, Write};

use ditherforge::{
    execute_binary_frame, BinaryProcessHeader,
};

fn main() {
    let mut stdin = io::stdin().lock();
    let mut header_len_bytes = [0u8; 4];
    if stdin.read_exact(&mut header_len_bytes).is_err() {
        eprintln!("Failed to read header len");
        return;
    }
    let header_len = u32::from_le_bytes(header_len_bytes) as usize;
    let mut header_bytes = vec![0u8; header_len];
    if stdin.read_exact(&mut header_bytes).is_err() {
        eprintln!("Failed to read header bytes");
        return;
    }
    let bph: BinaryProcessHeader = match serde_json::from_slice(&header_bytes) {
        Ok(h) => h,
        Err(e) => {
            eprintln!("Failed to parse header JSON: {e}");
            return;
        }
    };

    let total_pixels = (bph.width * bph.height * 4) as usize;
    let mut pixel_data = vec![0u8; total_pixels];
    if stdin.read_exact(&mut pixel_data).is_err() {
        eprintln!("Failed to read pixel data");
        return;
    }

    let out_data = match execute_binary_frame(&bph, &pixel_data) {
        Ok(bytes) => bytes,
        Err(e) => {
            eprintln!("Error in execute_binary_frame: {e}");
            return;
        }
    };

    let mut stdout = io::stdout().lock();
    let _ = stdout.write_all(&out_data);
}
