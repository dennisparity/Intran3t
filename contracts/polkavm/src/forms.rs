#![no_std]
#![no_main]

extern crate alloc;

use alloc::vec::Vec;
use ethabi::{decode, encode, ParamType, Token};
use polkavm_derive::polkavm_export;
use uapi::{HostFn, HostFnImpl as api, StorageFlags, ReturnFlags};

// ============ Runtime support (no_std + alloc) ============

#[panic_handler]
fn panic(_info: &core::panic::PanicInfo) -> ! {
    unsafe {
        core::arch::asm!("unimp");
        core::hint::unreachable_unchecked();
    }
}

#[global_allocator]
static ALLOCATOR: simplealloc::SimpleAlloc<32768> = simplealloc::SimpleAlloc::new();

// ============ Function Selectors ============
// Computed from keccak256 of function signatures

const SELECTOR_CREATE_FORM: [u8; 4] = [0xdf, 0x9e, 0xe8, 0xd3];
// keccak256("createForm(bytes,bytes,bytes,uint64,bytes)")

const SELECTOR_SUBMIT_RESPONSE: [u8; 4] = [0xae, 0x57, 0xb6, 0x3d];
// keccak256("submitResponse(uint64,bytes)")

const SELECTOR_GET_RESPONSE_CID: [u8; 4] = [0xa1, 0xde, 0x25, 0x51];
// keccak256("getResponseCid(uint64,uint64)")

const SELECTOR_RECORD_AGGREGATE: [u8; 4] = [0x59, 0x40, 0x5b, 0x5f];
// keccak256("recordAggregate(uint64,uint8,uint8)")

const SELECTOR_GET_AGGREGATE: [u8; 4] = [0x59, 0x81, 0x88, 0xae];
// keccak256("getAggregateCount(uint64,uint8,uint8)")

const SELECTOR_HAS_SUBMITTED: [u8; 4] = [0x0e, 0xcf, 0xb4, 0x2b];
// keccak256("hasSubmitted(uint64,address)")

const SELECTOR_CLOSE_FORM: [u8; 4] = [0x3d, 0x2b, 0x4a, 0x57];
// keccak256("closeForm(uint64)")

const SELECTOR_FORM_COUNT: [u8; 4] = [0x14, 0x6c, 0x14, 0x15];
// keccak256("formCount()")

const SELECTOR_GET_RESPONSE_COUNT: [u8; 4] = [0x3f, 0x92, 0x51, 0x25];
// keccak256("getResponseCount(uint64)")

// ============ Storage Namespaces ============
const NS_FORM_META: u8 = 0x10;        // form_id → serialized metadata
const NS_FORM_CREATOR: u8 = 0x11;    // form_id → creator address (20 bytes)
const NS_FORM_STATUS: u8 = 0x12;     // form_id → 0=active, 1=closed
const NS_FORM_PUBKEY: u8 = 0x13;     // form_id → encryption public key (32 bytes)
const NS_RESPONSE_CID: u8 = 0x14;    // (form_id, submission_idx) → IPFS CID
const NS_HAS_SUBMITTED: u8 = 0x15;   // (form_id, voter_address) → 1 if submitted
const NS_AGGREGATE: u8 = 0x16;       // (form_id, field_idx, option_idx) → u64 count
const NS_FORM_COUNTER: u8 = 0x17;    // global form counter
const NS_RESPONSE_COUNTER: u8 = 0x18; // form_id → response counter

// ============ Storage Key Builders ============

fn key_form_meta(form_id: u64) -> [u8; 32] {
    let mut k = [0u8; 32];
    k[0] = NS_FORM_META;
    k[1..9].copy_from_slice(&form_id.to_le_bytes());
    k
}

fn key_form_creator(form_id: u64) -> [u8; 32] {
    let mut k = [0u8; 32];
    k[0] = NS_FORM_CREATOR;
    k[1..9].copy_from_slice(&form_id.to_le_bytes());
    k
}

