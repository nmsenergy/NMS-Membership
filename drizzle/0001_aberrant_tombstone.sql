CREATE TABLE `regional_manager_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`allowedLocations` varchar(255) NOT NULL,
	`description` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `regional_manager_config_id` PRIMARY KEY(`id`),
	CONSTRAINT `regional_manager_config_userId_unique` UNIQUE(`userId`)
);
