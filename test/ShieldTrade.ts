import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { ShieldTrade, ShieldTrade__factory } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("ShieldTrade")) as ShieldTrade__factory;
  const shieldTrade = (await factory.deploy()) as ShieldTrade;
  const shieldTradeAddress = await shieldTrade.getAddress();

  return { shieldTrade, shieldTradeAddress };
}

describe("ShieldTrade (local mock)", function () {
  let signers: Signers;
  let shieldTrade: ShieldTrade;
  let shieldTradeAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ shieldTrade, shieldTradeAddress } = await deployFixture());
  });

  it("initial offer should be uninitialized after deployment", async function () {
    const [pay, receive] = await shieldTrade.getMyOffer();
    expect(pay).to.eq(ethers.ZeroHash);
    expect(receive).to.eq(ethers.ZeroHash);
  });

  it("set and decrypt offer (pay=100, receive=95)", async function () {
    const clearPay = 100;
    const clearReceive = 95;

    const encrypted = await fhevm
      .createEncryptedInput(shieldTradeAddress, signers.alice.address)
      .add32(clearPay)
      .add32(clearReceive)
      .encrypt();

    const tx = await shieldTrade
      .connect(signers.alice)
      .setOffer(encrypted.handles[0], encrypted.handles[1], encrypted.inputProof);
    await tx.wait();

    const [pay, receive] = await shieldTrade.connect(signers.alice).getMyOffer();
    expect(pay).to.not.eq(ethers.ZeroHash);
    expect(receive).to.not.eq(ethers.ZeroHash);

    const clearPayOut = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      pay,
      shieldTradeAddress,
      signers.alice,
    );
    const clearReceiveOut = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      receive,
      shieldTradeAddress,
      signers.alice,
    );

    expect(clearPayOut).to.eq(clearPay);
    expect(clearReceiveOut).to.eq(clearReceive);
  });
});

