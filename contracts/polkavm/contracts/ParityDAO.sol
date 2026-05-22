// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ParityDAO {
    enum VoteChoice { None, Aye, Nay, Abstain }

    struct Proposal {
        address author;
        string contentCid;
        uint256 startBlock;
        uint256 endBlock;
        uint256 ayeCount;
        uint256 nayCount;
        uint256 abstainCount;
    }

    uint256 public proposalCount;
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => VoteChoice)) public votes;
    mapping(uint256 => mapping(address => string)) public comments;

    event ProposalCreated(uint256 indexed id, address indexed author, string contentCid, uint256 endBlock);
    event VoteCast(uint256 indexed proposalId, address indexed voter, VoteChoice choice, uint256 blockNumber);

    function createProposal(string calldata contentCid, uint256 durationBlocks) external returns (uint256) {
        require(durationBlocks > 0, "Duration must be > 0");

        uint256 id = proposalCount++;
        proposals[id] = Proposal({
            author: msg.sender,
            contentCid: contentCid,
            startBlock: block.number,
            endBlock: block.number + durationBlocks,
            ayeCount: 0,
            nayCount: 0,
            abstainCount: 0
        });

        emit ProposalCreated(id, msg.sender, contentCid, block.number + durationBlocks);
        return id;
    }

    function vote(uint256 proposalId, VoteChoice choice, string calldata comment) external {
        require(proposalId < proposalCount, "Proposal does not exist");
        require(block.number <= proposals[proposalId].endBlock, "Voting period ended");
        require(votes[proposalId][msg.sender] == VoteChoice.None, "Already voted");
        require(choice != VoteChoice.None, "Invalid vote choice");
        require(bytes(comment).length <= 280, "Comment too long");

        votes[proposalId][msg.sender] = choice;

        if (bytes(comment).length > 0) {
            comments[proposalId][msg.sender] = comment;
        }

        if (choice == VoteChoice.Aye) {
            proposals[proposalId].ayeCount++;
        } else if (choice == VoteChoice.Nay) {
            proposals[proposalId].nayCount++;
        } else {
            proposals[proposalId].abstainCount++;
        }

        emit VoteCast(proposalId, msg.sender, choice, block.number);
    }

    function getProposal(uint256 id) external view returns (
        address author,
        string memory contentCid,
        uint256 startBlock,
        uint256 endBlock,
        uint256 ayeCount,
        uint256 nayCount,
        uint256 abstainCount
    ) {
        require(id < proposalCount, "Proposal does not exist");
        Proposal storage p = proposals[id];
        return (p.author, p.contentCid, p.startBlock, p.endBlock, p.ayeCount, p.nayCount, p.abstainCount);
    }

    function hasVoted(uint256 proposalId, address voter) external view returns (bool) {
        return votes[proposalId][voter] != VoteChoice.None;
    }

    function getMyVote(uint256 proposalId) external view returns (VoteChoice) {
        return votes[proposalId][msg.sender];
    }

    function isActive(uint256 proposalId) external view returns (bool) {
        if (proposalId >= proposalCount) return false;
        return block.number <= proposals[proposalId].endBlock;
    }
}
