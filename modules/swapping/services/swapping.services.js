import { ethProvider } from "../../../utils/utils.js";
import { User } from "../../auth/models/user.model.js";
import { ethers } from "ethers";
import { Tokens } from "../../transaction/model/token.model.js";
import { transactionApprovalService } from "../../transaction/services/transaction.services.js";

export const SwappingService = async (req) => {
  try {
    const { amount, from, to } = req.body;

    const ROUTER_ABI = [
      "function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)",
      "function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
      "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
      "function getAmountsOut(uint256 amountIn, address[] memory path) external view returns (uint256[] memory amounts)",
    ];

    console.log("Router ABI:", ROUTER_ABI);

    const user = await User.findOne({
      where: { id: req.user.id },
      attributes: ["privateKey"],
    });

    console.log("User Private Key:", user.privateKey);
    const wallet = new ethers.Wallet(user.privateKey, ethProvider);

    console.log("Wallet Address:", wallet.address);

    const router = new ethers.Contract(
      process.env.UNI_SWAP_ROUTER_ADDRESS,
      ROUTER_ABI,
      wallet,
    );

    console.log("Router Contract:", router);

    const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

    console.log("Dealine:", deadline);

    const fromIsLocal = await Tokens.findOne({
      where: { id: from },
      attributes: ["isLocalToken"],
    });

    console.log("From Token Local Status:", fromIsLocal.isLocalToken);
    const toIsLocal = await Tokens.findOne({
      where: { id: to },
      attributes: ["isLocalToken"],
    });

    console.log("To Token Local Status:", toIsLocal.isLocalToken);

    if (fromIsLocal.isLocalToken === true && toIsLocal.isLocalToken === true) {
      await transactionApprovalService(null, req.user, amount, from, to);

      return true;
    }

    if (fromIsLocal.isLocalToken === false && toIsLocal.isLocalToken === true) {
      const usdcId = await Tokens.findOne({
        where: { tokenName: "USDC" },
        attributes: ["id"],
      });
      const tx = await swap({
        amount,
        fromSymbol: from,
        toSymbol: usdcId.id,
        wallet,
        router,
        deadline,
      });

      console.log("Swap Transaction:", tx);

      console.log("TX AMOUNT OUT", tx.amountOut);

      if (tx) {
        await transactionApprovalService(
          null,
          req.user,
          tx.amountOut,
          usdcId.id,
          to,
        );
        return true;
      }
    }

    if (fromIsLocal.isLocalToken === true && toIsLocal.isLocalToken === false) {
      const usdcId = await Tokens.findOne({
        where: { tokenName: "USDC" },
        attributes: ["id"],
      });
      const tx = await transactionApprovalService(
        null,
        req.user,
        amount,
        from,
        usdcId.id,
      );

      if (tx) {
        const localSwap = await swap({
          amount,
          fromSymbol: usdcId.id,
          toSymbol: to,
          wallet,
          router,
          deadline,
        });

        if (localSwap) return true;
      }
    }

    const tx = await swap({
      amount,
      fromSymbol: from,
      toSymbol: to,
      wallet,
      router,
      deadline,
    });

    console.log("Swap Transaction:", tx);


    console.log("Transaction Receipt:", tx);
    return tx.hash;
  } catch (error) {
    throw new Error(`Swapping failed: ${error.message}`);
  }
};

async function buildPath(fromToken, toToken) {
  console.log(
    "Building path for:",
    fromToken.tokenName,
    "to",
    toToken.tokenName,
  );
  const weth = await Tokens.findOne({ where: { tokenName: "WETH" } });
  if (fromToken.isNative) {
    return [weth.tokenAddress, toToken.tokenAddress];
  }

  if (toToken.isNative) {
    return [fromToken.tokenAddress, weth.tokenAddress];
  }

  return [fromToken.tokenAddress, weth.tokenAddress, toToken.tokenAddress];
}

async function approveIfNeeded(token, owner, spender, amount, wallet) {
  if (token.isNative) return;

  const ERC20_ABI = [
    "function approve(address spender, uint256 amount) public returns (bool)",
    "function decimals() view returns (uint8)",
    "function balanceOf(address owner) view returns (uint256)",
  ];

  const erc20 = new ethers.Contract(token.tokenAddress, ERC20_ABI, wallet);

  const balance = await erc20.balanceOf(owner);
  if (balance < amount) {
    throw new Error(`Not enough ${token.tokenName} balance for approval`);
  }

  const tx = await erc20.approve(spender, amount);

  console.log(
    `Approving ${amount.toString()} of ${token.tokenName} for ${spender}:`,
    tx,
  );
  const tx_wait = await tx.wait();
  console.log(`Approval Transaction Receipt:`, tx_wait);

  return tx_wait;
}

