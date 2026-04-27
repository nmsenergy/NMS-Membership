CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`memberId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`type` enum('ANNOUNCEMENT','BONUS','ORDER','SYSTEM','REMINDER') NOT NULL DEFAULT 'ANNOUNCEMENT',
	`isRead` boolean NOT NULL DEFAULT false,
	`actionUrl` varchar(512),
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
