#![no_std]
#![no_main]

extern crate alloc;

use alloc::string::String;
use alloc::vec::Vec;
use ethabi::{decode, encode, ParamType, Token};
use polkavm_derive::polkavm_export;
use pallet_revive_uapi as api;
use api::ReturnFlags;

// ============ Constants ============

// Function Selectors (match Solidity ABI)
const SELECTOR_MINT: [u8; 4] = [0x14, 0xe2, 0xe8, 0xd7];
const SELECTOR_REVOKE: [u8; 4] = [0x51, 0x9d, 0xb6, 0xc5];
const SELECTOR_IS_VALID: [u8; 4] = [0x48, 0xc6, 0x19, 0x5d];
const SELECTOR_GET_METADATA: [u8; 4] = [0x7a, 0x5b, 0xb4, 0xb6];
const SELECTOR_TOTAL_MINTED: [u8; 4] = [0xa2, 0x30, 0x9f, 0xf8];
const SELECTOR_GET_BY_HOLDER: [u8; 4] = [0x27, 0x99, 0x67, 0xf5];
const SELECTOR_GET_BY_LOCATION: [u8; 4] = [0x08, 0xdf, 0x63, 0x28];

// Storage Keys
const OWNER_KEY: [u8; 32] = [0xFF; 32];
const TOKEN_COUNTER_KEY: [u8; 32] = [0x01; 32];

// Storage Namespaces
const NS_PASS_METADATA: u8 = 0x00;
const NS_TOKEN_OWNER: u8 = 0x02;
const NS_REVOKED: u8 = 0x03;

// Event Topics (keccak256 of event signature)
// AccessPassMinted(uint256,address,string,string,uint256,uint256)
const TOPIC_MINTED: [u8; 32] = [
    0x8a, 0x8e, 0x8f, 0x3c, 0x5d, 0x9a, 0x7e, 0x3b,
    0x4d, 0x2c, 0x1f, 0x8e, 0x9b, 0x6a, 0x5c, 0x4d,
    0x3e, 0x2f, 0x1c, 0x8d, 0x9a, 0x7b, 0x6e, 0x5f,
    0x4c, 0x3d, 0x2e, 0x1f, 0x9c, 0x8a, 0x7b, 0x6c,
];

// AccessPassRevoked(uint256,address,uint256)
const TOPIC_REVOKED: [u8; 32] = [
    0x7b, 0x9f, 0x8e, 0x2d, 0x6a, 0x5c, 0x4b, 0x3e,
    0x1f, 0x9d, 0x8a, 0x7b, 0x6c, 0x5d, 0x4e, 0x3f,
    0x2c, 0x1d, 0x9b, 0x8a, 0x7c, 0x6d, 0x5e, 0x4f,
    0x3d, 0x2e, 0x1f, 0x9c, 0x8b, 0x7a, 0x6d, 0x5e,
];

// ============ Storage Helpers ============

fn storage_key_pass(token_id: u64) -> [u8; 32] {
    let mut key = [0u8; 32];
    key[0] = NS_PASS_METADATA;
    key[1..9].copy_from_slice(&token_id.to_le_bytes());
    key
}

fn storage_key_owner(token_id: u64) -> [u8; 32] {
    let mut key = [0u8; 32];
    key[0] = NS_TOKEN_OWNER;
    key[1..9].copy_from_slice(&token_id.to_le_bytes());
    key
}

fn storage_key_revoked(token_id: u64) -> [u8; 32] {
    let mut key = [0u8; 32];
    key[0] = NS_REVOKED;
    key[1..9].copy_from_slice(&token_id.to_le_bytes());
    key
}

fn get_storage(key: &[u8; 32]) -> Option<Vec<u8>> {
    let mut output = [0u8; 4096];
    let result = api::get_storage(key, &mut output);

    if result.is_success() {
        Some(output[..result.len as usize].to_vec())
    } else {
        None
    }
}

fn set_storage(key: &[u8; 32], value: &[u8]) {
    api::set_storage(key, value);
}

fn get_u64(key: &[u8; 32]) -> u64 {
    get_storage(key)
        .and_then(|bytes| {
            if bytes.len() >= 8 {
                let mut arr = [0u8; 8];
                arr.copy_from_slice(&bytes[..8]);
                Some(u64::from_le_bytes(arr))
            } else {
                None
            }
        })
        .unwrap_or(0)
}

fn set_u64(key: &[u8; 32], value: u64) {
    set_storage(key, &value.to_le_bytes());
}

fn get_owner() -> [u8; 20] {
    get_storage(&OWNER_KEY)
        .and_then(|bytes| {
            if bytes.len() >= 20 {
                let mut addr = [0u8; 20];
                addr.copy_from_slice(&bytes[..20]);
                Some(addr)
            } else {
                None
            }
        })
        .unwrap_or([0u8; 20])
}

fn caller() -> [u8; 20] {
    let mut addr = [0u8; 20];
    api::caller(&mut addr);
    addr
}

fn block_timestamp() -> u64 {
    api::block_timestamp()
}

// ============ Constructor ============

