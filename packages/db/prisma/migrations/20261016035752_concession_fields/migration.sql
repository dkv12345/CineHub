-- CreateTable
CREATE TABLE `users` (
    `id` CHAR(36) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `authProvider` ENUM('LOCAL', 'GOOGLE') NOT NULL DEFAULT 'LOCAL',
    `googleId` VARCHAR(100) NULL,
    `passwordHash` VARCHAR(255) NULL,
    `fullName` VARCHAR(120) NOT NULL,
    `phone` VARCHAR(20) NULL,
    `avatarUrl` VARCHAR(500) NULL,
    `role` ENUM('CUSTOMER', 'STAFF', 'ADMIN') NOT NULL DEFAULT 'CUSTOMER',
    `status` ENUM('ACTIVE', 'LOCKED', 'DELETED') NOT NULL DEFAULT 'ACTIVE',
    `cinemaId` CHAR(36) NULL,
    `emailVerifiedAt` DATETIME(3) NULL,
    `lastLoginAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    UNIQUE INDEX `users_googleId_key`(`googleId`),
    INDEX `users_role_status_idx`(`role`, `status`),
    INDEX `users_cinemaId_idx`(`cinemaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `refresh_tokens` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `familyId` CHAR(36) NOT NULL,
    `tokenHash` CHAR(64) NOT NULL,
    `replacedById` CHAR(36) NULL,
    `userAgent` VARCHAR(255) NULL,
    `ip` VARCHAR(45) NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `revokedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `refresh_tokens_tokenHash_key`(`tokenHash`),
    INDEX `refresh_tokens_userId_idx`(`userId`),
    INDEX `refresh_tokens_familyId_idx`(`familyId`),
    INDEX `refresh_tokens_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `password_reset_tokens` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `tokenHash` CHAR(64) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `usedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `password_reset_tokens_tokenHash_key`(`tokenHash`),
    INDEX `password_reset_tokens_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `email_verification_tokens` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `tokenHash` CHAR(64) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `usedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `email_verification_tokens_tokenHash_key`(`tokenHash`),
    INDEX `email_verification_tokens_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cinema_chains` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(20) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `logoUrl` VARCHAR(500) NULL,
    `websiteUrl` VARCHAR(500) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `cinema_chains_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `provinces` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(20) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `nameNormalized` VARCHAR(100) NOT NULL,

    UNIQUE INDEX `provinces_code_key`(`code`),
    UNIQUE INDEX `provinces_nameNormalized_key`(`nameNormalized`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wards` (
    `id` CHAR(36) NOT NULL,
    `provinceId` CHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,

    UNIQUE INDEX `wards_provinceId_name_key`(`provinceId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cinemas` (
    `id` CHAR(36) NOT NULL,
    `chainId` CHAR(36) NOT NULL,
    `externalId` VARCHAR(100) NOT NULL,
    `slug` VARCHAR(120) NULL,
    `name` VARCHAR(200) NOT NULL,
    `address` VARCHAR(500) NOT NULL,
    `provinceId` CHAR(36) NOT NULL,
    `wardId` CHAR(36) NULL,
    `latitude` DECIMAL(9, 6) NULL,
    `longitude` DECIMAL(9, 6) NULL,
    `phone` VARCHAR(20) NULL,
    `timezone` VARCHAR(50) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    `sourceCityId` VARCHAR(100) NULL,
    `sourceUrl` VARCHAR(500) NULL,
    `imageUrl` VARCHAR(500) NULL,
    `thumbnailUrl` VARCHAR(500) NULL,
    `galleryUrls` JSON NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 99,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `lastSyncedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `cinemas_provinceId_isActive_idx`(`provinceId`, `isActive`),
    INDEX `cinemas_chainId_sortOrder_idx`(`chainId`, `sortOrder`),
    UNIQUE INDEX `cinemas_chainId_externalId_key`(`chainId`, `externalId`),
    UNIQUE INDEX `cinemas_chainId_slug_key`(`chainId`, `slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auditoriums` (
    `id` CHAR(36) NOT NULL,
    `cinemaId` CHAR(36) NOT NULL,
    `name` VARCHAR(50) NOT NULL,
    `tier` ENUM('STANDARD', 'VIP', 'KIDS', 'PREMIUM') NOT NULL DEFAULT 'STANDARD',
    `defaultFormat` ENUM('TWO_D', 'THREE_D', 'IMAX', 'FOUR_DX', 'SCREENX', 'DOLBY', 'LED') NOT NULL DEFAULT 'TWO_D',
    `totalSeats` INTEGER NOT NULL DEFAULT 0,
    `totalCapacity` INTEGER NOT NULL DEFAULT 0,
    `layoutCode` VARCHAR(30) NULL,
    `isLayoutMock` BOOLEAN NOT NULL DEFAULT true,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `auditoriums_cinemaId_name_key`(`cinemaId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ticket_types` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(20) NOT NULL,
    `name` VARCHAR(60) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `ticket_types_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `seat_types` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(20) NOT NULL,
    `name` VARCHAR(50) NOT NULL,
    `colorHex` VARCHAR(9) NULL,
    `capacity` INTEGER NOT NULL DEFAULT 1,

    UNIQUE INDEX `seat_types_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `seats` (
    `id` CHAR(36) NOT NULL,
    `auditoriumId` CHAR(36) NOT NULL,
    `seatTypeId` CHAR(36) NOT NULL,
    `rowLabel` VARCHAR(3) NOT NULL,
    `colNumber` INTEGER NOT NULL,
    `label` VARCHAR(8) NOT NULL,
    `posX` INTEGER NOT NULL,
    `posY` INTEGER NOT NULL,
    `colSpan` INTEGER NOT NULL DEFAULT 1,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `seats_auditoriumId_rowLabel_colNumber_key`(`auditoriumId`, `rowLabel`, `colNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `genres` (
    `id` CHAR(36) NOT NULL,
    `slug` VARCHAR(60) NOT NULL,
    `name` VARCHAR(60) NOT NULL,

    UNIQUE INDEX `genres_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `movies` (
    `id` CHAR(36) NOT NULL,
    `slug` VARCHAR(200) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `titleNormalized` VARCHAR(255) NOT NULL,
    `originalTitle` VARCHAR(255) NULL,
    `synopsis` TEXT NULL,
    `durationMin` INTEGER NULL,
    `releaseDate` DATE NULL,
    `endDate` DATE NULL,
    `releaseYear` INTEGER NULL,
    `ageRating` ENUM('P', 'K', 'T13', 'T16', 'T18', 'C') NULL,
    `status` ENUM('COMING_SOON', 'NOW_SHOWING', 'ENDED') NOT NULL DEFAULT 'COMING_SOON',
    `posterUrl` VARCHAR(500) NULL,
    `backdropUrl` VARCHAR(500) NULL,
    `trailerUrl` VARCHAR(500) NULL,
    `language` VARCHAR(50) NULL,
    `country` VARCHAR(60) NULL,
    `ratingAvg` DECIMAL(3, 2) NOT NULL DEFAULT 0,
    `ratingCount` INTEGER NOT NULL DEFAULT 0,
    `mongoMetaId` VARCHAR(24) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `movies_slug_key`(`slug`),
    INDEX `movies_status_releaseDate_idx`(`status`, `releaseDate`),
    INDEX `movies_titleNormalized_releaseYear_idx`(`titleNormalized`, `releaseYear`),
    INDEX `movies_title_idx`(`title`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `movie_genres` (
    `movieId` CHAR(36) NOT NULL,
    `genreId` CHAR(36) NOT NULL,

    INDEX `movie_genres_genreId_idx`(`genreId`),
    PRIMARY KEY (`movieId`, `genreId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `persons` (
    `id` CHAR(36) NOT NULL,
    `fullName` VARCHAR(150) NOT NULL,
    `nameNormalized` VARCHAR(150) NOT NULL,
    `photoUrl` VARCHAR(500) NULL,

    UNIQUE INDEX `persons_nameNormalized_key`(`nameNormalized`),
    INDEX `persons_fullName_idx`(`fullName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `movie_credits` (
    `id` CHAR(36) NOT NULL,
    `movieId` CHAR(36) NOT NULL,
    `personId` CHAR(36) NOT NULL,
    `role` ENUM('DIRECTOR', 'ACTOR') NOT NULL,
    `billingOrder` INTEGER NOT NULL DEFAULT 0,
    `characterName` VARCHAR(150) NULL,

    UNIQUE INDEX `movie_credits_movieId_personId_role_key`(`movieId`, `personId`, `role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `movie_sources` (
    `id` CHAR(36) NOT NULL,
    `movieId` CHAR(36) NOT NULL,
    `chainId` CHAR(36) NOT NULL,
    `externalId` VARCHAR(100) NOT NULL,
    `sourceSlug` VARCHAR(200) NULL,
    `url` VARCHAR(500) NULL,
    `sourceScore` DECIMAL(4, 2) NULL,
    `sourceScoreScale` INTEGER NOT NULL DEFAULT 10,
    `sourceVotes` INTEGER NULL,
    `lastSyncedAt` DATETIME(3) NULL,
    `lastSeenAt` DATETIME(3) NULL,

    INDEX `movie_sources_movieId_idx`(`movieId`),
    UNIQUE INDEX `movie_sources_chainId_externalId_key`(`chainId`, `externalId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `showtimes` (
    `id` CHAR(36) NOT NULL,
    `movieId` CHAR(36) NOT NULL,
    `auditoriumId` CHAR(36) NOT NULL,
    `cinemaId` CHAR(36) NOT NULL,
    `externalId` VARCHAR(100) NULL,
    `dedupKey` CHAR(40) NOT NULL,
    `startTime` DATETIME(3) NOT NULL,
    `endTime` DATETIME(3) NOT NULL,
    `localDate` DATE NOT NULL,
    `format` ENUM('TWO_D', 'THREE_D', 'IMAX', 'FOUR_DX', 'SCREENX', 'DOLBY', 'LED') NOT NULL DEFAULT 'TWO_D',
    `formatRaw` VARCHAR(60) NULL,
    `versionCode` VARCHAR(30) NULL,
    `kind` ENUM('REGULAR', 'ENCORE', 'LIVE') NOT NULL DEFAULT 'REGULAR',
    `captionMode` ENUM('SUBTITLED', 'DUBBED') NOT NULL DEFAULT 'SUBTITLED',
    `audioLanguage` VARCHAR(10) NULL,
    `subtitleLanguage` VARCHAR(10) NULL,
    `status` ENUM('SCHEDULED', 'OPEN', 'SOLD_OUT', 'CANCELLED', 'FINISHED') NOT NULL DEFAULT 'SCHEDULED',
    `seatSource` ENUM('MOCK', 'PROVIDER') NOT NULL DEFAULT 'MOCK',
    `providerTotalSeats` INTEGER NULL,
    `providerBookedSeats` INTEGER NULL,
    `lastSyncedAt` DATETIME(3) NULL,
    `lastSeenAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `showtimes_dedupKey_key`(`dedupKey`),
    INDEX `showtimes_movieId_startTime_idx`(`movieId`, `startTime`),
    INDEX `showtimes_cinemaId_localDate_movieId_idx`(`cinemaId`, `localDate`, `movieId`),
    INDEX `showtimes_startTime_status_idx`(`startTime`, `status`),
    UNIQUE INDEX `showtimes_cinemaId_externalId_key`(`cinemaId`, `externalId`),
    UNIQUE INDEX `showtimes_auditoriumId_startTime_key`(`auditoriumId`, `startTime`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `price_rules` (
    `id` CHAR(36) NOT NULL,
    `chainId` CHAR(36) NOT NULL,
    `format` ENUM('TWO_D', 'THREE_D', 'IMAX', 'FOUR_DX', 'SCREENX', 'DOLBY', 'LED') NOT NULL,
    `roomTier` ENUM('STANDARD', 'VIP', 'KIDS', 'PREMIUM') NOT NULL DEFAULT 'STANDARD',
    `seatTypeId` CHAR(36) NOT NULL,
    `ticketTypeId` CHAR(36) NOT NULL,
    `dayType` ENUM('WEEKDAY', 'WEEKEND', 'HOLIDAY') NOT NULL DEFAULT 'WEEKDAY',
    `price` INTEGER NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `price_rules_chainId_format_roomTier_seatTypeId_ticketTypeId__key`(`chainId`, `format`, `roomTier`, `seatTypeId`, `ticketTypeId`, `dayType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `showtime_prices` (
    `id` CHAR(36) NOT NULL,
    `showtimeId` CHAR(36) NOT NULL,
    `seatTypeId` CHAR(36) NOT NULL,
    `ticketTypeId` CHAR(36) NOT NULL,
    `price` INTEGER NOT NULL,
    `source` ENUM('CRAWLED', 'DEFAULT', 'MANUAL') NOT NULL DEFAULT 'DEFAULT',

    UNIQUE INDEX `showtime_prices_showtimeId_seatTypeId_ticketTypeId_key`(`showtimeId`, `seatTypeId`, `ticketTypeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `showtime_seats` (
    `id` CHAR(36) NOT NULL,
    `showtimeId` CHAR(36) NOT NULL,
    `seatId` CHAR(36) NOT NULL,
    `status` ENUM('AVAILABLE', 'HELD', 'SOLD', 'BLOCKED') NOT NULL DEFAULT 'AVAILABLE',
    `heldByBookingId` CHAR(36) NULL,
    `heldUntil` DATETIME(3) NULL,
    `version` INTEGER NOT NULL DEFAULT 0,
    `isSeeded` BOOLEAN NOT NULL DEFAULT false,
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `showtime_seats_showtimeId_status_idx`(`showtimeId`, `status`),
    INDEX `showtime_seats_status_heldUntil_idx`(`status`, `heldUntil`),
    INDEX `showtime_seats_heldByBookingId_idx`(`heldByBookingId`),
    UNIQUE INDEX `showtime_seats_showtimeId_seatId_key`(`showtimeId`, `seatId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `concessions` (
    `id` CHAR(36) NOT NULL,
    `chainId` CHAR(36) NOT NULL,
    `cinemaId` CHAR(36) NULL,
    `externalId` VARCHAR(50) NULL,
    `name` VARCHAR(150) NOT NULL,
    `description` VARCHAR(500) NULL,
    `category` ENUM('COMBO', 'POPCORN', 'DRINK', 'SNACK') NOT NULL DEFAULT 'COMBO',
    `imageUrl` VARCHAR(500) NULL,
    `price` INTEGER NOT NULL,
    `minSeats` INTEGER NOT NULL DEFAULT 0,
    `maxSeats` INTEGER NOT NULL DEFAULT 99,
    `cinemaApply` JSON NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `concessions_externalId_key`(`externalId`),
    INDEX `concessions_chainId_isActive_sortOrder_idx`(`chainId`, `isActive`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bookings` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(20) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `showtimeId` CHAR(36) NOT NULL,
    `status` ENUM('PENDING', 'CONFIRMED', 'CANCELLED', 'EXPIRED', 'PARTIALLY_REFUNDED', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
    `subtotalAmount` INTEGER NOT NULL DEFAULT 0,
    `discountAmount` INTEGER NOT NULL DEFAULT 0,
    `serviceFee` INTEGER NOT NULL DEFAULT 0,
    `totalAmount` INTEGER NOT NULL DEFAULT 0,
    `contactEmail` VARCHAR(255) NOT NULL,
    `contactPhone` VARCHAR(20) NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `confirmedAt` DATETIME(3) NULL,
    `cancelledAt` DATETIME(3) NULL,
    `cancelReason` VARCHAR(255) NULL,
    `version` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `bookings_code_key`(`code`),
    INDEX `bookings_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `bookings_status_expiresAt_idx`(`status`, `expiresAt`),
    INDEX `bookings_showtimeId_status_idx`(`showtimeId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `booking_seats` (
    `id` CHAR(36) NOT NULL,
    `bookingId` CHAR(36) NOT NULL,
    `showtimeSeatId` CHAR(36) NOT NULL,
    `seatLabel` VARCHAR(8) NOT NULL,
    `seatTypeCode` VARCHAR(20) NOT NULL,
    `ticketTypeId` CHAR(36) NOT NULL,
    `ticketTypeCode` VARCHAR(20) NOT NULL,
    `price` INTEGER NOT NULL,
    `activeLock` CHAR(36) NULL,

    UNIQUE INDEX `booking_seats_activeLock_key`(`activeLock`),
    INDEX `booking_seats_bookingId_idx`(`bookingId`),
    INDEX `booking_seats_showtimeSeatId_idx`(`showtimeSeatId`),
    UNIQUE INDEX `booking_seats_bookingId_showtimeSeatId_key`(`bookingId`, `showtimeSeatId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `booking_concessions` (
    `id` CHAR(36) NOT NULL,
    `bookingId` CHAR(36) NOT NULL,
    `concessionId` CHAR(36) NOT NULL,
    `nameSnapshot` VARCHAR(150) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `unitPrice` INTEGER NOT NULL,

    UNIQUE INDEX `booking_concessions_bookingId_concessionId_key`(`bookingId`, `concessionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tickets` (
    `id` CHAR(36) NOT NULL,
    `bookingId` CHAR(36) NOT NULL,
    `bookingSeatId` CHAR(36) NOT NULL,
    `qrVersion` INTEGER NOT NULL DEFAULT 1,
    `status` ENUM('VALID', 'USED', 'VOID') NOT NULL DEFAULT 'VALID',
    `issuedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `usedAt` DATETIME(3) NULL,
    `checkedInById` CHAR(36) NULL,

    UNIQUE INDEX `tickets_bookingSeatId_key`(`bookingSeatId`),
    INDEX `tickets_bookingId_idx`(`bookingId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payments` (
    `id` CHAR(36) NOT NULL,
    `bookingId` CHAR(36) NOT NULL,
    `provider` ENUM('VNPAY', 'ZALOPAY', 'MOMO') NOT NULL,
    `status` ENUM('INITIATED', 'PENDING', 'SUCCESS', 'FAILED', 'CANCELLED', 'REFUNDED') NOT NULL DEFAULT 'INITIATED',
    `amount` INTEGER NOT NULL,
    `currency` CHAR(3) NOT NULL DEFAULT 'VND',
    `txnRef` VARCHAR(64) NOT NULL,
    `providerTxnNo` VARCHAR(100) NULL,
    `bankCode` VARCHAR(30) NULL,
    `failureCode` VARCHAR(50) NULL,
    `rawResponse` JSON NULL,
    `successLock` CHAR(36) NULL,
    `paidAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `payments_txnRef_key`(`txnRef`),
    UNIQUE INDEX `payments_successLock_key`(`successLock`),
    INDEX `payments_bookingId_idx`(`bookingId`),
    INDEX `payments_status_createdAt_idx`(`status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payment_webhook_events` (
    `id` CHAR(36) NOT NULL,
    `provider` ENUM('VNPAY', 'ZALOPAY', 'MOMO') NOT NULL,
    `eventKey` VARCHAR(120) NOT NULL,
    `txnRef` VARCHAR(64) NULL,
    `payload` JSON NOT NULL,
    `signatureValid` BOOLEAN NOT NULL,
    `processedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `payment_webhook_events_txnRef_idx`(`txnRef`),
    UNIQUE INDEX `payment_webhook_events_provider_eventKey_key`(`provider`, `eventKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `refunds` (
    `id` CHAR(36) NOT NULL,
    `paymentId` CHAR(36) NOT NULL,
    `amount` INTEGER NOT NULL,
    `reason` VARCHAR(255) NULL,
    `status` ENUM('REQUESTED', 'DONE', 'FAILED') NOT NULL DEFAULT 'REQUESTED',
    `providerRefundNo` VARCHAR(100) NULL,
    `processedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `refunds_paymentId_idx`(`paymentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vouchers` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(40) NOT NULL,
    `description` VARCHAR(255) NULL,
    `type` ENUM('PERCENT', 'FIXED') NOT NULL,
    `value` INTEGER NOT NULL,
    `maxDiscount` INTEGER NULL,
    `minOrderAmount` INTEGER NOT NULL DEFAULT 0,
    `startsAt` DATETIME(3) NOT NULL,
    `endsAt` DATETIME(3) NOT NULL,
    `usageLimit` INTEGER NULL,
    `usedCount` INTEGER NOT NULL DEFAULT 0,
    `perUserLimit` INTEGER NOT NULL DEFAULT 1,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `vouchers_code_key`(`code`),
    INDEX `vouchers_isActive_startsAt_endsAt_idx`(`isActive`, `startsAt`, `endsAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `voucher_redemptions` (
    `id` CHAR(36) NOT NULL,
    `voucherId` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `bookingId` CHAR(36) NOT NULL,
    `status` ENUM('RESERVED', 'REDEEMED', 'RELEASED') NOT NULL DEFAULT 'RESERVED',
    `discountAmount` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `voucher_redemptions_bookingId_key`(`bookingId`),
    INDEX `voucher_redemptions_voucherId_userId_status_idx`(`voucherId`, `userId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `promotions` (
    `id` CHAR(36) NOT NULL,
    `chainId` CHAR(36) NULL,
    `dedupKey` CHAR(40) NULL,
    `title` VARCHAR(200) NOT NULL,
    `imageUrl` VARCHAR(500) NOT NULL,
    `linkUrl` VARCHAR(500) NULL,
    `voucherId` CHAR(36) NULL,
    `startsAt` DATETIME(3) NULL,
    `endsAt` DATETIME(3) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `promotions_dedupKey_key`(`dedupKey`),
    INDEX `promotions_isActive_startsAt_endsAt_idx`(`isActive`, `startsAt`, `endsAt`),
    INDEX `promotions_chainId_idx`(`chainId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `favorites` (
    `userId` CHAR(36) NOT NULL,
    `movieId` CHAR(36) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `favorites_movieId_idx`(`movieId`),
    PRIMARY KEY (`userId`, `movieId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `movie_subscriptions` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `movieId` CHAR(36) NOT NULL,
    `notifiedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `movie_subscriptions_userId_movieId_key`(`userId`, `movieId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notification_logs` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NULL,
    `type` ENUM('TICKET_EMAIL', 'MOVIE_RELEASE', 'NEW_SHOWTIME', 'BOOKING_CONFIRMED', 'SHOWTIME_REMINDER') NOT NULL,
    `status` ENUM('PENDING', 'SENT', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `toAddress` VARCHAR(255) NOT NULL,
    `dedupeKey` VARCHAR(120) NOT NULL,
    `payload` JSON NULL,
    `error` VARCHAR(500) NULL,
    `sentAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `notification_logs_dedupeKey_key`(`dedupeKey`),
    INDEX `notification_logs_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `notification_logs_status_createdAt_idx`(`status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `type` ENUM('MOVIE_RELEASE', 'NEW_SHOWTIME', 'BOOKING_CONFIRMED', 'SHOWTIME_REMINDER') NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `body` VARCHAR(500) NULL,
    `linkUrl` VARCHAR(500) NULL,
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `readAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notifications_userId_isRead_createdAt_idx`(`userId`, `isRead`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `outbox_events` (
    `id` CHAR(36) NOT NULL,
    `aggregateType` VARCHAR(50) NOT NULL,
    `aggregateId` CHAR(36) NOT NULL,
    `eventType` VARCHAR(80) NOT NULL,
    `payload` JSON NOT NULL,
    `status` ENUM('PENDING', 'PROCESSED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `nextAttemptAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastError` VARCHAR(500) NULL,
    `correlationId` VARCHAR(64) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `processedAt` DATETIME(3) NULL,

    INDEX `outbox_events_status_nextAttemptAt_idx`(`status`, `nextAttemptAt`),
    INDEX `outbox_events_aggregateType_aggregateId_idx`(`aggregateType`, `aggregateId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inbox_events` (
    `id` CHAR(36) NOT NULL,
    `consumer` VARCHAR(50) NOT NULL,
    `eventId` CHAR(36) NOT NULL,
    `processedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `inbox_events_consumer_eventId_key`(`consumer`, `eventId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_cinemaId_fkey` FOREIGN KEY (`cinemaId`) REFERENCES `cinemas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refresh_tokens` ADD CONSTRAINT `refresh_tokens_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `password_reset_tokens` ADD CONSTRAINT `password_reset_tokens_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `email_verification_tokens` ADD CONSTRAINT `email_verification_tokens_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wards` ADD CONSTRAINT `wards_provinceId_fkey` FOREIGN KEY (`provinceId`) REFERENCES `provinces`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cinemas` ADD CONSTRAINT `cinemas_chainId_fkey` FOREIGN KEY (`chainId`) REFERENCES `cinema_chains`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cinemas` ADD CONSTRAINT `cinemas_provinceId_fkey` FOREIGN KEY (`provinceId`) REFERENCES `provinces`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cinemas` ADD CONSTRAINT `cinemas_wardId_fkey` FOREIGN KEY (`wardId`) REFERENCES `wards`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `auditoriums` ADD CONSTRAINT `auditoriums_cinemaId_fkey` FOREIGN KEY (`cinemaId`) REFERENCES `cinemas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `seats` ADD CONSTRAINT `seats_auditoriumId_fkey` FOREIGN KEY (`auditoriumId`) REFERENCES `auditoriums`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `seats` ADD CONSTRAINT `seats_seatTypeId_fkey` FOREIGN KEY (`seatTypeId`) REFERENCES `seat_types`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `movie_genres` ADD CONSTRAINT `movie_genres_movieId_fkey` FOREIGN KEY (`movieId`) REFERENCES `movies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `movie_genres` ADD CONSTRAINT `movie_genres_genreId_fkey` FOREIGN KEY (`genreId`) REFERENCES `genres`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `movie_credits` ADD CONSTRAINT `movie_credits_movieId_fkey` FOREIGN KEY (`movieId`) REFERENCES `movies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `movie_credits` ADD CONSTRAINT `movie_credits_personId_fkey` FOREIGN KEY (`personId`) REFERENCES `persons`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `movie_sources` ADD CONSTRAINT `movie_sources_movieId_fkey` FOREIGN KEY (`movieId`) REFERENCES `movies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `movie_sources` ADD CONSTRAINT `movie_sources_chainId_fkey` FOREIGN KEY (`chainId`) REFERENCES `cinema_chains`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `showtimes` ADD CONSTRAINT `showtimes_movieId_fkey` FOREIGN KEY (`movieId`) REFERENCES `movies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `showtimes` ADD CONSTRAINT `showtimes_auditoriumId_fkey` FOREIGN KEY (`auditoriumId`) REFERENCES `auditoriums`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `showtimes` ADD CONSTRAINT `showtimes_cinemaId_fkey` FOREIGN KEY (`cinemaId`) REFERENCES `cinemas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `price_rules` ADD CONSTRAINT `price_rules_chainId_fkey` FOREIGN KEY (`chainId`) REFERENCES `cinema_chains`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `price_rules` ADD CONSTRAINT `price_rules_seatTypeId_fkey` FOREIGN KEY (`seatTypeId`) REFERENCES `seat_types`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `price_rules` ADD CONSTRAINT `price_rules_ticketTypeId_fkey` FOREIGN KEY (`ticketTypeId`) REFERENCES `ticket_types`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `showtime_prices` ADD CONSTRAINT `showtime_prices_showtimeId_fkey` FOREIGN KEY (`showtimeId`) REFERENCES `showtimes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `showtime_prices` ADD CONSTRAINT `showtime_prices_seatTypeId_fkey` FOREIGN KEY (`seatTypeId`) REFERENCES `seat_types`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `showtime_prices` ADD CONSTRAINT `showtime_prices_ticketTypeId_fkey` FOREIGN KEY (`ticketTypeId`) REFERENCES `ticket_types`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `showtime_seats` ADD CONSTRAINT `showtime_seats_showtimeId_fkey` FOREIGN KEY (`showtimeId`) REFERENCES `showtimes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `showtime_seats` ADD CONSTRAINT `showtime_seats_seatId_fkey` FOREIGN KEY (`seatId`) REFERENCES `seats`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `showtime_seats` ADD CONSTRAINT `showtime_seats_heldByBookingId_fkey` FOREIGN KEY (`heldByBookingId`) REFERENCES `bookings`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `concessions` ADD CONSTRAINT `concessions_chainId_fkey` FOREIGN KEY (`chainId`) REFERENCES `cinema_chains`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `concessions` ADD CONSTRAINT `concessions_cinemaId_fkey` FOREIGN KEY (`cinemaId`) REFERENCES `cinemas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_showtimeId_fkey` FOREIGN KEY (`showtimeId`) REFERENCES `showtimes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_seats` ADD CONSTRAINT `booking_seats_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_seats` ADD CONSTRAINT `booking_seats_showtimeSeatId_fkey` FOREIGN KEY (`showtimeSeatId`) REFERENCES `showtime_seats`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `booking_seats` ADD CONSTRAINT `booking_seats_ticketTypeId_fkey` FOREIGN KEY (`ticketTypeId`) REFERENCES `ticket_types`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_concessions` ADD CONSTRAINT `booking_concessions_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_concessions` ADD CONSTRAINT `booking_concessions_concessionId_fkey` FOREIGN KEY (`concessionId`) REFERENCES `concessions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_bookingSeatId_fkey` FOREIGN KEY (`bookingSeatId`) REFERENCES `booking_seats`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_checkedInById_fkey` FOREIGN KEY (`checkedInById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `refunds` ADD CONSTRAINT `refunds_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `payments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `voucher_redemptions` ADD CONSTRAINT `voucher_redemptions_voucherId_fkey` FOREIGN KEY (`voucherId`) REFERENCES `vouchers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `voucher_redemptions` ADD CONSTRAINT `voucher_redemptions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `voucher_redemptions` ADD CONSTRAINT `voucher_redemptions_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `promotions` ADD CONSTRAINT `promotions_chainId_fkey` FOREIGN KEY (`chainId`) REFERENCES `cinema_chains`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `promotions` ADD CONSTRAINT `promotions_voucherId_fkey` FOREIGN KEY (`voucherId`) REFERENCES `vouchers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `favorites` ADD CONSTRAINT `favorites_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `favorites` ADD CONSTRAINT `favorites_movieId_fkey` FOREIGN KEY (`movieId`) REFERENCES `movies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `movie_subscriptions` ADD CONSTRAINT `movie_subscriptions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `movie_subscriptions` ADD CONSTRAINT `movie_subscriptions_movieId_fkey` FOREIGN KEY (`movieId`) REFERENCES `movies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notification_logs` ADD CONSTRAINT `notification_logs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
