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

// Test: Just store some bytes and read them back
const SEL_STORE_BYTES: [u8; 4] = [0x01, 0x02, 0x03, 0x04];
const SEL_READ_BYTES: [u8; 4] = [0x05, 0x06, 0x07, 0x08];

fn storage_key() -> [u8; 32] {
    [0u8; 32]
}

fn store_bytes(data: &[u8]) {
    let key = storage_key();
    api::set_storage(StorageFlags::empty(), &key, data);
}

fn read_bytes() -> Vec<u8> {
    let key = storage_key();
    let mut buf = [0u8; 128];
    match api::get_storage(StorageFlags::empty(), &key, &mut &mut buf[..]) {
        Ok(_) => {
            let len = buf.iter().rposition(|&b| b != 0).map_or(0, |p| p + 1);
            buf[..len].to_vec()
        }
        Err(_) => Vec::new(),
    }
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

    let data_len = length.saturating_sub(4).min(256);
    let data = if data_len > 0 {
        let mut buf = Vec::with_capacity(data_len);
        buf.resize(data_len, 0);
        api::call_data_copy(&mut buf, 4);
        buf
    } else {
        Vec::new()
    };

    match selector {
        SEL_STORE_BYTES => {
            // Just store the raw bytes
            store_bytes(&data);
            api::return_value(ReturnFlags::empty(), b"OK");
        }
        SEL_READ_BYTES => {
            // Read back and return
            let stored = read_bytes();
            api::return_value(ReturnFlags::empty(), &stored);
        }
        _ => {
            api::return_value(ReturnFlags::REVERT, b"Unknown");
        }
    }
}

#[polkavm_export]
pub extern "C" fn deploy() {}