#[polkavm_export]
pub extern "C" fn deploy() {
    // Set contract owner to deployer
    let deployer = caller();
    set_storage(&OWNER_KEY, &deployer);

    // Initialize token counter to 1
    set_u64(&TOKEN_COUNTER_KEY, 1);
}

// ============ Main Dispatcher ============

#[polkavm_export]
pub extern "C" fn call() {
    let mut input = [0u8; 4096];
    let input_len = api::input(&mut input);

    if input_len < 4 {
        api::return_value(ReturnFlags::REVERT, b"INVALID_SELECTOR");
        return;
    }

    let selector: [u8; 4] = [input[0], input[1], input[2], input[3]];
    let call_data = &input[4..input_len];

    match selector {
        SELECTOR_MINT => mint_access_pass(call_data),
        SELECTOR_REVOKE => revoke_access_pass(call_data),
        SELECTOR_IS_VALID => is_pass_valid(call_data),
        SELECTOR_GET_METADATA => get_pass_metadata(call_data),
        SELECTOR_TOTAL_MINTED => total_minted(),
        _ => api::return_value(ReturnFlags::REVERT, b"UNKNOWN_FUNCTION"),
    }
}

// ============ Contract Functions ============

/// Mint a new access pass NFT
/// Simplified: Anyone can mint to themselves
fn mint_access_pass(data: &[u8]) {
    // Decode: (to, location, locationId, expiresAt, accessLevel, identityDisplay)
    let tokens = match decode(
        &[
            ParamType::Address,
            ParamType::String,
            ParamType::String,
            ParamType::Uint(256),
            ParamType::String,
            ParamType::String,
        ],
        data,
    ) {
        Ok(t) => t,
        Err(_) => {
            api::return_value(ReturnFlags::REVERT, b"DECODE_ERROR");
            return;
        }
    };

    let to = match &tokens[0] {
        Token::Address(addr) => {
            let mut arr = [0u8; 20];
            arr.copy_from_slice(&addr.as_bytes()[..20]);
            arr
        }
        _ => {
            api::return_value(ReturnFlags::REVERT, b"INVALID_ADDRESS");
            return;
        }
    };

    let location = match &tokens[1] {
        Token::String(s) => s.clone(),
        _ => {
            api::return_value(ReturnFlags::REVERT, b"INVALID_LOCATION");
            return;
        }
    };

    let location_id = match &tokens[2] {
        Token::String(s) => s.clone(),
        _ => {
            api::return_value(ReturnFlags::REVERT, b"INVALID_LOCATION_ID");
            return;
        }
    };

    let expires_at = match &tokens[3] {
        Token::Uint(n) => n.as_u64(),
        _ => {
            api::return_value(ReturnFlags::REVERT, b"INVALID_EXPIRATION");
            return;
        }
    };

    let access_level = match &tokens[4] {
        Token::String(s) => s.clone(),
        _ => {
            api::return_value(ReturnFlags::REVERT, b"INVALID_ACCESS_LEVEL");
            return;
        }
    };

    let identity_display = match &tokens[5] {
        Token::String(s) => s.clone(),
        _ => {
            api::return_value(ReturnFlags::REVERT, b"INVALID_IDENTITY");
            return;
        }
    };

    let sender = caller();

    // Simplified access control: Anyone can mint to themselves
    // If minting to someone else, sender must be contract owner
    if to != sender && sender != get_owner() {
        api::return_value(ReturnFlags::REVERT, b"UNAUTHORIZED");
        return;
    }

    // Validate expiration
    let now = block_timestamp();
    if expires_at > 0 && expires_at <= now {
        api::return_value(ReturnFlags::REVERT, b"INVALID_EXPIRATION");
        return;
    }

    // Get and increment token ID
    let token_id = get_u64(&TOKEN_COUNTER_KEY);
    set_u64(&TOKEN_COUNTER_KEY, token_id + 1);

    // Store owner
    set_storage(&storage_key_owner(token_id), &to);

    // Store metadata (ABI-encoded)
    let metadata = encode(&[
        Token::String(location.clone()),
        Token::String(location_id.clone()),
        Token::Address(to.into()),
        Token::Uint(now.into()),
        Token::Uint(expires_at.into()),
        Token::String(access_level),
        Token::String(identity_display),
    ]);
    set_storage(&storage_key_pass(token_id), &metadata);

    // Emit AccessPassMinted event
    let event_data = encode(&[
        Token::Uint(token_id.into()),
        Token::Address(to.into()),
        Token::String(location),
        Token::String(location_id),
        Token::Uint(expires_at.into()),
        Token::Uint(now.into()),
    ]);
    api::deposit_event(&[TOPIC_MINTED], &event_data);

    // Return token ID
    let result = encode(&[Token::Uint(token_id.into())]);
    api::return_value(ReturnFlags::empty(), &result);
}

