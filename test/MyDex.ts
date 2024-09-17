import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import hre, { ethers } from "hardhat";
const helpers = require("@nomicfoundation/hardhat-network-helpers");

describe("My Dex", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.

  async function deployMyDex() {
    const ROUTER_ADDRESS = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
    const FACTORY_ADDRESS = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";

    const TOKEN_HOLDER = "0xf584F8728B874a6a5c7A8d4d387C9aae9172D621";
    await helpers.impersonateAccount(TOKEN_HOLDER);

    const [owner, account1] = await ethers.getSigners();

    const impersonatedSigner = await ethers.getSigner(TOKEN_HOLDER);

    // TOKENS
    const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
    const DAI_ADDRESS = "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984";
    // dai -> 0x6B175474E89094C44Da98b954EedeAC495271d0F
    const usdcContract = await ethers.getContractAt(
      "IERC20",
      USDC_ADDRESS,
      impersonatedSigner
    );

    const daiContract = await ethers.getContractAt(
      "IERC20",
      DAI_ADDRESS,
      impersonatedSigner
    );

    // Contracts are deployed using the first signer/account by default

    const MyDex = await hre.ethers.getContractFactory("MyDex");
    const myDex = await MyDex.deploy(ROUTER_ADDRESS, FACTORY_ADDRESS);

    const deadline = Math.floor(Date.now() / 1000) + 60 * 10;

    return {
      owner,
      account1,
      impersonatedSigner,
      myDex,
      ROUTER_ADDRESS,
      daiContract,
      usdcContract,
      deadline,
      USDC_ADDRESS,
      DAI_ADDRESS,
    };
  }

  describe("Deployment", function () {
    it("Should set the router address correctly", async function () {
      const { owner, myDex, ROUTER_ADDRESS } = await loadFixture(deployMyDex);

      expect(await myDex.uniswapV2RouterAddress()).to.equal(ROUTER_ADDRESS);
    });
    it("Should set the owner address correctly", async function () {
      const { owner, myDex, ROUTER_ADDRESS } = await loadFixture(deployMyDex);

      expect(await myDex.owner()).to.equal(owner);
    });
    it("Should set the swap count to zero", async function () {
      const { owner, myDex, ROUTER_ADDRESS } = await loadFixture(deployMyDex);
      expect(await myDex.swapCounter()).to.equal(0);
    });
  });

  describe("Swap tokens", function () {
    it("Should revert if recipient address is zero address", async function () {
      const {
        owner,
        myDex,
        ROUTER_ADDRESS,
        impersonatedSigner,
        deadline,
        usdcContract,
        USDC_ADDRESS,
        DAI_ADDRESS,
      } = await loadFixture(deployMyDex);

      // swap USDC -> DAI

      let amountOut = ethers.parseUnits("20", 18); // DAI
      let amountInMax = ethers.parseUnits("1000", 6);

      await usdcContract.approve(myDex, amountInMax);

      await expect(
        myDex
          .connect(impersonatedSigner)
          .swapTokens(
            amountOut,
            amountInMax,
            [USDC_ADDRESS, DAI_ADDRESS],
            ethers.ZeroAddress,
            deadline
          )
      ).to.be.revertedWithCustomError(myDex, "ZeroAddressNotAllowed");
    });

    it("Should revert if amountInMax is zero", async function () {
      const {
        owner,
        myDex,
        ROUTER_ADDRESS,
        impersonatedSigner,
        deadline,
        usdcContract,
        USDC_ADDRESS,
        DAI_ADDRESS,
      } = await loadFixture(deployMyDex);

      // swap USDC -> DAI

      let amountOut = ethers.parseUnits("20", 18); // DAI
      let amountInMax = ethers.parseUnits("0", 6);

      await usdcContract.approve(myDex, amountInMax);

      await expect(
        myDex
          .connect(impersonatedSigner)
          .swapTokens(
            amountOut,
            amountInMax,
            [USDC_ADDRESS, DAI_ADDRESS],
            impersonatedSigner,
            deadline
          )
      ).to.be.revertedWithCustomError(myDex, "ZeroValueNotAllowed");
    });
    it("Should swap tokens successfully", async function () {
      const {
        owner,
        myDex,
        ROUTER_ADDRESS,
        impersonatedSigner,
        deadline,
        usdcContract,
        USDC_ADDRESS,
        DAI_ADDRESS,
      } = await loadFixture(deployMyDex);

      // swap USDC -> DAI

      let amountOut = ethers.parseUnits("20", 18); // DAI
      let amountInMax = ethers.parseUnits("1000", 6);

      // (await usdcContract).approve(myDex, amountInMax);
      await usdcContract.approve(myDex, amountInMax);

      const swapTx = await myDex
        .connect(impersonatedSigner)
        .swapTokens(
          amountOut,
          amountInMax,
          [USDC_ADDRESS, DAI_ADDRESS],
          impersonatedSigner,
          deadline
        );

      swapTx.wait();

      expect(await myDex.swapCounter()).to.equal(1);
    });
  });

  describe("Add Liquidity tokens", function () {
    it("Should revert if recipient address is zero address", async function () {
      const {
        owner,
        myDex,
        ROUTER_ADDRESS,
        impersonatedSigner,
        deadline,
        usdcContract,
        daiContract,
        USDC_ADDRESS,
        DAI_ADDRESS,
      } = await loadFixture(deployMyDex);

      // swap USDC -> DAI

      let amountAMin = 0;
      let amountBMin = 0;

      let amountADesired = ethers.parseUnits("1000", 6); //USDC
      let amountBDesired = ethers.parseUnits("20", 18); // DAI

      await usdcContract.approve(myDex, amountADesired);
      await daiContract.approve(myDex, amountBDesired);

      await expect(
        myDex
          .connect(impersonatedSigner)
          .addLiquidity(
            USDC_ADDRESS,
            DAI_ADDRESS,
            amountADesired,
            amountBDesired,
            amountAMin,
            amountBMin,
            ethers.ZeroAddress,
            deadline
          )
      ).to.be.revertedWithCustomError(myDex, "ZeroAddressNotAllowed");
    });
    it("Should revert if token A or token B address is zero address", async function () {
      const {
        owner,
        myDex,
        ROUTER_ADDRESS,
        impersonatedSigner,
        deadline,
        usdcContract,
        daiContract,
        USDC_ADDRESS,
        DAI_ADDRESS,
      } = await loadFixture(deployMyDex);

      // swap USDC -> DAI

      let amountAMin = 0;
      let amountBMin = 0;

      let amountADesired = ethers.parseUnits("1000", 6); //USDC
      let amountBDesired = ethers.parseUnits("20", 18); // DAI

      await usdcContract.approve(myDex, amountADesired);
      await daiContract.approve(myDex, amountBDesired);

      await expect(
        myDex
          .connect(impersonatedSigner)
          .addLiquidity(
            ethers.ZeroAddress,
            ethers.ZeroAddress,
            amountADesired,
            amountBDesired,
            amountAMin,
            amountBMin,
            impersonatedSigner.address,
            deadline
          )
      ).to.be.revertedWithCustomError(myDex, "ZeroAddressNotAllowed");
    });
    it("Should Successfully add liquidity", async function () {
      const {
        owner,
        myDex,
        ROUTER_ADDRESS,
        impersonatedSigner,
        deadline,
        usdcContract,
        daiContract,
        USDC_ADDRESS,
        DAI_ADDRESS,
      } = await loadFixture(deployMyDex);

      // check balance before
      let USDCbalanceBefore = await usdcContract.balanceOf(impersonatedSigner);
      let DAIbalanceBefore = await daiContract.balanceOf(impersonatedSigner);

      // check the MyDex contract LP token before
      let myDexLPTokenBefore = await myDex.checkLiquidityAdded(
        USDC_ADDRESS,
        DAI_ADDRESS,
        impersonatedSigner
      );

      let amountAMin = 0;
      let amountBMin = 0;

      let amountADesired = ethers.parseUnits("1000", 6); //USDC
      let amountBDesired = ethers.parseUnits("30", 18); // DAI

      await usdcContract.approve(myDex, amountADesired);
      await daiContract.approve(myDex, amountBDesired);

      await myDex
        .connect(impersonatedSigner)
        .addLiquidity(
          USDC_ADDRESS,
          DAI_ADDRESS,
          amountADesired,
          amountBDesired,
          amountAMin,
          amountBMin,
          impersonatedSigner.address,
          deadline
        );

      expect(
        await myDex.checkLiquidityAdded(
          USDC_ADDRESS,
          DAI_ADDRESS,
          impersonatedSigner
        )
      ).to.greaterThan(myDexLPTokenBefore);

      // after adding liquidity, we expect the token balances to have reduced
      // check balance after
      expect(await usdcContract.balanceOf(impersonatedSigner.address)).lessThan(
        USDCbalanceBefore
      );
      expect(await daiContract.balanceOf(impersonatedSigner.address)).lessThan(
        DAIbalanceBefore
      );
    });
  });
  describe("Remove Liquidity tokens", function () {
    it("Should revert if user inputs zero for liquidity", async function () {
      const {
        owner,
        myDex,
        ROUTER_ADDRESS,
        impersonatedSigner,
        deadline,
        usdcContract,
        daiContract,
        USDC_ADDRESS,
        DAI_ADDRESS,
      } = await loadFixture(deployMyDex);

      // check balance before
      let USDCbalanceBefore = await usdcContract.balanceOf(impersonatedSigner);
      let DAIbalanceBefore = await daiContract.balanceOf(impersonatedSigner);

      let amountAMin = 0;
      let amountBMin = 0;

      let amountADesired = ethers.parseUnits("1000", 6); //USDC
      let amountBDesired = ethers.parseUnits("30", 18); // DAI

      await usdcContract.approve(myDex, amountADesired);
      await daiContract.approve(myDex, amountBDesired);

      // add liquidity
      await myDex
        .connect(impersonatedSigner)
        .addLiquidity(
          USDC_ADDRESS,
          DAI_ADDRESS,
          amountADesired,
          amountBDesired,
          amountAMin,
          amountBMin,
          impersonatedSigner.address,
          deadline
        );

      let liquidity = 0;
      // remove liquidity
      await expect(
        myDex.removeLiquidity(
          USDC_ADDRESS,
          DAI_ADDRESS,
          liquidity,
          amountAMin,
          amountBMin,
          impersonatedSigner.address,
          deadline
        )
      ).to.be.revertedWithCustomError(myDex, "ZeroValueNotAllowed");
    });
    it("Should revert if any zero address is passed in", async function () {
      const {
        owner,
        myDex,
        ROUTER_ADDRESS,
        impersonatedSigner,
        deadline,
        usdcContract,
        daiContract,
        USDC_ADDRESS,
        DAI_ADDRESS,
      } = await loadFixture(deployMyDex);

      // check balance before
      let USDCbalanceBefore = await usdcContract.balanceOf(impersonatedSigner);
      let DAIbalanceBefore = await daiContract.balanceOf(impersonatedSigner);

      let amountAMin = 0;
      let amountBMin = 0;

      let amountADesired = ethers.parseUnits("1000", 6); //USDC
      let amountBDesired = ethers.parseUnits("30", 18); // DAI

      await usdcContract.approve(myDex, amountADesired);
      await daiContract.approve(myDex, amountBDesired);

      // add liquidity
      await myDex
        .connect(impersonatedSigner)
        .addLiquidity(
          USDC_ADDRESS,
          DAI_ADDRESS,
          amountADesired,
          amountBDesired,
          amountAMin,
          amountBMin,
          impersonatedSigner.address,
          deadline
        );

      let liquidity = ethers.parseUnits("10", 18);
      // remove liquidity
      await expect(
        myDex.removeLiquidity(
          ethers.ZeroAddress,
          ethers.ZeroAddress,
          liquidity,
          amountAMin,
          amountBMin,
          ethers.ZeroAddress,
          deadline
        )
      ).to.be.revertedWithCustomError(myDex, "ZeroAddressNotAllowed");
    });
    it("Should revert if the user does not have sufficient liquidity", async function () {
      const {
        owner,
        myDex,
        ROUTER_ADDRESS,
        impersonatedSigner,
        deadline,
        usdcContract,
        daiContract,
        USDC_ADDRESS,
        DAI_ADDRESS,
      } = await loadFixture(deployMyDex);

      let amountAMin = ethers.parseUnits("0", 18);
      let amountBMin = ethers.parseUnits("0", 18);

      let amountADesired = ethers.parseUnits("1000", 6); //USDC
      let amountBDesired = ethers.parseUnits("30", 18); // DAI

      await usdcContract.approve(myDex, amountADesired);
      await daiContract.approve(myDex, amountBDesired);

      // add liquidity
      const addLiquidityTx = await myDex
        .connect(impersonatedSigner)
        .addLiquidity(
          USDC_ADDRESS,
          DAI_ADDRESS,
          amountADesired,
          amountBDesired,
          amountAMin,
          amountBMin,
          impersonatedSigner.address,
          deadline
        );
      addLiquidityTx.wait();

      let liquidity = ethers.parseUnits("100000", 18);

      // check balance before
      let USDCbalanceBefore = await usdcContract.balanceOf(impersonatedSigner);
      let DAIbalanceBefore = await daiContract.balanceOf(impersonatedSigner);

      // remove liquidity
      amountAMin = ethers.parseUnits("1", 18);
      amountBMin = ethers.parseUnits("1", 18);

      await expect(
        myDex
          .connect(impersonatedSigner)
          .removeLiquidity(
            USDC_ADDRESS,
            DAI_ADDRESS,
            liquidity,
            amountAMin,
            amountBMin,
            impersonatedSigner.address,
            deadline
          )
      ).to.be.revertedWithCustomError(myDex, "InsufficientLiquidity");

      // after removing liquidity, we expect the token balances to have increased
      // expect(await usdcContract.balanceOf(impersonatedSigner)).greaterThan(
      //   USDCbalanceBefore
      // );
      // expect(await daiContract.balanceOf(impersonatedSigner)).greaterThan(
      //   DAIbalanceBefore
      // );
    });
    it("Should remove liquidity successfully", async function () {
      const {
        owner,
        myDex,
        ROUTER_ADDRESS,
        impersonatedSigner,
        deadline,
        usdcContract,
        daiContract,
        USDC_ADDRESS,
        DAI_ADDRESS,
      } = await loadFixture(deployMyDex);

      let amountAMin = ethers.parseUnits("0", 6);
      let amountBMin = ethers.parseUnits("0", 18);

      let amountADesired = ethers.parseUnits("1000", 6); //USDC
      let amountBDesired = ethers.parseUnits("30", 18); // DAI

      await usdcContract.approve(myDex, amountADesired);
      await daiContract.approve(myDex, amountBDesired);

      // add liquidity
      const addLiquidityTx = await myDex
        .connect(impersonatedSigner)
        .addLiquidity(
          USDC_ADDRESS,
          DAI_ADDRESS,
          amountADesired,
          amountBDesired,
          amountAMin,
          amountBMin,
          impersonatedSigner.address,
          deadline
        );
      addLiquidityTx.wait();

      // check contract LP tokens
      let liquidityBeforeRemovingLP = await myDex.checkLiquidityAdded(
        USDC_ADDRESS,
        DAI_ADDRESS,
        impersonatedSigner
      );

      let liquidityToBeRemoved = liquidityBeforeRemovingLP - BigInt(1000);


      // check tokens balance before
      let USDCbalanceBefore = await usdcContract.balanceOf(impersonatedSigner);
      let DAIbalanceBefore = await daiContract.balanceOf(impersonatedSigner);

      // remove liquidity
      amountAMin = ethers.parseUnits("1", 6);
      amountBMin = ethers.parseUnits("1", 18);

      // approve LPtoken to be removed by myDex
      const pairAddress = await myDex.getPairAddress(
        USDC_ADDRESS,
        DAI_ADDRESS,
        impersonatedSigner
      );
      
      const pairLPContract = await ethers.getContractAt(
        "IUniswapV2Pair",
        pairAddress,
        impersonatedSigner
      );
      

      await pairLPContract.approve(myDex, liquidityToBeRemoved);

      await myDex
        .connect(impersonatedSigner)
        .removeLiquidity(
          USDC_ADDRESS,
          DAI_ADDRESS,
          liquidityToBeRemoved,
          amountAMin,
          amountBMin,
          impersonatedSigner.address,
          deadline
        );

      expect(
        await myDex.checkLiquidityAdded(
          USDC_ADDRESS,
          DAI_ADDRESS,
          impersonatedSigner
        )
      ).to.lessThan(liquidityBeforeRemovingLP);

      // after removing liquidity, we expect the token balances to have increased
      expect(await usdcContract.balanceOf(impersonatedSigner)).greaterThan(
        USDCbalanceBefore
      );
      expect(await daiContract.balanceOf(impersonatedSigner)).greaterThan(
        DAIbalanceBefore
      );
    });
  });
});

// later after Test Today

// finish remove liquidity
// swap exact tokens for tokens
// add liquidity ethers
// remove liquidity ethers
