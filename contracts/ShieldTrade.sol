// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title ShieldTrade - Minimal private offer storage using FHEVM
/// @notice Stores a user's latest private offer amounts (pay/receive) encrypted on-chain.
/// @dev This is an MVP showcasing a privacy-preserving loop: encrypt -> store -> decrypt.
// Enhanced
contract ShieldTrade is SepoliaConfig {
    struct Offer {
        euint32 pay;
        euint32 recv; // 'receive' is reserved in Solidity; use 'recv'
    }

    mapping(address => Offer) private _offers;

    /// @notice Set the caller's latest private offer.
    /// @param pay External encrypted euint32 (amount the user pays)
    /// @param recv External encrypted euint32 (amount the user receives)
    /// @param inputProof The encryption input proof for both external handles
    /// @dev Uses a single input proof for both values, produced by adding two inputs client-side.
    function setOffer(externalEuint32 pay, externalEuint32 recv, bytes calldata inputProof) external {
        euint32 encPay = FHE.fromExternal(pay, inputProof);
        euint32 encReceive = FHE.fromExternal(recv, inputProof);

        _offers[msg.sender] = Offer({pay: encPay, recv: encReceive});

        // Allow contract re-encryption and the caller to decrypt
        FHE.allowThis(_offers[msg.sender].pay);
        FHE.allowThis(_offers[msg.sender].recv);
        FHE.allow(_offers[msg.sender].pay, msg.sender);
        FHE.allow(_offers[msg.sender].recv, msg.sender);
    }

    /// @notice Get the caller's latest private offer handles.
    /// @return pay Encrypted euint32 handle of the pay amount
    /// @return recv Encrypted euint32 handle of the receive amount
    function getMyOffer() external view returns (euint32 pay, euint32 recv) {
        Offer storage o = _offers[msg.sender];
        return (o.pay, o.recv);
    }
}




