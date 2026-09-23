// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./interfaces/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract CrowdFund is ReentrancyGuard {

    event Launch(
        uint256 id,
        address indexed creator,
        uint256 goal,
        uint32 startAt,
        uint32 endAt,
        string title,
        string description
    );
    event Cancel(uint256 id);
    event Pledge(uint256 indexed id, address indexed caller, uint256 amount);
    event Unpledge(uint256 indexed id, address indexed caller, uint256 amount);
    event Claim(uint256 id);
    event Refund(uint256 id, address indexed caller, uint256 amount);

    struct Campaign {
        address creator;
        uint256 goal;
        uint256 pledged;
        uint32 startAt;
        uint32 endAt;
        bool claimed;
        string title;
        string description;
    }

    IERC20 public immutable token;
    uint256 public count;
    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => mapping(address => uint)) public pledgedAmount;

    constructor(address _token) {
        token = IERC20(_token);
    }

    function launch(
        uint256 _goal,
        uint32 _startAt,
        uint32 _endAt,
        string calldata _title,
        string calldata _description
    ) external {
        require(_startAt >= block.timestamp, "start at < now");
        require(_endAt >= _startAt, "end at < start at");
        require(_endAt <= block.timestamp + 90 days, "end at > max duration");
        require(_goal > 0, "goal = 0");
        require(bytes(_title).length > 0, "title empty");
        require(bytes(_title).length <= 80, "title too long");
        require(bytes(_description).length > 0, "description empty");
        require(bytes(_description).length <= 500, "description too long");

        count += 1;
        campaigns[count] = Campaign({
            creator: msg.sender,
            goal: _goal,
            pledged: 0,
            startAt: _startAt,
            endAt: _endAt,
            claimed: false,
            title: _title,
            description: _description
        });

        emit Launch(count, msg.sender, _goal, _startAt, _endAt, _title, _description);
    }

    function cancel(uint256 _id) external {
        Campaign memory campaign = campaigns[_id];
        require(campaign.creator == msg.sender, "not creator");
        require(block.timestamp < campaign.startAt, "already started");

        delete campaigns[_id];

        emit Cancel(_id);
    }

    function pledge(uint256 _id, uint256 _amount) external nonReentrant {
        Campaign storage campaign = campaigns[_id];
        require(block.timestamp >= campaign.startAt, "not started");
        require(block.timestamp <= campaign.endAt, "ended");

        campaign.pledged += _amount;
        pledgedAmount[_id][msg.sender] += _amount;
        require(token.transferFrom(msg.sender, address(this), _amount), "transfer failed");

        emit Pledge(_id, msg.sender, _amount);
    }

    function unpledge(uint256 _id, uint256 _amount) external nonReentrant {
        Campaign storage campaign = campaigns[_id];
        require(block.timestamp <= campaign.endAt, "ended");
        require(pledgedAmount[_id][msg.sender] >= _amount, "insufficient pledge");

        campaign.pledged -= _amount;
        pledgedAmount[_id][msg.sender] -= _amount;
        require(token.transfer(msg.sender, _amount), "transfer failed");

        emit Unpledge(_id, msg.sender, _amount);
    }

    function claim(uint256 _id) external nonReentrant {
        Campaign storage campaign = campaigns[_id];
        require(campaign.creator == msg.sender, "not creator");
        require(block.timestamp > campaign.endAt, "not ended");
        require(campaign.pledged >= campaign.goal, "pledged < goal");
        require(!campaign.claimed, "claimed");

        campaign.claimed = true;
        require(token.transfer(campaign.creator, campaign.pledged), "transfer failed");

        emit Claim(_id);
    }

    function refund(uint256 _id) external nonReentrant {
        Campaign memory campaign = campaigns[_id];
        require(block.timestamp > campaign.endAt, "not ended");
        require(campaign.pledged < campaign.goal, "pledged >= goal");

        uint256 bal = pledgedAmount[_id][msg.sender];
        pledgedAmount[_id][msg.sender] = 0;
        require(token.transfer(msg.sender, bal), "transfer failed");

        emit Refund(_id, msg.sender, bal);
    }
}
