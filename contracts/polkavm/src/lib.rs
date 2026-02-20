#![no_std]
#![no_main]

extern crate alloc;

pub mod storage;
pub mod abi;

// Re-export common types for contract modules
pub use uapi as api;
pub use ethabi;
