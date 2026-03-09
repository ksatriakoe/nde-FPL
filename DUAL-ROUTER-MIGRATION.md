# Rekap: Dual Router + Base Migration + Listing Fee

> Session: 8-9 Maret 2026

## Ringkasan

Migrasi DEX dari **Sepolia testnet** ke **Base mainnet** dengan arsitektur **Dual Router** (Custom + Uniswap V2 Official), **SwapAggregator** untuk cross-router swap, dan **ListingManager** untuk listing fee 100 TEST.

---

## Deployed Contracts (Base Mainnet)

| Contract | Address |
|----------|---------|
| TEST Token | `0x48e72A7FEAeA5e7B6DADbc7D82ac706F93CEf96C` |
| UniswapV2Factory (custom) | `0xf42548Ba89dc2314408f44b16506F88769abDED5` |
| UniswapV2Router02 (custom) | `0x313049192Cb0d4027A0De419a1dD169F9eFB48c7` |
| ListingManager | `0x3EF993BEe30c99A840c4b61fc1c9d08FCEdA3857` |
| SwapAggregator | `0xBd5447Ff67852627c841bC695b99626BB60AcC8a` |
| Uniswap V2 Factory (official) | `0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6` |
| Uniswap V2 Router (official) | `0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24` |
| WETH (Base native) | `0x4200000000000000000000000000000000000006` |

---

## File yang Diubah/Ditambahkan

### Smart Contracts

| Status | File | Perubahan |
|--------|------|-----------|
| **[MODIFIED]** | `contract-uniswapv2/Core.sol` | `UniswapV2Factory`: + `listingManager` state, + `setListingManager()`, + `createPair` restricted ke owner/ListingManager |
| **[NEW]** | `contracts/ListingManager.sol` | Listing fee 100 TEST: `listToken()`, `listTokenFree()`, `setListingFee()`, `withdrawFees()` |
| **[NEW]** | `contracts/SwapAggregator.sol` | Cross-router swap: `crossSwap()`, `getAmountsOutCross()`, `findCrossRoute()` |

### Frontend — Config

| Status | File | Perubahan |
|--------|------|-----------|
| **[MODIFIED]** | `src/services/walletConfig.js` | `sepolia` → `base`, 4 RPC fallback (publicnode, 1rpc, drpc, pocket) |
| **[MODIFIED]** | `src/services/swapConstants.js` | Rewrite: dual addresses, aggregator/listingManager ABIs, token list + USDC/DAI, WETH Base |
| **[MODIFIED]** | `src/services/contractConfig.js` | `TOKEN_ADDRESS` → TEST di Base |

### Frontend — Hooks

| Status | File | Perubahan |
|--------|------|-----------|
| **[MODIFIED]** | `src/hooks/useWeb3.jsx` | Rewrite: 2 router, 2 factory, aggregator, listingManager contracts. `findRouter()`, `findCrossRoute()` |
| **[MODIFIED]** | `src/hooks/useTokenBalance.js` | `swapAddresses.weth` → `WETH_ADDRESS` |

### Frontend — Pages

| Status | File | Perubahan |
|--------|------|-----------|
| **[MODIFIED]** | `src/pages/Swap/SwapTab.jsx` | Rewrite: 3-way routing (direct → multi-hop → aggregator), route label, price impact semua route |
| **[MODIFIED]** | `src/pages/Swap/PoolTab.jsx` | Rewrite: + `ListingFeeModal`, + `handlePayListingFee()`, pair existence check |
| **[MODIFIED]** | `src/pages/Swap/TokenSelectModal.jsx` | `swapAddresses.weth` → `WETH_ADDRESS` |

---

## Arsitektur Routing

```
1. Cek Custom Factory → pair ada? → coba [A, B] → gagal? → coba [A, WETH, B]
2. Cek Uniswap Factory → pair ada? → coba [A, B] → gagal? → coba [A, WETH, B]
3. Cek Aggregator → cross-route? → crossSwap via 2 router (WETH bridge)
4. Semua gagal → "No Route Found"
```

## Listing Fee Flow

```
User add LP pair baru → pair belum ada → modal "Bayar 100 TEST" → 
bayar via ListingManager.listToken() → pair dibuat → add liquidity
```

Owner bisa buat pair gratis via `ListingManager.listTokenFree()` di BaseScan.

---

## TODO
- [x] Deploy FPLStaking di Base → `0xe2C52d3Bfb69a0Bff9bA6a1a1C28e24BE23AAE16`
- [x] Deploy FPLSubscription di Base → `0x6fB4931995931b5E4bf821088fe4C3e6bf092054`
