#![no_std]
#![no_main]

extern crate alloc;

pub mod storage;
pub mod abi;

// Re-export common types for contract modules
pub use pallet_revive_uapi as api;
pub use ethabi;
