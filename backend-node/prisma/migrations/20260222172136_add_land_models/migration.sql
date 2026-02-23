-- CreateTable
CREATE TABLE "lands" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title_number" TEXT NOT NULL,
    "land_name" TEXT,
    "current_owner" TEXT NOT NULL,
    "owner_id" INTEGER,
    "owner_id_type" TEXT,
    "owner_id_number" TEXT,
    "region" TEXT,
    "city" TEXT,
    "town" TEXT,
    "neighborhood" TEXT,
    "area_sqm" DECIMAL,
    "polygon_coords" TEXT,
    "polygon_wkt" TEXT,
    "center_lat" DECIMAL,
    "center_lng" DECIMAL,
    "land_use" TEXT,
    "status" TEXT DEFAULT 'active',
    "verification_status" TEXT DEFAULT 'submitted',
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "land_hash" TEXT,
    "purchase_date" DATETIME,
    "purchase_price" DECIMAL,
    "currency" TEXT,
    "seller_name" TEXT,
    "documents" TEXT,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "land_ownerships" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "land_id" INTEGER NOT NULL,
    "owner_name" TEXT NOT NULL,
    "owner_id_type" TEXT,
    "owner_id_number" TEXT,
    "user_id" INTEGER,
    "ownership_type" TEXT DEFAULT 'full',
    "status" TEXT DEFAULT 'active',
    "acquired_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acquired_price" DECIMAL,
    "currency" TEXT,
    "seller_name" TEXT,
    "seller_id" TEXT,
    "documents" TEXT,
    "verification" TEXT DEFAULT 'pending',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "land_ownerships_land_id_fkey" FOREIGN KEY ("land_id") REFERENCES "lands" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "land_audit_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "land_id" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "actor_id" INTEGER,
    "actor_name" TEXT,
    "actor_role" TEXT,
    "old_data" TEXT,
    "new_data" TEXT,
    "description" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "land_audit_logs_land_id_fkey" FOREIGN KEY ("land_id") REFERENCES "lands" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "lands_title_number_key" ON "lands"("title_number");
