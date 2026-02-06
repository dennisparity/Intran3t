import { describe, it } from "node:test";
import assert from "node:assert";
import hre from "hardhat";
import { getEventSelector } from "viem";

// OrganizationCreated(bytes32 indexed orgId, address indexed owner, string name, uint256 timestamp)
const ORG_CREATED = getEventSelector(
  "OrganizationCreated(bytes32,address,string,uint256)"
);

async function setup() {
  const connection = await hre.network.connect();
  const rbac = await connection.viem.deployContract("Intran3tRBAC");
  const wallets = await connection.viem.getWalletClients();
  const pub = await connection.viem.getPublicClient();
  // wallets[0] = deployer/owner, [1] = admin, [2] = member, [3] = viewer
  return { connection, rbac, pub, wallets };
}

async function createOrg(
  rbac: Awaited<ReturnType<typeof setup>>["rbac"],
  pub: Awaited<ReturnType<typeof setup>>["pub"],
  name = "Test Org"
) {
  const hash = await rbac.write.createOrganization([name]);
  const receipt = await pub.getTransactionReceipt({ hash });
  const log = receipt.logs.find((l: { topics: string[] }) => l.topics[0] === ORG_CREATED);
  return log!.topics[1] as `0x${string}`;
}

// ——— Organization Management ———

describe("Organization Management", () => {
  it("should create a new organization", async () => {
    const { rbac, pub, wallets } = await setup();
    const orgId = await createOrg(rbac, pub);

    const org = await rbac.read.getOrganization([orgId]);
    // viem returns single-struct returns as a named tuple object
    assert.strictEqual(org.name, "Test Org");
    assert.strictEqual(org.owner.toLowerCase(), wallets[0].account.address.toLowerCase());
    assert.strictEqual(org.memberCount, 1);
  });

  it("should auto-grant admin to creator", async () => {
    const { rbac, pub, wallets } = await setup();
    const orgId = await createOrg(rbac, pub);

    const [role, hasRole] = await rbac.read.getUserRole([orgId, wallets[0].account.address]);
    assert.strictEqual(hasRole, true);
    assert.strictEqual(role, 0); // Role.Admin
  });

  it("should reject empty name", async () => {
    const { rbac } = await setup();
    await assert.rejects(
      () => rbac.write.createOrganization([""]),
      /InvalidOrganizationName/
    );
  });

  it("should reject name > 64 chars", async () => {
    const { rbac } = await setup();
    await assert.rejects(
      () => rbac.write.createOrganization(["a".repeat(65)]),
      /InvalidOrganizationName/
    );
  });
});

// ——— Credential Management ———

describe("Credential Management", () => {
  it("should issue a credential", async () => {
    const { rbac, pub, wallets } = await setup();
    const orgId = await createOrg(rbac, pub);

    await rbac.write.issueCredential([orgId, wallets[2].account.address, 1, 0]); // Member, no expiry

    const [role, hasRole] = await rbac.read.getUserRole([orgId, wallets[2].account.address]);
    assert.strictEqual(hasRole, true);
    assert.strictEqual(role, 1); // Role.Member
  });

  it("should reject non-admin issuing credentials", async () => {
    const { connection, rbac, pub, wallets } = await setup();
    const orgId = await createOrg(rbac, pub);

    const asNonAdmin = await connection.viem.getContractAt("Intran3tRBAC", rbac.address, {
      client: { wallet: wallets[2] },
    });

    await assert.rejects(
      () => asNonAdmin.write.issueCredential([orgId, wallets[3].account.address, 2, 0]),
      /reverted/ // Unauthorized() — selector 0x82b42900, not decoded cross-signer
    );
  });

  it("should revoke a credential", async () => {
    const { rbac, pub, wallets } = await setup();
    const orgId = await createOrg(rbac, pub);

    await rbac.write.issueCredential([orgId, wallets[2].account.address, 1, 0]);
    await rbac.write.revokeCredential([orgId, wallets[2].account.address]);

    const [, hasRole] = await rbac.read.getUserRole([orgId, wallets[2].account.address]);
    assert.strictEqual(hasRole, false);
  });

  it("should reject self-revocation", async () => {
    const { rbac, pub, wallets } = await setup();
    const orgId = await createOrg(rbac, pub);

    await assert.rejects(
      () => rbac.write.revokeCredential([orgId, wallets[0].account.address]),
      /CannotRevokeSelf/
    );
  });

  it("should update a user's role", async () => {
    const { rbac, pub, wallets } = await setup();
    const orgId = await createOrg(rbac, pub);

    await rbac.write.issueCredential([orgId, wallets[2].account.address, 2, 0]); // Viewer
    await rbac.write.updateRole([orgId, wallets[2].account.address, 1]); // → Member

    const [role] = await rbac.read.getUserRole([orgId, wallets[2].account.address]);
    assert.strictEqual(role, 1);
  });

  it("should expire credentials after expiration time", async () => {
    const { rbac, pub, wallets } = await setup();
    const orgId = await createOrg(rbac, pub);

    const block = await pub.getBlock();
    const expiresAt = Number(block.timestamp) + 3600;

    await rbac.write.issueCredential([orgId, wallets[2].account.address, 1, expiresAt]);

    let [, hasRole] = await rbac.read.getUserRole([orgId, wallets[2].account.address]);
    assert.strictEqual(hasRole, true);

    // Advance past expiration (EDR supports evm_increaseTime + evm_mine)
    await (pub as { request: Function }).request({ method: "evm_increaseTime", params: [3601] });
    await (pub as { request: Function }).request({ method: "evm_mine", params: [] });

    [, hasRole] = await rbac.read.getUserRole([orgId, wallets[2].account.address]);
    assert.strictEqual(hasRole, false);
  });
});

