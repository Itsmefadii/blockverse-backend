import { ethers } from "ethers";
import { ethProvider } from "../../../utils/utils.js";
import { User } from "../../auth/models/user.model.js";

export const swappingService = async (req) => {
  try {
    const { amount, from, to } = req.body;

    const privateKey = await User.findOne({
      where: { id: req.user.id },
      attributes: ["privateKey"],
    });

    const wallet = new ethers.Wallet(privateKey.privateKey, ethProvider);

    const routerAddress = process.env.UNI_SWAP_ROUTER_ADDRESS;
    const WETH_Address = process.env.WETH_Address;
    const USDC_Address = process.env.USDC_Address;

    const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

    const ROUTER_ABI = [
      "function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)",
      "function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
    ];
    const ERC20_ABI = [
      "function approve(address spender, uint256 amount) public returns (bool)",
      "function decimals() view returns (uint8)",
      "function balanceOf(address owner) view returns (uint256)",
    ];

    const router = new ethers.Contract(routerAddress, ROUTER_ABI, wallet);

    let swapping;

    if (from === "USDC" && to === "ETH") {
      swapping = await USDC_TO_ETH(
        amount,
        routerAddress,
        wallet,
        router,
        ERC20_ABI,
        WETH_Address,
        USDC_Address,
        deadline,
      );
    }
    if (from === "ETH" && to === "USDC") {
      const ethBalance = await ethProvider.getBalance(wallet.address);

      const ethBalanceReadable = ethers.formatEther(ethBalance);

      console.log("ETH Balance:", ethBalanceReadable);

      if (amount > ethBalanceReadable) {
        throw new Error("Not enough eth in your wallet");
      }
      swapping = await ETH_TO_USDC(
        amount,
        routerAddress,
        wallet,
        router,
        ERC20_ABI,
        WETH_Address,
        USDC_Address,
        deadline,
      );
    }
    return swapping.hash;
  } catch (error) {
    throw new Error(error.message);
  }
};

async function USDC_TO_ETH(
  usdcAmount,
  routerAddress,
  wallet,
  router,
  ERC20_ABI,
  WETH_Address,
  USDC_Address,
  deadline,
) {
  const path = [USDC_Address, WETH_Address];

  const amountIn = ethers.parseUnits(usdcAmount.toString(), 6);

  console.log("Aproving USDC...........");

  const usdcContract = new ethers.Contract(USDC_Address, ERC20_ABI, wallet);

  const usdcBalance = await usdcContract.balanceOf(wallet.address);
  const usdcReadable = ethers.formatUnits(usdcBalance, 6);

  console.log("USDC Balance:", usdcReadable);

  if (usdcAmount > usdcReadable) {
    throw new Error("Not enough USDC in your wallet");
  }

  console.log("Router Address: ", routerAddress);
  console.log("USDC Address: ", USDC_Address);

  const approveTx = await usdcContract.approve(routerAddress, amountIn);

  if (!approveTx) {
    throw new Error(`USDC Not Approved`);
  }
  const approveWait = await approveTx.wait();

  console.log("USDC Approved");

  if (!approveWait) {
    throw new Error("Waiting for USDC Approval Failed");
  }

  const tx = await router.swapExactTokensForETH(
    amountIn,
    0,
    path,
    wallet.address,
    deadline,
  );

  console.log("TX: ", tx);

  const txWait = await tx.wait();

  return txWait;
}

async function ETH_TO_USDC(
  ethAmount,
  routerAddress,
  wallet,
  router,
  ERC20_ABI,
  WETH_Address,
  USDC_Address,
  deadline,
) {
  const path = [WETH_Address, USDC_Address];

  const amountIn = ethers.parseEther(ethAmount.toString());

  console.log("Aproving ETH...........");

  const ethContract = new ethers.Contract(WETH_Address, ERC20_ABI, wallet);
  console.log("Router Address: ", routerAddress);
  console.log("WETH Address: ", WETH_Address);

  const approveTx = await ethContract.approve(routerAddress, amountIn);

  if (!approveTx) {
    throw new Error(`ETH Not Approved`);
  }

  const approveWait = await approveTx.wait();

  if (!approveWait) {
    throw new Error("Waiting for USDC Approval Failed");
  }

  const tx = await router.swapExactETHForTokens(
    0,
    path,
    wallet.address,
    deadline,
    { value: ethers.parseEther(ethAmount.toString()) },
  );

  console.log("TX: ", tx);

  const txWait = await tx.wait();

  return txWait;
}

export const tokenEquivalentAmount = async (req) => {
  try {
    const { amount, token } = req.query;

    if (!amount || !token) {
      throw new Error("amount and token required");
    }

    const normalizedToken = token.toLowerCase();

    if (normalizedToken !== "usdc" && normalizedToken !== "eth") {
      throw new Error("Only USDC and ETH supported on testnet");
    }

    // Chainlink ETH / USD feed (Sepolia)
    const ETH_USD_FEED = "0x694AA1769357215DE4FAC081bf1f309aDC325306";

    const aggregatorAbi = [
      "function latestRoundData() view returns (uint80, int256, uint256, uint256, uint80)",
      "function decimals() view returns (uint8)",
    ];

    const priceFeed = new ethers.Contract(
      ETH_USD_FEED,
      aggregatorAbi,
      ethProvider,
    );

    // Fetch ETH/USD price
    const [, answer] = await priceFeed.latestRoundData();
    const decimals = await priceFeed.decimals();

    // BigInt → Number (safe)
    const ethUsdPrice = Number(ethers.formatUnits(answer, decimals));

    const inputAmount = Number(amount);

    if (inputAmount <= 0) {
      throw new Error("amount must be greater than 0");
    }

    // -------------------------------
    // USDC → ETH
    // -------------------------------
    if (normalizedToken === "usdc") {
      // 1 USDC ≈ 1 USD
      const ethEquivalent = inputAmount / ethUsdPrice;

      return {
        from: "USDC",
        to: "ETH",
        inputAmount,
        outputAmount: ethEquivalent,
      };
    }

    // -------------------------------
    // ETH → USDC
    // -------------------------------
    if (normalizedToken === "eth") {
      const usdcEquivalent = inputAmount * ethUsdPrice;

      return {
        from: "ETH",
        to: "USDC",
        inputAmount,
        outputAmount: usdcEquivalent,
      };
    }
  } catch (err) {
    console.error(err);
    throw err; // let controller handle response
  }
};
