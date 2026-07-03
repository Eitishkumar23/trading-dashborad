// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title  AIQuantTrading
 * @notice Production-ready multi-asset trading registry with full
 *         transaction history for Buy and Sell operations.
 */
contract AIQuantTrading {

    // ─────────────────────────────────────────────────────────────────────
    // Enums
    // ─────────────────────────────────────────────────────────────────────

    enum AssetType { Stock, Crypto, RealAsset }

    enum TxType { Buy, Sell }

    // ─────────────────────────────────────────────────────────────────────
    // Structs
    // ─────────────────────────────────────────────────────────────────────

    struct AssetDefinition {
        uint256   assetId;
        string    name;
        string    symbol;
        AssetType assetType;
        bool      isActive;
    }

    struct PortfolioAsset {
        uint256 assetId;
        uint256 quantity;
        uint256 purchasePrice;
        address owner;
    }

    /**
     * @notice Records every buy and sell action on-chain.
     */
    struct TradeTransaction {
        uint256   txId;
        uint256   assetId;
        string    symbol;
        TxType    txType;       // Buy or Sell
        uint256   quantity;
        uint256   price;        // scaled by 100 (e.g. 4512399 = $45123.99)
        uint256   timestamp;    // block.timestamp
        address   trader;
    }

    // ─────────────────────────────────────────────────────────────────────
    // State variables
    // ─────────────────────────────────────────────────────────────────────

    address public immutable owner;

    uint256 private nextAssetId = 1;
    uint256 private nextTxId    = 1;

    mapping(uint256 => AssetDefinition)    private assetRegistry;
    mapping(address => PortfolioAsset[])   private portfolios;
    mapping(address => TradeTransaction[]) private tradeHistory;

    // ─────────────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────────────

    event AssetAdded(uint256 indexed assetId, string symbol, AssetType assetType);
    event AssetStatusUpdated(uint256 indexed assetId, bool isActive);
    event AssetPurchased(address indexed trader, uint256 indexed assetId, uint256 quantity, uint256 price);
    event AssetSold(address indexed trader, uint256 indexed assetId, uint256 quantity, uint256 price);

    // ─────────────────────────────────────────────────────────────────────
    // Modifiers
    // ─────────────────────────────────────────────────────────────────────

    modifier onlyOwner() {
        require(msg.sender == owner, "AIQuantTrading: caller is not the owner");
        _;
    }

    // ─────────────────────────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────────────────────────

    constructor() {
        owner = msg.sender;
    }

    // ─────────────────────────────────────────────────────────────────────
    // Owner: Asset Registry
    // ─────────────────────────────────────────────────────────────────────

    function addAsset(
        string    memory name,
        string    memory symbol,
        AssetType        assetType
    ) external onlyOwner returns (uint256 assetId) {
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

    function updateAssetStatus(uint256 assetId, bool isActive) external onlyOwner {
        require(
            assetRegistry[assetId].assetId == assetId && assetId != 0,
            "AIQuantTrading: asset does not exist"
        );
        assetRegistry[assetId].isActive = isActive;
        emit AssetStatusUpdated(assetId, isActive);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Trading: Buy
    // ─────────────────────────────────────────────────────────────────────

    function buyAsset(
        uint256 assetId,
        uint256 quantity,
        uint256 price
    ) external {
        require(assetId != 0,                                  "AIQuantTrading: invalid assetId");
        require(assetRegistry[assetId].assetId == assetId,    "AIQuantTrading: asset does not exist");
        require(assetRegistry[assetId].isActive,               "AIQuantTrading: asset is not active");
        require(quantity > 0,                                  "AIQuantTrading: quantity must be > 0");
        require(price    > 0,                                  "AIQuantTrading: price must be > 0");

        // Update portfolio
        bool found = false;
        for (uint256 i = 0; i < portfolios[msg.sender].length; i++) {
            if (portfolios[msg.sender][i].assetId == assetId) {
                portfolios[msg.sender][i].quantity      += quantity;
                portfolios[msg.sender][i].purchasePrice  = price;
                found = true;
                break;
            }
        }
        if (!found) {
            portfolios[msg.sender].push(PortfolioAsset({
                assetId:       assetId,
                quantity:      quantity,
                purchasePrice: price,
                owner:         msg.sender
            }));
        }

        // Record transaction history
        tradeHistory[msg.sender].push(TradeTransaction({
            txId:      nextTxId++,
            assetId:   assetId,
            symbol:    assetRegistry[assetId].symbol,
            txType:    TxType.Buy,
            quantity:  quantity,
            price:     price,
            timestamp: block.timestamp,
            trader:    msg.sender
        }));

        emit AssetPurchased(msg.sender, assetId, quantity, price);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Trading: Sell
    // ─────────────────────────────────────────────────────────────────────

    function sellAsset(
        uint256 assetId,
        uint256 quantity,
        uint256 price
    ) external {
        require(assetId  != 0,                              "AIQuantTrading: invalid assetId");
        require(quantity  > 0,                              "AIQuantTrading: quantity must be > 0");
        require(price     > 0,                              "AIQuantTrading: price must be > 0");

        // Find and update portfolio
        bool found = false;
        for (uint256 i = 0; i < portfolios[msg.sender].length; i++) {
            if (portfolios[msg.sender][i].assetId == assetId) {
                require(
                    portfolios[msg.sender][i].quantity >= quantity,
                    "AIQuantTrading: insufficient holdings"
                );
                portfolios[msg.sender][i].quantity -= quantity;
                found = true;
                break;
            }
        }
        require(found, "AIQuantTrading: asset not in portfolio");

        // Record transaction history
        tradeHistory[msg.sender].push(TradeTransaction({
            txId:      nextTxId++,
            assetId:   assetId,
            symbol:    assetRegistry[assetId].symbol,
            txType:    TxType.Sell,
            quantity:  quantity,
            price:     price,
            timestamp: block.timestamp,
            trader:    msg.sender
        }));

        emit AssetSold(msg.sender, assetId, quantity, price);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Views
    // ─────────────────────────────────────────────────────────────────────

    function getPortfolio()
        external view returns (PortfolioAsset[] memory)
    {
        return portfolios[msg.sender];
    }

    function getTradeHistory()
        external view returns (TradeTransaction[] memory)
    {
        return tradeHistory[msg.sender];
    }

    function getAsset(uint256 assetId)
        external view returns (AssetDefinition memory)
    {
        require(
            assetRegistry[assetId].assetId == assetId && assetId != 0,
            "AIQuantTrading: asset does not exist"
        );
        return assetRegistry[assetId];
    }

    function getTotalAssets() external view returns (uint256) {
        return nextAssetId - 1;
    }
}