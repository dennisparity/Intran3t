use uapi::{HostFn, HostFnImpl, StorageFlags};

/// Helper functions for contract storage operations

pub fn get_storage(key: &[u8; 32]) -> Option<alloc::vec::Vec<u8>> {
    let mut buf = [0u8; 4096];
    let mut output: &mut [u8] = &mut buf;
    let result = HostFnImpl::get_storage(StorageFlags::empty(), key, &mut output);
    if result.is_ok() {
        Some(output.to_vec())
    } else {
        None
    }
}

pub fn set_storage(key: &[u8; 32], value: &[u8]) {
    HostFnImpl::set_storage(StorageFlags::empty(), key, value);
}

pub fn clear_storage(key: &[u8; 32]) {
    // clear_storage removed in v0.10; set to empty value to delete the entry
    HostFnImpl::set_storage(StorageFlags::empty(), key, &[]);
}