async function swap({
  amount,
  fromSymbol,
  toSymbol,
  wallet,
  router,
  deadline,
}) {
  const fromToken = await Tokens.findOne({ where: { id: fromSymbol } });

  console.log("From Token:", fromToken);
  const toToken = await Tokens.findOne({ where: { id: toSymbol } });
  console.log("To Token:", toToken);

  if (!fromToken || !toToken) {
    throw new Error("Unsupported token");
  }

  const path = await buildPath(fromToken, toToken);

  console.log("Swap Path:", path);

  const amountIn = ethers.parseUnits(amount.toString(), fromToken.decimals);

  const amounts = await router.getAmountsOut(amountIn, path);

  const amountOut = amounts[amounts.length - 1];

  console.log("Amount In (raw):", amountIn.toString());
  console.log("Amount Out (raw):", amountOut.toString());

  // --------------------
  // ETH → TOKEN
  // --------------------
  if (fromToken.isNative) {
    const tx = await router.swapExactETHForTokens(
      0,
      path,
      wallet.address,
      deadline,
      { value: amountIn },
    );

    const receipt = await tx.wait();
    return {
      hash: receipt.hash,
      amountOut: ethers.formatUnits(amountOut, toToken.decimals),
    };
  }

  // approve ERC20
  const approval = await approveIfNeeded(
    fromToken,
    wallet.address,
    router.target,
    amountIn,
    wallet,
  );

  console.log("Approval Result:", approval);
  console.log("Path:", path);

  // --------------------
  // TOKEN → ETH
  // --------------------
  if (toToken.isNative) {
    const tx = await router.swapExactTokensForETH(
      amountIn,
      0,
      path,
      wallet.address,
      deadline,
    );

    const receipt = await tx.wait();
    return {
      hash: receipt.hash,
      amountOut: ethers.formatUnits(amountOut, 18),
    };
  }

  // --------------------
  // TOKEN → TOKEN
  // --------------------

  const tx = await router.swapExactTokensForTokens(
    amountIn,
    0,
    path,
    wallet.address,
    deadline,
  );

  const receipt = await tx.wait();
  return {
    hash: receipt.hash,
    amountOut: ethers.formatUnits(amountOut, toToken.decimals),
  };
}

export const tokenEquivalentAmount = async (req) => {
  try {
    const { amount, from, to } = req.query;

    if (!amount || !from || !to) {
      throw new Error("amount, from, and to tokens are required");
    }

    // const inputAmount = Number(amount);

    // Fetch tokens
    const fromToken = await Tokens.findOne({ where: { id: from } });
    const toToken = await Tokens.findOne({ where: { id: to } });

    const inputAmount = ethers.parseUnits(
      amount.toString(),
      fromToken.isNative ? 18 : fromToken.decimals,
    );

    console.log("From Token:", inputAmount);

    if (!fromToken || !toToken) {
      throw new Error("Unsupported token");
    }

    if (
      (fromToken.isLocalToken && toToken.isLocalToken) ||
      (fromToken.tokenName === "USDC" && toToken.isLocalToken) ||
      (fromToken.isLocalToken && toToken.tokenName === "USDC")
    ) {
      return {
        from: fromToken.tokenName,
        to: toToken.tokenName,
        inputAmount: amount.toString(),
        outputAmount: amount.toString(),
      };
    }

    // Fetch WETH
    const weth = await Tokens.findOne({ where: { tokenName: "WETH" } });
    const usdc = await Tokens.findOne({ where: { tokenName: "USDC" } });

    if (!weth) {
      throw new Error("WETH not found in registry");
    }

    // Uniswap V2 Router
    const routerAddress = process.env.UNI_SWAP_ROUTER_ADDRESS;
    const ROUTER_ABI = [
      "function getAmountsOut(uint amountIn, address[] calldata path) view returns (uint[] memory amounts)",
    ];

    const router = new ethers.Contract(routerAddress, ROUTER_ABI, ethProvider);

    // Resolve actual addresses (ETH → WETH)
    let fromAddress = fromToken.isNative
      ? weth.tokenAddress
      : fromToken.tokenAddress;
    let toAddress = toToken.isNative ? weth.tokenAddress : toToken.tokenAddress;

    console.log("Initial From Address:", fromAddress);
    console.log("Initial To Address:", toAddress);

    console.log(
      "From Token Local Status:",
      fromToken.isLocalToken,
      "To Token Local Status:",
      toToken.isLocalToken,
    );

    if (fromToken.isLocalToken === true && toToken.isLocalToken === false) {
      fromAddress = usdc.tokenAddress;
    }
    if (fromToken.isLocalToken === false && toToken.isLocalToken === false) {
      toAddress = usdc.tokenAddress;
    }

    console.log("Initial From Address:", fromAddress);
    console.log("Initial To Address:", toAddress);

    // Build path
    const path = _buildPath(fromAddress, toAddress, weth.tokenAddress);

    console.log("Calculated Path:", path);

    // Parse input amount
    const amountIn = inputAmount;

    console.log("---- RATE CALCULATION ----");
    console.log("From:", fromToken.tokenName);
    console.log("To:", toToken.tokenName);
    console.log("Input:", inputAmount);
    console.log("Parsed Input Amount (raw):", amountIn.toString());
    console.log("Path:", path);

    // Get amounts out
    const amountsOut = await router.getAmountsOut(amountIn, path);

    // Final output
    const rawOutput = amountsOut[amountsOut.length - 1];

    console.log("Raw Output Amount:", rawOutput.toString());

    const outputAmount = ethers.formatUnits(
      rawOutput,
      toToken.isNative ? 18 : toToken.decimals,
    );

    return {
      from: fromToken.tokenName,
      to: toToken.tokenName,
      inputAmount: amount,
      outputAmount,
    };
  } catch (err) {
    console.error("tokenEquivalentAmount error:", err.message);
    throw err;
  }
};

/**
 * Build optimal Uniswap V2 path
 */
function _buildPath(from, to, weth) {
  // Direct WETH pair
  if (from === weth || to === weth) {
    return [from, to];
  }

  // Route through WETH
  return [from, weth, to];
}