fn key_form_status(form_id: u64) -> [u8; 32] {
    let mut k = [0u8; 32];
    k[0] = NS_FORM_STATUS;
    k[1..9].copy_from_slice(&form_id.to_le_bytes());
    k
}

fn key_form_pubkey(form_id: u64) -> [u8; 32] {
    let mut k = [0u8; 32];
    k[0] = NS_FORM_PUBKEY;
    k[1..9].copy_from_slice(&form_id.to_le_bytes());
    k
}

fn key_response_cid(form_id: u64, submission_idx: u64) -> [u8; 32] {
    let mut k = [0u8; 32];
    k[0] = NS_RESPONSE_CID;
    k[1..9].copy_from_slice(&form_id.to_le_bytes());
    k[9..17].copy_from_slice(&submission_idx.to_le_bytes());
    k
}

fn key_has_submitted(form_id: u64, voter: &[u8; 20]) -> [u8; 32] {
    let mut k = [0u8; 32];
    k[0] = NS_HAS_SUBMITTED;
    k[1..9].copy_from_slice(&form_id.to_le_bytes());
    k[9..29].copy_from_slice(voter);
    k
}

fn key_aggregate(form_id: u64, field_idx: u8, option_idx: u8) -> [u8; 32] {
    let mut k = [0u8; 32];
    k[0] = NS_AGGREGATE;
    k[1..9].copy_from_slice(&form_id.to_le_bytes());
    k[9] = field_idx;
    k[10] = option_idx;
    k
}

fn key_form_counter() -> [u8; 32] {
    let mut k = [0u8; 32];
    k[0] = NS_FORM_COUNTER;
    k
}

fn key_response_counter(form_id: u64) -> [u8; 32] {
    let mut k = [0u8; 32];
    k[0] = NS_RESPONSE_COUNTER;
    k[1..9].copy_from_slice(&form_id.to_le_bytes());
    k
}

fn key_form_title(form_id: u64) -> [u8; 32] {
    let mut k = [0u8; 32];
    k[0] = NS_FORM_META; // title uses the meta namespace
    k[1..9].copy_from_slice(&form_id.to_le_bytes());
    k
}

fn key_form_description(form_id: u64) -> [u8; 32] {
    let mut k = [0x8; 32];
    k[0] = 0x19; // New namespace for description
    k[1..9].copy_from_slice(&form_id.to_le_bytes());
    k
}

fn key_form_fields_json(form_id: u64) -> [u8; 32] {
    let mut k = [0u8; 32];
    k[0] = 0x1a; // New namespace for fields_json
    k[1..9].copy_from_slice(&form_id.to_le_bytes());
    k
}

fn key_form_deadline(form_id: u64) -> [u8; 32] {
    let mut k = [0u8; 32];
    k[0] = 0x1b; // New namespace for deadline
    k[1..9].copy_from_slice(&form_id.to_le_bytes());
    k
}

fn key_form_timestamp(form_id: u64) -> [u8; 32] {
    let mut k = [0u8; 32];
    k[0] = 0x1c; // New namespace for timestamp
    k[1..9].copy_from_slice(&form_id.to_le_bytes());
    k
}

// ============ Storage Primitives ============

fn get_storage(key: &[u8; 32]) -> Option<Vec<u8>> {
    let mut buf = [0u8; 256];
    match api::get_storage(StorageFlags::empty(), key, &mut &mut buf[..]) {
        Ok(_) => Some(buf.to_vec()),
        Err(_) => None,
    }
}

fn set_storage(key: &[u8; 32], value: &[u8]) {
    api::set_storage(StorageFlags::empty(), key, value);
}

fn get_u64(key: &[u8; 32]) -> u64 {
    match get_storage(key) {
        Some(b) if b.len() >= 8 => {
            let mut arr = [0u8; 8];
            arr.copy_from_slice(&b[..8]);
            u64::from_le_bytes(arr)
        }
        _ => 0,
    }
}

fn set_u64(key: &[u8; 32], v: u64) {
    set_storage(key, &v.to_le_bytes());
}

