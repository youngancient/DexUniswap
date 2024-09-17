// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;


library Errors{
    error ZeroAddressNotAllowed();
    error ZeroValueNotAllowed();
    error ApprovalFailed();
    error InsufficientLiquidity();
    error InsufficientLiquidityInContract();
    error PoolDoesNotExist();
}


library Events {
    event LiquidityAddedSuccessfully(
        uint256 indexed _amountA,
        uint256 indexed _amountB,
        uint256 indexed _liquidity,
        address _receiver
    );
    event LiquidityRemovedSuccessfully(
        uint256 indexed _liquidityRemoved,
        uint256 indexed _amountA,
        uint256 indexed _amountB,
        address _receiver
    );
}