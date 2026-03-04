CREATE TABLE `announcements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`isPublished` boolean NOT NULL DEFAULT false,
	`publishedAt` timestamp,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `announcements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bonus_ledger` (
	`id` int AUTO_INCREMENT NOT NULL,
	`memberId` int NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`type` enum('ORG_BONUS','GRATITUDE_BONUS','YEAR_END_DIVIDEND','CAR_ALLOWANCE','TRAVEL_REWARD','SHAREHOLDER_DIVIDEND','WITHDRAWAL','ADMIN_ADJUST') NOT NULL,
	`orderId` int,
	`description` text,
	`periodMonth` varchar(7),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bonus_ledger_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `guben_ledger` (
	`id` int AUTO_INCREMENT NOT NULL,
	`memberId` int NOT NULL,
	`amount` int NOT NULL,
	`type` enum('PURCHASE_EARN','REFERRAL_EARN','TOPUP','BONUS_CONVERT','REDEEM','EXPIRE','ADMIN_ADJUST') NOT NULL,
	`orderId` int,
	`description` text,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `guben_ledger_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`referralCode` varchar(32) NOT NULL,
	`referrerId` int,
	`rank` enum('VIP','M_AGENT','SM','GM','CEO') NOT NULL DEFAULT 'VIP',
	`phone` varchar(32),
	`birthday` varchar(10),
	`birthdayVerified` boolean NOT NULL DEFAULT false,
	`isActive` boolean NOT NULL DEFAULT true,
	`gubenBalance` int NOT NULL DEFAULT 0,
	`bonusBalance` decimal(12,2) NOT NULL DEFAULT '0.00',
	`vipPackagesBought` int NOT NULL DEFAULT 0,
	`directVipReferrals` int NOT NULL DEFAULT 0,
	`directMAgentReferrals` int NOT NULL DEFAULT 0,
	`switchedToMemberId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `members_id` PRIMARY KEY(`id`),
	CONSTRAINT `members_referralCode_unique` UNIQUE(`referralCode`)
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`productId` int NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`unitPrice` decimal(10,2) NOT NULL,
	`baseValue` decimal(10,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderNo` varchar(64) NOT NULL,
	`memberId` int NOT NULL,
	`orderType` enum('VIP_ORDER','AGENT_ORDER','BIRTHDAY_ORDER','REDEMPTION_ORDER') NOT NULL,
	`status` enum('PENDING_PAYMENT','PENDING_VERIFICATION','PROCESSING','SHIPPED','DELIVERED','CANCELLED') NOT NULL DEFAULT 'PENDING_PAYMENT',
	`paymentMethod` enum('VIP_CODE','ONLINE_TRANSFER','OFFLINE_PAYMENT','GUBEN_POINTS'),
	`paymentCode` varchar(64),
	`paymentProofUrl` text,
	`totalAmount` decimal(10,2) NOT NULL,
	`gubenUsed` int NOT NULL DEFAULT 0,
	`notes` text,
	`shippingAddress` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_orderNo_unique` UNIQUE(`orderNo`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`imageUrl` text,
	`price` decimal(10,2) NOT NULL,
	`baseValue` decimal(10,2) NOT NULL,
	`agentPrice` decimal(10,2),
	`category` enum('VIP_PACKAGE','VIP_BENEFIT_ITEM','BIRTHDAY_ITEM','REDEMPTION_ITEM','AGENT_PACKAGE','AGENT_ITEM','ASSESSMENT_ITEM') NOT NULL,
	`zone` enum('VIP','AGENT','BOTH') NOT NULL DEFAULT 'VIP',
	`isActive` boolean NOT NULL DEFAULT true,
	`birthdayEligible` boolean NOT NULL DEFAULT false,
	`birthdayMaxQty` int NOT NULL DEFAULT 1,
	`vipPackageCount` int NOT NULL DEFAULT 0,
	`stock` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reward_visibility` (
	`id` int AUTO_INCREMENT NOT NULL,
	`memberId` int NOT NULL,
	`showCarAllowance` boolean NOT NULL DEFAULT true,
	`showTravelReward` boolean NOT NULL DEFAULT true,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reward_visibility_id` PRIMARY KEY(`id`),
	CONSTRAINT `reward_visibility_memberId_unique` UNIQUE(`memberId`)
);
--> statement-breakpoint
CREATE TABLE `system_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(128) NOT NULL,
	`value` text NOT NULL,
	`description` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `system_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `system_settings_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `topups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`memberId` int NOT NULL,
	`type` enum('CASH','BONUS_CONVERT') NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`gubenPoints` int NOT NULL,
	`paymentProofUrl` text,
	`status` enum('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
	`adminNote` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `topups_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vip_payment_codes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(64) NOT NULL,
	`agentOrderId` int NOT NULL,
	`productId` int NOT NULL,
	`issuedToMemberId` int NOT NULL,
	`usedByMemberId` int,
	`isUsed` boolean NOT NULL DEFAULT false,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `vip_payment_codes_id` PRIMARY KEY(`id`),
	CONSTRAINT `vip_payment_codes_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `withdrawals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`memberId` int NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`bankName` varchar(128),
	`bankAccount` varchar(64),
	`accountHolder` varchar(128),
	`status` enum('PENDING','APPROVED','REJECTED','PAID') NOT NULL DEFAULT 'PENDING',
	`adminNote` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `withdrawals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','regional_manager') NOT NULL DEFAULT 'user';