fn get_u8_flag(key: &[u8; 32]) -> u8 {
    get_storage(key).and_then(|b| b.first().copied()).unwrap_or(0)
}

fn set_u8_flag(key: &[u8; 32], v: u8) {
    set_storage(key, &[v]);
}

fn get_address(key: &[u8; 32]) -> Option<[u8; 20]> {
    let b = get_storage(key)?;
    if b.len() >= 20 {
        let mut addr = [0u8; 20];
        addr.copy_from_slice(&b[..20]);
        Some(addr)
    } else { None }
}

fn get_caller() -> [u8; 20] {
    let mut caller = [0u8; 20];
    api::caller(&mut caller);
    caller
}

fn get_timestamp() -> u64 {
    let mut ts = [0u8; 32];
    api::now(&mut ts);
    let mut arr = [0u8; 8];
    arr.copy_from_slice(&ts[..8]);
    u64::from_le_bytes(arr)
}

// ============ Contract Logic ============

fn create_form(
    title: Vec<u8>,
    description: Vec<u8>,
    fields_json: Vec<u8>,
    deadline: u64,
    encryption_pub_key: Vec<u8>,
) -> u64 {
    // Size limits to prevent memory exhaustion
    if title.len() > 256 || description.len() > 1024 || fields_json.len() > 4096 {
        return 0; // Return 0 on invalid input
    }

    let creator = get_caller();
    let counter_key = key_form_counter();
    let form_id = get_u64(&counter_key) + 1;
    set_u64(&counter_key, form_id);

    set_storage(&key_form_creator(form_id), &creator);
    set_u8_flag(&key_form_status(form_id), 0);

    let pk_len = encryption_pub_key.len().min(65);
    set_storage(&key_form_pubkey(form_id), &encryption_pub_key[..pk_len]);

    // Store fields separately to avoid ethabi encoding overhead (memory limits)
    set_storage(&key_form_title(form_id), &title);
    set_storage(&key_form_description(form_id), &description);
    set_storage(&key_form_fields_json(form_id), &fields_json);

    let timestamp = get_timestamp();
    let mut deadline_bytes = [0u8; 8];
    deadline_bytes.copy_from_slice(&deadline.to_le_bytes());
    set_storage(&key_form_deadline(form_id), &deadline_bytes);

    let mut ts_bytes = [0u8; 8];
    ts_bytes.copy_from_slice(&timestamp.to_le_bytes());
    set_storage(&key_form_timestamp(form_id), &ts_bytes);

    form_id
}

fn submit_response(form_id: u64, cid: Vec<u8>) -> u64 {
    let voter = get_caller(); // Derived from Alice's relay Substrate address via pallet-revive
    let status = get_u8_flag(&key_form_status(form_id));
    if status != 0 { return u64::MAX; }
    if get_address(&key_form_creator(form_id)).is_none() { return u64::MAX; }

    // Check deadline (stored separately after memory fix)
    let deadline_bytes = get_storage(&key_form_deadline(form_id)).unwrap_or_default();
    if deadline_bytes.len() >= 8 {
        let mut deadline_arr = [0u8; 8];
        deadline_arr.copy_from_slice(&deadline_bytes[..8]);
        let deadline = u64::from_le_bytes(deadline_arr);
        if deadline > 0 && get_timestamp() > deadline {
            return u64::MAX;
        }
    }

    set_u8_flag(&key_has_submitted(form_id, &voter), 1);

    let counter_key = key_response_counter(form_id);
    let idx = get_u64(&counter_key);
    set_u64(&counter_key, idx + 1);

    let cid_key = key_response_cid(form_id, idx);
    let cid_len = cid.len().min(256);
    set_storage(&cid_key, &cid[..cid_len]);

    idx
}

fn get_response_cid(form_id: u64, submission_idx: u64) -> Vec<u8> {
    get_storage(&key_response_cid(form_id, submission_idx)).unwrap_or_default()
}

