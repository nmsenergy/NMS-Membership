CREATE TABLE `shipping_locations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(50) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`displayOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shipping_locations_id` PRIMARY KEY(`id`),
	CONSTRAINT `shipping_locations_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
ALTER TABLE `orders` MODIFY COLUMN `shippingLocation` enum('KK_STOCKIST','PUCHONG_HQ');