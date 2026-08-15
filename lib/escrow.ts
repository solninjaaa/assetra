export const ESCROW_ADDRESS =
  "0xF85F9AA618A4500e24E9C59931E839F72649053d" as const;

export const USDC_ADDRESS =
  "0x3600000000000000000000000000000000000000" as const;

export const ESCROW_ABI = [
  {
    type: "function",
    name: "createEscrow",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "seller",
        type: "address",
      },
      {
        name: "token",
        type: "address",
      },
      {
        name: "amount",
        type: "uint256",
      },
      {
        name: "deadline",
        type: "uint256",
      },
    ],
    outputs: [
      {
        name: "escrowId",
        type: "uint256",
      },
    ],
  },
  {
    type: "function",
    name: "fundEscrow",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "escrowId",
        type: "uint256",
      },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "releasePayment",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "escrowId",
        type: "uint256",
      },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "refund",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "escrowId",
        type: "uint256",
      },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "getEscrow",
    stateMutability: "view",
    inputs: [
      {
        name: "escrowId",
        type: "uint256",
      },
    ],
    outputs: [
      {
        name: "buyer",
        type: "address",
      },
      {
        name: "seller",
        type: "address",
      },
      {
        name: "token",
        type: "address",
      },
      {
        name: "amount",
        type: "uint256",
      },
      {
        name: "deadline",
        type: "uint256",
      },
      {
        name: "status",
        type: "uint8",
      },
    ],
  },
  {
    type: "function",
    name: "escrowCount",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
      },
    ],
  },
] as const;

export const USDC_ABI = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "spender",
        type: "address",
      },
      {
        name: "amount",
        type: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bool",
      },
    ],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      {
        name: "owner",
        type: "address",
      },
      {
        name: "spender",
        type: "address",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
      },
    ],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [
      {
        name: "account",
        type: "address",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
      },
    ],
  },
] as const;