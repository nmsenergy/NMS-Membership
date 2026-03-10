CREATE TABLE `manual_bonus_allocations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`memberId` int NOT NULL,
	`type` enum('GUBEN','BONUS') NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`reason` text NOT NULL,
	`allocatedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `manual_bonus_allocations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `product_calculation_base` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`zone` enum('VIP','AGENT','BOTH') NOT NULL,
	`gubenBase` decimal(12,2) NOT NULL,
	`bonusBase` decimal(12,2) NOT NULL,
	`gubenRate` decimal(5,2) NOT NULL DEFAULT '15.00',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `product_calculation_base_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `upgrade_conditions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`rank` enum('VIP','M_AGENT','SM','GM','CEO') NOT NULL,
	`requiredDirectVips` int NOT NULL DEFAULT 0,
	`requiredDirectMAgents` int NOT NULL DEFAULT 0,
	`requiredVipPackages` int NOT NULL DEFAULT 0,
	`requiredTeamSales` decimal(12,2) NOT NULL DEFAULT '0.00',
	`carAllowanceMonthlyTeamSales` decimal(12,2) NOT NULL DEFAULT '18000.00',
	`carAllowanceSubMemberCap` decimal(12,2) NOT NULL DEFAULT '6000.00',
	`carAllowancePerQualifiedMember` decimal(12,2) NOT NULL DEFAULT '200.00',
	`travelRewardVipCount` int NOT NULL DEFAULT 12,
	`travelRewardAssessmentAmount` decimal(12,2) NOT NULL DEFAULT '2800.00',
	`dividendMinAnnualIncome` decimal(12,2) NOT NULL DEFAULT '0.00',
	`dividendRate` decimal(5,2) NOT NULL DEFAULT '0.00',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `upgrade_conditions_id` PRIMARY KEY(`id`),
	CONSTRAINT `upgrade_conditions_rank_unique` UNIQUE(`rank`)
);
