"use client";

import { useCallback, useState } from "react";
import { ethers } from "ethers";
import { encodeFunctionData } from "viem";
import ParityDAOABI from "@/lib/contracts/ParityDAOABI.json";
import { getDaoContractAddress, activeNetwork } from "@/lib/contracts/config";
import { useSubstrateEVMSigner } from "./useSubstrateEVMSigner";

// VoteChoice enum values matching the Solidity contract
export const VOTE_CHOICE = { None: 0, Aye: 1, Nay: 2, Abstain: 3 } as const;
export type VoteChoiceNum = 1 | 2 | 3;

export interface ProposalData {
  author: string;
  contentCid: string;
  startBlock: number;
  endBlock: number;
  ayeCount: number;
  nayCount: number;
  abstainCount: number;
}

export interface UseParityDAOContractReturn {
  isLoading: boolean;
  error: string | null;
  evmAddress: `0x${string}` | null;
  isMapped: boolean | null;

  createProposal: (
    contentCid: string,
    durationBlocks: number,
    onProgress?: (stage: "broadcasted" | "in_block") => void
  ) => Promise<number>;

  castVote: (
    proposalId: number,
    choice: VoteChoiceNum,
    comment: string,
    onProgress?: (stage: "broadcasted" | "in_block") => void
  ) => Promise<string>;

  getProposal: (id: number) => Promise<ProposalData>;
  getProposalCount: () => Promise<number>;
  hasVotedOnChain: (proposalId: number, voterAddress: string) => Promise<boolean>;
  isActive: (proposalId: number) => Promise<boolean>;
}

function getReadContract(): ethers.Contract {
  const address = getDaoContractAddress();
  if (address === "0x0000000000000000000000000000000000000000") {
    throw new Error("ParityDAO contract not deployed yet");
  }
  const provider = new ethers.JsonRpcProvider(activeNetwork.rpcUrl);
  return new ethers.Contract(address, ParityDAOABI, provider);
}

export function useParityDAOContract(): UseParityDAOContractReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const substrateSigner = useSubstrateEVMSigner();

  const createProposal = useCallback(
    async (
      contentCid: string,
      durationBlocks: number,
      onProgress?: (stage: "broadcasted" | "in_block") => void
    ): Promise<number> => {
      setIsLoading(true);
      setError(null);
      try {
        const callData = encodeFunctionData({
          abi: ParityDAOABI,
          functionName: "createProposal",
          args: [contentCid, BigInt(durationBlocks)],
        });

        await substrateSigner.sendTransaction({
          to: getDaoContractAddress(),
          data: callData,
          value: 0n,
          gasLimit: 500000n,
          onProgress,
        });

        // Read new count to derive the created proposal ID
        const contract = getReadContract();
        const count = Number(await contract.proposalCount());
        return count - 1;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to create proposal";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [substrateSigner]
  );

  const castVote = useCallback(
    async (
      proposalId: number,
      choice: VoteChoiceNum,
      comment: string,
      onProgress?: (stage: "broadcasted" | "in_block") => void
    ): Promise<string> => {
      setIsLoading(true);
      setError(null);
      try {
        const callData = encodeFunctionData({
          abi: ParityDAOABI,
          functionName: "vote",
          args: [BigInt(proposalId), choice, comment],
        });

        const txHash = await substrateSigner.sendTransaction({
          to: getDaoContractAddress(),
          data: callData,
          value: 0n,
          gasLimit: 300000n,
          onProgress,
        });

        return txHash;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to cast vote";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [substrateSigner]
  );

  const getProposal = useCallback(async (id: number): Promise<ProposalData> => {
    try {
      const contract = getReadContract();
      const result = await contract.getProposal(id);
      return {
        author: result[0] as string,
        contentCid: result[1] as string,
        startBlock: Number(result[2]),
        endBlock: Number(result[3]),
        ayeCount: Number(result[4]),
        nayCount: Number(result[5]),
        abstainCount: Number(result[6]),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to get proposal";
      setError(message);
      throw err;
    }
  }, []);

  const getProposalCount = useCallback(async (): Promise<number> => {
    try {
      const contract = getReadContract();
      return Number(await contract.proposalCount());
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to get proposal count";
      setError(message);
      throw err;
    }
  }, []);

  const hasVotedOnChain = useCallback(
    async (proposalId: number, voterAddress: string): Promise<boolean> => {
      try {
        const contract = getReadContract();
        return await contract.hasVoted(proposalId, voterAddress);
      } catch {
        return false;
      }
    },
    []
  );

  const isActive = useCallback(async (proposalId: number): Promise<boolean> => {
    try {
      const contract = getReadContract();
      return await contract.isActive(proposalId);
    } catch {
      return false;
    }
  }, []);

  return {
    isLoading,
    error,
    evmAddress: substrateSigner.evmAddress,
    isMapped: substrateSigner.isMapped,
    createProposal,
    castVote,
    getProposal,
    getProposalCount,
    hasVotedOnChain,
    isActive,
  };
}
