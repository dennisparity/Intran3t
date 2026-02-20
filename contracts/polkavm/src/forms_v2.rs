#![no_std]
#![no_main]

extern crate alloc;
use alloc::vec;
use alloc::vec::Vec;

use polkavm_derive::polkavm_export;
use uapi::{HostFn, HostFnImpl as api, ReturnFlags, StorageFlags};

// ============ Runtime support ============

#[panic_handler]
fn panic(_info: &core::panic::PanicInfo) -> ! {
    unsafe {
        core::arch::asm!("unimp");
        core::hint::unreachable_unchecked();
    }
}

#[global_allocator]
static ALLOCATOR: simplealloc::SimpleAlloc<4096> = simplealloc::SimpleAlloc::new();

// ============ Function selectors (keccak256) ============

const SEL_REGISTER_FORM: [u8; 4] = [0x46, 0xab, 0x8f, 0x3c]; // registerForm(bytes)
const SEL_SUBMIT_RESPONSE: [u8; 4] = [0xae, 0x57, 0xb6, 0x3d]; // submitResponse(uint64,bytes)
const SEL_GET_FORM_CID: [u8; 4] = [0x3e, 0xc6, 0xf3, 0x04]; // getFormCid(uint64)
const SEL_GET_RESPONSE_CID: [u8; 4] = [0xa1, 0xde, 0x25, 0x51]; // getResponseCid(uint64,uint64)
const SEL_FORM_COUNT: [u8; 4] = [0x14, 0x6c, 0x14, 0x15]; // formCount()
const SEL_RESPONSE_COUNT: [u8; 4] = [0xb3, 0x78, 0xe2, 0xc2]; // responseCount(uint64)

// ============ Storage namespaces ============

const NS_FORM_COUNTER: u8 = 0x01;
const NS_FORM_CID: u8 = 0x02;
const NS_FORM_CREATOR: u8 = 0x03;
const NS_RESPONSE_COUNTER: u8 = 0x04;
const NS_RESPONSE_CID: u8 = 0x05;

// ============ Storage key builders ============

fn key_form_counter() -> [u8; 32] {
    let mut k = [0u8; 32];
    k[0] = NS_FORM_COUNTER;
    k
}

fn key_form_cid(form_id: u64) -> [u8; 32] {
    let mut k = [0u8; 32];
    k[0] = NS_FORM_CID;
    k[1..9].copy_from_slice(&form_id.to_le_bytes());
    k
}

fn key_form_creator(form_id: u64) -> [u8; 32] {
    let mut k = [0u8; 32];
    k[0] = NS_FORM_CREATOR;
    k[1..9].copy_from_slice(&form_id.to_le_bytes());
    k
}

fn key_response_counter(form_id: u64) -> [u8; 32] {
    let mut k = [0u8; 32];
    k[0] = NS_RESPONSE_COUNTER;
    k[1..9].copy_from_slice(&form_id.to_le_bytes());
    k
}

fn key_response_cid(form_id: u64, idx: u64) -> [u8; 32] {
    let mut k = [0u8; 32];
    k[0] = NS_RESPONSE_CID;
    k[1..9].copy_from_slice(&form_id.to_le_bytes());
    k[9..17].copy_from_slice(&idx.to_le_bytes());
    k
}

// ============ Storage primitives (same pattern as test_minimal) ============

fn get_u64(key: &[u8; 32]) -> u64 {
    let mut buf = [0u8; 8];
    api::get_storage(StorageFlags::empty(), key, &mut &mut buf[..]);
    u64::from_le_bytes(buf)
}

fn set_u64(key: &[u8; 32], value: u64) {
    api::set_storage(StorageFlags::empty(), key, &value.to_le_bytes());
}

fn get_bytes(key: &[u8; 32]) -> Vec<u8> {
    let mut buf = [0u8; 128];
    match api::get_storage(StorageFlags::empty(), key, &mut &mut buf[..]) {
        Ok(_) => {
            // Find actual length (trim trailing zeros)
            let len = buf.iter().rposition(|&b| b != 0).map_or(0, |p| p + 1);
            buf[..len].to_vec()
        }
        Err(_) => Vec::new(),
    }
}

fn set_bytes(key: &[u8; 32], data: &[u8]) {
    api::set_storage(StorageFlags::empty(), key, data);
}

fn get_caller() -> [u8; 20] {
    let mut caller = [0u8; 20];
    api::caller(&mut caller);
    caller
}

// ============ ABI parsing helpers ============

/// Read a uint64 from ABI-encoded data at the given 32-byte word offset.
fn read_u64(data: &[u8], word: usize) -> u64 {
    let off = word * 32;
    if data.len() < off + 32 {
        return 0;
    }
    // uint64 is right-aligned in 32 bytes — last 8 bytes
    let mut arr = [0u8; 8];
    arr.copy_from_slice(&data[off + 24..off + 32]);
    u64::from_be_bytes(arr)
}

