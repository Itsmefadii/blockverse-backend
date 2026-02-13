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

    const fromToken = await Tokens.findOne({ where: { id: from } });
    const toToken   = await Tokens.findOne({ where: { id: to } });

    if (!fromToken || !toToken) {
      throw new Error("Unsupported token");
    }

    // 1️⃣ LOCAL ↔ LOCAL OR LOCAL ↔ USDC = 1:1
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

    // Fetch WETH & USDC from DB
    const weth = await Tokens.findOne({ where: { tokenName: "WETH" } });
    const usdc = await Tokens.findOne({ where: { tokenName: "USDC" } });

    if (!weth || !usdc) {
      throw new Error("WETH / USDC not found in registry");
    }

    // Uniswap Router
    const ROUTER_ABI = [
      "function getAmountsOut(uint amountIn, address[] calldata path) view returns (uint[] memory amounts)"
    ];

    const router = new ethers.Contract(
      process.env.UNI_SWAP_ROUTER_ADDRESS,
      ROUTER_ABI,
      ethProvider
    );

    // 2️⃣ RESOLVE EFFECTIVE TOKEN (THIS IS THE MAGIC)
    const fromEffective = resolveEffectiveToken(fromToken, usdc, weth);
    const toEffective   = resolveEffectiveToken(toToken, usdc, weth);

    // 3️⃣ PARSE INPUT USING EFFECTIVE DECIMALS
    const amountIn = ethers.parseUnits(
      amount.toString(),
      fromEffective.decimals
    );

    // 4️⃣ BUILD PATH
    const path = _buildPath(
      fromEffective.address,
      toEffective.address,
      weth.tokenAddress
    );

    console.log("------ RATE CALCULATION ------");
    console.log("From:", fromToken.tokenName);
    console.log("To:", toToken.tokenName);
    console.log("Router sees From:", fromEffective.address);
    console.log("Router sees To:", toEffective.address);
    console.log("Path:", path);
    console.log("Amount In:", amountIn.toString());

    // 5️⃣ GET OUTPUT
    const amountsOut = await router.getAmountsOut(amountIn, path);

    const rawOutput = amountsOut[amountsOut.length - 1];

    const outputAmount = ethers.formatUnits(
      rawOutput,
      toEffective.decimals
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


function resolveEffectiveToken(token, usdc, weth) {

  // Native ETH → WETH
  if (token.isNative) {
    return {
      address: weth.tokenAddress,
      decimals: 18
    };
  }

  // LOCAL TOKEN → USDC
  if (token.isLocalToken) {
    return {
      address: usdc.tokenAddress,
      decimals: 6
    };
  }

  // NORMAL ERC20
  return {
    address: token.tokenAddress,
    decimals: token.decimals
  };
}

function _buildPath(from, to, weth) {
  // Direct WETH pair
  if (from === weth || to === weth) {
    return [from, to];
  }

  // Route through WETH
  return [from, weth, to];
}
