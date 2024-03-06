import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Compliance.sol tests", function () {

  async function fixture() {

    // get accounts
    const [alice, bob, charlie] = await ethers.getSigners();

    // deploy contracts
    const a = alice.address;
    const VcData = await ethers.getContractFactory("VCData");
    const vcData = await VcData.deploy(a, a, a);
    const VcCompliance = await ethers.getContractFactory("VCCompliance");
    const vcCompliance = await VcCompliance.deploy(vcData.getAddress());

    return {
      vcData,
      vcCompliance,
      alice,
      bob,
      charlie,
    };
  }

  describe("Admin/permissions tests", function () {
    it("Master account admin adds data", async function () {
      const { vcData, alice } = await loadFixture(fixture);

      const countryCode = 'US';
      const accreditationStatus = 2;
      const kycStatus = 1;
      const addresses = [alice.address];

      await expect(vcData.addAccount(countryCode, accreditationStatus, kycStatus, addresses))
        .to.emit(vcData, 'AccountAdded')
        .withArgs(0, countryCode, accreditationStatus, kycStatus, addresses);

      const account = await vcData.getAccount(alice.address);
      expect(account.countryCode).to.equal(countryCode);
      expect(account.accreditationStatus).to.equal(accreditationStatus);
      expect(account.kycStatus).to.equal(kycStatus);
    });

    it("Account admin adds data", async function () {
      const { vcData, alice, bob } = await loadFixture(fixture);

      // alice (master account admin) adds bob as admin
      await vcData.addAdmin(bob.address);

      const countryCode = 'US';
      const accreditationStatus = 2;
      const kycStatus = 1;
      const addresses = [alice.address];

      // bob is now an admin, should pass
      await expect(vcData.connect(bob).addAccount(countryCode, accreditationStatus, kycStatus, addresses))
        .to.emit(vcData, 'AccountAdded')
        .withArgs(0, countryCode, accreditationStatus, kycStatus, addresses);

      const account = await vcData.getAccount(alice.address);
      expect(account.countryCode).to.equal(countryCode);
      expect(account.accreditationStatus).to.equal(accreditationStatus);
      expect(account.kycStatus).to.equal(kycStatus);
    });

    it("Non-admin tries to add data", async function () {
      const { vcData, alice, bob } = await loadFixture(fixture);

      const countryCode = 'US';
      const accreditationStatus = 2;
      const kycStatus = 1;
      const addresses = [alice.address];

      // bob is not an admin, should fail
      await expect(vcData.connect(bob).addAccount(countryCode, accreditationStatus, kycStatus, addresses))
        .to.be.revertedWithCustomError(vcData, 'AccessControlUnauthorizedAccount');

      const account = await vcData.getAccount(alice.address);
      expect(account.countryCode).to.equal('');
      expect(account.accreditationStatus).to.equal(0);
      expect(account.kycStatus).to.equal(0);
    });

    it("Account admin updates data", async function () {
      const { vcData, alice, bob, charlie } = await loadFixture(fixture);

      // alice (master account admin) adds bob as admin
      await vcData.addAdmin(bob.address);

      const countryCode = 'US';
      const accreditationStatus = 2;
      const kycStatus = 1;
      const addresses = [alice.address];

      // bob is now an admin, should pass
      await expect(vcData.connect(bob).addAccount(countryCode, accreditationStatus, kycStatus, addresses))
        .to.emit(vcData, 'AccountAdded')
        .withArgs(0, countryCode, accreditationStatus, kycStatus, addresses);

      let account = await vcData.getAccount(alice.address);
      expect(account.countryCode).to.equal(countryCode);
      expect(account.accreditationStatus).to.equal(accreditationStatus);
      expect(account.kycStatus).to.equal(kycStatus);

      // update the account
      // just test updating country code here
      const newCountryCode = 'EU';
      const accountId = await vcData.accountIds(alice.address);
      await expect(vcData.connect(bob).updateAccount(accountId, newCountryCode, accreditationStatus, kycStatus))
        .to.emit(vcData, 'AccountUpdated')
        .withArgs(accountId, newCountryCode, accreditationStatus, kycStatus);

      account = await vcData.getAccount(alice.address);
      expect(account.countryCode).to.equal(newCountryCode);
      expect(account.accreditationStatus).to.equal(accreditationStatus);
      expect(account.kycStatus).to.equal(kycStatus);

      // bob should also be able to update that account's addresses
      const addressesToAdd = [charlie.address];
      await expect(vcData.connect(bob).addAddresses(addressesToAdd, new Array(addressesToAdd.length).fill(accountId)))
        .to.emit(vcData, 'AddressAdded');

      // bob should also be able to remove that account's addresses
      const addressToRemove = charlie.address;
      await expect(vcData.connect(bob).removeAddress(addressToRemove))
        .to.emit(vcData, 'AddressRemoved');
    });

    it("Account admin tries to update another admin's user data", async function () {
      const { vcData, alice, bob, charlie } = await loadFixture(fixture);

      // alice (master account admin) adds bob as admin
      await vcData.addAdmin(bob.address);

      const countryCode = 'US';
      const accreditationStatus = 2;
      const kycStatus = 1;
      const addresses = [alice.address];

      // alice adds an account
      await expect(vcData.connect(alice).addAccount(countryCode, accreditationStatus, kycStatus, addresses))
        .to.emit(vcData, 'AccountAdded')
        .withArgs(0, countryCode, accreditationStatus, kycStatus, addresses);

      const account = await vcData.getAccount(alice.address);
      expect(account.countryCode).to.equal(countryCode);
      expect(account.accreditationStatus).to.equal(accreditationStatus);
      expect(account.kycStatus).to.equal(kycStatus);

      // bob tries to update the account that alice added
      const newCountryCode = 'EU';
      const accountId = await vcData.accountIds(alice.address);
      await expect(vcData.connect(bob).updateAccount(accountId, newCountryCode, accreditationStatus, kycStatus))
        .to.be.revertedWithCustomError(vcData, "NOT_ADMIN");

      // bob also shouldn't be able to update that account's addresses
      const addressesToAdd = [charlie.address];
      await expect(vcData.connect(bob).addAddresses(addressesToAdd, new Array(addressesToAdd.length).fill(accountId)))
        .to.be.revertedWithCustomError(vcData, "NOT_ADMIN");

      // bob also shouldn't be able to remove that account's addresses
      const addressToRemove = charlie.address;
      await expect(vcData.connect(bob).removeAddress(addressToRemove))
        .to.be.revertedWithCustomError(vcData, "NOT_ADMIN");
    });
  });
});
