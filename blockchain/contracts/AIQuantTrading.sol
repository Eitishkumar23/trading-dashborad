// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title  AIQuantTrading
 * @notice Production-ready multi-asset trading registry for a platform that
 *         supports Stocks, Cryptocurrencies and Real Assets (Precious Metals,
 *         Energy and Real Estate).
 *
 * Architecture
 * ─────────────
 *  • Asset Registry  – owner-managed list of tradable assets (AssetDefinition).
 *  • User Portfolios – per-address list of purchased positions (PortfolioAsset).
 *
 * Access control
 * ──────────────
 *  • Constructor captures deployer as immutable owner.
 *  • `onlyOwner` modifier restricts registry-management functions.
 *  • Any connected wallet may call `buyAsset`.
 */
contract AIQuantTrading {

    // ─────────────────────────────────────────────────────────────────────────
    // Enums
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice The three asset classes supported by the platform.
     */
    enum AssetType {
        Stock,      // Equity / stock market instruments
        Crypto,     // Cryptocurrencies
        RealAsset   // Precious Metals, Energy, Real Estate, etc.
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Structs
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Defines a tradable asset that the platform recognises.
     * @dev    Registered by the contract owner via `addAsset`.
     *
     * @param assetId   Auto-incremented unique identifier.
     * @param name      Human-readable name  (e.g. "Bitcoin", "Apple Inc.").
     * @param symbol    Ticker symbol         (e.g. "BTC", "AAPL").
     * @param assetType One of { Stock, Crypto, RealAsset }.
     * @param isActive  Whether the asset is currently available for purchase.
     */
    struct AssetDefinition {
        uint256   assetId;
        string    name;
        string    symbol;
        AssetType assetType;
        bool      isActive;
    }

    /**
     * @notice A single position held in a user's on-chain portfolio.
     * @dev    Created by `buyAsset`; keyed under `msg.sender`.
     *
     * @param assetId        References the AssetDefinition this position belongs to.
     * @param quantity       Number of units purchased (scaled by the caller as needed).
     * @param purchasePrice  Price-per-unit at the time of purchase (off-chain currency).
     * @param owner          Wallet address that created this position.
     */
    struct PortfolioAsset {
        uint256 assetId;
        uint256 quantity;
        uint256 purchasePrice;
        address owner;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // State variables
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Address of the contract deployer; cannot be changed after deployment.
    address public immutable owner;

    /// @dev Counter used to generate unique assetIds. Starts at 1 so that 0
    ///      can be treated as "unset / invalid" in validations.
    uint256 private nextAssetId = 1;

    /// @notice Registry of all assets the platform supports.
    ///         Key: assetId → Value: AssetDefinition
    mapping(uint256 => AssetDefinition) private assetRegistry;

    /// @notice Each user's portfolio of purchased positions.
    ///         Key: wallet address → Value: array of PortfolioAsset
    mapping(address => PortfolioAsset[]) private portfolios;

    // ─────────────────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Emitted when the owner registers a new tradable asset.
    event AssetAdded(
        uint256 indexed assetId,
        string  symbol,
        AssetType assetType
    );

    /// @notice Emitted when the owner toggles an asset's active status.
    event AssetStatusUpdated(uint256 indexed assetId, bool isActive);

    /// @notice Emitted when a user successfully purchases an asset.
    event AssetPurchased(
        address indexed buyer,
        uint256 indexed assetId,
        uint256 quantity,
        uint256 purchasePrice
    );

    // ─────────────────────────────────────────────────────────────────────────
    // Modifiers
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @dev Reverts if the caller is not the contract owner.
     *      Applied to all registry-management functions.
     */
    modifier onlyOwner() {
        require(msg.sender == owner, "AIQuantTrading: caller is not the owner");
        _;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Captures the deployer's address as the immutable contract owner.
     */
    constructor() {
        owner = msg.sender;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Owner-only: Asset Registry Management
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Register a new tradable asset in the platform registry.
     * @dev    Only callable by the contract owner.
     *         The asset is active by default upon registration.
     *
     * @param name      Human-readable name of the asset.
     * @param symbol    Ticker or short identifier (e.g. "ETH", "GOLD").
     * @param assetType Classification: Stock, Crypto or RealAsset.
     *
     * @return assetId  The unique ID assigned to the newly registered asset.
     */
    function addAsset(
        string  memory name,
        string  memory symbol,
        AssetType      assetType
    )
        external
        onlyOwner
        returns (uint256 assetId)
    {
        require(bytes(name).length   > 0, "AIQuantTrading: name cannot be empty");
        require(bytes(symbol).length > 0, "AIQuantTrading: symbol cannot be empty");

        assetId = nextAssetId;

        assetRegistry[assetId] = AssetDefinition({
            assetId:   assetId,
            name:      name,
            symbol:    symbol,
            assetType: assetType,
            isActive:  true
        });

        nextAssetId++;

        emit AssetAdded(assetId, symbol, assetType);
    }

    /**
     * @notice Activate or deactivate a registered asset.
     * @dev    Deactivated assets cannot be purchased until re-activated.
     *         Only callable by the contract owner.
     *
     * @param assetId  The ID of the asset to update.
     * @param isActive `true` to activate, `false` to deactivate.
     */
    function updateAssetStatus(uint256 assetId, bool isActive)
        external
        onlyOwner
    {
        require(
            assetRegistry[assetId].assetId == assetId && assetId != 0,
            "AIQuantTrading: asset does not exist"
        );

        assetRegistry[assetId].isActive = isActive;

        emit AssetStatusUpdated(assetId, isActive);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Public: Trading
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Purchase a registered asset and add it to the caller's portfolio.
     * @dev    Records the position under `msg.sender`; does not handle ETH
     *         transfers — this contract tracks off-chain paper trading state.
     *
     * @param assetId        ID of the asset to purchase (must exist and be active).
     * @param quantity       Number of units to record in the portfolio.
     * @param purchasePrice  Price-per-unit at time of purchase (off-chain value).
     */
    function buyAsset(
        uint256 assetId,
        uint256 quantity,
        uint256 purchasePrice
    )
        external
    {
        require(assetId != 0,                                     "AIQuantTrading: invalid assetId");
        require(assetRegistry[assetId].assetId == assetId,        "AIQuantTrading: asset does not exist");
        require(assetRegistry[assetId].isActive,                  "AIQuantTrading: asset is not active");
        require(quantity      > 0,                                "AIQuantTrading: quantity must be > 0");
        require(purchasePrice > 0,                                "AIQuantTrading: purchasePrice must be > 0");

       bool assetFound = false;

// Check if the user already owns this asset
for (uint256 i = 0; i < portfolios[msg.sender].length; i++) {
    if (portfolios[msg.sender][i].assetId == assetId) {
        portfolios[msg.sender][i].quantity += quantity;

        // Update purchase price to the latest buy price
        // (Later we can improve this to calculate average buy price)
        portfolios[msg.sender][i].purchasePrice = purchasePrice;

        assetFound = true;
        break;
    }
}

// If the asset does not exist in the portfolio, create a new position
if (!assetFound) {
    portfolios[msg.sender].push(
        PortfolioAsset({
            assetId: assetId,
            quantity: quantity,
            purchasePrice: purchasePrice,
            owner: msg.sender
        })
    );
}

emit AssetPurchased(msg.sender, assetId, quantity, purchasePrice);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Public: Read-only Views
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Return the full portfolio of the calling wallet.
     * @return Array of PortfolioAsset positions held by `msg.sender`.
     */
    function getPortfolio()
        external
        view
        returns (PortfolioAsset[] memory)
    {
        return portfolios[msg.sender];
    }

    /**
     * @notice Look up a registered asset by its ID.
     * @dev    Reverts if the asset has not been registered.
     *
     * @param assetId  The unique asset identifier.
     * @return         The full AssetDefinition struct.
     */
    function getAsset(uint256 assetId)
        external
        view
        returns (AssetDefinition memory)
    {
        require(
            assetRegistry[assetId].assetId == assetId && assetId != 0,
            "AIQuantTrading: asset does not exist"
        );
        return assetRegistry[assetId];
    }

    /**
     * @notice Return the total number of assets that have been registered.
     * @dev    Assets are numbered 1 … (nextAssetId - 1).
     */
    function getTotalAssets() external view returns (uint256) {
        return nextAssetId - 1;
    }
}