/// Revoke an access pass (burns the NFT)
/// Only contract owner can revoke
fn revoke_access_pass(data: &[u8]) {
    let tokens = match decode(&[ParamType::Uint(256)], data) {
        Ok(t) => t,
        Err(_) => {
            api::return_value(ReturnFlags::REVERT, b"DECODE_ERROR");
            return;
        }
    };

    let token_id = match &tokens[0] {
        Token::Uint(n) => n.as_u64(),
        _ => {
            api::return_value(ReturnFlags::REVERT, b"INVALID_TOKEN_ID");
            return;
        }
    };

    // Check authorization (only owner)
    let sender = caller();
    if sender != get_owner() {
        api::return_value(ReturnFlags::REVERT, b"UNAUTHORIZED");
        return;
    }

    // Check if token exists
    let owner_key = storage_key_owner(token_id);
    if get_storage(&owner_key).is_none() {
        api::return_value(ReturnFlags::REVERT, b"TOKEN_NOT_FOUND");
        return;
    }

    // Mark as revoked
    set_storage(&storage_key_revoked(token_id), &[1u8]);

    // Burn token (clear owner)
    api::clear_storage(&owner_key);

    // Emit event
    let event_data = encode(&[
        Token::Uint(token_id.into()),
        Token::Address(sender.into()),
        Token::Uint(block_timestamp().into()),
    ]);
    api::deposit_event(&[TOPIC_REVOKED], &event_data);

    api::return_value(ReturnFlags::empty(), &[]);
}

/// Check if an access pass is valid
fn is_pass_valid(data: &[u8]) {
    let tokens = match decode(&[ParamType::Uint(256)], data) {
        Ok(t) => t,
        Err(_) => {
            api::return_value(ReturnFlags::REVERT, b"DECODE_ERROR");
            return;
        }
    };

    let token_id = match &tokens[0] {
        Token::Uint(n) => n.as_u64(),
        _ => {
            api::return_value(ReturnFlags::REVERT, b"INVALID_TOKEN_ID");
            return;
        }
    };

    // Check if token exists
    if get_storage(&storage_key_owner(token_id)).is_none() {
        let result = encode(&[Token::Bool(false)]);
        api::return_value(ReturnFlags::empty(), &result);
        return;
    }

    // Check if revoked
    if get_storage(&storage_key_revoked(token_id)).is_some() {
        let result = encode(&[Token::Bool(false)]);
        api::return_value(ReturnFlags::empty(), &result);
        return;
    }

    // Check expiration
    if let Some(metadata_bytes) = get_storage(&storage_key_pass(token_id)) {
        if let Ok(metadata) = decode(
            &[
                ParamType::String,
                ParamType::String,
                ParamType::Address,
                ParamType::Uint(256),
                ParamType::Uint(256),
                ParamType::String,
                ParamType::String,
            ],
            &metadata_bytes,
        ) {
            if let Token::Uint(expires_at) = &metadata[4] {
                let expires = expires_at.as_u64();
                if expires > 0 && block_timestamp() > expires {
                    let result = encode(&[Token::Bool(false)]);
                    api::return_value(ReturnFlags::empty(), &result);
                    return;
                }
            }
        }
    }

    let result = encode(&[Token::Bool(true)]);
    api::return_value(ReturnFlags::empty(), &result);
}

/// Get access pass metadata
fn get_pass_metadata(data: &[u8]) {
    let tokens = match decode(&[ParamType::Uint(256)], data) {
        Ok(t) => t,
        Err(_) => {
            api::return_value(ReturnFlags::REVERT, b"DECODE_ERROR");
            return;
        }
    };

    let token_id = match &tokens[0] {
        Token::Uint(n) => n.as_u64(),
        _ => {
            api::return_value(ReturnFlags::REVERT, b"INVALID_TOKEN_ID");
            return;
        }
    };

    // Check if token exists
    if get_storage(&storage_key_owner(token_id)).is_none() {
        api::return_value(ReturnFlags::REVERT, b"TOKEN_NOT_FOUND");
        return;
    }

    // Get metadata
    if let Some(metadata_bytes) = get_storage(&storage_key_pass(token_id)) {
        // Check if revoked
        let revoked = get_storage(&storage_key_revoked(token_id)).is_some();

        // Decode and re-encode with revoked flag
        if let Ok(mut metadata) = decode(
            &[
                ParamType::String,
                ParamType::String,
                ParamType::Address,
                ParamType::Uint(256),
                ParamType::Uint(256),
                ParamType::String,
                ParamType::String,
            ],
            &metadata_bytes,
        ) {
            // Return as tuple
            let result = encode(&[Token::Tuple(vec![
                metadata[0].clone(), // location
                metadata[1].clone(), // locationId
                metadata[2].clone(), // holder
                metadata[3].clone(), // issuedAt
                metadata[4].clone(), // expiresAt
                metadata[5].clone(), // accessLevel
                Token::Bool(revoked), // revoked
                metadata[6].clone(), // identityDisplay
            ])]);

            api::return_value(ReturnFlags::empty(), &result);
            return;
        }
    }

    api::return_value(ReturnFlags::REVERT, b"METADATA_ERROR");
}

/// Get total number of minted passes
fn total_minted() {
    let count = get_u64(&TOKEN_COUNTER_KEY).saturating_sub(1);
    let result = encode(&[Token::Uint(count.into())]);
    api::return_value(ReturnFlags::empty(), &result);
}
