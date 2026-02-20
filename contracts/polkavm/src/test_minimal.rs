#![no_std]
#![no_main]

extern crate alloc;

use polkavm_derive::polkavm_export;
use uapi::{HostFn, HostFnImpl as api, StorageFlags, ReturnFlags};

// ============ Runtime support ============

#[panic_handler]
fn panic(_info: &core::panic::PanicInfo) -> ! {
    unsafe {
        core::arch::asm!("unimp");
        core::hint::unreachable_unchecked();
    }
}

#[global_allocator]
static ALLOCATOR: simplealloc::SimpleAlloc<8192> = simplealloc::SimpleAlloc::new();

// ============ Storage key ============

fn counter_key() -> [u8; 32] {
    let mut key = [0u8; 32];
    key[0] = 1;
    key
}

// ============ Helper functions ============

fn get_u64(key: &[u8; 32]) -> u64 {
    let mut buf = [0u8; 8];
    api::get_storage(StorageFlags::empty(), key, &mut &mut buf[..]);
    u64::from_le_bytes(buf)
}

fn set_u64(key: &[u8; 32], value: u64) {
    api::set_storage(StorageFlags::empty(), key, &value.to_le_bytes());
}

// ============ Contract functions ============

// Selector: keccak256("increment()") = 0xd09de08a
const SELECTOR_INCREMENT: [u8; 4] = [0xd0, 0x9d, 0xe0, 0x8a];

// Selector: keccak256("getCount()") = 0xa87d942c
const SELECTOR_GET_COUNT: [u8; 4] = [0xa8, 0x7d, 0x94, 0x2c];

fn increment() -> u64 {
    let key = counter_key();
    let count = get_u64(&key);
    let new_count = count + 1;
    set_u64(&key, new_count);
    new_count
}

fn get_count() -> u64 {
    let key = counter_key();
    get_u64(&key)
}

// ============ Dispatcher ============

#[polkavm_export]
pub extern "C" fn call() {
    let mut input = [0u8; 4];
    api::call_data_copy(&mut input, 0);

    let output = match input {
        SELECTOR_INCREMENT => {
            let count = increment();
            count.to_le_bytes().to_vec()
        }
        SELECTOR_GET_COUNT => {
            let count = get_count();
            count.to_le_bytes().to_vec()
        }
        _ => {
            // Unknown selector, return 0
            0u64.to_le_bytes().to_vec()
        }
    };

    api::return_value(ReturnFlags::empty(), &output);
}

#[polkavm_export]
pub extern "C" fn deploy() {
    // Initialize counter to 0
    let key = counter_key();
    set_u64(&key, 0);
}
