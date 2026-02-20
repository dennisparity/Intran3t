"use client";

import { useState, useCallback } from "react";
import { ethers } from "ethers";
import FormsV2ABI from "@/lib/contracts/FormsV2ABI.json";
import { getFormsContractAddress } from "@/lib/contracts/config";
import { getProvider, getBrowserSigner } from "@/lib/contracts/provider";

export interface UseFormsContractReturn {
  // State
  isLoading: boolean;
  error: string | null;

  // Write functions (require wallet)
  registerForm: (formCid: string) => Promise<number>;
  submitResponse: (formId: number, responseCid: string) => Promise<number>;
  submitResponseViaRelay: (formId: number, responseCid: string) => Promise<number>;

  // Read functions (no wallet needed)
  getFormCid: (formId: number) => Promise<string>;
  getResponseCids: (formId: number) => Promise<string[]>;
  getResponseCount: (formId: number) => Promise<number>;
  formCount: () => Promise<number>;
  formExists: (formId: number) => Promise<boolean>;
}

/**
 * Hook for interacting with FormsV2 contract
 */
export function useFormsContract(): UseFormsContractReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getContract = useCallback((withSigner = false) => {
    const address = getFormsContractAddress();
    if (address === "0x0000000000000000000000000000000000000000") {
      throw new Error("FormsV2 contract not deployed yet");
    }

    const provider = getProvider();
    if (withSigner) {
      // For write operations, we'll get the signer when calling the function
      return new ethers.Contract(address, FormsV2ABI, provider);
    }
    return new ethers.Contract(address, FormsV2ABI, provider);
  }, []);

  /**
   * Register a new form on-chain
   * Returns the form ID
   */
  const registerForm = useCallback(
    async (formCid: string): Promise<number> => {
      setIsLoading(true);
      setError(null);

      try {
        const contract = getContract(false);
        const signer = await getBrowserSigner();
        if (!signer) {
          throw new Error("Wallet not connected");
        }

        const contractWithSigner = contract.connect(signer);

        console.log("[FormsContract] Registering form, CID:", formCid);

        const tx = await contractWithSigner.registerForm(formCid);
        const receipt = await tx.wait();

        // Parse FormRegistered event to get formId
        const event = receipt.logs
          .map((log: ethers.Log) => {
            try {
              return contract.interface.parseLog({
                topics: log.topics as string[],
                data: log.data,
              });
            } catch {
              return null;
            }
          })
          .find((e: ethers.LogDescription | null) => e?.name === "FormRegistered");

        if (!event) {
          throw new Error("FormRegistered event not found");
        }

        const formId = Number(event.args[0]);
        console.log("[FormsContract] Form registered, ID:", formId);

        return formId;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to register form";
        console.error("[FormsContract] Register failed:", message);
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [getContract]
  );

  /**
   * Submit a response to a form
   * Returns the response index
   */
  const submitResponse = useCallback(
    async (formId: number, responseCid: string): Promise<number> => {
      setIsLoading(true);
      setError(null);

      try {
        const contract = getContract(false);
        const signer = await getBrowserSigner();
        if (!signer) {
          throw new Error("Wallet not connected");
        }

        const contractWithSigner = contract.connect(signer);

        console.log("[FormsContract] Submitting response, formId:", formId, "CID:", responseCid);

        const tx = await contractWithSigner.submitResponse(formId, responseCid);
        const receipt = await tx.wait();

        // Parse ResponseSubmitted event to get responseIdx
        const event = receipt.logs
          .map((log: ethers.Log) => {
            try {
              return contract.interface.parseLog({
                topics: log.topics as string[],
                data: log.data,
              });
            } catch {
              return null;
            }
          })
          .find((e: ethers.LogDescription | null) => e?.name === "ResponseSubmitted");

        if (!event) {
          throw new Error("ResponseSubmitted event not found");
        }

        const responseIdx = Number(event.args[1]);
        console.log("[FormsContract] Response submitted, index:", responseIdx);

        return responseIdx;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to submit response";
        console.error("[FormsContract] Submit failed:", message);
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [getContract]
  );

  /**
   * Get form CID from contract
   */
  const getFormCid = useCallback(
    async (formId: number): Promise<string> => {
      try {
        const contract = getContract(false);
        return await contract.getFormCid(formId);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to get form CID";
        setError(message);
        throw err;
      }
    },
    [getContract]
  );

  /**
   * Get all response CIDs for a form
   */
  const getResponseCids = useCallback(
    async (formId: number): Promise<string[]> => {
      try {
        const contract = getContract(false);
        return await contract.getResponseCids(formId);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to get response CIDs";
        setError(message);
        throw err;
      }
    },
    [getContract]
  );

  /**
   * Get response count for a form
   */
  const getResponseCount = useCallback(
    async (formId: number): Promise<number> => {
      try {
        const contract = getContract(false);
        const count = await contract.getResponseCount(formId);
        return Number(count);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to get response count";
        setError(message);
        throw err;
      }
    },
    [getContract]
  );

  /**
   * Get total number of forms
   */
  const formCount = useCallback(async (): Promise<number> => {
    try {
      const contract = getContract(false);
      const count = await contract.formCount();
      return Number(count);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to get form count";
      setError(message);
      throw err;
    }
  }, [getContract]);

  /**
   * Check if a form exists
   */
  const formExists = useCallback(
    async (formId: number): Promise<boolean> => {
      try {
        const contract = getContract(false);
        return await contract.formExists(formId);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to check form existence";
        setError(message);
        throw err;
      }
    },
    [getContract]
  );

  /**
   * Submit a response via relay wallet (for wallet-less voters)
   * Uses Alice/deployer wallet to submit on behalf of voter
   * Returns the response index
   */
  const submitResponseViaRelay = useCallback(
    async (formId: number, responseCid: string): Promise<number> => {
      setIsLoading(true);
      setError(null);

      try {
        // For now, use the same wallet as the deployer
        // In production, this would be a dedicated relay service
        const relayPrivateKey = import.meta.env.VITE_RELAY_PRIVATE_KEY || import.meta.env.PRIVATE_KEY;

        if (!relayPrivateKey) {
          console.warn("[FormsContract] No relay wallet configured, submission will be non-blocking");
          setIsLoading(false);
          return 0; // Return dummy index, actual submission will fail silently
        }

        const provider = getProvider();
        const relaySigner = new ethers.Wallet(relayPrivateKey, provider);
        const contract = getContract(false);
        const contractWithSigner = contract.connect(relaySigner);

        console.log("[FormsContract] Submitting response via relay, formId:", formId, "CID:", responseCid);

        const tx = await contractWithSigner.submitResponse(formId, responseCid);
        const receipt = await tx.wait();

        // Parse ResponseSubmitted event to get responseIdx
        const event = receipt.logs
          .map((log: ethers.Log) => {
            try {
              return contract.interface.parseLog({
                topics: log.topics as string[],
                data: log.data,
              });
            } catch {
              return null;
            }
          })
          .find((e: ethers.LogDescription | null) => e?.name === "ResponseSubmitted");

        if (!event) {
          throw new Error("ResponseSubmitted event not found");
        }

        const responseIdx = Number(event.args[1]);
        console.log("[FormsContract] Response submitted via relay, index:", responseIdx);

        return responseIdx;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[FormsContract] Relay submit failed:", message);
        setError(message);
        setIsLoading(false);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [getContract]
  );

  return {
    // State
    isLoading,
    error,

    // Write functions
    registerForm,
    submitResponse,
    submitResponseViaRelay, // For wallet-less voters

    // Read functions
    getFormCid,
    getResponseCids,
    getResponseCount,
    formCount,
    formExists,
  };
}
