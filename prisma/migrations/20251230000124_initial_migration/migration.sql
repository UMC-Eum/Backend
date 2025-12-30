CREATE TABLE `User_personality` (
                                    `id` bigint NOT NULL,
                                    `user_id` bigint NOT NULL,
                                    `personality_id` bigint NOT NULL,
                                    `deleted_at` datetime(6) NULL,
                                    `updated_at` datetime(6) NULL,
                                    `created_at` datetime(6) NOT NULL,
                                    `vibe_vector` vector NOT NULL
);

CREATE TABLE `Personality` (
                               `id` bigint NOT NULL,
                               `body` varchar(50) NOT NULL COMMENT 'unique',
                               UNIQUE (`body`)
);

CREATE TABLE `User_ideal_personality` (
                                          `id` bigint NOT NULL,
                                          `user_id` bigint NOT NULL,
                                          `personality_id` bigint NOT NULL,
                                          `deleted_at` datetime(6) NULL,
                                          `updated_at` datetime(6) NULL,
                                          `created_at` datetime(6) NOT NULL,
                                          `vibe_vector` vector NOT NULL
);

CREATE TABLE `Policy` (
                          `id` bigint NOT NULL,
                          `body` varchar(255) NOT NULL
);

CREATE TABLE `User_interest` (
                                 `id` bigint NOT NULL,
                                 `interest_id` bigint NOT NULL,
                                 `user_id` bigint NOT NULL,
                                 `deleted_at` datetime(6) NULL,
                                 `updated_at` datetime(6) NULL,
                                 `created_at` datetime(6) NOT NULL,
                                 `vibe_vector` vector NOT NULL
);

CREATE TABLE `Interest` (
                            `id` bigint NOT NULL,
                            `body` varchar(50) NOT NULL COMMENT 'unique',
                            UNIQUE (`body`)
);

CREATE TABLE `address` (
                           `code` char(10) NOT NULL,
                           `sido_code` char(2) NOT NULL,
                           `sigungu_code` char(3) NOT NULL,
                           `emd_code` char(3) NOT NULL,
                           `ri_code` char(2) NOT NULL,
                           `full_name` varchar(200) NOT NULL,
                           `sido_name` varchar(50) NOT NULL,
                           `sigungu_name` varchar(50) NOT NULL,
                           `emd_name` varchar(50) NOT NULL,
                           `ri_name` varchar(50) NULL,
                           `level` ENUM(
        'SIDO',
        'SIGUNGU',
        'EMD',
        'RI'
    ) NOT NULL DEFAULT 'SIGUNGU' COMMENT 'DEFAULT = SIGUNGU',
                           `parent_code` char(10) NOT NULL
);

CREATE TABLE `Heart` (
                         `id` bigint NOT NULL,
                         `sent_by_id` bigint NOT NULL COMMENT 'unique',
                         `sent_to_id` bigint NOT NULL COMMENT 'unique',
                         `created_at` datetime(6) NOT NULL,
                         `deleted_at` datetime(6) NULL,
                         `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
                         UNIQUE (`sent_by_id`, `sent_to_id`)
);

CREATE TABLE `User_marketing_agreement` (
                                            `id` bigint NOT NULL,
                                            `body` varchar(255) NOT NULL
);

CREATE TABLE `Chat_participant` (
                                    `id` bigint NOT NULL,
                                    `joined_at` datetime(6) NOT NULL,
                                    `user_id` bigint NOT NULL,
                                    `room_id` bigint NOT NULL,
                                    `ended_at` datetime(6) NULL
);

CREATE TABLE `User_photo` (
                              `id` bigint NOT NULL,
                              `user_id` bigint NOT NULL,
                              `url` varchar(512) NOT NULL,
                              `deleted_at` datetime(6) NULL,
                              `created_at` datetime(6) NOT NULL
);

CREATE TABLE `User` (
                        `id` bigint NOT NULL,
                        `birthdate` datetime(6) NOT NULL,
                        `email` varchar(255) NOT NULL COMMENT 'unique',
                        `sex` ENUM('M', 'F') NOT NULL,
                        `created_at` datetime(6) NOT NULL,
                        `nickname` varchar(20) NOT NULL,
                        `updated_at` datetime(6) NULL,
                        `deleted_at` datetime(6) NULL,
                        `ideal_voice_url` varchar(512) NULL,
                        `intro_voice_url` varchar(512) NOT NULL,
                        `intro_text` varchar(255) NOT NULL,
                        `profile_image_url` varchar(512) NOT NULL,
                        `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
                        `code` char(10) NOT NULL,
                        UNIQUE (`email`)
);

