import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm, deployments } from "hardhat";
import { ShieldTrade } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  alice: HardhatEthersSigner;
};

describe("ShieldTradeSepolia", function () {
  let signers: Signers;
  let shieldTrade: ShieldTrade;
  let shieldTradeAddress: string;
  let step: number;
  let steps: number;

  function progress(message: string) {
    console.log(`${++step}/${steps} ${message}`);
  }

  before(async function () {
    if (fhevm.isMock) {
      console.warn(`This hardhat test suite can only run on Sepolia Testnet`);
      this.skip();
    }

    try {
      const d = await deployments.get("ShieldTrade");
      shieldTradeAddress = d.address;
      shieldTrade = await ethers.getContractAt("ShieldTrade", d.address);
    } catch (e) {
      (e as Error).message += ". Call 'npx hardhat deploy --network sepolia'";
      throw e;
    }

    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { alice: ethSigners[0] };
  });

  beforeEach(async () => {
    step = 0;
    steps = 0;
  });

  it("set and decrypt offer (0 then 1,2)", async function () {
    steps = 10;
    this.timeout(4 * 40000);

    progress("Encrypting '0,0'...");
    const encZero = await fhevm
      .createEncryptedInput(shieldTradeAddress, signers.alice.address)
      .add32(0)
      .add32(0)
      .encrypt();

    progress(`Call setOffer(0,0) ShieldTrade=${shieldTradeAddress}...`);
    let tx = await shieldTrade
      .connect(signers.alice)
      .setOffer(encZero.handles[0], encZero.handles[1], encZero.inputProof);
    await tx.wait();

    progress(`Call ShieldTrade.getMyOffer()...`);
    const [pay0, rec0] = await shieldTrade.connect(signers.alice).getMyOffer();
    expect(pay0).to.not.eq(ethers.ZeroHash);
    expect(rec0).to.not.eq(ethers.ZeroHash);

    progress("Encrypting '1,2'...");
    const enc = await fhevm
      .createEncryptedInput(shieldTradeAddress, signers.alice.address)
      .add32(1)
      .add32(2)
      .encrypt();

    progress(`Call setOffer(1,2) ShieldTrade=${shieldTradeAddress}...`);
    tx = await shieldTrade
      .connect(signers.alice)
      .setOffer(enc.handles[0], enc.handles[1], enc.inputProof);
    await tx.wait();

    progress(`Call ShieldTrade.getMyOffer()...`);
    const [pay, rec] = await shieldTrade.connect(signers.alice).getMyOffer();

    progress(`Decrypting pay/rec...`);
    const clearPay = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      pay,
      shieldTradeAddress,
      signers.alice,
    );
    const clearRec = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      rec,
      shieldTradeAddress,
      signers.alice,
    );

    expect(clearPay).to.eq(1);
    expect(clearRec).to.eq(2);
  });
});

