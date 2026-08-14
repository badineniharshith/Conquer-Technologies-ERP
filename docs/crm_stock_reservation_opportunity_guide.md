# CRM Stock Reservation Opportunity Integration Guide

## Executive Summary

This technical guide provides the complete architectural specification for integrating **ERP Stock Reservations** into the **CRM Portal** as **Sales Pipeline Opportunities**.

When a customer or sales executive reserves inventory in the ERP system, this temporary stock lock represents a high-intent commercial deal. Transforming stock reservations into CRM Opportunities enables sales teams to track deal progress, project expected revenue, monitor inventory fulfillment risks, and close orders faster.

---

## 1. Database Table Architecture

To extract complete reservation details and display them as CRM Opportunities, the following database tables across the `public` (ERP/Shared) and `crm` (CRM Portal) schemas are utilized:

| Schema & Table Name | Module | Primary Key | Key Purpose in Opportunity Integration |
| :--- | :--- | :--- | :--- |
| **`public.stock_reservations`** | ERP | `id` (UUID) | Master reservation record (Number, Customer ID, Status, Branch, Expiry Date, Project). |
| **`public.stock_reservation_items`** | ERP | `id` (UUID) | Line items reserved (Product ID, SKU, Product Name, Quantity, Unit Price, Shortage Qty). |
| **`public.customers`** | Shared/CRM | `id` (UUID) | Account details (Company Name, Legal Name, GSTIN, PAN, Email, Phone, Addresses). |
| **`public.products`** | ERP | `id` (UUID) | Hardware & Software Catalog (SKU, Name, Selling Price, Category, Tax %). |
| **`public.inventories`** | ERP | `id` (UUID) | Branch warehouse stock levels (`available_stock`, `reserved_stock`, `allocated_stock`). |
| **`crm.opportunities`** | CRM | `id` (INT / UUID) | CRM Sales Deal Pipeline (Opportunity Name, Account ID, Stage, Value, Close Date). |
| **`crm.purchase_orders`** | CRM/ERP | `id` | Linked CRM Purchase Order when deal is won. |

---

## 2. Field Mapping: ERP Stock Reservation -> CRM Opportunity

Below is the field-by-field mapping between an ERP Stock Reservation and a CRM Opportunity:

| ERP Stock Reservation Field | CRM Opportunity Target Field | Transformation / Logic |
| :--- | :--- | :--- |
| `stock_reservations.reservation_number` | `opportunities.opportunity_number` | Unique deal code (e.g. `RES-2026-0004`). |
| `'Stock Reservation: ' \|\| customer.company_name` | `opportunities.name` | Auto-generated Opportunity Name. |
| `stock_reservations.customer_id` | `opportunities.account_id` / `customer_id` | Links to Customer Account record. |
| `SUM(items.quantity * items.unit_price)` | `opportunities.amount` / `expected_revenue` | Total deal financial value. |
| `stock_reservations.status` | `opportunities.stage` | Mapped using Pipeline Stage Matrix (see Section 3). |
| `stock_reservations.expires_at` | `opportunities.expected_close_date` | Target close date based on reservation hold window. |
| `stock_reservations.branch_code` | `opportunities.territory` / `branch` | Regional sales territory mapping. |
| `stock_reservations.employee_id` | `opportunities.assigned_owner_id` | Sales Executive owner. |
| `SUM(items.shortage_qty)` | `opportunities.fulfillment_risk_flag` | High risk if shortage > 0 units. |

---

## 3. CRM Pipeline Stage Mapping Matrix

| ERP Reservation Status | CRM Opportunity Stage | Deal Probability | Description |
| :--- | :--- | :---: | :--- |
| **`PENDING`** / `Draft` | **Qualification & Stock Locked** | **30%** | Inventory locked, awaiting customer approval. |
| **`VERIFIED`** | **Value Proposition / Stock Verified** | **60%** | Stock availability verified at warehouse. |
| **`PROCESSING`** | **Negotiation / Contract Review** | **85%** | Customer accepted hold; invoice pending. |
| **`ACCEPTED`** / **`COMPLETED`** | **Closed Won** | **100%** | Converted to active Purchase Order / Sales Order. |
| **`REJECTED`** / **`CANCELLED`** | **Closed Lost (Customer Cancelled)** | **0%** | Reservation released back to open inventory. |
| **`EXPIRED`** | **Closed Lost (Holding Expired)** | **0%** | 14-day hold expired without conversion. |

---

## 4. SQL Queries for Complete Reservation Details & CRM Sync

### Query 1: Extract Complete Reservation Details with Customer, Pricing & Inventory Shortage

Use this query in the CRM backend or reporting dashboard to fetch complete stock reservation details:

