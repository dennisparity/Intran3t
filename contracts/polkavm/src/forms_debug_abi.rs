#![no_std]
#![no_main]

extern crate alloc;
use alloc::vec::Vec;

use polkavm_derive::polkavm_export;
use uapi::{HostFn, HostFnImpl as api, ReturnFlags, StorageFlags};

#[panic_handler]
fn panic(_info: &core::panic::PanicInfo) -> ! {
    unsafe {
        core::arch::asm!("unimp");
        core::hint::unreachable_unchecked();
    }
}

#[global_allocator]
static ALLOCATOR: simplealloc::SimpleAlloc<4096> = simplealloc::SimpleAlloc::new();

// Test ABI parsing - same logic as forms_v2
const SEL_STORE: [u8; 4] = [0x18, 0xf8, 0x34, 0x1b]; // storeAbiBytes(bytes)
const SEL_READ: [u8; 4] = [0x6e, 0x23, 0x28, 0xfc];  // readAbiBytes()
const SEL_CHECK_LEN: [u8; 4] = [0xDD, 0xEE, 0xFF, 0x00]; // checkCidLength(bytes) - returns uint256

fn storage_key() -> [u8; 32] {
    [0u8; 32]
}

fn store_bytes(data: &[u8]) {
    api::set_storage(StorageFlags::empty(), &storage_key(), data);
}

fn read_bytes() -> Vec<u8> {
    let mut buf = [0u8; 128];
    match api::get_storage(StorageFlags::empty(), &storage_key(), &mut &mut buf[..]) {
        Ok(_) => {
            let len = buf.iter().rposition(|&b| b != 0).map_or(0, |p| p + 1);
            buf[..len].to_vec()
        }
        Err(_) => Vec::new(),
    }
}

/// Read ABI-encoded `bytes` parameter - EXACT SAME as forms_v2
fn parse_abi_bytes(data: &[u8], word_idx: usize) -> Vec<u8> {
    let ptr_off = word_idx * 32;
    if data.len() < ptr_off + 32 {
        return Vec::new();
    }
    // Read offset (big-endian uint256, last 4 bytes)
    let mut off_arr = [0u8; 4];
    off_arr.copy_from_slice(&data[ptr_off + 28..ptr_off + 32]);
    let offset = u32::from_be_bytes(off_arr) as usize;

    if data.len() < offset + 32 {
        return Vec::new();
    }
    // Read length
    let mut len_arr = [0u8; 4];
    len_arr.copy_from_slice(&data[offset + 28..offset + 32]);
    let length = u32::from_be_bytes(len_arr) as usize;

    let start = offset + 32;
    let end = (start + length).min(data.len());
    if start > data.len() {
        return Vec::new();
    }
    data[start..end].to_vec()
}

/// Encode `bytes` return value - EXACT SAME as forms_v2
fn encode_abi_bytes(data: &[u8]) -> Vec<u8> {
    let padded_len = ((data.len() + 31) / 32) * 32;
    let mut out = alloc::vec![0u8; 64 + padded_len];
    // offset = 0x20
    out[31] = 0x20;
    // length
    let len_bytes = (data.len() as u32).to_be_bytes();
    out[60..64].copy_from_slice(&len_bytes);
    // data
    out[64..64 + data.len()].copy_from_slice(data);
    out
}

#[polkavm_export]
pub extern "C" fn call() {
    let length = api::call_data_size() as usize;
    if length < 4 {
        api::return_value(ReturnFlags::REVERT, b"Too short");
        return;
    }

    let mut selector = [0u8; 4];
    api::call_data_copy(&mut selector, 0);

    let data_len = length.saturating_sub(4).min(1024);
    let data = if data_len > 0 {
        let mut buf = alloc::vec![0u8; data_len];
        api::call_data_copy(&mut buf, 4);
        buf
    } else {
        Vec::new()
    };

    match selector {
        SEL_STORE => {
            // Parse ABI-encoded bytes (same as registerForm)
            let parsed = parse_abi_bytes(&data, 0);
            store_bytes(&parsed);
            api::return_value(ReturnFlags::empty(), b"OK");
        }
        SEL_READ => {
            // Return ABI-encoded bytes (same as getFormCid)
            let stored = read_bytes();
            api::return_value(ReturnFlags::empty(), &encode_abi_bytes(&stored));
        }
        _ => {
            api::return_value(ReturnFlags::REVERT, b"Unknown");
        }
    }
}

#[polkavm_export]
pub extern "C" fn deploy() {}
