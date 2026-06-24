CREATE TABLE `feature_visibility` (
	`id` int AUTO_INCREMENT NOT NULL,
	`featureKey` varchar(64) NOT NULL,
	`isEnabled` boolean NOT NULL DEFAULT true,
	`allowedRanks` json NOT NULL DEFAULT ('[]'),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `feature_visibility_id` PRIMARY KEY(`id`),
	CONSTRAINT `feature_visibility_featureKey_unique` UNIQUE(`featureKey`)
);
