#![cfg_attr(not(feature = "std"), no_std, no_main)]

#[ink::contract]
mod intran3t_rbac {
    use ink::prelude::string::String;
    use ink::prelude::vec::Vec;
    use ink::storage::Mapping;

    /// Role types for organization members
    #[derive(Debug, PartialEq, Eq, Clone, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum Role {
        Admin,
        Member,
        Viewer,
    }

    /// Organization data structure
    #[derive(Debug, Clone, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub struct Organization {
        pub id: [u8; 32],
        pub name: String,
        pub owner: AccountId,
        pub created_at: Timestamp,
        pub member_count: u32,
    }

    /// Verifiable Credential structure
    #[derive(Debug, Clone, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub struct Credential {
        pub id: [u8; 32],
        pub org_id: [u8; 32],
        pub subject: AccountId,
        pub role: Role,
        pub issued_by: AccountId,
        pub issued_at: Timestamp,
        pub expires_at: Option<Timestamp>,
        pub revoked: bool,
    }

    /// Permission action types
    #[derive(Debug, PartialEq, Eq, Clone, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum Action {
        Create,
        Read,
        Update,
        Delete,
        Admin,
        Vote,
        Manage,
    }

    /// Resource types
    #[derive(Debug, PartialEq, Eq, Clone, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum Resource {
        Poll,
        Form,
        Governance,
        User,
        Settings,
        All,
    }

    /// Main RBAC storage
    #[ink(storage)]
    pub struct Intran3tRBAC {
        /// Organization registry: org_id => Organization
        organizations: Mapping<[u8; 32], Organization>,

        /// User credentials: (org_id, user_address) => Credential
        credentials: Mapping<([u8; 32], AccountId), Credential>,

        /// Organization members list: org_id => Vec<AccountId>
        org_members: Mapping<[u8; 32], Vec<AccountId>>,

        /// Nonce for generating unique IDs
        nonce: u64,
    }

    /// Errors that can occur
    #[derive(Debug, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum Error {
        /// Caller is not authorized to perform this action
        Unauthorized,
        /// Credential not found
        CredentialNotFound,
        /// Organization not found
        OrganizationNotFound,
        /// Organization already exists
        OrganizationExists,
        /// Credential has expired
        CredentialExpired,
        /// Credential has been revoked
        CredentialRevoked,
        /// Invalid organization name
        InvalidOrganizationName,
    }

    /// Events emitted by the contract
    #[ink(event)]
    pub struct OrganizationCreated {
        #[ink(topic)]
        org_id: [u8; 32],
        #[ink(topic)]
        owner: AccountId,
        name: String,
    }

    #[ink(event)]
    pub struct CredentialIssued {
        #[ink(topic)]
        credential_id: [u8; 32],
        #[ink(topic)]
        org_id: [u8; 32],
        #[ink(topic)]
        subject: AccountId,
        role: Role,
        issued_by: AccountId,
    }

    #[ink(event)]
    pub struct CredentialRevoked {
        #[ink(topic)]
        org_id: [u8; 32],
        #[ink(topic)]
        subject: AccountId,
        revoked_by: AccountId,
    }

    impl Intran3tRBAC {
        /// Constructor - initialize the contract
        #[ink(constructor)]
        pub fn new() -> Self {
            Self {
                organizations: Mapping::default(),
                credentials: Mapping::default(),
                org_members: Mapping::default(),
                nonce: 0,
            }
        }

        /// Create a new organization
        /// The caller automatically becomes the admin
        #[ink(message)]
        pub fn create_organization(&mut self, name: String) -> Result<[u8; 32], Error> {
            if name.is_empty() || name.len() > 64 {
                return Err(Error::InvalidOrganizationName);
            }

            let caller = self.env().caller();
            let org_id = self.generate_org_id(&name, &caller);

            // Check if organization already exists
            if self.organizations.get(&org_id).is_some() {
                return Err(Error::OrganizationExists);
            }

            let org = Organization {
                id: org_id,
                name: name.clone(),
                owner: caller,
                created_at: self.env().block_timestamp(),
                member_count: 1,
            };

            self.organizations.insert(org_id, &org);

            // Initialize empty members list
            self.org_members.insert(org_id, &Vec::new());

            // Auto-grant admin role to creator
            self.issue_credential_internal(org_id, caller, Role::Admin, caller, None)?;

            self.env().emit_event(OrganizationCreated {
                org_id,
                owner: caller,
                name,
            });

            Ok(org_id)
        }

        /// Issue a role credential to a user
        /// Only admins can issue credentials
        #[ink(message)]
        pub fn issue_credential(
            &mut self,
            org_id: [u8; 32],
            subject: AccountId,
            role: Role,
            expires_at: Option<Timestamp>,
        ) -> Result<[u8; 32], Error> {
            let caller = self.env().caller();

            // Verify organization exists
            self.organizations.get(&org_id).ok_or(Error::OrganizationNotFound)?;

            // Check if caller is admin
            self.require_admin(org_id, caller)?;

            self.issue_credential_internal(org_id, subject, role, caller, expires_at)
        }

        /// Internal credential issuance logic
        fn issue_credential_internal(
            &mut self,
            org_id: [u8; 32],
            subject: AccountId,
            role: Role,
            issued_by: AccountId,
            expires_at: Option<Timestamp>,
        ) -> Result<[u8; 32], Error> {
            let cred_id = self.generate_credential_id();

            let credential = Credential {
                id: cred_id,
                org_id,
                subject,
                role: role.clone(),
                issued_by,
                issued_at: self.env().block_timestamp(),
                expires_at,
                revoked: false,
            };

            // Store credential
            self.credentials.insert((org_id, subject), &credential);

            // Add to members list if not already present
            let mut members = self.org_members.get(&org_id).unwrap_or_default();
            if !members.contains(&subject) {
                members.push(subject);
                self.org_members.insert(org_id, &members);

                // Update member count
                if let Some(mut org) = self.organizations.get(&org_id) {
                    org.member_count = members.len() as u32;
                    self.organizations.insert(org_id, &org);
                }
            }

            self.nonce += 1;

            self.env().emit_event(CredentialIssued {
                credential_id: cred_id,
                org_id,
                subject,
                role,
                issued_by,
            });

            Ok(cred_id)
        }

        /// Revoke a user's credential
        /// Only admins can revoke credentials
        #[ink(message)]
        pub fn revoke_credential(
            &mut self,
            org_id: [u8; 32],
            subject: AccountId,
        ) -> Result<(), Error> {
            let caller = self.env().caller();

            // Verify organization exists
            self.organizations.get(&org_id).ok_or(Error::OrganizationNotFound)?;

            // Check if caller is admin
            self.require_admin(org_id, caller)?;

            // Cannot revoke own credential if you're the only admin
            if caller == subject {
                // TODO: Add logic to check if there are other admins
                // For now, allow self-revocation
            }

            if let Some(mut cred) = self.credentials.get((org_id, subject)) {
                cred.revoked = true;
                self.credentials.insert((org_id, subject), &cred);

                // Remove from members list
                let mut members = self.org_members.get(&org_id).unwrap_or_default();
                members.retain(|&addr| addr != subject);
                self.org_members.insert(org_id, &members);

                // Update member count
                if let Some(mut org) = self.organizations.get(&org_id) {
                    org.member_count = members.len() as u32;
                    self.organizations.insert(org_id, &org);
                }

                self.env().emit_event(CredentialRevoked {
                    org_id,
                    subject,
                    revoked_by: caller,
                });

                Ok(())
            } else {
                Err(Error::CredentialNotFound)
            }
        }

        /// Update a user's role
        /// Only admins can update roles
        #[ink(message)]
        pub fn update_role(
            &mut self,
            org_id: [u8; 32],
            subject: AccountId,
            new_role: Role,
        ) -> Result<(), Error> {
            let caller = self.env().caller();

            // Verify organization exists
            self.organizations.get(&org_id).ok_or(Error::OrganizationNotFound)?;

            // Check if caller is admin
            self.require_admin(org_id, caller)?;

            if let Some(mut cred) = self.credentials.get((org_id, subject)) {
                if cred.revoked {
                    return Err(Error::CredentialRevoked);
                }

                cred.role = new_role.clone();
                self.credentials.insert((org_id, subject), &cred);

                Ok(())
            } else {
                Err(Error::CredentialNotFound)
            }
        }

        /// Check if user has permission to perform an action on a resource
        #[ink(message)]
        pub fn has_permission(
            &self,
            org_id: [u8; 32],
            user: AccountId,
            action: Action,
            resource: Resource,
        ) -> bool {
            // Verify organization exists
            if self.organizations.get(&org_id).is_none() {
                return false;
            }

            // Get user's credential
            if let Some(cred) = self.credentials.get((org_id, user)) {
                // Check if revoked
                if cred.revoked {
                    return false;
                }

                // Check expiration
                if let Some(expires_at) = cred.expires_at {
                    if self.env().block_timestamp() > expires_at {
                        return false;
                    }
                }

                // Check permissions based on role
                self.check_permission(&cred.role, &action, &resource)
            } else {
                false
            }
        }

        /// Internal permission check logic
        fn check_permission(&self, role: &Role, action: &Action, resource: &Resource) -> bool {
            match role {
                Role::Admin => {
                    // Admins have all permissions
                    true
                }
                Role::Member => {
                    // Members can:
                    // - Create and vote on polls
                    // - Create and submit forms
                    // - Read governance
                    // - Read user profiles
                    match (action, resource) {
                        (Action::Create, Resource::Poll) => true,
                        (Action::Vote, Resource::Poll) => true,
                        (Action::Read, Resource::Poll) => true,
                        (Action::Create, Resource::Form) => true,
                        (Action::Read, Resource::Form) => true,
                        (Action::Read, Resource::Governance) => true,
                        (Action::Read, Resource::User) => true,
                        _ => false,
                    }
                }
                Role::Viewer => {
                    // Viewers can only read
                    matches!(action, Action::Read)
                }
            }
        }

        /// Get user's role in organization
        #[ink(message)]
        pub fn get_user_role(&self, org_id: [u8; 32], user: AccountId) -> Option<Role> {
            self.credentials
                .get((org_id, user))
                .filter(|c| !c.revoked && self.is_credential_valid(c))
                .map(|c| c.role)
        }

        /// Get user's full credential
        #[ink(message)]
        pub fn get_credential(&self, org_id: [u8; 32], user: AccountId) -> Option<Credential> {
            self.credentials
                .get((org_id, user))
                .filter(|c| self.is_credential_valid(c))
        }

        /// Get organization details
        #[ink(message)]
        pub fn get_organization(&self, org_id: [u8; 32]) -> Option<Organization> {
            self.organizations.get(&org_id)
        }

        /// Get all members of an organization
        #[ink(message)]
        pub fn get_organization_members(&self, org_id: [u8; 32]) -> Vec<AccountId> {
            self.org_members.get(&org_id).unwrap_or_default()
        }

        /// Check if credential is valid (not revoked, not expired)
        fn is_credential_valid(&self, cred: &Credential) -> bool {
            if cred.revoked {
                return false;
            }

            if let Some(expires_at) = cred.expires_at {
                if self.env().block_timestamp() > expires_at {
                    return false;
                }
            }

            true
        }

        /// Require caller to be admin, otherwise return error
        fn require_admin(&self, org_id: [u8; 32], caller: AccountId) -> Result<(), Error> {
            if let Some(cred) = self.credentials.get((org_id, caller)) {
                if !cred.revoked && matches!(cred.role, Role::Admin) {
                    if let Some(expires_at) = cred.expires_at {
                        if self.env().block_timestamp() > expires_at {
                            return Err(Error::CredentialExpired);
                        }
                    }
                    return Ok(());
                }
            }
            Err(Error::Unauthorized)
        }

        /// Generate organization ID from name and owner
        fn generate_org_id(&self, name: &str, owner: &AccountId) -> [u8; 32] {
            let mut data = Vec::new();
            data.extend_from_slice(name.as_bytes());
            data.extend_from_slice(owner.as_ref());
            data.extend_from_slice(&self.env().block_timestamp().to_le_bytes());

            let mut output = <ink::env::hash::Sha2x256 as ink::env::hash::HashOutput>::Type::default();
            ink::env::hash_bytes::<ink::env::hash::Sha2x256>(&data, &mut output);
            output
        }

        /// Generate unique credential ID
        fn generate_credential_id(&self) -> [u8; 32] {
            let mut data = Vec::new();
            data.extend_from_slice(&self.nonce.to_le_bytes());
            data.extend_from_slice(&self.env().block_timestamp().to_le_bytes());
            data.extend_from_slice(self.env().caller().as_ref());

            let mut output = <ink::env::hash::Sha2x256 as ink::env::hash::HashOutput>::Type::default();
            ink::env::hash_bytes::<ink::env::hash::Sha2x256>(&data, &mut output);
            output
        }
    }

    #[cfg(test)]
    mod tests {
        use super::*;

        #[ink::test]
        fn test_create_organization() {
            let mut contract = Intran3tRBAC::new();
            let org_id = contract.create_organization("Test Org".to_string()).unwrap();

            let org = contract.get_organization(org_id).unwrap();
            assert_eq!(org.name, "Test Org");
            assert_eq!(org.member_count, 1);
        }

        #[ink::test]
        fn test_issue_credential() {
            let mut contract = Intran3tRBAC::new();
            let org_id = contract.create_organization("Test Org".to_string()).unwrap();

            let accounts = ink::env::test::default_accounts::<ink::env::DefaultEnvironment>();

            // Issue credential to another user
            let result = contract.issue_credential(
                org_id,
                accounts.bob,
                Role::Member,
                None,
            );

            assert!(result.is_ok());

            let role = contract.get_user_role(org_id, accounts.bob);
            assert_eq!(role, Some(Role::Member));
        }

        #[ink::test]
        fn test_permissions() {
            let mut contract = Intran3tRBAC::new();
            let org_id = contract.create_organization("Test Org".to_string()).unwrap();

            let accounts = ink::env::test::default_accounts::<ink::env::DefaultEnvironment>();

            // Admin should have all permissions
            assert!(contract.has_permission(
                org_id,
                accounts.alice,
                Action::Create,
                Resource::Poll,
            ));

            // Issue member credential
            contract.issue_credential(org_id, accounts.bob, Role::Member, None).unwrap();

            // Member can create polls
            assert!(contract.has_permission(
                org_id,
                accounts.bob,
                Action::Create,
                Resource::Poll,
            ));

            // Member cannot manage users
            assert!(!contract.has_permission(
                org_id,
                accounts.bob,
                Action::Manage,
                Resource::User,
            ));
        }

        #[ink::test]
        fn test_revoke_credential() {
            let mut contract = Intran3tRBAC::new();
            let org_id = contract.create_organization("Test Org".to_string()).unwrap();

            let accounts = ink::env::test::default_accounts::<ink::env::DefaultEnvironment>();

            // Issue and then revoke
            contract.issue_credential(org_id, accounts.bob, Role::Member, None).unwrap();
            contract.revoke_credential(org_id, accounts.bob).unwrap();

            // Should no longer have permissions
            assert!(!contract.has_permission(
                org_id,
                accounts.bob,
                Action::Read,
                Resource::Poll,
            ));
        }
    }
}