```sql
SELECT 
    sr.id AS reservation_id,
    sr.reservation_number,
    sr.status AS reservation_status,
    sr.branch_code,
    sr.reserved_at,
    sr.expires_at,
    
    -- Customer Profile Details
    c.id AS customer_id,
    c.company_name,
    c.company_legal_name,
    c.gst_number,
    c.email AS customer_email,
    c.phone AS customer_phone,
    c.billing_address,
    c.shipping_address,
    
    -- Reservation Items Breakdown & Totals
    COUNT(sri.id) AS total_line_items,
    COALESCE(SUM(sri.quantity), 0) AS total_reserved_units,
    COALESCE(SUM(sri.shortage_qty), 0) AS total_shortage_units,
    COALESCE(SUM(sri.quantity * COALESCE(sri.unit_price, p.price, 0)), 0) AS estimated_opportunity_value,
    
    -- Real-time Warehouse Fulfillability Check
    CASE 
        WHEN COALESCE(SUM(sri.shortage_qty), 0) > 0 THEN 'SHORTAGE_DETECTED'
        ELSE 'FULLY_STOCKABLE'
    END AS fulfillment_status

FROM public.stock_reservations sr
INNER JOIN public.customers c ON c.id = sr.customer_id
LEFT JOIN public.stock_reservation_items sri ON sri.reservation_id = sr.id
LEFT JOIN public.products p ON p.id = sri.product_id OR p.sku = sri.sku
WHERE sr.status IN ('PENDING', 'VERIFIED', 'ACCEPTED', 'PROCESSING', 'ACTIVE')
GROUP BY sr.id, c.id
ORDER BY sr.reserved_at DESC;
```

---

### Query 2: Automatically Upsert Stock Reservation as CRM Opportunity

Execute this SQL query to push or sync an ERP Stock Reservation directly into the `crm.opportunities` table:

```sql
INSERT INTO crm.opportunities (
    opportunity_number,
    name,
    customer_id,
    amount,
    stage,
    probability,
    expected_close_date,
    created_at,
    updated_at
)
SELECT 
    sr.reservation_number,
    'Stock Reservation - ' || c.company_name || ' (' || sr.reservation_number || ')',
    c.id,
    COALESCE(SUM(sri.quantity * COALESCE(sri.unit_price, p.price, 0)), 0),
    CASE 
        WHEN sr.status = 'PENDING' THEN 'Qualification'
        WHEN sr.status = 'VERIFIED' THEN 'Value Proposition'
        WHEN sr.status = 'PROCESSING' THEN 'Negotiation'
        WHEN sr.status IN ('ACCEPTED', 'COMPLETED') THEN 'Closed Won'
        ELSE 'Closed Lost'
    END,
    CASE 
        WHEN sr.status = 'PENDING' THEN 30
        WHEN sr.status = 'VERIFIED' THEN 60
        WHEN sr.status = 'PROCESSING' THEN 85
        WHEN sr.status IN ('ACCEPTED', 'COMPLETED') THEN 100
        ELSE 0
    END,
    sr.expires_at,
    NOW(),
    NOW()
FROM public.stock_reservations sr
INNER JOIN public.customers c ON c.id = sr.customer_id
LEFT JOIN public.stock_reservation_items sri ON sri.reservation_id = sr.id
LEFT JOIN public.products p ON p.id = sri.product_id OR p.sku = sri.sku
WHERE sr.id = 'YOUR_RESERVATION_UUID'
GROUP BY sr.id, c.id
ON CONFLICT (opportunity_number) DO UPDATE SET
    amount = EXCLUDED.amount,
    stage = EXCLUDED.stage,
    probability = EXCLUDED.probability,
    expected_close_date = EXCLUDED.expected_close_date,
    updated_at = NOW();
```

---

## 5. REST API Integration Payload Specification

When pushing reservation updates to the CRM API endpoint (`POST /api/crm/reservation-opportunity-sync`), send the following standardized JSON payload:

```json
{
  "event": "RESERVATION_CREATED_OR_UPDATED",
  "reservationId": "res-uuid-98765",
  "reservationNumber": "RES-2026-0004",
  "customer": {
    "id": "cust-uuid-12345",
    "companyName": "Acceldata Solutions Pvt Ltd",
    "legalName": "Acceldata Solutions Private Limited",
    "gstNumber": "36AAACG1234A1Z5",
    "email": "procurement@acceldata.io",
    "phone": "+91 98765 43210",
    "billingAddress": "Plot 42, Hitec City, Hyderabad, TS",
    "shippingAddress": "Plot 42, Hitec City, Hyderabad, TS"
  },
  "crmOpportunity": {
    "opportunityName": "Stock Lock: Acceldata Solutions (RES-2026-0004)",
    "stage": "Stock Reserved",
    "probabilityPercent": 60,
    "totalValueINR": 450000.00,
    "expectedCloseDate": "2026-08-28T00:00:00Z"
  },
  "items": [
    {
      "sku": "APP-MBP-M3-16",
      "productName": "MacBook Pro 16-inch M3 Max",
      "requestedQuantity": 5,
      "unitPrice": 90000.00,
      "discountPercent": 5.0,
      "taxPercent": 18.0,
      "lineTotal": 427500.00,
      "warehouseAvailableStock": 8,
      "shortageQuantity": 0
    }
  ],
  "fulfillmentSummary": {
    "isFullyFulfillable": true,
    "totalShortageUnits": 0,
    "branchCode": "HYD-HQ"
  }
}
```

---

## 6. Implementation Checklist for Developers

- [x] **Database Joins**: Join `stock_reservations` -> `stock_reservation_items` -> `customers` -> `products` -> `inventories`.
- [x] **Shortage Calculation**: Compute `shortage_qty = GREATEST(0, requested_qty - available_stock)`.
- [x] **PO Details Modal**: Render Customer Profile, GSTIN, Addresses, Discounts, and Shortage Badges in ERP UI.
- [x] **Printable PDF Export**: Include formatted PDF printing via `@media print`.
- [x] **CRM Stage Synchronization**: Sync status updates between `public.stock_reservations` and `crm.opportunities`.
