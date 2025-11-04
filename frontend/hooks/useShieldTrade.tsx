"use client";

import { ethers } from "ethers";
import {
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { FhevmInstance } from "@/fhevm/fhevmTypes";
import { FhevmDecryptionSignature } from "@/fhevm/FhevmDecryptionSignature";
import { GenericStringStorage } from "@/fhevm/GenericStringStorage";

import { ShieldTradeABI } from "@/abi/ShieldTradeABI";
import { ShieldTradeAddresses } from "@/abi/ShieldTradeAddresses";

type OfferClear = {
  pay: bigint;
  recv: bigint;
};
type ShieldTradeInfo = {
  abi: typeof ShieldTradeABI.abi;
  address?: `0x${string}`;
  chainId?: number;
  chainName?: string;
};

function getShieldTradeByChainId(chainId: number | undefined): ShieldTradeInfo {
  if (!chainId) {
    return { abi: ShieldTradeABI.abi };
  }

  const entry =
    ShieldTradeAddresses[chainId.toString() as keyof typeof ShieldTradeAddresses];

  if (!("address" in entry) || entry.address === ethers.ZeroAddress) {
    return { abi: ShieldTradeABI.abi, chainId };
  }

  return {
    address: entry?.address as `0x${string}` | undefined,
    chainId: entry?.chainId ?? chainId,
    chainName: entry?.chainName,
    abi: ShieldTradeABI.abi,
  };
}

export const useShieldTrade = (parameters: {
  instance: FhevmInstance | undefined;
  fhevmDecryptionSignatureStorage: GenericStringStorage;
  eip1193Provider: ethers.Eip1193Provider | undefined;
  chainId: number | undefined;
  ethersSigner: ethers.JsonRpcSigner | undefined;
  ethersReadonlyProvider: ethers.ContractRunner | undefined;
  sameChain: RefObject<(chainId: number | undefined) => boolean>;
  sameSigner: RefObject<
    (ethersSigner: ethers.JsonRpcSigner | undefined) => boolean
  >;
}) => {
  const {
    instance,
    fhevmDecryptionSignatureStorage,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
  } = parameters;

  const [payHandle, setPayHandle] = useState<string | undefined>(undefined);
  const [recvHandle, setRecvHandle] = useState<string | undefined>(undefined);
  const [clearOffer, setClearOffer] = useState<OfferClear | undefined>(
    undefined
  );
  const clearOfferRef = useRef<OfferClear | undefined>(undefined);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isDecrypting, setIsDecrypting] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");

  const shieldTradeRef = useRef<ShieldTradeInfo | undefined>(undefined);
  const isRefreshingRef = useRef<boolean>(isRefreshing);
  const isDecryptingRef = useRef<boolean>(isDecrypting);
  const isSubmittingRef = useRef<boolean>(isSubmitting);

  const isDecrypted =
    payHandle && recvHandle &&
    clearOffer && clearOfferRef.current &&
    clearOffer === clearOfferRef.current;

  const shieldTrade = useMemo(() => {
    const c = getShieldTradeByChainId(chainId);
    shieldTradeRef.current = c;
    if (!c.address) {
      setMessage(`ShieldTrade deployment not found for chainId=${chainId}.`);
    }
    return c;
  }, [chainId]);

  const isDeployed = useMemo(() => {
    if (!shieldTrade) return undefined;
    return Boolean(shieldTrade.address) && shieldTrade.address !== ethers.ZeroAddress;
  }, [shieldTrade]);

  const canGetOffer = useMemo(() => {
    // Need a runner to call getMyOffer() with a valid msg.sender.
    // Prefer signer when available (so msg.sender = signer.address),
    // otherwise fall back to provider (may require explicit 'from').
    return (
      !!shieldTrade.address &&
      (!!ethersSigner || !!ethersReadonlyProvider) &&
      !isRefreshing
    );
  }, [shieldTrade.address, ethersReadonlyProvider, ethersSigner, isRefreshing]);

  const refreshOfferHandles = useCallback(() => {
    if (isRefreshingRef.current) return;
    if (
      !shieldTradeRef.current ||
      !shieldTradeRef.current?.chainId ||
      !shieldTradeRef.current?.address ||
      !ethersReadonlyProvider
    ) {
      setPayHandle(undefined);
      setRecvHandle(undefined);
      return;
    }

    isRefreshingRef.current = true;
    setIsRefreshing(true);

    const thisChainId = shieldTradeRef.current.chainId;
    const thisAddress = shieldTradeRef.current.address;

    // Use signer when available to ensure msg.sender is correct for getMyOffer()
    // Fallback to provider with explicit 'from' when signer is not available.
    const runner: ethers.ContractRunner | undefined =
      ethersSigner ?? ethersReadonlyProvider;

    const contract = new ethers.Contract(
      thisAddress,
      shieldTradeRef.current.abi,
      runner
    );

    const call = () => (ethersSigner ? contract.getMyOffer() : contract.getMyOffer());

    (call() as Promise<[string, string]>)
      .then((tuple: [string, string]) => {
        if (sameChain.current(thisChainId) && thisAddress === shieldTradeRef.current?.address) {
          setPayHandle(tuple[0]);
          setRecvHandle(tuple[1]);
        }
      })
      .catch((e: unknown) => {
        setMessage("ShieldTrade.getMyOffer() failed: " + e);
      })
      .finally(() => {
        isRefreshingRef.current = false;
        setIsRefreshing(false);
      });
  }, [ethersReadonlyProvider, sameChain]);

  useEffect(() => {
    refreshOfferHandles();
  }, [refreshOfferHandles]);

  const canDecrypt = useMemo(() => {
    return (
      shieldTrade.address &&
      instance &&
      ethersSigner &&
      !isRefreshing &&
      !isDecrypting &&
      payHandle && recvHandle &&
      payHandle !== ethers.ZeroHash &&
      recvHandle !== ethers.ZeroHash &&
      !(clearOffer && clearOfferRef.current === clearOffer)
    );
  }, [
    shieldTrade.address,
    instance,
    ethersSigner,
    isRefreshing,
    isDecrypting,
    payHandle,
    recvHandle,
    clearOffer,
  ]);

  const decryptOfferHandles = useCallback(() => {
    if (isRefreshingRef.current || isDecryptingRef.current) return;
    if (!shieldTrade.address || !instance || !ethersSigner) return;
    if (!payHandle || !recvHandle) return;

    const thisChainId = chainId;
    const thisAddress = shieldTrade.address;
    const thisPayHandle = payHandle;
    const thisRecvHandle = recvHandle;
    const thisSigner = ethersSigner;

    isDecryptingRef.current = true;
    setIsDecrypting(true);
    setMessage("Start decrypting offer...");

    const run = async () => {
      const isStale = () =>
        thisAddress !== shieldTradeRef.current?.address ||
        !sameChain.current(thisChainId) ||
        !sameSigner.current(thisSigner);

      try {
        const sig: FhevmDecryptionSignature | null =
          await FhevmDecryptionSignature.loadOrSign(
            instance,
            [thisAddress],
            thisSigner,
            fhevmDecryptionSignatureStorage
          );

        if (!sig) {
          setMessage("Unable to build FHEVM decryption signature");
          return;
        }

        if (isStale()) {
          setMessage("Ignore FHEVM decryption");
          return;
        }

        const res = await instance.userDecrypt(
          [
            { handle: thisPayHandle, contractAddress: thisAddress },
            { handle: thisRecvHandle, contractAddress: thisAddress },
          ],
          sig.privateKey,
          sig.publicKey,
          sig.signature,
          sig.contractAddresses,
          sig.userAddress,
          sig.startTimestamp,
          sig.durationDays
        );

        if (isStale()) {
          setMessage("Ignore FHEVM decryption");
          return;
        }

        const clear: OfferClear = {
          pay: res[thisPayHandle] as bigint,
          recv: res[thisRecvHandle] as bigint,
        };
        setClearOffer(clear);
        clearOfferRef.current = clear;
        setMessage(`Offer decrypted: pay=${clear.pay} recv=${clear.recv}`);
      } finally {
        isDecryptingRef.current = false;
        setIsDecrypting(false);
      }
    };

    run();
  }, [
    fhevmDecryptionSignatureStorage,
    ethersSigner,
    shieldTrade.address,
    instance,
    payHandle,
    recvHandle,
    chainId,
    sameChain,
    sameSigner,
  ]);

  const canSetOffer = useMemo(() => {
    return (
      shieldTrade.address &&
      instance &&
      ethersSigner &&
      !isRefreshing &&
      !isSubmitting
    );
  }, [shieldTrade.address, instance, ethersSigner, isRefreshing, isSubmitting]);

  const setOffer = useCallback(
    (pay: number, recv: number) => {
      if (isRefreshingRef.current || isSubmittingRef.current) return;
      if (!shieldTrade.address || !instance || !ethersSigner) return;
      if (!Number.isFinite(pay) || !Number.isFinite(recv)) return;
      if (pay < 0 || recv < 0) return;
      if (pay > 0xffffffff || recv > 0xffffffff) {
        setMessage("Values must fit in uint32");
        return;
      }

      const thisChainId = chainId;
      const thisAddress = shieldTrade.address;
      const thisSigner = ethersSigner;
      const contract = new ethers.Contract(thisAddress, shieldTrade.abi, thisSigner);

      isSubmittingRef.current = true;
      setIsSubmitting(true);
      setMessage("Encrypting and submitting offer...");

      const run = async () => {
        // let browser repaint a tick before CPU heavy step
        await new Promise((r) => setTimeout(r, 100));

        const isStale = () =>
          thisAddress !== shieldTradeRef.current?.address ||
          !sameChain.current(thisChainId) ||
          !sameSigner.current(thisSigner);

        try {
          const input = instance.createEncryptedInput(
            thisAddress,
            thisSigner.address
          );
          input.add32(pay);
          input.add32(recv);
          const enc = await input.encrypt();

          if (isStale()) {
            setMessage("Ignore setOffer");
            return;
          }

          const tx: ethers.TransactionResponse = await contract.setOffer(
            enc.handles[0],
            enc.handles[1],
            enc.inputProof
          );
          setMessage(`Waiting tx ${tx.hash}...`);
          await tx.wait();

          if (isStale()) {
            setMessage("Ignore setOffer");
            return;
          }

          setMessage("setOffer completed");
          refreshOfferHandles();
        } catch (e: any) {
          const s = String(e ?? "");
          // Surface a clearer hint when MetaMask cannot reach its RPC endpoint
          if (s.includes("Failed to fetch") || s.includes("code\": -32603")) {
            setMessage(
              "setOffer failed: Wallet RPC unreachable. Please switch Sepolia RPC (try again to trigger a MetaMask prompt)."
            );
          } else {
            setMessage("setOffer failed: " + s);
          }
        } finally {
          isSubmittingRef.current = false;
          setIsSubmitting(false);
        }
      };

      run();
    },
    [
      ethersSigner,
      shieldTrade.address,
      shieldTrade.abi,
      instance,
      chainId,
      refreshOfferHandles,
      sameChain,
      sameSigner,
    ]
  );

  return {
    contractAddress: shieldTrade.address,
    canGetOffer,
    refreshOfferHandles,
    canDecrypt,
    decryptOfferHandles,
    canSetOffer,
    setOffer,
    isDecrypted,
    message,
    clear: clearOffer,
    payHandle,
    recvHandle,
    isDecrypting,
    isRefreshing,
    isSubmitting,
    isDeployed,
  };
};