fn record_aggregate(form_id: u64, field_idx: u8, option_idx: u8) {
    let key = key_aggregate(form_id, field_idx, option_idx);
    let current = get_u64(&key);
    set_u64(&key, current + 1);
}

fn get_aggregate_count(form_id: u64, field_idx: u8, option_idx: u8) -> u64 {
    get_u64(&key_aggregate(form_id, field_idx, option_idx))
}

fn has_submitted(form_id: u64, voter: [u8; 20]) -> bool {
    get_u8_flag(&key_has_submitted(form_id, &voter)) == 1
}

fn close_form(form_id: u64) {
    let caller = get_caller();
    if let Some(creator) = get_address(&key_form_creator(form_id)) {
        if creator == caller {
            set_u8_flag(&key_form_status(form_id), 1);
        }
    }
}

fn get_response_count(form_id: u64) -> u64 {
    get_u64(&key_response_counter(form_id))
}

fn form_count() -> u64 {
    get_u64(&key_form_counter())
}

// ============ Dispatcher ============

#[no_mangle]
#[polkavm_export]
pub extern "C" fn call() {
    let length = api::call_data_size() as usize;
    if length < 4 {
        api::return_value(ReturnFlags::REVERT, b"Input too short");
        return;
    }

    let mut selector = [0u8; 4];
    api::call_data_copy(&mut selector, 0);

    let data_len = length.saturating_sub(4).min(4096);
    let mut data = Vec::new();
    if data_len > 0 {
        let mut buf = [0u8; 4096];
        api::call_data_copy(&mut buf[..data_len], 4);
        data = buf[..data_len].to_vec();
    }

    match selector {
        SELECTOR_CREATE_FORM => {
            let decoded = match decode(
                &[ParamType::String, ParamType::String, ParamType::Bytes, ParamType::Uint(64), ParamType::Bytes],
                &data
            ) {
                Ok(d) => d,
                Err(_) => { api::return_value(ReturnFlags::REVERT, b"Decode error"); return; }
            };

            let title = match &decoded[0] { Token::String(s) => s.as_bytes().to_vec(), _ => Vec::new() };
            let desc = match &decoded[1] { Token::String(s) => s.as_bytes().to_vec(), _ => Vec::new() };
            let fields = match &decoded[2] { Token::Bytes(b) => b.clone(), _ => Vec::new() };
            let deadline = match &decoded[3] { Token::Uint(u) => u.as_u64(), _ => 0 };
            let pub_key = match &decoded[4] { Token::Bytes(b) => b.clone(), _ => Vec::new() };

            let form_id = create_form(title, desc, fields, deadline, pub_key);
            api::return_value(ReturnFlags::empty(), &encode(&[Token::Uint(form_id.into())]));
        }

        SELECTOR_SUBMIT_RESPONSE => {
            let decoded = match decode(
                &[ParamType::Uint(64), ParamType::Bytes],
                &data
            ) {
                Ok(d) => d,
                Err(_) => { api::return_value(ReturnFlags::REVERT, b"Decode error"); return; }
            };

            let form_id = match &decoded[0] { Token::Uint(u) => u.as_u64(), _ => 0 };
            let cid = match &decoded[1] { Token::Bytes(b) => b.clone(), _ => Vec::new() };

            let idx = submit_response(form_id, cid);
            api::return_value(ReturnFlags::empty(), &encode(&[Token::Uint(idx.into())]));
        }

        SELECTOR_GET_RESPONSE_CID => {
            let decoded = match decode(&[ParamType::Uint(64), ParamType::Uint(64)], &data) {
                Ok(d) => d,
                Err(_) => { api::return_value(ReturnFlags::REVERT, b"Decode error"); return; }
            };

            let form_id = match &decoded[0] { Token::Uint(u) => u.as_u64(), _ => 0 };
            let idx = match &decoded[1] { Token::Uint(u) => u.as_u64(), _ => 0 };

            let cid = get_response_cid(form_id, idx);
            api::return_value(ReturnFlags::empty(), &encode(&[Token::Bytes(cid)]));
        }

        SELECTOR_RECORD_AGGREGATE => {
            let decoded = match decode(
                &[ParamType::Uint(64), ParamType::Uint(8), ParamType::Uint(8)],
                &data
            ) {
                Ok(d) => d,
                Err(_) => { api::return_value(ReturnFlags::REVERT, b"Decode error"); return; }
            };

            let form_id = match &decoded[0] { Token::Uint(u) => u.as_u64(), _ => { api::return_value(ReturnFlags::REVERT, b"Bad args"); return; } };
            let field_idx = match &decoded[1] { Token::Uint(u) => u.as_u32() as u8, _ => { api::return_value(ReturnFlags::REVERT, b"Bad args"); return; } };
            let option_idx = match &decoded[2] { Token::Uint(u) => u.as_u32() as u8, _ => { api::return_value(ReturnFlags::REVERT, b"Bad args"); return; } };

            record_aggregate(form_id, field_idx, option_idx);
            api::return_value(ReturnFlags::empty(), &encode(&[Token::Bool(true)]));
        }

        SELECTOR_GET_AGGREGATE => {
            let decoded = match decode(
                &[ParamType::Uint(64), ParamType::Uint(8), ParamType::Uint(8)],
                &data
            ) {
                Ok(d) => d,
                Err(_) => { api::return_value(ReturnFlags::REVERT, b"Decode error"); return; }
            };

            let form_id = match &decoded[0] { Token::Uint(u) => u.as_u64(), _ => 0 };
            let field_idx = match &decoded[1] { Token::Uint(u) => u.as_u32() as u8, _ => 0 };
            let option_idx = match &decoded[2] { Token::Uint(u) => u.as_u32() as u8, _ => 0 };

            let count = get_aggregate_count(form_id, field_idx, option_idx);
            api::return_value(ReturnFlags::empty(), &encode(&[Token::Uint(count.into())]));
        }

        SELECTOR_HAS_SUBMITTED => {
            let decoded = match decode(&[ParamType::Uint(64), ParamType::Address], &data) {
                Ok(d) => d,
                Err(_) => { api::return_value(ReturnFlags::REVERT, b"Decode error"); return; }
            };

            let form_id = match &decoded[0] { Token::Uint(u) => u.as_u64(), _ => 0 };
            let mut voter = [0u8; 20];
            if let Token::Address(addr) = &decoded[1] { voter.copy_from_slice(&addr.0); }

            let result = has_submitted(form_id, voter);
            api::return_value(ReturnFlags::empty(), &encode(&[Token::Bool(result)]));
        }

        SELECTOR_CLOSE_FORM => {
            let decoded = match decode(&[ParamType::Uint(64)], &data) {
                Ok(d) => d,
                Err(_) => { api::return_value(ReturnFlags::REVERT, b"Decode error"); return; }
            };

            let form_id = match &decoded[0] { Token::Uint(u) => u.as_u64(), _ => { api::return_value(ReturnFlags::REVERT, b"Bad args"); return; } };
            close_form(form_id);
            api::return_value(ReturnFlags::empty(), &encode(&[Token::Bool(true)]));
        }

        SELECTOR_FORM_COUNT => {
            let count = form_count();
            api::return_value(ReturnFlags::empty(), &encode(&[Token::Uint(count.into())]));
        }

        SELECTOR_GET_RESPONSE_COUNT => {
            let decoded = match decode(&[ParamType::Uint(64)], &data) {
                Ok(d) => d,
                Err(_) => { api::return_value(ReturnFlags::REVERT, b"Decode error"); return; }
            };

            let form_id = match &decoded[0] { Token::Uint(u) => u.as_u64(), _ => 0 };
            let count = get_response_count(form_id);
            api::return_value(ReturnFlags::empty(), &encode(&[Token::Uint(count.into())]));
        }

        _ => {
            api::return_value(ReturnFlags::REVERT, b"Unknown selector");
        }
    }
}

#[no_mangle]
#[polkavm_export]
pub extern "C" fn deploy() {
    // No constructor logic needed
}
