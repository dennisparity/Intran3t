const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Intran3tRBAC", function () {
  let rbac;
  let owner;
  let admin;
  let member;
  let viewer;

  beforeEach(async function () {
    [owner, admin, member, viewer] = await ethers.getSigners();

    const Intran3tRBAC = await ethers.getContractFactory("Intran3tRBAC");
    rbac = await Intran3tRBAC.deploy();
    await rbac.waitForDeployment();
  });

  describe("Organization Management", function () {
    it("Should create a new organization", async function () {
      const tx = await rbac.createOrganization("Test Org");
      const receipt = await tx.wait();

      // Find OrganizationCreated event
      const event = receipt.logs.find(
        (log) => log.fragment && log.fragment.name === "OrganizationCreated"
      );

      expect(event).to.not.be.undefined;
      const orgId = event.args[0];

      const org = await rbac.getOrganization(orgId);
      expect(org.name).to.equal("Test Org");
      expect(org.owner).to.equal(owner.address);
      expect(org.memberCount).to.equal(1);
    });

    it("Should auto-grant admin role to organization creator", async function () {
      const tx = await rbac.createOrganization("Test Org");
      const receipt = await tx.wait();

      const event = receipt.logs.find(
        (log) => log.fragment && log.fragment.name === "OrganizationCreated"
      );
      const orgId = event.args[0];

      const [role, hasRole] = await rbac.getUserRole(orgId, owner.address);
      expect(hasRole).to.be.true;
      expect(role).to.equal(0); // Role.Admin
    });

    it("Should reject empty organization name", async function () {
      await expect(rbac.createOrganization("")).to.be.revertedWithCustomError(
        rbac,
        "InvalidOrganizationName"
      );
    });

    it("Should reject organization name longer than 64 characters", async function () {
      const longName = "a".repeat(65);
      await expect(rbac.createOrganization(longName)).to.be.revertedWithCustomError(
        rbac,
        "InvalidOrganizationName"
      );
    });
  });

  describe("Credential Management", function () {
    let orgId;

    beforeEach(async function () {
      const tx = await rbac.createOrganization("Test Org");
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        (log) => log.fragment && log.fragment.name === "OrganizationCreated"
      );
      orgId = event.args[0];
    });

    it("Should issue a credential to a user", async function () {
      await rbac.issueCredential(orgId, member.address, 1, 0); // Role.Member, no expiry

      const [role, hasRole] = await rbac.getUserRole(orgId, member.address);
      expect(hasRole).to.be.true;
      expect(role).to.equal(1); // Role.Member
    });

    it("Should only allow admins to issue credentials", async function () {
      await expect(
        rbac.connect(member).issueCredential(orgId, viewer.address, 2, 0)
      ).to.be.revertedWithCustomError(rbac, "Unauthorized");
    });

    it("Should revoke a credential", async function () {
      await rbac.issueCredential(orgId, member.address, 1, 0);

      await rbac.revokeCredential(orgId, member.address);

      const [, hasRole] = await rbac.getUserRole(orgId, member.address);
      expect(hasRole).to.be.false;
    });

    it("Should not allow self-revocation", async function () {
      await expect(
        rbac.revokeCredential(orgId, owner.address)
      ).to.be.revertedWithCustomError(rbac, "CannotRevokeSelf");
    });

    it("Should update a user's role", async function () {
      await rbac.issueCredential(orgId, member.address, 2, 0); // Role.Viewer

      await rbac.updateRole(orgId, member.address, 1); // Role.Member

      const [role] = await rbac.getUserRole(orgId, member.address);
      expect(role).to.equal(1); // Role.Member
    });

    it("Should expire credentials after expiration time", async function () {
      const futureTimestamp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      await rbac.issueCredential(orgId, member.address, 1, futureTimestamp);

      // Should have role now
      let [, hasRole] = await rbac.getUserRole(orgId, member.address);
      expect(hasRole).to.be.true;

      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [3601]);
      await ethers.provider.send("evm_mine");

      // Should not have role after expiration
      [, hasRole] = await rbac.getUserRole(orgId, member.address);
      expect(hasRole).to.be.false;
    });
  });

  describe("Permission Checks", function () {
    let orgId;

    beforeEach(async function () {
      const tx = await rbac.createOrganization("Test Org");
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        (log) => log.fragment && log.fragment.name === "OrganizationCreated"
      );
      orgId = event.args[0];

      // Issue credentials
      await rbac.issueCredential(orgId, admin.address, 0, 0); // Admin
      await rbac.issueCredential(orgId, member.address, 1, 0); // Member
      await rbac.issueCredential(orgId, viewer.address, 2, 0); // Viewer
    });

    it("Admin should have all permissions", async function () {
      expect(await rbac.hasPermission(orgId, admin.address, 0, 0)).to.be.true; // Create Poll
      expect(await rbac.hasPermission(orgId, admin.address, 3, 1)).to.be.true; // Delete Form
      expect(await rbac.hasPermission(orgId, admin.address, 6, 3)).to.be.true; // Manage User
    });

    it("Member should have limited permissions", async function () {
      // Can create polls
      expect(await rbac.hasPermission(orgId, member.address, 0, 0)).to.be.true; // Create Poll

      // Can vote on polls
      expect(await rbac.hasPermission(orgId, member.address, 5, 0)).to.be.true; // Vote Poll

      // Can create forms
      expect(await rbac.hasPermission(orgId, member.address, 0, 1)).to.be.true; // Create Form

      // Cannot manage users
      expect(await rbac.hasPermission(orgId, member.address, 6, 3)).to.be.false; // Manage User

      // Cannot delete
      expect(await rbac.hasPermission(orgId, member.address, 3, 0)).to.be.false; // Delete Poll
    });

    it("Viewer should only have read permissions", async function () {
      // Can read
      expect(await rbac.hasPermission(orgId, viewer.address, 1, 0)).to.be.true; // Read Poll

      // Cannot create
      expect(await rbac.hasPermission(orgId, viewer.address, 0, 0)).to.be.false; // Create Poll

      // Cannot vote
      expect(await rbac.hasPermission(orgId, viewer.address, 5, 0)).to.be.false; // Vote Poll
    });

    it("Revoked credentials should have no permissions", async function () {
      await rbac.revokeCredential(orgId, member.address);

      expect(await rbac.hasPermission(orgId, member.address, 0, 0)).to.be.false;
      expect(await rbac.hasPermission(orgId, member.address, 1, 0)).to.be.false;
    });
  });

  describe("Organization Members", function () {
    let orgId;

    beforeEach(async function () {
      const tx = await rbac.createOrganization("Test Org");
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        (log) => log.fragment && log.fragment.name === "OrganizationCreated"
      );
      orgId = event.args[0];
    });

    it("Should track organization members", async function () {
      await rbac.issueCredential(orgId, member.address, 1, 0);
      await rbac.issueCredential(orgId, viewer.address, 2, 0);

      const members = await rbac.getOrganizationMembers(orgId);
      expect(members.length).to.equal(3); // owner + member + viewer
      expect(members).to.include(owner.address);
      expect(members).to.include(member.address);
      expect(members).to.include(viewer.address);
    });

    it("Should update member count correctly", async function () {
      expect(await rbac.getMemberCount(orgId)).to.equal(1);

      await rbac.issueCredential(orgId, member.address, 1, 0);
      expect(await rbac.getMemberCount(orgId)).to.equal(2);

      await rbac.issueCredential(orgId, viewer.address, 2, 0);
      expect(await rbac.getMemberCount(orgId)).to.equal(3);

      await rbac.revokeCredential(orgId, member.address);
      expect(await rbac.getMemberCount(orgId)).to.equal(2);
    });
  });
});
