// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title Intran3tAccessPass
 * @dev NFT-based access control system for physical locations
 * @author Intran3t Team
 */
contract Intran3tAccessPass is ERC721, AccessControl {
    using Strings for uint256;

    // ============ Roles ============

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    // ============ Structs ============

    struct AccessPassMetadata {
        string location;           // Human-readable location name
        string locationId;         // Unique location identifier
        address holder;            // Address that holds the pass
        uint256 issuedAt;         // Timestamp when issued
        uint256 expiresAt;        // Expiration timestamp (0 = never expires)
        string accessLevel;        // Access level (standard, premium, admin, etc.)
        bool revoked;             // Whether pass has been revoked
        string identityDisplay;   // On-chain identity display name (optional)
    }

    // ============ State Variables ============

    /// Token ID counter
    uint256 private _nextTokenId;

    /// Mapping from token ID to metadata
    mapping(uint256 => AccessPassMetadata) public passMetadata;

    /// Mapping from location ID to array of active token IDs
    mapping(string => uint256[]) private _locationPasses;

    /// Mapping from holder address to array of token IDs
    mapping(address => uint256[]) private _holderPasses;

    // ============ Events ============

    event AccessPassMinted(
        uint256 indexed tokenId,
        address indexed holder,
        string location,
        string locationId,
        uint256 expiresAt,
        uint256 timestamp
    );

    event AccessPassRevoked(
        uint256 indexed tokenId,
        address indexed revokedBy,
        uint256 timestamp
    );

    event AccessPassTransferred(
        uint256 indexed tokenId,
        address indexed from,
        address indexed to,
        uint256 timestamp
    );

    // ============ Errors ============

    error Intran3tAccessPass__Unauthorized();
    error Intran3tAccessPass__PassNotFound();
    error Intran3tAccessPass__PassExpired();
    error Intran3tAccessPass__PassRevoked();
    error Intran3tAccessPass__InvalidExpiration();
    error Intran3tAccessPass__TransferNotAllowed();

    // ============ Constructor ============

    constructor() ERC721("Intran3t Access Pass", "IACC") {
        // Grant admin role to contract deployer
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);

        _nextTokenId = 1; // Start token IDs from 1
    }

    // ============ External Functions ============

    /**
     * @dev Mint a new access pass NFT
     * @param to Address to receive the access pass
     * @param location Human-readable location name
     * @param locationId Unique location identifier
     * @param expiresAt Expiration timestamp (0 for no expiration)
     * @param accessLevel Access level string
     * @param identityDisplay On-chain identity display name
     * @return tokenId The ID of the minted token
     */
    function mintAccessPass(
        address to,
        string memory location,
        string memory locationId,
        uint256 expiresAt,
        string memory accessLevel,
        string memory identityDisplay
    ) external returns (uint256 tokenId) {
        if (to != msg.sender && !hasRole(MINTER_ROLE, msg.sender)) {
            revert Intran3tAccessPass__Unauthorized();
        }

        if (expiresAt > 0 && expiresAt <= block.timestamp) {
            revert Intran3tAccessPass__InvalidExpiration();
        }

        tokenId = _nextTokenId++;

        // Mint the NFT
        _safeMint(to, tokenId);

        // Store metadata
        passMetadata[tokenId] = AccessPassMetadata({
            location: location,
            locationId: locationId,
            holder: to,
            issuedAt: block.timestamp,
            expiresAt: expiresAt,
            accessLevel: accessLevel,
            revoked: false,
            identityDisplay: identityDisplay
        });

        // Track by location
        _locationPasses[locationId].push(tokenId);

        // Track by holder
        _holderPasses[to].push(tokenId);

        emit AccessPassMinted(
            tokenId,
            to,
            location,
            locationId,
            expiresAt,
            block.timestamp
        );

        return tokenId;
    }

    /**
     * @dev Revoke an access pass (burns the NFT)
     * @param tokenId The token ID to revoke
     */
    function revokeAccessPass(uint256 tokenId) external onlyRole(ADMIN_ROLE) {
        if (_ownerOf(tokenId) == address(0)) {
            revert Intran3tAccessPass__PassNotFound();
        }

        AccessPassMetadata storage metadata = passMetadata[tokenId];
        metadata.revoked = true;

        // Burn the NFT
        _burn(tokenId);

        emit AccessPassRevoked(tokenId, msg.sender, block.timestamp);
    }

    /**
     * @dev Check if an access pass is valid
     * @param tokenId The token ID to check
     * @return isValid True if pass exists, not revoked, and not expired
     */
    function isPassValid(uint256 tokenId) external view returns (bool isValid) {
        if (_ownerOf(tokenId) == address(0)) {
            return false;
        }

        AccessPassMetadata memory metadata = passMetadata[tokenId];

        if (metadata.revoked) {
            return false;
        }

        if (metadata.expiresAt > 0 && block.timestamp > metadata.expiresAt) {
            return false;
        }

        return true;
    }

    /**
     * @dev Get all access passes for a holder
     * @param holder Address to query
     * @return tokenIds Array of token IDs owned by the holder
     */
    function getPassesByHolder(address holder) external view returns (uint256[] memory tokenIds) {
        uint256 balance = balanceOf(holder);
        tokenIds = new uint256[](balance);

        uint256 index = 0;
        uint256[] memory holderTokens = _holderPasses[holder];

        for (uint256 i = 0; i < holderTokens.length; i++) {
            uint256 tokenId = holderTokens[i];
            if (_ownerOf(tokenId) == holder) {
                tokenIds[index] = tokenId;
                index++;
            }
        }

        return tokenIds;
    }

    /**
     * @dev Get all access passes for a location
     * @param locationId Location identifier
     * @return tokenIds Array of token IDs for the location
     */
    function getPassesByLocation(string memory locationId) external view returns (uint256[] memory tokenIds) {
        return _locationPasses[locationId];
    }

    /**
     * @dev Get access pass metadata
     * @param tokenId The token ID to query
     * @return metadata The access pass metadata struct
     */
    function getPassMetadata(uint256 tokenId) external view returns (AccessPassMetadata memory metadata) {
        if (_ownerOf(tokenId) == address(0)) {
            revert Intran3tAccessPass__PassNotFound();
        }
        return passMetadata[tokenId];
    }

    /**
     * @dev Get total number of minted passes
     * @return count Total minted (including burned)
     */
    function totalMinted() external view returns (uint256 count) {
        return _nextTokenId - 1;
    }

    /**
     * @dev Grant minter role to an address
     * @param account Address to grant minter role
     */
    function grantMinterRole(address account) external onlyRole(ADMIN_ROLE) {
        _grantRole(MINTER_ROLE, account);
    }

    /**
     * @dev Revoke minter role from an address
     * @param account Address to revoke minter role from
     */
    function revokeMinterRole(address account) external onlyRole(ADMIN_ROLE) {
        _revokeRole(MINTER_ROLE, account);
    }

    // ============ Overrides ============

    /**
     * @dev Override transfer to prevent transfers (soulbound-like behavior)
     * Only minting and burning allowed
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal virtual override returns (address) {
        address from = _ownerOf(tokenId);

        // Allow minting (from == address(0))
        if (from == address(0)) {
            return super._update(to, tokenId, auth);
        }

        // Allow burning (to == address(0))
        if (to == address(0)) {
            return super._update(to, tokenId, auth);
        }

        // Prevent transfers between addresses
        revert Intran3tAccessPass__TransferNotAllowed();
    }

    /**
     * @dev See {IERC165-supportsInterface}
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    /**
     * @dev Returns the token URI (metadata)
     * Returns on-chain JSON metadata
     */
    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        if (_ownerOf(tokenId) == address(0)) {
            revert Intran3tAccessPass__PassNotFound();
        }

        AccessPassMetadata memory metadata = passMetadata[tokenId];

        // Build JSON metadata on-chain
        string memory json = string(
            abi.encodePacked(
                '{"name": "Access Pass #',
                tokenId.toString(),
                '", "description": "Intran3t Access Pass for ',
                metadata.location,
                '", "attributes": [',
                '{"trait_type": "Location", "value": "',
                metadata.location,
                '"},',
                '{"trait_type": "Access Level", "value": "',
                metadata.accessLevel,
                '"},',
                '{"trait_type": "Holder", "value": "',
                Strings.toHexString(uint160(metadata.holder), 20),
                '"},',
                '{"trait_type": "Issued At", "value": ',
                metadata.issuedAt.toString(),
                '},',
                '{"trait_type": "Expires At", "value": ',
                metadata.expiresAt.toString(),
                '},',
                '{"trait_type": "Revoked", "value": ',
                metadata.revoked ? '"true"' : '"false"',
                '}',
                ']}'
            )
        );

        return string(abi.encodePacked("data:application/json;utf8,", json));
    }
}
