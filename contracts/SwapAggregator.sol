// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IUniswapV2Router {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);

    function getAmountsOut(
        uint amountIn,
        address[] calldata path
    ) external view returns (uint[] memory amounts);
}

interface IUniswapV2Factory {
    function getPair(address tokenA, address tokenB) external view returns (address pair);
}

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
}

/**
 * @title SwapAggregator
 * @notice Enables cross-router swaps in a single transaction.
 *         Routes: tokenIn → WETH (Router1) → tokenOut (Router2)
 *         Uses WETH as the bridge between two UniswapV2 routers.
 */
contract SwapAggregator {
    IUniswapV2Router public uniswapRouter;
    IUniswapV2Router public customRouter;
    IUniswapV2Factory public uniswapFactory;
    IUniswapV2Factory public customFactory;
    address public weth;
    address public owner;

    uint256 private _locked;

    event CrossSwap(
        address indexed user,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );

    modifier nonReentrant() {
        require(_locked == 0, "Reentrant");
        _locked = 1;
        _;
        _locked = 0;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    /**
     * @param _uniswapRouter  Uniswap V2 Router on Base
     * @param _customRouter   Custom UniswapV2 Router
     * @param _uniswapFactory Uniswap V2 Factory on Base
     * @param _customFactory  Custom UniswapV2 Factory
     * @param _weth           WETH address on Base
     */
    constructor(
        address _uniswapRouter,
        address _customRouter,
        address _uniswapFactory,
        address _customFactory,
        address _weth
    ) {
        uniswapRouter = IUniswapV2Router(_uniswapRouter);
        customRouter = IUniswapV2Router(_customRouter);
        uniswapFactory = IUniswapV2Factory(_uniswapFactory);
        customFactory = IUniswapV2Factory(_customFactory);
        weth = _weth;
        owner = msg.sender;
    }

    // =====================================================================
    // CROSS-SWAP
    // =====================================================================

    /**
     * @notice Cross-router swap: tokenIn → WETH (Router1) → tokenOut (Router2)
     * @param tokenIn       Token the user pays
     * @param tokenOut      Token the user receives
     * @param amountIn      Amount of tokenIn
     * @param amountOutMin  Minimum tokenOut (slippage protection)
     * @param routerInFirst 0 = Uniswap router first, 1 = Custom router first
     */
    function crossSwap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMin,
        uint8 routerInFirst
    ) external nonReentrant {
        require(tokenIn != tokenOut, "Same token");
        require(amountIn > 0, "Zero amount");

        // Transfer tokenIn from user to this contract
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);

        IUniswapV2Router firstRouter = routerInFirst == 0 ? uniswapRouter : customRouter;
        IUniswapV2Router secondRouter = routerInFirst == 0 ? customRouter : uniswapRouter;

        // Step 1: Swap tokenIn → WETH via first router
        IERC20(tokenIn).approve(address(firstRouter), amountIn);

        address[] memory path1 = new address[](2);
        path1[0] = tokenIn;
        path1[1] = weth;

        uint[] memory amounts1 = firstRouter.swapExactTokensForTokens(
            amountIn, 0, path1, address(this), block.timestamp + 300
        );

        uint256 wethAmount = amounts1[1];

        // Step 2: Swap WETH → tokenOut via second router
        IERC20(weth).approve(address(secondRouter), wethAmount);

        address[] memory path2 = new address[](2);
        path2[0] = weth;
        path2[1] = tokenOut;

        uint[] memory amounts2 = secondRouter.swapExactTokensForTokens(
            wethAmount, amountOutMin, path2, msg.sender, block.timestamp + 300
        );

        emit CrossSwap(msg.sender, tokenIn, tokenOut, amountIn, amounts2[1]);
    }

    // =====================================================================
    // VIEW FUNCTIONS
    // =====================================================================

    /**
     * @notice Preview how much tokenOut you'll get from a cross-swap.
     */
    function getAmountsOutCross(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint8 routerInFirst
    ) external view returns (uint256) {
        IUniswapV2Router firstRouter = routerInFirst == 0 ? uniswapRouter : customRouter;
        IUniswapV2Router secondRouter = routerInFirst == 0 ? customRouter : uniswapRouter;

        address[] memory path1 = new address[](2);
        path1[0] = tokenIn;
        path1[1] = weth;
        uint[] memory amounts1 = firstRouter.getAmountsOut(amountIn, path1);

        address[] memory path2 = new address[](2);
        path2[0] = weth;
        path2[1] = tokenOut;
        uint[] memory amounts2 = secondRouter.getAmountsOut(amounts1[1], path2);

        return amounts2[1];
    }

    /**
     * @notice Check which cross-swap route is possible.
     *         Returns: 0 = Uniswap first, 1 = Custom first, 2 = no route
     */
    function findCrossRoute(address tokenIn, address tokenOut) external view returns (uint8) {
        // Route A: tokenIn→WETH on Uniswap, WETH→tokenOut on Custom
        bool uniHasIn = uniswapFactory.getPair(tokenIn, weth) != address(0);
        bool customHasOut = customFactory.getPair(weth, tokenOut) != address(0);
        if (uniHasIn && customHasOut) return 0;

        // Route B: tokenIn→WETH on Custom, WETH→tokenOut on Uniswap
        bool customHasIn = customFactory.getPair(tokenIn, weth) != address(0);
        bool uniHasOut = uniswapFactory.getPair(weth, tokenOut) != address(0);
        if (customHasIn && uniHasOut) return 1;

        return 2; // No cross route available
    }

    // =====================================================================
    // OWNER FUNCTIONS
    // =====================================================================

    /**
     * @notice Emergency: recover tokens accidentally sent to this contract.
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(owner, amount);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid");
        owner = newOwner;
    }
}
