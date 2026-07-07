-- CreateIndex
CREATE INDEX "Inventory_productId_idx" ON "Inventory"("productId");

-- CreateIndex
CREATE INDEX "Inventory_branchId_idx" ON "Inventory"("branchId");

-- CreateIndex
CREATE INDEX "Inventory_sku_idx" ON "Inventory"("sku");

-- CreateIndex
CREATE INDEX "Inventory_branchCode_idx" ON "Inventory"("branchCode");

-- CreateIndex
CREATE INDEX "InventoryMovement_sku_idx" ON "InventoryMovement"("sku");

-- CreateIndex
CREATE INDEX "InventoryMovement_branchCode_idx" ON "InventoryMovement"("branchCode");

-- CreateIndex
CREATE INDEX "InventoryMovement_timestamp_idx" ON "InventoryMovement"("timestamp");

-- CreateIndex
CREATE INDEX "Product_brand_idx" ON "Product"("brand");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

-- CreateIndex
CREATE INDEX "Product_status_idx" ON "Product"("status");

-- CreateIndex
CREATE INDEX "StockAlert_branchCode_idx" ON "StockAlert"("branchCode");

-- CreateIndex
CREATE INDEX "StockAlert_resolved_idx" ON "StockAlert"("resolved");

-- CreateIndex
CREATE INDEX "StockAlert_createdAt_idx" ON "StockAlert"("createdAt");

-- CreateIndex
CREATE INDEX "User_roleId_idx" ON "User"("roleId");

-- CreateIndex
CREATE INDEX "User_branchId_idx" ON "User"("branchId");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");
