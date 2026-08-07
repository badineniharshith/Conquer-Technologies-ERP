-- ============================================================================
-- Conquer_DB Lightweight PostgreSQL Database Triggers & Functions
-- Trigger Functions for Audit Logs, Updated At Timestamps, Notification Queueing
-- ============================================================================

SET search_path TO conquer_db, public;

-- 1. Automatic updated_at Timestamp Function
CREATE OR REPLACE FUNCTION conquer_db.fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to core tables
DROP TRIGGER IF EXISTS trg_employees_updated_at ON conquer_db.employees;
CREATE TRIGGER trg_employees_updated_at BEFORE UPDATE ON conquer_db.employees FOR EACH ROW EXECUTE FUNCTION conquer_db.fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_crm_users_updated_at ON conquer_db.crm_users;
CREATE TRIGGER trg_crm_users_updated_at BEFORE UPDATE ON conquer_db.crm_users FOR EACH ROW EXECUTE FUNCTION conquer_db.fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_erp_users_updated_at ON conquer_db.erp_users;
CREATE TRIGGER trg_erp_users_updated_at BEFORE UPDATE ON conquer_db.erp_users FOR EACH ROW EXECUTE FUNCTION conquer_db.fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_customers_updated_at ON conquer_db.customers;
CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON conquer_db.customers FOR EACH ROW EXECUTE FUNCTION conquer_db.fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_products_updated_at ON conquer_db.products;
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON conquer_db.products FOR EACH ROW EXECUTE FUNCTION conquer_db.fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_inventory_updated_at ON conquer_db.inventory;
CREATE TRIGGER trg_inventory_updated_at BEFORE UPDATE ON conquer_db.inventory FOR EACH ROW EXECUTE FUNCTION conquer_db.fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_purchase_orders_updated_at ON conquer_db.purchase_orders;
CREATE TRIGGER trg_purchase_orders_updated_at BEFORE UPDATE ON conquer_db.purchase_orders FOR EACH ROW EXECUTE FUNCTION conquer_db.fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_reservations_updated_at ON conquer_db.reservations;
CREATE TRIGGER trg_reservations_updated_at BEFORE UPDATE ON conquer_db.reservations FOR EACH ROW EXECUTE FUNCTION conquer_db.fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_opportunities_updated_at ON conquer_db.opportunities;
CREATE TRIGGER trg_opportunities_updated_at BEFORE UPDATE ON conquer_db.opportunities FOR EACH ROW EXECUTE FUNCTION conquer_db.fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_dispatches_updated_at ON conquer_db.dispatches;
CREATE TRIGGER trg_dispatches_updated_at BEFORE UPDATE ON conquer_db.dispatches FOR EACH ROW EXECUTE FUNCTION conquer_db.fn_set_updated_at();

-- 2. Audit Logging Trigger Function
CREATE OR REPLACE FUNCTION conquer_db.fn_audit_log_trigger()
RETURNS TRIGGER AS $$
DECLARE
    entity_id_val VARCHAR(128);
    action_type VARCHAR(255);
