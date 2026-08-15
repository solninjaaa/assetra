// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract AssetraEscrow is ReentrancyGuard {
    enum Status {
        Created,
        Funded,
        Released,
        Refunded
    }

    struct Escrow {
        address buyer;
        address seller;
        address token;
        uint256 amount;
        uint256 deadline;
        Status status;
    }

    uint256 public escrowCount;

    mapping(uint256 => Escrow) public escrows;

    event EscrowCreated(
        uint256 indexed escrowId,
        address indexed buyer,
        address indexed seller,
        address token,
        uint256 amount,
        uint256 deadline
    );

    event EscrowFunded(uint256 indexed escrowId);
    event PaymentReleased(uint256 indexed escrowId);
    event PaymentRefunded(uint256 indexed escrowId);

    function createEscrow(
        address seller,
        address token,
        uint256 amount,
        uint256 deadline
    ) external returns (uint256 escrowId) {
        require(seller != address(0), "Invalid seller");
        require(token != address(0), "Invalid token");
        require(amount > 0, "Amount must be greater than zero");
        require(deadline > block.timestamp, "Invalid deadline");

        escrowId = escrowCount++;

        escrows[escrowId] = Escrow({
            buyer: msg.sender,
            seller: seller,
            token: token,
            amount: amount,
            deadline: deadline,
            status: Status.Created
        });

        emit EscrowCreated(
            escrowId,
            msg.sender,
            seller,
            token,
            amount,
            deadline
        );
    }

    function fundEscrow(uint256 escrowId) external nonReentrant {
        Escrow storage escrow = escrows[escrowId];

        require(escrow.buyer == msg.sender, "Only buyer");
        require(escrow.status == Status.Created, "Invalid status");

        bool success = IERC20(escrow.token).transferFrom(
            msg.sender,
            address(this),
            escrow.amount
        );

        require(success, "Transfer failed");

        escrow.status = Status.Funded;

        emit EscrowFunded(escrowId);
    }

    function releasePayment(uint256 escrowId) external nonReentrant {
        Escrow storage escrow = escrows[escrowId];

        require(escrow.buyer == msg.sender, "Only buyer");
        require(escrow.status == Status.Funded, "Not funded");

        escrow.status = Status.Released;

        bool success = IERC20(escrow.token).transfer(
            escrow.seller,
            escrow.amount
        );

        require(success, "Transfer failed");

        emit PaymentReleased(escrowId);
    }

    function refund(uint256 escrowId) external nonReentrant {
        Escrow storage escrow = escrows[escrowId];

        require(escrow.buyer == msg.sender, "Only buyer");
        require(escrow.status == Status.Funded, "Not funded");
        require(block.timestamp >= escrow.deadline, "Deadline not reached");

        escrow.status = Status.Refunded;

        bool success = IERC20(escrow.token).transfer(
            escrow.buyer,
            escrow.amount
        );

        require(success, "Transfer failed");

        emit PaymentRefunded(escrowId);
    }

    function getEscrow(
        uint256 escrowId
    ) external view returns (Escrow memory) {
        return escrows[escrowId];
    }
}