/// Read ABI-encoded `bytes` parameter. Returns the raw byte content.
/// ABI layout: word at `word_idx` contains offset → at that offset: length word → data.
fn read_bytes(data: &[u8], word_idx: usize) -> Vec<u8> {
    let ptr_off = word_idx * 32;
    if data.len() < ptr_off + 32 {
        return Vec::new();
    }
    // Read offset (big-endian uint256, but only last 4 bytes matter)
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

/// Encode a uint256 (from u64) as 32 bytes big-endian.
fn encode_u256(v: u64) -> [u8; 32] {
    let mut out = [0u8; 32];
    out[24..32].copy_from_slice(&v.to_be_bytes());
    out
}

/// Encode `bytes` return value: offset (32) + length (32) + padded data.
fn encode_bytes(data: &[u8]) -> Vec<u8> {
    let padded_len = ((data.len() + 31) / 32) * 32;
    let mut out = vec![0u8; 64 + padded_len];
    // offset = 0x20
    out[31] = 0x20;
    // length
    let len_bytes = (data.len() as u32).to_be_bytes();
    out[60..64].copy_from_slice(&len_bytes);
    // data
    out[64..64 + data.len()].copy_from_slice(data);
    out
}

// ============ Contract functions ============

fn register_form(cid: Vec<u8>) -> u64 {
    if cid.is_empty() || cid.len() > 128 {
        return 0;
    }
    let counter_key = key_form_counter();
    let form_id = get_u64(&counter_key) + 1;
    set_u64(&counter_key, form_id);
    set_bytes(&key_form_cid(form_id), &cid);
    set_bytes(&key_form_creator(form_id), &get_caller());
    form_id
}

fn submit_response(form_id: u64, cid: Vec<u8>) -> u64 {
    if cid.is_empty() || cid.len() > 128 {
        return u64::MAX;
    }
    // Check form exists
    let form_cid = get_bytes(&key_form_cid(form_id));
    if form_cid.is_empty() {
        return u64::MAX;
    }
    let counter_key = key_response_counter(form_id);
    let idx = get_u64(&counter_key);
    set_u64(&counter_key, idx + 1);
    set_bytes(&key_response_cid(form_id, idx), &cid);
    idx
}

fn get_form_cid(form_id: u64) -> Vec<u8> {
    get_bytes(&key_form_cid(form_id))
}

fn get_response_cid(form_id: u64, idx: u64) -> Vec<u8> {
    get_bytes(&key_response_cid(form_id, idx))
}

fn form_count() -> u64 {
    get_u64(&key_form_counter())
}

fn response_count(form_id: u64) -> u64 {
    get_u64(&key_response_counter(form_id))
}

// ============ Dispatcher ============

#[polkavm_export]
pub extern "C" fn call() {
    let length = api::call_data_size() as usize;
    if length < 4 {
        api::return_value(ReturnFlags::REVERT, b"Input too short");
        return;
    }

    let mut selector = [0u8; 4];
    api::call_data_copy(&mut selector, 0);

    // Read remaining calldata on heap (NOT stack — critical for PolkaVM)
    let data_len = length.saturating_sub(4).min(1024);
    let data = if data_len > 0 {
        let mut buf = vec![0u8; data_len];
        api::call_data_copy(&mut buf, 4);
        buf
    } else {
        Vec::new()
    };

    match selector {
        SEL_REGISTER_FORM => {
            let cid = read_bytes(&data, 0);
            let form_id = register_form(cid);
            api::return_value(ReturnFlags::empty(), &encode_u256(form_id));
        }
        SEL_SUBMIT_RESPONSE => {
            let form_id = read_u64(&data, 0);
            let cid = read_bytes(&data, 1);
            let idx = submit_response(form_id, cid);
            api::return_value(ReturnFlags::empty(), &encode_u256(idx));
        }
        SEL_GET_FORM_CID => {
            let form_id = read_u64(&data, 0);
            let cid = get_form_cid(form_id);
            api::return_value(ReturnFlags::empty(), &encode_bytes(&cid));
        }
        SEL_GET_RESPONSE_CID => {
            let form_id = read_u64(&data, 0);
            let idx = read_u64(&data, 1);
            let cid = get_response_cid(form_id, idx);
            api::return_value(ReturnFlags::empty(), &encode_bytes(&cid));
        }
        SEL_FORM_COUNT => {
            let count = form_count();
            api::return_value(ReturnFlags::empty(), &encode_u256(count));
        }
        SEL_RESPONSE_COUNT => {
            let form_id = read_u64(&data, 0);
            let count = response_count(form_id);
            api::return_value(ReturnFlags::empty(), &encode_u256(count));
        }
        _ => {
            api::return_value(ReturnFlags::REVERT, b"Unknown selector");
        }
    }
}

#[polkavm_export]
pub extern "C" fn deploy() {}
