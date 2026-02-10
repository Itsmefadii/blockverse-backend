import { ethProvider } from "../../../utils/utils.js";
import { User } from "../../auth/models/user.model.js";
import { TokenRegistry } from "../../systemConfig/models/TokenRegistry.model.js";
import { ethers } from "ethers";

export const SwappingService = async (req) => {
  try {
    const { amount, from, to } = req.body;

    const ROUTER_ABI = [
      "function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)",
      "function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
      "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
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

    const tx = await swap({
      amount,
      fromSymbol: from,
      toSymbol: to,
      wallet,
      router,
      deadline,
    });

    console.log("Swap Transaction:", tx)

    const receipt = await tx.wait();

    console.log("Transaction Receipt:", receipt);
    return receipt.hash;
  } catch (error) {
    throw new Error(`Swapping failed: ${error.message}`);
  }
};

async function buildPath(fromToken, toToken) {

    console.log("Building path for:", fromToken.symbol, "to", toToken.symbol);
  const weth = await TokenRegistry.findOne({ where: { symbol: "WETH" } });
  if (fromToken.isNative) {
    return [weth.address, toToken.address];
  }

  if (toToken.isNative) {
    return [fromToken.address, weth.address];
  }

  return [fromToken.address, weth.address, toToken.address];
}

async function approveIfNeeded(token, owner, spender, amount, wallet) {
  if (token.isNative) return;

  const ERC20_ABI = [
    "function approve(address spender, uint256 amount) public returns (bool)",
    "function decimals() view returns (uint8)",
    "function balanceOf(address owner) view returns (uint256)",
  ];

  const erc20 = new ethers.Contract(token.address, ERC20_ABI, wallet);

  const balance = await erc20.balanceOf(owner);
  if (balance < amount) {
    throw new Error(`Not enough ${token.symbol}`);
  }

  const tx = await erc20.approve(spender, amount);

  console.log(`Approving ${amount.toString()} of ${token.symbol} for ${spender}:`, tx);
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


  const fromToken = await TokenRegistry.findOne({ where: { id: fromSymbol } });

  console.log("From Token:", fromToken);
  const toToken = await TokenRegistry.findOne({ where: { id: toSymbol } });
  console.log("To Token:", toToken);

  if (!fromToken || !toToken) {
    throw new Error("Unsupported token");
  }

  const path = await buildPath(fromToken, toToken);

  console.log("Swap Path:", path);

  const amountIn = ethers.parseUnits(amount.toString(), fromToken.decimals);

  console.log("Amount In (raw):", amountIn.toString());

  // --------------------
  // ETH → TOKEN
  // --------------------
  if (fromToken.isNative) {
    return await router.swapExactETHForTokens(
      0,
      path,
      wallet.address,
      deadline,
      { value: amountIn },
    );
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
    return await router.swapExactTokensForETH(
      amountIn,
      0,
      path,
      wallet.address,
      deadline,
    );
  }

  // --------------------
  // TOKEN → TOKEN
  // --------------------
  return await router.swapExactTokensForTokens(
    amountIn,
    0,
    path,
    wallet.address,
    deadline,
  );
}

export const tokenEquivalentAmount = async (req) => {
  try {
    const { amount, from, to } = req.query;

    if (!amount || !from || !to) {
      throw new Error("amount, from, and to tokens are required");
    }

    const inputAmount = Number(amount);
    if (isNaN(inputAmount) || inputAmount <= 0) {
      throw new Error("Amount must be greater than 0");
    }

    // Fetch tokens
    const fromToken = await TokenRegistry.findOne({ where: { id: from } });
    const toToken = await TokenRegistry.findOne({ where: { id: to } });

    if (!fromToken || !toToken) {
      throw new Error("Unsupported token");
    }

    // Fetch WETH
    const weth = await TokenRegistry.findOne({ where: { symbol: "WETH" } });
    if (!weth) {
      throw new Error("WETH not found in registry");
    }

    // Uniswap V2 Router
    const routerAddress = process.env.UNI_SWAP_ROUTER_ADDRESS;
    const ROUTER_ABI = [
      "function getAmountsOut(uint amountIn, address[] calldata path) view returns (uint[] memory amounts)"
    ];

    const router = new ethers.Contract(routerAddress, ROUTER_ABI, ethProvider);

    // Resolve actual addresses (ETH → WETH)
    const fromAddress = fromToken.isNative ? weth.address : fromToken.address;
    const toAddress = toToken.isNative ? weth.address : toToken.address;

    // Build path
    const path = _buildPath(fromAddress, toAddress, weth.address);

    // Parse input amount
    const amountIn = ethers.parseUnits(
      inputAmount.toString(),
      fromToken.isNative ? 18 : fromToken.decimals
    );

    console.log("---- RATE CALCULATION ----");
    console.log("From:", fromToken.symbol);
    console.log("To:", toToken.symbol);
    console.log("Input:", inputAmount);
    console.log("Path:", path);

    // Get amounts out
    const amountsOut = await router.getAmountsOut(amountIn, path);

    // Final output
    const rawOutput = amountsOut[amountsOut.length - 1];

    const outputAmount = ethers.formatUnits(
      rawOutput,
      toToken.isNative ? 18 : toToken.decimals
    );

    return {
      from: fromToken.symbol,
      to: toToken.symbol,
      inputAmount: inputAmount.toString(),
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