// ——— Permission Checks ———
// Action enum:   Create=0  Read=1  Update=2  Delete=3  Admin=4  Vote=5  Manage=6
// Resource enum: Poll=0    Form=1  Governance=2  User=3  Settings=4  All=5

describe("Permission Checks", () => {
  it("admin has all permissions", async () => {
    const { rbac, pub, wallets } = await setup();
    const orgId = await createOrg(rbac, pub);

    await rbac.write.issueCredential([orgId, wallets[1].account.address, 0, 0]); // Admin

    assert.strictEqual(await rbac.read.hasPermission([orgId, wallets[1].account.address, 0, 0]), true);  // Create Poll
    assert.strictEqual(await rbac.read.hasPermission([orgId, wallets[1].account.address, 3, 1]), true);  // Delete Form
    assert.strictEqual(await rbac.read.hasPermission([orgId, wallets[1].account.address, 6, 3]), true);  // Manage User
  });

  it("member can vote/read polls and create/read forms only", async () => {
    const { rbac, pub, wallets } = await setup();
    const orgId = await createOrg(rbac, pub);

    await rbac.write.issueCredential([orgId, wallets[2].account.address, 1, 0]); // Member

    assert.strictEqual(await rbac.read.hasPermission([orgId, wallets[2].account.address, 5, 0]), true);  // Vote Poll ✓
    assert.strictEqual(await rbac.read.hasPermission([orgId, wallets[2].account.address, 1, 0]), true);  // Read Poll ✓
    assert.strictEqual(await rbac.read.hasPermission([orgId, wallets[2].account.address, 0, 1]), true);  // Create Form ✓
    assert.strictEqual(await rbac.read.hasPermission([orgId, wallets[2].account.address, 0, 0]), false); // Create Poll ✗ (Members cannot create polls)
    assert.strictEqual(await rbac.read.hasPermission([orgId, wallets[2].account.address, 6, 3]), false); // Manage User ✗
    assert.strictEqual(await rbac.read.hasPermission([orgId, wallets[2].account.address, 3, 0]), false); // Delete Poll ✗
  });

  it("viewer has read-only governance access", async () => {
    const { rbac, pub, wallets } = await setup();
    const orgId = await createOrg(rbac, pub);

    await rbac.write.issueCredential([orgId, wallets[3].account.address, 2, 0]); // Viewer

    assert.strictEqual(await rbac.read.hasPermission([orgId, wallets[3].account.address, 1, 2]), true);  // Read Governance ✓
    assert.strictEqual(await rbac.read.hasPermission([orgId, wallets[3].account.address, 1, 0]), false); // Read Poll ✗ (Viewers cannot read polls)
    assert.strictEqual(await rbac.read.hasPermission([orgId, wallets[3].account.address, 0, 0]), false); // Create Poll ✗
  });

  it("revoked credentials lose all permissions", async () => {
    const { rbac, pub, wallets } = await setup();
    const orgId = await createOrg(rbac, pub);

    await rbac.write.issueCredential([orgId, wallets[2].account.address, 1, 0]);
    await rbac.write.revokeCredential([orgId, wallets[2].account.address]);

    assert.strictEqual(await rbac.read.hasPermission([orgId, wallets[2].account.address, 0, 0]), false);
    assert.strictEqual(await rbac.read.hasPermission([orgId, wallets[2].account.address, 1, 0]), false);
  });
});

// ——— Organization Members ———

describe("Organization Members", () => {
  it("should track members", async () => {
    const { rbac, pub, wallets } = await setup();
    const orgId = await createOrg(rbac, pub);

    await rbac.write.issueCredential([orgId, wallets[2].account.address, 1, 0]);
    await rbac.write.issueCredential([orgId, wallets[3].account.address, 2, 0]);

    const members = await rbac.read.getOrganizationMembers([orgId]);
    const lower = (arr: string[]) => arr.map((a: string) => a.toLowerCase());
    assert.strictEqual(members.length, 3); // owner + member + viewer
    assert.ok(lower(members).includes(wallets[0].account.address.toLowerCase()));
    assert.ok(lower(members).includes(wallets[2].account.address.toLowerCase()));
    assert.ok(lower(members).includes(wallets[3].account.address.toLowerCase()));
  });

  it("should update member count on add/remove", async () => {
    const { rbac, pub, wallets } = await setup();
    const orgId = await createOrg(rbac, pub);

    assert.strictEqual(await rbac.read.getMemberCount([orgId]), 1);

    await rbac.write.issueCredential([orgId, wallets[2].account.address, 1, 0]);
    assert.strictEqual(await rbac.read.getMemberCount([orgId]), 2);

    await rbac.write.issueCredential([orgId, wallets[3].account.address, 2, 0]);
    assert.strictEqual(await rbac.read.getMemberCount([orgId]), 3);

    await rbac.write.revokeCredential([orgId, wallets[2].account.address]);
    assert.strictEqual(await rbac.read.getMemberCount([orgId]), 2);
  });
});
