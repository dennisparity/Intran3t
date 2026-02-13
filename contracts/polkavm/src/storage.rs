use crate::api;

/// Helper functions for contract storage operations

pub fn get_storage(key: &[u8; 32]) -> Option<alloc::vec::Vec<u8>> {
    let mut output = alloc::vec![0u8; 1024];
    let result = api::get_storage(key, &mut output);

    if result.is_success() {
        Some(output[..result.len as usize].to_vec())
    } else {
        None
    }
}

pub fn set_storage(key: &[u8; 32], value: &[u8]) {
    api::set_storage(key, value);
}

pub fn clear_storage(key: &[u8; 32]) {
    api::clear_storage(key);
}
