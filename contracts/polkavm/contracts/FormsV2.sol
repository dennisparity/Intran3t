// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title FormsV2
 * @notice Stores CIDs for form definitions and responses on Bulletin Chain
 * @dev Simple index contract - all form data lives on Bulletin as JSON
 */
contract FormsV2 {
    // ========== STATE VARIABLES ==========

    /// @notice Form CIDs: formId => CID string
    mapping(uint256 => string) public formCids;

    /// @notice Response CIDs: formId => array of response CID strings
    mapping(uint256 => string[]) public responseCids;

    /// @notice Form metadata: formId => creator address
    mapping(uint256 => address) public formCreators;

    /// @notice Total number of forms
    uint256 public formCount;

    // ========== EVENTS ==========

    event FormRegistered(
        uint256 indexed formId,
        string cid,
        address indexed creator,
        uint256 timestamp
    );

    event ResponseSubmitted(
        uint256 indexed formId,
        uint256 responseIdx,
        string cid,
        uint256 timestamp
    );

    // ========== CORE FUNCTIONS ==========

    /**
     * @notice Register a new form by storing its Bulletin CID
     * @param formCid CID string from Bulletin Chain (form definition JSON)
     * @return formId The newly created form ID
     */
    function registerForm(string memory formCid) external returns (uint256) {
        require(bytes(formCid).length > 0, "Invalid CID");

        formCount++;
        formCids[formCount] = formCid;
        formCreators[formCount] = msg.sender;

        emit FormRegistered(formCount, formCid, msg.sender, block.timestamp);

        return formCount;
    }

    /**
     * @notice Submit a response to a form
     * @param formId The form ID to respond to
     * @param responseCid CID string from Bulletin Chain (response JSON)
     * @return responseIdx Index of the response in the array
     */
    function submitResponse(uint256 formId, string memory responseCid) external returns (uint256) {
        require(bytes(formCids[formId]).length > 0, "Form does not exist");
        require(bytes(responseCid).length > 0, "Invalid CID");

        responseCids[formId].push(responseCid);
        uint256 responseIdx = responseCids[formId].length - 1;

        emit ResponseSubmitted(formId, responseIdx, responseCid, block.timestamp);

        return responseIdx;
    }

    // ========== VIEW FUNCTIONS ==========

    /**
     * @notice Get form CID for a specific form
     * @param formId The form ID
     * @return CID string
     */
    function getFormCid(uint256 formId) external view returns (string memory) {
        return formCids[formId];
    }

    /**
     * @notice Get all response CIDs for a form
     * @param formId The form ID
     * @return Array of CID strings
     */
    function getResponseCids(uint256 formId) external view returns (string[] memory) {
        return responseCids[formId];
    }

    /**
     * @notice Get response count for a form
     * @param formId The form ID
     * @return Number of responses
     */
    function getResponseCount(uint256 formId) external view returns (uint256) {
        return responseCids[formId].length;
    }

    /**
     * @notice Get form creator address
     * @param formId The form ID
     * @return Creator address
     */
    function getFormCreator(uint256 formId) external view returns (address) {
        return formCreators[formId];
    }

    /**
     * @notice Check if a form exists
     * @param formId The form ID
     * @return True if form exists
     */
    function formExists(uint256 formId) external view returns (bool) {
        return bytes(formCids[formId]).length > 0;
    }
}
