use ethabi::{decode, encode, ParamType, Token};

/// Helper functions for ABI encoding/decoding

pub fn decode_call_data(
    types: &[ParamType],
    data: &[u8],
) -> Result<alloc::vec::Vec<Token>, ethabi::Error> {
    // Skip first 4 bytes (function selector)
    decode(types, &data[4..])
}

pub fn encode_return_value(tokens: &[Token]) -> alloc::vec::Vec<u8> {
    encode(tokens)
}
