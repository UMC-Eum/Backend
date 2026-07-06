-- Dummy seed data for development/testing
-- Inserts one row into each table defined by the initial migration

-- Addresses
INSERT INTO "Address" ("code","sidoCode","sigunguCode","emdCode","riCode","fullName","sidoName","sigunguName","emdName","riName","level","parentCode")
VALUES ('ADDR000001','01','001','001','01','Seoul, Gangnam','Seoul','Gangnam-gu','Yeoksam-dong','', 'SIGUNGU', NULL);

-- Users
INSERT INTO "User" ("id","birthdate","age","email","sex","nickname","updatedAt","introVoiceUrl","introText","profileImageUrl","vibeVector")
VALUES (1, now() - INTERVAL '30 years', 30, 'user1@example.com', 'M', 'user1', now(), 'https://example.com/intro1.mp3', 'Hello, I am user1', 'https://example.com/profile1.jpg', '[0,0,0]'::vector);

-- RefreshToken
INSERT INTO "RefreshToken" ("id","userId","tokenHash","expiresAt")
VALUES (1, 1, 'refresh_hash_1', now() + INTERVAL '30 days');

-- UserPhoto
INSERT INTO "UserPhoto" ("id","userId","url")
VALUES (1, 1, 'https://example.com/photo1.jpg');

-- Heart
INSERT INTO "Heart" ("id","sentById","sentToId")
VALUES (1, 1, 1);

-- Interest
INSERT INTO "Interest" ("id","body")
VALUES (1, 'Hiking');

-- UserInterest
INSERT INTO "UserInterest" ("id","interestId","userId","updatedAt")
VALUES (1, 1, 1, now());

-- Personality
INSERT INTO "Personality" ("id","body")
VALUES (1, 'Friendly');

-- UserIdealPersonality
INSERT INTO "UserIdealPersonality" ("id","userId","personalityId","updatedAt")
VALUES (1, 1, 1, now());

-- UserPersonality
INSERT INTO "UserPersonality" ("id","userId","personalityId","updatedAt")
VALUES (1, 1, 1, now());

-- Block
INSERT INTO "Block" ("id","blockedById","blockedId","blockedAt","reason")
VALUES (1, 1, 2, now(), 'Test block reason');

-- Report
INSERT INTO "Report" ("id","reportedById","reportedAt","reason","category")
VALUES (1, 1, now(), 'Inappropriate behavior', 'OTHERS');

-- Notification
INSERT INTO "Notification" ("id","userId","title","body","sentById")
VALUES (1, 1, 'Welcome','Welcome to the app', 1);

-- ChatRoom
INSERT INTO "ChatRoom" ("id","userId","type")
VALUES (1, 1, 'DIRECT');

-- ChatParticipant
INSERT INTO "ChatParticipant" ("id","userId","roomId")
VALUES (1, 1, 1);

-- ChatMessage
INSERT INTO "ChatMessage" ("id","participantId","updatedAt")
VALUES (1, 1, now());

-- ChatMedia
INSERT INTO "ChatMedia" ("id","messageId","type","text")
VALUES (1, 1, 'TEXT', 'Hello chat');

-- MarketingAgreement
INSERT INTO "MarketingAgreement" ("id","body")
VALUES (1, 'Agreed to receive marketing emails');

-- UserMarketingAgreement
INSERT INTO "UserMarketingAgreement" ("id","marketingAgreementId","userId")
VALUES (1, 1, 1);

-- UserWatchLog
INSERT INTO "UserWatchLog" ("id","visitedTo","visitedBy")
VALUES (1, 1, 1);

-- Club (requires vibeVector)
INSERT INTO "Club" ("id","hostId","name","category","capacity","likes","vibeVector","thumbnailUrl")
VALUES (1, 1, 'Seoul Hikers','HOBBY', 20, 0, '[0,0,0]'::vector, 'https://example.com/club-thumb.jpg');

-- ClubUser
INSERT INTO "ClubUser" ("id","userId","clubId","authority","status")
VALUES (1, 1, 1, 'HOST', 'ACTIVE');

-- Badge
INSERT INTO "Badge" ("id","name")
VALUES (1, 'Founding Member');

-- ClubUserBadge
INSERT INTO "ClubUserBadge" ("id","clubUserId","badgeId")
VALUES (1, 1, 1);

-- ClubLike
INSERT INTO "ClubLike" ("id","userId","clubId")
VALUES (1, 1, 1);

-- Meeting
INSERT INTO "Meeting" ("id","name","date","clubId","spot")
VALUES (1, 'Morning Hike', now() + INTERVAL '1 day', 1, 'Bukhansan Trailhead');

-- MeetingMember
INSERT INTO "MeetingMember" ("id","meetingId","clubUserId")
VALUES (1, 1, 1);

-- Article
INSERT INTO "Article" ("id","title","contents","userId","clubId","updatedAt")
VALUES (1, 'Welcome Post','This is the first article', 1, 1, now());

-- Comment
INSERT INTO "Comment" ("id","contents","userId","articleId","depth")
VALUES (1, 'Nice post!', 1, 1, 0);

-- ArticleLike
INSERT INTO "ArticleLike" ("id","articleId","userId")
VALUES (1, 1, 1);

-- ArticlePhoto
INSERT INTO "ArticlePhoto" ("id","photoUrl","articleId","clubUserId")
VALUES (1, 'https://example.com/article1.jpg', 1, 1);

-- UserReport
INSERT INTO "UserReport" ("id","reportId","reportedUserId")
VALUES (1, 1, 1);

-- ClubReport
INSERT INTO "ClubReport" ("id","reportId","reportedClubId")
VALUES (1, 1, 1);

-- Article/other related minimal entries done

-- Notes: If you run this seed in a database with existing sequences, you may need to reset sequences after inserting explicit ids:
-- SELECT setval(pg_get_serial_sequence('"User"','id'), (SELECT MAX(id) FROM "User"));
-- Repeat for other serial columns as needed.