CREATE TABLE `Block` (
                         `id` bigint NOT NULL,
                         `blocked_by_id` bigint NOT NULL,
                         `blocked_id` bigint NOT NULL,
                         `blocked_at` datetime(6) NOT NULL,
                         `reason` varchar(100) NOT NULL,
                         `status` ENUM('BLOCKED', 'UNBLOCKED') NOT NULL DEFAULT 'BLOCKED',
                         `deleted_at` datetime(6) NULL
);

CREATE TABLE `Chat_media` (
                              `id` bigint NOT NULL,
                              `message_id` bigint NOT NULL,
                              `url` varchar(512) NULL,
                              `type` ENUM(
        'AUDIO',
        'PHOTO',
        'VIDEO',
        'TEXT'
    ) NOT NULL DEFAULT 'TEXT',
                              `text` varchar(512) NULL
);

CREATE TABLE `Chat_room` (
                             `id` bigint NOT NULL,
                             `user_id` bigint NOT NULL,
                             `started_at` datetime(6) NOT NULL,
                             `ended_at` datetime(6) NULL,
                             `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE'
);

CREATE TABLE `Personal_information` (
                                       `id` bigint NOT NULL,
                                       `body` varchar(255) NOT NULL
);

CREATE TABLE `Marketing_agreement` (
                                       `id` bigint NOT NULL,
                                       `marketing_agreement_id` bigint NOT NULL,
                                       `user_id` bigint NOT NULL,
                                       `agreed_at` datetime(6) NOT NULL,
                                       `is_agreed` boolean NOT NULL DEFAULT TRUE,
                                       `deleted_at` datetime(6) NULL
);

CREATE TABLE `Report` (
                          `id` bigint NOT NULL,
                          `reported_by_id` bigint NOT NULL,
                          `reported_id` bigint NOT NULL,
                          `reported_at` datetime(6) NOT NULL,
                          `reason` varchar(100) NOT NULL,
                          `deleted_at` datetime(6) NULL
);

CREATE TABLE `Chat_message` (
                                `id` bigint NOT NULL,
                                `sent_at` datetime(6) NOT NULL,
                                `updated_at` datetime(6) NULL,
                                `read_at` datetime(6) NULL,
                                `deleted_at` datetime(6) NULL,
                                `sent_by_id` bigint NOT NULL,
                                `sent_to_id` bigint NOT NULL,
                                `room_id` bigint NOT NULL
);

CREATE TABLE `Notification` (
                                `id` bigint NOT NULL,
                                `user_id` bigint NOT NULL,
                                `type` ENUM(
        'RECOMMEND',
        'CHAT',
        'HEART',
        'PROFILE',
        'REMIND',
        'UPDATE'
    ) NOT NULL DEFAULT 'CHAT',
                                `is_read` boolean NOT NULL DEFAULT FALSE,
                                `created_at` datetime(6) NOT NULL,
                                `deleted_at` datetime(6) NULL,
                                `title` varchar(50) NOT NULL,
                                `body` varchar(100) NOT NULL
);

ALTER TABLE `User_personality`
    ADD CONSTRAINT `PK_USER_PERSONALITY` PRIMARY KEY (
                                                      `id`,
                                                      `user_id`,
                                                      `personality_id`
        );

ALTER TABLE `Personality`
    ADD CONSTRAINT `PK_PERSONALITY` PRIMARY KEY (`id`);

ALTER TABLE `User_ideal_personality`
    ADD CONSTRAINT `PK_USER_IDEAL_PERSONALITY` PRIMARY KEY (
                                                            `id`,
                                                            `user_id`,
                                                            `personality_id`
        );

ALTER TABLE `Policy` ADD CONSTRAINT `PK_POLICY` PRIMARY KEY (`id`);

ALTER TABLE `User_interest`
    ADD CONSTRAINT `PK_USER_INTEREST` PRIMARY KEY (
                                                   `id`,
                                                   `interest_id`,
                                                   `user_id`
        );

ALTER TABLE `Interest`
    ADD CONSTRAINT `PK_INTEREST` PRIMARY KEY (`id`);

ALTER TABLE `address`
    ADD CONSTRAINT `PK_ADDRESS` PRIMARY KEY (`code`);

ALTER TABLE `Heart` ADD CONSTRAINT `PK_HEART` PRIMARY KEY (`id`);

ALTER TABLE `User_marketing_agreement`
    ADD CONSTRAINT `PK_USER_MARKETING_AGREEMENT` PRIMARY KEY (`id`);

ALTER TABLE `Chat_participant`
    ADD CONSTRAINT `PK_CHAT_PARTICIPANT` PRIMARY KEY (`id`);

ALTER TABLE `User_photo`
    ADD CONSTRAINT `PK_USER_PHOTO` PRIMARY KEY (`id`, `user_id`);

ALTER TABLE `User` ADD CONSTRAINT `PK_USER` PRIMARY KEY (`id`);

ALTER TABLE `Block` ADD CONSTRAINT `PK_BLOCK` PRIMARY KEY (`id`);

ALTER TABLE `Chat_media`
    ADD CONSTRAINT `PK_CHAT_MEDIA` PRIMARY KEY (`id`, `message_id`);

ALTER TABLE `Chat_room`
    ADD CONSTRAINT `PK_CHAT_ROOM` PRIMARY KEY (`id`);

ALTER TABLE `Personal_information`
    ADD CONSTRAINT `PK_PERSONAL_INFORMATION` PRIMARY KEY (`id`);

ALTER TABLE `Marketing_agreement`
    ADD CONSTRAINT `PK_MARKETING_AGREEMENT` PRIMARY KEY (
                                                         `id`,
                                                         `marketing_agreement_id`,
                                                         `user_id`
        );

ALTER TABLE `Report` ADD CONSTRAINT `PK_REPORT` PRIMARY KEY (`id`);

ALTER TABLE `Chat_message`
    ADD CONSTRAINT `PK_CHAT_MESSAGE` PRIMARY KEY (`id`);

ALTER TABLE `Notification`
    ADD CONSTRAINT `PK_NOTIFICATION` PRIMARY KEY (`id`);

ALTER TABLE `User_personality`
    ADD CONSTRAINT `FK_User_TO_User_personality_1` FOREIGN KEY (`user_id`) REFERENCES `User` (`id`);

ALTER TABLE `User_personality`
    ADD CONSTRAINT `FK_Personality_TO_User_personality_1` FOREIGN KEY (`personality_id`) REFERENCES `Personality` (`id`);

ALTER TABLE `User_ideal_personality`
    ADD CONSTRAINT `FK_User_TO_User_ideal_personality_1` FOREIGN KEY (`user_id`) REFERENCES `User` (`id`);

ALTER TABLE `User_ideal_personality`
    ADD CONSTRAINT `FK_Personality_TO_User_ideal_personality_1` FOREIGN KEY (`personality_id`) REFERENCES `Personality` (`id`);

ALTER TABLE `User_interest`
    ADD CONSTRAINT `FK_Interest_TO_User_interest_1` FOREIGN KEY (`interest_id`) REFERENCES `Interest` (`id`);

ALTER TABLE `User_interest`
    ADD CONSTRAINT `FK_User_TO_User_interest_1` FOREIGN KEY (`user_id`) REFERENCES `User` (`id`);

ALTER TABLE `User_photo`
    ADD CONSTRAINT `FK_User_TO_User_photo_1` FOREIGN KEY (`user_id`) REFERENCES `User` (`id`);

ALTER TABLE `Chat_media`
    ADD CONSTRAINT `FK_Chat_message_TO_Chat_media_1` FOREIGN KEY (`message_id`) REFERENCES `Chat_message` (`id`);

ALTER TABLE `Marketing_agreement`
    ADD CONSTRAINT `FK_User_marketing_agreement_TO_Marketing_agreement_1` FOREIGN KEY (`marketing_agreement_id`) REFERENCES `User_marketing_agreement` (`id`);

ALTER TABLE `Marketing_agreement`
    ADD CONSTRAINT `FK_User_TO_Marketing_agreement_1` FOREIGN KEY (`user_id`) REFERENCES `User` (`id`);