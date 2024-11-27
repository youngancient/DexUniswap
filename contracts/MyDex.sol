// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;
import "./interfaces/UniswapRouter.sol";
import "./interfaces/Uniswap.sol";
import "./interfaces/IERC20.sol";
import "./Utils.sol";

// Uncomment this line to use console.log
// import "hardhat/console.sol";

// this is to basically understand UniswapV2
contract MyDex {
    address public uniswapV2RouterAddress;
    address public uniswapFactory;
    address public owner;
    uint256 public swapCounter;

    // maps liquidityAdded[useraddress][tokenA_address][tokenB_address] -> uint
    // mapping(address => mapping(address => mapping(address => uint256)))
    //     public liquidityAddedInContract;

    constructor(address _router, address _factory) {
        _sanityCheck(_router);
        _sanityCheck(_factory);
        _sanityCheck(msg.sender);

        uniswapV2RouterAddress = _router;
        uniswapFactory = _factory;
        owner = msg.sender;
    }

    function _sanityCheck(address _user) private pure {
        if (_user == address(0)) {
            revert Errors.ZeroAddressNotAllowed();
        }
    }

    function _zeroValueCheck(uint _amount) private pure {
        if (_amount == 0) {
            revert Errors.ZeroValueNotAllowed();
        }
    }

    function _add5PercentSlippage(
        uint256 amountInMax
    ) private pure returns (uint256) {
        uint256 increasedAmountInMax = (amountInMax * 105) / 100;
        return increasedAmountInMax;
    }

    function _getAmountIn(
        uint _amountOut,
        address[] calldata _path
    ) private view returns (uint) {
        uint256[] memory _amounts = IUniswapV2Router(uniswapV2RouterAddress)
            .getAmountsIn(_amountOut, _path);

        return _amounts[0];
    }

    function swapTokens(
        uint _amountOut,
        uint _amountInMax,
        address[] calldata _path,
        address _to,
        uint _deadline
    ) external {
        _sanityCheck(msg.sender);
        _sanityCheck(_to);
        _zeroValueCheck(_amountOut);
        _zeroValueCheck(_amountInMax);
        _zeroValueCheck(_deadline);

        // added slippage so in case the price changes slightly
        // before the actual swap, the percentage change would likely fall within the slippage

        uint256 _userAmountIn = _add5PercentSlippage(
            (_getAmountIn(_amountOut, _path))
        );

        IERC20(_path[0]).transferFrom(msg.sender, address(this), _userAmountIn);

        // contract approves uniswap
        if (!IERC20(_path[0]).approve(uniswapV2RouterAddress, _userAmountIn)) {
            revert Errors.ApprovalFailed();
        }

        IUniswapV2Router(uniswapV2RouterAddress).swapTokensForExactTokens(
            _amountOut,
            _userAmountIn,
            _path,
            _to,
            _deadline
        );

        swapCounter += 1;
    }

    function swapExactTokensForTokens(
        uint _amountIn,
        uint _amountOutMin,
        address[] calldata _path,
        address _to,
        uint _deadline
    ) external {
        _sanityCheck(msg.sender);
        _sanityCheck(_to);
        _zeroValueCheck(_amountIn);
        _zeroValueCheck(_amountOutMin);
        _zeroValueCheck(_deadline);

        IERC20(_path[0]).transferFrom(msg.sender, address(this), _amountIn);

        if (!IERC20(_path[0]).approve(uniswapV2RouterAddress, _amountIn)) {
            revert Errors.ApprovalFailed();
        }

        IUniswapV2Router(uniswapV2RouterAddress).swapExactTokensForTokens(
            _amountIn,
            _amountOutMin,
            _path,
            _to,
            _deadline
        );

        swapCounter += 1;
    }

    function getPairAddress(address _tokenA,
        address _tokenB,
        address _user) public view returns(address){
             _sanityCheck(_tokenA);
        _sanityCheck(_tokenB);
        _sanityCheck(_user);

        address pairAddress = IUniswapV2Factory(uniswapFactory).getPair(
            _tokenA,
            _tokenB
        );
        if (pairAddress == address(0)) {
            revert Errors.PoolDoesNotExist();
        }
        return pairAddress;
    }

    function checkLiquidityAdded(
        address _tokenA,
        address _tokenB,
        address _user
    ) public view returns (uint256) {
       address pairAddress = getPairAddress(_tokenA, _tokenB, _user);
        IUniswapV2Pair uniswapPair = IUniswapV2Pair(pairAddress);
        // balance of LP tokens owned by User
        return uniswapPair.balanceOf(_user);
    }

    function approveLiquidityTokenRemoval(
        address _tokenA,
        address _tokenB,
        uint256 _amount
    ) private returns (bool) {
        _sanityCheck(_tokenA);
        _sanityCheck(_tokenB);
        _sanityCheck(msg.sender);
        _zeroValueCheck(_amount);

        address pairAddress = IUniswapV2Factory(uniswapFactory).getPair(
            _tokenA,
            _tokenB
        );
        if (pairAddress == address(0)) {
            revert Errors.PoolDoesNotExist();
        }
        IUniswapV2Pair uniswapPair = IUniswapV2Pair(pairAddress);
        // balance of LP tokens owned by User
        return uniswapPair.approve(uniswapV2RouterAddress, _amount);
    }

    function addLiquidity(
        address _tokenA,
        address _tokenB,
        uint _amountADesired,
        uint _amountBDesired,
        uint _amountAMin,
        uint _amountBMin,
        address _to,
        uint _deadline
    ) external {
        _sanityCheck(msg.sender);
        _sanityCheck(_tokenA);
        _sanityCheck(_tokenB);
        _sanityCheck(_to);
        _zeroValueCheck(_amountADesired);
        _zeroValueCheck(_amountBDesired);

        IERC20(_tokenA).transferFrom(
            msg.sender,
            address(this),
            _amountADesired
        );
        IERC20(_tokenB).transferFrom(
            msg.sender,
            address(this),
            _amountBDesired
        );

        if (!IERC20(_tokenA).approve(uniswapV2RouterAddress, _amountADesired)) {
            revert Errors.ApprovalFailed();
        }
        if (!IERC20(_tokenB).approve(uniswapV2RouterAddress, _amountBDesired)) {
            revert Errors.ApprovalFailed();
        }
        (
            uint256 amountA,
            uint256 amountB,
            uint256 liquidity
        ) = IUniswapV2Router(uniswapV2RouterAddress).addLiquidity(
                _tokenA,
                _tokenB,
                _amountADesired,
                _amountBDesired,
                _amountAMin,
                _amountBMin,
                _to,
                _deadline
            );

        // liquidityAddedInContract[msg.sender][_tokenA][_tokenB] += liquidity;

        emit Events.LiquidityAddedSuccessfully(
            amountA,
            amountB,
            liquidity,
            _to
        );
    }

    function removeLiquidity(
        address _tokenA,
        address _tokenB,
        uint _liquidity,
        uint _amountAMin,
        uint _amountBMin,
        address _to,
        uint _deadline
    ) external returns (uint, uint) {
        _sanityCheck(msg.sender);
        _sanityCheck(_tokenA);
        _sanityCheck(_tokenB);
        _sanityCheck(_to);
        _zeroValueCheck(_liquidity);

        // check if that liquidity exists in contract
        if (_liquidity > checkLiquidityAdded(_tokenA, _tokenB, msg.sender)) {
            revert Errors.InsufficientLiquidity();
        }

        // liquidityAddedInContract[msg.sender][_tokenA][_tokenB] -= _liquidity;
        address pairAddress = getPairAddress(_tokenA, _tokenB, msg.sender);
        IUniswapV2Pair uniswapPair = IUniswapV2Pair(pairAddress);

        // transfer LPtoken from user to contract
        uniswapPair.transferFrom(msg.sender, address(this), _liquidity);

        // // approve liquidity removal
        if (!approveLiquidityTokenRemoval(_tokenA, _tokenB, _liquidity)) {
            revert Errors.ApprovalFailed();
        }

        (uint256 amountA, uint256 amountB) = IUniswapV2Router(
            uniswapV2RouterAddress
        ).removeLiquidity(
                _tokenA,
                _tokenB,
                _liquidity,
                _amountAMin,
                _amountBMin,
                _to,
                _deadline
            );

        emit Events.LiquidityRemovedSuccessfully(
            _liquidity,
            amountA,
            amountB,
            _to
        );
        return (amountA, amountB);
    }
}
