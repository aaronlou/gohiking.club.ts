ALTER TABLE "photos" DROP CONSTRAINT "photos_camera_id_cameras_id_fk";
--> statement-breakpoint
ALTER TABLE "photos" DROP COLUMN "camera_id";
--> statement-breakpoint
DROP TABLE "cameras" CASCADE;