BEGIN
    IF (TG_OP = 'DELETE') THEN
        entity_id_val := OLD.id::text;
        action_type := 'DELETE_' || TG_TABLE_NAME;
    ELSIF (TG_OP = 'UPDATE') THEN
        entity_id_val := NEW.id::text;
        action_type := 'UPDATE_' || TG_TABLE_NAME;
    ELSIF (TG_OP = 'INSERT') THEN
        entity_id_val := NEW.id::text;
        action_type := 'INSERT_' || TG_TABLE_NAME;
    END IF;

    INSERT INTO conquer_db.audit_logs (
        id, user_id, action, entity_type, entity_id, details, timestamp
    ) VALUES (
        'audit-' || gen_random_uuid()::text,
        'system',
        action_type,
        TG_TABLE_NAME,
        entity_id_val,
        json_build_object('op', TG_OP, 'table', TG_TABLE_NAME)::text,
        CURRENT_TIMESTAMP
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply Audit Log Triggers
DROP TRIGGER IF EXISTS trg_audit_purchase_orders ON conquer_db.purchase_orders;
CREATE TRIGGER trg_audit_purchase_orders AFTER INSERT OR UPDATE OR DELETE ON conquer_db.purchase_orders FOR EACH ROW EXECUTE FUNCTION conquer_db.fn_audit_log_trigger();

DROP TRIGGER IF EXISTS trg_audit_reservations ON conquer_db.reservations;
CREATE TRIGGER trg_audit_reservations AFTER INSERT OR UPDATE OR DELETE ON conquer_db.reservations FOR EACH ROW EXECUTE FUNCTION conquer_db.fn_audit_log_trigger();

DROP TRIGGER IF EXISTS trg_audit_dispatches ON conquer_db.dispatches;
CREATE TRIGGER trg_audit_dispatches AFTER INSERT OR UPDATE OR DELETE ON conquer_db.dispatches FOR EACH ROW EXECUTE FUNCTION conquer_db.fn_audit_log_trigger();

-- 3. Notification Queue Enqueue Trigger Function
CREATE OR REPLACE FUNCTION conquer_db.fn_enqueue_notification()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_TABLE_NAME = 'purchase_orders' AND TG_OP = 'INSERT') THEN
        INSERT INTO conquer_db.notification_queue (
            id, event_type, recipient_role, title, message, payload_json, created_at
        ) VALUES (
            'noti-' || gen_random_uuid()::text,
            'PO_CREATED',
            'OPERATIONS_EXECUTIVE',
            'New Purchase Order Created',
            'PO ' || NEW.po_number || ' received and waiting for verification.',
            json_build_object('po_id', NEW.id, 'po_number', NEW.po_number)::text,
            CURRENT_TIMESTAMP
        );
    ELSIF (TG_TABLE_NAME = 'reservations' AND TG_OP = 'INSERT') THEN
        INSERT INTO conquer_db.notification_queue (
            id, event_type, recipient_role, title, message, payload_json, created_at
        ) VALUES (
            'noti-' || gen_random_uuid()::text,
            'RESERVATION_COMPLETED',
            'SALES_EXECUTIVE',
            'Stock Reservation Completed',
            'Reservation ' || NEW.reservation_number || ' has been placed for customer PO.',
            json_build_object('reservation_id', NEW.id, 'po_id', NEW.po_id)::text,
            CURRENT_TIMESTAMP
        );
    ELSIF (TG_TABLE_NAME = 'dispatches' AND TG_OP = 'INSERT') THEN
        INSERT INTO conquer_db.notification_queue (
            id, event_type, recipient_role, title, message, payload_json, created_at
        ) VALUES (
            'noti-' || gen_random_uuid()::text,
            'DISPATCH_READY',
            'OPERATIONS_MANAGER',
            'Dispatch Order Created',
            'Dispatch ' || NEW.dispatch_number || ' is ready for shipment.',
            json_build_object('dispatch_id', NEW.id, 'status', NEW.status)::text,
            CURRENT_TIMESTAMP
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply Notification Enqueue Triggers
DROP TRIGGER IF EXISTS trg_notify_po_created ON conquer_db.purchase_orders;
CREATE TRIGGER trg_notify_po_created AFTER INSERT ON conquer_db.purchase_orders FOR EACH ROW EXECUTE FUNCTION conquer_db.fn_enqueue_notification();

DROP TRIGGER IF EXISTS trg_notify_reservation_created ON conquer_db.reservations;
CREATE TRIGGER trg_notify_reservation_created AFTER INSERT ON conquer_db.reservations FOR EACH ROW EXECUTE FUNCTION conquer_db.fn_enqueue_notification();

DROP TRIGGER IF EXISTS trg_notify_dispatch_created ON conquer_db.dispatches;
CREATE TRIGGER trg_notify_dispatch_created AFTER INSERT ON conquer_db.dispatches FOR EACH ROW EXECUTE FUNCTION conquer_db.fn_enqueue_notification();
