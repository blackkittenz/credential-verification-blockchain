// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract CredentialVerificationV2 {
    // 1. Custom Errors (Penghematan Gas)
    error NotAdmin();
    error NotAuthorizedIssuer();
    error NotIssuingAuthority();
    error InvalidAddress();
    error EmptyString();
    error ZeroHash();
    error CredentialAlreadyExists(bytes32 id);
    error CredentialNotFound(bytes32 id);
    error CredentialNotActive(bytes32 id);
    error InvalidValidityPeriod();
    // 2. Status Siklus Hidup & Hasil Verifikasi
    enum CredentialStatus { ACTIVE, REVOKED, SUPERSEDED }
    enum VerificationResult { VALID, HASH_MISMATCH, REVOKED, EXPIRED, SUPERSEDED, NOT_FOUND }

    struct Credential {
        bytes32 credentialId;
        bytes32 credentialHash;
        address issuerAddress;
        string issuerOrgId;
        bytes32 holderReference;
        uint256 issuedAt;
        uint256 validUntil;
        CredentialStatus status;
        uint256 revokedAt;
        bytes32 supersededBy;
        bytes32 supersedesId;
        bool exists;
    }

    address public admin;
    mapping(address => bool) public authorizedIssuers;
    mapping(address => string) public issuerOrgNames;
    mapping(bytes32 => Credential) private _credentials;
    bool private _locked;

    // Events
    event IssuerAuthorized(address indexed issuerAddress, string orgName);
    event CredentialIssued(bytes32 indexed credentialId, address indexed issuerAddress, bytes32 credentialHash, uint256 validUntil);
    event CredentialRevoked(bytes32 indexed credentialId, address indexed issuerAddress, uint256 revokedAt, string reason);
    event CredentialSuperseded(bytes32 indexed oldCredentialId, bytes32 indexed newCredentialId, address indexed issuerAddress);

    modifier onlyAdmin() { if (msg.sender != admin) revert NotAdmin(); _; }
    modifier onlyAuthorizedIssuer() { if (!authorizedIssuers[msg.sender]) revert NotAuthorizedIssuer(); _; }
    modifier nonReentrant() { require(!_locked, "Reentrant call"); _locked = true; _; _locked = false; }
    
    constructor() { admin = msg.sender; }
    
    function registerIssuer(address _issuer, string calldata _orgName) external onlyAdmin {
        if (_issuer == address(0)) revert InvalidAddress();
        if (bytes(_orgName).length == 0) revert EmptyString();
        authorizedIssuers[_issuer] = true;
        issuerOrgNames[_issuer] = _orgName;
        emit IssuerAuthorized(_issuer, _orgName);
    }

    function issueCredential(bytes32 _id, bytes32 _holderRef, bytes32 _hash, uint256 _validUntil) external onlyAuthorizedIssuer nonReentrant {
        if (_id == bytes32(0)) revert EmptyString();
        if (_hash == bytes32(0)) revert ZeroHash();
        if (_credentials[_id].exists) revert CredentialAlreadyExists(_id);
        if (_validUntil != 0 && _validUntil <= block.timestamp) revert InvalidValidityPeriod();
        
        _credentials[_id] = Credential({
            credentialId: _id, credentialHash: _hash, issuerAddress: msg.sender,
            issuerOrgId: issuerOrgNames[msg.sender], holderReference: _holderRef,
            issuedAt: block.timestamp, validUntil: _validUntil, status: CredentialStatus.ACTIVE,
            revokedAt: 0, supersededBy: bytes32(0), supersedesId: bytes32(0), exists: true
        });
        emit CredentialIssued(_id, msg.sender, _hash, _validUntil);
    }

    function verifyCredential(bytes32 _id, bytes32 _hashToVerify) external view returns (
        VerificationResult result, address issuerAddress, string memory issuerOrg,
        uint256 issuedAt, uint256 validUntil, bytes32 relatedId
    ) {

        if (!_credentials[_id].exists) return (VerificationResult.NOT_FOUND, address(0), "", 0, 0, bytes32(0)
);
        Credential storage cred = _credentials[_id];
        if (cred.credentialHash != _hashToVerify) return (VerificationResult.HASH_MISMATCH, cred.issuerAddress, cred.issuerOrgId, cred.issuedAt, cred.validUntil, bytes32(0));
        if (cred.status == CredentialStatus.REVOKED) return (VerificationResult.REVOKED, cred.issuerAddress,
cred.issuerOrgId, cred.issuedAt, cred.validUntil, bytes32(0));
        if (cred.status == CredentialStatus.SUPERSEDED) return (VerificationResult.SUPERSEDED, cred.issuerAddress, cred.issuerOrgId, cred.issuedAt, cred.validUntil, cred.supersededBy);
        if (cred.validUntil != 0 && block.timestamp > cred.validUntil) return (VerificationResult.EXPIRED, cred.issuerAddress, cred.issuerOrgId, cred.issuedAt, cred.validUntil, bytes32(0));
        return (VerificationResult.VALID, cred.issuerAddress, cred.issuerOrgId, cred.issuedAt, cred.validUntil, bytes32(0));
    }

    function revokeCredential(bytes32 _id, string calldata _reason) external nonReentrant {
        if (!_credentials[_id].exists) revert CredentialNotFound(_id);
        if (_credentials[_id].issuerAddress != msg.sender) revert NotIssuingAuthority();
        if (_credentials[_id].status != CredentialStatus.ACTIVE) revert CredentialNotActive(_id);
        _credentials[_id].status = CredentialStatus.REVOKED;
        _credentials[_id].revokedAt = block.timestamp;
        emit CredentialRevoked(_id, msg.sender, block.timestamp, _reason);
    }

    function supersedeCredential(bytes32 _oldId, bytes32 _newId, bytes32 _newHolderRef, bytes32 _newHash, uint256 _newValidUntil) external onlyAuthorizedIssuer nonReentrant {
        if (!_credentials[_oldId].exists) revert CredentialNotFound(_oldId);
        if (_credentials[_oldId].issuerAddress != msg.sender) revert NotIssuingAuthority();
        if (_credentials[_oldId].status != CredentialStatus.ACTIVE) revert CredentialNotActive(_oldId);
        if (_newId == bytes32(0)) revert EmptyString();
        if (_newHash == bytes32(0)) revert ZeroHash();
        if (_credentials[_newId].exists) revert CredentialAlreadyExists(_newId);
        _credentials[_oldId].status = CredentialStatus.SUPERSEDED;
        _credentials[_oldId].supersededBy = _newId;

        _credentials[_newId] = Credential({
            credentialId: _newId, credentialHash: _newHash, issuerAddress: msg.sender,
            issuerOrgId: issuerOrgNames[msg.sender], holderReference: _newHolderRef,
            issuedAt: block.timestamp, validUntil: _newValidUntil, status: CredentialStatus.ACTIVE,
            revokedAt: 0, supersededBy: bytes32(0), supersedesId: _oldId, exists: true
        });
        emit CredentialSuperseded(_oldId, _newId, msg.sender);
        emit CredentialIssued(_newId, msg.sender, _newHash, _newValidUntil);
    }
}
