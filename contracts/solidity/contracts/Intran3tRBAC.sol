// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Intran3tRBAC
 * @dev Role-Based Access Control with Verifiable Credentials for Organizations
 * @author Intran3t Team
 */
contract Intran3tRBAC {

    // ============ Enums ============

    enum Role {
        Admin,        // 0 - Full access
        Member,       // 1 - Create forms, limited access
        Viewer,       // 2 - Read-only (no results viewing)
        PeopleCulture // 3 - Can create polls + limited admin
    }

    enum Action {
        Create,
        Read,
        Update,
        Delete,
        Admin,
        Vote,
        Manage
    }

    enum Resource {
        Poll,
        Form,
        Governance,
        User,
        Settings,
        All
    }

    // ============ Structs ============

    struct Organization {
        bytes32 id;
        string name;
        address owner;
        uint256 createdAt;
        uint32 memberCount;
        bool exists;
    }

    struct Credential {
        bytes32 id;
        bytes32 orgId;
        address subject;
        Role role;
        address issuedBy;
        uint256 issuedAt;
        uint256 expiresAt; // 0 means no expiration
        bool revoked;
    }

    // ============ State Variables ============

    /// Organization registry: orgId => Organization
    mapping(bytes32 => Organization) public organizations;

    /// User credentials: (orgId, userAddress) => Credential
    mapping(bytes32 => mapping(address => Credential)) public credentials;

    /// Organization members list: orgId => address[]
    mapping(bytes32 => address[]) public orgMembers;

    /// Nonce for generating unique IDs
    uint256 private nonce;

    // ============ Events ============

    event OrganizationCreated(
        bytes32 indexed orgId,
        address indexed owner,
        string name,
        uint256 timestamp
    );

    event CredentialIssued(
        bytes32 indexed credentialId,
        bytes32 indexed orgId,
        address indexed subject,
        Role role,
        address issuedBy,
        uint256 timestamp
    );

    event CredentialRevoked(
        bytes32 indexed orgId,
        address indexed subject,
        address indexed revokedBy,
        uint256 timestamp
    );

    event RoleUpdated(
        bytes32 indexed orgId,
        address indexed subject,
        Role oldRole,
        Role newRole,
        uint256 timestamp
    );

    // ============ Errors ============

    error Unauthorized();
    error CredentialNotFound();
    error OrganizationNotFound();
    error OrganizationExists();
    error CredentialExpired();
    error CredentialAlreadyRevoked();
    error InvalidOrganizationName();
    error CannotRevokeSelf();

    // ============ Modifiers ============

    modifier onlyAdmin(bytes32 orgId) {
        if (!_isAdmin(orgId, msg.sender)) {
            revert Unauthorized();
        }
        _;
    }

    modifier organizationExists(bytes32 orgId) {
        if (!organizations[orgId].exists) {
            revert OrganizationNotFound();
        }
        _;
    }

    // ============ Constructor ============

    constructor() {
        nonce = 0;
    }

    // ============ Public Functions ============

    /**
     * @dev Create a new organization
     * @param name The name of the organization
     * @return orgId The unique identifier for the organization
     */
    function createOrganization(string memory name) external returns (bytes32 orgId) {
        if (bytes(name).length == 0 || bytes(name).length > 64) {
            revert InvalidOrganizationName();
        }

        orgId = _generateOrgId(name, msg.sender);

        if (organizations[orgId].exists) {
            revert OrganizationExists();
        }

        organizations[orgId] = Organization({
            id: orgId,
            name: name,
            owner: msg.sender,
            createdAt: block.timestamp,
            memberCount: 1,
            exists: true
        });

        // Auto-grant admin role to creator
        _issueCredentialInternal(orgId, msg.sender, Role.Admin, msg.sender, 0);

        emit OrganizationCreated(orgId, msg.sender, name, block.timestamp);

        return orgId;
    }

    /**
     * @dev Issue a role credential to a user
     * @param orgId The organization ID
     * @param subject The address to receive the credential
     * @param role The role to assign
     * @param expiresAt Expiration timestamp (0 for no expiration)
     * @return credentialId The unique identifier for the credential
     */
    function issueCredential(
        bytes32 orgId,
        address subject,
        Role role,
        uint256 expiresAt
    )
        external
        organizationExists(orgId)
        onlyAdmin(orgId)
        returns (bytes32 credentialId)
    {
        return _issueCredentialInternal(orgId, subject, role, msg.sender, expiresAt);
    }

    /**
     * @dev Revoke a user's credential
     * @param orgId The organization ID
     * @param subject The address whose credential to revoke
     */
    function revokeCredential(
        bytes32 orgId,
        address subject
    )
        external
        organizationExists(orgId)
        onlyAdmin(orgId)
    {
        Credential storage cred = credentials[orgId][subject];

        if (cred.subject == address(0)) {
            revert CredentialNotFound();
        }

        if (subject == msg.sender) {
            revert CannotRevokeSelf();
        }

        cred.revoked = true;

        // Remove from members list
        _removeFromMembersList(orgId, subject);

        // Update member count
        organizations[orgId].memberCount = uint32(orgMembers[orgId].length);

        emit CredentialRevoked(orgId, subject, msg.sender, block.timestamp);
    }

    /**
     * @dev Update a user's role
     * @param orgId The organization ID
     * @param subject The address whose role to update
     * @param newRole The new role to assign
     */
    function updateRole(
        bytes32 orgId,
        address subject,
        Role newRole
    )
        external
        organizationExists(orgId)
        onlyAdmin(orgId)
    {
        Credential storage cred = credentials[orgId][subject];

        if (cred.subject == address(0)) {
            revert CredentialNotFound();
        }

        if (cred.revoked) {
            revert CredentialAlreadyRevoked();
        }

        Role oldRole = cred.role;
        cred.role = newRole;

        emit RoleUpdated(orgId, subject, oldRole, newRole, block.timestamp);
    }

    /**
     * @dev Check if user has permission to perform an action on a resource
     * @param orgId The organization ID
     * @param user The address to check
     * @param action The action to check
     * @param resource The resource to check
     * @return bool True if user has permission
     */
    function hasPermission(
        bytes32 orgId,
        address user,
        Action action,
        Resource resource
    ) external view returns (bool) {
        if (!organizations[orgId].exists) {
            return false;
        }

        Credential memory cred = credentials[orgId][user];

        if (cred.subject == address(0) || cred.revoked) {
            return false;
        }

        // Check expiration
        if (cred.expiresAt > 0 && block.timestamp > cred.expiresAt) {
            return false;
        }

        return _checkPermission(cred.role, action, resource);
    }

    /**
     * @dev Get user's role in organization
     * @param orgId The organization ID
     * @param user The address to check
     * @return role The user's role (Admin, Member, or Viewer)
     * @return hasRole True if user has a valid role
     */
    function getUserRole(bytes32 orgId, address user)
        external
        view
        returns (Role role, bool hasRole)
    {
        Credential memory cred = credentials[orgId][user];

        if (cred.subject == address(0) || cred.revoked) {
            return (Role.Viewer, false);
        }

        if (cred.expiresAt > 0 && block.timestamp > cred.expiresAt) {
            return (Role.Viewer, false);
        }

        return (cred.role, true);
    }

    /**
     * @dev Get full credential details
     * @param orgId The organization ID
     * @param user The address to check
     * @return credential The complete credential struct
     */
    function getCredential(bytes32 orgId, address user)
        external
        view
        returns (Credential memory credential)
    {
        return credentials[orgId][user];
    }

    /**
     * @dev Get organization details
     * @param orgId The organization ID
     * @return organization The complete organization struct
     */
    function getOrganization(bytes32 orgId)
        external
        view
        returns (Organization memory organization)
    {
        return organizations[orgId];
    }

    /**
     * @dev Get all members of an organization
     * @param orgId The organization ID
     * @return members Array of member addresses
     */
    function getOrganizationMembers(bytes32 orgId)
        external
        view
        returns (address[] memory members)
    {
        return orgMembers[orgId];
    }

    /**
     * @dev Get member count for an organization
     * @param orgId The organization ID
     * @return count Number of members
     */
    function getMemberCount(bytes32 orgId)
        external
        view
        returns (uint32 count)
    {
        return organizations[orgId].memberCount;
    }

    // ============ Internal Functions ============

    /**
     * @dev Internal function to issue credentials
     */
    function _issueCredentialInternal(
        bytes32 orgId,
        address subject,
        Role role,
        address issuedBy,
        uint256 expiresAt
    ) internal returns (bytes32 credentialId) {
        credentialId = _generateCredentialId();

        credentials[orgId][subject] = Credential({
            id: credentialId,
            orgId: orgId,
            subject: subject,
            role: role,
            issuedBy: issuedBy,
            issuedAt: block.timestamp,
            expiresAt: expiresAt,
            revoked: false
        });

        // Add to members list if not already present
        if (!_isMember(orgId, subject)) {
            orgMembers[orgId].push(subject);
            organizations[orgId].memberCount = uint32(orgMembers[orgId].length);
        }

        nonce++;

        emit CredentialIssued(credentialId, orgId, subject, role, issuedBy, block.timestamp);

        return credentialId;
    }

    /**
     * @dev Check if address is a member of organization
     */
    function _isMember(bytes32 orgId, address user) internal view returns (bool) {
        address[] memory members = orgMembers[orgId];
        for (uint256 i = 0; i < members.length; i++) {
            if (members[i] == user) {
                return true;
            }
        }
        return false;
    }

    /**
     * @dev Remove address from members list
     */
    function _removeFromMembersList(bytes32 orgId, address user) internal {
        address[] storage members = orgMembers[orgId];
        for (uint256 i = 0; i < members.length; i++) {
            if (members[i] == user) {
                members[i] = members[members.length - 1];
                members.pop();
                break;
            }
        }
    }

    /**
     * @dev Check if user is admin
     */
    function _isAdmin(bytes32 orgId, address user) internal view returns (bool) {
        Credential memory cred = credentials[orgId][user];

        if (cred.subject == address(0) || cred.revoked) {
            return false;
        }

        if (cred.expiresAt > 0 && block.timestamp > cred.expiresAt) {
            return false;
        }

        return cred.role == Role.Admin;
    }

    /**
     * @dev Permission check logic based on role
     */
    function _checkPermission(
        Role role,
        Action action,
        Resource resource
    ) internal pure returns (bool) {
        if (role == Role.Admin) {
            // Admins have all permissions
            return true;
        }

        if (role == Role.PeopleCulture) {
            // People/Culture team can:
            // - Create, vote, read polls (full poll management)
            // - Read forms, governance, users
            // - Manage user permissions (limited admin)
            if (resource == Resource.Poll) {
                return action == Action.Create || action == Action.Vote || action == Action.Read;
            }
            if (resource == Resource.Form || resource == Resource.Governance) {
                return action == Action.Read;
            }
            if (resource == Resource.User) {
                return action == Action.Read || action == Action.Manage;
            }
            return false;
        }

        if (role == Role.Member) {
            // Members can:
            // - Vote on polls (but not create)
            // - Create and view their own forms
            // - Read governance and users
            if (resource == Resource.Poll) {
                return action == Action.Vote || action == Action.Read;
            }
            if (resource == Resource.Form) {
                return action == Action.Create || action == Action.Read;
            }
            if (resource == Resource.Governance || resource == Resource.User) {
                return action == Action.Read;
            }
            return false;
        }

        if (role == Role.Viewer) {
            // Viewers have very limited read access
            // - Can read governance (high-level info only)
            // - CANNOT view poll/form results
            if (resource == Resource.Governance) {
                return action == Action.Read;
            }
            return false;
        }

        return false;
    }

    /**
     * @dev Generate organization ID from name and owner
     */
    function _generateOrgId(string memory name, address owner) internal view returns (bytes32) {
        return keccak256(abi.encodePacked(name, owner, block.timestamp));
    }

    /**
     * @dev Generate unique credential ID
     */
    function _generateCredentialId() internal view returns (bytes32) {
        return keccak256(abi.encodePacked(nonce, block.timestamp, msg.sender));
    }
}
