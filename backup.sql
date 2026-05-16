--
-- PostgreSQL database dump
--

\restrict 6R3XMLusW84XCaQtQtvKuV39Sdiy6h02sjtwlgcREyUv0ivZ2xAArPaxA8nIXQU

-- Dumped from database version 17.7
-- Dumped by pg_dump version 17.7

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: auto_generate_invoice_pdf(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_generate_invoice_pdf() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Only generate PDF when invoice status changes to 'sent'
  IF NEW.status = 'sent' AND (OLD.status IS NULL OR OLD.status != 'sent') THEN
    -- Update the record with timestamp (actual PDF generation happens in app layer)
    NEW.pdf_generated_at := NOW();
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: fn_fixed_assets_before_insert(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_fixed_assets_before_insert() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.net_book_value = NEW.purchase_cost - NEW.accumulated_depr;
  RETURN NEW;
END;
$$;


--
-- Name: fn_fixed_assets_before_update(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_fixed_assets_before_update() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Auto-update timestamp
  NEW.updated_at = NOW();

  -- ✅ Keep net_book_value in sync
  NEW.net_book_value = NEW.purchase_cost - NEW.accumulated_depr;

  -- Auto-update status when fully depreciated
  IF NEW.net_book_value <= NEW.salvage_value AND NEW.status = 'active' THEN
    NEW.status = 'fully_depreciated';
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: generate_credit_note_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_credit_note_number() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      DECLARE
        year INTEGER;
        next_num INTEGER;
      BEGIN
        year := EXTRACT(YEAR FROM NEW.return_date);
        
        -- Find the maximum number for this year
        SELECT COALESCE(
          MAX(
            CAST(
              SUBSTRING(credit_note_number FROM 'CN-' || year || '-(\d+)') 
              AS INTEGER
            )
          ), 
          0
        ) + 1
        INTO next_num
        FROM credit_notes
        WHERE credit_note_number LIKE 'CN-' || year || '-%';
        
        -- Generate the new number
        NEW.credit_note_number := 'CN-' || year || '-' || LPAD(next_num::TEXT, 5, '0');
        
        RETURN NEW;
      END;
      $$;


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_attendance_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_attendance_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_budgets_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_budgets_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_goods_receipts_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_goods_receipts_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_inventory_items_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_inventory_items_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_milestone_amounts(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_milestone_amounts() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Recalculate milestone amounts based on new contract value
  UPDATE contract_milestones
  SET milestone_amount = ROUND(NEW.total_value * milestone_percentage / 100, 2),
      updated_at = NOW()
  WHERE contract_id = NEW.id
    AND status = 'pending';
  
  RETURN NEW;
END;
$$;


--
-- Name: update_purchase_invoices_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_purchase_invoices_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_purchase_orders_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_purchase_orders_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_sales_invoice_items_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_sales_invoice_items_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$;


--
-- Name: update_suppliers_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_suppliers_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_time_logs_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_time_logs_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$;


--
-- Name: update_warehouse_stock_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_warehouse_stock_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_warehouses_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_warehouses_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: approval_steps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.approval_steps (
    id integer NOT NULL,
    quotation_id integer NOT NULL,
    step_order integer NOT NULL,
    role_required character varying(100) NOT NULL,
    approved_by integer,
    status character varying(30) DEFAULT 'pending'::character varying NOT NULL,
    comments text,
    decided_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: approval_steps_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.approval_steps_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: approval_steps_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.approval_steps_id_seq OWNED BY public.approval_steps.id;


--
-- Name: assets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assets (
    id integer NOT NULL,
    project_id integer,
    name character varying(255) NOT NULL,
    serial_number character varying(255) NOT NULL,
    category character varying(100),
    status character varying(50) DEFAULT 'available'::character varying NOT NULL,
    location character varying(255),
    assigned_to integer,
    warranty_start_date date,
    warranty_end_date date,
    purchase_date date,
    purchase_price numeric(16,2),
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: assets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.assets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: assets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.assets_id_seq OWNED BY public.assets.id;


--
-- Name: attendance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attendance (
    id integer NOT NULL,
    employee_id integer NOT NULL,
    attendance_date date NOT NULL,
    department_id integer,
    expected_hours numeric(4,2) DEFAULT 8.00 NOT NULL,
    actual_hours numeric(5,2) DEFAULT 0.00 NOT NULL,
    overtime_hours numeric(5,2) DEFAULT 0.00 NOT NULL,
    overtime_rate numeric(10,2) DEFAULT 1.50 NOT NULL,
    late_minutes integer DEFAULT 0 NOT NULL,
    status character varying(20) DEFAULT 'present'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    notes text,
    CONSTRAINT attendance_status_check CHECK (((status)::text = ANY ((ARRAY['present'::character varying, 'absent'::character varying, 'late'::character varying, 'half_day'::character varying, 'leave'::character varying])::text[])))
);


--
-- Name: TABLE attendance; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.attendance IS 'Daily attendance records with hours worked and overtime';


--
-- Name: COLUMN attendance.employee_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.attendance.employee_id IS 'FK to employees.id (45-column structure)';


--
-- Name: COLUMN attendance.department_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.attendance.department_id IS 'FK to departments.id - copied at clock-in time';


--
-- Name: COLUMN attendance.overtime_hours; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.attendance.overtime_hours IS 'Hours beyond expected_hours (8.00 default)';


--
-- Name: COLUMN attendance.overtime_rate; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.attendance.overtime_rate IS 'Multiplier for overtime calculation (default 1.5x)';


--
-- Name: COLUMN attendance.late_minutes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.attendance.late_minutes IS 'Minutes late from scheduled start time';


--
-- Name: attendance_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.attendance_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: attendance_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.attendance_id_seq OWNED BY public.attendance.id;


--
-- Name: budgets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.budgets (
    id integer NOT NULL,
    budget_code character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    name_ar character varying(255),
    fiscal_year integer NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    total_amount numeric(15,2) DEFAULT 0 NOT NULL,
    department character varying(50),
    cost_center character varying(100),
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    notes text,
    created_by integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT chk_budget_amount CHECK ((total_amount >= (0)::numeric)),
    CONSTRAINT chk_budget_dates CHECK ((end_date > start_date)),
    CONSTRAINT chk_budget_status CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'active'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- Name: TABLE budgets; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.budgets IS 'Budget tracking and cost center management';


--
-- Name: COLUMN budgets.budget_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.budgets.budget_code IS 'Unique budget identifier (auto-generated)';


--
-- Name: COLUMN budgets.fiscal_year; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.budgets.fiscal_year IS 'Fiscal year for the budget';


--
-- Name: COLUMN budgets.department; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.budgets.department IS 'Department this budget applies to (NULL = company-wide)';


--
-- Name: COLUMN budgets.cost_center; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.budgets.cost_center IS 'Optional cost center identifier for granular tracking';


--
-- Name: COLUMN budgets.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.budgets.status IS 'draft: initial, active: in use, completed: ended, cancelled: voided';


--
-- Name: budgets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.budgets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: budgets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.budgets_id_seq OWNED BY public.budgets.id;


--
-- Name: chart_of_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chart_of_accounts (
    id integer NOT NULL,
    account_code character varying(20) NOT NULL,
    account_name character varying(200) NOT NULL,
    account_type character varying(50) NOT NULL,
    parent_id integer,
    normal_balance character varying(10) DEFAULT 'debit'::character varying NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    parent_account_id integer,
    code character varying(20),
    level integer DEFAULT 1,
    account_name_ar character varying(255),
    is_vat_applicable boolean DEFAULT false NOT NULL,
    vat_rate numeric(5,2) DEFAULT 15.00,
    cost_center_type character varying(50),
    linked_entity_id integer,
    financial_statement character varying(50),
    report_category character varying(50),
    depreciation_method character varying(50),
    useful_life_years integer,
    salvage_value numeric(15,2) DEFAULT 0.00,
    CONSTRAINT chart_of_accounts_cost_center_type_check CHECK (((cost_center_type)::text = ANY ((ARRAY['project'::character varying, 'vehicle'::character varying, 'employee'::character varying, 'department'::character varying, NULL::character varying])::text[]))),
    CONSTRAINT chart_of_accounts_depreciation_method_check CHECK (((depreciation_method)::text = ANY ((ARRAY['straight_line'::character varying, 'declining_balance'::character varying, 'units_of_production'::character varying, NULL::character varying])::text[]))),
    CONSTRAINT chart_of_accounts_financial_statement_check CHECK (((financial_statement)::text = ANY ((ARRAY['balance_sheet'::character varying, 'income_statement'::character varying, 'cash_flow'::character varying, 'equity_statement'::character varying, NULL::character varying])::text[])))
);


--
-- Name: TABLE chart_of_accounts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.chart_of_accounts IS 'Recursive tree structure for accounting';


--
-- Name: COLUMN chart_of_accounts.account_name_ar; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.chart_of_accounts.account_name_ar IS 'Arabic account name for bilingual support';


--
-- Name: COLUMN chart_of_accounts.is_vat_applicable; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.chart_of_accounts.is_vat_applicable IS 'Whether VAT applies to transactions on this account';


--
-- Name: COLUMN chart_of_accounts.vat_rate; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.chart_of_accounts.vat_rate IS 'VAT rate percentage (default 15%)';


--
-- Name: COLUMN chart_of_accounts.cost_center_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.chart_of_accounts.cost_center_type IS 'Type of cost center: project, vehicle, employee, or department';


--
-- Name: COLUMN chart_of_accounts.linked_entity_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.chart_of_accounts.linked_entity_id IS 'ID of linked entity (project_id, employee_id, etc.)';


--
-- Name: COLUMN chart_of_accounts.financial_statement; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.chart_of_accounts.financial_statement IS 'Which financial statement this account belongs to';


--
-- Name: COLUMN chart_of_accounts.report_category; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.chart_of_accounts.report_category IS 'Detailed category for reporting (e.g., current_asset, operating_expense)';


--
-- Name: COLUMN chart_of_accounts.depreciation_method; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.chart_of_accounts.depreciation_method IS 'Depreciation method for fixed asset accounts';


--
-- Name: COLUMN chart_of_accounts.useful_life_years; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.chart_of_accounts.useful_life_years IS 'Expected useful life in years for depreciation calculation';


--
-- Name: COLUMN chart_of_accounts.salvage_value; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.chart_of_accounts.salvage_value IS 'Estimated salvage/residual value at end of useful life';


--
-- Name: chart_of_accounts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.chart_of_accounts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: chart_of_accounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.chart_of_accounts_id_seq OWNED BY public.chart_of_accounts.id;


--
-- Name: client_support_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_support_messages (
    id integer NOT NULL,
    project_id integer NOT NULL,
    client_id integer NOT NULL,
    sales_rep_id integer NOT NULL,
    message text NOT NULL,
    is_from_client boolean DEFAULT true NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    parent_message_id integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE client_support_messages; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.client_support_messages IS 'Chat messages between clients and their assigned sales representatives';


--
-- Name: COLUMN client_support_messages.is_from_client; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.client_support_messages.is_from_client IS 'Direction of message: true=client sent, false=sales rep replied';


--
-- Name: COLUMN client_support_messages.parent_message_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.client_support_messages.parent_message_id IS 'For threading/reply tracking';


--
-- Name: client_support_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.client_support_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: client_support_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.client_support_messages_id_seq OWNED BY public.client_support_messages.id;


--
-- Name: contract_amendments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contract_amendments (
    id integer NOT NULL,
    contract_id integer NOT NULL,
    amendment_number character varying(20) NOT NULL,
    amendment_date date DEFAULT CURRENT_DATE NOT NULL,
    description text NOT NULL,
    field_changed character varying(50) NOT NULL,
    old_value text,
    new_value text,
    approved_by integer,
    approved_at timestamp with time zone,
    attachment_url character varying(500),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE contract_amendments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.contract_amendments IS 'Track amendments and changes to contracts for audit trail';


--
-- Name: contract_amendments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.contract_amendments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: contract_amendments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.contract_amendments_id_seq OWNED BY public.contract_amendments.id;


--
-- Name: contract_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contract_items (
    id integer NOT NULL,
    contract_id integer NOT NULL,
    item_name character varying(200) NOT NULL,
    item_name_ar character varying(200),
    quantity numeric(10,2) DEFAULT 1 NOT NULL,
    unit_price numeric(15,2) NOT NULL,
    vat_applicable boolean DEFAULT true NOT NULL,
    vat_rate numeric(5,2) DEFAULT 15.00,
    line_total numeric(15,2) GENERATED ALWAYS AS ((quantity * unit_price)) STORED,
    vat_amount numeric(15,2) GENERATED ALWAYS AS (
CASE
    WHEN vat_applicable THEN round((((quantity * unit_price) * vat_rate) / (100)::numeric), 2)
    ELSE (0)::numeric
END) STORED,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE contract_items; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.contract_items IS 'Detailed line items for contracts with automatic VAT calculation';


--
-- Name: COLUMN contract_items.item_name_ar; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.contract_items.item_name_ar IS 'Arabic item name for bilingual support';


--
-- Name: COLUMN contract_items.line_total; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.contract_items.line_total IS 'Auto-calculated: quantity × unit_price';


--
-- Name: COLUMN contract_items.vat_amount; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.contract_items.vat_amount IS 'Auto-calculated VAT based on rate';


--
-- Name: contract_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.contract_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: contract_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.contract_items_id_seq OWNED BY public.contract_items.id;


--
-- Name: contract_milestones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contract_milestones (
    id integer NOT NULL,
    contract_id integer NOT NULL,
    milestone_name character varying(200) NOT NULL,
    milestone_name_ar character varying(200),
    milestone_percentage numeric(5,2) NOT NULL,
    milestone_amount numeric(15,2) NOT NULL,
    status character varying(30) DEFAULT 'pending'::character varying NOT NULL,
    invoice_id integer,
    due_date date,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE contract_milestones; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.contract_milestones IS 'Payment milestones/schedule for contracts linked to invoices';


--
-- Name: COLUMN contract_milestones.milestone_percentage; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.contract_milestones.milestone_percentage IS 'Percentage of total contract value';


--
-- Name: COLUMN contract_milestones.invoice_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.contract_milestones.invoice_id IS 'Links to generated invoice when milestone is billed';


--
-- Name: contract_milestones_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.contract_milestones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: contract_milestones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.contract_milestones_id_seq OWNED BY public.contract_milestones.id;


--
-- Name: contracts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contracts (
    id integer NOT NULL,
    contract_number character varying(100) NOT NULL,
    client_id integer NOT NULL,
    project_id integer NOT NULL,
    total_value numeric(15,2) DEFAULT 0 NOT NULL,
    currency character varying(10) DEFAULT 'SAR'::character varying,
    status character varying(30) DEFAULT 'active'::character varying,
    start_date date,
    end_date date,
    vat_applicable boolean DEFAULT true NOT NULL,
    vat_rate numeric(5,2) DEFAULT 15.00,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by integer,
    contract_type character varying(50) DEFAULT 'supply'::character varying,
    payment_terms text,
    description text,
    attachment_url character varying(500),
    signed_by_client boolean DEFAULT false,
    signed_by_company boolean DEFAULT false,
    client_signature_date timestamp with time zone,
    company_signature_date timestamp with time zone,
    contract_pdf character varying(500)
);


--
-- Name: COLUMN contracts.vat_applicable; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.contracts.vat_applicable IS 'Whether VAT applies to this contract (default true)';


--
-- Name: COLUMN contracts.vat_rate; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.contracts.vat_rate IS 'VAT rate percentage (default 15% for Saudi Arabia)';


--
-- Name: COLUMN contracts.created_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.contracts.created_by IS 'The user ID who created this contract';


--
-- Name: COLUMN contracts.contract_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.contracts.contract_type IS 'Type of contract: supply, maintenance, installation, etc.';


--
-- Name: COLUMN contracts.payment_terms; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.contracts.payment_terms IS 'شروط الدفع المتفق عليها (مثلاً: دفعة مقدمة 30%)';


--
-- Name: COLUMN contracts.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.contracts.description IS 'وصف تفصيلي أو ملاحظات إضافية على العقد';


--
-- Name: COLUMN contracts.attachment_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.contracts.attachment_url IS 'رابط نسخة العقد الأصلية الممسوحة ضوئياً (المرفوعة يدويًا)';


--
-- Name: COLUMN contracts.signed_by_client; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.contracts.signed_by_client IS 'هل تم توقيع العقد من العميل؟ (TRUE/FALSE)';


--
-- Name: COLUMN contracts.signed_by_company; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.contracts.signed_by_company IS 'هل تم توقيع العقد من الشركة؟ (TRUE/FALSE)';


--
-- Name: COLUMN contracts.contract_pdf; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.contracts.contract_pdf IS 'رابط نسخة العقد الإلكترونية المولدة آلياً بواسطة النظام';


--
-- Name: contracts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.contracts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: contracts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.contracts_id_seq OWNED BY public.contracts.id;


--
-- Name: credit_note_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.credit_note_items (
    id integer NOT NULL,
    credit_note_id integer NOT NULL,
    description text NOT NULL,
    quantity numeric(10,2) DEFAULT 1 NOT NULL,
    unit_price numeric(15,2) NOT NULL,
    discount_amount numeric(15,2) DEFAULT 0 NOT NULL,
    tax_rate numeric(5,2) DEFAULT 15.00,
    tax_amount numeric(15,2) DEFAULT 0 NOT NULL,
    line_total numeric(15,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: COLUMN credit_note_items.credit_note_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.credit_note_items.credit_note_id IS 'Parent credit note';


--
-- Name: credit_note_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.credit_note_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: credit_note_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.credit_note_items_id_seq OWNED BY public.credit_note_items.id;


--
-- Name: credit_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.credit_notes (
    id integer NOT NULL,
    credit_note_number character varying(50) NOT NULL,
    invoice_id integer NOT NULL,
    client_id integer NOT NULL,
    project_id integer,
    lead_id integer,
    subtotal numeric(15,2) DEFAULT 0 NOT NULL,
    discount_amount numeric(15,2) DEFAULT 0 NOT NULL,
    tax_rate numeric(5,2) DEFAULT 15.00,
    tax_amount numeric(15,2) DEFAULT 0 NOT NULL,
    total_amount numeric(15,2) NOT NULL,
    reason text NOT NULL,
    return_date date DEFAULT CURRENT_DATE NOT NULL,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    revenue_account_id integer,
    tax_account_id integer,
    discount_account_id integer,
    receivable_account_id integer,
    qr_code text,
    zatca_uuid uuid,
    notes text,
    created_by integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT credit_notes_status_check CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'final'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- Name: TABLE credit_notes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.credit_notes IS 'Credit notes for sales returns (ZATCA compliant)';


--
-- Name: COLUMN credit_notes.credit_note_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.credit_notes.credit_note_number IS 'Unique credit note number (CN-YYYY-NNNN)';


--
-- Name: COLUMN credit_notes.invoice_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.credit_notes.invoice_id IS 'Original sales invoice being returned';


--
-- Name: COLUMN credit_notes.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.credit_notes.status IS 'draft, final, or cancelled';


--
-- Name: COLUMN credit_notes.qr_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.credit_notes.qr_code IS 'ZATCA QR code for compliance';


--
-- Name: credit_notes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.credit_notes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: credit_notes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.credit_notes_id_seq OWNED BY public.credit_notes.id;


--
-- Name: departments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.departments (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    icon character varying(100),
    is_active boolean DEFAULT true NOT NULL,
    created_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    dept_type character varying(20) DEFAULT 'administrative'::character varying NOT NULL,
    CONSTRAINT departments_dept_type_check CHECK (((dept_type)::text = ANY ((ARRAY['administrative'::character varying, 'technical'::character varying])::text[])))
);


--
-- Name: COLUMN departments.dept_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.departments.dept_type IS 'Department type: administrative (HQ) or technical (work sections)';


--
-- Name: departments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.departments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: departments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.departments_id_seq OWNED BY public.departments.id;


--
-- Name: documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documents (
    id integer NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id integer NOT NULL,
    file_name character varying(255) NOT NULL,
    file_path text NOT NULL,
    file_size integer,
    mime_type character varying(100),
    uploaded_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: documents_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.documents_id_seq OWNED BY public.documents.id;


--
-- Name: employee_evaluations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_evaluations (
    id integer NOT NULL,
    employee_id integer NOT NULL,
    evaluator_id integer,
    evaluation_type character varying(30) DEFAULT 'annual'::character varying NOT NULL,
    project_id integer,
    period character varying(50),
    score numeric(4,2),
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: employee_evaluations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.employee_evaluations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: employee_evaluations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.employee_evaluations_id_seq OWNED BY public.employee_evaluations.id;


--
-- Name: employee_leave_balances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_leave_balances (
    id integer NOT NULL,
    employee_id integer NOT NULL,
    leave_type character varying(50) NOT NULL,
    total_allowed integer DEFAULT 21 NOT NULL,
    used integer DEFAULT 0 NOT NULL,
    remaining integer DEFAULT 21 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: employee_leave_balances_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.employee_leave_balances_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: employee_leave_balances_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.employee_leave_balances_id_seq OWNED BY public.employee_leave_balances.id;


--
-- Name: employees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employees (
    id integer NOT NULL,
    user_id integer,
    department_id integer,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    arabic_name character varying(200),
    nationality character varying(100),
    date_of_birth date,
    gender character varying(10),
    marital_status character varying(20),
    religion character varying(50),
    personal_email character varying(255),
    personal_phone character varying(30),
    emergency_contact character varying(100),
    emergency_phone character varying(30),
    passport_number character varying(100),
    passport_expiry date,
    passport_file_path text,
    national_id character varying(100),
    national_id_expiry date,
    residence_permit character varying(100),
    residence_expiry date,
    residence_file_path text,
    employee_number character varying(50) NOT NULL,
    job_title character varying(150),
    employment_type character varying(50) DEFAULT 'full_time'::character varying NOT NULL,
    contract_start_date date,
    contract_end_date date,
    contract_file_path text,
    probation_end_date date,
    status character varying(30) DEFAULT 'active'::character varying NOT NULL,
    basic_salary numeric(12,2) DEFAULT 0 NOT NULL,
    housing_allowance numeric(12,2) DEFAULT 0 NOT NULL,
    transport_allowance numeric(12,2) DEFAULT 0 NOT NULL,
    other_allowances numeric(12,2) DEFAULT 0 NOT NULL,
    currency character varying(10) DEFAULT 'SAR'::character varying NOT NULL,
    bank_name character varying(100),
    bank_account character varying(100),
    iban character varying(100),
    created_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    id_document_url character varying(500),
    gosi_registered boolean DEFAULT false NOT NULL,
    payroll_status boolean DEFAULT false,
    national_id_file_path text
);


--
-- Name: employees_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.employees_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: employees_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.employees_id_seq OWNED BY public.employees.id;


--
-- Name: expense_vouchers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expense_vouchers (
    id integer NOT NULL,
    voucher_number character varying(50) NOT NULL,
    expense_date date DEFAULT CURRENT_DATE NOT NULL,
    expense_amount numeric(15,2) NOT NULL,
    expense_account_id integer NOT NULL,
    payment_account_id integer NOT NULL,
    payment_method character varying(50) DEFAULT 'cash'::character varying NOT NULL,
    description text NOT NULL,
    reference_number character varying(100),
    notes text,
    status character varying(50) DEFAULT 'completed'::character varying,
    created_by integer,
    approved_by integer,
    journal_entry_id integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT expense_vouchers_expense_amount_check CHECK ((expense_amount > (0)::numeric))
);


--
-- Name: TABLE expense_vouchers; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.expense_vouchers IS 'General expense vouchers with automatic journal entry generation';


--
-- Name: COLUMN expense_vouchers.voucher_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.expense_vouchers.voucher_number IS 'Auto-generated format: EX-YYYY-XXXX';


--
-- Name: COLUMN expense_vouchers.expense_account_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.expense_vouchers.expense_account_id IS 'References COA 32xxx (Administrative Expenses)';


--
-- Name: COLUMN expense_vouchers.payment_account_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.expense_vouchers.payment_account_id IS 'References COA 12301 (Cash) or 122 (Bank)';


--
-- Name: COLUMN expense_vouchers.journal_entry_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.expense_vouchers.journal_entry_id IS 'Link to auto-generated journal entry';


--
-- Name: expense_vouchers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.expense_vouchers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: expense_vouchers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.expense_vouchers_id_seq OWNED BY public.expense_vouchers.id;


--
-- Name: expenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expenses (
    id integer NOT NULL,
    expense_number character varying(100) NOT NULL,
    project_id integer NOT NULL,
    account_id integer NOT NULL,
    amount numeric(15,2) NOT NULL,
    payment_method character varying(50),
    petty_cash_fund_id integer,
    description text,
    receipt_url character varying(500),
    notes text,
    status character varying(30) DEFAULT 'pending'::character varying,
    created_by integer,
    expense_date date DEFAULT CURRENT_DATE,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE expenses; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.expenses IS 'Site expense tracking';


--
-- Name: expenses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.expenses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: expenses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.expenses_id_seq OWNED BY public.expenses.id;


--
-- Name: fixed_assets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fixed_assets (
    id integer NOT NULL,
    asset_number character varying(50) NOT NULL,
    asset_name character varying(255) NOT NULL,
    asset_name_ar character varying(255),
    category character varying(50) NOT NULL,
    coa_account_code character varying(20) NOT NULL,
    accum_depr_account character varying(20) NOT NULL,
    depr_expense_account character varying(20) NOT NULL,
    purchase_date date NOT NULL,
    purchase_cost numeric(15,2) NOT NULL,
    salvage_value numeric(15,2) DEFAULT 0 NOT NULL,
    useful_life_years integer NOT NULL,
    depreciation_method character varying(20) DEFAULT 'straight_line'::character varying NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    accumulated_depr numeric(15,2) DEFAULT 0 NOT NULL,
    net_book_value numeric(15,2) DEFAULT 0 NOT NULL,
    disposal_date date,
    disposal_amount numeric(15,2),
    disposal_gain_loss numeric(15,2),
    project_id integer,
    created_by integer,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT chk_depreciation_method CHECK (((depreciation_method)::text = ANY ((ARRAY['straight_line'::character varying, 'declining_balance'::character varying])::text[]))),
    CONSTRAINT chk_purchase_cost CHECK ((purchase_cost > (0)::numeric)),
    CONSTRAINT chk_salvage_value CHECK ((salvage_value >= (0)::numeric)),
    CONSTRAINT chk_status CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'disposed'::character varying, 'fully_depreciated'::character varying])::text[]))),
    CONSTRAINT chk_useful_life CHECK ((useful_life_years > 0))
);


--
-- Name: TABLE fixed_assets; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.fixed_assets IS 'Fixed asset register with depreciation tracking and disposal workflow';


--
-- Name: COLUMN fixed_assets.asset_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.fixed_assets.asset_number IS 'Unique asset identifier e.g. FA-0001';


--
-- Name: COLUMN fixed_assets.category; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.fixed_assets.category IS 'leasehold | furniture | vehicle | machinery | computer | tools | software';


--
-- Name: COLUMN fixed_assets.coa_account_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.fixed_assets.coa_account_code IS 'Asset COA account e.g. 11103 (Vehicles)';


--
-- Name: COLUMN fixed_assets.accum_depr_account; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.fixed_assets.accum_depr_account IS 'Accumulated depreciation COA account e.g. 11203';


--
-- Name: COLUMN fixed_assets.depr_expense_account; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.fixed_assets.depr_expense_account IS 'Depreciation expense COA account e.g. 32303';


--
-- Name: COLUMN fixed_assets.net_book_value; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.fixed_assets.net_book_value IS 'purchase_cost - accumulated_depr, kept in sync by trigger';


--
-- Name: COLUMN fixed_assets.disposal_gain_loss; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.fixed_assets.disposal_gain_loss IS 'Positive = gain on disposal, Negative = loss on disposal';


--
-- Name: fixed_assets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.fixed_assets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fixed_assets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fixed_assets_id_seq OWNED BY public.fixed_assets.id;


--
-- Name: goods_receipt_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.goods_receipt_items (
    id integer NOT NULL,
    grn_id integer NOT NULL,
    po_item_id integer NOT NULL,
    item_id integer NOT NULL,
    quantity_received numeric(15,3) NOT NULL,
    unit_cost numeric(15,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT chk_gr_item_qty CHECK ((quantity_received > (0)::numeric))
);


--
-- Name: TABLE goods_receipt_items; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.goods_receipt_items IS 'Line items within goods receipts';


--
-- Name: goods_receipt_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.goods_receipt_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: goods_receipt_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.goods_receipt_items_id_seq OWNED BY public.goods_receipt_items.id;


--
-- Name: goods_receipts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.goods_receipts (
    id integer NOT NULL,
    grn_number character varying(50) NOT NULL,
    po_id integer NOT NULL,
    receipt_date date DEFAULT CURRENT_DATE NOT NULL,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    notes text,
    created_by integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT chk_grn_status CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'posted'::character varying])::text[])))
);


--
-- Name: TABLE goods_receipts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.goods_receipts IS 'Goods receipt notes (GRN) for received items';


--
-- Name: goods_receipts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.goods_receipts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: goods_receipts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.goods_receipts_id_seq OWNED BY public.goods_receipts.id;


--
-- Name: inspection_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inspection_reports (
    id integer NOT NULL,
    lead_id integer NOT NULL,
    user_id integer NOT NULL,
    report_text text,
    file_url character varying(500),
    images_urls jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: inspection_reports_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.inspection_reports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: inspection_reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.inspection_reports_id_seq OWNED BY public.inspection_reports.id;


--
-- Name: inspections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inspections (
    id integer NOT NULL,
    lead_id integer NOT NULL,
    assigned_engineer_id integer,
    inspection_date timestamp with time zone,
    priority character varying(20) DEFAULT 'medium'::character varying NOT NULL,
    status character varying(50) DEFAULT 'scheduled'::character varying NOT NULL,
    location text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: inspections_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.inspections_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: inspections_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.inspections_id_seq OWNED BY public.inspections.id;


--
-- Name: installed_assets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.installed_assets (
    id integer NOT NULL,
    asset_name character varying(255) NOT NULL,
    client_id integer NOT NULL,
    project_id integer NOT NULL,
    category character varying(100) NOT NULL,
    serial_number character varying(100) NOT NULL,
    installation_date date DEFAULT CURRENT_DATE NOT NULL,
    location_address text,
    latitude numeric(10,8),
    longitude numeric(11,8),
    assigned_engineer_id integer,
    warranty_expiry date,
    status character varying(30) DEFAULT 'operational'::character varying NOT NULL,
    manufacturer character varying(255),
    model_number character varying(100),
    power_rating character varying(50),
    notes text,
    created_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE installed_assets; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.installed_assets IS 'Customer-owned assets installed at project sites for maintenance tracking';


--
-- Name: COLUMN installed_assets.category; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.installed_assets.category IS 'فئة الأصل - Equipment category/type';


--
-- Name: COLUMN installed_assets.warranty_expiry; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.installed_assets.warranty_expiry IS 'Used for auto-alerts 30 days before expiry';


--
-- Name: installed_assets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.installed_assets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: installed_assets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.installed_assets_id_seq OWNED BY public.installed_assets.id;


--
-- Name: inventory_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_items (
    id integer NOT NULL,
    item_code character varying(50) NOT NULL,
    item_name character varying(255) NOT NULL,
    item_name_ar character varying(255),
    category character varying(50) NOT NULL,
    unit_of_measure character varying(20) DEFAULT 'pcs'::character varying NOT NULL,
    coa_account_code character varying(20) NOT NULL,
    cost_account_code character varying(20) NOT NULL,
    unit_cost numeric(15,2) DEFAULT 0 NOT NULL,
    quantity_on_hand numeric(15,3) DEFAULT 0 NOT NULL,
    reorder_level numeric(15,3) DEFAULT 0,
    is_active boolean DEFAULT true,
    notes text,
    created_by integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    default_warehouse_id integer,
    CONSTRAINT chk_uom CHECK (((unit_of_measure)::text = ANY ((ARRAY['pcs'::character varying, 'm'::character varying, 'kg'::character varying, 'set'::character varying, 'box'::character varying, 'roll'::character varying])::text[])))
);


--
-- Name: TABLE inventory_items; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.inventory_items IS 'Master catalog of inventory items';


--
-- Name: COLUMN inventory_items.default_warehouse_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inventory_items.default_warehouse_id IS 'Default warehouse for this item';


--
-- Name: inventory_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.inventory_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: inventory_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.inventory_items_id_seq OWNED BY public.inventory_items.id;


--
-- Name: inventory_movements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_movements (
    id integer NOT NULL,
    inventory_item_id integer NOT NULL,
    project_id integer,
    movement_type character varying(20) NOT NULL,
    quantity integer NOT NULL,
    performed_by integer,
    performed_at timestamp with time zone DEFAULT now() NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    warehouse_id integer,
    CONSTRAINT inventory_movements_movement_type_check CHECK (((movement_type)::text = ANY ((ARRAY['in'::character varying, 'out'::character varying, 'transfer'::character varying])::text[]))),
    CONSTRAINT inventory_movements_quantity_check CHECK ((quantity > 0))
);


--
-- Name: COLUMN inventory_movements.warehouse_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inventory_movements.warehouse_id IS 'Warehouse where movement occurred';


--
-- Name: inventory_movements_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.inventory_movements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: inventory_movements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.inventory_movements_id_seq OWNED BY public.inventory_movements.id;


--
-- Name: invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoices (
    id integer NOT NULL,
    project_id integer NOT NULL,
    created_by integer,
    invoice_number character varying(100) NOT NULL,
    issue_date date DEFAULT CURRENT_DATE NOT NULL,
    due_date date,
    total_amount numeric(16,2) NOT NULL,
    paid_amount numeric(16,2) DEFAULT 0 NOT NULL,
    currency character varying(10) DEFAULT 'USD'::character varying NOT NULL,
    status character varying(50) DEFAULT 'draft'::character varying NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    purchase_request_id integer,
    tax_amount numeric(15,2) DEFAULT 0,
    notes text,
    is_inventory_stock boolean DEFAULT false,
    journal_entry_id integer,
    pdf_generated_at timestamp with time zone,
    pdf_path character varying(500),
    contract_id integer,
    client_id integer,
    invoice_type character varying(50),
    subtotal numeric,
    tax_rate numeric,
    payment_terms text,
    attachment_url character varying(500),
    qr_code_data text,
    is_tax_invoice boolean DEFAULT false,
    tax_invoice_no character varying(100),
    zatca_uuid uuid,
    zatca_status character varying(20) DEFAULT 'not_applicable'::character varying,
    zatca_cleared_at timestamp with time zone,
    zatca_invoice_hash character varying(256),
    previous_invoice_hash character varying(256),
    buyer_vat_number character varying(15),
    payment_status character varying(50) DEFAULT 'unpaid'::character varying,
    amount_paid numeric(16,2) DEFAULT 0,
    CONSTRAINT invoices_payment_status_check CHECK (((payment_status)::text = ANY ((ARRAY['unpaid'::character varying, 'partial'::character varying, 'paid'::character varying])::text[]))),
    CONSTRAINT invoices_zatca_status_check CHECK (((zatca_status)::text = ANY ((ARRAY['pending'::character varying, 'cleared'::character varying, 'rejected'::character varying, 'not_applicable'::character varying])::text[])))
);


--
-- Name: COLUMN invoices.tax_amount; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.invoices.tax_amount IS 'VAT amount (15%)';


--
-- Name: COLUMN invoices.journal_entry_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.invoices.journal_entry_id IS 'ID of the auto-generated journal entry for this invoice';


--
-- Name: COLUMN invoices.pdf_generated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.invoices.pdf_generated_at IS 'Timestamp when PDF was first generated';


--
-- Name: COLUMN invoices.pdf_path; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.invoices.pdf_path IS 'Path to generated PDF file';


--
-- Name: COLUMN invoices.contract_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.invoices.contract_id IS 'Link to contracts table for billing (FK to contracts.id)';


--
-- Name: COLUMN invoices.client_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.invoices.client_id IS 'Client reference (mapped from sales_invoices)';


--
-- Name: COLUMN invoices.invoice_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.invoices.invoice_type IS 'نوع الفاتورة (مثلاً: Standard, Credit, Proforma)';


--
-- Name: COLUMN invoices.subtotal; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.invoices.subtotal IS 'Amount before tax';


--
-- Name: COLUMN invoices.tax_rate; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.invoices.tax_rate IS 'نسبة الضريبة المطبقة على الفاتورة (مثلاً: 15%)';


--
-- Name: COLUMN invoices.payment_terms; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.invoices.payment_terms IS 'شروط الدفع الخاصة بالفاتورة (مثلاً: دفعة مقدمة 30% أو Net 30)';


--
-- Name: COLUMN invoices.attachment_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.invoices.attachment_url IS 'رابط ملف الفاتورة الخارجي (PDF أو صورة ممسوحة ضوئياً)';


--
-- Name: COLUMN invoices.qr_code_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.invoices.qr_code_data IS 'بيانات QR المرتبطة بالفاتورة (مثلاً: نص مشفر أو رابط)';


--
-- Name: COLUMN invoices.payment_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.invoices.payment_status IS 'Payment tracking: unpaid, partial, paid';


--
-- Name: COLUMN invoices.amount_paid; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.invoices.amount_paid IS 'Total amount paid so far';


--
-- Name: invoices_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.invoices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: invoices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.invoices_id_seq OWNED BY public.invoices.id;


--
-- Name: journal_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.journal_entries (
    id integer NOT NULL,
    entry_date date DEFAULT CURRENT_DATE NOT NULL,
    description text NOT NULL,
    reference_type character varying(50),
    reference_id integer,
    project_id integer,
    contract_id integer,
    created_by integer,
    is_posted boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    account_id integer,
    debit numeric(15,2) DEFAULT 0,
    credit numeric(15,2) DEFAULT 0,
    entry_type character varying(50) DEFAULT 'manual'::character varying,
    amount numeric(15,2) DEFAULT 0,
    transaction_date date DEFAULT CURRENT_DATE,
    posted_by integer,
    posted_at timestamp without time zone,
    entry_number integer NOT NULL
);


--
-- Name: TABLE journal_entries; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.journal_entries IS 'Double-entry accounting core';


--
-- Name: COLUMN journal_entries.entry_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.journal_entries.entry_number IS 'الرقم التسلسلي للقيد المحاسبي';


--
-- Name: journal_entries_entry_number_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.journal_entries_entry_number_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: journal_entries_entry_number_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.journal_entries_entry_number_seq OWNED BY public.journal_entries.entry_number;


--
-- Name: journal_entries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.journal_entries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: journal_entries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.journal_entries_id_seq OWNED BY public.journal_entries.id;


--
-- Name: journal_entry_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.journal_entry_lines (
    id integer NOT NULL,
    journal_entry_id integer NOT NULL,
    account_id integer NOT NULL,
    description text,
    debit_amount numeric(15,2) DEFAULT 0 NOT NULL,
    credit_amount numeric(15,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE journal_entry_lines; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.journal_entry_lines IS 'Individual debit/credit lines';


--
-- Name: journal_entry_lines_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.journal_entry_lines_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: journal_entry_lines_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.journal_entry_lines_id_seq OWNED BY public.journal_entry_lines.id;


--
-- Name: lead_interactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lead_interactions (
    id integer NOT NULL,
    lead_id integer NOT NULL,
    interaction_type character varying(20) NOT NULL,
    description text NOT NULL,
    performed_by integer,
    next_follow_up_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT lead_interactions_interaction_type_check CHECK (((interaction_type)::text = ANY ((ARRAY['call'::character varying, 'email'::character varying, 'meeting'::character varying, 'note'::character varying])::text[])))
);


--
-- Name: TABLE lead_interactions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lead_interactions IS 'Sales interaction history for leads (calls, emails, meetings, notes)';


--
-- Name: COLUMN lead_interactions.interaction_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lead_interactions.interaction_type IS 'Type of interaction: call, email, meeting, or note';


--
-- Name: COLUMN lead_interactions.next_follow_up_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lead_interactions.next_follow_up_date IS 'Scheduled date for next follow-up action';


--
-- Name: lead_interactions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lead_interactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lead_interactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lead_interactions_id_seq OWNED BY public.lead_interactions.id;


--
-- Name: leads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leads (
    id integer NOT NULL,
    owner_id integer,
    client_name character varying(255) NOT NULL,
    contact_email character varying(255),
    contact_phone character varying(50),
    service_type character varying(100) NOT NULL,
    location text,
    source character varying(100),
    status character varying(50) DEFAULT 'new'::character varying NOT NULL,
    priority character varying(20) DEFAULT 'medium'::character varying NOT NULL,
    estimated_value numeric(14,2) DEFAULT 0,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    technical_dept_id integer NOT NULL,
    assigned_engineer_id integer,
    rejection_comment text,
    assigned_sales_rep_id integer,
    client_user_id integer,
    temp_password_sent boolean DEFAULT false,
    temp_password_hash character varying(512),
    receivable_account_id integer,
    CONSTRAINT chk_leads_status CHECK (((status)::text = ANY ((ARRAY['new'::character varying, 'contacted'::character varying, 'survey_requested'::character varying, 'inspection_assigned'::character varying, 'inspection_completed'::character varying, 'quotation_sent'::character varying, 'quotation_approved'::character varying, 'quotation_rejected'::character varying, 'won'::character varying, 'lost'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- Name: COLUMN leads.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.leads.status IS 'Lead status in CRM pipeline: new → contacted → survey_requested → inspection_assigned → inspection_completed → quotation_sent → won/lost';


--
-- Name: COLUMN leads.technical_dept_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.leads.technical_dept_id IS 'REQUIRED: The technical department responsible for this lead. Must be a department with dept_type = ''technical''.';


--
-- Name: COLUMN leads.client_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.leads.client_user_id IS 'Auto-created client user account ID';


--
-- Name: COLUMN leads.temp_password_hash; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.leads.temp_password_hash IS 'Hashed temporary password for client account';


--
-- Name: leads_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.leads_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: leads_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.leads_id_seq OWNED BY public.leads.id;


--
-- Name: leave_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leave_requests (
    id integer NOT NULL,
    employee_id integer NOT NULL,
    leave_type character varying(50) NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    days_count integer NOT NULL,
    reason text,
    status character varying(30) DEFAULT 'pending'::character varying NOT NULL,
    approved_by integer,
    approved_at timestamp with time zone,
    rejection_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    document_url text,
    CONSTRAINT leave_requests_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'dept_head_approved'::character varying, 'approved'::character varying, 'rejected'::character varying])::text[])))
);


--
-- Name: leave_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.leave_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: leave_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.leave_requests_id_seq OWNED BY public.leave_requests.id;


--
-- Name: maintenance_contracts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.maintenance_contracts (
    id integer NOT NULL,
    contract_number character varying(100) NOT NULL,
    client_id integer NOT NULL,
    project_id integer,
    start_date date NOT NULL,
    end_date date NOT NULL,
    value numeric(16,2) DEFAULT 0 NOT NULL,
    visit_frequency character varying(50),
    max_visits integer DEFAULT 0,
    included_assets jsonb,
    terms_conditions text,
    status character varying(30) DEFAULT 'active'::character varying NOT NULL,
    auto_renew boolean DEFAULT false NOT NULL,
    renewal_notice_days integer DEFAULT 30,
    created_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE maintenance_contracts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.maintenance_contracts IS 'Maintenance contracts for installed assets with auto-renewal tracking';


--
-- Name: COLUMN maintenance_contracts.included_assets; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.maintenance_contracts.included_assets IS 'JSON array of asset IDs covered by this contract';


--
-- Name: COLUMN maintenance_contracts.auto_renew; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.maintenance_contracts.auto_renew IS 'Trigger auto-renewal notification';


--
-- Name: maintenance_contracts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.maintenance_contracts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: maintenance_contracts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.maintenance_contracts_id_seq OWNED BY public.maintenance_contracts.id;


--
-- Name: maintenance_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.maintenance_records (
    id integer NOT NULL,
    asset_id integer NOT NULL,
    performed_by integer,
    maintenance_type character varying(100) NOT NULL,
    description text,
    scheduled_at timestamp with time zone,
    completed_at timestamp with time zone,
    status character varying(50) DEFAULT 'scheduled'::character varying NOT NULL,
    cost numeric(16,2) DEFAULT 0 NOT NULL,
    next_maintenance_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: maintenance_records_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.maintenance_records_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: maintenance_records_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.maintenance_records_id_seq OWNED BY public.maintenance_records.id;


--
-- Name: maintenance_visits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.maintenance_visits (
    id integer NOT NULL,
    asset_id integer NOT NULL,
    visit_type character varying(50) DEFAULT 'scheduled'::character varying NOT NULL,
    visit_date date NOT NULL,
    scheduled_by integer,
    assigned_engineer_id integer,
    status character varying(30) DEFAULT 'scheduled'::character varying NOT NULL,
    description text,
    work_performed text,
    materials_used jsonb,
    travel_cost numeric(10,2) DEFAULT 0,
    labor_cost numeric(10,2) DEFAULT 0,
    total_cost numeric(10,2) DEFAULT 0,
    billable boolean DEFAULT false NOT NULL,
    invoice_id integer,
    completion_notes text,
    completed_at timestamp with time zone,
    created_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE maintenance_visits; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.maintenance_visits IS 'Maintenance visits linked to installed assets';


--
-- Name: COLUMN maintenance_visits.visit_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.maintenance_visits.visit_type IS 'Type: scheduled, emergency, or warranty';


--
-- Name: COLUMN maintenance_visits.billable; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.maintenance_visits.billable IS 'Whether this visit should be invoiced to client';


--
-- Name: maintenance_visits_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.maintenance_visits_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: maintenance_visits_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.maintenance_visits_id_seq OWNED BY public.maintenance_visits.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    user_id integer NOT NULL,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    type character varying(50) DEFAULT 'info'::character varying NOT NULL,
    entity_type character varying(50),
    entity_id integer,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    read_at timestamp with time zone
);


--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: otp_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.otp_codes (
    id integer NOT NULL,
    user_id integer NOT NULL,
    code character varying(6) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: otp_codes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.otp_codes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: otp_codes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.otp_codes_id_seq OWNED BY public.otp_codes.id;


--
-- Name: payment_vouchers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_vouchers (
    id integer NOT NULL,
    voucher_number character varying(50) NOT NULL,
    invoice_id integer NOT NULL,
    supplier_id integer NOT NULL,
    project_id integer,
    payment_date date DEFAULT CURRENT_DATE NOT NULL,
    payment_method character varying(50) DEFAULT 'bank_transfer'::character varying NOT NULL,
    payment_amount numeric(15,2) NOT NULL,
    currency character varying(3) DEFAULT 'SAR'::character varying,
    payment_account_type character varying(50) NOT NULL,
    bank_account_number character varying(100),
    check_number character varying(100),
    bank_name character varying(200),
    status character varying(50) DEFAULT 'completed'::character varying,
    journal_entry_id integer,
    notes text,
    created_by integer,
    approved_by integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT payment_vouchers_payment_amount_check CHECK ((payment_amount > (0)::numeric))
);


--
-- Name: COLUMN payment_vouchers.voucher_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.payment_vouchers.voucher_number IS 'Ø±Ù‚Ù… Ø§Ù„Ø³Ù†Ø¯ - Auto-generated: PV-2026-XXXX';


--
-- Name: COLUMN payment_vouchers.payment_account_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.payment_vouchers.payment_account_type IS 'Ù†ÙˆØ¹ Ø§Ù„Ø­Ø³Ø§Ø¨: cash Ø£Ùˆ bank';


--
-- Name: COLUMN payment_vouchers.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.payment_vouchers.status IS 'Ø§Ù„Ø­Ø§Ù„Ø©: draft, completed, cancelled';


--
-- Name: payment_vouchers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payment_vouchers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payment_vouchers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payment_vouchers_id_seq OWNED BY public.payment_vouchers.id;


--
-- Name: permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permissions (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.permissions_id_seq OWNED BY public.permissions.id;


--
-- Name: petty_cash_funds; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.petty_cash_funds (
    id integer NOT NULL,
    fund_name character varying(200) NOT NULL,
    engineer_id integer,
    project_id integer,
    initial_amount numeric(15,2) NOT NULL,
    current_balance numeric(15,2) NOT NULL,
    currency character varying(10) DEFAULT 'SAR'::character varying,
    status character varying(30) DEFAULT 'active'::character varying,
    approved_by integer,
    last_reconciliation_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE petty_cash_funds; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.petty_cash_funds IS 'Engineer petty cash management';


--
-- Name: petty_cash_funds_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.petty_cash_funds_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: petty_cash_funds_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.petty_cash_funds_id_seq OWNED BY public.petty_cash_funds.id;


--
-- Name: petty_cash_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.petty_cash_transactions (
    id integer NOT NULL,
    petty_cash_fund_id integer NOT NULL,
    transaction_type character varying(50) NOT NULL,
    amount numeric(15,2) NOT NULL,
    balance_after numeric(15,2) NOT NULL,
    expense_id integer,
    description text,
    receipt_url character varying(500),
    performed_by integer,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: petty_cash_transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.petty_cash_transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: petty_cash_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.petty_cash_transactions_id_seq OWNED BY public.petty_cash_transactions.id;


--
-- Name: project_employees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_employees (
    id integer NOT NULL,
    project_id integer,
    employee_id integer,
    role_in_project character varying(100) DEFAULT 'team_member'::character varying,
    status character varying(20) DEFAULT 'active'::character varying,
    assigned_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    released_at timestamp without time zone,
    notes text,
    CONSTRAINT project_employees_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'completed'::character varying, 'removed'::character varying])::text[])))
);


--
-- Name: project_employees_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.project_employees_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: project_employees_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.project_employees_id_seq OWNED BY public.project_employees.id;


--
-- Name: project_ratings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_ratings (
    id integer NOT NULL,
    project_id integer NOT NULL,
    client_id integer NOT NULL,
    rating integer NOT NULL,
    comment text,
    is_anonymous boolean DEFAULT false NOT NULL,
    response_from_company text,
    responded_by integer,
    responded_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT project_ratings_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: TABLE project_ratings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.project_ratings IS 'Client ratings and reviews for delivered projects (30-day post-delivery)';


--
-- Name: COLUMN project_ratings.rating; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project_ratings.rating IS 'Star rating: 1-5';


--
-- Name: COLUMN project_ratings.is_anonymous; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project_ratings.is_anonymous IS 'Whether client wants to hide their name from public view';


--
-- Name: COLUMN project_ratings.response_from_company; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project_ratings.response_from_company IS 'Company response to the review';


--
-- Name: project_ratings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.project_ratings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: project_ratings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.project_ratings_id_seq OWNED BY public.project_ratings.id;


--
-- Name: projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.projects (
    id integer NOT NULL,
    quotation_id integer NOT NULL,
    lead_id integer,
    name character varying(255) NOT NULL,
    description text,
    budget numeric(16,2) DEFAULT 0 NOT NULL,
    start_date date,
    end_date date,
    status character varying(50) DEFAULT 'planning'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    delivered_at timestamp with time zone,
    assigned_sales_rep_id integer,
    assigned_engineer_id integer,
    department_id integer,
    project_manager_id integer,
    total_budget numeric(15,2),
    technical_report_id integer,
    client_id integer,
    contract_status character varying(20) DEFAULT 'not_uploaded'::character varying NOT NULL,
    CONSTRAINT chk_contract_status CHECK (((contract_status)::text = ANY ((ARRAY['not_uploaded'::character varying, 'uploaded'::character varying, 'verified'::character varying])::text[])))
);


--
-- Name: COLUMN projects.delivered_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.projects.delivered_at IS 'Timestamp when project status changed to delivered';


--
-- Name: COLUMN projects.assigned_sales_rep_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.projects.assigned_sales_rep_id IS 'Sales representative assigned to this project/client';


--
-- Name: COLUMN projects.contract_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.projects.contract_status IS 'Contract upload status: not_uploaded, uploaded, verified';


--
-- Name: projects_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.projects_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: projects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.projects_id_seq OWNED BY public.projects.id;


--
-- Name: purchase_invoice_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_invoice_items (
    id integer NOT NULL,
    invoice_id integer NOT NULL,
    inventory_item_id integer NOT NULL,
    warehouse_id integer NOT NULL,
    quantity numeric(15,3) NOT NULL,
    unit_cost numeric(15,2) NOT NULL,
    total_amount numeric(15,2) GENERATED ALWAYS AS ((quantity * unit_cost)) STORED,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT purchase_invoice_items_quantity_check CHECK ((quantity > (0)::numeric)),
    CONSTRAINT purchase_invoice_items_unit_cost_check CHECK ((unit_cost >= (0)::numeric))
);


--
-- Name: TABLE purchase_invoice_items; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.purchase_invoice_items IS 'Line items within purchase invoices';


--
-- Name: purchase_invoice_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.purchase_invoice_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: purchase_invoice_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.purchase_invoice_items_id_seq OWNED BY public.purchase_invoice_items.id;


--
-- Name: purchase_invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_invoices (
    id integer NOT NULL,
    invoice_number character varying(50) NOT NULL,
    supplier_id integer NOT NULL,
    po_id integer,
    grn_id integer,
    project_id integer,
    invoice_date date DEFAULT CURRENT_DATE NOT NULL,
    due_date date,
    subtotal numeric(15,2) DEFAULT 0 NOT NULL,
    tax_rate numeric(5,2) DEFAULT 15.00 NOT NULL,
    tax_amount numeric(15,2) DEFAULT 0 NOT NULL,
    total_amount numeric(15,2) DEFAULT 0 NOT NULL,
    paid_amount numeric(15,2) DEFAULT 0 NOT NULL,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    journal_entry_id integer,
    notes text,
    created_by integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pdf_path character varying(500),
    pdf_generated_at timestamp without time zone,
    is_tax_applied boolean DEFAULT true,
    tax_percentage numeric(5,2) DEFAULT 15.00,
    remaining_amount numeric(15,2) GENERATED ALWAYS AS ((total_amount - paid_amount)) STORED,
    CONSTRAINT chk_paid_amount CHECK (((paid_amount >= (0)::numeric) AND (paid_amount <= total_amount))),
    CONSTRAINT chk_pi_paid CHECK ((paid_amount >= (0)::numeric)),
    CONSTRAINT chk_pi_status CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'final'::character varying, 'partial'::character varying, 'paid'::character varying])::text[])))
);


--
-- Name: TABLE purchase_invoices; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.purchase_invoices IS 'Supplier invoices for payment tracking';


--
-- Name: COLUMN purchase_invoices.is_tax_applied; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.purchase_invoices.is_tax_applied IS 'Whether tax should be applied to this invoice';


--
-- Name: COLUMN purchase_invoices.tax_percentage; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.purchase_invoices.tax_percentage IS 'Tax percentage rate (e.g., 14, 15, etc.)';


--
-- Name: COLUMN purchase_invoices.remaining_amount; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.purchase_invoices.remaining_amount IS 'Ø§Ù„Ù…Ø¨Ù„Øº Ø§Ù„Ù…ØªØ¨Ù‚ÙŠ - Auto-calculated: total_amount - paid_amount';


--
-- Name: CONSTRAINT chk_paid_amount ON purchase_invoices; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON CONSTRAINT chk_paid_amount ON public.purchase_invoices IS 'Prevent overpayment: paid_amount cannot exceed total_amount';


--
-- Name: purchase_invoices_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.purchase_invoices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: purchase_invoices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.purchase_invoices_id_seq OWNED BY public.purchase_invoices.id;


--
-- Name: purchase_order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_order_items (
    id integer NOT NULL,
    po_id integer NOT NULL,
    item_id integer NOT NULL,
    quantity numeric(15,3) NOT NULL,
    unit_cost numeric(15,2) NOT NULL,
    total_cost numeric(15,2) GENERATED ALWAYS AS ((quantity * unit_cost)) STORED,
    quantity_received numeric(15,3) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT chk_po_item_qty CHECK ((quantity > (0)::numeric)),
    CONSTRAINT chk_po_item_received CHECK ((quantity_received >= (0)::numeric))
);


--
-- Name: TABLE purchase_order_items; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.purchase_order_items IS 'Line items within purchase orders';


--
-- Name: purchase_order_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.purchase_order_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: purchase_order_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.purchase_order_items_id_seq OWNED BY public.purchase_order_items.id;


--
-- Name: purchase_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_orders (
    id integer NOT NULL,
    po_number character varying(50) NOT NULL,
    supplier_id integer,
    project_id integer,
    order_date date DEFAULT CURRENT_DATE NOT NULL,
    expected_date date,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    subtotal numeric(15,2) DEFAULT 0 NOT NULL,
    tax_amount numeric(15,2) DEFAULT 0 NOT NULL,
    total_amount numeric(15,2) DEFAULT 0 NOT NULL,
    notes text,
    created_by integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    approved_by integer,
    procurement_rejected_by integer,
    finance_rejected_by integer,
    procurement_notes text,
    finance_notes text,
    procurement_approved_by integer,
    procurement_approved_at timestamp with time zone,
    procurement_rejection_reason text,
    finance_approved_by integer,
    finance_approved_at timestamp with time zone,
    finance_rejection_reason text,
    CONSTRAINT chk_po_status CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'pending'::character varying, 'pending_procurement'::character varying, 'pending_finance'::character varying, 'approved'::character varying, 'sent'::character varying, 'partial'::character varying, 'received'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- Name: TABLE purchase_orders; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.purchase_orders IS 'Purchase orders to suppliers';


--
-- Name: COLUMN purchase_orders.supplier_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.purchase_orders.supplier_id IS 'Nullable for initial PM requests. Set by procurement_manager during approval stage.';


--
-- Name: COLUMN purchase_orders.approved_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.purchase_orders.approved_by IS 'User who gave final approval (finance manager)';


--
-- Name: COLUMN purchase_orders.procurement_rejected_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.purchase_orders.procurement_rejected_by IS 'Procurement manager who rejected';


--
-- Name: COLUMN purchase_orders.finance_rejected_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.purchase_orders.finance_rejected_by IS 'Finance manager who rejected';


--
-- Name: COLUMN purchase_orders.procurement_notes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.purchase_orders.procurement_notes IS 'Procurement manager notes during approval';


--
-- Name: COLUMN purchase_orders.finance_notes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.purchase_orders.finance_notes IS 'Finance manager approval notes';


--
-- Name: COLUMN purchase_orders.procurement_approved_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.purchase_orders.procurement_approved_by IS 'Procurement manager who approved';


--
-- Name: COLUMN purchase_orders.procurement_approved_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.purchase_orders.procurement_approved_at IS 'Timestamp of procurement approval';


--
-- Name: COLUMN purchase_orders.procurement_rejection_reason; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.purchase_orders.procurement_rejection_reason IS 'Reason for procurement rejection';


--
-- Name: COLUMN purchase_orders.finance_approved_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.purchase_orders.finance_approved_by IS 'Finance manager who gave final approval';


--
-- Name: COLUMN purchase_orders.finance_approved_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.purchase_orders.finance_approved_at IS 'Timestamp of finance approval';


--
-- Name: COLUMN purchase_orders.finance_rejection_reason; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.purchase_orders.finance_rejection_reason IS 'Reason for finance rejection';


--
-- Name: purchase_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.purchase_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: purchase_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.purchase_orders_id_seq OWNED BY public.purchase_orders.id;


--
-- Name: quotations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quotations (
    id integer NOT NULL,
    inspection_report_id integer NOT NULL,
    created_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    total_price numeric(16,2) DEFAULT 0 NOT NULL,
    discount numeric(10,2) DEFAULT 0 NOT NULL,
    tax numeric(10,2) DEFAULT 0 NOT NULL,
    details jsonb,
    comments text,
    approved_by integer,
    approved_at timestamp with time zone,
    rejection_comment text,
    finance_approved_by integer,
    finance_approved_at timestamp with time zone,
    gm_approved_by integer,
    gm_approved_at timestamp with time zone,
    boq_data jsonb,
    client_response character varying(20) DEFAULT 'pending'::character varying,
    rejection_reason text,
    responded_at timestamp without time zone,
    client_response_date timestamp without time zone,
    lead_id integer,
    file_url character varying(500),
    payment_status character varying(50) DEFAULT 'pending'::character varying,
    downpayment_amount numeric(16,2) DEFAULT 0,
    downpayment_date timestamp with time zone,
    payment_confirmed_by integer,
    payment_confirmed_at timestamp with time zone,
    project_id integer,
    converted_to_project_at timestamp with time zone,
    converted_by integer,
    CONSTRAINT chk_quotations_client_response CHECK (((client_response)::text = ANY ((ARRAY['pending'::character varying, 'client_approved'::character varying, 'client_rejected'::character varying])::text[]))),
    CONSTRAINT chk_quotations_payment_status CHECK (((payment_status)::text = ANY ((ARRAY['pending'::character varying, 'awaiting_downpayment'::character varying, 'downpayment_received'::character varying, 'fully_paid'::character varying])::text[])))
);


--
-- Name: COLUMN quotations.comments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.quotations.comments IS 'General comments about the quotation';


--
-- Name: COLUMN quotations.boq_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.quotations.boq_data IS 'JSONB structure: {
  "items": [
    {
      "description": "Item description",
      "quantity": number,
      "unit_price": number,
      "total": number
    }
  ],
  "materials": [...],
  "labor_cost": number,
  "equipment_cost": number,
  "warranty": "text",
  "delivery_time": "text"
}';


--
-- Name: COLUMN quotations.client_response; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.quotations.client_response IS 'Client approval status: pending, client_approved, client_rejected';


--
-- Name: COLUMN quotations.file_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.quotations.file_url IS 'URL/path to the uploaded quotation file (PDF, DOC, etc.)';


--
-- Name: COLUMN quotations.payment_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.quotations.payment_status IS 'Payment tracking: pending, awaiting_downpayment, downpayment_received, fully_paid';


--
-- Name: COLUMN quotations.project_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.quotations.project_id IS 'Linked project after conversion';


--
-- Name: quotations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.quotations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: quotations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.quotations_id_seq OWNED BY public.quotations.id;


--
-- Name: receipt_voucher_invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.receipt_voucher_invoices (
    id integer NOT NULL,
    receipt_voucher_id integer NOT NULL,
    sales_invoice_id integer NOT NULL,
    amount_applied numeric(15,2) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: receipt_voucher_invoices_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.receipt_voucher_invoices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: receipt_voucher_invoices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.receipt_voucher_invoices_id_seq OWNED BY public.receipt_voucher_invoices.id;


--
-- Name: receipt_vouchers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.receipt_vouchers (
    id integer NOT NULL,
    voucher_no character varying(50) NOT NULL,
    client_id integer NOT NULL,
    receipt_date date DEFAULT CURRENT_DATE NOT NULL,
    amount numeric(15,2) NOT NULL,
    payment_method character varying(20) NOT NULL,
    payment_account_id integer NOT NULL,
    reference_no character varying(100),
    description text,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    created_by integer NOT NULL,
    posted_by integer,
    posted_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT receipt_vouchers_payment_method_check CHECK (((payment_method)::text = ANY ((ARRAY['cash'::character varying, 'bank'::character varying, 'check'::character varying])::text[]))),
    CONSTRAINT receipt_vouchers_status_check CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'posted'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- Name: receipt_vouchers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.receipt_vouchers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: receipt_vouchers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.receipt_vouchers_id_seq OWNED BY public.receipt_vouchers.id;


--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_permissions (
    role_id integer NOT NULL,
    permission_id integer NOT NULL
);


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: sales_invoice_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales_invoice_items (
    id integer NOT NULL,
    invoice_id integer NOT NULL,
    inventory_item_id integer NOT NULL,
    warehouse_id integer NOT NULL,
    quantity numeric(15,3) NOT NULL,
    unit_price numeric(15,2) NOT NULL,
    total_amount numeric(15,2) NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT sales_invoice_items_quantity_check CHECK ((quantity > (0)::numeric)),
    CONSTRAINT sales_invoice_items_total_amount_check CHECK ((total_amount >= (0)::numeric)),
    CONSTRAINT sales_invoice_items_unit_price_check CHECK ((unit_price >= (0)::numeric))
);


--
-- Name: sales_invoice_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sales_invoice_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sales_invoice_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sales_invoice_items_id_seq OWNED BY public.sales_invoice_items.id;


--
-- Name: sales_invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales_invoices (
    id integer NOT NULL,
    invoice_number character varying(50) NOT NULL,
    project_id integer,
    client_id integer,
    lead_id integer,
    issue_date date DEFAULT CURRENT_DATE NOT NULL,
    due_date date,
    subtotal numeric(15,2) NOT NULL,
    vat_rate numeric(5,2) DEFAULT 15.00,
    vat_amount numeric(15,2) NOT NULL,
    total_amount numeric(15,2) NOT NULL,
    receivable_account_id integer,
    revenue_account_id integer,
    vat_account_id integer,
    status character varying(50) DEFAULT 'draft'::character varying,
    payment_status character varying(50) DEFAULT 'unpaid'::character varying,
    amount_paid numeric(15,2) DEFAULT 0,
    journal_entry_id integer,
    description text,
    notes text,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    pdf_path character varying(500),
    paid_amount numeric(15,2) DEFAULT 0,
    is_tax_invoice boolean DEFAULT false,
    tax_invoice_id integer,
    discount_amount numeric(16,2) DEFAULT 0 NOT NULL,
    discount_account_id integer,
    CONSTRAINT sales_invoices_amount_paid_check CHECK ((amount_paid >= (0)::numeric)),
    CONSTRAINT sales_invoices_payment_status_check CHECK (((payment_status)::text = ANY ((ARRAY['unpaid'::character varying, 'partial'::character varying, 'paid'::character varying])::text[]))),
    CONSTRAINT sales_invoices_status_check CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'final'::character varying, 'pending'::character varying, 'approved'::character varying, 'paid'::character varying, 'overdue'::character varying, 'cancelled'::character varying, 'sent'::character varying])::text[]))),
    CONSTRAINT sales_invoices_subtotal_check CHECK ((subtotal >= (0)::numeric)),
    CONSTRAINT sales_invoices_total_amount_check CHECK ((total_amount >= (0)::numeric)),
    CONSTRAINT sales_invoices_vat_amount_check CHECK ((vat_amount >= (0)::numeric)),
    CONSTRAINT sales_invoices_vat_rate_check CHECK (((vat_rate >= (0)::numeric) AND (vat_rate <= (100)::numeric)))
);


--
-- Name: TABLE sales_invoices; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.sales_invoices IS 'Sales invoices generated from won leads/projects with automatic journal entries';


--
-- Name: COLUMN sales_invoices.invoice_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sales_invoices.invoice_number IS 'Unique invoice number (format: SI-YYYY-NNNN)';


--
-- Name: COLUMN sales_invoices.receivable_account_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sales_invoices.receivable_account_id IS 'Client sub-account under 121 (Accounts Receivable)';


--
-- Name: COLUMN sales_invoices.revenue_account_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sales_invoices.revenue_account_id IS 'Revenue account (41xxx branch)';


--
-- Name: COLUMN sales_invoices.vat_account_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sales_invoices.vat_account_id IS 'VAT Output account (22101)';


--
-- Name: COLUMN sales_invoices.journal_entry_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sales_invoices.journal_entry_id IS 'Auto-generated journal entry for this invoice';


--
-- Name: COLUMN sales_invoices.pdf_path; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sales_invoices.pdf_path IS 'Path to generated PDF file (e.g., /uploads/invoices/sales_SI-2026-0001.pdf)';


--
-- Name: COLUMN sales_invoices.is_tax_invoice; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sales_invoices.is_tax_invoice IS 'True if tax invoice has been generated for this sales invoice';


--
-- Name: COLUMN sales_invoices.tax_invoice_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sales_invoices.tax_invoice_id IS 'Reference to the generated tax invoice in invoices table';


--
-- Name: COLUMN sales_invoices.discount_amount; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sales_invoices.discount_amount IS 'Discount amount applied to invoice (mapped to account 4113)';


--
-- Name: COLUMN sales_invoices.discount_account_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sales_invoices.discount_account_id IS 'COA account ID for discount (should be 4113)';


--
-- Name: sales_invoices_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sales_invoices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sales_invoices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sales_invoices_id_seq OWNED BY public.sales_invoices.id;


--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.suppliers (
    id integer NOT NULL,
    supplier_code character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    name_ar character varying(255),
    supplier_type character varying(20) DEFAULT 'local'::character varying NOT NULL,
    vat_number character varying(50),
    cr_number character varying(50),
    contact_person character varying(255),
    phone character varying(50),
    email character varying(255),
    address text,
    payment_terms character varying(50) DEFAULT 'Net 30'::character varying,
    coa_account_code character varying(20) DEFAULT '21301'::character varying,
    is_active boolean DEFAULT true,
    notes text,
    created_by integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT chk_supplier_type CHECK (((supplier_type)::text = ANY ((ARRAY['local'::character varying, 'foreign'::character varying])::text[])))
);


--
-- Name: TABLE suppliers; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.suppliers IS 'Supplier/vendor master data for purchasing module';


--
-- Name: COLUMN suppliers.supplier_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.suppliers.supplier_code IS 'Unique supplier identifier (auto-generated)';


--
-- Name: COLUMN suppliers.supplier_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.suppliers.supplier_type IS 'local or foreign supplier';


--
-- Name: COLUMN suppliers.vat_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.suppliers.vat_number IS 'VAT registration number (Saudi)';


--
-- Name: COLUMN suppliers.cr_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.suppliers.cr_number IS 'Commercial Registration number';


--
-- Name: COLUMN suppliers.coa_account_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.suppliers.coa_account_code IS 'Links to accounts payable in Chart of Accounts';


--
-- Name: suppliers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.suppliers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: suppliers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.suppliers_id_seq OWNED BY public.suppliers.id;


--
-- Name: tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tasks (
    id integer NOT NULL,
    project_id integer NOT NULL,
    parent_task_id integer,
    title character varying(255) NOT NULL,
    description text,
    assigned_to integer,
    start_date date,
    due_date date,
    completed_at timestamp with time zone,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    priority character varying(20) DEFAULT 'medium'::character varying NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: tasks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tasks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tasks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tasks_id_seq OWNED BY public.tasks.id;


--
-- Name: tax_invoice_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tax_invoice_logs (
    id integer NOT NULL,
    invoice_id integer NOT NULL,
    action character varying(50) NOT NULL,
    zatca_response jsonb,
    performed_by integer,
    performed_at timestamp with time zone DEFAULT now(),
    notes text
);


--
-- Name: tax_invoice_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tax_invoice_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tax_invoice_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tax_invoice_logs_id_seq OWNED BY public.tax_invoice_logs.id;


--
-- Name: time_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.time_logs (
    id integer NOT NULL,
    employee_id integer NOT NULL,
    clock_in timestamp with time zone,
    clock_out timestamp with time zone,
    session_hours numeric(5,2),
    clock_in_ip character varying(45),
    clock_out_ip character varying(45),
    clock_in_location character varying(255),
    clock_out_location character varying(255),
    device_type character varying(50) DEFAULT 'web'::character varying,
    status character varying(20) DEFAULT 'open'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT time_logs_status_check CHECK (((status)::text = ANY ((ARRAY['open'::character varying, 'closed'::character varying, 'invalid'::character varying])::text[])))
);


--
-- Name: TABLE time_logs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.time_logs IS 'Individual clock-in/out events for audit trail';


--
-- Name: COLUMN time_logs.clock_in_ip; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.time_logs.clock_in_ip IS 'IPv4 or IPv6 address at clock-in';


--
-- Name: COLUMN time_logs.clock_in_location; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.time_logs.clock_in_location IS 'GPS coordinates or device location';


--
-- Name: time_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.time_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: time_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.time_logs_id_seq OWNED BY public.time_logs.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    role_id integer NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    email character varying(255) NOT NULL,
    username character varying(100),
    password_hash character varying(512) NOT NULL,
    phone character varying(30),
    status character varying(24) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    department_id integer,
    is_first_login boolean DEFAULT true
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: v_active_contracts_vat_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_active_contracts_vat_summary AS
 SELECT c.id,
    c.contract_number,
    c.project_id,
    p.name AS project_name,
    c.client_id,
    (((u.first_name)::text || ' '::text) || (u.last_name)::text) AS client_name,
    c.total_value,
    c.vat_applicable,
    c.vat_rate,
        CASE
            WHEN c.vat_applicable THEN round(((c.total_value * c.vat_rate) / (100)::numeric), 2)
            ELSE (0)::numeric
        END AS vat_amount,
        CASE
            WHEN c.vat_applicable THEN round((c.total_value * ((1)::numeric + (c.vat_rate / (100)::numeric))), 2)
            ELSE c.total_value
        END AS total_with_vat,
    c.currency,
    c.start_date,
    c.end_date,
    c.status
   FROM ((public.contracts c
     LEFT JOIN public.projects p ON ((p.id = c.project_id)))
     LEFT JOIN public.users u ON ((u.id = c.client_id)))
  WHERE ((c.status)::text = 'active'::text);


--
-- Name: VIEW v_active_contracts_vat_summary; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_active_contracts_vat_summary IS 'Active contracts with calculated VAT amounts';


--
-- Name: v_balance_sheet_accounts; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_balance_sheet_accounts AS
 SELECT id,
    account_code,
    account_name,
    account_type,
    parent_id,
    normal_balance,
    description,
    is_active,
    created_at,
    updated_at,
    parent_account_id,
    code,
    level,
    account_name_ar,
    is_vat_applicable,
    vat_rate,
    cost_center_type,
    linked_entity_id,
    financial_statement,
    report_category,
    depreciation_method,
    useful_life_years,
    salvage_value
   FROM public.chart_of_accounts
  WHERE (((financial_statement)::text = 'balance_sheet'::text) AND (is_active = true))
  ORDER BY account_code;


--
-- Name: VIEW v_balance_sheet_accounts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_balance_sheet_accounts IS 'All active balance sheet accounts';


--
-- Name: v_contract_financial_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_contract_financial_summary AS
SELECT
    NULL::integer AS id,
    NULL::character varying(100) AS contract_number,
    NULL::numeric(15,2) AS total_value,
    NULL::numeric AS total_vat,
    NULL::numeric AS grand_total,
    NULL::numeric AS collected_amount;


--
-- Name: v_contract_payment_status; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_contract_payment_status AS
 SELECT c.id AS contract_id,
    c.contract_number,
    c.total_value,
    count(DISTINCT cm.id) AS total_milestones,
    count(DISTINCT
        CASE
            WHEN ((cm.status)::text = 'paid'::text) THEN cm.id
            ELSE NULL::integer
        END) AS paid_milestones,
    count(DISTINCT
        CASE
            WHEN ((cm.status)::text = 'invoiced'::text) THEN cm.id
            ELSE NULL::integer
        END) AS invoiced_milestones,
    count(DISTINCT
        CASE
            WHEN ((cm.status)::text = 'pending'::text) THEN cm.id
            ELSE NULL::integer
        END) AS pending_milestones,
    COALESCE(sum(cm.milestone_amount) FILTER (WHERE ((cm.status)::text = 'paid'::text)), (0)::numeric) AS amount_paid,
    COALESCE(sum(cm.milestone_amount) FILTER (WHERE ((cm.status)::text = 'invoiced'::text)), (0)::numeric) AS amount_invoiced,
    (c.total_value - COALESCE(sum(cm.milestone_amount) FILTER (WHERE ((cm.status)::text = 'paid'::text)), (0)::numeric)) AS remaining_balance
   FROM (public.contracts c
     LEFT JOIN public.contract_milestones cm ON ((cm.contract_id = c.id)))
  GROUP BY c.id, c.contract_number, c.total_value;


--
-- Name: VIEW v_contract_payment_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_contract_payment_status IS 'Contract payment tracking with milestone breakdown';


--
-- Name: v_cost_center_accounts; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_cost_center_accounts AS
 SELECT id,
    account_code,
    account_name,
    account_name_ar,
    cost_center_type,
    linked_entity_id
   FROM public.chart_of_accounts
  WHERE ((cost_center_type IS NOT NULL) AND (is_active = true))
  ORDER BY cost_center_type, account_code;


--
-- Name: VIEW v_cost_center_accounts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_cost_center_accounts IS 'Accounts linked to specific cost centers';


--
-- Name: v_income_statement_accounts; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_income_statement_accounts AS
 SELECT id,
    account_code,
    account_name,
    account_type,
    parent_id,
    normal_balance,
    description,
    is_active,
    created_at,
    updated_at,
    parent_account_id,
    code,
    level,
    account_name_ar,
    is_vat_applicable,
    vat_rate,
    cost_center_type,
    linked_entity_id,
    financial_statement,
    report_category,
    depreciation_method,
    useful_life_years,
    salvage_value
   FROM public.chart_of_accounts
  WHERE (((financial_statement)::text = 'income_statement'::text) AND (is_active = true))
  ORDER BY account_code;


--
-- Name: VIEW v_income_statement_accounts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_income_statement_accounts IS 'All active income statement accounts';


--
-- Name: v_vat_applicable_accounts; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_vat_applicable_accounts AS
 SELECT id,
    account_code,
    account_name,
    account_name_ar,
    vat_rate
   FROM public.chart_of_accounts
  WHERE ((is_vat_applicable = true) AND (is_active = true))
  ORDER BY account_code;


--
-- Name: VIEW v_vat_applicable_accounts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_vat_applicable_accounts IS 'Accounts that require VAT calculation';


--
-- Name: vw_contracts_expiring_soon; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_contracts_expiring_soon AS
 SELECT mc.id AS contract_id,
    mc.contract_number,
    mc.client_id,
    mc.project_id,
    mc.end_date,
    mc.status,
    mc.auto_renew,
    mc.renewal_notice_days,
    p.name AS project_name,
    (((u.first_name)::text || ' '::text) || (u.last_name)::text) AS client_name,
    u.email AS client_email,
    (mc.end_date - CURRENT_DATE) AS days_until_expiry
   FROM ((public.maintenance_contracts mc
     LEFT JOIN public.projects p ON ((mc.project_id = p.id)))
     LEFT JOIN public.users u ON ((mc.client_id = u.id)))
  WHERE (((mc.status)::text = 'active'::text) AND (mc.end_date >= CURRENT_DATE) AND (mc.end_date <= (CURRENT_DATE + ((mc.renewal_notice_days || ' days'::text))::interval)))
  ORDER BY mc.end_date;


--
-- Name: VIEW vw_contracts_expiring_soon; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.vw_contracts_expiring_soon IS 'Contracts expiring soon based on renewal notice period';


--
-- Name: vw_projects_ready_for_rating; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_projects_ready_for_rating AS
 SELECT p.id AS project_id,
    p.name AS project_name,
    p.status,
    p.delivered_at,
    c.id AS client_id,
    (((c.first_name)::text || ' '::text) || (c.last_name)::text) AS client_name,
    c.email AS client_email,
    (((u.first_name)::text || ' '::text) || (u.last_name)::text) AS assigned_sales_rep_name,
    u.email AS assigned_sales_rep_email,
    (CURRENT_DATE - (p.delivered_at)::date) AS days_since_delivery
   FROM ((public.projects p
     JOIN public.users c ON ((p.lead_id = c.id)))
     LEFT JOIN public.users u ON ((p.assigned_sales_rep_id = u.id)))
  WHERE (((p.status)::text = 'delivered'::text) AND (p.delivered_at IS NOT NULL) AND ((CURRENT_DATE - (p.delivered_at)::date) >= 30) AND (NOT (EXISTS ( SELECT 1
           FROM public.project_ratings pr
          WHERE ((pr.project_id = p.id) AND (pr.client_id = c.id))))))
  ORDER BY p.delivered_at DESC;


--
-- Name: VIEW vw_projects_ready_for_rating; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.vw_projects_ready_for_rating IS 'Projects delivered 30+ days ago without ratings - trigger email notifications';


--
-- Name: vw_warranty_expiring_soon; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_warranty_expiring_soon AS
 SELECT ia.id AS asset_id,
    ia.asset_name,
    ia.serial_number,
    ia.client_id,
    ia.project_id,
    ia.warranty_expiry,
    ia.assigned_engineer_id,
    p.name AS project_name,
    (((u.first_name)::text || ' '::text) || (u.last_name)::text) AS client_name,
    u.email AS client_email,
    u.phone AS client_phone,
    CURRENT_DATE AS today,
    (ia.warranty_expiry - CURRENT_DATE) AS days_until_expiry
   FROM ((public.installed_assets ia
     LEFT JOIN public.projects p ON ((ia.project_id = p.id)))
     LEFT JOIN public.users u ON ((ia.client_id = u.id)))
  WHERE ((ia.warranty_expiry IS NOT NULL) AND (ia.warranty_expiry >= CURRENT_DATE) AND (ia.warranty_expiry <= (CURRENT_DATE + '30 days'::interval)))
  ORDER BY ia.warranty_expiry;


--
-- Name: VIEW vw_warranty_expiring_soon; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.vw_warranty_expiring_soon IS 'Assets with warranty expiring within 30 days for auto-alerts';


--
-- Name: warehouse_stock; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.warehouse_stock (
    id integer NOT NULL,
    warehouse_id integer NOT NULL,
    item_id integer NOT NULL,
    quantity_on_hand numeric(15,3) DEFAULT 0 NOT NULL,
    reserved_quantity numeric(15,3) DEFAULT 0 NOT NULL,
    available_quantity numeric(15,3) GENERATED ALWAYS AS ((quantity_on_hand - reserved_quantity)) STORED,
    last_counted_at timestamp with time zone,
    last_counted_by integer,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT chk_qty_on_hand CHECK ((quantity_on_hand >= (0)::numeric)),
    CONSTRAINT chk_reserved_qty CHECK ((reserved_quantity >= (0)::numeric))
);


--
-- Name: TABLE warehouse_stock; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.warehouse_stock IS 'Per-warehouse stock levels for each inventory item';


--
-- Name: warehouse_stock_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.warehouse_stock_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: warehouse_stock_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.warehouse_stock_id_seq OWNED BY public.warehouse_stock.id;


--
-- Name: warehouses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.warehouses (
    id integer NOT NULL,
    warehouse_code character varying(50) NOT NULL,
    warehouse_name character varying(255) NOT NULL,
    warehouse_name_ar character varying(255),
    location character varying(500),
    location_ar character varying(500),
    address text,
    supervisor_id integer,
    capacity_cubic_m numeric(15,2),
    is_active boolean DEFAULT true,
    notes text,
    created_by integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE warehouses; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.warehouses IS 'Warehouse/location master data for multi-warehouse inventory';


--
-- Name: warehouses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.warehouses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: warehouses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.warehouses_id_seq OWNED BY public.warehouses.id;


--
-- Name: approval_steps id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_steps ALTER COLUMN id SET DEFAULT nextval('public.approval_steps_id_seq'::regclass);


--
-- Name: assets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assets ALTER COLUMN id SET DEFAULT nextval('public.assets_id_seq'::regclass);


--
-- Name: attendance id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance ALTER COLUMN id SET DEFAULT nextval('public.attendance_id_seq'::regclass);


--
-- Name: budgets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budgets ALTER COLUMN id SET DEFAULT nextval('public.budgets_id_seq'::regclass);


--
-- Name: chart_of_accounts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chart_of_accounts ALTER COLUMN id SET DEFAULT nextval('public.chart_of_accounts_id_seq'::regclass);


--
-- Name: client_support_messages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_support_messages ALTER COLUMN id SET DEFAULT nextval('public.client_support_messages_id_seq'::regclass);


--
-- Name: contract_amendments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_amendments ALTER COLUMN id SET DEFAULT nextval('public.contract_amendments_id_seq'::regclass);


--
-- Name: contract_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_items ALTER COLUMN id SET DEFAULT nextval('public.contract_items_id_seq'::regclass);


--
-- Name: contract_milestones id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_milestones ALTER COLUMN id SET DEFAULT nextval('public.contract_milestones_id_seq'::regclass);


--
-- Name: contracts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contracts ALTER COLUMN id SET DEFAULT nextval('public.contracts_id_seq'::regclass);


--
-- Name: credit_note_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_note_items ALTER COLUMN id SET DEFAULT nextval('public.credit_note_items_id_seq'::regclass);


--
-- Name: credit_notes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_notes ALTER COLUMN id SET DEFAULT nextval('public.credit_notes_id_seq'::regclass);


--
-- Name: departments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments ALTER COLUMN id SET DEFAULT nextval('public.departments_id_seq'::regclass);


--
-- Name: documents id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents ALTER COLUMN id SET DEFAULT nextval('public.documents_id_seq'::regclass);


--
-- Name: employee_evaluations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_evaluations ALTER COLUMN id SET DEFAULT nextval('public.employee_evaluations_id_seq'::regclass);


--
-- Name: employee_leave_balances id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_leave_balances ALTER COLUMN id SET DEFAULT nextval('public.employee_leave_balances_id_seq'::regclass);


--
-- Name: employees id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees ALTER COLUMN id SET DEFAULT nextval('public.employees_id_seq'::regclass);


--
-- Name: expense_vouchers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_vouchers ALTER COLUMN id SET DEFAULT nextval('public.expense_vouchers_id_seq'::regclass);


--
-- Name: expenses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses ALTER COLUMN id SET DEFAULT nextval('public.expenses_id_seq'::regclass);


--
-- Name: fixed_assets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fixed_assets ALTER COLUMN id SET DEFAULT nextval('public.fixed_assets_id_seq'::regclass);


--
-- Name: goods_receipt_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_receipt_items ALTER COLUMN id SET DEFAULT nextval('public.goods_receipt_items_id_seq'::regclass);


--
-- Name: goods_receipts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_receipts ALTER COLUMN id SET DEFAULT nextval('public.goods_receipts_id_seq'::regclass);


--
-- Name: inspection_reports id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inspection_reports ALTER COLUMN id SET DEFAULT nextval('public.inspection_reports_id_seq'::regclass);


--
-- Name: inspections id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inspections ALTER COLUMN id SET DEFAULT nextval('public.inspections_id_seq'::regclass);


--
-- Name: installed_assets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.installed_assets ALTER COLUMN id SET DEFAULT nextval('public.installed_assets_id_seq'::regclass);


--
-- Name: inventory_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_items ALTER COLUMN id SET DEFAULT nextval('public.inventory_items_id_seq'::regclass);


--
-- Name: inventory_movements id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements ALTER COLUMN id SET DEFAULT nextval('public.inventory_movements_id_seq'::regclass);


--
-- Name: invoices id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices ALTER COLUMN id SET DEFAULT nextval('public.invoices_id_seq'::regclass);


--
-- Name: journal_entries id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entries ALTER COLUMN id SET DEFAULT nextval('public.journal_entries_id_seq'::regclass);


--
-- Name: journal_entries entry_number; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entries ALTER COLUMN entry_number SET DEFAULT nextval('public.journal_entries_entry_number_seq'::regclass);


--
-- Name: journal_entry_lines id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entry_lines ALTER COLUMN id SET DEFAULT nextval('public.journal_entry_lines_id_seq'::regclass);


--
-- Name: lead_interactions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_interactions ALTER COLUMN id SET DEFAULT nextval('public.lead_interactions_id_seq'::regclass);


--
-- Name: leads id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads ALTER COLUMN id SET DEFAULT nextval('public.leads_id_seq'::regclass);


--
-- Name: leave_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_requests ALTER COLUMN id SET DEFAULT nextval('public.leave_requests_id_seq'::regclass);


--
-- Name: maintenance_contracts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_contracts ALTER COLUMN id SET DEFAULT nextval('public.maintenance_contracts_id_seq'::regclass);


--
-- Name: maintenance_records id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_records ALTER COLUMN id SET DEFAULT nextval('public.maintenance_records_id_seq'::regclass);


--
-- Name: maintenance_visits id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_visits ALTER COLUMN id SET DEFAULT nextval('public.maintenance_visits_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: otp_codes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.otp_codes ALTER COLUMN id SET DEFAULT nextval('public.otp_codes_id_seq'::regclass);


--
-- Name: payment_vouchers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_vouchers ALTER COLUMN id SET DEFAULT nextval('public.payment_vouchers_id_seq'::regclass);


--
-- Name: permissions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions ALTER COLUMN id SET DEFAULT nextval('public.permissions_id_seq'::regclass);


--
-- Name: petty_cash_funds id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.petty_cash_funds ALTER COLUMN id SET DEFAULT nextval('public.petty_cash_funds_id_seq'::regclass);


--
-- Name: petty_cash_transactions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.petty_cash_transactions ALTER COLUMN id SET DEFAULT nextval('public.petty_cash_transactions_id_seq'::regclass);


--
-- Name: project_employees id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_employees ALTER COLUMN id SET DEFAULT nextval('public.project_employees_id_seq'::regclass);


--
-- Name: project_ratings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_ratings ALTER COLUMN id SET DEFAULT nextval('public.project_ratings_id_seq'::regclass);


--
-- Name: projects id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects ALTER COLUMN id SET DEFAULT nextval('public.projects_id_seq'::regclass);


--
-- Name: purchase_invoice_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_invoice_items ALTER COLUMN id SET DEFAULT nextval('public.purchase_invoice_items_id_seq'::regclass);


--
-- Name: purchase_invoices id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_invoices ALTER COLUMN id SET DEFAULT nextval('public.purchase_invoices_id_seq'::regclass);


--
-- Name: purchase_order_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_items ALTER COLUMN id SET DEFAULT nextval('public.purchase_order_items_id_seq'::regclass);


--
-- Name: purchase_orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders ALTER COLUMN id SET DEFAULT nextval('public.purchase_orders_id_seq'::regclass);


--
-- Name: quotations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotations ALTER COLUMN id SET DEFAULT nextval('public.quotations_id_seq'::regclass);


--
-- Name: receipt_voucher_invoices id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipt_voucher_invoices ALTER COLUMN id SET DEFAULT nextval('public.receipt_voucher_invoices_id_seq'::regclass);


--
-- Name: receipt_vouchers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipt_vouchers ALTER COLUMN id SET DEFAULT nextval('public.receipt_vouchers_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: sales_invoice_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_invoice_items ALTER COLUMN id SET DEFAULT nextval('public.sales_invoice_items_id_seq'::regclass);


--
-- Name: sales_invoices id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_invoices ALTER COLUMN id SET DEFAULT nextval('public.sales_invoices_id_seq'::regclass);


--
-- Name: suppliers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers ALTER COLUMN id SET DEFAULT nextval('public.suppliers_id_seq'::regclass);


--
-- Name: tasks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks ALTER COLUMN id SET DEFAULT nextval('public.tasks_id_seq'::regclass);


--
-- Name: tax_invoice_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tax_invoice_logs ALTER COLUMN id SET DEFAULT nextval('public.tax_invoice_logs_id_seq'::regclass);


--
-- Name: time_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_logs ALTER COLUMN id SET DEFAULT nextval('public.time_logs_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: warehouse_stock id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouse_stock ALTER COLUMN id SET DEFAULT nextval('public.warehouse_stock_id_seq'::regclass);


--
-- Name: warehouses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouses ALTER COLUMN id SET DEFAULT nextval('public.warehouses_id_seq'::regclass);


--
-- Data for Name: approval_steps; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.approval_steps (id, quotation_id, step_order, role_required, approved_by, status, comments, decided_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: assets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.assets (id, project_id, name, serial_number, category, status, location, assigned_to, warranty_start_date, warranty_end_date, purchase_date, purchase_price, metadata, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: attendance; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.attendance (id, employee_id, attendance_date, department_id, expected_hours, actual_hours, overtime_hours, overtime_rate, late_minutes, status, created_at, updated_at, notes) FROM stdin;
3	59	2026-05-02	48	8.00	0.00	0.00	1.50	0	present	2026-05-02 15:53:03.147759+03	2026-05-02 16:10:55.600509+03	Test note for employee 59 at 2026-05-02T13:10:55.599Z
4	56	2026-05-02	48	8.00	0.00	0.00	1.50	0	present	2026-05-02 16:17:32.326085+03	2026-05-02 16:18:25.270528+03	10
5	53	2026-05-02	47	8.00	0.00	0.00	1.50	0	present	2026-05-02 16:19:48.08808+03	2026-05-02 16:19:48.08808+03	\N
6	60	2026-05-02	45	8.00	0.16	0.00	1.50	0	half_day	2026-05-02 19:38:21.653143+03	2026-05-02 22:49:58.373699+03	\N
7	54	2026-05-02	46	8.00	0.00	0.00	1.50	0	present	2026-05-02 23:01:32.266467+03	2026-05-02 23:01:32.266467+03	\N
8	60	2026-05-03	45	8.00	0.00	0.00	1.50	0	present	2026-05-03 13:43:19.23821+03	2026-05-03 13:43:19.23821+03	\N
9	61	2026-05-03	49	8.00	0.00	0.00	1.50	0	present	2026-05-03 18:20:03.459223+03	2026-05-03 18:20:03.459223+03	\N
10	61	2026-05-04	49	8.00	7.36	0.00	1.50	0	present	2026-05-04 10:40:24.440149+03	2026-05-04 18:05:40.868174+03	\N
11	54	2026-05-05	46	8.00	0.00	0.00	1.50	0	present	2026-05-05 15:02:15.934385+03	2026-05-05 15:02:15.934385+03	\N
12	59	2026-05-05	48	8.00	0.00	0.00	1.50	0	present	2026-05-05 15:57:29.545969+03	2026-05-05 15:57:29.545969+03	\N
13	61	2026-05-05	49	8.00	0.00	0.00	1.50	0	present	2026-05-05 17:37:48.635642+03	2026-05-05 17:37:48.635642+03	\N
15	60	2026-05-06	45	8.00	0.00	0.00	1.50	0	present	2026-05-06 18:18:19.043038+03	2026-05-06 18:18:19.043038+03	\N
14	61	2026-05-06	49	8.00	1.47	0.00	1.50	0	half_day	2026-05-06 14:02:24.254004+03	2026-05-06 23:21:13.539192+03	لبلب
16	61	2026-05-07	49	8.00	0.01	0.00	1.50	0	half_day	2026-05-07 17:21:32.380074+03	2026-05-07 17:21:53.163408+03	\N
17	60	2026-05-16	45	8.00	0.00	0.00	1.50	0	present	2026-05-16 23:04:19.024059+03	2026-05-16 23:04:19.024059+03	\N
\.


--
-- Data for Name: budgets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.budgets (id, budget_code, name, name_ar, fiscal_year, start_date, end_date, total_amount, department, cost_center, status, notes, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: chart_of_accounts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.chart_of_accounts (id, account_code, account_name, account_type, parent_id, normal_balance, description, is_active, created_at, updated_at, parent_account_id, code, level, account_name_ar, is_vat_applicable, vat_rate, cost_center_type, linked_entity_id, financial_statement, report_category, depreciation_method, useful_life_years, salvage_value) FROM stdin;
1	1	Assets	asset	\N	debit	\N	t	2026-04-06 21:06:34.285968+02	2026-04-06 21:06:34.285968+02	\N	\N	1	الأصول	f	15.00	\N	\N	balance_sheet	asset	\N	\N	0.00
2	2	Liabilities	liability	\N	credit	\N	t	2026-04-06 21:06:34.285968+02	2026-04-06 21:06:34.285968+02	\N	\N	1	الخصوم	f	15.00	\N	\N	balance_sheet	liability	\N	\N	0.00
3	3	Expenses	expense	\N	debit	\N	t	2026-04-06 21:06:34.285968+02	2026-04-06 21:06:34.285968+02	\N	\N	1	مصادر الإنفاق	f	15.00	\N	\N	income_statement	expense	\N	\N	0.00
4	4	Revenue	revenue	\N	credit	\N	t	2026-04-06 21:06:34.285968+02	2026-04-06 21:06:34.285968+02	\N	\N	1	مصادر الدخل	f	15.00	\N	\N	income_statement	revenue	\N	\N	0.00
5	12	Current Assets	asset	1	debit	\N	t	2026-04-06 21:06:34.285968+02	2026-04-06 21:06:34.285968+02	\N	\N	2	الأصول المتداولة	f	15.00	\N	\N	balance_sheet	current_asset	\N	\N	0.00
6	11	Fixed Assets	asset	1	debit	\N	t	2026-04-06 21:06:34.285968+02	2026-04-06 21:06:34.285968+02	\N	\N	2	الأصول الثابتة	f	15.00	\N	\N	balance_sheet	fixed_asset	\N	\N	0.00
7	22	Long-term Liabilities	liability	2	credit	\N	t	2026-04-06 21:06:34.285968+02	2026-04-06 21:06:34.285968+02	\N	\N	2	الخصوم طويلة الأجل	f	15.00	\N	\N	balance_sheet	long_term_liability	\N	\N	0.00
8	21	Current Liabilities	liability	2	credit	\N	t	2026-04-06 21:06:34.285968+02	2026-04-06 21:06:34.285968+02	\N	\N	2	الخصوم المتداولة	f	15.00	\N	\N	balance_sheet	current_liability	\N	\N	0.00
9	31	Operating Expenses	expense	3	debit	\N	t	2026-04-06 21:06:34.285968+02	2026-04-06 21:06:34.285968+02	\N	\N	2	مصاريف التشغيل	f	15.00	\N	\N	income_statement	operating_expense	\N	\N	0.00
10	32	Administrative Expenses	expense	3	debit	\N	t	2026-04-06 21:06:34.285968+02	2026-04-06 21:06:34.285968+02	\N	\N	2	مصاريف إدارية	f	15.00	\N	\N	income_statement	administrative_expense	\N	\N	0.00
11	41	Sales Revenue	revenue	4	credit	\N	t	2026-04-06 21:06:34.285968+02	2026-04-06 21:06:34.285968+02	\N	\N	2	إيرادات المبيعات	f	15.00	\N	\N	income_statement	sales_revenue	\N	\N	0.00
12	42	Other Income	revenue	4	credit	\N	t	2026-04-06 21:06:34.285968+02	2026-04-06 21:06:34.285968+02	\N	\N	2	إيرادات أخرى	f	15.00	\N	\N	income_statement	other_income	\N	\N	0.00
13	121	Accounts Receivable	asset	5	debit	\N	t	2026-04-06 21:06:34.285968+02	2026-04-06 21:06:34.285968+02	\N	\N	3	العملاء	f	15.00	\N	\N	balance_sheet	accounts_receivable	\N	\N	0.00
21	2220102	VAT - Purchases (Input)	asset	16	debit	 [DEACTIVATED - Use official codes instead]	t	2026-04-06 21:06:34.285968+02	2026-05-14 21:44:23.847886+03	\N	\N	4	ضريبة القيمة المضافة - مشتريات	t	15.00	\N	\N	balance_sheet	vat_receivable	\N	\N	0.00
18	315	Fuel & Gas	expense	9	debit	\N	t	2026-04-06 21:06:34.285968+02	2026-04-06 21:06:34.285968+02	\N	\N	3	وقود ومحروقات	f	15.00	\N	\N	income_statement	fuel	\N	\N	0.00
19	412	Project Contracts Revenue	revenue	11	credit	\N	t	2026-04-06 21:06:34.285968+02	2026-04-06 21:06:34.285968+02	\N	\N	3	إيرادات عقود المشاريع	f	15.00	\N	\N	income_statement	project_revenue	\N	\N	0.00
22	2220103	Net VAT Payable	liability	16	credit	\N	t	2026-04-06 21:06:34.285968+02	2026-04-06 21:06:34.285968+02	\N	\N	4	ضريبة القيمة المضافة المستحقة	t	15.00	\N	\N	balance_sheet	net_vat_payable	\N	\N	0.00
25	4120	Project Revenue	revenue	19	credit	\N	t	2026-04-06 21:06:34.285968+02	2026-04-06 21:06:34.285968+02	\N	\N	4	إيرادات مشروع	f	0.00	\N	\N	income_statement	project_revenue	\N	\N	0.00
30	314	Vehicle Maintenance	expense	9	debit	\N	t	2026-04-06 21:06:34.285968+02	2026-04-06 21:06:34.285968+02	\N	\N	3	صيانة مركبات	f	15.00	vehicle	\N	income_statement	vehicle_maintenance	\N	\N	0.00
31	321	Office Supplies	expense	10	debit	\N	t	2026-04-06 21:06:34.285968+02	2026-04-06 21:06:34.285968+02	\N	\N	3	مصاريف مكتبية	f	15.00	\N	\N	income_statement	office_supplies	\N	\N	0.00
17	311	Salaries & Wages	expense	9	debit	\N	f	2026-04-06 21:06:34.285968+02	2026-04-27 12:39:47.863111+03	\N	\N	3	رواتب وأجور	f	15.00	\N	\N	income_statement	salaries	\N	\N	0.00
26	31101	Sales Staff Salaries	expense	17	debit	\N	f	2026-04-06 21:06:34.285968+02	2026-04-27 12:39:47.863111+03	\N	\N	4	رواتب المبيعات	f	15.00	department	\N	income_statement	salaries	\N	\N	0.00
27	31102	Installation Staff Salaries	expense	17	debit	\N	f	2026-04-06 21:06:34.285968+02	2026-04-27 12:39:47.863111+03	\N	\N	4	رواتب التركيب	f	15.00	department	\N	income_statement	salaries	\N	\N	0.00
28	312	Rent Expenses	expense	9	debit	\N	f	2026-04-06 21:06:34.285968+02	2026-04-27 12:39:47.863111+03	\N	\N	3	إيجارات	f	15.00	\N	\N	income_statement	rent	\N	\N	0.00
14	124	Bank & Cash	asset	5	debit	 [DEACTIVATED - Use official codes instead]	f	2026-04-06 21:06:34.285968+02	2026-04-27 15:01:19.862486+03	\N	\N	3	البنك والصندوق	f	15.00	\N	\N	balance_sheet	cash_and_bank	\N	\N	0.00
16	222	VAT Payable	liability	7	credit	 [DEACTIVATED - Use official codes instead]	f	2026-04-06 21:06:34.285968+02	2026-04-27 15:01:19.862486+03	\N	\N	3	ضريبة القيمة المضافة	f	15.00	\N	\N	balance_sheet	tax_payable	\N	\N	0.00
20	2220101	VAT - Sales (Output)	liability	16	credit	 [DEACTIVATED - Use official codes instead]	f	2026-04-06 21:06:34.285968+02	2026-04-27 15:01:19.862486+03	\N	\N	4	ضريبة القيمة المضافة - مبيعات	t	15.00	\N	\N	balance_sheet	output_vat	\N	\N	0.00
23	12401	Bank - Al Rajhi	asset	14	debit	 [DEACTIVATED - Use official codes instead]	f	2026-04-06 21:06:34.285968+02	2026-04-27 15:01:19.862486+03	\N	\N	4	البنك - الراجحي	f	0.00	\N	\N	balance_sheet	bank_account	\N	\N	0.00
24	12403	Main Cash	asset	14	debit	 [DEACTIVATED - Use official codes instead]	f	2026-04-06 21:06:34.285968+02	2026-04-27 15:01:19.862486+03	\N	\N	4	الصندوق الرئيسي	f	0.00	\N	\N	balance_sheet	cash	\N	\N	0.00
29	31505	Infrastructure & Smart Cities Overtime	expense	9	debit	\N	t	2026-04-06 21:06:34.285968+02	2026-04-27 18:43:59.030445+03	\N	\N	3	إضافي البنية التحتية والمدن الذكية	f	15.00	\N	\N	income_statement	utilities	\N	\N	0.00
55	111	Tangible Fixed Assets	asset	6	debit	\N	t	2026-04-07 06:53:51.443041+02	2026-04-07 06:53:51.443041+02	\N	\N	3	الموجودات الثابتة	f	15.00	\N	\N	balance_sheet	fixed_asset	\N	\N	0.00
63	112	Accumulated Depreciation	asset	6	credit	\N	t	2026-04-07 06:53:51.443041+02	2026-04-07 06:53:51.443041+02	\N	\N	3	مجمع إهلاك الأصول الثابتة	f	15.00	\N	\N	balance_sheet	accumulated_depreciation	\N	\N	0.00
71	323	Depreciation Expenses	expense	10	debit	\N	t	2026-04-07 06:53:51.443041+02	2026-04-07 06:53:51.443041+02	\N	\N	3	مصاريف إهلاك الأصول	f	15.00	\N	\N	income_statement	depreciation_expense	\N	\N	0.00
78	123	Inventory	asset	5	debit	\N	t	2026-04-07 08:58:06.669355+02	2026-04-07 08:58:06.669355+02	\N	\N	3	المخزون	f	15.00	\N	\N	balance_sheet	inventory	\N	\N	0.00
84	213	Accounts Payable	liability	8	credit	\N	t	2026-04-07 08:58:06.669355+02	2026-04-07 08:58:06.669355+02	\N	\N	3	الموردون / الدائنون	f	15.00	\N	\N	balance_sheet	accounts_payable	\N	\N	0.00
87	33	Cost of Revenue	expense	3	debit	\N	t	2026-04-07 08:58:06.669355+02	2026-04-07 08:58:06.669355+02	\N	\N	2	تكلفة الإيراد	f	15.00	\N	\N	income_statement	cost_of_revenue	\N	\N	0.00
89	33101	Solar Panels Cost	expense	\N	debit	\N	t	2026-04-07 08:58:06.669355+02	2026-04-07 08:58:06.669355+02	\N	\N	4	تكلفة الألواح الشمسية	f	15.00	\N	\N	income_statement	cost_of_revenue	\N	\N	0.00
56	11101	Leasehold Improvements	asset	55	debit	\N	t	2026-04-07 06:53:51.443041+02	2026-05-07 15:56:12.557192+03	\N	\N	4	صيانة وتعديلات المباني	f	15.00	\N	\N	balance_sheet	fixed_asset	\N	\N	0.00
57	11102	Furniture & Office Equipment	asset	55	debit	\N	t	2026-04-07 06:53:51.443041+02	2026-05-07 15:56:12.557192+03	\N	\N	4	أثاث وتجهيزات مكتبية	f	15.00	\N	\N	balance_sheet	fixed_asset	\N	\N	0.00
58	11103	Vehicles & Transport	asset	55	debit	\N	t	2026-04-07 06:53:51.443041+02	2026-05-07 15:56:12.557192+03	\N	\N	4	وسائط النقل والسيارات	f	15.00	\N	\N	balance_sheet	fixed_asset	\N	\N	0.00
59	11104	Machinery & Equipment	asset	55	debit	\N	t	2026-04-07 06:53:51.443041+02	2026-05-07 15:56:12.557192+03	\N	\N	4	آلات ومعدات التشغيل	f	15.00	\N	\N	balance_sheet	fixed_asset	\N	\N	0.00
60	11105	Computer Equipment	asset	55	debit	\N	t	2026-04-07 06:53:51.443041+02	2026-05-07 15:56:12.557192+03	\N	\N	4	تجهيزات الكمبيوتر	f	15.00	\N	\N	balance_sheet	fixed_asset	\N	\N	0.00
61	11106	Tools & Instruments	asset	55	debit	\N	t	2026-04-07 06:53:51.443041+02	2026-05-07 15:56:12.557192+03	\N	\N	4	العدد والأدوات	f	15.00	\N	\N	balance_sheet	fixed_asset	\N	\N	0.00
62	11107	Accounting Software	asset	55	debit	\N	t	2026-04-07 06:53:51.443041+02	2026-05-07 15:56:12.557192+03	\N	\N	4	برامج المحاسبة	f	15.00	\N	\N	balance_sheet	fixed_asset	\N	\N	0.00
64	11201	Accum. Depr - Leasehold	asset	63	credit	\N	t	2026-04-07 06:53:51.443041+02	2026-05-07 15:56:12.557192+03	\N	\N	4	مجمع إهلاك تحسينات المباني	f	15.00	\N	\N	balance_sheet	accumulated_depreciation	\N	\N	0.00
73	32302	Depr - Furniture	expense	71	debit	\N	t	2026-04-07 06:53:51.443041+02	2026-05-07 15:56:12.557192+03	\N	\N	4	إهلاك الأثاث	f	15.00	\N	\N	income_statement	depreciation_expense	\N	\N	0.00
90	33102	Inverters Cost	expense	\N	debit	\N	t	2026-04-07 08:58:06.669355+02	2026-04-07 08:58:06.669355+02	\N	\N	4	تكلفة المحولات	f	15.00	\N	\N	income_statement	cost_of_revenue	\N	\N	0.00
91	33103	Cables & Accessories Cost	expense	\N	debit	\N	t	2026-04-07 08:58:06.669355+02	2026-04-07 08:58:06.669355+02	\N	\N	4	تكلفة الكابلات	f	15.00	\N	\N	income_statement	cost_of_revenue	\N	\N	0.00
93	33201	Installation Labor	expense	\N	debit	\N	t	2026-04-07 08:58:06.669355+02	2026-04-07 08:58:06.669355+02	\N	\N	4	عمالة تركيب	f	15.00	\N	\N	income_statement	cost_of_revenue	\N	\N	0.00
106	22301	Accrued Salaries	liability	7	credit	\N	t	2026-04-07 09:33:45.318091+02	2026-04-07 09:33:45.318091+02	\N	\N	3	مصاريف الرواتب مستحقة	f	15.00	\N	\N	balance_sheet	payroll_liability	\N	\N	0.00
107	22401	Leave Allowance Payable	liability	7	credit	\N	t	2026-04-07 09:33:45.318091+02	2026-04-07 09:33:45.318091+02	\N	\N	3	مخصص بدل إجازة مستحق	f	15.00	\N	\N	balance_sheet	payroll_liability	\N	\N	0.00
108	22402	Ticket Allowance Payable	liability	7	credit	\N	t	2026-04-07 09:33:45.318091+02	2026-04-07 09:33:45.318091+02	\N	\N	3	مخصص بدل تذاكر مستحق	f	15.00	\N	\N	balance_sheet	payroll_liability	\N	\N	0.00
127	411	Net Sales	revenue	11	credit	\N	t	2026-04-24 18:11:54.826682+03	2026-04-24 18:11:54.826682+03	\N	\N	3	صافي المبيعات	f	15.00	\N	\N	income_statement	\N	\N	\N	0.00
102	3220003	Admin Staff Salaries	expense	\N	debit	\N	t	2026-04-07 09:33:45.318091+02	2026-04-27 11:49:51.880815+03	\N	\N	4	رواتب الإدارة	f	15.00	\N	\N	income_statement	payroll_expense	\N	\N	0.00
103	3220001	Housing Allowance (Admin)	expense	\N	debit	\N	t	2026-04-07 09:33:45.318091+02	2026-04-27 11:49:51.880815+03	\N	\N	4	بدل سكن إدارة	f	15.00	\N	\N	income_statement	payroll_expense	\N	\N	0.00
104	3220002	Leave Allowance (Admin)	expense	\N	debit	\N	t	2026-04-07 09:33:45.318091+02	2026-04-27 11:49:51.880815+03	\N	\N	4	بدل إجازة إدارة	f	15.00	\N	\N	income_statement	payroll_expense	\N	\N	0.00
105	3220006	Other Allowances (Admin)	expense	\N	debit	\N	t	2026-04-07 09:33:45.318091+02	2026-04-27 11:49:51.880815+03	\N	\N	4	بدلات أخرى	f	15.00	\N	\N	income_statement	payroll_expense	\N	\N	0.00
132	22302	GOSI Payable	liability	\N	credit	\N	t	2026-04-27 12:08:38.842024+03	2026-04-27 12:08:38.842024+03	\N	\N	4	التأمينات الاجتماعية مستحقة	f	15.00	\N	\N	balance_sheet	accrued_expenses	\N	\N	0.00
95	31301	Industrial Automation Salaries	expense	29	debit	\N	t	2026-04-07 09:33:45.318091+02	2026-04-27 12:39:47.863111+03	\N	\N	4	رواتب الأتمتة الصناعية	f	15.00	\N	\N	income_statement	payroll_expense	\N	\N	0.00
96	31302	Digital Transformation Salaries	expense	29	debit	\N	t	2026-04-07 09:33:45.318091+02	2026-04-27 12:39:47.863111+03	\N	\N	4	رواتب التحول الرقمي	f	15.00	\N	\N	income_statement	payroll_expense	\N	\N	0.00
97	31303	Execution & Operations Salaries	expense	29	debit	\N	t	2026-04-07 09:33:45.318091+02	2026-04-27 12:39:47.863111+03	\N	\N	4	رواتب التنفيذ والتشغيل	f	15.00	\N	\N	income_statement	payroll_expense	\N	\N	0.00
98	31304	Infrastructure & Smart Cities Salaries	expense	29	debit	\N	t	2026-04-07 09:33:45.318091+02	2026-04-27 12:39:47.863111+03	\N	\N	4	رواتب البنية التحتية والمدن الذكية	f	15.00	\N	\N	income_statement	payroll_expense	\N	\N	0.00
131	31401	Industrial Automation Housing	expense	\N	debit	\N	t	2026-04-27 12:08:38.842024+03	2026-04-27 12:40:46.875038+03	\N	\N	4	بدل سكن الأتمتة الصناعية	f	15.00	\N	\N	income_statement	payroll_expense	\N	\N	0.00
101	322	Admin Salaries	expense	10	debit	 [DEACTIVATED - Use official codes instead]	f	2026-04-07 09:33:45.318091+02	2026-04-27 15:01:19.862486+03	\N	\N	3	رواتب الإدارة	f	15.00	\N	\N	income_statement	payroll_expense	\N	\N	0.00
92	332	Subcontractors Cost	expense	87	debit	\N	t	2026-04-07 08:58:06.669355+02	2026-05-07 15:56:12.557192+03	\N	\N	3	تكلفة مقاولي الباطن	f	15.00	\N	\N	income_statement	cost_of_revenue	\N	\N	0.00
109	23201	End of Service Provision	liability	\N	credit	\N	t	2026-04-07 09:33:45.318091+02	2026-05-07 15:56:12.557192+03	\N	\N	3	مستحقات مكافأة نهاية الخدمة	f	15.00	\N	\N	balance_sheet	payroll_liability	\N	\N	0.00
79	12301	Cash on Hand	asset	78	debit	\N	t	2026-04-07 08:58:06.669355+02	2026-05-07 15:56:12.557192+03	\N	\N	4	النقدية	f	15.00	\N	\N	balance_sheet	inventory	\N	\N	0.00
110	122	Bank Accounts	asset	\N	debit	\N	t	2026-04-21 06:59:50.033519+02	2026-05-14 21:36:16.811689+03	\N	\N	2	الحسابات البنكية	f	15.00	\N	\N	balance_sheet	current_assets	\N	\N	0.00
111	12201	Main Bank Account	asset	\N	debit	\N	t	2026-04-21 06:59:50.033519+02	2026-05-14 21:36:16.811689+03	\N	\N	3	الحساب البنكي الرئيسي	f	15.00	\N	\N	balance_sheet	cash_&_bank	\N	\N	0.00
99	31305	Smart Buildings & Homes Salaries	expense	29	debit	\N	t	2026-04-07 09:33:45.318091+02	2026-04-27 12:39:47.863111+03	\N	\N	4	رواتب المباني والمنازل الذكية	f	15.00	\N	\N	income_statement	payroll_expense	\N	\N	0.00
100	31306	Energy Efficiency Salaries	expense	29	debit	\N	t	2026-04-07 09:33:45.318091+02	2026-04-27 12:39:47.863111+03	\N	\N	4	رواتب كفاءة الطاقة	f	15.00	\N	\N	income_statement	payroll_expense	\N	\N	0.00
139	31307	Renewable Energy Salaries	expense	\N	debit	\N	t	2026-04-27 12:39:47.863111+03	2026-04-27 12:39:47.863111+03	\N	\N	4	رواتب الطاقة المتجددة	f	15.00	\N	\N	income_statement	payroll_expense	\N	\N	0.00
141	31402	Digital Transformation Housing	expense	\N	debit	\N	t	2026-04-27 12:40:46.875038+03	2026-04-27 12:40:46.875038+03	\N	\N	4	بدل سكن التحول الرقمي	f	15.00	\N	\N	income_statement	payroll_expense	\N	\N	0.00
142	31403	Execution & Operations Housing	expense	\N	debit	\N	t	2026-04-27 12:40:46.875038+03	2026-04-27 12:40:46.875038+03	\N	\N	4	بدل سكن التنفيذ والتشغيل	f	15.00	\N	\N	income_statement	payroll_expense	\N	\N	0.00
143	31404	Infrastructure Housing	expense	\N	debit	\N	t	2026-04-27 12:40:46.875038+03	2026-04-27 12:40:46.875038+03	\N	\N	4	بدل سكن البنية التحتية	f	15.00	\N	\N	income_statement	payroll_expense	\N	\N	0.00
144	31405	Smart Buildings Housing	expense	\N	debit	\N	t	2026-04-27 12:40:46.875038+03	2026-04-27 12:40:46.875038+03	\N	\N	4	بدل سكن المباني الذكية	f	15.00	\N	\N	income_statement	payroll_expense	\N	\N	0.00
145	31406	Energy Efficiency Housing	expense	\N	debit	\N	t	2026-04-27 12:40:46.875038+03	2026-04-27 12:40:46.875038+03	\N	\N	4	بدل سكن كفاءة الطاقة	f	15.00	\N	\N	income_statement	payroll_expense	\N	\N	0.00
146	31407	Renewable Energy Housing	expense	\N	debit	\N	t	2026-04-27 12:40:46.875038+03	2026-04-27 12:40:46.875038+03	\N	\N	4	بدل سكن الطاقة المتجددة	f	15.00	\N	\N	income_statement	payroll_expense	\N	\N	0.00
147	31501	Industrial Automation Overtime	expense	\N	debit	\N	t	2026-04-27 12:40:46.875038+03	2026-04-27 12:40:46.875038+03	\N	\N	4	إضافي الأتمتة الصناعية	f	15.00	\N	\N	income_statement	payroll_expense	\N	\N	0.00
148	31502	Digital Transformation Overtime	expense	\N	debit	\N	t	2026-04-27 12:40:46.875038+03	2026-04-27 12:40:46.875038+03	\N	\N	4	إضافي التحول الرقمي	f	15.00	\N	\N	income_statement	payroll_expense	\N	\N	0.00
149	31503	Execution & Operations Overtime	expense	\N	debit	\N	t	2026-04-27 12:40:46.875038+03	2026-04-27 12:40:46.875038+03	\N	\N	4	إضافي التنفيذ والتشغيل	f	15.00	\N	\N	income_statement	payroll_expense	\N	\N	0.00
150	31504	Infrastructure Overtime	expense	\N	debit	\N	t	2026-04-27 12:40:46.875038+03	2026-04-27 12:40:46.875038+03	\N	\N	4	إضافي البنية التحتية	f	15.00	\N	\N	income_statement	payroll_expense	\N	\N	0.00
151	31506	Smart Buildings Overtime	expense	\N	debit	\N	t	2026-04-27 12:40:46.875038+03	2026-04-27 12:40:46.875038+03	\N	\N	4	إضافي المباني الذكية	f	15.00	\N	\N	income_statement	payroll_expense	\N	\N	0.00
152	31507	Energy Efficiency Overtime	expense	\N	debit	\N	t	2026-04-27 12:40:46.875038+03	2026-04-27 12:40:46.875038+03	\N	\N	4	إضافي كفاءة الطاقة	f	15.00	\N	\N	income_statement	payroll_expense	\N	\N	0.00
153	31508	Renewable Energy Overtime	expense	\N	debit	\N	t	2026-04-27 12:40:46.875038+03	2026-04-27 12:40:46.875038+03	\N	\N	4	إضافي الطاقة المتجددة	f	15.00	\N	\N	income_statement	payroll_expense	\N	\N	0.00
154	31601	GOSI Employer Expense	expense	\N	debit	\N	t	2026-04-27 12:42:35.003317+03	2026-04-27 12:42:35.003317+03	\N	\N	4	مصروف التأمينات الاجتماعية - صاحب العمل	f	15.00	\N	\N	income_statement	payroll_expense	\N	\N	0.00
155	3220004	Bonus Allowance (Admin)	expense	\N	debit	Official account from company report	t	2026-04-27 15:01:19.870216+03	2026-04-27 15:01:19.870216+03	\N	\N	1	بدل مكافأة (إداري)	f	15.00	\N	\N	\N	operating_expense	\N	\N	0.00
156	3220005	Ticket Allowance (Admin)	expense	\N	debit	Official account from company report	t	2026-04-27 15:01:19.880003+03	2026-04-27 15:01:19.880003+03	\N	\N	1	بدل تذاكر (إداري)	f	15.00	\N	\N	\N	operating_expense	\N	\N	0.00
65	11202	Accum. Depr - Furniture	asset	63	credit	\N	t	2026-04-07 06:53:51.443041+02	2026-05-07 15:56:12.557192+03	\N	\N	4	مجمع إهلاك أثاث ومكتبية	f	15.00	\N	\N	balance_sheet	accumulated_depreciation	\N	\N	0.00
66	11203	Accum. Depr - Vehicles	asset	63	credit	\N	t	2026-04-07 06:53:51.443041+02	2026-05-07 15:56:12.557192+03	\N	\N	4	مجمع إهلاك السيارات	f	15.00	\N	\N	balance_sheet	accumulated_depreciation	\N	\N	0.00
67	11204	Accum. Depr - Machinery	asset	63	credit	\N	t	2026-04-07 06:53:51.443041+02	2026-05-07 15:56:12.557192+03	\N	\N	4	مجمع إهلاك معدات التشغيل	f	15.00	\N	\N	balance_sheet	accumulated_depreciation	\N	\N	0.00
68	11205	Accum. Depr - Computers	asset	63	credit	\N	t	2026-04-07 06:53:51.443041+02	2026-05-07 15:56:12.557192+03	\N	\N	4	مجمع إهلاك الكمبيوتر	f	15.00	\N	\N	balance_sheet	accumulated_depreciation	\N	\N	0.00
69	11206	Accum. Depr - Tools	asset	63	credit	\N	t	2026-04-07 06:53:51.443041+02	2026-05-07 15:56:12.557192+03	\N	\N	4	مجمع إهلاك العدد والأدوات	f	15.00	\N	\N	balance_sheet	accumulated_depreciation	\N	\N	0.00
70	11207	Accum. Depr - Software	asset	63	credit	\N	t	2026-04-07 06:53:51.443041+02	2026-05-07 15:56:12.557192+03	\N	\N	4	مجمع إهلاك البرامج	f	15.00	\N	\N	balance_sheet	accumulated_depreciation	\N	\N	0.00
72	32301	Depr - Leasehold	expense	71	debit	\N	t	2026-04-07 06:53:51.443041+02	2026-05-07 15:56:12.557192+03	\N	\N	4	إهلاك تحسينات الأصول	f	15.00	\N	\N	income_statement	depreciation_expense	\N	\N	0.00
74	32303	Depr - Vehicles	expense	71	debit	\N	t	2026-04-07 06:53:51.443041+02	2026-05-07 15:56:12.557192+03	\N	\N	4	إهلاك السيارات	f	15.00	\N	\N	income_statement	depreciation_expense	\N	\N	0.00
75	32304	Depr - Machinery	expense	71	debit	\N	t	2026-04-07 06:53:51.443041+02	2026-05-07 15:56:12.557192+03	\N	\N	4	إهلاك معدات التشغيل	f	15.00	\N	\N	income_statement	depreciation_expense	\N	\N	0.00
76	32305	Depr - Computers	expense	71	debit	\N	t	2026-04-07 06:53:51.443041+02	2026-05-07 15:56:12.557192+03	\N	\N	4	إهلاك أجهزة الكمبيوتر	f	15.00	\N	\N	income_statement	depreciation_expense	\N	\N	0.00
77	32306	Depr - Tools	expense	71	debit	\N	t	2026-04-07 06:53:51.443041+02	2026-05-07 15:56:12.557192+03	\N	\N	4	إهلاك العدد والأدوات	f	15.00	\N	\N	income_statement	depreciation_expense	\N	\N	0.00
80	12302	Solar Panels Stock	asset	78	debit	\N	t	2026-04-07 08:58:06.669355+02	2026-05-07 15:56:12.557192+03	\N	\N	4	مخزون الألواح الشمسية	f	15.00	\N	\N	balance_sheet	inventory	\N	\N	0.00
82	12304	Cables & Accessories	asset	78	debit	\N	t	2026-04-07 08:58:06.669355+02	2026-05-07 15:56:12.557192+03	\N	\N	4	كابلات وملحقات	f	15.00	\N	\N	balance_sheet	inventory	\N	\N	0.00
83	12305	Work in Progress	asset	78	debit	\N	t	2026-04-07 08:58:06.669355+02	2026-05-07 15:56:12.557192+03	\N	\N	4	إنتاج تحت التشغيل	f	15.00	\N	\N	balance_sheet	inventory	\N	\N	0.00
86	21302	Foreign Suppliers Payable	liability	84	credit	\N	t	2026-04-07 08:58:06.669355+02	2026-05-07 15:56:12.557192+03	\N	\N	4	موردون خارجيون	f	15.00	\N	\N	balance_sheet	accounts_payable	\N	\N	0.00
81	12303	Petty Cash - Administrative	asset	78	debit	\N	t	2026-04-07 08:58:06.669355+02	2026-05-07 15:56:12.557192+03	\N	\N	4	عهد نقدية - إدارية	f	15.00	\N	\N	balance_sheet	inventory	\N	\N	0.00
128	4111	Sales Revenue	revenue	127	credit	\N	t	2026-04-24 18:11:54.826682+03	2026-05-07 15:56:12.557192+03	\N	\N	4	إيرادات المبيعات	f	15.00	\N	\N	income_statement	\N	\N	\N	0.00
129	4112	Sales Returns	revenue	127	debit	\N	t	2026-04-24 18:11:54.826682+03	2026-05-07 15:56:12.557192+03	\N	\N	4	مردودات المبيعات	f	15.00	\N	\N	income_statement	\N	\N	\N	0.00
130	4113	Discounts Allowed	revenue	127	debit	\N	t	2026-04-24 18:11:54.826682+03	2026-05-07 15:56:12.557192+03	\N	\N	4	الحسم الممنوح	f	15.00	\N	\N	income_statement	\N	\N	\N	0.00
157	121005	محمد جمال  - AR	asset	13	debit	\N	t	2026-05-04 10:48:34.831415+03	2026-05-14 21:36:16.811689+03	\N	\N	1	محمد جمال  - مدينون	f	15.00	\N	\N	balance_sheet	accounts_receivable	\N	\N	0.00
158	121006	محمد جمال - AR	asset	13	debit	\N	t	2026-05-07 14:17:50.834842+03	2026-05-14 21:36:16.811689+03	\N	\N	1	محمد جمال - مدينون	f	15.00	\N	\N	balance_sheet	accounts_receivable	\N	\N	0.00
15	211	Accounts Payable	liability	8	credit	 [NORMALIZED->213 family]	f	2026-04-06 21:06:34.285968+02	2026-05-07 15:56:12.557192+03	\N	\N	3	الدائنون	f	15.00	\N	\N	balance_sheet	accounts_payable	\N	\N	0.00
126	1230201	Banque Saudi Fransi	asset	14	Debit	\N	t	2026-04-22 16:59:57.631084+02	2026-05-14 21:58:52.745635+03	\N	\N	1	البنك الفرنسي - حساب	f	15.00	\N	\N	balance_sheet	bank_account	\N	\N	0.00
88	331	Materials Cost	expense	87	debit	\N	t	2026-04-07 08:58:06.669355+02	2026-05-07 15:56:12.557192+03	\N	\N	3	تكلفة المواد	f	15.00	\N	\N	income_statement	cost_of_revenue	\N	\N	0.00
85	21301	Local Suppliers Payable	liability	84	credit	\N	t	2026-04-07 08:58:06.669355+02	2026-05-07 15:56:12.557192+03	\N	\N	4	موردون محليون	f	15.00	\N	\N	balance_sheet	accounts_payable	\N	\N	0.00
112	12202	Petty Cash Bank	asset	\N	debit	\N	t	2026-04-21 06:59:50.033519+02	2026-05-14 21:36:16.811689+03	\N	\N	3	حساب الصندوق الفرعي	f	15.00	\N	\N	balance_sheet	cash_&_bank	\N	\N	0.00
113	221	VAT Payable/Receivable	liability	\N	credit	\N	t	2026-04-21 06:59:50.033519+02	2026-05-14 21:36:16.811689+03	\N	\N	2	ضريبة القيمة المضافة	t	15.00	\N	\N	balance_sheet	current_liabilities	\N	\N	0.00
117	320	General Administrative Expenses	expense	\N	debit	\N	t	2026-04-21 06:59:50.033519+02	2026-05-14 21:36:16.811689+03	\N	\N	2	مصاريف إدارية عامة	f	15.00	\N	\N	income_statement	operating_expenses	\N	\N	0.00
118	32001	Office Rent	expense	\N	debit	\N	t	2026-04-21 06:59:50.033519+02	2026-05-14 21:36:16.811689+03	\N	\N	3	إيجار المكتب	f	15.00	\N	\N	income_statement	administrative	\N	\N	0.00
119	32002	Utilities	expense	\N	debit	\N	t	2026-04-21 06:59:50.033519+02	2026-05-14 21:36:16.811689+03	\N	\N	3	خدمات عامة	f	15.00	\N	\N	income_statement	administrative	\N	\N	0.00
120	32003	Telecommunications	expense	\N	debit	\N	t	2026-04-21 06:59:50.033519+02	2026-05-14 21:36:16.811689+03	\N	\N	3	اتصالات	f	15.00	\N	\N	income_statement	administrative	\N	\N	0.00
121	32004	Office Maintenance	expense	\N	debit	\N	t	2026-04-21 06:59:50.033519+02	2026-05-14 21:36:16.811689+03	\N	\N	3	صيانة المكتب	f	15.00	\N	\N	income_statement	administrative	\N	\N	0.00
114	22101	VAT Output (Sales)	liability	113	credit	 [NORMALIZED->2220101]	f	2026-04-21 06:59:50.033519+02	2026-05-14 21:36:16.811689+03	\N	\N	3	ضريبة المخرجات	t	15.00	\N	\N	balance_sheet	tax_payable	\N	\N	0.00
115	22102	VAT Input (Purchases)	asset	113	debit	 [NORMALIZED->2220102]	f	2026-04-21 06:59:50.033519+02	2026-05-14 21:36:16.811689+03	\N	\N	3	ضريبة المدخلات	t	15.00	\N	\N	balance_sheet	tax_receivable	\N	\N	0.00
122	121001	موسي - AR	asset	13	debit	\N	t	2026-04-21 16:39:26.806125+02	2026-05-14 21:36:16.811689+03	\N	\N	1	موسي - مدينون	f	15.00	\N	\N	balance_sheet	accounts_receivable	\N	\N	0.00
125	121004	موسي - AR	asset	13	debit	\N	t	2026-04-21 16:51:37.301955+02	2026-05-14 21:36:16.811689+03	\N	\N	1	موسي - مدينون	f	15.00	\N	\N	balance_sheet	accounts_receivable	\N	\N	0.00
159	121007	ابراهيم - AR	asset	13	debit	\N	t	2026-05-07 17:02:15.093054+03	2026-05-14 21:36:16.811689+03	\N	\N	1	ابراهيم - مدينون	f	15.00	\N	\N	balance_sheet	accounts_receivable	\N	\N	0.00
160	24	Equity	equity	\N	credit	\N	t	2026-05-14 21:36:16.811689+03	2026-05-14 21:36:16.811689+03	\N	\N	1	حقوق الملكية	f	15.00	\N	\N	balance_sheet	equity	\N	\N	0.00
161	241	Capital	equity	\N	credit	\N	t	2026-05-14 21:36:16.811689+03	2026-05-14 21:36:16.811689+03	\N	\N	1	رأس المال	f	15.00	\N	\N	balance_sheet	equity	\N	\N	0.00
162	24101	Partner Capital - Abd	equity	\N	credit	\N	t	2026-05-14 21:36:16.811689+03	2026-05-14 21:36:16.811689+03	\N	\N	1	رأس مال الشريك عبد	f	15.00	\N	\N	balance_sheet	paid_in_capital	\N	\N	0.00
163	24102	Partner Capital - Amir	equity	\N	credit	\N	t	2026-05-14 21:36:16.811689+03	2026-05-14 21:36:16.811689+03	\N	\N	1	رأس مال الشريك أمير	f	15.00	\N	\N	balance_sheet	paid_in_capital	\N	\N	0.00
164	242	Retained Earnings	equity	\N	credit	\N	t	2026-05-14 21:36:16.811689+03	2026-05-14 21:36:16.811689+03	\N	\N	1	أرباح وخسائر	f	15.00	\N	\N	balance_sheet	retained_earnings	\N	\N	0.00
165	24201	Retained Earnings - B/F	equity	\N	credit	\N	t	2026-05-14 21:36:16.811689+03	2026-05-14 21:36:16.811689+03	\N	\N	1	أرباح وخسائر مدورة	f	15.00	\N	\N	balance_sheet	retained_earnings	\N	\N	0.00
166	243	Reserves	equity	\N	credit	\N	t	2026-05-14 21:36:16.811689+03	2026-05-14 21:36:16.811689+03	\N	\N	1	احتياطيات	f	15.00	\N	\N	balance_sheet	reserves	\N	\N	0.00
167	24301	Statutory Reserve	equity	\N	credit	\N	t	2026-05-14 21:36:16.811689+03	2026-05-14 21:36:16.811689+03	\N	\N	1	احتياطي نظامي	f	15.00	\N	\N	balance_sheet	reserves	\N	\N	0.00
168	233	Partner Current Accounts	equity	\N	credit	\N	t	2026-05-14 21:36:16.811689+03	2026-05-14 21:36:16.811689+03	\N	\N	1	الحسابات الجارية	f	15.00	\N	\N	balance_sheet	equity	\N	\N	0.00
169	23301	Current Account - Partner Abd	equity	\N	credit	\N	t	2026-05-14 21:36:16.811689+03	2026-05-14 21:36:16.811689+03	\N	\N	1	جاري الشريك عبد	f	15.00	\N	\N	balance_sheet	equity	\N	\N	0.00
170	23302	Current Account - Partner Amir	equity	\N	credit	\N	t	2026-05-14 21:36:16.811689+03	2026-05-14 21:36:16.811689+03	\N	\N	1	جاري الشريك أمير	f	15.00	\N	\N	balance_sheet	equity	\N	\N	0.00
\.


--
-- Data for Name: client_support_messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.client_support_messages (id, project_id, client_id, sales_rep_id, message, is_from_client, is_read, parent_message_id, created_at, updated_at) FROM stdin;
1	12	117	82	هاي	t	f	\N	2026-04-13 09:10:20.222601+02	2026-04-13 09:10:20.222601+02
2	12	117	82	هاي	t	f	\N	2026-04-13 09:12:39.98526+02	2026-04-13 09:12:39.98526+02
3	12	117	82	السلام عليكم	t	f	\N	2026-05-03 13:01:04.686296+03	2026-05-03 13:01:04.686296+03
\.


--
-- Data for Name: contract_amendments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.contract_amendments (id, contract_id, amendment_number, amendment_date, description, field_changed, old_value, new_value, approved_by, approved_at, attachment_url, created_at) FROM stdin;
\.


--
-- Data for Name: contract_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.contract_items (id, contract_id, item_name, item_name_ar, quantity, unit_price, vat_applicable, vat_rate, created_at) FROM stdin;
\.


--
-- Data for Name: contract_milestones; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.contract_milestones (id, contract_id, milestone_name, milestone_name_ar, milestone_percentage, milestone_amount, status, invoice_id, due_date, created_at) FROM stdin;
\.


--
-- Data for Name: contracts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.contracts (id, contract_number, client_id, project_id, total_value, currency, status, start_date, end_date, vat_applicable, vat_rate, created_at, updated_at, created_by, contract_type, payment_terms, description, attachment_url, signed_by_client, signed_by_company, client_signature_date, company_signature_date, contract_pdf) FROM stdin;
4	3	1	3	10000.00	USD	active	2026-04-01	2026-12-31	t	15.00	2026-04-06 11:58:43.304941+02	2026-04-06 11:58:43.304941+02	72	Fixed Price	Net 30	Website redesign and backend integration project	/uploads/contracts/contract-1775469523129-840158804.pdf	f	f	\N	\N	\N
10	CTR-1776243856959	117	12	0.00	SAR	active	2026-04-15	2026-04-15	t	15.00	2026-04-15 11:04:16.961315+02	2026-04-15 11:04:16.961315+02	119	service	\N	عقد مشروع: مشروع موسي	/uploads/contracts/contract-1776243856937-565926619.pdf	f	f	\N	\N	\N
11	CTR-1776244879587	117	12	0.00	SAR	active	2026-04-15	2026-04-15	t	15.00	2026-04-15 11:21:19.587917+02	2026-04-15 11:21:19.587917+02	119	service	\N	عقد مشروع: مشروع موسي	/uploads/contracts/contract-1776244879571-950579063.pdf	f	f	\N	\N	\N
13	CTR-1776585767649	117	12	0.00	SAR	active	2026-04-19	2026-04-19	t	15.00	2026-04-19 10:02:47.650779+02	2026-04-19 10:02:47.650779+02	119	service	\N	عقد مشروع: مشروع موسي	/uploads/contracts/contract-1776585767619-829040701.pdf	f	f	\N	\N	\N
14	CTR-1776586601431	117	12	0.00	SAR	active	2026-04-19	2026-04-19	t	15.00	2026-04-19 10:16:41.433407+02	2026-04-19 10:16:41.433407+02	119	service	\N	عقد مشروع: مشروع موسي	/uploads/contracts/contract-1776586601334-892407118.pdf	f	f	\N	\N	\N
15	CTR-1776586880824	117	12	0.00	SAR	active	2026-04-19	2026-04-19	t	15.00	2026-04-19 10:21:20.825808+02	2026-04-19 10:21:20.825808+02	119	service	\N	عقد مشروع: مشروع موسي	/uploads/contracts/contract-1776586880811-55097520.pdf	f	f	\N	\N	\N
16	CTR-1777829414269	153	13	0.00	SAR	active	2026-05-03	2026-05-03	t	15.00	2026-05-03 20:30:14.271233+03	2026-05-03 20:30:14.271233+03	119	service	\N	عقد مشروع: مشروع محمد جمال 	/uploads/contracts/contract-1777829414248-642119843.pdf	f	f	\N	\N	\N
17	CTR-1778069016522	155	14	0.00	SAR	active	2026-05-06	2026-05-06	t	15.00	2026-05-06 15:03:36.523691+03	2026-05-06 15:03:36.523691+03	119	service	\N	عقد مشروع: مشروع محمدد جمال 	/uploads/contracts/contract-1778069016509-633342601.pdf	f	f	\N	\N	\N
18	CTR-1778152499689	156	15	0.00	SAR	active	2026-05-07	2026-05-07	t	15.00	2026-05-07 14:14:59.690738+03	2026-05-07 14:14:59.690738+03	119	service	\N	عقد مشروع: مشروع محمد جمال	/uploads/contracts/contract-1778152499674-695730480.pdf	f	f	\N	\N	\N
19	CTR-1778162207834	157	16	0.00	SAR	active	2026-05-07	2026-05-07	t	15.00	2026-05-07 16:56:47.835989+03	2026-05-07 16:56:47.835989+03	119	service	\N	عقد مشروع: مشروع ابراهيم	/uploads/contracts/contract-1778162207728-24943050.pdf	f	f	\N	\N	\N
\.


--
-- Data for Name: credit_note_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.credit_note_items (id, credit_note_id, description, quantity, unit_price, discount_amount, tax_rate, tax_amount, line_total, created_at) FROM stdin;
2	8	Return for Invoice SI-2026-0020	0.60	15000.00	1.00	15.00	1349.85	10348.85	2026-04-24 19:25:40.543877+03
3	9	Return for Invoice SI-2026-0019	1.00	100.00	2.00	15.00	14.70	112.70	2026-04-24 19:28:09.274102+03
4	10	Return for Invoice SI-2026-0018	0.36	29.98	0.00	15.00	1.62	12.41	2026-04-24 19:30:33.258006+03
5	11	Return for Invoice SI-2026-0018	0.33	29.98	0.00	15.00	1.48	11.37	2026-04-24 19:40:07.036875+03
6	12	Return for Invoice SI-2026-0002	1.00	100.00	0.00	15.00	15.00	115.00	2026-04-25 09:57:04.287679+03
7	13	Return for Invoice SI-2026-0022	1.00	10.00	2.00	15.00	1.20	9.20	2026-04-26 11:00:23.908673+03
8	14	Return for Invoice SI-2026-0028	1.00	4250.00	0.00	15.00	637.50	4887.50	2026-04-26 19:09:31.580389+03
9	15	Return for Invoice SI-2026-0025	1.00	1000.00	0.00	15.00	150.00	1150.00	2026-04-26 19:12:20.446976+03
\.


--
-- Data for Name: credit_notes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.credit_notes (id, credit_note_number, invoice_id, client_id, project_id, lead_id, subtotal, discount_amount, tax_rate, tax_amount, total_amount, reason, return_date, status, revenue_account_id, tax_account_id, discount_account_id, receivable_account_id, qr_code, zatca_uuid, notes, created_by, created_at, updated_at) FROM stdin;
8	CN-2026-00001	20	117	12	28	9000.00	1.00	15.00	1349.85	10348.85	0	2026-04-24	draft	129	114	130	13	\N	\N	\N	84	2026-04-24 19:25:40.543877+03	2026-04-24 19:25:40.543877+03
9	CN-2026-00002	19	117	12	28	100.00	2.00	15.00	14.70	112.70	0	2026-04-24	draft	129	114	130	13	\N	\N	\N	84	2026-04-24 19:28:09.274102+03	2026-04-24 19:28:09.274102+03
10	CN-2026-00003	18	117	12	28	10.79	0.00	15.00	1.62	12.41	00000	2026-04-24	draft	129	114	\N	13	\N	\N	\N	84	2026-04-24 19:30:33.258006+03	2026-04-24 19:30:33.258006+03
11	CN-2026-00004	18	117	12	28	9.89	0.00	15.00	1.48	11.37	00	2026-04-24	draft	129	114	\N	13	\N	\N	\N	84	2026-04-24 19:40:07.036875+03	2026-04-24 19:40:07.036875+03
12	CN-2026-00005	2	117	12	28	100.00	0.00	15.00	15.00	115.00	سبب معين عادي 	2026-04-25	draft	129	114	\N	13	\N	\N	\N	84	2026-04-25 09:57:04.287679+03	2026-04-25 09:57:04.287679+03
13	CN-2026-00006	22	117	12	28	10.00	2.00	15.00	1.20	9.20	0	2026-04-26	draft	129	114	130	13	\N	\N	\N	84	2026-04-26 11:00:23.908673+03	2026-04-26 11:00:23.908673+03
14	CN-2026-00007	28	117	12	28	4250.00	0.00	15.00	637.50	4887.50	00	2026-04-26	draft	129	114	\N	13	\N	\N	\N	84	2026-04-26 19:09:31.580389+03	2026-04-26 19:09:31.580389+03
15	CN-2026-00008	25	117	12	28	1000.00	0.00	15.00	150.00	1150.00	0	2026-04-26	draft	129	114	\N	13	\N	\N	0	84	2026-04-26 19:12:20.446976+03	2026-04-26 19:12:20.446976+03
\.


--
-- Data for Name: departments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.departments (id, name, description, icon, is_active, created_by, created_at, updated_at, dept_type) FROM stdin;
18	اداره العروض	قسم العروض	sales-icon	f	\N	2026-03-28 06:06:44.673458+02	2026-05-03 10:33:32.46523+03	administrative
7	إدارة الموارد البشريه 1	مسؤولة عن الموظفين	sales-icon	t	\N	2026-03-23 20:15:47.999798+02	2026-05-07 16:27:04.758618+03	administrative
28	الأتمتة الصناعية والتحكم	خدمات الأتمتة الصناعية والتحكم الصناعي	😊	t	97	2026-04-08 20:55:16.968442+02	2026-04-27 13:42:26.72096+03	technical
23	كفاءة الطاقة	خدمات كفاءة الطاقة	\N	t	97	2026-04-08 20:31:41.710459+02	2026-04-27 13:42:26.72405+03	technical
45	التحول الرقمي	خدمات التحول الرقمي	\N	t	97	2026-04-27 13:42:26.726802+03	2026-04-27 13:42:26.726802+03	technical
46	التنفيذ والتشغيل والصيانة	خدمات التنفيذ والتشغيل والصيانة	\N	t	97	2026-04-27 13:42:26.72852+03	2026-04-27 13:42:26.72852+03	technical
47	البنية التحتية والمدن الذكية	خدمات البنية التحتية والمدن الذكية	\N	t	97	2026-04-27 13:42:26.729944+03	2026-04-27 13:42:26.729944+03	technical
48	المباني والمنازل الذكية	خدمات المباني والمنازل الذكية	\N	t	97	2026-04-27 13:42:26.732011+03	2026-04-27 13:42:26.732011+03	technical
49	الطاقة المتجددة وتخزين الطاقة	خدمات الطاقة المتجددة وأنظمة تخزين الطاقة	\N	t	97	2026-04-27 13:42:26.733483+03	2026-04-27 13:42:26.733483+03	technical
17	قسمم الطاقه الشميسه	قسمم الطاقه الشميسه والقمريه	sales-icon	f	\N	2026-03-28 03:44:21.930889+02	2026-04-27 13:42:26.735274+03	administrative
19	   اداره  المشاريع  	 اداره المشاريع   	sales-icon	f	\N	2026-03-29 09:41:33.565634+02	2026-04-27 13:42:26.735274+03	administrative
20	   اداره  العقود   	 اداره العقود   	sales-icon	f	\N	2026-03-30 22:12:10.212929+02	2026-04-27 13:42:26.735274+03	administrative
21	   اداره  المشتريات    	 اداره المشتريات   	sales-icon	f	\N	2026-03-30 22:12:25.421337+02	2026-04-27 13:42:26.735274+03	administrative
22	   اداره  المخازن    	 اداره المخازن   	sales-icon	f	\N	2026-03-30 22:12:43.810852+02	2026-04-27 13:42:26.735274+03	administrative
25	الجوده والسلامه 	المراقبه علي المشروع من حيث السلامه 	\N	f	97	2026-04-08 20:41:08.042232+02	2026-04-27 13:42:26.735274+03	administrative
26	الصيانه والمتابعه 	صيانه المشاريع	\N	f	97	2026-04-08 20:49:39.590415+02	2026-04-27 13:42:26.735274+03	administrative
30	الموس شمسيه 	الموس شمسيه 	\N	f	97	2026-04-11 06:48:08.36906+02	2026-04-27 13:42:26.735274+03	technical
31	البوج قمريه	البوج قمريه	\N	f	97	2026-04-11 06:49:31.152646+02	2026-04-27 13:42:26.735274+03	administrative
16	اداره  العملاء والمببعات	خدمات العملاء والمببعات	sales-icon	t	\N	2026-03-25 06:34:51.796864+02	2026-05-03 10:54:46.654493+03	administrative
12	الاداره الماليه	خدمات الماليه  والشعب	sales-icon	t	\N	2026-03-25 05:19:18.981224+02	2026-05-03 11:01:49.470197+03	administrative
\.


--
-- Data for Name: documents; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.documents (id, entity_type, entity_id, file_name, file_path, file_size, mime_type, uploaded_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: employee_evaluations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.employee_evaluations (id, employee_id, evaluator_id, evaluation_type, project_id, period, score, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: employee_leave_balances; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.employee_leave_balances (id, employee_id, leave_type, total_allowed, used, remaining, created_at, updated_at) FROM stdin;
1	56	annual	21	0	21	2026-05-02 18:18:24.560898+03	2026-05-02 18:18:35.255744+03
6	56	sick	10	0	10	2026-05-02 18:18:24.560898+03	2026-05-02 18:18:35.259527+03
2	54	annual	21	0	21	2026-05-02 18:18:24.560898+03	2026-05-02 18:18:35.261907+03
7	54	sick	10	0	10	2026-05-02 18:18:24.560898+03	2026-05-02 18:18:35.263437+03
3	53	annual	21	0	21	2026-05-02 18:18:24.560898+03	2026-05-02 18:18:35.264658+03
8	53	sick	10	0	10	2026-05-02 18:18:24.560898+03	2026-05-02 18:18:35.266275+03
4	55	annual	21	0	21	2026-05-02 18:18:24.560898+03	2026-05-02 18:18:35.267497+03
9	55	sick	10	0	10	2026-05-02 18:18:24.560898+03	2026-05-02 18:18:35.268945+03
5	59	annual	21	0	21	2026-05-02 18:18:24.560898+03	2026-05-02 18:18:35.27047+03
10	59	sick	10	0	10	2026-05-02 18:18:24.560898+03	2026-05-02 18:18:35.271614+03
21	60	annual	21	5	16	2026-05-02 19:30:33.325658+03	2026-05-02 19:36:20.519816+03
22	60	sick	10	2	8	2026-05-02 19:30:33.3297+03	2026-05-02 23:29:34.529198+03
25	62	annual	21	0	21	2026-05-03 19:47:34.079637+03	2026-05-03 19:47:34.079637+03
26	62	sick	10	0	10	2026-05-03 19:47:34.08787+03	2026-05-03 19:47:34.08787+03
27	61	unpaid	21	5	16	2026-05-04 18:08:09.77412+03	2026-05-04 18:10:02.359312+03
24	61	sick	10	5	5	2026-05-03 18:15:17.757178+03	2026-05-06 23:04:56.076699+03
23	61	annual	21	8	13	2026-05-03 18:15:17.741986+03	2026-05-07 17:26:12.24736+03
\.


--
-- Data for Name: employees; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.employees (id, user_id, department_id, first_name, last_name, arabic_name, nationality, date_of_birth, gender, marital_status, religion, personal_email, personal_phone, emergency_contact, emergency_phone, passport_number, passport_expiry, passport_file_path, national_id, national_id_expiry, residence_permit, residence_expiry, residence_file_path, employee_number, job_title, employment_type, contract_start_date, contract_end_date, contract_file_path, probation_end_date, status, basic_salary, housing_allowance, transport_allowance, other_allowances, currency, bank_name, bank_account, iban, created_by, created_at, updated_at, id_document_url, gosi_registered, payroll_status, national_id_file_path) FROM stdin;
56	138	48	888	888	888	سعودي	2026-04-28	male	single	مسلم	mosae8lwayly@gmail.com	88888888888888	\N	\N	\N	\N		88888888888	2026-04-28	\N	\N		EMP-0033	engineer	full_time	\N	\N		\N	active	900.00	90.00	90.00	90.00	SAR	\N	\N	\N	97	2026-04-28 10:05:46.743012+03	2026-04-28 10:51:01.076992+03	\N	f	t	\N
54	137	46	55	555	55	سعودي	2026-05-07	male	single	مسلم	mo5saelwayly@gmail.com	55555	\N	\N	\N	\N		555	2026-04-29	\N	\N		EMP-0032	engineer	full_time	\N	\N		\N	active	100.00	10.00	10.00	10.00	SAR	\N	\N	\N	97	2026-04-28 09:21:48.827406+03	2026-04-28 21:32:10.770673+03	\N	t	t	\N
62	154	49	جمي	جمال	الجم 	سعودي	2026-05-07	male	single	مسلم	webdesignbynti@gmail.com	010101010101011	\N	\N	101010101010	2026-05-08	uploads/employees/62/passport_file_path_1777826855833_o6jx9.png	201101010	2026-05-16	\N	2026-05-19	uploads/employees/62/residence_file_path_1777826855834_nr2wlw.png	EMP-0046	project_manager	full_time	2026-05-02	2026-05-15	uploads/employees/62/contract_file_path_1777826855835_qy3ycw.png	2026-05-20	active	3000.00	100.00	0.00	100.00	SAR	\N	\N	\N	120	2026-05-03 19:47:34.075035+03	2026-05-06 15:15:31.546909+03	uploads/employees/62/id_document_url_1777826855834_ubr95d.png	f	t	\N
53	136	47	222	222	22	سعودي	2026-04-30	male	single	مسلم	m2osaelwayly@gmail.com	2222222222222	\N	\N	\N	\N		222222	2026-04-30	\N	\N		EMP-0031	engineer	full_time	2026-04-29	2026-05-01		2026-04-30	active	7000.00	100.00	100.00	100.00	SAR	\N	\N	\N	97	2026-04-28 09:13:20.268123+03	2026-04-28 21:31:30.498356+03	\N	t	t	\N
55	\N	\N	Test	Employee	\N	\N	\N	\N	\N	\N	test@example.com	+966500000000	\N	\N	\N	\N	uploads/employees/55/passport_file_path_1234567890.pdf	\N	\N	\N	\N	uploads/employees/55/residence_file_path_1234567890.pdf	EMP-TEST-001	test_role	full_time	\N	\N	uploads/employees/55/contract_file_path_1234567890.pdf	\N	active	5000.00	1000.00	500.00	0.00	SAR	\N	\N	\N	\N	2026-04-28 09:36:48.923875+03	2026-04-28 09:36:49.007634+03	uploads/employees/55/id_document_url_1234567890.pdf	t	f	\N
60	149	45	عبدو 	فواد 	فواد 	سعودي	2000-05-06	\N	single	مسلم	momagdy766@gmail.com	014424232498	\N	\N	42424242424	2026-05-03	uploads/employees/60/passport_file_path_1777739436312_ons9bj.png	010140440424	2026-05-09	\N	2026-05-13	uploads/employees/60/residence_file_path_1777739436316_qa0bce.png	EMP-0044	engineer	full_time	2026-05-02	2026-05-16	uploads/employees/60/contract_file_path_1777739436316_7lke6o.png	2026-05-16	active	5000.00	1000.00	0.00	1000.00	SAR	\N	\N	\N	120	2026-05-02 19:30:33.305678+03	2026-05-06 15:15:31.54587+03	uploads/employees/60/id_document_url_1777739436315_9x6vcq.png	f	t	\N
61	152	49	hopa	pop	البوب	egyption	2003-09-25	male	married	مسلم	hopapop774@gmail.com	01080125430	01021232456	0125478920	112233004455	2026-06-03	uploads/employees/61/passport_file_path_1777821320386_t1bsm8.png	30309444105011	2028-10-03	\N	2026-06-20	uploads/employees/61/residence_file_path_1777821320387_3k4ii3.png	EMP-0045	engineer	full_time	2026-05-03	2030-01-03	uploads/employees/61/contract_file_path_1777821320387_7azd0f.png	2026-06-01	active	5000.00	1000.00	0.00	1000.00	SAR	بنك الراجحي	145236987	sa1122334455669	120	2026-05-03 18:15:17.727591+03	2026-05-06 15:15:31.546909+03	uploads/employees/61/id_document_url_1777821320386_0951ei.png	f	t	\N
59	148	48	موسي 	مجدي	شعبان	سعودي	2026-04-27	male	single	مسلم	mo0saelw01ayly@gmail.com	010603065444	010101010	10101010101	61116161616	2026-04-27	D:/Desktop/system/backend/uploads/employees/59/passport_file-1777398208980-890490867.jpeg	0103656562133	2026-04-27	\N	2026-04-27	D:/Desktop/system/backend/uploads/employees/59/residence_file-1777398208989-255833800.jpeg	EMP-0043	engineer	full_time	2026-04-22	2026-04-30	D:/Desktop/system/backend/uploads/employees/59/contract_file-1777398208992-942172576.jpeg	2026-04-30	active	5000.00	1000.00	0.00	1000.00	SAR	بنك الجزيرة	0101010	10101010101	97	2026-04-28 20:43:25.186475+03	2026-05-06 15:15:31.556436+03	D:/Desktop/system/backend/uploads/employees/59/national_id_file-1777398208984-842825795.jpeg	t	t	\N
\.


--
-- Data for Name: expense_vouchers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.expense_vouchers (id, voucher_number, expense_date, expense_amount, expense_account_id, payment_account_id, payment_method, description, reference_number, notes, status, created_by, approved_by, journal_entry_id, created_at, updated_at) FROM stdin;
3	EX-2026-0002	2026-04-21	10.00	10	79	cash	اا	TEST-REF-001	\N	completed	84	\N	43	2026-04-21 08:35:39.422467+02	2026-04-21 08:35:39.422467+02
4	EX-2026-0003	2026-04-21	2000.00	118	79	cash	تم صرف ايجار مكتب	TEST-REF-001	\N	completed	84	\N	44	2026-04-21 09:24:01.135777+02	2026-04-21 09:24:01.135777+02
5	EX-2026-0004	2026-04-21	3000.00	10	110	bank_transfer	تم دفع مصاؤيف اداريه 	TEST-REF-001	\N	completed	84	\N	45	2026-04-21 09:28:09.13979+02	2026-04-21 09:28:09.13979+02
6	EX-2026-0005	2026-04-22	20.00	74	79	cash	و	TEST-REF-001	\N	completed	84	\N	75	2026-04-22 17:57:44.735048+02	2026-04-22 17:57:44.735048+02
7	EX-2026-0006	2026-04-22	1000.00	74	79	cash	ز	TEST-REF-001	\N	completed	84	\N	76	2026-04-22 17:58:51.777424+02	2026-04-22 17:58:51.777424+02
2	EX-2026-0001	2026-04-21	750.00	10	110	cash	Test expense - Office supplies purchase	TEST-REF-001	Automated test voucher	completed	\N	\N	\N	2026-04-21 08:17:46.597044+02	2026-04-21 08:17:46.597044+02
\.


--
-- Data for Name: expenses; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.expenses (id, expense_number, project_id, account_id, amount, payment_method, petty_cash_fund_id, description, receipt_url, notes, status, created_by, expense_date, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: fixed_assets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.fixed_assets (id, asset_number, asset_name, asset_name_ar, category, coa_account_code, accum_depr_account, depr_expense_account, purchase_date, purchase_cost, salvage_value, useful_life_years, depreciation_method, status, accumulated_depr, net_book_value, disposal_date, disposal_amount, disposal_gain_loss, project_id, created_by, notes, created_at, updated_at) FROM stdin;
1	FA-0001	Toyota Hilux	تويوتا هايلكس	vehicle	11103	11203	32303	2026-04-07	150000.00	15000.00	5	straight_line	active	18000.00	132000.00	\N	\N	\N	\N	84	Company vehicle for project operations	2026-04-07 07:26:41.697907+02	2026-04-24 17:48:24.556996+03
2	FA-0002	G-clas	G-clas	vehicle	11103	11203	32303	2026-04-24	1000.00	100.00	3	straight_line	active	125.00	875.00	\N	\N	\N	\N	84	\N	2026-04-24 17:02:30.883766+03	2026-04-24 17:48:24.556996+03
3	FA-0003	G-clas	G-clas	vehicle	11103	11203	32303	2026-04-24	20.00	5.00	5	declining_balance	active	3.11	16.89	\N	\N	\N	\N	84	\N	2026-04-24 17:25:08.459971+03	2026-04-24 17:48:24.556996+03
4	FA-0004	G-clas33	G-clas33	vehicle	11103	11203	32303	2026-04-24	5000.00	50.00	5	declining_balance	active	483.52	4516.48	\N	\N	\N	\N	84	\N	2026-04-24 17:45:59.232417+03	2026-04-24 17:48:24.556996+03
5	FA-0005	G-clas3300	G-clas330	vehicle	11103	11203	32303	2026-04-24	8000.00	2000.00	5	declining_balance	active	0.00	8000.00	\N	\N	\N	\N	84	\N	2026-04-24 17:59:15.967038+03	2026-04-24 17:59:15.967038+03
\.


--
-- Data for Name: goods_receipt_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.goods_receipt_items (id, grn_id, po_item_id, item_id, quantity_received, unit_cost, created_at) FROM stdin;
1	1	1	1	20.000	850.00	2026-04-07 09:15:56.556523+02
\.


--
-- Data for Name: goods_receipts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.goods_receipts (id, grn_number, po_id, receipt_date, status, notes, created_by, created_at, updated_at) FROM stdin;
1	GRN-0001	1	2026-04-07	draft	Received in good condition	84	2026-04-07 09:15:56.556523+02	2026-04-07 09:15:56.556523+02
\.


--
-- Data for Name: inspection_reports; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.inspection_reports (id, lead_id, user_id, report_text, file_url, images_urls, created_at) FROM stdin;
6	23	112	ال	/uploads/reports/report-1775977996889-846802615-mosa magdy front cv N.pdf	[]	2026-04-12 09:13:17.097566+02
7	23	112	شسءء	/uploads/reports/report-1775978551251-235631873-mosa magdy Back cv N.pdf	[]	2026-04-12 09:22:31.260469+02
8	23	112	سؤ	/uploads/reports/report-1775978985618-483783868-mosa magdy cv Mean & mern stack developer N.pdf	[]	2026-04-12 09:29:45.62694+02
9	23	112	 رؤؤ 	/uploads/reports/report-1775982286691-166105093-mosa magdy front cv N.pdf	[]	2026-04-12 10:24:46.699996+02
10	23	112	ؤسسؤ	/uploads/reports/report-1775982597423-174654733-mosa magdy cv Mean & mern stack developer N.pdf	[]	2026-04-12 10:29:57.435623+02
11	23	112	سييسي	/uploads/reports/report-1775983507436-924201980-mosa magdy Back cv N.pdf	[]	2026-04-12 10:45:07.447525+02
12	22	112	test	/uploads/reports/report-1775989748111-188158413-mosa magdy front cv N.pdf	[]	2026-04-12 12:29:08.119696+02
13	23	112	tetst rep	/uploads/reports/report-1775990634558-597192667-mosa magdy front cv N.pdf	[]	2026-04-12 12:43:54.567148+02
18	28	112	gh	/uploads/reports/report-1776062168437-290460257-16.jpeg	[]	2026-04-13 08:36:08.448795+02
21	34	152	اي 	/uploads/reports/report-1778149317971-171135350-Q2 Level5.pdf	[]	2026-05-07 13:21:57.986861+03
22	38	152	تقرير معاينه العميل ابراهيم	/uploads/reports/report-1778160778153-103023065-q2 level4.pdf	[]	2026-05-07 16:32:58.257161+03
\.


--
-- Data for Name: inspections; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.inspections (id, lead_id, assigned_engineer_id, inspection_date, priority, status, location, notes, created_at, updated_at) FROM stdin;
11	19	81	\N	medium	completed	\N	\N	2026-03-29 17:44:55.501242+02	2026-03-29 17:45:31.5525+02
14	19	93	\N	medium	pending	\N	\N	2026-04-11 10:36:26.588942+02	2026-04-11 10:36:26.588942+02
12	23	\N	\N	medium	pending	\N	\N	2026-04-11 10:04:16.281108+02	2026-04-11 11:40:20.432283+02
13	23	\N	\N	medium	pending	\N	\N	2026-04-11 10:25:38.801642+02	2026-04-11 11:40:20.432283+02
15	22	\N	\N	medium	pending	\N	\N	2026-04-11 10:46:31.750583+02	2026-04-11 11:40:20.432283+02
16	23	112	\N	medium	pending	\N	\N	2026-04-11 12:06:49.846806+02	2026-04-11 12:06:49.846806+02
17	22	112	\N	medium	pending	\N	\N	2026-04-12 08:11:49.03274+02	2026-04-12 08:11:49.03274+02
22	28	112	\N	medium	pending	\N	\N	2026-04-13 08:35:42.031364+02	2026-04-13 08:35:42.031364+02
27	34	152	\N	medium	pending	\N	\N	2026-05-07 13:06:41.594647+03	2026-05-07 13:06:41.594647+03
28	37	152	\N	medium	pending	\N	\N	2026-05-07 13:21:01.142458+03	2026-05-07 13:21:01.142458+03
29	38	152	\N	medium	pending	\N	\N	2026-05-07 16:30:58.27354+03	2026-05-07 16:30:58.27354+03
\.


--
-- Data for Name: installed_assets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.installed_assets (id, asset_name, client_id, project_id, category, serial_number, installation_date, location_address, latitude, longitude, assigned_engineer_id, warranty_expiry, status, manufacturer, model_number, power_rating, notes, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: inventory_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.inventory_items (id, item_code, item_name, item_name_ar, category, unit_of_measure, coa_account_code, cost_account_code, unit_cost, quantity_on_hand, reorder_level, is_active, notes, created_by, created_at, updated_at, default_warehouse_id) FROM stdin;
21	ITM-0003	1	1	other	pcs	1201	4101	10.00	0.000	10.000	t		96	2026-04-26 10:55:13.435731+03	2026-04-26 10:55:13.435731+03	\N
22	ITM-0004	ةاةاةاة		solar_panel	set	1201	4101	0.00	0.000	0.000	t		151	2026-05-05 18:24:52.405562+03	2026-05-05 18:25:15.933088+03	\N
2	ITM-0002	Solar Panel 400W	لوح شمسي 400 وات	solar_panel	pcs	12302	33101	60.00	-16.000	10.000	t	\N	84	2026-04-07 09:12:53.170282+02	2026-05-07 00:22:57.073003+03	1
1	ITM-0001	Solar Panel 400W	لوح شمسي 400 وات	solar_panel	pcs	12302	33101	100.00	-97.000	10.000	t	\N	84	2026-04-07 09:11:39.169976+02	2026-05-07 17:04:55.555084+03	1
\.


--
-- Data for Name: inventory_movements; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.inventory_movements (id, inventory_item_id, project_id, movement_type, quantity, performed_by, performed_at, notes, created_at, updated_at, warehouse_id) FROM stdin;
7	1	12	out	1	118	2026-04-14 07:26:41.067608+02	Allocated to project 12	2026-04-14 07:26:41.067608+02	2026-04-14 07:26:41.067608+02	\N
8	1	12	out	5	118	2026-04-14 07:27:12.440774+02	Allocated to project 12	2026-04-14 07:27:12.440774+02	2026-04-14 07:27:12.440774+02	\N
9	1	12	out	1	118	2026-04-14 07:29:12.615344+02	Allocated to project 12	2026-04-14 07:29:12.615344+02	2026-04-14 07:29:12.615344+02	\N
10	1	12	out	1	118	2026-04-14 08:11:02.487812+02	Allocated to project 12	2026-04-14 08:11:02.487812+02	2026-04-14 08:11:02.487812+02	\N
11	1	12	out	3	118	2026-04-14 08:11:27.703263+02	Allocated to project 12	2026-04-14 08:11:27.703263+02	2026-04-14 08:11:27.703263+02	\N
12	1	12	out	1	118	2026-04-14 08:57:21.141942+02	Allocated to project 12	2026-04-14 08:57:21.141942+02	2026-04-14 08:57:21.141942+02	\N
13	1	12	out	1	118	2026-04-14 13:55:37.807628+02	Allocated to project 12	2026-04-14 13:55:37.807628+02	2026-04-14 13:55:37.807628+02	\N
14	1	12	out	2	118	2026-04-19 17:47:34.71378+02	Allocated to project 12	2026-04-19 17:47:34.71378+02	2026-04-19 17:47:34.71378+02	\N
15	1	12	out	4	118	2026-04-19 18:09:47.688586+02	Allocated to project 12	2026-04-19 18:09:47.688586+02	2026-04-19 18:09:47.688586+02	\N
16	1	12	out	1	118	2026-04-19 19:08:58.482283+02	Allocated to project 12	2026-04-19 19:08:58.482283+02	2026-04-19 19:08:58.482283+02	\N
17	1	\N	in	100	84	2026-04-25 16:25:37.705688+03	Stock receipt	2026-04-25 16:25:37.705688+03	2026-04-25 16:25:37.705688+03	1
18	2	\N	in	10	84	2026-04-25 16:30:24.890822+03	Stock receipt	2026-04-25 16:30:24.890822+03	2026-04-25 16:30:24.890822+03	1
19	2	\N	in	20	96	2026-04-26 10:36:09.927142+03	00	2026-04-26 10:36:09.927142+03	2026-04-26 10:36:09.927142+03	1
20	21	\N	in	20	96	2026-04-26 10:55:42.450489+03	Stock receipt	2026-04-26 10:55:42.450489+03	2026-04-26 10:55:42.450489+03	1
21	21	\N	out	1	84	2026-04-26 12:10:40.566667+03	Stock deducted for Sales Invoice SI-2026-0024 - 1	2026-04-26 12:10:40.566667+03	2026-04-26 12:10:40.566667+03	1
22	1	\N	in	8	84	2026-04-26 14:33:41.085157+03	Stock increase from Purchase Invoice PINV-2026-0013	2026-04-26 14:33:41.085157+03	2026-04-26 14:33:41.085157+03	\N
23	1	\N	in	50	84	2026-04-26 14:35:28.888393+03	Stock increase from Purchase Invoice PINV-2026-0014	2026-04-26 14:35:28.888393+03	2026-04-26 14:35:28.888393+03	\N
24	21	\N	in	7	84	2026-04-26 15:09:33.921381+03	Stock increase from Purchase Invoice PINV-2026-0015	2026-04-26 15:09:33.921381+03	2026-04-26 15:09:33.921381+03	\N
25	1	\N	in	100	84	2026-04-26 15:13:35.926722+03	Stock increase from Purchase Invoice PINV-2026-0016	2026-04-26 15:13:35.926722+03	2026-04-26 15:13:35.926722+03	\N
26	1	\N	in	1	84	2026-04-26 18:10:47.659428+03	Stock increase from Purchase Invoice PINV-2026-0017	2026-04-26 18:10:47.659428+03	2026-04-26 18:10:47.659428+03	\N
27	1	\N	out	100	84	2026-04-26 18:33:40.781386+03	Stock deducted for Sales Invoice SI-2026-0025 - Solar Panel 400W	2026-04-26 18:33:40.781386+03	2026-04-26 18:33:40.781386+03	1
28	2	\N	in	100	84	2026-04-26 18:54:33.124888+03	Stock receipt	2026-04-26 18:54:33.124888+03	2026-04-26 18:54:33.124888+03	1
29	2	\N	out	100	84	2026-04-26 18:54:40.739347+03	Stock deducted for Sales Invoice SI-2026-0026 - Solar Panel 400W	2026-04-26 18:54:40.739347+03	2026-04-26 18:54:40.739347+03	1
30	2	\N	out	10	84	2026-04-26 19:05:14.231661+03	Stock deducted for Sales Invoice SI-2026-0027 - Solar Panel 400W	2026-04-26 19:05:14.231661+03	2026-04-26 19:05:14.231661+03	1
31	2	\N	out	5	84	2026-04-26 19:07:54.613061+03	Stock deducted for Sales Invoice SI-2026-0028 - Solar Panel 400W	2026-04-26 19:07:54.613061+03	2026-04-26 19:07:54.613061+03	1
32	1	12	out	10	118	2026-04-26 20:40:16.074372+03	Allocated to project 12 from warehouse 1	2026-04-26 20:40:16.074372+03	2026-04-26 20:40:16.074372+03	1
2	1	3	out	150	\N	2026-03-30 23:38:20.081955+02	تمديدات الدور الأول - زون A	2026-03-30 23:38:20.081955+02	2026-05-03 19:45:59.396243+03	\N
6	3	3	out	15	\N	2026-03-31 05:50:10.491724+02	تمديدات الدور الأول - زون A	2026-03-31 05:50:10.491724+02	2026-05-03 19:45:59.396243+03	\N
35	2	\N	in	50	84	2026-05-04 10:09:31.449782+03	Stock increase from Purchase Invoice PINV-2026-0018	2026-05-04 10:09:31.449782+03	2026-05-04 10:09:31.449782+03	\N
36	2	\N	out	10	84	2026-05-04 10:52:31.290195+03	Stock deducted for Sales Invoice SI-2026-0029 - Solar Panel 400W	2026-05-04 10:52:31.290195+03	2026-05-04 10:52:31.290195+03	1
37	21	\N	in	10	150	2026-05-04 20:09:43.153978+03	Stock receipt	2026-05-04 20:09:43.153978+03	2026-05-04 20:09:43.153978+03	1
33	2	\N	out	5	154	2026-05-03 20:30:46.747211+03	Allocated to project 13 from warehouse 1	2026-05-03 20:30:46.747211+03	2026-05-05 17:20:58.661307+03	1
34	2	\N	out	10	154	2026-05-04 09:49:04.441916+03	Allocated to project 13 from warehouse 1	2026-05-04 09:49:04.441916+03	2026-05-05 17:20:58.661307+03	1
38	1	\N	out	1	154	2026-05-06 15:06:28.936881+03	Allocated to project 14 from warehouse 1	2026-05-06 15:06:28.936881+03	2026-05-07 12:10:46.837503+03	1
39	2	\N	out	1	154	2026-05-07 00:22:57.073003+03	Allocated to project 14 from warehouse 1	2026-05-07 00:22:57.073003+03	2026-05-07 12:10:46.837503+03	1
40	1	15	out	10	154	2026-05-07 14:16:11.451006+03	Allocated to project 15 from warehouse 1	2026-05-07 14:16:11.451006+03	2026-05-07 14:16:11.451006+03	1
41	1	15	out	10	154	2026-05-07 14:25:42.939264+03	Allocated to project 15 from warehouse 1	2026-05-07 14:25:42.939264+03	2026-05-07 14:25:42.939264+03	1
42	1	\N	out	10	84	2026-05-07 14:27:53.53459+03	Stock deducted for Sales Invoice SI-2026-0030 - Solar Panel 400W	2026-05-07 14:27:53.53459+03	2026-05-07 14:27:53.53459+03	1
43	1	\N	out	1	84	2026-05-07 14:56:18.467097+03	Stock deducted for Sales Invoice SI-2026-0031 - Solar Panel 400W	2026-05-07 14:56:18.467097+03	2026-05-07 14:56:18.467097+03	1
44	1	\N	out	1	84	2026-05-07 14:59:00.88771+03	Stock deducted for Sales Invoice SI-2026-0032 - Solar Panel 400W	2026-05-07 14:59:00.88771+03	2026-05-07 14:59:00.88771+03	1
45	1	15	transfer	16	154	2026-05-07 15:43:04.314038+03	RESERVED for project 15 from warehouse 1	2026-05-07 15:43:04.314038+03	2026-05-07 15:43:04.314038+03	1
46	1	15	out	16	84	2026-05-07 15:45:03.901251+03	COGS posted for Sales Invoice SI-2026-0033 - Solar Panel 400W (reserved:16, direct:0)	2026-05-07 15:45:03.901251+03	2026-05-07 15:45:03.901251+03	1
47	1	16	transfer	50	154	2026-05-07 16:58:42.382955+03	RESERVED for project 16 from warehouse 1	2026-05-07 16:58:42.382955+03	2026-05-07 16:58:42.382955+03	1
48	1	16	out	50	84	2026-05-07 17:04:55.555084+03	COGS posted for Sales Invoice SI-2026-0034 - Solar Panel 400W (reserved:50, direct:0)	2026-05-07 17:04:55.555084+03	2026-05-07 17:04:55.555084+03	1
\.


--
-- Data for Name: invoices; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.invoices (id, project_id, created_by, invoice_number, issue_date, due_date, total_amount, paid_amount, currency, status, metadata, created_at, updated_at, purchase_request_id, tax_amount, notes, is_inventory_stock, journal_entry_id, pdf_generated_at, pdf_path, contract_id, client_id, invoice_type, subtotal, tax_rate, payment_terms, attachment_url, qr_code_data, is_tax_invoice, tax_invoice_no, zatca_uuid, zatca_status, zatca_cleared_at, zatca_invoice_hash, previous_invoice_hash, buyer_vat_number, payment_status, amount_paid) FROM stdin;
10	3	84	INV-20260406-0002	2026-04-06	2026-05-06	11500.00	0.00	USD	draft	\N	2026-04-06 22:03:49.526775+02	2026-04-06 22:03:49.526775+02	\N	1500.00	إصدار فاتورة الدفعة الأولى بناءً على العقد رقم 3 لشركة Smart Energy Services	f	3	2026-04-06 22:03:50.082+02	D:\\Desktop\\system\\backend\\uploads\\invoices\\invoice-INV-20260406-0002.pdf	4	1	standard	10000	15	Net 30	\N	ARVTbWFydCBFbmVyZ3kgU2VydmljZXMCDzMxMjg4ODAxMDIwMDAwMwMYMjAyNi0wNC0wNlQyMDowMzo0OS41NzlaBAgxMTUwMC4wMAUHMTUwMC4wMA==	f	\N	\N	not_applicable	\N	\N	\N	\N	unpaid	0.00
13	3	84	INV-20260406-0003	2026-04-06	2026-05-06	11500.00	0.00	USD	draft	\N	2026-04-06 22:15:46.933126+02	2026-04-06 22:15:46.933126+02	\N	1500.00	إصدار فاتورة الدفعة الأولى بناءً على العقد رقم 3 لشركة Smart Energy Services	f	6	2026-04-06 22:15:47.389+02	D:\\Desktop\\system\\backend\\uploads\\invoices\\invoice-INV-20260406-0003.pdf	4	1	standard	10000	15	Net 30	\N	ARVTbWFydCBFbmVyZ3kgU2VydmljZXMCDzMxMjg4ODAxMDIwMDAwMwMYMjAyNi0wNC0wNlQyMDoxNTo0Ni45ODdaBAgxMTUwMC4wMAUHMTUwMC4wMA==	f	\N	\N	not_applicable	\N	\N	\N	\N	unpaid	0.00
18	3	84	INV-20260407-0005	2026-04-07	2026-05-07	11500.00	0.00	USD	draft	\N	2026-04-07 17:43:59.85576+02	2026-04-07 17:43:59.85576+02	\N	1500.00	إصدار فاتورة الدفعة الأولى بناءً على العقد رقم 3 لشركة Smart Energy Services	f	22	2026-04-07 17:44:00.267+02	D:\\Desktop\\system\\backend\\uploads\\invoices\\invoice-INV-20260407-0005.pdf	4	1	standard	10000	15	Net 30	\N	ARVTbWFydCBFbmVyZ3kgU2VydmljZXMCDzMxMjg4ODAxMDIwMDAwMwMYMjAyNi0wNC0wN1QxNTo0Mzo1OS45MTBaBAgxMTUwMC4wMAUHMTUwMC4wMA==	f	\N	\N	not_applicable	\N	\N	\N	\N	unpaid	0.00
17	3	84	INV-20260407-0004	2026-04-07	2026-05-07	11500.00	0.00	USD	final	\N	2026-04-07 17:42:27.287102+02	2026-04-23 15:13:04.565421+02	\N	1500.00	إصدار فاتورة الدفعة الأولى بناءً على العقد رقم 3 لشركة Smart Energy Services	f	21	2026-04-07 17:42:27.676+02	D:\\Desktop\\system\\backend\\uploads\\invoices\\invoice-INV-20260407-0004.pdf	4	1	standard	10000	15	Net 30	\N	ARVTbWFydCBFbmVyZ3kgU2VydmljZXMCDzMxMjg4ODAxMDIwMDAwMwMYMjAyNi0wNC0wN1QxNTo0MjoyNy4zNDZaBAgxMTUwMC4wMAUHMTUwMC4wMA==	f	\N	\N	not_applicable	\N	\N	\N	\N	unpaid	0.00
14	3	84	INV-20260407-0001	2026-04-07	2026-05-07	11500.00	0.00	USD	draft	\N	2026-04-07 06:28:44.142774+02	2026-04-23 14:32:00.373305+02	\N	1500.00	إصدار فاتورة الدفعة الأولى بناءً على العقد رقم 3 لشركة Smart Energy Services	f	7	2026-04-07 06:28:44.746+02	D:\\Desktop\\system\\backend\\uploads\\invoices\\invoice-INV-20260407-0001.pdf	4	1	standard	10000	15	Net 30	\N	ARVTbWFydCBFbmVyZ3kgU2VydmljZXMCDzMxMjg4ODAxMDIwMDAwMwMYMjAyNi0wNC0wN1QwNDoyODo0NC4yMzJaBAgxMTUwMC4wMAUHMTUwMC4wMA==	f	\N	\N	not_applicable	\N	\N	\N	\N	unpaid	0.00
19	12	84	TI-2026-00001	2026-04-23	\N	500.00	0.00	USD	final	\N	2026-04-23 16:55:16.605+02	2026-04-23 16:55:16.605393+02	\N	0.00	\N	f	\N	\N	uploads/invoices/TI-2026-00001.pdf	\N	117	\N	500	\N	\N	\N	ASLYtNix2YPYqSDYp9mE2LfYp9mC2Kkg2KfZhNiw2YPZitipAg8zMTI4ODgwMTAyMDAwMDMDGDIwMjYtMDQtMjNUMTQ6NTU6MTYuNjA0WgQGNTAwLjAwBQQwLjAw	t	TI-2026-00001	607c39c9-a016-451b-9a4e-e53a053f8200	pending	\N	\N	\N	\N	unpaid	0.00
20	12	84	TI-2026-00002	2026-04-22	2026-05-08	115.00	0.00	USD	final	\N	2026-04-23 16:58:20.415+02	2026-04-23 16:58:20.415433+02	\N	15.00	\N	f	\N	\N	uploads/invoices/TI-2026-00002.pdf	\N	117	\N	100	\N	\N	\N	ASLYtNix2YPYqSDYp9mE2LfYp9mC2Kkg2KfZhNiw2YPZitipAg8zMTI4ODgwMTAyMDAwMDMDGDIwMjYtMDQtMjNUMTQ6NTg6MjAuNDE0WgQGMTE1LjAwBQUxNS4wMA==	t	TI-2026-00002	5ec7e61a-e532-428f-967a-b57311bfe91a	pending	\N	\N	\N	\N	paid	0.00
15	3	84	INV-20260407-0002	2026-04-07	2026-05-07	11500.00	0.00	USD	final	\N	2026-04-07 06:35:37.928801+02	2026-04-23 15:11:32.060294+02	\N	1500.00	إصدار فاتورة الدفعة الأولى بناءً على العقد رقم 3 لشركة Smart Energy Services	f	8	2026-04-07 06:35:38.467+02	D:\\Desktop\\system\\backend\\uploads\\invoices\\invoice-INV-20260407-0002.pdf	4	1	standard	10000	15	Net 30	\N	ARVTbWFydCBFbmVyZ3kgU2VydmljZXMCDzMxMjg4ODAxMDIwMDAwMwMYMjAyNi0wNC0wN1QwNDozNTozOC4wODZaBAgxMTUwMC4wMAUHMTUwMC4wMA==	f	\N	\N	not_applicable	\N	\N	\N	\N	unpaid	0.00
16	3	84	INV-20260407-0003	2026-04-07	2026-05-07	11500.00	0.00	USD	final	\N	2026-04-07 06:37:51.630356+02	2026-04-23 15:11:39.050025+02	\N	1500.00	إصدار فاتورة الدفعة الأولى بناءً على العقد رقم 3 لشركة Smart Energy Services	f	9	2026-04-07 06:37:52.087+02	D:\\Desktop\\system\\backend\\uploads\\invoices\\invoice-INV-20260407-0003.pdf	4	1	standard	10000	15	Net 30	\N	ARVTbWFydCBFbmVyZ3kgU2VydmljZXMCDzMxMjg4ODAxMDIwMDAwMwMYMjAyNi0wNC0wN1QwNDozNzo1MS42ODFaBAgxMTUwMC4wMAUHMTUwMC4wMA==	f	\N	\N	not_applicable	\N	\N	\N	\N	unpaid	0.00
9	3	84	INV-20260406-0001	2026-04-06	2026-05-06	11500.00	0.00	USD	final	\N	2026-04-06 21:46:49.238908+02	2026-04-23 15:11:54.176513+02	\N	1500.00	إصدار فاتورة الدفعة الأولى بناءً على العقد رقم 3 لشركة Smart Energy Services	f	2	2026-04-06 21:46:49.676+02	D:\\Desktop\\system\\backend\\uploads\\invoices\\invoice-INV-20260406-0001.pdf	4	1	standard	10000	15	Net 30	\N	ARVTbWFydCBFbmVyZ3kgU2VydmljZXMCDzMxMjg4ODAxMDIwMDAwMwMYMjAyNi0wNC0wNlQxOTo0Njo0OS4zNTZaBAgxMTUwMC4wMAUHMTUwMC4wMA==	f	\N	\N	not_applicable	\N	\N	\N	\N	unpaid	0.00
21	12	84	TI-2026-00003	2026-04-23	\N	10.00	0.00	USD	final	\N	2026-04-23 16:58:32.689+02	2026-04-23 16:58:32.689428+02	\N	0.00	\N	f	\N	\N	uploads/invoices/TI-2026-00003.pdf	\N	117	\N	10	\N	\N	\N	ASLYtNix2YPYqSDYp9mE2LfYp9mC2Kkg2KfZhNiw2YPZitipAg8zMTI4ODgwMTAyMDAwMDMDGDIwMjYtMDQtMjNUMTQ6NTg6MzIuNjg4WgQFMTAuMDAFBDAuMDA=	t	TI-2026-00003	922346bf-84f1-4119-a439-50ccf0993e35	pending	\N	\N	\N	\N	unpaid	0.00
22	12	84	TI-2026-00004	2026-04-23	2026-05-01	10.00	0.00	USD	final	\N	2026-04-24 15:15:26.288+03	2026-04-24 15:15:26.288109+03	\N	0.00	\N	f	\N	\N	uploads/invoices/TI-2026-00004.pdf	\N	117	\N	10	\N	\N	\N	ASLYtNix2YPYqSDYp9mE2LfYp9mC2Kkg2KfZhNiw2YPZitipAg8zMTI4ODgwMTAyMDAwMDMDGDIwMjYtMDQtMjRUMTI6MTU6MjYuMjg2WgQFMTAuMDAFBDAuMDA=	t	TI-2026-00004	c0a8337d-3c04-4cf2-9524-cdb16e7be228	pending	\N	\N	\N	\N	paid	0.00
23	12	84	TI-2026-00005	2026-04-22	2026-05-02	50.00	0.00	USD	final	\N	2026-04-24 15:26:54.119+03	2026-04-24 15:26:54.119619+03	\N	0.00	\N	f	\N	\N	uploads/invoices/TI-2026-00005.pdf	\N	117	\N	50	\N	\N	\N	ASLYtNix2YPYqSDYp9mE2LfYp9mC2Kkg2KfZhNiw2YPZitipAg8zMTI4ODgwMTAyMDAwMDMDGDIwMjYtMDQtMjRUMTI6MjY6NTQuMTE4WgQFNTAuMDAFBDAuMDA=	t	TI-2026-00005	03c73d15-11cc-4fdb-90b1-6fc412971492	pending	\N	\N	\N	\N	paid	0.00
24	12	84	TI-2026-00006	2026-04-24	2026-05-09	29.98	0.00	USD	final	\N	2026-04-24 15:50:36.129+03	2026-04-24 15:50:36.130346+03	\N	0.00	\N	f	\N	\N	uploads/invoices/TI-2026-00006.pdf	\N	117	\N	29.98	\N	\N	\N	ASLYtNix2YPYqSDYp9mE2LfYp9mC2Kkg2KfZhNiw2YPZitipAg8zMTI4ODgwMTAyMDAwMDMDGDIwMjYtMDQtMjRUMTI6NTA6MzYuMTI5WgQFMjkuOTgFBDAuMDA=	t	TI-2026-00006	e4f1ffc2-7e39-4b1d-9310-587f4867ca44	pending	\N	\N	\N	\N	unpaid	0.00
25	12	84	TI-2026-00007	2026-04-24	2026-05-10	112.70	0.00	USD	final	\N	2026-04-24 18:12:26.8+03	2026-04-24 18:12:26.801033+03	\N	14.70	\N	f	\N	\N	uploads/invoices/TI-2026-00007.pdf	\N	117	\N	100	\N	\N	\N	ASLYtNix2YPYqSDYp9mE2LfYp9mC2Kkg2KfZhNiw2YPZitipAg8zMTI4ODgwMTAyMDAwMDMDGDIwMjYtMDQtMjRUMTU6MTI6MjYuNzk5WgQGMTEyLjcwBQUxNC43MA==	t	TI-2026-00007	9f977e3d-b919-440b-8e3b-8ab92096f21b	pending	\N	\N	\N	\N	unpaid	0.00
26	12	84	TI-2026-00008	2026-04-24	2026-05-01	14985.00	0.00	USD	final	\N	2026-04-25 09:37:22.316+03	2026-04-25 09:37:22.31723+03	\N	0.00	\N	f	\N	\N	uploads/invoices/TI-2026-00008.pdf	\N	117	\N	15000	\N	\N	\N	ASLYtNix2YPYqSDYp9mE2LfYp9mC2Kkg2KfZhNiw2YPZitipAg8zMTI4ODgwMTAyMDAwMDMDGDIwMjYtMDQtMjVUMDY6Mzc6MjIuMzE1WgQIMTQ5ODUuMDAFBDAuMDA=	t	TI-2026-00008	714b6e58-6e58-452c-8cca-571b6979199e	pending	\N	\N	\N	\N	unpaid	0.00
27	12	84	TI-2026-00009	2026-04-26	2026-05-02	9.20	0.00	USD	final	\N	2026-04-26 10:57:40.58+03	2026-04-26 10:57:40.581119+03	\N	1.20	\N	f	\N	\N	uploads/invoices/TI-2026-00009.pdf	\N	117	\N	10	\N	\N	\N	ASLYtNix2YPYqSDYp9mE2LfYp9mC2Kkg2KfZhNiw2YPZitipAg8zMTI4ODgwMTAyMDAwMDMDGDIwMjYtMDQtMjZUMDc6NTc6NDAuNTc5WgQEOS4yMAUEMS4yMA==	t	TI-2026-00009	90314dfe-93c0-4790-b944-ca22837eb8e9	pending	\N	\N	\N	\N	unpaid	0.00
28	12	84	TI-2026-00010	2026-04-26	2026-05-03	10.00	0.00	USD	final	\N	2026-04-26 12:11:02.715+03	2026-04-26 12:11:02.716102+03	\N	0.00	\N	f	\N	\N	uploads/invoices/TI-2026-00010.pdf	\N	117	\N	10	\N	\N	\N	ASLYtNix2YPYqSDYp9mE2LfYp9mC2Kkg2KfZhNiw2YPZitipAg8zMTI4ODgwMTAyMDAwMDMDGDIwMjYtMDQtMjZUMDk6MTE6MDIuNzE0WgQFMTAuMDAFBDAuMDA=	t	TI-2026-00010	a5961ce0-18d7-4590-93da-6bf03273ba7a	pending	\N	\N	\N	\N	unpaid	0.00
30	15	84	TI-2026-00011	2026-05-07	2026-05-07	1150.00	0.00	USD	final	\N	2026-05-07 14:54:14.408+03	2026-05-07 14:54:14.408142+03	\N	150.00	\N	f	\N	\N	uploads/invoices/TI-2026-00011.pdf	\N	156	\N	1000	\N	\N	\N	ASLYtNix2YPYqSDYp9mE2LfYp9mC2Kkg2KfZhNiw2YPZitipAg8zMTI4ODgwMTAyMDAwMDMDGDIwMjYtMDUtMDdUMTE6NTQ6MTQuNDA3WgQHMTE1MC4wMAUGMTUwLjAw	t	TI-2026-00011	a75521ee-a631-42b6-a071-c1b20ea6cb8e	pending	\N	\N	\N	\N	unpaid	0.00
31	15	84	TI-2026-00012	2026-05-07	2026-05-09	115.00	0.00	USD	final	\N	2026-05-07 14:56:21.131+03	2026-05-07 14:56:21.131477+03	\N	15.00	\N	f	\N	\N	uploads/invoices/TI-2026-00012.pdf	\N	156	\N	100	\N	\N	\N	ASLYtNix2YPYqSDYp9mE2LfYp9mC2Kkg2KfZhNiw2YPZitipAg8zMTI4ODgwMTAyMDAwMDMDGDIwMjYtMDUtMDdUMTE6NTY6MjEuMTMwWgQGMTE1LjAwBQUxNS4wMA==	t	TI-2026-00012	531138a4-e73c-404a-8f3e-8f563cf5925a	pending	\N	\N	\N	\N	unpaid	0.00
32	16	84	TI-2026-00013	2026-05-07	2026-05-10	5750.00	0.00	USD	final	\N	2026-05-07 17:05:59.946+03	2026-05-07 17:05:59.946339+03	\N	750.00	\N	f	\N	\N	uploads/invoices/TI-2026-00013.pdf	\N	157	\N	5000	\N	\N	\N	ASLYtNix2YPYqSDYp9mE2LfYp9mC2Kkg2KfZhNiw2YPZitipAg8zMTI4ODgwMTAyMDAwMDMDGDIwMjYtMDUtMDdUMTQ6MDU6NTkuOTQ1WgQHNTc1MC4wMAUGNzUwLjAw	t	TI-2026-00013	c1b304ec-0df2-4a73-ad0e-095caa7e0882	pending	\N	\N	\N	\N	unpaid	0.00
\.


--
-- Data for Name: journal_entries; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.journal_entries (id, entry_date, description, reference_type, reference_id, project_id, contract_id, created_by, is_posted, created_at, updated_at, account_id, debit, credit, entry_type, amount, transaction_date, posted_by, posted_at, entry_number) FROM stdin;
1	2026-04-06	قيد إصدار فاتورة INV-20260406-0001	invoice	8	3	4	\N	t	2026-04-06 21:24:22.928214+02	2026-04-06 21:24:22.928214+02	\N	0.00	0.00	manual	0.00	2026-04-06	84	\N	1
2	2026-04-06	قيد إصدار فاتورة INV-20260406-0001	invoice	9	3	4	\N	t	2026-04-06 21:46:49.238908+02	2026-04-06 21:46:49.238908+02	\N	0.00	0.00	manual	0.00	2026-04-06	84	\N	2
3	2026-04-06	قيد إصدار فاتورة INV-20260406-0002	invoice	10	3	4	\N	t	2026-04-06 22:03:49.526775+02	2026-04-06 22:03:49.526775+02	\N	0.00	0.00	manual	0.00	2026-04-06	84	\N	3
6	2026-04-06	قيد إصدار فاتورة INV-20260406-0003	invoice	13	3	4	\N	t	2026-04-06 22:15:46.933126+02	2026-04-06 22:15:46.933126+02	\N	0.00	0.00	manual	0.00	2026-04-06	84	\N	4
7	2026-04-07	قيد إصدار فاتورة INV-20260407-0001	invoice	14	3	4	\N	t	2026-04-07 06:28:44.142774+02	2026-04-07 06:28:44.142774+02	\N	0.00	0.00	manual	0.00	2026-04-07	84	\N	5
8	2026-04-07	قيد إصدار فاتورة INV-20260407-0002	invoice	15	3	4	\N	t	2026-04-07 06:35:37.928801+02	2026-04-07 06:35:37.928801+02	\N	0.00	0.00	manual	0.00	2026-04-07	84	\N	6
9	2026-04-07	قيد إصدار فاتورة INV-20260407-0003	invoice	16	3	4	\N	t	2026-04-07 06:37:51.630356+02	2026-04-07 06:37:51.630356+02	\N	0.00	0.00	manual	0.00	2026-04-07	84	\N	7
10	2026-04-07	قيد شراء أصل ثابت FA-0001 - Toyota Hilux	fixed_asset_purchase	1	\N	\N	\N	t	2026-04-07 07:26:41.697907+02	2026-04-07 07:26:41.697907+02	\N	0.00	0.00	manual	0.00	2026-04-07	84	\N	8
11	2026-04-07	قيد إهلاك شهري للأصل FA-0001	depreciation	1	\N	\N	\N	t	2026-04-07 07:30:27.782735+02	2026-04-07 07:30:27.782735+02	\N	0.00	0.00	manual	0.00	2026-04-07	84	\N	9
12	2026-04-07	قيد استلام بضاعة - GRN-0001	goods_receipt	1	\N	\N	\N	t	2026-04-07 09:15:56.556523+02	2026-04-07 09:15:56.556523+02	\N	0.00	0.00	manual	0.00	2026-04-07	84	\N	10
13	2026-04-07	قيد فاتورة شراء PINV-0001	purchase_invoice	1	\N	\N	\N	t	2026-04-07 09:27:16.821424+02	2026-04-07 09:27:16.821424+02	\N	0.00	0.00	manual	0.00	2026-04-07	84	\N	11
14	2026-04-07	قيد سداد دفعة لمورد - PINV-0001	supplier_payment	1	\N	\N	\N	t	2026-04-07 09:29:38.687854+02	2026-04-07 09:29:38.687854+02	\N	0.00	0.00	manual	0.00	2026-04-07	84	\N	12
15	2026-04-07	قيد فاتورة شراء PINV-0002	purchase_invoice	2	\N	\N	\N	t	2026-04-07 17:11:47.331649+02	2026-04-07 17:11:47.331649+02	\N	0.00	0.00	manual	0.00	2026-04-07	84	\N	13
18	2026-04-07	قيد فاتورة شراء PINV-0003	purchase_invoice	5	\N	\N	\N	t	2026-04-07 17:29:10.173767+02	2026-04-07 17:29:10.173767+02	\N	0.00	0.00	manual	0.00	2026-04-07	84	\N	14
19	2026-04-07	قيد فاتورة شراء PINV-0004	purchase_invoice	6	\N	\N	\N	t	2026-04-07 17:40:40.360689+02	2026-04-07 17:40:40.360689+02	\N	0.00	0.00	manual	0.00	2026-04-07	84	\N	15
20	2026-04-07	قيد فاتورة شراء PINV-0005	purchase_invoice	7	\N	\N	\N	t	2026-04-07 17:41:32.311287+02	2026-04-07 17:41:32.311287+02	\N	0.00	0.00	manual	0.00	2026-04-07	84	\N	16
21	2026-04-07	قيد إصدار فاتورة INV-20260407-0004	invoice	17	3	4	\N	t	2026-04-07 17:42:27.287102+02	2026-04-07 17:42:27.287102+02	\N	0.00	0.00	manual	0.00	2026-04-07	84	\N	17
22	2026-04-07	قيد إصدار فاتورة INV-20260407-0005	invoice	18	3	4	\N	t	2026-04-07 17:43:59.85576+02	2026-04-07 17:43:59.85576+02	\N	0.00	0.00	manual	0.00	2026-04-07	84	\N	18
23	2026-04-20	Purchase Invoice PINV-2026-0001 - PO PO-0009 - مشروع موسي	purchase_invoice	8	12	\N	84	t	2026-04-20 07:52:04.216724+02	2026-04-20 07:52:04.216724+02	\N	0.00	0.00	auto	0.00	2026-04-20	\N	\N	1
24	2026-04-20	Purchase Invoice PINV-2026-0002 - PO PO-0010 - مشروع موسي	purchase_invoice	9	12	\N	84	t	2026-04-20 12:56:40.980932+02	2026-04-20 12:56:40.980932+02	\N	0.00	0.00	auto	0.00	2026-04-20	\N	\N	2
25	2026-04-20	Purchase Invoice PINV-2026-0003 - PO PO-0011 - مشروع موسي	purchase_invoice	10	12	\N	84	t	2026-04-20 13:27:06.900779+02	2026-04-20 13:27:06.900779+02	\N	0.00	0.00	auto	0.00	2026-04-20	\N	\N	3
34	2026-04-20	Purchase Invoice PINV-2026-0001 - PO PO-0017 - مشروع موسي	purchase_invoice	19	12	\N	84	t	2026-04-20 15:23:21.094493+02	2026-04-20 15:23:21.094493+02	\N	0.00	0.00	auto	0.00	2026-04-20	\N	\N	12
35	2026-04-20	Purchase Invoice PINV-2026-0002 - PO PO-0018 - مشروع موسي	purchase_invoice	20	12	\N	84	t	2026-04-20 19:13:17.034035+02	2026-04-20 19:13:17.034035+02	\N	0.00	0.00	auto	0.00	2026-04-20	\N	\N	13
36	2026-04-20	Purchase Invoice PINV-2026-0003 - PO PO-0019 - مشروع موسي	purchase_invoice	21	12	\N	84	t	2026-04-20 19:16:57.178734+02	2026-04-20 19:16:57.178734+02	\N	0.00	0.00	auto	0.00	2026-04-20	\N	\N	14
39	2026-04-20	Payment voucher PV-2026-0001 for invoice PINV-2026-0001	payment_voucher	\N	\N	\N	\N	t	2026-04-20 20:19:32.541689+02	2026-04-20 20:19:32.541689+02	\N	0.00	0.00	auto	0.00	2026-04-20	\N	\N	17
40	2026-04-20	Payment voucher PV-2026-0002 for invoice PINV-2026-0002	payment_voucher	\N	\N	\N	\N	t	2026-04-20 20:21:08.602819+02	2026-04-20 20:21:08.602819+02	\N	0.00	0.00	auto	0.00	2026-04-20	\N	\N	18
41	2026-04-21	Payment voucher PV-2026-0003 for invoice PINV-2026-0003	payment_voucher	\N	\N	\N	\N	t	2026-04-21 07:04:16.863206+02	2026-04-21 07:04:16.863206+02	\N	0.00	0.00	auto	0.00	2026-04-21	\N	\N	19
43	2026-04-21	Expense Voucher: اا	expense_voucher	3	\N	\N	\N	t	2026-04-21 08:35:39.422467+02	2026-04-21 08:35:39.422467+02	\N	0.00	0.00	auto	0.00	2026-04-21	84	\N	21
44	2026-04-21	Expense Voucher: تم صرف ايجار مكتب	expense_voucher	4	\N	\N	\N	t	2026-04-21 09:24:01.135777+02	2026-04-21 09:24:01.135777+02	\N	0.00	0.00	auto	0.00	2026-04-21	84	\N	22
45	2026-04-21	Expense Voucher: تم دفع مصاؤيف اداريه 	expense_voucher	5	\N	\N	\N	t	2026-04-21 09:28:09.13979+02	2026-04-21 09:28:09.13979+02	\N	0.00	0.00	auto	0.00	2026-04-21	84	\N	23
46	2026-04-21	Sales Invoice: SI-2026-0001	sales_invoice	1	\N	\N	\N	t	2026-04-21 17:27:50.299397+02	2026-04-21 17:27:50.299397+02	\N	0.00	0.00	auto	0.00	2026-04-21	84	\N	24
47	2026-04-22	Sales Invoice: SI-2026-0002	sales_invoice	2	\N	\N	\N	t	2026-04-22 09:38:54.737486+02	2026-04-22 09:38:54.737486+02	\N	0.00	0.00	auto	0.00	2026-04-22	84	\N	25
48	2026-04-22	Sales Invoice: SI-2026-0003	sales_invoice	3	\N	\N	\N	t	2026-04-22 09:42:01.701892+02	2026-04-22 09:42:01.701892+02	\N	0.00	0.00	auto	0.00	2026-04-22	84	\N	26
49	2026-04-22	Sales Invoice: SI-2026-0004	sales_invoice	4	\N	\N	\N	t	2026-04-22 09:47:07.175486+02	2026-04-22 09:47:07.175486+02	\N	0.00	0.00	auto	0.00	2026-04-22	84	\N	27
50	2026-04-22	Sales Invoice: SI-2026-0005	sales_invoice	5	\N	\N	\N	t	2026-04-22 09:48:54.607425+02	2026-04-22 09:48:54.607425+02	\N	0.00	0.00	auto	0.00	2026-04-22	84	\N	28
51	2026-04-22	Sales Invoice: SI-2026-0006	sales_invoice	6	\N	\N	\N	t	2026-04-22 09:49:49.005697+02	2026-04-22 09:49:49.005697+02	\N	0.00	0.00	auto	0.00	2026-04-22	84	\N	29
52	2026-04-22	Sales Invoice: SI-2026-0007	sales_invoice	7	\N	\N	\N	t	2026-04-22 09:59:54.33339+02	2026-04-22 09:59:54.33339+02	\N	0.00	0.00	auto	0.00	2026-04-22	84	\N	30
53	2026-04-22	Sales Invoice: SI-2026-0008	sales_invoice	8	\N	\N	\N	t	2026-04-22 10:04:19.455805+02	2026-04-22 10:04:19.455805+02	\N	0.00	0.00	auto	0.00	2026-04-22	84	\N	31
54	2026-04-22	Sales Invoice: SI-2026-0009	sales_invoice	9	\N	\N	\N	t	2026-04-22 10:07:53.169584+02	2026-04-22 10:07:53.169584+02	\N	0.00	0.00	auto	0.00	2026-04-22	84	\N	32
55	2026-04-22	Sales Invoice: SI-2026-0010	sales_invoice	10	\N	\N	\N	t	2026-04-22 10:12:48.941266+02	2026-04-22 10:12:48.941266+02	\N	0.00	0.00	auto	0.00	2026-04-22	84	\N	33
56	2026-04-22	Sales Invoice: SI-2026-0011	sales_invoice	11	\N	\N	\N	t	2026-04-22 10:14:28.204933+02	2026-04-22 10:14:28.204933+02	\N	0.00	0.00	auto	0.00	2026-04-22	84	\N	34
57	2026-04-22	Sales Invoice: SI-2026-0012	sales_invoice	12	\N	\N	\N	t	2026-04-22 10:17:59.181967+02	2026-04-22 10:17:59.181967+02	\N	0.00	0.00	auto	0.00	2026-04-22	84	\N	35
58	2026-04-22	Sales Invoice #SI-2026-0013	sales_invoice	13	\N	\N	\N	t	2026-04-22 10:24:31.056283+02	2026-04-22 10:24:31.056283+02	\N	0.00	0.00	auto	0.00	2026-04-22	84	\N	36
59	2026-04-22	Sales Invoice #SI-2026-0014	sales_invoice	14	\N	\N	\N	t	2026-04-22 10:26:35.99332+02	2026-04-22 10:26:35.99332+02	\N	0.00	0.00	auto	0.00	2026-04-22	84	\N	37
60	2026-04-22	Payment voucher PV-2026-0004 for invoice PINV-2026-0002	payment_voucher	\N	\N	\N	\N	t	2026-04-22 11:09:59.090473+02	2026-04-22 11:09:59.090473+02	\N	0.00	0.00	auto	0.00	2026-04-22	\N	\N	38
61	2026-04-22	Purchase Invoice PINV-2026-0004 - PO PO-0008 - مشروع موسي	purchase_invoice	22	12	\N	84	t	2026-04-22 11:17:37.659921+02	2026-04-22 11:17:37.659921+02	\N	0.00	0.00	auto	0.00	2026-04-22	\N	\N	39
62	2026-04-22	قيد فاتورة شراء PINV-0005	purchase_invoice	23	12	\N	\N	t	2026-04-22 14:10:25.337502+02	2026-04-22 14:10:25.337502+02	\N	0.00	0.00	manual	0.00	2026-04-22	84	\N	40
63	2026-04-22	قيد فاتورة شراء PINV-0006	purchase_invoice	24	12	\N	\N	t	2026-04-22 14:15:11.661596+02	2026-04-22 14:15:11.661596+02	\N	0.00	0.00	manual	0.00	2026-04-22	84	\N	41
64	2026-04-22	قيد فاتورة شراء PINV-0007	purchase_invoice	25	12	\N	\N	t	2026-04-22 14:22:10.25909+02	2026-04-22 14:22:10.25909+02	\N	0.00	0.00	manual	0.00	2026-04-22	84	\N	42
65	2026-04-22	قيد فاتورة شراء PINV-0008	purchase_invoice	26	12	\N	\N	t	2026-04-22 14:24:15.312347+02	2026-04-22 14:24:15.312347+02	\N	0.00	0.00	manual	0.00	2026-04-22	84	\N	43
66	2026-04-22	Purchase Invoice PINV-2026-0005 - PO PO-0005 - مشروع موسي	purchase_invoice	27	12	\N	84	t	2026-04-22 14:27:50.688995+02	2026-04-22 14:27:50.688995+02	\N	0.00	0.00	auto	0.00	2026-04-22	\N	\N	40
67	2026-04-22	Purchase Invoice PINV-2026-0006 - PO PO-0004 - مشروع موسي	purchase_invoice	28	12	\N	84	t	2026-04-22 14:51:39.197754+02	2026-04-22 14:51:39.197754+02	\N	0.00	0.00	auto	0.00	2026-04-22	\N	\N	41
68	2026-04-22	Purchase Invoice PINV-2026-0007 - PO PO-0003 - مشروع موسي	purchase_invoice	29	12	\N	84	t	2026-04-22 15:02:32.617815+02	2026-04-22 15:02:32.617815+02	\N	0.00	0.00	auto	0.00	2026-04-22	\N	\N	42
69	2026-04-22	قيد تأسيس صندوق عهد عبد الرحمن عهده مشروع موسي 	petty_cash_fund	10	12	\N	\N	t	2026-04-22 17:02:37.565858+02	2026-04-22 17:02:37.565858+02	\N	0.00	0.00	manual	0.00	2026-04-22	84	\N	44
70	2026-04-22	قيد إضافة Funds لصندوق عبد الرحمن عهده مشروع موسي 	petty_cash_fund	10	12	\N	\N	t	2026-04-22 17:02:52.178178+02	2026-04-22 17:02:52.178178+02	\N	0.00	0.00	manual	0.00	2026-04-22	84	\N	45
71	2026-04-22	قيد تأسيس صندوق عهد تت	petty_cash_fund	11	5	\N	\N	t	2026-04-22 17:07:31.187408+02	2026-04-22 17:07:31.187408+02	\N	0.00	0.00	manual	0.00	2026-04-22	84	\N	46
72	2026-04-22	قيد مصروف من صندوق عهد عبد الرحمن عهده مشروع موسي 	petty_cash_expense	2	12	\N	\N	t	2026-04-22 17:30:16.034769+02	2026-04-22 17:30:16.034769+02	\N	0.00	0.00	manual	0.00	2026-04-22	84	\N	47
73	2026-04-22	قيد مصروف من صندوق عهد عبد الرحمن عهده مشروع موسي 	petty_cash_expense	3	12	\N	\N	t	2026-04-22 17:31:10.588437+02	2026-04-22 17:31:10.588437+02	\N	0.00	0.00	manual	0.00	2026-04-22	84	\N	48
74	2026-04-22	قيد مصروف من صندوق عهد عبد الرحمن عهده مشروع موسي 	petty_cash_expense	4	12	\N	\N	t	2026-04-22 17:33:35.210725+02	2026-04-22 17:33:35.210725+02	\N	0.00	0.00	manual	0.00	2026-04-22	84	\N	49
75	2026-04-22	Expense Voucher: و	expense_voucher	6	\N	\N	\N	t	2026-04-22 17:57:44.735048+02	2026-04-22 17:57:44.735048+02	\N	0.00	0.00	auto	0.00	2026-04-22	84	\N	43
76	2026-04-22	Expense Voucher: ز	expense_voucher	7	\N	\N	\N	t	2026-04-22 17:58:51.777424+02	2026-04-22 17:58:51.777424+02	\N	0.00	0.00	auto	0.00	2026-04-22	84	\N	44
77	2026-04-23	Payment voucher PV-2026-0005 for invoice PINV-2026-0002	payment_voucher	\N	\N	\N	\N	t	2026-04-23 10:06:09.483045+02	2026-04-23 10:06:09.483045+02	\N	0.00	0.00	auto	0.00	2026-04-23	\N	\N	45
78	2026-04-23	Payment voucher PV-2026-0006 for invoice PINV-0008	payment_voucher	\N	\N	\N	\N	t	2026-04-23 10:07:06.811651+02	2026-04-23 10:07:06.811651+02	\N	0.00	0.00	auto	0.00	2026-04-23	\N	\N	46
79	2026-04-23	Sales Invoice #SI-2026-0015	sales_invoice	15	\N	\N	\N	t	2026-04-23 10:08:12.916778+02	2026-04-23 10:08:12.916778+02	\N	0.00	0.00	auto	0.00	2026-04-23	84	\N	47
80	2026-04-23	قيد مصروف من صندوق عهد ااا	petty_cash_expense	5	12	\N	\N	t	2026-04-23 10:09:49.999636+02	2026-04-23 10:09:49.999636+02	\N	0.00	0.00	manual	0.00	2026-04-23	84	\N	50
81	2026-04-23	سند قبض RV-2026-0002 - موسي 	receipt_voucher	2	\N	\N	\N	t	2026-04-23 12:25:15.743244+02	2026-04-23 12:25:15.743244+02	\N	0.00	0.00	manual	0.00	2026-04-23	84	\N	51
82	2026-04-23	سند قبض RV-2026-0008 - موسي 	receipt_voucher	8	\N	\N	\N	t	2026-04-23 14:00:15.156575+02	2026-04-23 14:00:15.156575+02	\N	0.00	0.00	manual	0.00	2026-04-23	84	\N	52
83	2026-04-23	Sales Invoice #SI-2026-0016	sales_invoice	16	\N	\N	\N	t	2026-04-23 14:21:49.47341+02	2026-04-23 14:21:49.47341+02	\N	0.00	0.00	auto	0.00	2026-04-23	84	\N	48
84	2026-04-23	Sales Invoice #SI-2026-0017	sales_invoice	17	\N	\N	\N	t	2026-04-23 15:12:49.67848+02	2026-04-23 15:12:49.67848+02	\N	0.00	0.00	auto	0.00	2026-04-23	84	\N	49
85	2026-04-23	سند قبض RV-2026-0009 - موسي 	receipt_voucher	9	\N	\N	\N	t	2026-04-23 17:05:33.64193+02	2026-04-23 17:05:33.64193+02	\N	0.00	0.00	manual	0.00	2026-04-23	84	\N	53
86	2026-04-23	قيد مصروف من صندوق عهد عبد الرحمن عهده مشروع موسي 	petty_cash_expense	6	12	\N	\N	t	2026-04-23 17:07:17.92544+02	2026-04-23 17:07:17.92544+02	\N	0.00	0.00	manual	0.00	2026-04-23	84	\N	54
87	2026-04-23	Payment voucher PV-2026-0007 for invoice PINV-2026-0007	payment_voucher	\N	\N	\N	\N	t	2026-04-23 17:18:42.402152+02	2026-04-23 17:18:42.402152+02	\N	0.00	0.00	auto	0.00	2026-04-23	\N	\N	50
88	2026-04-23	Payment voucher PV-2026-0008 for invoice PINV-2026-0005	payment_voucher	\N	\N	\N	\N	t	2026-04-23 17:20:15.541037+02	2026-04-23 17:20:15.541037+02	\N	0.00	0.00	auto	0.00	2026-04-23	\N	\N	51
89	2026-04-24	Sales Invoice #SI-2026-0018	sales_invoice	18	\N	\N	\N	t	2026-04-24 15:50:26.136082+03	2026-04-24 15:50:26.136082+03	\N	0.00	0.00	auto	0.00	2026-04-24	84	\N	52
90	2026-04-24	قيد إهلاك شهري للأصل FA-0001	depreciation	1	\N	\N	\N	t	2026-04-24 16:38:41.753024+03	2026-04-24 16:38:41.753024+03	\N	0.00	0.00	manual	0.00	2026-04-24	84	\N	55
91	2026-04-24	قيد إهلاك شهري للأصل FA-0001	depreciation	1	\N	\N	\N	t	2026-04-24 16:38:53.271824+03	2026-04-24 16:38:53.271824+03	\N	0.00	0.00	manual	0.00	2026-04-24	84	\N	56
92	2026-04-24	قيد شراء أصل ثابت FA-0002 - G-clas	fixed_asset_purchase	2	\N	\N	\N	t	2026-04-24 17:02:30.883766+03	2026-04-24 17:02:30.883766+03	\N	0.00	0.00	manual	0.00	2026-04-24	84	\N	57
93	2026-04-24	قيد شراء أصل ثابت FA-0003 - G-clas	fixed_asset_purchase	3	\N	\N	\N	t	2026-04-24 17:25:08.459971+03	2026-04-24 17:25:08.459971+03	\N	0.00	0.00	manual	0.00	2026-04-24	84	\N	58
94	2026-04-24	قيد إهلاك شهري للأصل FA-0001	depreciation	1	\N	\N	\N	t	2026-04-24 17:25:50.502902+03	2026-04-24 17:25:50.502902+03	\N	0.00	0.00	manual	0.00	2026-04-24	84	\N	59
95	2026-04-24	قيد إهلاك شهري للأصل FA-0002	depreciation	2	\N	\N	\N	t	2026-04-24 17:25:50.502902+03	2026-04-24 17:25:50.502902+03	\N	0.00	0.00	manual	0.00	2026-04-24	84	\N	59
96	2026-04-24	قيد إهلاك شهري للأصل FA-0003	depreciation	3	\N	\N	\N	t	2026-04-24 17:25:50.502902+03	2026-04-24 17:25:50.502902+03	\N	0.00	0.00	manual	0.00	2026-04-24	84	\N	59
97	2026-04-24	قيد إهلاك شهري للأصل FA-0001	depreciation	1	\N	\N	\N	t	2026-04-24 17:32:16.721435+03	2026-04-24 17:32:16.721435+03	\N	0.00	0.00	manual	0.00	2026-04-24	84	\N	60
98	2026-04-24	قيد إهلاك شهري للأصل FA-0002	depreciation	2	\N	\N	\N	t	2026-04-24 17:32:16.721435+03	2026-04-24 17:32:16.721435+03	\N	0.00	0.00	manual	0.00	2026-04-24	84	\N	60
99	2026-04-24	قيد إهلاك شهري للأصل FA-0003	depreciation	3	\N	\N	\N	t	2026-04-24 17:32:16.721435+03	2026-04-24 17:32:16.721435+03	\N	0.00	0.00	manual	0.00	2026-04-24	84	\N	60
100	2026-04-24	قيد شراء أصل ثابت FA-0004 - G-clas33	fixed_asset_purchase	4	\N	\N	\N	t	2026-04-24 17:45:59.232417+03	2026-04-24 17:45:59.232417+03	\N	0.00	0.00	manual	0.00	2026-04-24	84	\N	61
101	2026-04-24	قيد إهلاك شهري للأصل FA-0001	depreciation	1	\N	\N	\N	t	2026-04-24 17:46:46.540688+03	2026-04-24 17:46:46.540688+03	\N	0.00	0.00	manual	0.00	2026-04-24	84	\N	62
102	2026-04-24	قيد إهلاك شهري للأصل FA-0002	depreciation	2	\N	\N	\N	t	2026-04-24 17:46:46.540688+03	2026-04-24 17:46:46.540688+03	\N	0.00	0.00	manual	0.00	2026-04-24	84	\N	62
103	2026-04-24	قيد إهلاك شهري للأصل FA-0003	depreciation	3	\N	\N	\N	t	2026-04-24 17:46:46.540688+03	2026-04-24 17:46:46.540688+03	\N	0.00	0.00	manual	0.00	2026-04-24	84	\N	62
104	2026-04-24	قيد إهلاك شهري للأصل FA-0004	depreciation	4	\N	\N	\N	t	2026-04-24 17:46:46.540688+03	2026-04-24 17:46:46.540688+03	\N	0.00	0.00	manual	0.00	2026-04-24	84	\N	62
105	2026-04-24	قيد إهلاك شهري للأصل FA-0001	depreciation	1	\N	\N	\N	t	2026-04-24 17:47:53.097502+03	2026-04-24 17:47:53.097502+03	\N	0.00	0.00	manual	0.00	2026-04-24	84	\N	63
106	2026-04-24	قيد إهلاك شهري للأصل FA-0002	depreciation	2	\N	\N	\N	t	2026-04-24 17:47:53.097502+03	2026-04-24 17:47:53.097502+03	\N	0.00	0.00	manual	0.00	2026-04-24	84	\N	63
107	2026-04-24	قيد إهلاك شهري للأصل FA-0003	depreciation	3	\N	\N	\N	t	2026-04-24 17:47:53.097502+03	2026-04-24 17:47:53.097502+03	\N	0.00	0.00	manual	0.00	2026-04-24	84	\N	63
108	2026-04-24	قيد إهلاك شهري للأصل FA-0004	depreciation	4	\N	\N	\N	t	2026-04-24 17:47:53.097502+03	2026-04-24 17:47:53.097502+03	\N	0.00	0.00	manual	0.00	2026-04-24	84	\N	63
109	2026-04-24	قيد إهلاك شهري للأصل FA-0001	depreciation	1	\N	\N	\N	t	2026-04-24 17:48:24.556996+03	2026-04-24 17:48:24.556996+03	\N	0.00	0.00	manual	0.00	2026-04-24	84	\N	64
110	2026-04-24	قيد إهلاك شهري للأصل FA-0002	depreciation	2	\N	\N	\N	t	2026-04-24 17:48:24.556996+03	2026-04-24 17:48:24.556996+03	\N	0.00	0.00	manual	0.00	2026-04-24	84	\N	64
111	2026-04-24	قيد إهلاك شهري للأصل FA-0003	depreciation	3	\N	\N	\N	t	2026-04-24 17:48:24.556996+03	2026-04-24 17:48:24.556996+03	\N	0.00	0.00	manual	0.00	2026-04-24	84	\N	64
112	2026-04-24	قيد إهلاك شهري للأصل FA-0004	depreciation	4	\N	\N	\N	t	2026-04-24 17:48:24.556996+03	2026-04-24 17:48:24.556996+03	\N	0.00	0.00	manual	0.00	2026-04-24	84	\N	64
113	2026-04-24	قيد شراء أصل ثابت FA-0005 - G-clas3300	fixed_asset_purchase	5	\N	\N	\N	t	2026-04-24 17:59:15.967038+03	2026-04-24 17:59:15.967038+03	\N	0.00	0.00	manual	0.00	2026-04-24	84	\N	65
114	2026-04-24	Sales Invoice #SI-2026-0019	sales_invoice	19	\N	\N	\N	t	2026-04-24 18:12:16.885453+03	2026-04-24 18:12:16.885453+03	\N	0.00	0.00	auto	0.00	2026-04-24	84	\N	53
115	2026-04-24	Credit Note #CN-2026-00001	credit_note	4	\N	\N	\N	t	2026-04-24 19:19:19.73694+03	2026-04-24 19:19:19.73694+03	\N	0.00	0.00	auto	0.00	2026-04-24	84	\N	54
116	2026-04-24	Sales Invoice #SI-2026-0020	sales_invoice	20	\N	\N	\N	t	2026-04-24 19:20:54.060157+03	2026-04-24 19:20:54.060157+03	\N	0.00	0.00	auto	0.00	2026-04-24	84	\N	55
117	2026-04-24	Credit Note #CN-2026-00001	credit_note	8	\N	\N	\N	t	2026-04-24 19:25:40.543877+03	2026-04-24 19:25:40.543877+03	\N	0.00	0.00	auto	0.00	2026-04-24	84	\N	56
118	2026-04-24	Credit Note #CN-2026-00002	credit_note	9	\N	\N	\N	t	2026-04-24 19:28:09.274102+03	2026-04-24 19:28:09.274102+03	\N	0.00	0.00	auto	0.00	2026-04-24	84	\N	57
119	2026-04-24	Credit Note #CN-2026-00003	credit_note	10	\N	\N	\N	t	2026-04-24 19:30:33.258006+03	2026-04-24 19:30:33.258006+03	\N	0.00	0.00	auto	0.00	2026-04-24	84	\N	58
120	2026-04-24	Credit Note #CN-2026-00004	credit_note	11	\N	\N	\N	t	2026-04-24 19:40:07.036875+03	2026-04-24 19:40:07.036875+03	\N	0.00	0.00	auto	0.00	2026-04-24	84	\N	59
121	2026-04-25	Credit Note #CN-2026-00005	credit_note	12	\N	\N	\N	t	2026-04-25 09:57:04.287679+03	2026-04-25 09:57:04.287679+03	\N	0.00	0.00	auto	0.00	2026-04-25	84	\N	60
122	2026-04-25	Sales Invoice #SI-2026-0021	sales_invoice	21	\N	\N	\N	t	2026-04-25 16:08:06.448404+03	2026-04-25 16:08:06.448404+03	\N	0.00	0.00	auto	0.00	2026-04-25	84	\N	61
123	2026-04-26	Sales Invoice #SI-2026-0022	sales_invoice	22	\N	\N	\N	t	2026-04-26 10:57:25.930419+03	2026-04-26 10:57:25.930419+03	\N	0.00	0.00	auto	0.00	2026-04-26	84	\N	62
124	2026-04-26	Credit Note #CN-2026-00006	credit_note	13	\N	\N	\N	t	2026-04-26 11:00:23.908673+03	2026-04-26 11:00:23.908673+03	\N	0.00	0.00	auto	0.00	2026-04-26	84	\N	63
125	2026-04-26	Sales Invoice #SI-2026-0023	sales_invoice	23	\N	\N	\N	t	2026-04-26 11:27:32.210455+03	2026-04-26 11:27:32.210455+03	\N	0.00	0.00	auto	0.00	2026-04-26	84	\N	64
126	2026-04-26	Sales Invoice #SI-2026-0024	sales_invoice	24	\N	\N	\N	t	2026-04-26 12:10:19.097132+03	2026-04-26 12:10:19.097132+03	\N	0.00	0.00	auto	0.00	2026-04-26	84	\N	65
127	2026-04-26	Purchase Invoice PINV-2026-0008 - PO PO-0020 - مشروع موسي	purchase_invoice	30	12	\N	84	t	2026-04-26 12:39:18.597601+03	2026-04-26 12:39:18.597601+03	\N	0.00	0.00	auto	0.00	2026-04-26	\N	\N	66
128	2026-04-26	Purchase Invoice PINV-2026-0009 - PO PO-0023 - مشروع موسي	purchase_invoice	31	12	\N	84	t	2026-04-26 13:02:20.543234+03	2026-04-26 13:02:20.543234+03	\N	0.00	0.00	auto	0.00	2026-04-26	\N	\N	67
129	2026-04-26	Purchase Invoice PINV-2026-0010 - PO PO-0022 - مشروع موسي	purchase_invoice	32	12	\N	84	t	2026-04-26 13:35:13.559777+03	2026-04-26 13:35:13.559777+03	\N	0.00	0.00	auto	0.00	2026-04-26	\N	\N	68
130	2026-04-26	Purchase Invoice PINV-2026-0011 - PO PO-0025 - مشروع موسي	purchase_invoice	35	12	\N	84	t	2026-04-26 14:21:03.175603+03	2026-04-26 14:21:03.175603+03	\N	0.00	0.00	auto	0.00	2026-04-26	\N	\N	69
131	2026-04-26	Purchase Invoice PINV-2026-0012 - PO PO-0027 - مشروع موسي	purchase_invoice	36	12	\N	84	t	2026-04-26 14:28:07.407758+03	2026-04-26 14:28:07.407758+03	\N	0.00	0.00	auto	0.00	2026-04-26	\N	\N	70
132	2026-04-26	Purchase Invoice PINV-2026-0013 - PO PO-0026 - مشروع موسي	purchase_invoice	37	12	\N	84	t	2026-04-26 14:33:25.857988+03	2026-04-26 14:33:25.857988+03	\N	0.00	0.00	auto	0.00	2026-04-26	\N	\N	71
133	2026-04-26	Purchase Invoice PINV-2026-0014 - PO PO-0024 - مشروع موسي	purchase_invoice	38	12	\N	84	t	2026-04-26 14:35:22.337066+03	2026-04-26 14:35:22.337066+03	\N	0.00	0.00	auto	0.00	2026-04-26	\N	\N	72
134	2026-04-26	Purchase Invoice PINV-2026-0015 - PO PO-0021 - مشروع موسي	purchase_invoice	39	12	\N	84	t	2026-04-26 15:09:15.654729+03	2026-04-26 15:09:15.654729+03	\N	0.00	0.00	auto	0.00	2026-04-26	\N	\N	73
135	2026-04-26	Purchase Invoice PINV-2026-0016 - PO PO-0028 - مشروع موسي	purchase_invoice	40	12	\N	84	t	2026-04-26 15:13:02.070677+03	2026-04-26 15:13:02.070677+03	\N	0.00	0.00	auto	0.00	2026-04-26	\N	\N	74
136	2026-04-26	Purchase Invoice PINV-2026-0017 - PO PO-0029 - مشروع موسي	purchase_invoice	41	12	\N	84	t	2026-04-26 18:10:19.413999+03	2026-04-26 18:10:19.413999+03	\N	0.00	0.00	auto	0.00	2026-04-26	\N	\N	75
137	2026-04-26	Sales Invoice #SI-2026-0025	sales_invoice	25	\N	\N	\N	t	2026-04-26 18:33:34.712782+03	2026-04-26 18:33:34.712782+03	\N	0.00	0.00	auto	0.00	2026-04-26	84	\N	76
138	2026-04-26	Sales Invoice #SI-2026-0026	sales_invoice	26	\N	\N	\N	t	2026-04-26 18:51:40.720771+03	2026-04-26 18:51:40.720771+03	\N	0.00	0.00	auto	0.00	2026-04-26	84	\N	77
139	2026-04-26	سند قبض RV-2026-0011 - موسي 	receipt_voucher	11	\N	\N	\N	t	2026-04-26 18:56:56.021952+03	2026-04-26 18:56:56.021952+03	\N	0.00	0.00	manual	0.00	2026-04-26	84	\N	78
140	2026-04-26	Sales Invoice #SI-2026-0027	sales_invoice	27	\N	\N	\N	t	2026-04-26 19:05:08.569823+03	2026-04-26 19:05:08.569823+03	\N	0.00	0.00	auto	0.00	2026-04-26	84	\N	78
141	2026-04-26	سند قبض RV-2026-0012 - موسي 	receipt_voucher	12	\N	\N	\N	t	2026-04-26 19:06:47.469629+03	2026-04-26 19:06:47.469629+03	\N	0.00	0.00	manual	0.00	2026-04-26	84	\N	79
142	2026-04-26	Sales Invoice #SI-2026-0028	sales_invoice	28	\N	\N	\N	t	2026-04-26 19:07:50.581145+03	2026-04-26 19:07:50.581145+03	\N	0.00	0.00	auto	0.00	2026-04-26	84	\N	79
143	2026-04-26	Credit Note #CN-2026-00007	credit_note	14	\N	\N	\N	t	2026-04-26 19:09:31.580389+03	2026-04-26 19:09:31.580389+03	\N	0.00	0.00	auto	0.00	2026-04-26	84	\N	80
144	2026-04-26	Credit Note #CN-2026-00008	credit_note	15	\N	\N	\N	t	2026-04-26 19:12:20.446976+03	2026-04-26 19:12:20.446976+03	\N	0.00	0.00	auto	0.00	2026-04-26	84	\N	81
145	2026-04-27	قيد رواتب التحول الرقمي - يدوي	payroll_manual	\N	\N	\N	\N	t	2026-04-27 14:02:35.006141+03	2026-04-27 14:02:35.006141+03	\N	0.00	0.00	manual	0.00	2026-04-27	97	\N	82
146	2026-04-27	قيد رواتب الاداره الماليه - تلقائي	payroll_auto	\N	\N	\N	\N	t	2026-04-27 14:34:54.604583+03	2026-04-27 14:34:54.604583+03	\N	0.00	0.00	manual	0.00	2026-04-27	97	\N	83
147	2026-04-27	قيد رواتب اداره  العملاء والمببعات - تلقائي	payroll_auto	\N	\N	\N	\N	t	2026-04-27 14:34:54.620944+03	2026-04-27 14:34:54.620944+03	\N	0.00	0.00	manual	0.00	2026-04-27	97	\N	84
148	2026-04-27	قيد رواتب قسمم الطاقه الشميسه - تلقائي	payroll_auto	\N	\N	\N	\N	t	2026-04-27 14:34:54.627226+03	2026-04-27 14:34:54.627226+03	\N	0.00	0.00	manual	0.00	2026-04-27	97	\N	85
149	2026-04-27	قيد رواتب    فسمم  العروض   - تلقائي	payroll_auto	\N	\N	\N	\N	t	2026-04-27 14:34:54.633092+03	2026-04-27 14:34:54.633092+03	\N	0.00	0.00	manual	0.00	2026-04-27	97	\N	86
150	2026-04-27	قيد رواتب    اداره  المشاريع   - تلقائي	payroll_auto	\N	\N	\N	\N	t	2026-04-27 14:34:54.638715+03	2026-04-27 14:34:54.638715+03	\N	0.00	0.00	manual	0.00	2026-04-27	97	\N	87
151	2026-04-27	قيد رواتب    اداره  العقود    - تلقائي	payroll_auto	\N	\N	\N	\N	t	2026-04-27 14:34:54.6433+03	2026-04-27 14:34:54.6433+03	\N	0.00	0.00	manual	0.00	2026-04-27	97	\N	88
152	2026-04-27	قيد رواتب    اداره  المشتريات     - تلقائي	payroll_auto	\N	\N	\N	\N	t	2026-04-27 14:34:54.647599+03	2026-04-27 14:34:54.647599+03	\N	0.00	0.00	manual	0.00	2026-04-27	97	\N	89
153	2026-04-27	قيد رواتب    اداره  المخازن     - تلقائي	payroll_auto	\N	\N	\N	\N	t	2026-04-27 14:34:54.652517+03	2026-04-27 14:34:54.652517+03	\N	0.00	0.00	manual	0.00	2026-04-27	97	\N	90
154	2026-04-27	قيد رواتب الصيانه والمتابعه  - تلقائي	payroll_auto	\N	\N	\N	\N	t	2026-04-27 14:34:54.658203+03	2026-04-27 14:34:54.658203+03	\N	0.00	0.00	manual	0.00	2026-04-27	97	\N	91
155	2026-04-27	قيد رواتب الموس شمسيه  - تلقائي	payroll_auto	\N	\N	\N	\N	t	2026-04-27 14:34:54.662517+03	2026-04-27 14:34:54.662517+03	\N	0.00	0.00	manual	0.00	2026-04-27	97	\N	92
156	2026-04-27	قيد رواتب التحول الرقمي - تلقائي	payroll_auto	\N	\N	\N	\N	t	2026-04-27 14:34:54.666632+03	2026-04-27 14:34:54.666632+03	\N	0.00	0.00	manual	0.00	2026-04-27	97	\N	93
157	2026-04-27	قيد رواتب المباني والمنازل الذكية - تلقائي	payroll_auto	\N	\N	\N	\N	t	2026-04-27 14:34:54.674257+03	2026-04-27 14:34:54.674257+03	\N	0.00	0.00	manual	0.00	2026-04-27	97	\N	94
158	2026-04-27	قيد رواتب الطاقة المتجددة وتخزين الطاقة - تلقائي	payroll_auto	\N	\N	\N	\N	t	2026-04-27 14:34:54.679708+03	2026-04-27 14:34:54.679708+03	\N	0.00	0.00	manual	0.00	2026-04-27	97	\N	95
159	2026-04-27	قيد رواتب الطاقة المتجددة وتخزين الطاقة - تلقائي	payroll_auto	\N	\N	\N	\N	t	2026-04-27 18:33:56.501338+03	2026-04-27 18:33:56.501338+03	\N	0.00	0.00	manual	0.00	2026-04-27	97	\N	96
160	2026-04-27	قيد رواتب    اداره  المخازن     - تلقائي	payroll_auto	\N	\N	\N	\N	t	2026-04-27 18:33:56.501698+03	2026-04-27 18:33:56.501698+03	\N	0.00	0.00	manual	0.00	2026-04-27	97	\N	96
161	2026-04-27	قيد رواتب الاداره الماليه - تلقائي	payroll_auto	\N	\N	\N	\N	t	2026-04-27 18:36:35.764113+03	2026-04-27 18:36:35.764113+03	\N	0.00	0.00	manual	0.00	2026-04-27	97	\N	97
162	2026-04-27	قيد رواتب قسمم الطاقه الشميسه - تلقائي	payroll_auto	\N	\N	\N	\N	t	2026-04-27 18:36:35.78548+03	2026-04-27 18:36:35.78548+03	\N	0.00	0.00	manual	0.00	2026-04-27	97	\N	98
163	2026-04-27	قيد رواتب الطاقة المتجددة وتخزين الطاقة - تلقائي	payroll_auto	\N	\N	\N	\N	t	2026-04-27 18:36:35.795081+03	2026-04-27 18:36:35.795081+03	\N	0.00	0.00	manual	0.00	2026-04-27	97	\N	99
164	2026-04-27	قيد رواتب اداره  العملاء والمببعات - تلقائي	payroll_auto	\N	\N	\N	\N	t	2026-04-27 18:36:35.853025+03	2026-04-27 18:36:35.853025+03	\N	0.00	0.00	manual	0.00	2026-04-27	97	\N	100
165	2026-04-27	قيد رواتب    اداره  العقود    - تلقائي	payroll_auto	\N	\N	\N	\N	t	2026-04-27 18:36:35.874059+03	2026-04-27 18:36:35.874059+03	\N	0.00	0.00	manual	0.00	2026-04-27	97	\N	101
166	2026-04-27	قيد رواتب الاداره الماليه - تلقائي	payroll_auto	\N	\N	\N	\N	t	2026-04-27 18:36:56.802129+03	2026-04-27 18:36:56.802129+03	\N	0.00	0.00	manual	0.00	2026-04-27	97	\N	102
167	2026-04-27	قيد رواتب اداره  العملاء والمببعات - تلقائي	payroll_auto	\N	\N	\N	\N	t	2026-04-27 18:36:56.802444+03	2026-04-27 18:36:56.802444+03	\N	0.00	0.00	manual	0.00	2026-04-27	97	\N	102
168	2026-04-27	قيد رواتب قسمم الطاقه الشميسه - تلقائي	payroll_auto	\N	\N	\N	\N	t	2026-04-27 18:36:56.803417+03	2026-04-27 18:36:56.803417+03	\N	0.00	0.00	manual	0.00	2026-04-27	97	\N	102
169	2026-04-27	قيد رواتب    فسمم  العروض   - تلقائي	payroll_auto	\N	\N	\N	\N	t	2026-04-27 18:36:56.804294+03	2026-04-27 18:36:56.804294+03	\N	0.00	0.00	manual	0.00	2026-04-27	97	\N	102
170	2026-04-27	قيد رواتب    اداره  المشاريع   - تلقائي	payroll_auto	\N	\N	\N	\N	t	2026-04-27 18:36:56.804498+03	2026-04-27 18:36:56.804498+03	\N	0.00	0.00	manual	0.00	2026-04-27	97	\N	102
171	2026-04-27	قيد رواتب    اداره  المشتريات     - تلقائي	payroll_auto	\N	\N	\N	\N	t	2026-04-27 18:36:56.855452+03	2026-04-27 18:36:56.855452+03	\N	0.00	0.00	manual	0.00	2026-04-27	97	\N	103
172	2026-04-27	قيد رواتب    اداره  المخازن     - تلقائي	payroll_auto	\N	\N	\N	\N	t	2026-04-27 18:36:56.857157+03	2026-04-27 18:36:56.857157+03	\N	0.00	0.00	manual	0.00	2026-04-27	97	\N	103
173	2026-04-27	قيد رواتب الصيانه والمتابعه  - تلقائي	payroll_auto	\N	\N	\N	\N	t	2026-04-27 18:36:56.857434+03	2026-04-27 18:36:56.857434+03	\N	0.00	0.00	manual	0.00	2026-04-27	97	\N	103
174	2026-04-27	قيد رواتب الموس شمسيه  - تلقائي	payroll_auto	\N	\N	\N	\N	t	2026-04-27 18:36:56.858931+03	2026-04-27 18:36:56.858931+03	\N	0.00	0.00	manual	0.00	2026-04-27	97	\N	103
175	2026-04-27	قيد رواتب التحول الرقمي - تلقائي	payroll_auto	\N	\N	\N	\N	t	2026-04-27 18:36:56.865305+03	2026-04-27 18:36:56.865305+03	\N	0.00	0.00	manual	0.00	2026-04-27	97	\N	104
176	2026-04-27	قيد رواتب البنية التحتية والمدن الذكية - تلقائي	payroll_auto	\N	\N	\N	\N	t	2026-04-27 18:36:56.890542+03	2026-04-27 18:36:56.890542+03	\N	0.00	0.00	manual	0.00	2026-04-27	97	\N	105
177	2026-04-27	قيد رواتب الطاقة المتجددة وتخزين الطاقة - تلقائي	payroll_auto	\N	\N	\N	\N	t	2026-04-27 18:36:56.893209+03	2026-04-27 18:36:56.893209+03	\N	0.00	0.00	manual	0.00	2026-04-27	97	\N	105
178	2026-04-27	قيد رواتب    اداره  العقود    - تلقائي	payroll_auto	\N	\N	\N	\N	t	2026-04-27 18:36:56.90555+03	2026-04-27 18:36:56.90555+03	\N	0.00	0.00	manual	0.00	2026-04-27	97	\N	106
179	2026-04-27	قيد رواتب الاداره الماليه - تلقائي	payroll_auto	\N	\N	\N	\N	t	2026-04-27 18:44:33.475755+03	2026-04-27 18:44:33.475755+03	\N	0.00	0.00	manual	0.00	2026-04-27	97	\N	107
180	2026-04-27	قيد رواتب    اداره  المشتريات     - تلقائي	payroll_auto	\N	\N	\N	\N	t	2026-04-27 18:44:33.51205+03	2026-04-27 18:44:33.51205+03	\N	0.00	0.00	manual	0.00	2026-04-27	97	\N	108
181	2026-04-27	قيد رواتب    اداره  المخازن     - تلقائي	payroll_auto	\N	\N	\N	\N	t	2026-04-27 18:44:33.539315+03	2026-04-27 18:44:33.539315+03	\N	0.00	0.00	manual	0.00	2026-04-27	97	\N	109
182	2026-04-27	قيد رواتب الصيانه والمتابعه  - تلقائي	payroll_auto	\N	\N	\N	\N	t	2026-04-27 18:44:33.566051+03	2026-04-27 18:44:33.566051+03	\N	0.00	0.00	manual	0.00	2026-04-27	97	\N	110
183	2026-04-27	قيد رواتب الموس شمسيه  - تلقائي	payroll_auto	\N	\N	\N	\N	t	2026-04-27 18:44:33.584258+03	2026-04-27 18:44:33.584258+03	\N	0.00	0.00	manual	0.00	2026-04-27	97	\N	111
184	2026-04-27	قيد رواتب قسمم الطاقه الشميسه - تلقائي	payroll_auto	\N	\N	\N	\N	t	2026-04-27 18:44:33.585501+03	2026-04-27 18:44:33.585501+03	\N	0.00	0.00	manual	0.00	2026-04-27	97	\N	111
185	2026-04-27	قيد رواتب اداره  العملاء والمببعات - تلقائي	payroll_auto	\N	\N	\N	\N	t	2026-04-27 18:44:33.609844+03	2026-04-27 18:44:33.609844+03	\N	0.00	0.00	manual	0.00	2026-04-27	97	\N	112
186	2026-04-27	قيد رواتب    فسمم  العروض   - تلقائي	payroll_auto	\N	\N	\N	\N	t	2026-04-27 18:44:33.610837+03	2026-04-27 18:44:33.610837+03	\N	0.00	0.00	manual	0.00	2026-04-27	97	\N	112
188	2026-04-27	قيد رواتب التحول الرقمي - تلقائي	payroll_auto	\N	\N	\N	\N	t	2026-04-27 18:44:33.611372+03	2026-04-27 18:44:33.611372+03	\N	0.00	0.00	manual	0.00	2026-04-27	97	\N	112
187	2026-04-27	قيد رواتب    اداره  العقود    - تلقائي	payroll_auto	\N	\N	\N	\N	t	2026-04-27 18:44:33.61111+03	2026-04-27 18:44:33.61111+03	\N	0.00	0.00	manual	0.00	2026-04-27	97	\N	112
189	2026-04-27	قيد رواتب    اداره  المشاريع   - تلقائي	payroll_auto	\N	\N	\N	\N	t	2026-04-27 18:44:33.611583+03	2026-04-27 18:44:33.611583+03	\N	0.00	0.00	manual	0.00	2026-04-27	97	\N	112
190	2026-04-27	قيد رواتب البنية التحتية والمدن الذكية - تلقائي	payroll_auto	\N	\N	\N	\N	t	2026-04-27 18:44:33.645322+03	2026-04-27 18:44:33.645322+03	\N	0.00	0.00	manual	0.00	2026-04-27	97	\N	113
191	2026-04-27	قيد رواتب المباني والمنازل الذكية - تلقائي	payroll_auto	\N	\N	\N	\N	t	2026-04-27 18:44:33.648063+03	2026-04-27 18:44:33.648063+03	\N	0.00	0.00	manual	0.00	2026-04-27	97	\N	114
192	2026-04-27	قيد رواتب الطاقة المتجددة وتخزين الطاقة - تلقائي	payroll_auto	\N	\N	\N	\N	t	2026-04-27 18:44:33.648224+03	2026-04-27 18:44:33.648224+03	\N	0.00	0.00	manual	0.00	2026-04-27	97	\N	114
193	2026-04-27	قيد رواتب الاداره الماليه - تلقائي	payroll_auto	\N	\N	\N	\N	t	2026-04-27 18:45:36.858467+03	2026-04-27 18:45:36.858467+03	\N	0.00	0.00	manual	0.00	2026-04-27	97	\N	115
194	2026-04-27	قيد رواتب قسمم الطاقه الشميسه - تلقائي	payroll_auto	\N	\N	\N	\N	t	2026-04-27 18:45:36.858768+03	2026-04-27 18:45:36.858768+03	\N	0.00	0.00	manual	0.00	2026-04-27	97	\N	115
195	2026-04-27	قيد رواتب اداره  العملاء والمببعات - تلقائي	payroll_auto	\N	\N	\N	\N	t	2026-04-27 18:45:36.88693+03	2026-04-27 18:45:36.88693+03	\N	0.00	0.00	manual	0.00	2026-04-27	97	\N	116
196	2026-04-27	قيد رواتب    اداره  المشاريع   - تلقائي	payroll_auto	\N	\N	\N	\N	t	2026-04-27 18:45:36.889548+03	2026-04-27 18:45:36.889548+03	\N	0.00	0.00	manual	0.00	2026-04-27	97	\N	116
197	2026-04-27	قيد رواتب    فسمم  العروض   - تلقائي	payroll_auto	\N	\N	\N	\N	t	2026-04-27 18:45:36.889796+03	2026-04-27 18:45:36.889796+03	\N	0.00	0.00	manual	0.00	2026-04-27	97	\N	116
198	2026-04-27	قيد رواتب    اداره  المشتريات     - تلقائي	payroll_auto	\N	\N	\N	\N	t	2026-04-27 18:45:36.957733+03	2026-04-27 18:45:36.957733+03	\N	0.00	0.00	manual	0.00	2026-04-27	97	\N	117
199	2026-04-27	قيد رواتب    اداره  العقود    - تلقائي	payroll_auto	\N	\N	\N	\N	t	2026-04-27 18:45:36.957924+03	2026-04-27 18:45:36.957924+03	\N	0.00	0.00	manual	0.00	2026-04-27	97	\N	117
200	2026-04-27	قيد رواتب    اداره  المخازن     - تلقائي	payroll_auto	\N	\N	\N	\N	t	2026-04-27 18:45:36.959719+03	2026-04-27 18:45:36.959719+03	\N	0.00	0.00	manual	0.00	2026-04-27	97	\N	117
201	2026-04-27	قيد رواتب الصيانه والمتابعه  - تلقائي	payroll_auto	\N	\N	\N	\N	t	2026-04-27 18:45:37.01188+03	2026-04-27 18:45:37.01188+03	\N	0.00	0.00	manual	0.00	2026-04-27	97	\N	118
202	2026-04-27	قيد رواتب الموس شمسيه  - تلقائي	payroll_auto	\N	\N	\N	\N	t	2026-04-27 18:45:37.012376+03	2026-04-27 18:45:37.012376+03	\N	0.00	0.00	manual	0.00	2026-04-27	97	\N	118
203	2026-04-27	قيد رواتب التحول الرقمي - تلقائي	payroll_auto	\N	\N	\N	\N	t	2026-04-27 18:45:37.013314+03	2026-04-27 18:45:37.013314+03	\N	0.00	0.00	manual	0.00	2026-04-27	97	\N	118
204	2026-04-27	قيد رواتب البنية التحتية والمدن الذكية - تلقائي	payroll_auto	\N	\N	\N	\N	t	2026-04-27 18:45:37.013923+03	2026-04-27 18:45:37.013923+03	\N	0.00	0.00	manual	0.00	2026-04-27	97	\N	119
205	2026-04-27	قيد رواتب المباني والمنازل الذكية - تلقائي	payroll_auto	\N	\N	\N	\N	t	2026-04-27 18:45:37.014417+03	2026-04-27 18:45:37.014417+03	\N	0.00	0.00	manual	0.00	2026-04-27	97	\N	119
206	2026-04-27	قيد رواتب الطاقة المتجددة وتخزين الطاقة - تلقائي	payroll_auto	\N	\N	\N	\N	t	2026-04-27 18:45:37.015912+03	2026-04-27 18:45:37.015912+03	\N	0.00	0.00	manual	0.00	2026-04-27	97	\N	120
207	2026-04-27	قيد رواتب الأتمتة الصناعية والتحكم - أبريل 2026	payroll_auto	\N	\N	\N	\N	t	2026-04-27 20:42:28.37481+03	2026-04-27 20:42:28.37481+03	\N	0.00	0.00	manual	0.00	2026-04-27	97	\N	121
208	2026-04-27	قيد رواتب الطاقة المتجددة وتخزين الطاقة - أبريل 2026	payroll_auto	\N	\N	\N	\N	t	2026-04-27 21:48:37.810544+03	2026-04-27 21:48:37.810544+03	\N	0.00	0.00	manual	0.00	2026-04-27	97	\N	122
209	2026-04-27	قيد رواتب التحول الرقمي - أبريل 2026	payroll_auto	\N	\N	\N	\N	t	2026-04-27 21:49:15.744259+03	2026-04-27 21:49:15.744259+03	\N	0.00	0.00	manual	0.00	2026-04-27	97	\N	123
210	2026-04-28	قيد رواتب البنية التحتية والمدن الذكية - أبريل 2026	payroll_auto	\N	\N	\N	\N	t	2026-04-28 09:13:44.344344+03	2026-04-28 09:13:44.344344+03	\N	0.00	0.00	manual	0.00	2026-04-28	97	\N	124
211	2026-04-28	قيد رواتب التنفيذ والتشغيل والصيانة - أبريل 2026	payroll_auto	\N	\N	\N	\N	t	2026-04-28 09:22:15.629829+03	2026-04-28 09:22:15.629829+03	\N	0.00	0.00	manual	0.00	2026-04-28	97	\N	125
212	2026-04-28	قيد رواتب المباني والمنازل الذكية - أبريل 2026	payroll_auto	\N	\N	\N	\N	t	2026-04-28 10:06:29.520113+03	2026-04-28 10:06:29.520113+03	\N	0.00	0.00	manual	0.00	2026-04-28	97	\N	126
213	2026-04-28	قيد رواتب التحول الرقمي - أبريل 2026	payroll_auto	\N	\N	\N	\N	t	2026-04-28 20:04:58.63625+03	2026-04-28 20:04:58.63625+03	\N	0.00	0.00	manual	0.00	2026-04-28	97	\N	127
217	2026-05-04	Sales Invoice #SI-2026-0029	sales_invoice	29	\N	\N	\N	t	2026-05-04 10:51:54.896415+03	2026-05-04 10:51:54.896415+03	\N	0.00	0.00	auto	0.00	2026-05-04	84	\N	83
218	2026-05-04	سند قبض RV-2026-0013 - محمد جمال  	receipt_voucher	13	\N	\N	\N	t	2026-05-04 10:53:53.230817+03	2026-05-04 10:53:53.230817+03	\N	0.00	0.00	manual	0.00	2026-05-04	84	\N	130
219	2026-05-06	قيد رواتب الطاقة المتجددة وتخزين الطاقة - مايو 2026	payroll_auto	\N	\N	\N	\N	t	2026-05-06 15:15:31.507193+03	2026-05-06 15:15:31.507193+03	\N	0.00	0.00	manual	0.00	2026-05-06	120	\N	131
220	2026-05-06	قيد رواتب التحول الرقمي - مايو 2026	payroll_auto	\N	\N	\N	\N	t	2026-05-06 15:15:31.507466+03	2026-05-06 15:15:31.507466+03	\N	0.00	0.00	manual	0.00	2026-05-06	120	\N	131
221	2026-05-06	قيد رواتب المباني والمنازل الذكية - مايو 2026	payroll_auto	\N	\N	\N	\N	t	2026-05-06 15:15:31.507686+03	2026-05-06 15:15:31.507686+03	\N	0.00	0.00	manual	0.00	2026-05-06	120	\N	131
222	2026-05-07	Sales Invoice #SI-2026-0030	sales_invoice	30	\N	\N	\N	t	2026-05-07 14:24:05.324661+03	2026-05-07 14:24:05.324661+03	\N	0.00	0.00	auto	0.00	2026-05-07	84	\N	84
223	2026-05-07	Sales Invoice #SI-2026-0031	sales_invoice	31	\N	\N	\N	t	2026-05-07 14:56:12.163201+03	2026-05-07 14:56:12.163201+03	\N	0.00	0.00	auto	0.00	2026-05-07	84	\N	85
224	2026-05-07	سند قبض RV-2026-0013 - محمد جمال 	receipt_voucher	14	\N	\N	\N	t	2026-05-07 14:57:13.430319+03	2026-05-07 14:57:13.430319+03	\N	0.00	0.00	manual	0.00	2026-05-07	84	\N	132
225	2026-05-07	Sales Invoice #SI-2026-0032	sales_invoice	32	\N	\N	\N	t	2026-05-07 14:58:55.902355+03	2026-05-07 14:58:55.902355+03	\N	0.00	0.00	auto	0.00	2026-05-07	84	\N	86
226	2026-05-09	سند قبض RV-2026-0014 - موسي 	receipt_voucher	15	\N	\N	\N	t	2026-05-07 14:59:59.34829+03	2026-05-07 14:59:59.34829+03	\N	0.00	0.00	manual	0.00	2026-05-07	84	\N	133
227	2026-05-07	Sales Invoice #SI-2026-0033	sales_invoice	33	\N	\N	\N	t	2026-05-07 15:44:27.003486+03	2026-05-07 15:44:27.003486+03	\N	0.00	0.00	auto	0.00	2026-05-07	84	\N	87
228	2026-05-07	COGS for Sales Invoice #SI-2026-0033	sales_invoice_cogs	33	15	\N	\N	t	2026-05-07 15:45:03.901251+03	2026-05-07 15:45:03.901251+03	\N	0.00	0.00	auto	0.00	2026-05-07	84	\N	88
229	2026-05-07	Purchase Invoice PINV-2026-0019 - PO PO-0031 - مشروع محمد جمال	purchase_invoice	54	15	\N	84	t	2026-05-07 15:56:25.932359+03	2026-05-07 15:56:25.932359+03	\N	0.00	0.00	auto	0.00	2026-05-07	\N	\N	89
230	2026-05-07	Sales Invoice #SI-2026-0034	sales_invoice	34	\N	\N	\N	t	2026-05-07 17:03:43.966463+03	2026-05-07 17:03:43.966463+03	\N	0.00	0.00	auto	0.00	2026-05-07	84	\N	90
231	2026-05-07	COGS for Sales Invoice #SI-2026-0034	sales_invoice_cogs	34	16	\N	\N	t	2026-05-07 17:04:55.555084+03	2026-05-07 17:04:55.555084+03	\N	0.00	0.00	auto	0.00	2026-05-07	84	\N	91
\.


--
-- Data for Name: journal_entry_lines; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.journal_entry_lines (id, journal_entry_id, account_id, description, debit_amount, credit_amount, created_at) FROM stdin;
1	1	13	إثبات مديونية - فاتورة INV-20260406-0001	11500.00	0.00	2026-04-06 21:24:22.928214+02
2	1	25	إيراد مشروع - فاتورة INV-20260406-0001	0.00	10000.00	2026-04-06 21:24:22.928214+02
4	2	13	إثبات مديونية - فاتورة INV-20260406-0001	11500.00	0.00	2026-04-06 21:46:49.238908+02
5	2	25	إيراد مشروع - فاتورة INV-20260406-0001	0.00	10000.00	2026-04-06 21:46:49.238908+02
7	3	13	إثبات مديونية - فاتورة INV-20260406-0002	11500.00	0.00	2026-04-06 22:03:49.526775+02
8	3	25	إيراد مشروع - فاتورة INV-20260406-0002	0.00	10000.00	2026-04-06 22:03:49.526775+02
16	6	13	إثبات مديونية - فاتورة INV-20260406-0003	11500.00	0.00	2026-04-06 22:15:46.933126+02
17	6	25	إيراد مشروع - فاتورة INV-20260406-0003	0.00	10000.00	2026-04-06 22:15:46.933126+02
19	7	13	إثبات مديونية - فاتورة INV-20260407-0001	11500.00	0.00	2026-04-07 06:28:44.142774+02
20	7	25	إيراد مشروع - فاتورة INV-20260407-0001	0.00	10000.00	2026-04-07 06:28:44.142774+02
22	8	13	إثبات مديونية - فاتورة INV-20260407-0002	11500.00	0.00	2026-04-07 06:35:37.928801+02
23	8	25	إيراد مشروع - فاتورة INV-20260407-0002	0.00	10000.00	2026-04-07 06:35:37.928801+02
25	9	13	إثبات مديونية - فاتورة INV-20260407-0003	11500.00	0.00	2026-04-07 06:37:51.630356+02
26	9	25	إيراد مشروع - فاتورة INV-20260407-0003	0.00	10000.00	2026-04-07 06:37:51.630356+02
28	10	58	شراء أصل ثابت: Toyota Hilux (FA-0001)	150000.00	0.00	2026-04-07 07:26:41.697907+02
30	11	74	مصاريف إهلاك - Toyota Hilux (FA-0001)	2250.00	0.00	2026-04-07 07:30:27.782735+02
31	11	66	مجمع إهلاك - Toyota Hilux (FA-0001)	0.00	2250.00	2026-04-07 07:30:27.782735+02
32	12	80	استلام مخزون: Solar Panel 400W (20 pcs)	17000.00	0.00	2026-04-07 09:15:56.556523+02
33	12	85	مقابل استلام بضاعة - PO-0001	0.00	17000.00	2026-04-07 09:15:56.556523+02
34	13	88	تكلفة مشتريات - PINV-0001	17000.00	0.00	2026-04-07 09:27:16.821424+02
36	13	85	فاتورة مورد مستحقة - PINV-0001	0.00	19550.00	2026-04-07 09:27:16.821424+02
37	14	85	سداد دفعة لمورد - PINV-0001	17000.00	0.00	2026-04-07 09:29:38.687854+02
39	15	88	تكلفة مشتريات - PINV-0002	17000.00	0.00	2026-04-07 17:11:47.331649+02
41	15	85	فاتورة مورد مستحقة - PINV-0002	0.00	19550.00	2026-04-07 17:11:47.331649+02
48	18	88	تكلفة مشتريات - PINV-0003	17000.00	0.00	2026-04-07 17:29:10.173767+02
50	18	85	فاتورة مورد مستحقة - PINV-0003	0.00	19550.00	2026-04-07 17:29:10.173767+02
51	19	88	تكلفة مشتريات - PINV-0004	17000.00	0.00	2026-04-07 17:40:40.360689+02
53	19	85	فاتورة مورد مستحقة - PINV-0004	0.00	19550.00	2026-04-07 17:40:40.360689+02
54	20	88	تكلفة مشتريات - PINV-0005	17000.00	0.00	2026-04-07 17:41:32.311287+02
55	20	85	فاتورة مورد مستحقة - PINV-0005	0.00	17000.00	2026-04-07 17:41:32.311287+02
56	21	13	إثبات مديونية - فاتورة INV-20260407-0004	11500.00	0.00	2026-04-07 17:42:27.287102+02
57	21	25	إيراد مشروع - فاتورة INV-20260407-0004	0.00	10000.00	2026-04-07 17:42:27.287102+02
59	22	13	إثبات مديونية - فاتورة INV-20260407-0005	11500.00	0.00	2026-04-07 17:43:59.85576+02
60	22	25	إيراد مشروع - فاتورة INV-20260407-0005	0.00	10000.00	2026-04-07 17:43:59.85576+02
62	23	78	Inventory - PO PO-0009	398.80	0.00	2026-04-20 07:52:04.216724+02
64	23	84	Accounts Payable - Saudi Solar Solutions	0.00	458.62	2026-04-20 07:52:04.216724+02
65	24	78	Inventory - PO PO-0010	200.00	0.00	2026-04-20 12:56:40.980932+02
67	24	84	Accounts Payable - Saudi Solar Solutions	0.00	230.00	2026-04-20 12:56:40.980932+02
68	25	78	Inventory - PO PO-0011	84.60	0.00	2026-04-20 13:27:06.900779+02
70	25	84	Accounts Payable - Saudi Solar Solutions	0.00	97.29	2026-04-20 13:27:06.900779+02
71	34	78	Inventory - PO PO-0017	20.00	0.00	2026-04-20 15:23:21.094493+02
73	34	84	Accounts Payable - Mosa Elwayly	0.00	20.00	2026-04-20 15:23:21.094493+02
74	35	78	Inventory - PO PO-0018	50.00	0.00	2026-04-20 19:13:17.034035+02
38	14	111	[MIGRATED] سداد فاتورة PINV-0001	0.00	17000.00	2026-04-07 09:29:38.687854+02
3	1	20	[MIGRATED] ضريبة قيمة مضافة - فاتورة INV-20260406-0001	0.00	1500.00	2026-04-06 21:24:22.928214+02
6	2	20	[MIGRATED] ضريبة قيمة مضافة - فاتورة INV-20260406-0001	0.00	1500.00	2026-04-06 21:46:49.238908+02
9	3	20	[MIGRATED] ضريبة قيمة مضافة - فاتورة INV-20260406-0002	0.00	1500.00	2026-04-06 22:03:49.526775+02
18	6	20	[MIGRATED] ضريبة قيمة مضافة - فاتورة INV-20260406-0003	0.00	1500.00	2026-04-06 22:15:46.933126+02
21	7	20	[MIGRATED] ضريبة قيمة مضافة - فاتورة INV-20260407-0001	0.00	1500.00	2026-04-07 06:28:44.142774+02
24	8	20	[MIGRATED] ضريبة قيمة مضافة - فاتورة INV-20260407-0002	0.00	1500.00	2026-04-07 06:35:37.928801+02
27	9	20	[MIGRATED] ضريبة قيمة مضافة - فاتورة INV-20260407-0003	0.00	1500.00	2026-04-07 06:37:51.630356+02
35	13	21	[MIGRATED] ضريبة مدخلات - PINV-0001	2550.00	0.00	2026-04-07 09:27:16.821424+02
40	15	21	[MIGRATED] ضريبة مدخلات - PINV-0002	2550.00	0.00	2026-04-07 17:11:47.331649+02
76	35	84	Accounts Payable - Mosa Elwayly	0.00	50.00	2026-04-20 19:13:17.034035+02
77	36	78	Inventory - PO PO-0019	30.00	0.00	2026-04-20 19:16:57.178734+02
79	36	84	Accounts Payable - Mosa Elwayly	0.00	34.50	2026-04-20 19:16:57.178734+02
80	39	84	Accounts Payable - Payment PV-2026-0001	20.00	0.00	2026-04-20 20:19:32.541689+02
81	39	55	Cash - Payment PV-2026-0001	0.00	20.00	2026-04-20 20:19:32.541689+02
82	40	84	Accounts Payable - Payment PV-2026-0002	20.00	0.00	2026-04-20 20:21:08.602819+02
83	40	55	Cash - Payment PV-2026-0002	0.00	20.00	2026-04-20 20:21:08.602819+02
84	41	15	Accounts Payable - Payment PV-2026-0003	20.00	0.00	2026-04-21 07:04:16.863206+02
85	41	79	Cash - Payment PV-2026-0003	0.00	20.00	2026-04-21 07:04:16.863206+02
88	43	10	Administrative Expenses - اا	10.00	0.00	2026-04-21 08:35:39.422467+02
89	43	79	Cash on Hand - اا	0.00	10.00	2026-04-21 08:35:39.422467+02
90	44	118	Office Rent - تم صرف ايجار مكتب	2000.00	0.00	2026-04-21 09:24:01.135777+02
91	44	79	Cash on Hand - تم صرف ايجار مكتب	0.00	2000.00	2026-04-21 09:24:01.135777+02
92	45	10	Administrative Expenses - تم دفع مصاؤيف اداريه 	3000.00	0.00	2026-04-21 09:28:09.13979+02
93	45	110	Bank Accounts - تم دفع مصاؤيف اداريه 	0.00	3000.00	2026-04-21 09:28:09.13979+02
94	46	122	Accounts Receivable - SI-2026-0001	115.00	0.00	2026-04-21 17:27:50.299397+02
95	46	11	Sales Revenue - SI-2026-0001	0.00	100.00	2026-04-21 17:27:50.299397+02
97	47	122	Accounts Receivable - SI-2026-0002	115.00	0.00	2026-04-22 09:38:54.737486+02
98	47	19	Sales Revenue - SI-2026-0002	0.00	100.00	2026-04-22 09:38:54.737486+02
100	48	122	Accounts Receivable - SI-2026-0003	34.50	0.00	2026-04-22 09:42:01.701892+02
101	48	25	Sales Revenue - SI-2026-0003	0.00	30.00	2026-04-22 09:42:01.701892+02
103	49	122	Accounts Receivable - SI-2026-0004	57.50	0.00	2026-04-22 09:47:07.175486+02
104	49	25	Sales Revenue - SI-2026-0004	0.00	50.00	2026-04-22 09:47:07.175486+02
106	50	122	Accounts Receivable - SI-2026-0005	57.50	0.00	2026-04-22 09:48:54.607425+02
107	50	19	Sales Revenue - SI-2026-0005	0.00	50.00	2026-04-22 09:48:54.607425+02
109	51	122	Accounts Receivable - SI-2026-0006	22.95	0.00	2026-04-22 09:49:49.005697+02
110	51	19	Sales Revenue - SI-2026-0006	0.00	19.96	2026-04-22 09:49:49.005697+02
112	52	122	Accounts Receivable - SI-2026-0007	22.92	0.00	2026-04-22 09:59:54.33339+02
113	52	19	Sales Revenue - SI-2026-0007	0.00	19.93	2026-04-22 09:59:54.33339+02
115	53	122	Accounts Receivable - SI-2026-0008	11.45	0.00	2026-04-22 10:04:19.455805+02
116	53	19	Sales Revenue - SI-2026-0008	0.00	9.96	2026-04-22 10:04:19.455805+02
118	54	122	Accounts Receivable - SI-2026-0009	11.45	0.00	2026-04-22 10:07:53.169584+02
119	54	25	Sales Revenue - SI-2026-0009	0.00	9.96	2026-04-22 10:07:53.169584+02
121	55	122	Accounts Receivable - SI-2026-0010	23.00	0.00	2026-04-22 10:12:48.941266+02
122	55	19	Sales Revenue - SI-2026-0010	0.00	20.00	2026-04-22 10:12:48.941266+02
124	56	122	Accounts Receivable - SI-2026-0011	17.25	0.00	2026-04-22 10:14:28.204933+02
125	56	11	Sales Revenue - SI-2026-0011	0.00	15.00	2026-04-22 10:14:28.204933+02
127	57	122	Accounts Receivable - SI-2026-0012	11.50	0.00	2026-04-22 10:17:59.181967+02
128	57	19	Sales Revenue - SI-2026-0012	0.00	10.00	2026-04-22 10:17:59.181967+02
130	58	122	Sales Invoice #SI-2026-0013	50.00	0.00	2026-04-22 10:24:31.056283+02
131	58	11	Sales Invoice #SI-2026-0013	0.00	50.00	2026-04-22 10:24:31.056283+02
132	59	122	Sales Invoice #SI-2026-0014	115.00	0.00	2026-04-22 10:26:35.99332+02
133	59	25	Sales Invoice #SI-2026-0014	0.00	100.00	2026-04-22 10:26:35.99332+02
135	60	15	Accounts Payable - Payment PV-2026-0004	10.00	0.00	2026-04-22 11:09:59.090473+02
136	60	79	Cash - Payment PV-2026-0004	0.00	10.00	2026-04-22 11:09:59.090473+02
137	61	79	Inventory - PO PO-0008	40.00	0.00	2026-04-22 11:17:37.659921+02
139	61	15	Accounts Payable - Saudi Solar Solutions	0.00	46.00	2026-04-22 11:17:37.659921+02
140	62	88	تكلفة مشتريات - PINV-0005	9.99	0.00	2026-04-22 14:10:25.337502+02
141	62	85	فاتورة مورد مستحقة - PINV-0005	0.00	9.99	2026-04-22 14:10:25.337502+02
142	63	88	تكلفة مشتريات - PINV-0006	40.00	0.00	2026-04-22 14:15:11.661596+02
143	63	85	فاتورة مورد مستحقة - PINV-0006	0.00	40.00	2026-04-22 14:15:11.661596+02
144	64	88	تكلفة مشتريات - PINV-0007	40.00	0.00	2026-04-22 14:22:10.25909+02
145	64	85	فاتورة مورد مستحقة - PINV-0007	0.00	40.00	2026-04-22 14:22:10.25909+02
146	65	88	تكلفة مشتريات - PINV-0008	1.00	0.00	2026-04-22 14:24:15.312347+02
147	65	85	فاتورة مورد مستحقة - PINV-0008	0.00	1.00	2026-04-22 14:24:15.312347+02
148	66	79	Inventory - PO PO-0005	850.00	0.00	2026-04-22 14:27:50.688995+02
150	66	15	Accounts Payable - Saudi Solar Solutions	0.00	850.00	2026-04-22 14:27:50.688995+02
151	67	88	تكلفة مشتريات - PINV-2026-0006	17000.00	0.00	2026-04-22 14:51:39.197754+02
153	67	85	فاتورة مورد مستحقة - PINV-2026-0006	0.00	19550.00	2026-04-22 14:51:39.197754+02
154	68	88	تكلفة مشتريات - PINV-2026-0007	850.00	0.00	2026-04-22 15:02:32.617815+02
156	68	85	فاتورة مورد مستحقة - PINV-2026-0007	0.00	850.00	2026-04-22 15:02:32.617815+02
157	69	81	تأسيس صندوق عهد - عبد الرحمن عهده مشروع موسي 	2000.00	0.00	2026-04-22 17:02:37.565858+02
158	69	126	تحويل من البنك لصندوق العهد - عبد الرحمن عهده مشروع موسي 	0.00	2000.00	2026-04-22 17:02:37.565858+02
159	70	81	إضافة أموال لصندوق عبد الرحمن عهده مشروع موسي 	3000.00	0.00	2026-04-22 17:02:52.178178+02
96	46	20	VAT Output - SI-2026-0001	0.00	15.00	2026-04-21 17:27:50.299397+02
99	47	20	VAT Output - SI-2026-0002	0.00	15.00	2026-04-22 09:38:54.737486+02
102	48	20	VAT Output - SI-2026-0003	0.00	4.50	2026-04-22 09:42:01.701892+02
160	70	126	تحويل بنكي لصندوق عبد الرحمن عهده مشروع موسي 	0.00	3000.00	2026-04-22 17:02:52.178178+02
161	71	81	تأسيس صندوق عهد - تت	30.00	0.00	2026-04-22 17:07:31.187408+02
162	71	126	تحويل من البنك لصندوق العهد - تت	0.00	30.00	2026-04-22 17:07:31.187408+02
163	72	93	مصروف - ى	1000.00	0.00	2026-04-22 17:30:16.034769+02
164	72	81	صرف من صندوق عبد الرحمن عهده مشروع موسي 	0.00	1000.00	2026-04-22 17:30:16.034769+02
165	73	103	مصروف - كك	100.00	0.00	2026-04-22 17:31:10.588437+02
166	73	81	صرف من صندوق عبد الرحمن عهده مشروع موسي 	0.00	100.00	2026-04-22 17:31:10.588437+02
167	74	93	مصروف - 1000 بدل موسي	1000.00	0.00	2026-04-22 17:33:35.210725+02
168	74	81	صرف من صندوق عبد الرحمن عهده مشروع موسي 	0.00	1000.00	2026-04-22 17:33:35.210725+02
169	75	74	Depr - Vehicles - و	20.00	0.00	2026-04-22 17:57:44.735048+02
170	75	79	Cash on Hand - و	0.00	20.00	2026-04-22 17:57:44.735048+02
171	76	74	Depr - Vehicles - ز	1000.00	0.00	2026-04-22 17:58:51.777424+02
172	76	79	Cash on Hand - ز	0.00	1000.00	2026-04-22 17:58:51.777424+02
173	77	15	Accounts Payable - Payment PV-2026-0005	20.00	0.00	2026-04-23 10:06:09.483045+02
174	77	79	Cash - Payment PV-2026-0005	0.00	20.00	2026-04-23 10:06:09.483045+02
175	78	15	Accounts Payable - Payment PV-2026-0006	1.00	0.00	2026-04-23 10:07:06.811651+02
176	78	79	Cash - Payment PV-2026-0006	0.00	1.00	2026-04-23 10:07:06.811651+02
177	79	122	Sales Invoice #SI-2026-0015	10.00	0.00	2026-04-23 10:08:12.916778+02
178	79	19	Sales Invoice #SI-2026-0015	0.00	10.00	2026-04-23 10:08:12.916778+02
179	80	93	مصروف - للعمال	50.00	0.00	2026-04-23 10:09:49.999636+02
180	80	81	صرف من صندوق ااا	0.00	50.00	2026-04-23 10:09:49.999636+02
181	81	79	قبض من موسي  - RV-2026-0002	309.00	0.00	2026-04-23 12:25:15.743244+02
182	81	122	تحصيل من العميل موسي 	0.00	309.00	2026-04-23 12:25:15.743244+02
183	82	79	قبض من موسي  - RV-2026-0008	10.00	0.00	2026-04-23 14:00:15.156575+02
184	82	122	تحصيل من العميل موسي 	0.00	10.00	2026-04-23 14:00:15.156575+02
185	83	122	Sales Invoice #SI-2026-0016	10.00	0.00	2026-04-23 14:21:49.47341+02
186	83	11	Sales Invoice #SI-2026-0016	0.00	10.00	2026-04-23 14:21:49.47341+02
187	84	122	Sales Invoice #SI-2026-0017	500.00	0.00	2026-04-23 15:12:49.67848+02
188	84	19	Sales Invoice #SI-2026-0017	0.00	500.00	2026-04-23 15:12:49.67848+02
189	85	110	قبض من موسي  - RV-2026-0009	500.00	0.00	2026-04-23 17:05:33.64193+02
190	85	122	تحصيل من العميل موسي 	0.00	500.00	2026-04-23 17:05:33.64193+02
191	86	120	مصروف - 0	900.00	0.00	2026-04-23 17:07:17.92544+02
192	86	81	صرف من صندوق عبد الرحمن عهده مشروع موسي 	0.00	900.00	2026-04-23 17:07:17.92544+02
193	87	15	Accounts Payable - Payment PV-2026-0007	800.00	0.00	2026-04-23 17:18:42.402152+02
194	87	110	Bank - Payment PV-2026-0007	0.00	800.00	2026-04-23 17:18:42.402152+02
195	88	15	Accounts Payable - Payment PV-2026-0008	850.00	0.00	2026-04-23 17:20:15.541037+02
196	88	110	Bank - Payment PV-2026-0008	0.00	850.00	2026-04-23 17:20:15.541037+02
197	89	122	Sales Invoice #SI-2026-0018	29.98	0.00	2026-04-24 15:50:26.136082+03
198	89	19	Sales Invoice #SI-2026-0018	0.00	29.98	2026-04-24 15:50:26.136082+03
199	90	74	مصاريف إهلاك - Toyota Hilux (FA-0001)	2250.00	0.00	2026-04-24 16:38:41.753024+03
200	90	66	مجمع إهلاك - Toyota Hilux (FA-0001)	0.00	2250.00	2026-04-24 16:38:41.753024+03
201	91	74	مصاريف إهلاك - Toyota Hilux (FA-0001)	2250.00	0.00	2026-04-24 16:38:53.271824+03
202	91	66	مجمع إهلاك - Toyota Hilux (FA-0001)	0.00	2250.00	2026-04-24 16:38:53.271824+03
203	92	58	شراء أصل ثابت: G-clas (FA-0002)	1000.00	0.00	2026-04-24 17:02:30.883766+03
205	93	58	شراء أصل ثابت: G-clas (FA-0003)	20.00	0.00	2026-04-24 17:25:08.459971+03
207	94	74	مصاريف إهلاك - Toyota Hilux (FA-0001)	2250.00	0.00	2026-04-24 17:25:50.502902+03
208	94	66	مجمع إهلاك - Toyota Hilux (FA-0001)	0.00	2250.00	2026-04-24 17:25:50.502902+03
209	95	74	مصاريف إهلاك - G-clas (FA-0002)	25.00	0.00	2026-04-24 17:25:50.502902+03
210	95	66	مجمع إهلاك - G-clas (FA-0002)	0.00	25.00	2026-04-24 17:25:50.502902+03
211	96	74	مصاريف إهلاك - G-clas (FA-0003)	0.67	0.00	2026-04-24 17:25:50.502902+03
212	96	66	مجمع إهلاك - G-clas (FA-0003)	0.00	0.67	2026-04-24 17:25:50.502902+03
213	97	74	مصاريف إهلاك - Toyota Hilux (FA-0001)	2250.00	0.00	2026-04-24 17:32:16.721435+03
214	97	66	مجمع إهلاك - Toyota Hilux (FA-0001)	0.00	2250.00	2026-04-24 17:32:16.721435+03
215	98	74	مصاريف إهلاك - G-clas (FA-0002)	25.00	0.00	2026-04-24 17:32:16.721435+03
216	98	66	مجمع إهلاك - G-clas (FA-0002)	0.00	25.00	2026-04-24 17:32:16.721435+03
217	99	74	مصاريف إهلاك - G-clas (FA-0003)	0.64	0.00	2026-04-24 17:32:16.721435+03
218	99	66	مجمع إهلاك - G-clas (FA-0003)	0.00	0.64	2026-04-24 17:32:16.721435+03
219	100	58	شراء أصل ثابت: G-clas33 (FA-0004)	5000.00	0.00	2026-04-24 17:45:59.232417+03
221	101	74	مصاريف إهلاك - Toyota Hilux (FA-0001)	2250.00	0.00	2026-04-24 17:46:46.540688+03
222	101	66	مجمع إهلاك - Toyota Hilux (FA-0001)	0.00	2250.00	2026-04-24 17:46:46.540688+03
223	102	74	مصاريف إهلاك - G-clas (FA-0002)	25.00	0.00	2026-04-24 17:46:46.540688+03
224	102	66	مجمع إهلاك - G-clas (FA-0002)	0.00	25.00	2026-04-24 17:46:46.540688+03
225	103	74	مصاريف إهلاك - G-clas (FA-0003)	0.62	0.00	2026-04-24 17:46:46.540688+03
226	103	66	مجمع إهلاك - G-clas (FA-0003)	0.00	0.62	2026-04-24 17:46:46.540688+03
227	104	74	مصاريف إهلاك - G-clas33 (FA-0004)	166.67	0.00	2026-04-24 17:46:46.540688+03
228	104	66	مجمع إهلاك - G-clas33 (FA-0004)	0.00	166.67	2026-04-24 17:46:46.540688+03
229	105	74	مصاريف إهلاك - Toyota Hilux (FA-0001)	2250.00	0.00	2026-04-24 17:47:53.097502+03
230	105	66	مجمع إهلاك - Toyota Hilux (FA-0001)	0.00	2250.00	2026-04-24 17:47:53.097502+03
231	106	74	مصاريف إهلاك - G-clas (FA-0002)	25.00	0.00	2026-04-24 17:47:53.097502+03
232	106	66	مجمع إهلاك - G-clas (FA-0002)	0.00	25.00	2026-04-24 17:47:53.097502+03
233	107	74	مصاريف إهلاك - G-clas (FA-0003)	0.60	0.00	2026-04-24 17:47:53.097502+03
234	107	66	مجمع إهلاك - G-clas (FA-0003)	0.00	0.60	2026-04-24 17:47:53.097502+03
235	108	74	مصاريف إهلاك - G-clas33 (FA-0004)	161.11	0.00	2026-04-24 17:47:53.097502+03
236	108	66	مجمع إهلاك - G-clas33 (FA-0004)	0.00	161.11	2026-04-24 17:47:53.097502+03
237	109	74	مصاريف إهلاك - Toyota Hilux (FA-0001)	2250.00	0.00	2026-04-24 17:48:24.556996+03
238	109	66	مجمع إهلاك - Toyota Hilux (FA-0001)	0.00	2250.00	2026-04-24 17:48:24.556996+03
239	110	74	مصاريف إهلاك - G-clas (FA-0002)	25.00	0.00	2026-04-24 17:48:24.556996+03
240	110	66	مجمع إهلاك - G-clas (FA-0002)	0.00	25.00	2026-04-24 17:48:24.556996+03
206	93	111	[MIGRATED] سداد ثمن أصل ثابت: G-clas (FA-0003)	0.00	20.00	2026-04-24 17:25:08.459971+03
220	100	111	[MIGRATED] سداد ثمن أصل ثابت: G-clas33 (FA-0004)	0.00	5000.00	2026-04-24 17:45:59.232417+03
241	111	74	مصاريف إهلاك - G-clas (FA-0003)	0.58	0.00	2026-04-24 17:48:24.556996+03
242	111	66	مجمع إهلاك - G-clas (FA-0003)	0.00	0.58	2026-04-24 17:48:24.556996+03
243	112	74	مصاريف إهلاك - G-clas33 (FA-0004)	155.74	0.00	2026-04-24 17:48:24.556996+03
244	112	66	مجمع إهلاك - G-clas33 (FA-0004)	0.00	155.74	2026-04-24 17:48:24.556996+03
245	113	58	شراء أصل ثابت: G-clas3300 (FA-0005)	8000.00	0.00	2026-04-24 17:59:15.967038+03
247	114	122	Sales Invoice #SI-2026-0019	112.70	0.00	2026-04-24 18:12:16.885453+03
248	114	130	Sales Invoice #SI-2026-0019 - Discount	2.00	0.00	2026-04-24 18:12:16.885453+03
249	114	11	Sales Invoice #SI-2026-0019	0.00	100.00	2026-04-24 18:12:16.885453+03
251	115	129	مرتجع مبيعات - CN-2026-00001	100.00	0.00	2026-04-24 19:19:19.73694+03
252	115	130	خصم مرتجع - CN-2026-00001	2.00	0.00	2026-04-24 19:19:19.73694+03
254	115	13	عميل - مرتجع CN-2026-00001	0.00	112.70	2026-04-24 19:19:19.73694+03
255	116	122	Sales Invoice #SI-2026-0020	14985.00	0.00	2026-04-24 19:20:54.060157+03
256	116	130	Sales Invoice #SI-2026-0020 - Discount	15.00	0.00	2026-04-24 19:20:54.060157+03
257	116	11	Sales Invoice #SI-2026-0020	0.00	15000.00	2026-04-24 19:20:54.060157+03
258	117	129	مرتجع مبيعات - CN-2026-00001	9000.00	0.00	2026-04-24 19:25:40.543877+03
259	117	130	خصم مرتجع - CN-2026-00001	1.00	0.00	2026-04-24 19:25:40.543877+03
261	117	13	عميل - مرتجع CN-2026-00001	0.00	10348.85	2026-04-24 19:25:40.543877+03
262	118	129	مرتجع مبيعات - CN-2026-00002	100.00	0.00	2026-04-24 19:28:09.274102+03
263	118	130	خصم مرتجع - CN-2026-00002	2.00	0.00	2026-04-24 19:28:09.274102+03
265	118	13	عميل - مرتجع CN-2026-00002	0.00	112.70	2026-04-24 19:28:09.274102+03
266	119	129	مرتجع مبيعات - CN-2026-00003	10.79	0.00	2026-04-24 19:30:33.258006+03
268	119	13	عميل - مرتجع CN-2026-00003	0.00	12.41	2026-04-24 19:30:33.258006+03
269	120	129	مرتجع مبيعات - CN-2026-00004	9.89	0.00	2026-04-24 19:40:07.036875+03
271	120	13	عميل - مرتجع CN-2026-00004	0.00	11.37	2026-04-24 19:40:07.036875+03
272	121	129	مرتجع مبيعات - CN-2026-00005	100.00	0.00	2026-04-25 09:57:04.287679+03
274	121	13	عميل - مرتجع CN-2026-00005	0.00	115.00	2026-04-25 09:57:04.287679+03
275	122	122	Sales Invoice #SI-2026-0021	103.50	0.00	2026-04-25 16:08:06.448404+03
276	122	130	Sales Invoice #SI-2026-0021 - Discount	10.00	0.00	2026-04-25 16:08:06.448404+03
277	122	128	Sales Invoice #SI-2026-0021	0.00	100.00	2026-04-25 16:08:06.448404+03
279	123	122	Sales Invoice #SI-2026-0022	9.20	0.00	2026-04-26 10:57:25.930419+03
280	123	130	Sales Invoice #SI-2026-0022 - Discount	2.00	0.00	2026-04-26 10:57:25.930419+03
281	123	11	Sales Invoice #SI-2026-0022	0.00	10.00	2026-04-26 10:57:25.930419+03
283	124	129	مرتجع مبيعات - CN-2026-00006	10.00	0.00	2026-04-26 11:00:23.908673+03
284	124	130	خصم مرتجع - CN-2026-00006	2.00	0.00	2026-04-26 11:00:23.908673+03
286	124	13	عميل - مرتجع CN-2026-00006	0.00	9.20	2026-04-26 11:00:23.908673+03
287	125	122	Sales Invoice #SI-2026-0023	10.00	0.00	2026-04-26 11:27:32.210455+03
288	125	11	Sales Invoice #SI-2026-0023	0.00	10.00	2026-04-26 11:27:32.210455+03
289	126	122	Sales Invoice #SI-2026-0024	10.00	0.00	2026-04-26 12:10:19.097132+03
290	126	11	Sales Invoice #SI-2026-0024	0.00	10.00	2026-04-26 12:10:19.097132+03
291	127	88	تكلفة مشتريات - PINV-2026-0008	10.00	0.00	2026-04-26 12:39:18.597601+03
293	127	85	فاتورة مورد مستحقة - PINV-2026-0008	0.00	10.00	2026-04-26 12:39:18.597601+03
294	128	88	تكلفة مشتريات - PINV-2026-0009	70.00	0.00	2026-04-26 13:02:20.543234+03
296	128	85	فاتورة مورد مستحقة - PINV-2026-0009	0.00	70.00	2026-04-26 13:02:20.543234+03
297	129	88	تكلفة مشتريات - PINV-2026-0010	140.00	0.00	2026-04-26 13:35:13.559777+03
299	129	85	فاتورة مورد مستحقة - PINV-2026-0010	0.00	140.00	2026-04-26 13:35:13.559777+03
300	130	88	تكلفة مشتريات - PINV-2026-0011	300.00	0.00	2026-04-26 14:21:03.175603+03
302	130	85	فاتورة مورد مستحقة - PINV-2026-0011	0.00	345.00	2026-04-26 14:21:03.175603+03
303	131	88	تكلفة مشتريات - PINV-2026-0012	30.00	0.00	2026-04-26 14:28:07.407758+03
305	131	85	فاتورة مورد مستحقة - PINV-2026-0012	0.00	30.00	2026-04-26 14:28:07.407758+03
306	132	88	تكلفة مشتريات - PINV-2026-0013	80.00	0.00	2026-04-26 14:33:25.857988+03
308	132	85	فاتورة مورد مستحقة - PINV-2026-0013	0.00	92.00	2026-04-26 14:33:25.857988+03
309	133	88	تكلفة مشتريات - PINV-2026-0014	500.00	0.00	2026-04-26 14:35:22.337066+03
311	133	85	فاتورة مورد مستحقة - PINV-2026-0014	0.00	575.00	2026-04-26 14:35:22.337066+03
312	134	88	تكلفة مشتريات - PINV-2026-0015	210.00	0.00	2026-04-26 15:09:15.654729+03
314	134	85	فاتورة مورد مستحقة - PINV-2026-0015	0.00	241.50	2026-04-26 15:09:15.654729+03
315	135	88	تكلفة مشتريات - PINV-2026-0016	1000.00	0.00	2026-04-26 15:13:02.070677+03
317	135	85	فاتورة مورد مستحقة - PINV-2026-0016	0.00	1000.00	2026-04-26 15:13:02.070677+03
318	136	88	تكلفة مشتريات - PINV-2026-0017	50.00	0.00	2026-04-26 18:10:19.413999+03
320	136	85	فاتورة مورد مستحقة - PINV-2026-0017	0.00	50.00	2026-04-26 18:10:19.413999+03
321	137	122	Sales Invoice #SI-2026-0025	1150.00	0.00	2026-04-26 18:33:34.712782+03
250	114	20	Sales Invoice #SI-2026-0019	0.00	14.70	2026-04-24 18:12:16.885453+03
322	137	11	Sales Invoice #SI-2026-0025	0.00	1000.00	2026-04-26 18:33:34.712782+03
324	138	122	Sales Invoice #SI-2026-0026	115000.00	0.00	2026-04-26 18:51:40.720771+03
325	138	11	Sales Invoice #SI-2026-0026	0.00	100000.00	2026-04-26 18:51:40.720771+03
327	139	112	قبض من موسي  - RV-2026-0011	100000.00	0.00	2026-04-26 18:56:56.021952+03
328	139	122	تحصيل من العميل موسي 	0.00	100000.00	2026-04-26 18:56:56.021952+03
329	140	122	Sales Invoice #SI-2026-0027	9775.00	0.00	2026-04-26 19:05:08.569823+03
330	140	11	Sales Invoice #SI-2026-0027	0.00	8500.00	2026-04-26 19:05:08.569823+03
332	141	79	قبض من موسي  - RV-2026-0012	9000.00	0.00	2026-04-26 19:06:47.469629+03
333	141	122	تحصيل من العميل موسي 	0.00	9000.00	2026-04-26 19:06:47.469629+03
334	142	122	Sales Invoice #SI-2026-0028	4887.50	0.00	2026-04-26 19:07:50.581145+03
335	142	11	Sales Invoice #SI-2026-0028	0.00	4250.00	2026-04-26 19:07:50.581145+03
337	143	129	مرتجع مبيعات - CN-2026-00007	4250.00	0.00	2026-04-26 19:09:31.580389+03
339	143	13	عميل - مرتجع CN-2026-00007	0.00	4887.50	2026-04-26 19:09:31.580389+03
340	144	129	مرتجع مبيعات - CN-2026-00008	1000.00	0.00	2026-04-26 19:12:20.446976+03
342	144	13	عميل - مرتجع CN-2026-00008	0.00	1150.00	2026-04-26 19:12:20.446976+03
343	115	129	Balancing entry for Credit Note	0.00	4.00	2026-04-27 11:52:21.481692+03
344	117	129	Balancing entry for Credit Note	0.00	2.00	2026-04-27 11:52:21.495581+03
345	118	129	Balancing entry for Credit Note	0.00	4.00	2026-04-27 11:52:21.499894+03
346	124	129	Balancing entry for Credit Note	0.00	4.00	2026-04-27 11:52:21.503313+03
347	145	96	رواتب التحول الرقمي - قيد يدوي	11000.00	0.00	2026-04-27 14:02:35.01924+03
348	145	141	بدل سكن التحول الرقمي - قيد يدوي	250.00	0.00	2026-04-27 14:02:35.029102+03
349	145	148	بدل نقل التحول الرقمي - قيد يدوي	250.00	0.00	2026-04-27 14:02:35.029765+03
350	145	141	بدلات أخرى التحول الرقمي - قيد يدوي	250.00	0.00	2026-04-27 14:02:35.030423+03
351	145	106	رواتب مستحقة - التحول الرقمي	0.00	11750.00	2026-04-27 14:02:35.030995+03
352	146	102	رواتب الاداره الماليه	8000.00	0.00	2026-04-27 14:34:54.613477+03
353	146	106	رواتب مستحقة - الاداره الماليه	0.00	8000.00	2026-04-27 14:34:54.615434+03
354	147	102	رواتب اداره  العملاء والمببعات	8000.00	0.00	2026-04-27 14:34:54.622382+03
355	147	106	رواتب مستحقة - اداره  العملاء والمببعات	0.00	8000.00	2026-04-27 14:34:54.623376+03
356	148	139	رواتب قسمم الطاقه الشميسه	38000.00	0.00	2026-04-27 14:34:54.627959+03
357	148	141	بدل سكن قسمم الطاقه الشميسه	220.00	0.00	2026-04-27 14:34:54.628631+03
358	148	148	بدل نقل قسمم الطاقه الشميسه	220.00	0.00	2026-04-27 14:34:54.629208+03
359	148	141	بدلات أخرى قسمم الطاقه الشميسه	40.00	0.00	2026-04-27 14:34:54.629667+03
360	148	106	رواتب مستحقة - قسمم الطاقه الشميسه	0.00	38480.00	2026-04-27 14:34:54.630117+03
361	149	102	رواتب    فسمم  العروض  	8000.00	0.00	2026-04-27 14:34:54.633899+03
362	149	106	رواتب مستحقة -    فسمم  العروض  	0.00	8000.00	2026-04-27 14:34:54.634826+03
363	150	102	رواتب    اداره  المشاريع  	8000.00	0.00	2026-04-27 14:34:54.639493+03
364	150	106	رواتب مستحقة -    اداره  المشاريع  	0.00	8000.00	2026-04-27 14:34:54.64011+03
365	151	102	رواتب    اداره  العقود   	16000.00	0.00	2026-04-27 14:34:54.644014+03
366	151	106	رواتب مستحقة -    اداره  العقود   	0.00	16000.00	2026-04-27 14:34:54.644597+03
367	152	102	رواتب    اداره  المشتريات    	8000.00	0.00	2026-04-27 14:34:54.648267+03
368	152	106	رواتب مستحقة -    اداره  المشتريات    	0.00	8000.00	2026-04-27 14:34:54.648927+03
369	153	102	رواتب    اداره  المخازن    	8000.00	0.00	2026-04-27 14:34:54.653683+03
370	153	106	رواتب مستحقة -    اداره  المخازن    	0.00	8000.00	2026-04-27 14:34:54.654602+03
371	154	102	رواتب الصيانه والمتابعه 	8000.00	0.00	2026-04-27 14:34:54.658839+03
372	154	106	رواتب مستحقة - الصيانه والمتابعه 	0.00	8000.00	2026-04-27 14:34:54.659335+03
373	155	139	رواتب الموس شمسيه 	16000.00	0.00	2026-04-27 14:34:54.663179+03
374	155	106	رواتب مستحقة - الموس شمسيه 	0.00	16000.00	2026-04-27 14:34:54.663627+03
375	156	96	رواتب التحول الرقمي	111000.00	0.00	2026-04-27 14:34:54.667512+03
376	156	141	بدل سكن التحول الرقمي	10250.00	0.00	2026-04-27 14:34:54.668358+03
377	156	148	بدل نقل التحول الرقمي	10250.00	0.00	2026-04-27 14:34:54.669616+03
378	156	141	بدلات أخرى التحول الرقمي	10250.00	0.00	2026-04-27 14:34:54.670557+03
379	156	106	رواتب مستحقة - التحول الرقمي	0.00	141750.00	2026-04-27 14:34:54.671283+03
380	157	99	رواتب المباني والمنازل الذكية	30.00	0.00	2026-04-27 14:34:54.674917+03
381	157	141	بدل سكن المباني والمنازل الذكية	3.00	0.00	2026-04-27 14:34:54.675458+03
382	157	148	بدل نقل المباني والمنازل الذكية	3.00	0.00	2026-04-27 14:34:54.675944+03
383	157	141	بدلات أخرى المباني والمنازل الذكية	3.00	0.00	2026-04-27 14:34:54.67647+03
384	157	106	رواتب مستحقة - المباني والمنازل الذكية	0.00	39.00	2026-04-27 14:34:54.677168+03
385	158	139	رواتب الطاقة المتجددة وتخزين الطاقة	15000.00	0.00	2026-04-27 14:34:54.680319+03
386	158	141	بدل سكن الطاقة المتجددة وتخزين الطاقة	1000.00	0.00	2026-04-27 14:34:54.680833+03
387	158	148	بدل نقل الطاقة المتجددة وتخزين الطاقة	1000.00	0.00	2026-04-27 14:34:54.681314+03
388	158	141	بدلات أخرى الطاقة المتجددة وتخزين الطاقة	1000.00	0.00	2026-04-27 14:34:54.681743+03
389	158	106	رواتب مستحقة - الطاقة المتجددة وتخزين الطاقة	0.00	18000.00	2026-04-27 14:34:54.682269+03
29	10	111	[MIGRATED] سداد ثمن أصل ثابت: Toyota Hilux (FA-0001)	0.00	150000.00	2026-04-07 07:26:41.697907+02
204	92	111	[MIGRATED] سداد ثمن أصل ثابت: G-clas (FA-0002)	0.00	1000.00	2026-04-24 17:02:30.883766+03
246	113	111	[MIGRATED] سداد ثمن أصل ثابت: G-clas3300 (FA-0005)	0.00	8000.00	2026-04-24 17:59:15.967038+03
390	160	102	رواتب    اداره  المخازن    	8000.00	0.00	2026-04-27 18:33:56.520337+03
391	159	139	رواتب الطاقة المتجددة وتخزين الطاقة	15000.00	0.00	2026-04-27 18:33:56.520824+03
392	160	106	رواتب مستحقة -    اداره  المخازن    	0.00	8000.00	2026-04-27 18:33:56.522543+03
393	159	146	بدل سكن الطاقة المتجددة وتخزين الطاقة	1000.00	0.00	2026-04-27 18:33:56.522678+03
394	159	152	بدل نقل الطاقة المتجددة وتخزين الطاقة	1000.00	0.00	2026-04-27 18:33:56.530018+03
395	159	146	بدلات أخرى الطاقة المتجددة وتخزين الطاقة	1000.00	0.00	2026-04-27 18:33:56.531453+03
396	159	106	رواتب مستحقة - الطاقة المتجددة وتخزين الطاقة	0.00	18000.00	2026-04-27 18:33:56.532673+03
397	161	102	رواتب الاداره الماليه	8000.00	0.00	2026-04-27 18:36:35.774279+03
398	161	106	رواتب مستحقة - الاداره الماليه	0.00	8000.00	2026-04-27 18:36:35.776666+03
399	162	102	رواتب قسمم الطاقه الشميسه	38000.00	0.00	2026-04-27 18:36:35.790012+03
400	162	103	بدل سكن قسمم الطاقه الشميسه	220.00	0.00	2026-04-27 18:36:35.791571+03
401	162	105	بدل نقل قسمم الطاقه الشميسه	220.00	0.00	2026-04-27 18:36:35.792677+03
402	162	103	بدلات أخرى قسمم الطاقه الشميسه	40.00	0.00	2026-04-27 18:36:35.794491+03
403	162	106	رواتب مستحقة - قسمم الطاقه الشميسه	0.00	38480.00	2026-04-27 18:36:35.796019+03
404	163	139	رواتب الطاقة المتجددة وتخزين الطاقة	15000.00	0.00	2026-04-27 18:36:35.801516+03
405	163	146	بدل سكن الطاقة المتجددة وتخزين الطاقة	1000.00	0.00	2026-04-27 18:36:35.804588+03
406	163	152	بدل نقل الطاقة المتجددة وتخزين الطاقة	1000.00	0.00	2026-04-27 18:36:35.805482+03
407	163	146	بدلات أخرى الطاقة المتجددة وتخزين الطاقة	1000.00	0.00	2026-04-27 18:36:35.806621+03
408	163	106	رواتب مستحقة - الطاقة المتجددة وتخزين الطاقة	0.00	18000.00	2026-04-27 18:36:35.807353+03
409	164	102	رواتب اداره  العملاء والمببعات	8000.00	0.00	2026-04-27 18:36:35.857933+03
410	164	106	رواتب مستحقة - اداره  العملاء والمببعات	0.00	8000.00	2026-04-27 18:36:35.860501+03
411	165	102	رواتب    اداره  العقود   	16000.00	0.00	2026-04-27 18:36:35.879665+03
412	165	106	رواتب مستحقة -    اداره  العقود   	0.00	16000.00	2026-04-27 18:36:35.881156+03
413	166	102	رواتب الاداره الماليه	8000.00	0.00	2026-04-27 18:36:56.806941+03
414	170	102	رواتب    اداره  المشاريع  	8000.00	0.00	2026-04-27 18:36:56.807246+03
415	168	102	رواتب قسمم الطاقه الشميسه	38000.00	0.00	2026-04-27 18:36:56.807686+03
416	167	102	رواتب اداره  العملاء والمببعات	8000.00	0.00	2026-04-27 18:36:56.808177+03
417	169	102	رواتب    فسمم  العروض  	8000.00	0.00	2026-04-27 18:36:56.809012+03
418	166	106	رواتب مستحقة - الاداره الماليه	0.00	8000.00	2026-04-27 18:36:56.809572+03
419	170	106	رواتب مستحقة -    اداره  المشاريع  	0.00	8000.00	2026-04-27 18:36:56.810068+03
420	168	103	بدل سكن قسمم الطاقه الشميسه	220.00	0.00	2026-04-27 18:36:56.810573+03
421	167	106	رواتب مستحقة - اداره  العملاء والمببعات	0.00	8000.00	2026-04-27 18:36:56.810935+03
422	169	106	رواتب مستحقة -    فسمم  العروض  	0.00	8000.00	2026-04-27 18:36:56.811234+03
423	168	105	بدل نقل قسمم الطاقه الشميسه	220.00	0.00	2026-04-27 18:36:56.81462+03
424	168	103	بدلات أخرى قسمم الطاقه الشميسه	40.00	0.00	2026-04-27 18:36:56.824841+03
425	168	106	رواتب مستحقة - قسمم الطاقه الشميسه	0.00	38480.00	2026-04-27 18:36:56.840213+03
426	171	102	رواتب    اداره  المشتريات    	8000.00	0.00	2026-04-27 18:36:56.859342+03
427	172	102	رواتب    اداره  المخازن    	8000.00	0.00	2026-04-27 18:36:56.859596+03
428	173	102	رواتب الصيانه والمتابعه 	8000.00	0.00	2026-04-27 18:36:56.859845+03
429	174	102	رواتب الموس شمسيه 	16000.00	0.00	2026-04-27 18:36:56.860391+03
430	171	106	رواتب مستحقة -    اداره  المشتريات    	0.00	8000.00	2026-04-27 18:36:56.860607+03
431	172	106	رواتب مستحقة -    اداره  المخازن    	0.00	8000.00	2026-04-27 18:36:56.860828+03
432	173	106	رواتب مستحقة - الصيانه والمتابعه 	0.00	8000.00	2026-04-27 18:36:56.861044+03
433	174	106	رواتب مستحقة - الموس شمسيه 	0.00	16000.00	2026-04-27 18:36:56.861583+03
434	175	96	رواتب التحول الرقمي	111000.00	0.00	2026-04-27 18:36:56.877974+03
435	175	141	بدل سكن التحول الرقمي	10250.00	0.00	2026-04-27 18:36:56.882668+03
436	175	148	بدل نقل التحول الرقمي	10250.00	0.00	2026-04-27 18:36:56.88386+03
437	175	141	بدلات أخرى التحول الرقمي	10250.00	0.00	2026-04-27 18:36:56.884822+03
438	175	106	رواتب مستحقة - التحول الرقمي	0.00	141750.00	2026-04-27 18:36:56.890023+03
439	176	98	رواتب البنية التحتية والمدن الذكية	60000.00	0.00	2026-04-27 18:36:56.893707+03
440	177	139	رواتب الطاقة المتجددة وتخزين الطاقة	15000.00	0.00	2026-04-27 18:36:56.894398+03
441	176	143	بدل سكن البنية التحتية والمدن الذكية	6000.00	0.00	2026-04-27 18:36:56.89467+03
442	177	146	بدل سكن الطاقة المتجددة وتخزين الطاقة	1000.00	0.00	2026-04-27 18:36:56.895171+03
443	176	150	بدل نقل البنية التحتية والمدن الذكية	6000.00	0.00	2026-04-27 18:36:56.895405+03
444	177	152	بدل نقل الطاقة المتجددة وتخزين الطاقة	1000.00	0.00	2026-04-27 18:36:56.89579+03
445	176	143	بدلات أخرى البنية التحتية والمدن الذكية	6000.00	0.00	2026-04-27 18:36:56.896087+03
446	177	146	بدلات أخرى الطاقة المتجددة وتخزين الطاقة	1000.00	0.00	2026-04-27 18:36:56.896532+03
447	176	106	رواتب مستحقة - البنية التحتية والمدن الذكية	0.00	78000.00	2026-04-27 18:36:56.896799+03
448	177	106	رواتب مستحقة - الطاقة المتجددة وتخزين الطاقة	0.00	18000.00	2026-04-27 18:36:56.897289+03
449	178	102	رواتب    اداره  العقود   	16000.00	0.00	2026-04-27 18:36:56.913557+03
450	178	106	رواتب مستحقة -    اداره  العقود   	0.00	16000.00	2026-04-27 18:36:56.916239+03
451	179	102	رواتب الاداره الماليه	8000.00	0.00	2026-04-27 18:44:33.482301+03
452	179	106	رواتب مستحقة - الاداره الماليه	0.00	8000.00	2026-04-27 18:44:33.485727+03
453	180	102	رواتب    اداره  المشتريات    	8000.00	0.00	2026-04-27 18:44:33.513333+03
454	180	106	رواتب مستحقة -    اداره  المشتريات    	0.00	8000.00	2026-04-27 18:44:33.514561+03
455	181	102	رواتب    اداره  المخازن    	8000.00	0.00	2026-04-27 18:44:33.541006+03
456	181	106	رواتب مستحقة -    اداره  المخازن    	0.00	8000.00	2026-04-27 18:44:33.542308+03
457	182	102	رواتب الصيانه والمتابعه 	8000.00	0.00	2026-04-27 18:44:33.56701+03
458	182	106	رواتب مستحقة - الصيانه والمتابعه 	0.00	8000.00	2026-04-27 18:44:33.568081+03
459	183	102	رواتب الموس شمسيه 	16000.00	0.00	2026-04-27 18:44:33.585247+03
460	183	106	رواتب مستحقة - الموس شمسيه 	0.00	16000.00	2026-04-27 18:44:33.586433+03
461	184	102	رواتب قسمم الطاقه الشميسه	38000.00	0.00	2026-04-27 18:44:33.59919+03
466	188	96	رواتب التحول الرقمي	111000.00	0.00	2026-04-27 18:44:33.613287+03
462	184	103	بدل سكن قسمم الطاقه الشميسه	220.00	0.00	2026-04-27 18:44:33.603475+03
463	184	105	بدل نقل قسمم الطاقه الشميسه	220.00	0.00	2026-04-27 18:44:33.606814+03
464	184	103	بدلات أخرى قسمم الطاقه الشميسه	40.00	0.00	2026-04-27 18:44:33.608914+03
465	184	106	رواتب مستحقة - قسمم الطاقه الشميسه	0.00	38480.00	2026-04-27 18:44:33.610547+03
479	190	98	رواتب البنية التحتية والمدن الذكية	60000.00	0.00	2026-04-27 18:44:33.646464+03
480	190	143	بدل سكن البنية التحتية والمدن الذكية	6000.00	0.00	2026-04-27 18:44:33.647271+03
481	190	150	بدل نقل البنية التحتية والمدن الذكية	6000.00	0.00	2026-04-27 18:44:33.647922+03
482	190	143	بدلات أخرى البنية التحتية والمدن الذكية	6000.00	0.00	2026-04-27 18:44:33.648374+03
485	190	106	رواتب مستحقة - البنية التحتية والمدن الذكية	0.00	78000.00	2026-04-27 18:44:33.649166+03
467	188	141	بدل سكن التحول الرقمي	10250.00	0.00	2026-04-27 18:44:33.61438+03
468	188	148	بدل نقل التحول الرقمي	10250.00	0.00	2026-04-27 18:44:33.619527+03
469	185	102	رواتب اداره  العملاء والمببعات	8000.00	0.00	2026-04-27 18:44:33.619787+03
470	186	102	رواتب    فسمم  العروض  	8000.00	0.00	2026-04-27 18:44:33.620022+03
472	189	102	رواتب    اداره  المشاريع  	8000.00	0.00	2026-04-27 18:44:33.620794+03
471	187	102	رواتب    اداره  العقود   	16000.00	0.00	2026-04-27 18:44:33.620707+03
473	188	141	بدلات أخرى التحول الرقمي	10250.00	0.00	2026-04-27 18:44:33.623018+03
474	185	106	رواتب مستحقة - اداره  العملاء والمببعات	0.00	8000.00	2026-04-27 18:44:33.623328+03
475	186	106	رواتب مستحقة -    فسمم  العروض  	0.00	8000.00	2026-04-27 18:44:33.623581+03
476	189	106	رواتب مستحقة -    اداره  المشاريع  	0.00	8000.00	2026-04-27 18:44:33.624163+03
477	188	106	رواتب مستحقة - التحول الرقمي	0.00	141750.00	2026-04-27 18:44:33.624395+03
478	187	106	رواتب مستحقة -    اداره  العقود   	0.00	16000.00	2026-04-27 18:44:33.624612+03
483	191	99	رواتب المباني والمنازل الذكية	30.00	0.00	2026-04-27 18:44:33.648743+03
484	192	139	رواتب الطاقة المتجددة وتخزين الطاقة	15000.00	0.00	2026-04-27 18:44:33.649018+03
486	191	144	بدل سكن المباني والمنازل الذكية	3.00	0.00	2026-04-27 18:44:33.649337+03
487	192	146	بدل سكن الطاقة المتجددة وتخزين الطاقة	1000.00	0.00	2026-04-27 18:44:33.649543+03
488	192	152	بدل نقل الطاقة المتجددة وتخزين الطاقة	1000.00	0.00	2026-04-27 18:44:33.650846+03
489	191	29	بدل نقل المباني والمنازل الذكية	3.00	0.00	2026-04-27 18:44:33.651093+03
490	192	146	بدلات أخرى الطاقة المتجددة وتخزين الطاقة	1000.00	0.00	2026-04-27 18:44:33.651622+03
491	191	144	بدلات أخرى المباني والمنازل الذكية	3.00	0.00	2026-04-27 18:44:33.65195+03
492	192	106	رواتب مستحقة - الطاقة المتجددة وتخزين الطاقة	0.00	18000.00	2026-04-27 18:44:33.652324+03
493	191	106	رواتب مستحقة - المباني والمنازل الذكية	0.00	39.00	2026-04-27 18:44:33.652985+03
494	193	102	رواتب الاداره الماليه	8000.00	0.00	2026-04-27 18:45:36.869216+03
495	194	102	رواتب قسمم الطاقه الشميسه	38000.00	0.00	2026-04-27 18:45:36.871464+03
496	193	106	رواتب مستحقة - الاداره الماليه	0.00	8000.00	2026-04-27 18:45:36.874033+03
497	194	103	بدل سكن قسمم الطاقه الشميسه	220.00	0.00	2026-04-27 18:45:36.874648+03
498	194	105	بدل نقل قسمم الطاقه الشميسه	220.00	0.00	2026-04-27 18:45:36.877401+03
499	194	103	بدلات أخرى قسمم الطاقه الشميسه	40.00	0.00	2026-04-27 18:45:36.884565+03
500	194	106	رواتب مستحقة - قسمم الطاقه الشميسه	0.00	38480.00	2026-04-27 18:45:36.889268+03
501	195	102	رواتب اداره  العملاء والمببعات	8000.00	0.00	2026-04-27 18:45:36.954873+03
502	196	102	رواتب    اداره  المشاريع  	8000.00	0.00	2026-04-27 18:45:36.955654+03
503	197	102	رواتب    فسمم  العروض  	8000.00	0.00	2026-04-27 18:45:36.955952+03
504	195	106	رواتب مستحقة - اداره  العملاء والمببعات	0.00	8000.00	2026-04-27 18:45:36.960297+03
505	198	102	رواتب    اداره  المشتريات    	8000.00	0.00	2026-04-27 18:45:36.960574+03
506	196	106	رواتب مستحقة -    اداره  المشاريع  	0.00	8000.00	2026-04-27 18:45:36.960824+03
507	197	106	رواتب مستحقة -    فسمم  العروض  	0.00	8000.00	2026-04-27 18:45:36.961052+03
508	200	102	رواتب    اداره  المخازن    	8000.00	0.00	2026-04-27 18:45:36.961229+03
509	198	106	رواتب مستحقة -    اداره  المشتريات    	0.00	8000.00	2026-04-27 18:45:36.969569+03
510	200	106	رواتب مستحقة -    اداره  المخازن    	0.00	8000.00	2026-04-27 18:45:36.97356+03
511	199	102	رواتب    اداره  العقود   	16000.00	0.00	2026-04-27 18:45:36.973909+03
512	199	106	رواتب مستحقة -    اداره  العقود   	0.00	16000.00	2026-04-27 18:45:36.989845+03
513	201	102	رواتب الصيانه والمتابعه 	8000.00	0.00	2026-04-27 18:45:37.013698+03
514	202	102	رواتب الموس شمسيه 	16000.00	0.00	2026-04-27 18:45:37.014195+03
515	203	96	رواتب التحول الرقمي	111000.00	0.00	2026-04-27 18:45:37.015058+03
516	201	106	رواتب مستحقة - الصيانه والمتابعه 	0.00	8000.00	2026-04-27 18:45:37.015236+03
517	204	98	رواتب البنية التحتية والمدن الذكية	60000.00	0.00	2026-04-27 18:45:37.01549+03
518	202	106	رواتب مستحقة - الموس شمسيه 	0.00	16000.00	2026-04-27 18:45:37.015722+03
519	205	99	رواتب المباني والمنازل الذكية	30.00	0.00	2026-04-27 18:45:37.016147+03
520	203	141	بدل سكن التحول الرقمي	10250.00	0.00	2026-04-27 18:45:37.016411+03
521	204	143	بدل سكن البنية التحتية والمدن الذكية	6000.00	0.00	2026-04-27 18:45:37.017962+03
522	206	139	رواتب الطاقة المتجددة وتخزين الطاقة	15000.00	0.00	2026-04-27 18:45:37.020645+03
523	205	144	بدل سكن المباني والمنازل الذكية	3.00	0.00	2026-04-27 18:45:37.020996+03
524	203	148	بدل نقل التحول الرقمي	10250.00	0.00	2026-04-27 18:45:37.021316+03
525	204	150	بدل نقل البنية التحتية والمدن الذكية	6000.00	0.00	2026-04-27 18:45:37.021624+03
526	206	146	بدل سكن الطاقة المتجددة وتخزين الطاقة	1000.00	0.00	2026-04-27 18:45:37.022249+03
527	203	141	بدلات أخرى التحول الرقمي	10250.00	0.00	2026-04-27 18:45:37.022557+03
528	205	29	بدل نقل المباني والمنازل الذكية	3.00	0.00	2026-04-27 18:45:37.022851+03
529	204	143	بدلات أخرى البنية التحتية والمدن الذكية	6000.00	0.00	2026-04-27 18:45:37.023184+03
530	206	152	بدل نقل الطاقة المتجددة وتخزين الطاقة	1000.00	0.00	2026-04-27 18:45:37.023379+03
531	203	106	رواتب مستحقة - التحول الرقمي	0.00	141750.00	2026-04-27 18:45:37.023563+03
532	205	144	بدلات أخرى المباني والمنازل الذكية	3.00	0.00	2026-04-27 18:45:37.023766+03
533	206	146	بدلات أخرى الطاقة المتجددة وتخزين الطاقة	1000.00	0.00	2026-04-27 18:45:37.024094+03
534	204	106	رواتب مستحقة - البنية التحتية والمدن الذكية	0.00	78000.00	2026-04-27 18:45:37.025105+03
535	205	106	رواتب مستحقة - المباني والمنازل الذكية	0.00	39.00	2026-04-27 18:45:37.025415+03
536	206	106	رواتب مستحقة - الطاقة المتجددة وتخزين الطاقة	0.00	18000.00	2026-04-27 18:45:37.025637+03
537	207	95	رواتب الأتمتة الصناعية والتحكم	40000.00	0.00	2026-04-27 20:42:28.394542+03
538	207	131	بدل سكن الأتمتة الصناعية والتحكم	1000.00	0.00	2026-04-27 20:42:28.404543+03
539	207	147	بدل نقل الأتمتة الصناعية والتحكم	1000.00	0.00	2026-04-27 20:42:28.40531+03
541	207	154	تأمينات اجتماعية الأتمتة الصناعية والتحكم	4800.00	0.00	2026-04-27 20:42:28.406546+03
543	207	132	تأمينات اجتماعية مستحقة - الأتمتة الصناعية والتحكم	0.00	8800.00	2026-04-27 20:42:28.407887+03
544	208	139	رواتب الطاقة المتجددة وتخزين الطاقة	20.00	0.00	2026-04-27 21:48:37.819232+03
545	208	146	بدل سكن الطاقة المتجددة وتخزين الطاقة	20.00	0.00	2026-04-27 21:48:37.832843+03
546	208	152	بدل نقل الطاقة المتجددة وتخزين الطاقة	20.00	0.00	2026-04-27 21:48:37.833778+03
547	208	146	بدلات أخرى الطاقة المتجددة وتخزين الطاقة	20.00	0.00	2026-04-27 21:48:37.835197+03
548	208	106	رواتب مستحقة - الطاقة المتجددة وتخزين الطاقة	0.00	80.00	2026-04-27 21:48:37.837276+03
549	209	96	رواتب التحول الرقمي	1000.00	0.00	2026-04-27 21:49:15.746003+03
550	209	141	بدل سكن التحول الرقمي	10.00	0.00	2026-04-27 21:49:15.747451+03
551	209	148	بدل نقل التحول الرقمي	10.00	0.00	2026-04-27 21:49:15.748277+03
552	209	141	بدلات أخرى التحول الرقمي	10.00	0.00	2026-04-27 21:49:15.749035+03
553	209	106	رواتب مستحقة - التحول الرقمي	0.00	1030.00	2026-04-27 21:49:15.750105+03
554	210	98	رواتب البنية التحتية والمدن الذكية	7000.00	0.00	2026-04-28 09:13:44.358391+03
555	210	143	بدل سكن البنية التحتية والمدن الذكية	100.00	0.00	2026-04-28 09:13:44.367853+03
556	210	150	بدل نقل البنية التحتية والمدن الذكية	100.00	0.00	2026-04-28 09:13:44.368578+03
557	210	143	بدلات أخرى البنية التحتية والمدن الذكية	100.00	0.00	2026-04-28 09:13:44.369195+03
558	210	106	رواتب مستحقة - البنية التحتية والمدن الذكية	0.00	7300.00	2026-04-28 09:13:44.369902+03
559	211	97	رواتب التنفيذ والتشغيل والصيانة	100.00	0.00	2026-04-28 09:22:15.634902+03
560	211	142	بدل سكن التنفيذ والتشغيل والصيانة	10.00	0.00	2026-04-28 09:22:15.638142+03
561	211	149	بدل نقل التنفيذ والتشغيل والصيانة	10.00	0.00	2026-04-28 09:22:15.639088+03
562	211	142	بدلات أخرى التنفيذ والتشغيل والصيانة	10.00	0.00	2026-04-28 09:22:15.63979+03
563	211	106	رواتب مستحقة - التنفيذ والتشغيل والصيانة	0.00	130.00	2026-04-28 09:22:15.640534+03
542	207	106	رواتب مستحقة - الأتمتة الصناعية والتحكم	0.00	39000.00	2026-04-27 20:42:28.407239+03
540	207	95	بدلات أخرى الأتمتة الصناعية والتحكم	1000.00	0.00	2026-04-27 20:42:28.406015+03
564	212	99	رواتب المباني والمنازل الذكية	900.00	0.00	2026-04-28 10:06:29.533962+03
565	212	144	بدل سكن المباني والمنازل الذكية	90.00	0.00	2026-04-28 10:06:29.536601+03
566	212	29	بدل نقل المباني والمنازل الذكية	90.00	0.00	2026-04-28 10:06:29.537362+03
567	212	99	بدلات أخرى المباني والمنازل الذكية	90.00	0.00	2026-04-28 10:06:29.53813+03
568	212	106	رواتب مستحقة - المباني والمنازل الذكية	0.00	1170.00	2026-04-28 10:06:29.538766+03
569	213	96	رواتب التحول الرقمي	12000.00	0.00	2026-04-28 20:04:58.642252+03
570	213	141	بدل سكن التحول الرقمي	1200.00	0.00	2026-04-28 20:04:58.644437+03
571	213	96	بدلات أخرى التحول الرقمي	1200.00	0.00	2026-04-28 20:04:58.645802+03
572	213	106	رواتب مستحقة - التحول الرقمي	0.00	14400.00	2026-04-28 20:04:58.646855+03
580	217	157	Sales Invoice #SI-2026-0029	690.00	0.00	2026-05-04 10:51:54.896415+03
581	217	11	Sales Invoice #SI-2026-0029	0.00	600.00	2026-05-04 10:51:54.896415+03
583	218	110	قبض من محمد جمال   - RV-2026-0013	600.00	0.00	2026-05-04 10:53:53.230817+03
584	218	157	تحصيل من العميل محمد جمال  	0.00	600.00	2026-05-04 10:53:53.230817+03
587	220	96	رواتب التحول الرقمي	5000.00	0.00	2026-05-06 15:15:31.530242+03
585	221	99	رواتب المباني والمنازل الذكية	5000.00	0.00	2026-05-06 15:15:31.529383+03
586	219	139	رواتب الطاقة المتجددة وتخزين الطاقة	8000.00	0.00	2026-05-06 15:15:31.529704+03
588	220	141	بدل سكن التحول الرقمي	1000.00	0.00	2026-05-06 15:15:31.542538+03
589	221	144	بدل سكن المباني والمنازل الذكية	1000.00	0.00	2026-05-06 15:15:31.542758+03
590	219	146	بدل سكن الطاقة المتجددة وتخزين الطاقة	1100.00	0.00	2026-05-06 15:15:31.542915+03
591	220	96	بدلات أخرى التحول الرقمي	1000.00	0.00	2026-05-06 15:15:31.543272+03
592	221	99	بدلات أخرى المباني والمنازل الذكية	1000.00	0.00	2026-05-06 15:15:31.543573+03
593	219	139	بدلات أخرى الطاقة المتجددة وتخزين الطاقة	1100.00	0.00	2026-05-06 15:15:31.543859+03
594	220	106	رواتب مستحقة - التحول الرقمي	0.00	7000.00	2026-05-06 15:15:31.544094+03
595	221	154	تأمينات اجتماعية المباني والمنازل الذكية	600.00	0.00	2026-05-06 15:15:31.544599+03
596	219	106	رواتب مستحقة - الطاقة المتجددة وتخزين الطاقة	0.00	10200.00	2026-05-06 15:15:31.544814+03
597	221	106	رواتب مستحقة - المباني والمنازل الذكية	0.00	6512.50	2026-05-06 15:15:31.546198+03
598	221	132	تأمينات اجتماعية مستحقة - المباني والمنازل الذكية	0.00	1087.50	2026-05-06 15:15:31.551262+03
599	222	157	Sales Invoice #SI-2026-0030	1150.00	0.00	2026-05-07 14:24:05.324661+03
600	222	25	Sales Invoice #SI-2026-0030	0.00	1000.00	2026-05-07 14:24:05.324661+03
602	223	157	Sales Invoice #SI-2026-0031	115.00	0.00	2026-05-07 14:56:12.163201+03
603	223	11	Sales Invoice #SI-2026-0031	0.00	100.00	2026-05-07 14:56:12.163201+03
605	224	79	قبض من محمد جمال  - RV-2026-0013	1000.00	0.00	2026-05-07 14:57:13.430319+03
606	224	158	تحصيل من العميل محمد جمال 	0.00	1000.00	2026-05-07 14:57:13.430319+03
607	225	122	Sales Invoice #SI-2026-0032	115.00	0.00	2026-05-07 14:58:55.902355+03
608	225	11	Sales Invoice #SI-2026-0032	0.00	100.00	2026-05-07 14:58:55.902355+03
610	226	79	قبض من موسي  - RV-2026-0014	1000.00	0.00	2026-05-07 14:59:59.34829+03
611	226	122	تحصيل من العميل موسي 	0.00	1000.00	2026-05-07 14:59:59.34829+03
612	227	157	Sales Invoice #SI-2026-0033	1840.00	0.00	2026-05-07 15:44:27.003486+03
613	227	25	Sales Invoice #SI-2026-0033	0.00	1600.00	2026-05-07 15:44:27.003486+03
615	228	89	COGS - لوح شمسي 400 وات - SI-2026-0033	1600.00	0.00	2026-05-07 15:45:03.901251+03
616	228	80	Inventory relief - لوح شمسي 400 وات - SI-2026-0033	0.00	1600.00	2026-05-07 15:45:03.901251+03
58	21	20	[MIGRATED] ضريبة قيمة مضافة - فاتورة INV-20260407-0004	0.00	1500.00	2026-04-07 17:42:27.287102+02
582	217	20	Sales Invoice #SI-2026-0029	0.00	90.00	2026-05-04 10:51:54.896415+03
61	22	20	[MIGRATED] ضريبة قيمة مضافة - فاتورة INV-20260407-0005	0.00	1500.00	2026-04-07 17:43:59.85576+02
105	49	20	VAT Output - SI-2026-0004	0.00	7.50	2026-04-22 09:47:07.175486+02
108	50	20	VAT Output - SI-2026-0005	0.00	7.50	2026-04-22 09:48:54.607425+02
111	51	20	VAT Output - SI-2026-0006	0.00	2.99	2026-04-22 09:49:49.005697+02
114	52	20	VAT Output - SI-2026-0007	0.00	2.99	2026-04-22 09:59:54.33339+02
117	53	20	VAT Output - SI-2026-0008	0.00	1.49	2026-04-22 10:04:19.455805+02
120	54	20	VAT Output - SI-2026-0009	0.00	1.49	2026-04-22 10:07:53.169584+02
123	55	20	VAT Output - SI-2026-0010	0.00	3.00	2026-04-22 10:12:48.941266+02
126	56	20	VAT Output - SI-2026-0011	0.00	2.25	2026-04-22 10:14:28.204933+02
129	57	20	VAT Output - SI-2026-0012	0.00	1.50	2026-04-22 10:17:59.181967+02
134	59	20	Sales Invoice #SI-2026-0014	0.00	15.00	2026-04-22 10:26:35.99332+02
253	115	20	ضريبة مرتجع مبيعات - CN-2026-00001	14.70	0.00	2026-04-24 19:19:19.73694+03
260	117	20	ضريبة مرتجع مبيعات - CN-2026-00001	1349.85	0.00	2026-04-24 19:25:40.543877+03
264	118	20	ضريبة مرتجع مبيعات - CN-2026-00002	14.70	0.00	2026-04-24 19:28:09.274102+03
267	119	20	ضريبة مرتجع مبيعات - CN-2026-00003	1.62	0.00	2026-04-24 19:30:33.258006+03
270	120	20	ضريبة مرتجع مبيعات - CN-2026-00004	1.48	0.00	2026-04-24 19:40:07.036875+03
273	121	20	ضريبة مرتجع مبيعات - CN-2026-00005	15.00	0.00	2026-04-25 09:57:04.287679+03
278	122	20	Sales Invoice #SI-2026-0021	0.00	13.50	2026-04-25 16:08:06.448404+03
282	123	20	Sales Invoice #SI-2026-0022	0.00	1.20	2026-04-26 10:57:25.930419+03
285	124	20	ضريبة مرتجع مبيعات - CN-2026-00006	1.20	0.00	2026-04-26 11:00:23.908673+03
323	137	20	Sales Invoice #SI-2026-0025	0.00	150.00	2026-04-26 18:33:34.712782+03
326	138	20	Sales Invoice #SI-2026-0026	0.00	15000.00	2026-04-26 18:51:40.720771+03
331	140	20	Sales Invoice #SI-2026-0027	0.00	1275.00	2026-04-26 19:05:08.569823+03
336	142	20	Sales Invoice #SI-2026-0028	0.00	637.50	2026-04-26 19:07:50.581145+03
338	143	20	ضريبة مرتجع مبيعات - CN-2026-00007	637.50	0.00	2026-04-26 19:09:31.580389+03
341	144	20	ضريبة مرتجع مبيعات - CN-2026-00008	150.00	0.00	2026-04-26 19:12:20.446976+03
601	222	20	Sales Invoice #SI-2026-0030	0.00	150.00	2026-05-07 14:24:05.324661+03
604	223	20	Sales Invoice #SI-2026-0031	0.00	15.00	2026-05-07 14:56:12.163201+03
609	225	20	Sales Invoice #SI-2026-0032	0.00	15.00	2026-05-07 14:58:55.902355+03
614	227	20	Sales Invoice #SI-2026-0033	0.00	240.00	2026-05-07 15:44:27.003486+03
49	18	21	[MIGRATED] ضريبة مدخلات - PINV-0003	2550.00	0.00	2026-04-07 17:29:10.173767+02
52	19	21	[MIGRATED] ضريبة مدخلات - PINV-0004	2550.00	0.00	2026-04-07 17:40:40.360689+02
63	23	21	[MIGRATED] VAT Input - PO PO-0009	59.82	0.00	2026-04-20 07:52:04.216724+02
66	24	21	[MIGRATED] VAT Input - PO PO-0010	30.00	0.00	2026-04-20 12:56:40.980932+02
69	25	21	[MIGRATED] VAT Input - PO PO-0011	12.69	0.00	2026-04-20 13:27:06.900779+02
72	34	21	[MIGRATED] VAT Input - PO PO-0017	0.00	0.00	2026-04-20 15:23:21.094493+02
75	35	21	[MIGRATED] VAT Input - PO PO-0018	0.00	0.00	2026-04-20 19:13:17.034035+02
138	61	21	VAT Input - PO PO-0008	6.00	0.00	2026-04-22 11:17:37.659921+02
149	66	21	VAT Input - PO PO-0005	0.00	0.00	2026-04-22 14:27:50.688995+02
78	36	21	[MIGRATED] VAT Input - PO PO-0019	4.50	0.00	2026-04-20 19:16:57.178734+02
152	67	21	[MIGRATED] ضريبة مدخلات - PINV-2026-0006	2550.00	0.00	2026-04-22 14:51:39.197754+02
155	68	21	[MIGRATED] ضريبة مدخلات - PINV-2026-0007	0.00	0.00	2026-04-22 15:02:32.617815+02
292	127	21	[MIGRATED] ضريبة مدخلات - PINV-2026-0008	0.00	0.00	2026-04-26 12:39:18.597601+03
295	128	21	[MIGRATED] ضريبة مدخلات - PINV-2026-0009	0.00	0.00	2026-04-26 13:02:20.543234+03
298	129	21	[MIGRATED] ضريبة مدخلات - PINV-2026-0010	0.00	0.00	2026-04-26 13:35:13.559777+03
301	130	21	[MIGRATED] ضريبة مدخلات - PINV-2026-0011	45.00	0.00	2026-04-26 14:21:03.175603+03
304	131	21	[MIGRATED] ضريبة مدخلات - PINV-2026-0012	0.00	0.00	2026-04-26 14:28:07.407758+03
307	132	21	[MIGRATED] ضريبة مدخلات - PINV-2026-0013	12.00	0.00	2026-04-26 14:33:25.857988+03
310	133	21	[MIGRATED] ضريبة مدخلات - PINV-2026-0014	75.00	0.00	2026-04-26 14:35:22.337066+03
316	135	21	[MIGRATED] ضريبة مدخلات - PINV-2026-0016	0.00	0.00	2026-04-26 15:13:02.070677+03
319	136	21	[MIGRATED] ضريبة مدخلات - PINV-2026-0017	0.00	0.00	2026-04-26 18:10:19.413999+03
313	134	21	[MIGRATED] ضريبة مدخلات - PINV-2026-0015	31.50	0.00	2026-04-26 15:09:15.654729+03
617	229	88	تكلفة مشتريات - PINV-2026-0019	100.00	0.00	2026-05-07 15:56:25.932359+03
618	229	21	ضريبة مدخلات - PINV-2026-0019	15.00	0.00	2026-05-07 15:56:25.932359+03
619	229	85	فاتورة مورد مستحقة - PINV-2026-0019	0.00	115.00	2026-05-07 15:56:25.932359+03
620	230	159	Sales Invoice #SI-2026-0034	5750.00	0.00	2026-05-07 17:03:43.966463+03
621	230	25	Sales Invoice #SI-2026-0034	0.00	5000.00	2026-05-07 17:03:43.966463+03
622	230	114	Sales Invoice #SI-2026-0034	0.00	750.00	2026-05-07 17:03:43.966463+03
623	231	89	COGS - لوح شمسي 400 وات - SI-2026-0034	5000.00	0.00	2026-05-07 17:04:55.555084+03
624	231	80	Inventory relief - لوح شمسي 400 وات - SI-2026-0034	0.00	5000.00	2026-05-07 17:04:55.555084+03
\.


--
-- Data for Name: lead_interactions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lead_interactions (id, lead_id, interaction_type, description, performed_by, next_follow_up_date, created_at) FROM stdin;
7	23	call	لة	97	2026-04-12 00:07:00+02	2026-04-12 07:07:36.506435+02
8	23	call	ىلى	111	2026-04-12 19:13:00+02	2026-04-12 07:09:50.790219+02
9	28	email	لا	87	2026-04-15 08:41:00+02	2026-04-14 08:41:54.814776+02
1	19	call	0000	\N	2026-04-11 08:39:00+02	2026-04-11 08:36:18.148187+02
4	22	call	نو	\N	2026-04-11 08:00:00+02	2026-04-11 08:59:57.339414+02
5	23	meeting	ء	\N	2026-04-11 09:56:00+02	2026-04-11 09:54:05.005209+02
6	23	call	رر	\N	2026-04-12 07:11:00+02	2026-04-12 07:07:22.025126+02
15	34	call	sssxs	150	\N	2026-05-07 12:47:47.070172+03
16	38	meeting	اجتماع طاريئ	150	2026-05-07 17:24:00+03	2026-05-07 16:24:11.118352+03
\.


--
-- Data for Name: leads; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.leads (id, owner_id, client_name, contact_email, contact_phone, service_type, location, source, status, priority, estimated_value, notes, created_at, updated_at, technical_dept_id, assigned_engineer_id, rejection_comment, assigned_sales_rep_id, client_user_id, temp_password_sent, temp_password_hash, receivable_account_id) FROM stdin;
34	150	محمد جمال	abdalrhmanbnmostafa@gmail.com	01020365412	تركيب الواح	\N	\N	won	medium	0.00	\N	2026-05-07 12:26:29.652163+03	2026-05-07 14:17:50.834842+03	49	152	\N	82	156	t	\N	158
38	150	ابراهيم	ammarjabry34@gmail.com	010203654789	تركيب الواح شمسيه	\N	\N	won	high	0.00	عميل محتاج تركيب في اسرع وقت 	2026-05-07 16:23:06.879379+03	2026-05-07 17:02:15.093054+03	49	152	\N	82	157	t	\N	159
19	82	شركة  الموس والبوب للستراد والتصدير وا لدعايه ولاعان والبرمجه والتكنولوجيا والتعسيل  والتسقيع	lead@gmail.com	+966501234567	HVAC	الرياض، شارع الملك فهد	referral	new	high	150000.00	عميل محتمل لنظام تكييف مركزي	2026-03-29 17:44:11.327229+02	2026-04-11 12:04:36.724122+02	17	93	\N	\N	\N	f	\N	\N
28	97	موسي	engmosa79@gmail.com	01042440440	تركيب	\N	\N	won	medium	0.00	\N	2026-04-13 08:35:35.220175+02	2026-04-22 10:55:52.817824+02	30	112	\N	82	117	t	\N	122
22	\N	البوج	mosaelwayly@gmail.com	01025141425	ركب	\N	\N	inspection_completed	medium	0.00	نو	2026-04-11 08:58:21.615011+02	2026-05-03 17:08:22.344905+03	30	112	\N	82	\N	f	\N	\N
23	\N	ئر	mosaelwayly@gmail.com	01040040404	رئ	\N	\N	won	medium	0.00	 ؤ 	2026-04-11 09:29:44.618622+02	2026-05-03 17:08:22.344905+03	30	112	\N	82	\N	f	\N	\N
36	150	fdff	maelwayly@gmail.com	010254799	dfdf	\N	\N	survey_requested	medium	0.00	\N	2026-05-07 13:17:00.711422+03	2026-05-07 13:17:26.893472+03	45	\N	\N	82	\N	f	\N	\N
37	150	موسي 	mosaيelwayly@gmail.com	01236548	مجدي	\N	\N	inspection_assigned	medium	0.00	\N	2026-05-07 13:20:06.372858+03	2026-05-07 13:21:01.142458+03	49	152	\N	\N	\N	f	\N	\N
\.


--
-- Data for Name: leave_requests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.leave_requests (id, employee_id, leave_type, start_date, end_date, days_count, reason, status, approved_by, approved_at, rejection_reason, created_at, updated_at, document_url) FROM stdin;
2	60	annual	2026-05-02	2026-05-09	5	010	approved	120	2026-05-02 19:36:20.512386+03	\N	2026-05-02 19:35:01.988427+03	2026-05-02 19:36:20.512386+03	
3	60	sick	2026-05-21	2026-05-24	2		approved	120	2026-05-02 23:29:34.515125+03	\N	2026-05-02 23:29:21.106741+03	2026-05-02 23:29:34.515125+03	
4	61	unpaid	2026-05-04	2026-05-10	5	جواز 	approved	120	2026-05-04 18:10:02.351008+03	\N	2026-05-04 18:08:09.777833+03	2026-05-04 18:10:02.351008+03	
5	61	annual	2026-05-26	2026-05-31	4		rejected	120	\N	gh	2026-05-04 20:12:52.645279+03	2026-05-04 20:13:35.288512+03	
6	61	sick	2026-06-01	2026-06-07	5		approved	120	2026-05-06 23:04:56.052987+03	\N	2026-05-06 22:55:33.415181+03	2026-05-06 23:04:56.052987+03	
7	61	annual	2026-07-07	2026-07-16	8		approved	120	2026-05-07 17:26:12.239311+03	\N	2026-05-07 17:25:46.064158+03	2026-05-07 17:26:12.239311+03	
\.


--
-- Data for Name: maintenance_contracts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.maintenance_contracts (id, contract_number, client_id, project_id, start_date, end_date, value, visit_frequency, max_visits, included_assets, terms_conditions, status, auto_renew, renewal_notice_days, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: maintenance_records; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.maintenance_records (id, asset_id, performed_by, maintenance_type, description, scheduled_at, completed_at, status, cost, next_maintenance_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: maintenance_visits; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.maintenance_visits (id, asset_id, visit_type, visit_date, scheduled_by, assigned_engineer_id, status, description, work_performed, materials_used, travel_cost, labor_cost, total_cost, billable, invoice_id, completion_notes, completed_at, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notifications (id, user_id, title, message, type, entity_type, entity_id, is_read, created_at, read_at) FROM stdin;
282	84	عرض سعر بانتظار المراجعة المالية	العميل ئر — يرجى مراجعة عرض السعر والموافقة	warning	quotation	10	f	2026-04-12 13:46:58.055887+02	2026-04-12 13:54:37.054419+02
283	97	تمت الموافقة المالية على عرض السعر	عرض سعر العميل ئر تمت الموافقة عليه مالياً — بانتظار موافقتكم	warning	quotation	10	f	2026-04-12 16:40:42.791995+02	2026-04-12 16:43:20.206697+02
588	120	موظف جديد	تم إضافة 222 222 — engineer — EMP-0031	info	employee	53	f	2026-04-28 09:13:22.217877+03	\N
589	97	موظف جديد	تم إضافة موظف جديد: 222 222 — الدور: engineer	info	employee	53	f	2026-04-28 09:13:22.241207+03	\N
294	111	طلب معاينة فنية جديد	تم طلب معاينة للعميل: عبدو 	info	lead	24	f	2026-04-12 17:43:25.120111+02	\N
295	82	تم تعيينك على عميل محتمل	تم تعيينك على العميل: عبدو 	info	lead	24	f	2026-04-12 17:43:28.096229+02	\N
297	112	مهمة معاينة جديدة	تم تعيينك لمعاينة العميل: عبدو 	info	lead	24	f	2026-04-12 17:43:30.564365+02	2026-04-12 17:43:49.393983+02
288	113	تم إرسال عرض السعر للعميل	تم إرسال عرض السعر للعميل ئر	success	quotation	9	f	2026-04-12 17:32:15.468679+02	2026-04-12 17:45:15.449668+02
285	113	تم إرسال عرض السعر للعميل	تم إرسال عرض السعر للعميل ئر	success	quotation	10	f	2026-04-12 17:29:04.600149+02	2026-04-12 17:45:20.783703+02
600	120	موظف جديد	تم إضافة عبدو  فواد  — engineer — EMP-0044	info	employee	60	f	2026-05-02 19:30:36.236941+03	\N
601	97	موظف جديد	تم إضافة موظف جديد: عبدو  فواد  — الدور: engineer	info	employee	60	f	2026-05-02 19:30:36.264606+03	\N
610	97	عميل جديد	محمد جمال 	info	lead	30	f	2026-05-03 17:28:55.680235+03	\N
302	111	طلب معاينة فنية جديد	تم طلب معاينة للعميل: عبدو2	info	lead	25	f	2026-04-12 17:53:44.008324+02	\N
303	82	تم تعيينك على عميل محتمل	تم تعيينك على العميل: عبدو2	info	lead	25	f	2026-04-12 17:53:46.20613+02	\N
629	113	تم إرسال عرض السعر للعميل	تم إرسال عرض السعر للعميل محمد جمال 	success	quotation	16	f	2026-05-03 19:37:26.406236+03	\N
305	112	مهمة معاينة جديدة	تم تعيينك لمعاينة العميل: عبدو2	info	lead	25	f	2026-04-12 17:53:48.737563+02	2026-04-12 18:02:06.653054+02
307	84	عرض سعر بانتظار المراجعة المالية	العميل عبدو2 — يرجى مراجعة عرض السعر والموافقة	warning	quotation	12	f	2026-04-12 18:03:04.732008+02	2026-04-12 18:03:43.871518+02
308	97	تمت الموافقة المالية على عرض السعر	عرض سعر العميل عبدو2 تمت الموافقة عليه مالياً — بانتظار موافقتكم	warning	quotation	12	f	2026-04-12 18:03:47.01919+02	2026-04-12 18:04:25.726212+02
630	97	تم إرسال عرض السعر للعميل	عرض السعر للعميل محمد جمال  بانتظار الرد	info	quotation	16	f	2026-05-03 19:37:26.408691+03	\N
684	143	تم تعيينك كمدير مشروع	تم تعيينك كمدير لمشروع: مشروع محمدد جمال  - يرجى مراجعة المعاينة الهندسية وتشكيل الفريق	info	project	14	f	2026-05-06 14:54:19.648482+03	\N
656	154	تم اكتمال مهمة	تم اكتمال المهمة: "تركيب اسلاك" في مشروع "مشروع محمد جمال "	success	task	26	f	2026-05-04 10:42:56.641669+03	\N
313	111	طلب معاينة فنية جديد	تم طلب معاينة للعميل: عبدو3	info	lead	26	f	2026-04-12 18:16:53.59099+02	\N
314	82	تم تعيينك على عميل محتمل	تم تعيينك على العميل: عبدو3	info	lead	26	f	2026-04-12 18:16:56.164453+02	\N
657	97	مهمة مكتملة	تم اكتمال المهمة: "تركيب اسلاك" في مشروع "مشروع محمد جمال "	success	task	26	f	2026-05-04 10:42:56.646438+03	\N
316	112	مهمة معاينة جديدة	تم تعيينك لمعاينة العميل: عبدو3	info	lead	26	f	2026-04-12 18:16:58.563912+02	\N
670	82	تم تعيينك على عميل محتمل	تم تعيينك على العميل: محمدد جمال 	info	lead	31	f	2026-05-05 17:36:36.179077+03	\N
318	84	عرض سعر بانتظار المراجعة المالية	العميل عبدو3 — يرجى مراجعة عرض السعر والموافقة	warning	quotation	13	f	2026-04-12 18:18:19.74169+02	2026-04-12 18:18:56.352551+02
319	97	تمت الموافقة المالية على عرض السعر	عرض سعر العميل عبدو3 تمت الموافقة عليه مالياً — بانتظار موافقتكم	warning	quotation	13	f	2026-04-12 18:18:58.631478+02	2026-04-12 18:19:29.588623+02
671	97	تم تعيين مندوب مبيعات	تم تعيين مندوب مبيعات للعميل: محمدد جمال 	info	lead	31	f	2026-05-05 17:36:36.182683+03	\N
685	97	تم تعيين مدير مشروع	تم تعيين ll lll مديرًا لمشروع "مشروع محمدد جمال "	info	project	14	f	2026-05-06 14:54:19.652865+03	\N
284	84	عرض سعر جديد بانتظار مراجعتكم	تم إرسال عرض سعر جديد - يرجى مراجعة البوابة والموافقة	info	quotation	10	f	2026-04-12 17:29:04.595649+02	2026-04-20 05:20:40.10744+02
323	97	عميل جديد	موسي 1 	info	lead	27	f	2026-04-13 07:41:12.97357+02	2026-04-13 07:44:12.100189+02
324	111	طلب معاينة فنية جديد	تم طلب معاينة للعميل: موسي 1 	info	lead	27	f	2026-04-13 07:44:19.70871+02	\N
321	113	تم إرسال عرض السعر للعميل	تم إرسال عرض السعر للعميل عبدو3	success	quotation	13	f	2026-04-12 18:19:48.245445+02	2026-04-13 08:00:51.58007+02
310	113	تم إرسال عرض السعر للعميل	تم إرسال عرض السعر للعميل عبدو2	success	quotation	12	f	2026-04-12 18:04:44.516386+02	2026-04-13 08:00:56.36914+02
286	97	تم إرسال عرض السعر للعميل	عرض السعر للعميل ئر بانتظار الرد	info	quotation	10	f	2026-04-12 17:29:04.601725+02	2026-04-28 08:40:41.093323+03
289	97	تم إرسال عرض السعر للعميل	عرض السعر للعميل ئر بانتظار الرد	info	quotation	9	f	2026-04-12 17:32:15.469894+02	2026-04-28 08:40:41.093323+03
290	97	تم تحويل العرض لمشروع 🎉	تم إنشاء مشروع جديد للعميل ئر - الميزانية: 450000.00	success	project	5	f	2026-04-12 17:32:18.387908+02	2026-04-28 08:40:41.093323+03
293	97	عميل جديد	عبدو 	info	lead	24	f	2026-04-12 17:43:15.423164+02	2026-04-28 08:40:41.093323+03
296	97	تم تعيين مندوب مبيعات	تم تعيين مندوب مبيعات للعميل: عبدو 	info	lead	24	f	2026-04-12 17:43:28.098292+02	2026-04-28 08:40:41.093323+03
298	97	تم تعيين مهندس معاينة	تم تعيين مهندس لمعاينة العميل: عبدو 	info	lead	24	f	2026-04-12 17:43:30.566675+02	2026-04-28 08:40:41.093323+03
694	97	تم صرف مواد من المخزون	تم صرف 1 أصناف لمشروع "مشروع محمدد جمال "	info	project	14	f	2026-05-06 15:06:28.950495+03	\N
325	82	تم تعيينك على عميل محتمل	تم تعيينك على العميل: موسي 1 	info	lead	27	f	2026-04-13 07:44:24.431036+02	\N
327	112	مهمة معاينة جديدة	تم تعيينك لمعاينة العميل: موسي 1 	info	lead	27	f	2026-04-13 07:44:29.448308+02	\N
590	120	موظف جديد	تم إضافة 55 555 — engineer — EMP-0032	info	employee	54	f	2026-04-28 09:21:50.67209+03	\N
591	97	موظف جديد	تم إضافة موظف جديد: 55 555 — الدور: engineer	info	employee	54	f	2026-04-28 09:21:50.68285+03	\N
329	84	تم قبول عرض السعر	العميل قبل عرض السعر - يرجى متابعة الإجراءات المالية	success	quotation	13	f	2026-04-13 07:56:51.584514+02	2026-04-13 07:59:02.956068+02
331	84	عرض سعر بانتظار المراجعة المالية	العميل موسي 1  — يرجى مراجعة عرض السعر والموافقة	warning	quotation	14	f	2026-04-13 08:01:17.952523+02	2026-04-13 08:01:48.892855+02
332	97	تمت الموافقة المالية على عرض السعر	عرض سعر العميل موسي 1  تمت الموافقة عليه مالياً — بانتظار موافقتكم	warning	quotation	14	f	2026-04-13 08:01:51.007833+02	2026-04-13 08:02:30.375405+02
356	117	تم بدء مشروعكم 🎉	تم تحويل عرض السعر لمشروع قيد التنفيذ - يمكنكم متابعة التقدم من البوابة	success	project	12	f	2026-04-13 09:05:18.298589+02	2026-04-13 09:10:03.587603+02
602	120	طلب إجازة جديد بانتظار مراجعتك	الموظف/ة: عبدو  فواد  — النوع: إجازة سنوية — المدة: 5 يوم (2026-05-02 → 2026-05-09)	warning	leave_request	2	f	2026-05-02 19:35:01.997156+03	2026-05-02 19:35:57.703604+03
338	112	مهمة معاينة جديدة	تم تعيينك لمعاينة العميل: موسي	info	lead	28	f	2026-04-13 08:35:42.040752+02	\N
603	97	طلب إجازة جديد بانتظار مراجعتك	الموظف/ة: عبدو  فواد  — النوع: إجازة سنوية — المدة: 5 يوم (2026-05-02 → 2026-05-09)	warning	leave_request	2	f	2026-05-02 19:35:02.000327+03	2026-05-03 10:28:58.1793+03
340	82	تم تعيينك على عميل محتمل	تم تعيينك على العميل: موسي	info	lead	28	f	2026-04-13 08:35:44.429538+02	\N
334	113	تم إرسال عرض السعر للعميل	تم إرسال عرض السعر للعميل موسي 1 	success	quotation	14	f	2026-04-13 08:02:44.136075+02	2026-04-13 08:36:35.911362+02
342	84	عرض سعر بانتظار المراجعة المالية	العميل موسي — يرجى مراجعة عرض السعر والموافقة	warning	quotation	15	f	2026-04-13 08:37:13.529859+02	2026-04-13 08:37:30.14954+02
343	97	تمت الموافقة المالية على عرض السعر	عرض سعر العميل موسي تمت الموافقة عليه مالياً — بانتظار موافقتكم	warning	quotation	15	f	2026-04-13 08:37:32.296052+02	2026-04-13 08:38:07.940887+02
611	151	طلب معاينة فنية جديد	تم طلب معاينة للعميل: محمد جمال 	info	lead	30	f	2026-05-03 17:51:01.649608+03	2026-05-03 17:56:44.592783+03
344	117	عرض سعر جديد بانتظار مراجعتكم	تم إرسال عرض سعر جديد - يرجى مراجعة البوابة والموافقة	info	quotation	15	f	2026-04-13 08:38:16.164805+02	2026-04-13 08:39:13.361148+02
632	97	مشروع جديد تلقائي 🎉	وافق العميل على العرض - تم إنشاء مشروع "مشروع محمد جمال "	success	project	13	f	2026-05-03 19:40:06.275286+03	\N
631	87	مشروع جديد جاهز للتعيين	يرجى تعيين مدير لمشروع "مشروع محمد جمال "	info	project	13	f	2026-05-03 19:40:06.275286+03	2026-05-03 19:41:17.822537+03
658	84	تم إنشاء صندوق عهد جديد	تم إنشاء صندوق عهد للمهندس "مشروع جمي " بمبلغ 1000 ريال	info	petty_cash_fund	12	f	2026-05-04 10:47:04.659243+03	2026-05-04 13:39:22.723626+03
672	152	مهمة معاينة جديدة	تم تعيينك لمعاينة العميل: محمدد جمال 	info	lead	31	f	2026-05-05 17:36:54.939841+03	\N
355	97	مشروع جديد تلقائي 🎉	وافق العميل على العرض - تم إنشاء مشروع "مشروع موسي"	success	project	12	f	2026-04-13 09:05:18.298589+02	2026-04-13 09:11:01.126989+02
673	97	تم تعيين مهندس معاينة	تم تعيين مهندس لمعاينة العميل: محمدد جمال 	info	lead	31	f	2026-05-05 17:36:54.945398+03	\N
360	117	تم استلام الدفعة الأولى	شكراً لكم - سيتم بدء التنفيذ قريباً	success	quotation	15	f	2026-04-13 09:11:49.862265+02	2026-04-13 09:12:14.178709+02
354	87	مشروع جديد جاهز للتعيين	يرجى تعيين مدير لمشروع "مشروع موسي"	info	project	12	f	2026-04-13 09:05:18.298589+02	2026-04-13 11:29:57.043709+02
345	113	تم إرسال عرض السعر للعميل	تم إرسال عرض السعر للعميل موسي	success	quotation	15	f	2026-04-13 08:38:16.167418+02	2026-04-13 17:33:21.941076+02
366	112	تم تعيينك كمدير مشروع	تم تعيينك كمدير لمشروع: مشروع موسي - يرجى مراجعة المعاينة الهندسية وتشكيل الفريق	info	project	12	f	2026-04-13 18:29:27.900674+02	\N
368	112	تم تعيينك كمدير مشروع	تم تعيينك كمدير لمشروع: مشروع موسي - يرجى مراجعة المعاينة الهندسية وتشكيل الفريق	info	project	12	f	2026-04-13 18:30:18.481433+02	\N
720	97	عميل جديد	اليسالا	info	lead	33	f	2026-05-07 12:25:31.817617+03	\N
370	112	تم تعيينك كمدير مشروع	تم تعيينك كمدير لمشروع: مشروع موسي - يرجى مراجعة المعاينة الهندسية وتشكيل الفريق	info	project	12	f	2026-04-13 18:43:30.942625+02	\N
722	97	عميل جديد	sdscs	info	lead	35	f	2026-05-07 12:45:50.139944+03	\N
376	112	تم إنشاء مهمة جديدة	تم إنشاء مهمة جديدة في مشروع "مشروع موسي": تركيب 	warning	task	19	f	2026-04-13 19:00:58.831192+02	2026-04-13 19:07:02.153375+02
375	112	تم تعيينك في مهمة جديدة	تم تعيينك في المهمة: "تركيب " ضمن مشروع "مشروع موسي"	info	task	19	f	2026-04-13 19:00:58.828261+02	2026-04-13 19:07:05.817895+02
372	112	تم تعيينك كمدير مشروع	تم تعيينك كمدير لمشروع: مشروع موسي - يرجى مراجعة المعاينة الهندسية وتشكيل الفريق	info	project	12	f	2026-04-13 18:52:13.304226+02	2026-04-13 19:07:08.456321+02
377	97	مهمة جديدة في المشاريع	تم إنشاء مهمة "تركيب " في مشروع "مشروع موسي"	info	task	19	f	2026-04-13 19:00:58.833636+02	2026-04-14 07:10:34.749165+02
373	97	تم تعيين مدير مشروع	تم تعيين مجدي موسي مديرًا لمشروع "مشروع موسي"	info	project	12	f	2026-04-13 18:52:13.308545+02	2026-04-14 07:10:38.613876+02
730	97	عميل جديد	موسي 	info	lead	37	f	2026-05-07 13:20:06.382145+03	\N
359	84	تم تأكيد الدفعة الأولى	العميل موسي - الدفعة: 10	success	quotation	15	f	2026-04-13 09:11:49.861605+02	2026-04-19 18:16:12.251804+02
326	97	تم تعيين مندوب مبيعات	تم تعيين مندوب مبيعات للعميل: موسي 1 	info	lead	27	f	2026-04-13 07:44:24.433296+02	2026-04-28 08:40:41.093323+03
336	97	عميل جديد	موسي	info	lead	28	f	2026-04-13 08:35:35.231066+02	2026-04-28 08:40:41.093323+03
380	118	تم تعيينك كمدير مشروع	تم تعيينك كمدير لمشروع: مشروع موسي - يرجى مراجعة المعاينة الهندسية وتشكيل الفريق	info	project	12	f	2026-04-14 07:25:07.326752+02	2026-04-14 07:25:57.012321+02
592	120	موظف جديد	تم إضافة 888 888 — engineer — EMP-0033	info	employee	56	f	2026-04-28 10:05:50.734252+03	\N
593	97	موظف جديد	تم إضافة موظف جديد: 888 888 — الدور: engineer	info	employee	56	f	2026-04-28 10:05:50.75949+03	2026-04-28 11:50:30.170689+03
604	149	تمت الموافقة على إجازتك ✅	تمت الموافقة على طلب إجازة سنوية بتاعك (5 يوم: Sat May 02 → Sat May 09) من قِبَل مدير الموارد البشرية 	success	leave_request	2	f	2026-05-02 19:36:20.524083+03	2026-05-02 20:01:08.833519+03
612	142	مهمة معاينة جديدة	تم تعيينك لمعاينة العميل: محمد جمال 	info	lead	30	f	2026-05-03 17:56:52.88983+03	\N
613	97	تم تعيين مهندس معاينة	تم تعيين مهندس لمعاينة العميل: محمد جمال 	info	lead	30	f	2026-05-03 17:56:52.899855+03	\N
616	97	تم إزالة مهندس المعاينة	تم إزالة مهندس المعاينة من العميل: محمد جمال 	warning	lead	30	f	2026-05-03 17:57:49.280122+03	\N
391	112	تم تعيينك في مهمة جديدة	تم تعيينك في المهمة: "تركيب" ضمن مشروع "مشروع موسي"	info	task	20	f	2026-04-14 08:12:18.759182+02	2026-04-14 08:12:31.624332+02
635	97	تم تعيين مدير مشروع	تم تعيين hopa pop مديرًا لمشروع "مشروع محمد جمال "	info	project	13	f	2026-05-03 19:42:27.624571+03	\N
634	152	تم تعيينك كمدير مشروع	تم تعيينك كمدير لمشروع: مشروع محمد جمال  - يرجى مراجعة المعاينة الهندسية وتشكيل الفريق	info	project	13	f	2026-05-03 19:42:27.619692+03	2026-05-03 19:43:09.700315+03
399	112	تم تعيينك في مهمة جديدة	تم تعيينك في المهمة: "وة" ضمن مشروع "مشروع موسي"	info	task	22	f	2026-04-14 08:15:35.700494+02	2026-04-14 08:15:42.239609+02
663	97	طلب إجازة جديد بانتظار مراجعتك	الموظف/ة: hopa pop — النوع: إجازة بدون راتب — المدة: 5 يوم (2026-05-04 → 2026-05-10)	warning	leave_request	4	f	2026-05-04 18:08:09.810049+03	\N
662	120	طلب إجازة جديد بانتظار مراجعتك	الموظف/ة: hopa pop — النوع: إجازة بدون راتب — المدة: 5 يوم (2026-05-04 → 2026-05-10)	warning	leave_request	4	f	2026-05-04 18:08:09.787972+03	2026-05-04 18:08:44.769656+03
407	118	تم اكتمال مهمة	تم اكتمال المهمة: "ببب" في مشروع "مشروع موسي"	success	task	23	f	2026-04-14 08:18:10.092577+02	2026-04-14 08:28:37.10095+02
405	118	تم إنشاء مهمة جديدة	تم إنشاء مهمة جديدة في مشروع "مشروع موسي": ببب	warning	task	23	f	2026-04-14 08:16:45.166951+02	2026-04-14 08:28:40.157604+02
402	118	تم اكتمال مهمة	تم اكتمال المهمة: "وة" في مشروع "مشروع موسي"	success	task	22	f	2026-04-14 08:15:51.178572+02	2026-04-14 08:28:42.196126+02
400	118	تم إنشاء مهمة جديدة	تم إنشاء مهمة جديدة في مشروع "مشروع موسي": وة	warning	task	22	f	2026-04-14 08:15:35.70218+02	2026-04-14 08:28:44.157163+02
394	118	تم اكتمال مهمة	تم اكتمال المهمة: "تركيب" في مشروع "مشروع موسي"	success	task	20	f	2026-04-14 08:12:41.861957+02	2026-04-14 08:28:46.684661+02
397	118	تم إنشاء مهمة جديدة	تم إنشاء مهمة جديدة في مشروع "مشروع موسي": لرررر	warning	task	21	f	2026-04-14 08:13:20.053844+02	2026-04-14 08:28:49.94465+02
392	118	تم إنشاء مهمة جديدة	تم إنشاء مهمة جديدة في مشروع "مشروع موسي": تركيب	warning	task	20	f	2026-04-14 08:12:18.761009+02	2026-04-14 08:28:52.310126+02
386	118	تم اكتمال مهمة	تم اكتمال المهمة: "gh" في مشروع "مشروع موسي"	success	task	18	f	2026-04-14 08:09:47.050773+02	2026-04-14 08:28:55.173658+02
404	112	تم تعيينك في مهمة جديدة	تم تعيينك في المهمة: "ببب" ضمن مشروع "مشروع موسي"	info	task	23	f	2026-04-14 08:16:45.166081+02	2026-04-14 08:47:27.023094+02
674	84	عرض سعر بانتظار المراجعة المالية	العميل محمدد جمال  — يرجى مراجعة عرض السعر والموافقة	warning	quotation	17	f	2026-05-05 17:39:23.132142+03	2026-05-05 17:40:00.621071+03
687	97	تم تعيين مدير مشروع	تم تعيين hopa pop مديرًا لمشروع "مشروع محمدد جمال "	info	project	14	f	2026-05-06 14:54:27.345842+03	\N
695	152	تم تعيينك في مهمة جديدة	تم تعيينك في المهمة: "f" ضمن مشروع "مشروع محمدد جمال "	info	task	28	f	2026-05-06 15:07:19.174456+03	\N
696	154	تم إنشاء مهمة جديدة	تم إنشاء مهمة جديدة في مشروع "مشروع محمدد جمال ": f	warning	task	28	f	2026-05-06 15:07:19.177699+03	\N
697	97	مهمة جديدة في المشاريع	تم إنشاء مهمة "f" في مشروع "مشروع محمدد جمال "	info	task	28	f	2026-05-06 15:07:19.182504+03	\N
698	154	تم اكتمال مهمة	تم اكتمال المهمة: "f" في مشروع "مشروع محمدد جمال "	success	task	28	f	2026-05-06 15:07:29.982342+03	\N
396	112	تم تعيينك في مهمة جديدة	تم تعيينك في المهمة: "لرررر" ضمن مشروع "مشروع موسي"	info	task	21	f	2026-04-14 08:13:20.052792+02	2026-04-14 14:05:44.582334+02
419	118	تم اكتمال مهمة	تم اكتمال المهمة: "تركيب " في مشروع "مشروع موسي"	success	task	19	f	2026-04-14 13:45:47.477394+02	2026-04-14 17:13:11.636987+02
421	118	تم اكتمال مهمة	تم اكتمال المهمة: "لرررر" في مشروع "مشروع موسي"	success	task	21	f	2026-04-14 13:45:53.302593+02	2026-04-14 17:10:11.765852+02
417	118	تم اكتمال مهمة	تم اكتمال المهمة: "تركيب " في مشروع "مشروع موسي"	success	task	19	f	2026-04-14 13:42:09.264907+02	2026-04-14 17:13:13.586817+02
381	97	تم تعيين مدير مشروع	تم تعيين عبدو مم موسي مديرًا لمشروع "مشروع موسي"	info	project	12	f	2026-04-14 07:25:07.33104+02	2026-04-28 08:40:41.093323+03
594	120	موظف جديد	تم إضافة nn nnnn — engineer — EMP-0040	info	employee	57	f	2026-04-28 13:12:34.563743+03	\N
595	97	موظف جديد	تم إضافة موظف جديد: nn nnnn — الدور: engineer	info	employee	57	f	2026-04-28 13:12:34.591687+03	\N
423	112	تم تعيينك في مشروع	تم تعيينك في المشروع: مشروع موسي	info	project	12	f	2026-04-14 13:52:57.93282+02	2026-04-14 13:55:54.678142+02
605	120	طلب إجازة جديد بانتظار مراجعتك	الموظف/ة: عبدو  فواد  — النوع: إجازة مرضية — المدة: 2 يوم (2026-05-21 → 2026-05-24)	warning	leave_request	3	f	2026-05-02 23:29:21.116123+03	\N
425	112	تم تعيينك في مهمة جديدة	تم تعيينك في المهمة: "gggg" ضمن مشروع "مشروع موسي"	info	task	24	f	2026-04-14 13:55:24.067947+02	2026-04-14 14:05:40.984344+02
446	95	طلب شراء جديد	تم إنشاء طلب شراء جديد PO-0006 من مدير المشروع - مشروع #12	info	purchase_order	12	f	2026-04-20 05:44:01.967529+02	2026-04-20 05:48:20.774207+02
429	118	تم اكتمال مهمة	تم اكتمال المهمة: "gggg" في مشروع "مشروع موسي"	success	task	24	f	2026-04-14 13:56:04.565037+02	2026-04-14 17:09:08.669269+02
426	118	تم إنشاء مهمة جديدة	تم إنشاء مهمة جديدة في مشروع "مشروع موسي": gggg	warning	task	24	f	2026-04-14 13:55:24.071016+02	2026-04-14 17:10:00.584606+02
606	97	طلب إجازة جديد بانتظار مراجعتك	الموظف/ة: عبدو  فواد  — النوع: إجازة مرضية — المدة: 2 يوم (2026-05-21 → 2026-05-24)	warning	leave_request	3	f	2026-05-02 23:29:21.118966+03	2026-05-03 10:28:56.166532+03
614	82	تم تعيينك على عميل محتمل	تم تعيينك على العميل: محمد جمال 	info	lead	30	f	2026-05-03 17:57:19.44856+03	\N
615	97	تم تعيين مندوب مبيعات	تم تعيين مندوب مبيعات للعميل: محمد جمال 	info	lead	30	f	2026-05-03 17:57:19.451852+03	\N
636	120	موظف جديد	تم إضافة جمي جمال — project_manager — EMP-0046	info	employee	62	f	2026-05-03 19:47:35.794708+03	\N
637	97	موظف جديد	تم إضافة موظف جديد: جمي جمال — الدور: project_manager	info	employee	62	f	2026-05-03 19:47:35.800985+03	\N
441	118	تم رفع عقد المشروع	تم رفع عقد مشروع "مشروع موسي" بنجاح. يمكنك الآن تخصيص المواد من المخزون.	success	contract	15	f	2026-04-19 10:21:20.837822+02	2026-04-19 10:48:06.066729+02
337	111	طلب معاينة فنية جديد	تم طلب معاينة للعميل: موسي	info	lead	28	f	2026-04-13 08:35:39.363694+02	2026-04-19 17:46:28.793027+02
639	97	تم تعيين مدير مشروع	تم تعيين جمي جمال مديرًا لمشروع "مشروع محمد جمال "	info	project	13	f	2026-05-03 19:48:00.969662+03	\N
439	118	تم رفع عقد المشروع	تم رفع عقد مشروع "مشروع موسي" بنجاح. يمكنك الآن تخصيص المواد من المخزون.	success	contract	14	f	2026-04-19 10:16:41.490651+02	2026-04-19 17:55:43.666647+02
435	118	تم رفع عقد المشروع	تم رفع عقد مشروع "مشروع موسي" بنجاح. يمكنك الآن تخصيص المواد من المخزون.	success	contract	11	f	2026-04-15 11:21:19.600173+02	2026-04-19 17:55:46.171428+02
437	118	تم رفع عقد المشروع	تم رفع عقد مشروع "مشروع موسي" بنجاح. يمكنك الآن تخصيص المواد من المخزون.	success	contract	13	f	2026-04-19 10:02:47.731823+02	2026-04-19 17:55:47.90713+02
433	118	تم رفع عقد المشروع	تم رفع عقد مشروع "مشروع موسي" بنجاح. يمكنك الآن تخصيص المواد من المخزون.	success	contract	10	f	2026-04-15 11:04:16.982267+02	2026-04-19 17:55:49.443149+02
638	154	تم تعيينك كمدير مشروع	تم تعيينك كمدير لمشروع: مشروع محمد جمال  - يرجى مراجعة المعاينة الهندسية وتشكيل الفريق	info	project	13	f	2026-05-03 19:48:00.966451+03	2026-05-03 19:51:11.461915+03
287	84	عرض سعر جديد بانتظار مراجعتكم	تم إرسال عرض سعر جديد - يرجى مراجعة البوابة والموافقة	info	quotation	9	f	2026-04-12 17:32:15.462802+02	2026-04-20 05:20:40.10744+02
292	84	مشروع جديد - متابعة مالية	تم تحويل عرض سعر العميل ئر لمشروع - يرجى متابعة الدفعات	info	project	5	f	2026-04-12 17:32:18.391054+02	2026-04-20 05:20:40.10744+02
299	84	عرض سعر بانتظار المراجعة المالية	العميل عبدو  — يرجى مراجعة عرض السعر والموافقة	warning	quotation	11	f	2026-04-12 17:46:15.705543+02	2026-04-20 05:20:40.10744+02
447	95	طلب شراء جديد	تم إنشاء طلب شراء جديد PO-0007 من مدير المشروع - مشروع #12	info	purchase_order	13	f	2026-04-20 06:08:03.019447+02	2026-04-20 06:12:43.320813+02
664	152	تمت الموافقة على إجازتك ✅	تمت الموافقة على طلب إجازة بدون راتب بتاعك (5 يوم: Mon May 04 → Sun May 10) من قِبَل مدير الموارد البشرية 	success	leave_request	4	f	2026-05-04 18:10:02.363702+03	2026-05-04 20:13:53.538497+03
686	152	تم تعيينك كمدير مشروع	تم تعيينك كمدير لمشروع: مشروع محمدد جمال  - يرجى مراجعة المعاينة الهندسية وتشكيل الفريق	info	project	14	f	2026-05-06 14:54:27.341897+03	2026-05-06 14:57:59.762671+03
451	118	✅ تمت الموافقة على أمر الشراء	تمت الموافقة المالية على أمر الشراء رقم "PO-0006" لمشروع "مشروع موسي". يمكن الآن إرساله للمورد.	success	purchase_order	12	f	2026-04-20 07:06:18.829476+02	2026-04-20 07:07:16.733456+02
448	118	✅ تمت الموافقة على أمر الشراء	تمت الموافقة المالية على أمر الشراء رقم "PO-0007" لمشروع "مشروع موسي". يمكن الآن إرساله للمورد.	success	purchase_order	13	f	2026-04-20 07:05:21.318525+02	2026-04-20 07:07:20.76736+02
454	95	طلب شراء جديد	تم إنشاء طلب شراء جديد PO-0008 من مدير المشروع - مشروع #12	info	purchase_order	14	f	2026-04-20 07:07:53.253936+02	2026-04-20 07:08:32.460731+02
456	118	تم رفض أمر شراء	تم رفض أمر الشراء رقم "PO-0008" الخاص بمشروع "مشروع موسي"	danger	purchase_order	14	f	2026-04-20 07:31:25.253426+02	2026-04-20 07:50:12.919037+02
450	95	أمر شراء جاهز للإرسال	تمت الموافقة المالية على أمر الشراء رقم "PO-0007". يرجى إرساله للمورد: Mosa Elwayly	warning	purchase_order	13	f	2026-04-20 07:05:21.329601+02	2026-04-26 12:44:27.580287+03
455	118	❌ تم رفض أمر الشراء	تم رفض أمر الشراء رقم "PO-0008" لمشروع "مشروع موسي". السبب: لالال	danger	purchase_order	14	f	2026-04-20 07:31:25.251425+02	2026-04-26 13:00:42.195724+03
339	97	تم تعيين مهندس معاينة	تم تعيين مهندس لمعاينة العميل: موسي	info	lead	28	f	2026-04-13 08:35:42.046896+02	2026-04-28 08:40:41.093323+03
341	97	تم تعيين مندوب مبيعات	تم تعيين مندوب مبيعات للعميل: موسي	info	lead	28	f	2026-04-13 08:35:44.430836+02	2026-04-28 08:40:41.093323+03
346	97	تم إرسال عرض السعر للعميل	عرض السعر للعميل موسي بانتظار الرد	info	quotation	15	f	2026-04-13 08:38:16.168851+02	2026-04-28 08:40:41.093323+03
727	97	عميل جديد	fdff	info	lead	36	f	2026-05-07 13:17:00.720884+03	\N
457	95	🔄 أمر شراء معاد من المالية	تم رفض أمر الشراء رقم "PO-0008" من الإدارة المالية. السبب: لالال	warning	purchase_order	14	f	2026-04-20 07:31:25.258383+02	2026-04-20 07:42:32.930947+02
453	95	أمر شراء جاهز للإرسال	تمت الموافقة المالية على أمر الشراء رقم "PO-0006". يرجى إرساله للمورد: Saudi Solar Solutions	warning	purchase_order	12	f	2026-04-20 07:06:18.839359+02	2026-04-20 07:43:46.170462+02
458	95	طلب شراء جديد	تم إنشاء طلب شراء جديد PO-0009 من مدير المشروع - مشروع #12	info	purchase_order	15	f	2026-04-20 07:50:29.611333+02	2026-04-20 07:50:42.966248+02
596	120	موظف جديد	تم إضافة nn nnnn — engineer — EMP-0041	info	employee	58	f	2026-04-28 13:18:32.153817+03	\N
597	97	موظف جديد	تم إضافة موظف جديد: nn nnnn — الدور: engineer	info	employee	58	f	2026-04-28 13:18:32.168598+03	\N
465	95	أمر شراء جاهز للإرسال	تمت الموافقة المالية على أمر الشراء رقم "PO-0010". يرجى إرساله للمورد: Saudi Solar Solutions	warning	purchase_order	16	f	2026-04-20 12:56:41.033117+02	2026-04-20 13:04:09.110948+02
462	95	طلب شراء جديد	تم إنشاء طلب شراء جديد PO-0010 من مدير المشروع - مشروع #12	info	purchase_order	16	f	2026-04-20 12:55:45.89207+02	2026-04-20 13:04:32.282189+02
607	149	تمت الموافقة على إجازتك ✅	تمت الموافقة على طلب إجازة مرضية بتاعك (2 يوم: Thu May 21 → Sun May 24) من قِبَل مدير الموارد البشرية 	success	leave_request	3	f	2026-05-02 23:29:34.532747+03	\N
618	97	تم تعيين مهندس معاينة	تم تعيين مهندس لمعاينة العميل: محمد جمال 	info	lead	30	f	2026-05-03 17:58:01.250692+03	\N
641	154	تم رفع عقد المشروع	تم رفع عقد مشروع "مشروع محمد جمال " بنجاح. يمكنك الآن تخصيص المواد من المخزون.	success	contract	16	f	2026-05-03 20:30:14.285805+03	\N
642	97	عقد جديد تم رفعه	تم رفع عقد "CTR-1777829414269" لمشروع "مشروع محمد جمال "	info	contract	16	f	2026-05-03 20:30:14.289971+03	\N
461	95	أمر شراء جاهز للإرسال	تمت الموافقة المالية على أمر الشراء رقم "PO-0009". يرجى إرساله للمورد: Saudi Solar Solutions	warning	purchase_order	15	f	2026-04-20 07:52:04.257006+02	2026-04-26 12:44:27.580287+03
466	95	طلب شراء جديد	تم إنشاء طلب شراء جديد PO-0011 من مدير المشروع - مشروع #12	info	purchase_order	17	f	2026-04-20 13:26:15.7675+02	2026-04-26 12:44:27.580287+03
469	95	أمر شراء جاهز للإرسال	تمت الموافقة المالية على أمر الشراء رقم "PO-0011". يرجى إرساله للمورد: Saudi Solar Solutions	warning	purchase_order	17	f	2026-04-20 13:27:07.172837+02	2026-04-26 12:44:27.580287+03
470	95	طلب شراء جديد	تم إنشاء طلب شراء جديد PO-0012 من مدير المشروع - مشروع #12	info	purchase_order	18	f	2026-04-20 14:25:22.017614+02	2026-04-26 12:44:27.580287+03
459	118	✅ تمت الموافقة على أمر الشراء	تمت الموافقة المالية على أمر الشراء رقم "PO-0009" لمشروع "مشروع موسي". يمكن الآن إرساله للمورد.	success	purchase_order	15	f	2026-04-20 07:52:04.253138+02	2026-04-26 13:00:42.195724+03
463	118	✅ تمت الموافقة على أمر الشراء	تمت الموافقة المالية على أمر الشراء رقم "PO-0010" لمشروع "مشروع موسي". يمكن الآن إرساله للمورد.	success	purchase_order	16	f	2026-04-20 12:56:41.024134+02	2026-04-26 13:00:42.195724+03
467	118	✅ تمت الموافقة على أمر الشراء	تمت الموافقة المالية على أمر الشراء رقم "PO-0011" لمشروع "مشروع موسي". يمكن الآن إرساله للمورد.	success	purchase_order	17	f	2026-04-20 13:27:07.167165+02	2026-04-26 13:00:42.195724+03
471	118	✅ تمت الموافقة على أمر الشراء	تمت الموافقة المالية على أمر الشراء رقم "PO-0012" لمشروع "مشروع موسي". يمكن الآن إرساله للمورد.	success	purchase_order	18	f	2026-04-20 14:26:48.239132+02	2026-04-26 13:00:42.195724+03
474	118	✅ تمت الموافقة على أمر الشراء	تمت الموافقة المالية على أمر الشراء رقم "PO-0002" لمشروع "مشروع موسي". يمكن الآن إرساله للمورد.	success	purchase_order	4	f	2026-04-20 14:26:55.457239+02	2026-04-26 13:00:42.195724+03
479	118	✅ تمت الموافقة على أمر الشراء	تمت الموافقة المالية على أمر الشراء رقم "PO-0014" لمشروع "مشروع موسي". يمكن الآن إرساله للمورد.	success	purchase_order	20	f	2026-04-20 14:31:39.134887+02	2026-04-26 13:00:42.195724+03
482	118	✅ تمت الموافقة على أمر الشراء	تمت الموافقة المالية على أمر الشراء رقم "PO-0013" لمشروع "مشروع موسي". يمكن الآن إرساله للمورد.	success	purchase_order	19	f	2026-04-20 14:37:35.362169+02	2026-04-26 13:00:42.195724+03
358	97	تم استلام الدفعة الأولى	تم استلام دفعة بقيمة 10 من العميل موسي	success	quotation	15	f	2026-04-13 09:11:49.859323+02	2026-04-28 08:40:41.093323+03
367	97	تم تعيين مدير مشروع	تم تعيين مجدي موسي مديرًا لمشروع "مشروع موسي"	info	project	12	f	2026-04-13 18:29:27.921677+02	2026-04-28 08:40:41.093323+03
369	97	تم تعيين مدير مشروع	تم تعيين مجدي موسي مديرًا لمشروع "مشروع موسي"	info	project	12	f	2026-04-13 18:30:18.485885+02	2026-04-28 08:40:41.093323+03
371	97	تم تعيين مدير مشروع	تم تعيين مجدي موسي مديرًا لمشروع "مشروع موسي"	info	project	12	f	2026-04-13 18:43:30.947727+02	2026-04-28 08:40:41.093323+03
379	97	موظف جديد	تم إضافة موظف جديد: عبدو مم موسي — الدور: project_manager	info	employee	36	f	2026-04-14 07:21:57.595171+02	2026-04-28 08:40:41.093323+03
382	97	تم صرف مواد من المخزون	تم صرف 1 أصناف لمشروع "مشروع موسي"	info	project	12	f	2026-04-14 07:26:41.084224+02	2026-04-28 08:40:41.093323+03
383	97	تم صرف مواد من المخزون	تم صرف 1 أصناف لمشروع "مشروع موسي"	info	project	12	f	2026-04-14 07:27:12.44783+02	2026-04-28 08:40:41.093323+03
384	97	تم صرف مواد من المخزون	تم صرف 1 أصناف لمشروع "مشروع موسي"	info	project	12	f	2026-04-14 07:29:12.630396+02	2026-04-28 08:40:41.093323+03
387	97	مهمة مكتملة	تم اكتمال المهمة: "gh" في مشروع "مشروع موسي"	success	task	18	f	2026-04-14 08:09:47.066415+02	2026-04-28 08:40:41.093323+03
388	97	تم تعيين فريق المشروع	تم تعيين 0 موظفين في مشروع "مشروع موسي"	info	project	12	f	2026-04-14 08:10:04.833351+02	2026-04-28 08:40:41.093323+03
389	97	تم صرف مواد من المخزون	تم صرف 1 أصناف لمشروع "مشروع موسي"	info	project	12	f	2026-04-14 08:11:02.502553+02	2026-04-28 08:40:41.093323+03
390	97	تم صرف مواد من المخزون	تم صرف 1 أصناف لمشروع "مشروع موسي"	info	project	12	f	2026-04-14 08:11:27.710733+02	2026-04-28 08:40:41.093323+03
598	120	موظف جديد	تم إضافة موسي  مجدي — engineer — EMP-0043	info	employee	59	f	2026-04-28 20:43:28.930365+03	\N
599	97	موظف جديد	تم إضافة موظف جديد: موسي  مجدي — الدور: engineer	info	employee	59	f	2026-04-28 20:43:28.956926+03	\N
620	97	تم إزالة مهندس المعاينة	تم إزالة مهندس المعاينة من العميل: محمد جمال 	warning	lead	30	f	2026-05-03 18:01:28.986899+03	\N
643	97	تم صرف مواد من المخزون	تم صرف 1 أصناف لمشروع "مشروع محمد جمال "	info	project	13	f	2026-05-03 20:30:46.764694+03	\N
666	97	طلب إجازة جديد بانتظار مراجعتك	الموظف/ة: hopa pop — النوع: إجازة سنوية — المدة: 4 يوم (2026-05-26 → 2026-05-31)	warning	leave_request	5	f	2026-05-04 20:12:52.654988+03	\N
675	97	تمت الموافقة المالية على عرض السعر	عرض سعر العميل محمدد جمال  تمت الموافقة عليه مالياً — بانتظار موافقتكم	warning	quotation	17	f	2026-05-05 17:40:10.803559+03	2026-05-05 17:40:26.226808+03
688	154	تم تعيينك كمدير مشروع	تم تعيينك كمدير لمشروع: مشروع محمدد جمال  - يرجى مراجعة المعاينة الهندسية وتشكيل الفريق	info	project	14	f	2026-05-06 14:58:49.163573+03	\N
689	97	تم تعيين مدير مشروع	تم تعيين جمي جمال مديرًا لمشروع "مشروع محمدد جمال "	info	project	14	f	2026-05-06 14:58:49.168225+03	\N
699	97	مهمة مكتملة	تم اكتمال المهمة: "f" في مشروع "مشروع محمدد جمال "	success	task	28	f	2026-05-06 15:07:29.984499+03	\N
705	97	طلب إجازة جديد بانتظار مراجعتك	الموظف/ة: hopa pop — النوع: إجازة مرضية — المدة: 5 يوم (2026-06-01 → 2026-06-07)	warning	leave_request	6	f	2026-05-06 22:55:33.453573+03	\N
706	152	تمت الموافقة على إجازتك ✅	تمت الموافقة على طلب إجازة مرضية بتاعك (5 يوم: Mon Jun 01 → Sun Jun 07) من قِبَل مدير الموارد البشرية 	success	leave_request	6	f	2026-05-06 23:04:56.081548+03	2026-05-06 23:05:47.230267+03
707	81	تم تعيينك كمدير مشروع	تم تعيينك كمدير لمشروع: مشروع شركة  الموس والبوب للستراد والتصدير وا لدعايه ولاعان والبرمجه والتكنولوجيا والتعسيل  والتسقيع - يرجى مراجعة المعاينة الهندسية وتشكيل الفريق	info	project	3	f	2026-05-06 23:51:32.109992+03	\N
708	97	تم تعيين مدير مشروع	تم تعيين Ahmed Mohammed مديرًا لمشروع "مشروع شركة  الموس والبوب للستراد والتصدير وا لدعايه ولاعان والبرمجه والتكنولوجيا والتعسيل  والتسقيع"	info	project	3	f	2026-05-06 23:51:32.127964+03	\N
709	123	تم تعيينك كمدير مشروع	تم تعيينك كمدير لمشروع: مشروع شركة  الموس والبوب للستراد والتصدير وا لدعايه ولاعان والبرمجه والتكنولوجيا والتعسيل  والتسقيع - يرجى مراجعة المعاينة الهندسية وتشكيل الفريق	info	project	3	f	2026-05-06 23:51:40.613762+03	\N
710	97	تم تعيين مدير مشروع	تم تعيين 11010 10101 مديرًا لمشروع "مشروع شركة  الموس والبوب للستراد والتصدير وا لدعايه ولاعان والبرمجه والتكنولوجيا والتعسيل  والتسقيع"	info	project	3	f	2026-05-06 23:51:40.618152+03	\N
712	154	تم تعيينك في مشروع	تم تعيينك في المشروع: مشروع محمدد جمال 	info	project	14	f	2026-05-07 00:23:09.431169+03	\N
713	152	تم تعيينك في مشروع	تم تعيينك في المشروع: مشروع محمدد جمال 	info	project	14	f	2026-05-07 00:23:09.434291+03	\N
714	97	تم تعيين فريق المشروع	تم تعيين 2 موظفين في مشروع "مشروع محمدد جمال "	info	project	14	f	2026-05-07 00:23:09.436667+03	\N
715	154	تم تعيينك في مشروع	تم تعيينك في المشروع: مشروع محمدد جمال 	info	project	14	f	2026-05-07 00:23:36.378874+03	\N
487	118	✅ تمت الموافقة على أمر الشراء	تمت الموافقة المالية على أمر الشراء رقم "PO-0016" لمشروع "مشروع موسي". يمكن الآن إرساله للمورد.	success	purchase_order	22	f	2026-04-20 15:05:59.513437+02	2026-04-26 13:00:42.195724+03
490	118	✅ تمت الموافقة على أمر الشراء	تمت الموافقة المالية على أمر الشراء رقم "PO-0015" لمشروع "مشروع موسي". يمكن الآن إرساله للمورد.	success	purchase_order	21	f	2026-04-20 15:08:49.793989+02	2026-04-26 13:00:42.195724+03
494	118	✅ تمت الموافقة على أمر الشراء	تمت الموافقة المالية على أمر الشراء رقم "PO-0017" لمشروع "مشروع موسي". يمكن الآن إرساله للمورد.	success	purchase_order	23	f	2026-04-20 15:23:21.380048+02	2026-04-26 13:00:42.195724+03
498	118	✅ تمت الموافقة على أمر الشراء	تمت الموافقة المالية على أمر الشراء رقم "PO-0018" لمشروع "مشروع موسي". يمكن الآن إرساله للمورد.	success	purchase_order	24	f	2026-04-20 19:13:17.324337+02	2026-04-26 13:00:42.195724+03
502	118	✅ تمت الموافقة على أمر الشراء	تمت الموافقة المالية على أمر الشراء رقم "PO-0019" لمشروع "مشروع موسي". يمكن الآن إرساله للمورد.	success	purchase_order	25	f	2026-04-20 19:16:57.498415+02	2026-04-26 13:00:42.195724+03
505	118	✅ تمت الموافقة على أمر الشراء	تمت الموافقة المالية على أمر الشراء رقم "PO-0008" لمشروع "مشروع موسي". يمكن الآن إرساله للمورد.	success	purchase_order	14	f	2026-04-22 11:17:37.947487+02	2026-04-26 13:00:42.195724+03
508	118	✅ تمت الموافقة على أمر الشراء	تمت الموافقة المالية على أمر الشراء رقم "PO-0005" لمشروع "مشروع موسي". يمكن الآن إرساله للمورد.	success	purchase_order	7	f	2026-04-22 14:27:50.892323+02	2026-04-26 13:00:42.195724+03
511	118	✅ تمت الموافقة على أمر الشراء	تمت الموافقة المالية على أمر الشراء رقم "PO-0004" لمشروع "مشروع موسي". يمكن الآن إرساله للمورد.	success	purchase_order	6	f	2026-04-22 14:51:39.489244+02	2026-04-26 13:00:42.195724+03
483	97	تمت الموافقة على أمر شراء	تمت الموافقة على أمر شراء رقم "PO-0013" لمشروع "مشروع موسي" بمبلغ 114.77 ريال	info	purchase_order	19	f	2026-04-20 14:37:35.367749+02	2026-04-28 08:40:41.093323+03
488	97	تمت الموافقة على أمر شراء	تمت الموافقة على أمر شراء رقم "PO-0016" لمشروع "مشروع موسي" بمبلغ 11.49 ريال	info	purchase_order	22	f	2026-04-20 15:05:59.518851+02	2026-04-28 08:40:41.093323+03
491	97	تمت الموافقة على أمر شراء	تمت الموافقة على أمر شراء رقم "PO-0015" لمشروع "مشروع موسي" بمبلغ 11.50 ريال	info	purchase_order	21	f	2026-04-20 15:08:49.800921+02	2026-04-28 08:40:41.093323+03
517	84	تم إنشاء صندوق عهد جديد	تم إنشاء صندوق عهد للمهندس "عبد الرحمن عهده مشروع موسي " بمبلغ 2000 ريال	info	petty_cash_fund	10	f	2026-04-22 17:02:37.639364+02	2026-04-23 10:10:23.930436+02
518	84	تم إنشاء صندوق عهد جديد	تم إنشاء صندوق عهد للمهندس "تت" بمبلغ 30 ريال	info	petty_cash_fund	11	f	2026-04-22 17:07:31.257254+02	2026-04-23 10:10:23.930436+02
621	120	موظف جديد	تم إضافة hopa pop — engineer — EMP-0045	info	employee	61	f	2026-05-03 18:15:20.320369+03	\N
473	95	أمر شراء جاهز للإرسال	تمت الموافقة المالية على أمر الشراء رقم "PO-0012". يرجى إرساله للمورد: Saudi Solar Solutions	warning	purchase_order	18	f	2026-04-20 14:26:48.242295+02	2026-04-26 12:44:27.580287+03
476	95	أمر شراء جاهز للإرسال	تمت الموافقة المالية على أمر الشراء رقم "PO-0002". يرجى إرساله للمورد: Mosa Elwayly	warning	purchase_order	4	f	2026-04-20 14:26:55.465142+02	2026-04-26 12:44:27.580287+03
477	95	طلب شراء جديد	تم إنشاء طلب شراء جديد PO-0013 من مدير المشروع - مشروع #12	info	purchase_order	19	f	2026-04-20 14:29:53.057432+02	2026-04-26 12:44:27.580287+03
478	95	طلب شراء جديد	تم إنشاء طلب شراء جديد PO-0014 من مدير المشروع - مشروع #12	info	purchase_order	20	f	2026-04-20 14:30:42.822274+02	2026-04-26 12:44:27.580287+03
481	95	أمر شراء جاهز للإرسال	تمت الموافقة المالية على أمر الشراء رقم "PO-0014". يرجى إرساله للمورد: Mosa Elwayly	warning	purchase_order	20	f	2026-04-20 14:31:39.140408+02	2026-04-26 12:44:27.580287+03
484	95	أمر شراء جاهز للإرسال	تمت الموافقة المالية على أمر الشراء رقم "PO-0013". يرجى إرساله للمورد: Mosa Elwayly	warning	purchase_order	19	f	2026-04-20 14:37:35.370163+02	2026-04-26 12:44:27.580287+03
485	95	طلب شراء جديد	تم إنشاء طلب شراء جديد PO-0015 من مدير المشروع - مشروع #12	info	purchase_order	21	f	2026-04-20 14:38:53.224893+02	2026-04-26 12:44:27.580287+03
486	95	طلب شراء جديد	تم إنشاء طلب شراء جديد PO-0016 من مدير المشروع - مشروع #12	info	purchase_order	22	f	2026-04-20 15:04:55.977234+02	2026-04-26 12:44:27.580287+03
489	95	أمر شراء جاهز للإرسال	تمت الموافقة المالية على أمر الشراء رقم "PO-0016". يرجى إرساله للمورد: Mosa Elwayly	warning	purchase_order	22	f	2026-04-20 15:05:59.52066+02	2026-04-26 12:44:27.580287+03
492	95	أمر شراء جاهز للإرسال	تمت الموافقة المالية على أمر الشراء رقم "PO-0015". يرجى إرساله للمورد: Mosa Elwayly	warning	purchase_order	21	f	2026-04-20 15:08:49.802304+02	2026-04-26 12:44:27.580287+03
493	95	طلب شراء جديد	تم إنشاء طلب شراء جديد PO-0017 من مدير المشروع - مشروع #12	info	purchase_order	23	f	2026-04-20 15:17:38.720609+02	2026-04-26 12:44:27.580287+03
496	95	أمر شراء جاهز للإرسال	تمت الموافقة المالية على أمر الشراء رقم "PO-0017". يرجى إرساله للمورد: Mosa Elwayly	warning	purchase_order	23	f	2026-04-20 15:23:21.385288+02	2026-04-26 12:44:27.580287+03
497	95	طلب شراء جديد	تم إنشاء طلب شراء جديد PO-0018 من مدير المشروع - مشروع #12	info	purchase_order	24	f	2026-04-20 19:12:34.176653+02	2026-04-26 12:44:27.580287+03
500	95	أمر شراء جاهز للإرسال	تمت الموافقة المالية على أمر الشراء رقم "PO-0018". يرجى إرساله للمورد: Mosa Elwayly	warning	purchase_order	24	f	2026-04-20 19:13:17.329369+02	2026-04-26 12:44:27.580287+03
501	95	طلب شراء جديد	تم إنشاء طلب شراء جديد PO-0019 من مدير المشروع - مشروع #12	info	purchase_order	25	f	2026-04-20 19:16:28.034942+02	2026-04-26 12:44:27.580287+03
504	95	أمر شراء جاهز للإرسال	تمت الموافقة المالية على أمر الشراء رقم "PO-0019". يرجى إرساله للمورد: Mosa Elwayly	warning	purchase_order	25	f	2026-04-20 19:16:57.503394+02	2026-04-26 12:44:27.580287+03
507	95	أمر شراء جاهز للإرسال	تمت الموافقة المالية على أمر الشراء رقم "PO-0008". يرجى إرساله للمورد: Saudi Solar Solutions	warning	purchase_order	14	f	2026-04-22 11:17:37.966806+02	2026-04-26 12:44:27.580287+03
510	95	أمر شراء جاهز للإرسال	تمت الموافقة المالية على أمر الشراء رقم "PO-0005". يرجى إرساله للمورد: Saudi Solar Solutions	warning	purchase_order	7	f	2026-04-22 14:27:50.898495+02	2026-04-26 12:44:27.580287+03
513	95	أمر شراء جاهز للإرسال	تمت الموافقة المالية على أمر الشراء رقم "PO-0004". يرجى إرساله للمورد: Saudi Solar Solutions	warning	purchase_order	6	f	2026-04-22 14:51:39.494999+02	2026-04-26 12:44:27.580287+03
516	95	أمر شراء جاهز للإرسال	تمت الموافقة المالية على أمر الشراء رقم "PO-0003". يرجى إرساله للمورد: Saudi Solar Solutions	warning	purchase_order	5	f	2026-04-22 15:02:32.846376+02	2026-04-26 12:44:27.580287+03
519	95	طلب شراء جديد	تم إنشاء طلب شراء جديد PO-0020 من مدير المشروع - مشروع #12	info	purchase_order	26	f	2026-04-26 12:38:16.229296+03	2026-04-26 12:44:27.580287+03
522	95	أمر شراء جاهز للإرسال	تمت الموافقة المالية على أمر الشراء رقم "PO-0020". يرجى إرساله للمورد: Mosa Elwayly	warning	purchase_order	26	f	2026-04-26 12:39:18.870254+03	2026-04-26 12:44:27.580287+03
514	118	✅ تمت الموافقة على أمر الشراء	تمت الموافقة المالية على أمر الشراء رقم "PO-0003" لمشروع "مشروع موسي". يمكن الآن إرساله للمورد.	success	purchase_order	5	f	2026-04-22 15:02:32.833794+02	2026-04-26 13:00:42.195724+03
520	118	✅ تمت الموافقة على أمر الشراء	تمت الموافقة المالية على أمر الشراء رقم "PO-0020" لمشروع "مشروع موسي". يمكن الآن إرساله للمورد.	success	purchase_order	26	f	2026-04-26 12:39:18.865665+03	2026-04-26 13:00:42.195724+03
523	95	طلب شراء جديد	تم إنشاء طلب شراء جديد PO-0021 من مدير المشروع - مشروع #12	info	purchase_order	27	f	2026-04-26 13:01:15.024126+03	\N
524	95	طلب شراء جديد	تم إنشاء طلب شراء جديد PO-0022 من مدير المشروع - مشروع #12	info	purchase_order	28	f	2026-04-26 13:01:31.41019+03	\N
525	95	طلب شراء جديد	تم إنشاء طلب شراء جديد PO-0023 من مدير المشروع - مشروع #12	info	purchase_order	29	f	2026-04-26 13:01:42.092198+03	2026-04-26 13:01:52.45611+03
526	118	✅ تمت الموافقة على أمر الشراء	تمت الموافقة المالية على أمر الشراء رقم "PO-0023" لمشروع "مشروع موسي". يمكن الآن إرساله للمورد.	success	purchase_order	29	f	2026-04-26 13:02:20.813726+03	\N
515	97	تمت الموافقة على أمر شراء	تمت الموافقة على أمر شراء رقم "PO-0003" لمشروع "مشروع موسي" بمبلغ 977.50 ريال	info	purchase_order	5	f	2026-04-22 15:02:32.844266+02	2026-04-28 08:40:41.093323+03
622	97	موظف جديد	تم إضافة موظف جديد: hopa pop — الدور: engineer	info	employee	61	f	2026-05-03 18:15:20.348707+03	\N
645	97	تم صرف مواد من المخزون	تم صرف 1 أصناف لمشروع "مشروع محمد جمال "	info	project	13	f	2026-05-04 09:49:04.495255+03	\N
528	95	أمر شراء جاهز للإرسال	تمت الموافقة المالية على أمر الشراء رقم "PO-0023". يرجى إرساله للمورد: Mosa Elwayly	warning	purchase_order	29	f	2026-04-26 13:02:20.821866+03	\N
529	118	✅ تمت الموافقة على أمر الشراء	تمت الموافقة المالية على أمر الشراء رقم "PO-0022" لمشروع "مشروع موسي". يمكن الآن إرساله للمورد.	success	purchase_order	28	f	2026-04-26 13:35:13.848357+03	\N
531	95	أمر شراء جاهز للإرسال	تمت الموافقة المالية على أمر الشراء رقم "PO-0022". يرجى إرساله للمورد: Mosa Elwayly	warning	purchase_order	28	f	2026-04-26 13:35:13.864016+03	\N
532	95	طلب شراء جديد	تم إنشاء طلب شراء جديد PO-0024 من مدير المشروع - مشروع #12	info	purchase_order	30	f	2026-04-26 13:36:29.910867+03	\N
533	95	طلب شراء جديد	تم إنشاء طلب شراء جديد PO-0025 من مدير المشروع - مشروع #12	info	purchase_order	31	f	2026-04-26 13:51:22.789252+03	2026-04-26 13:51:32.269603+03
534	95	طلب شراء جديد	تم إنشاء طلب شراء جديد PO-0026 من مدير المشروع - مشروع #12	info	purchase_order	32	f	2026-04-26 14:04:18.570707+03	\N
535	95	طلب شراء جديد	تم إنشاء طلب شراء جديد PO-0027 من مدير المشروع - مشروع #12	info	purchase_order	33	f	2026-04-26 14:06:59.353721+03	\N
536	118	✅ تمت الموافقة على أمر الشراء	تمت الموافقة المالية على أمر الشراء رقم "PO-0025" لمشروع "مشروع موسي". يمكن الآن إرساله للمورد.	success	purchase_order	31	f	2026-04-26 14:21:03.52056+03	\N
624	97	تم تعيين مهندس معاينة	تم تعيين مهندس لمعاينة العميل: محمد جمال 	info	lead	30	f	2026-05-03 18:17:03.261531+03	\N
538	95	أمر شراء جاهز للإرسال	تمت الموافقة المالية على أمر الشراء رقم "PO-0025". يرجى إرساله للمورد: Mosa Elwayly	warning	purchase_order	31	f	2026-04-26 14:21:03.525615+03	\N
539	118	✅ تمت الموافقة على أمر الشراء	تمت الموافقة المالية على أمر الشراء رقم "PO-0027" لمشروع "مشروع موسي". يمكن الآن إرساله للمورد.	success	purchase_order	33	f	2026-04-26 14:28:07.742347+03	\N
623	152	مهمة معاينة جديدة	تم تعيينك لمعاينة العميل: محمد جمال 	info	lead	30	f	2026-05-03 18:17:03.25727+03	2026-05-03 18:18:24.471454+03
541	95	أمر شراء جاهز للإرسال	تمت الموافقة المالية على أمر الشراء رقم "PO-0027". يرجى إرساله للمورد: Mosa Elwayly	warning	purchase_order	33	f	2026-04-26 14:28:07.747647+03	\N
542	118	✅ تمت الموافقة على أمر الشراء	تمت الموافقة المالية على أمر الشراء رقم "PO-0026" لمشروع "مشروع موسي". يمكن الآن إرساله للمورد.	success	purchase_order	32	f	2026-04-26 14:33:26.148948+03	\N
544	95	أمر شراء جاهز للإرسال	تمت الموافقة المالية على أمر الشراء رقم "PO-0026". يرجى إرساله للمورد: Mosa Elwayly	warning	purchase_order	32	f	2026-04-26 14:33:26.153681+03	\N
545	118	✅ تمت الموافقة على أمر الشراء	تمت الموافقة المالية على أمر الشراء رقم "PO-0024" لمشروع "مشروع موسي". يمكن الآن إرساله للمورد.	success	purchase_order	30	f	2026-04-26 14:35:22.568455+03	\N
646	95	طلب شراء جديد	تم إنشاء طلب شراء جديد PO-0030 من مدير المشروع - مشروع #13	info	purchase_order	36	f	2026-05-04 09:50:15.67322+03	2026-05-04 09:50:42.192656+03
547	95	أمر شراء جاهز للإرسال	تمت الموافقة المالية على أمر الشراء رقم "PO-0024". يرجى إرساله للمورد: Mosa Elwayly	warning	purchase_order	30	f	2026-04-26 14:35:22.57419+03	\N
665	120	طلب إجازة جديد بانتظار مراجعتك	الموظف/ة: hopa pop — النوع: إجازة سنوية — المدة: 4 يوم (2026-05-26 → 2026-05-31)	warning	leave_request	5	f	2026-05-04 20:12:52.652175+03	2026-05-04 20:13:25.489702+03
550	95	أمر شراء جاهز للإرسال	تمت الموافقة المالية على أمر الشراء رقم "PO-0021". يرجى إرساله للمورد: Mosa Elwayly	warning	purchase_order	27	f	2026-04-26 15:09:15.956329+03	\N
554	95	أمر شراء جاهز للإرسال	تمت الموافقة المالية على أمر الشراء رقم "PO-0028". يرجى إرساله للمورد: Mosa Elwayly	warning	purchase_order	34	f	2026-04-26 15:13:02.361836+03	\N
555	95	طلب شراء جديد	تم إنشاء طلب شراء جديد PO-0029 من مدير المشروع - مشروع #12	info	purchase_order	35	f	2026-04-26 18:08:48.636636+03	2026-04-26 18:09:01.848264+03
551	95	طلب شراء جديد	تم إنشاء طلب شراء جديد PO-0028 من مدير المشروع - مشروع #12	info	purchase_order	34	f	2026-04-26 15:12:37.375534+03	2026-04-26 18:35:35.855708+03
556	118	✅ تمت الموافقة على أمر الشراء	تمت الموافقة المالية على أمر الشراء رقم "PO-0029" لمشروع "مشروع موسي". يمكن الآن إرساله للمورد.	success	purchase_order	35	f	2026-04-26 18:10:19.719825+03	2026-04-26 19:34:21.893685+03
552	118	✅ تمت الموافقة على أمر الشراء	تمت الموافقة المالية على أمر الشراء رقم "PO-0028" لمشروع "مشروع موسي". يمكن الآن إرساله للمورد.	success	purchase_order	34	f	2026-04-26 15:13:02.35937+03	2026-04-26 19:34:29.020733+03
548	118	✅ تمت الموافقة على أمر الشراء	تمت الموافقة المالية على أمر الشراء رقم "PO-0021" لمشروع "مشروع موسي". يمكن الآن إرساله للمورد.	success	purchase_order	27	f	2026-04-26 15:09:15.951572+03	2026-04-26 19:34:33.72499+03
527	97	تمت الموافقة على أمر شراء	تمت الموافقة على أمر شراء رقم "PO-0023" لمشروع "مشروع موسي" بمبلغ 80.50 ريال	info	purchase_order	29	f	2026-04-26 13:02:20.818347+03	2026-04-28 08:40:41.093323+03
677	113	تم إرسال عرض السعر للعميل	تم إرسال عرض السعر للعميل محمدد جمال 	success	quotation	17	f	2026-05-05 17:44:23.895994+03	\N
678	97	تم إرسال عرض السعر للعميل	عرض السعر للعميل محمدد جمال  بانتظار الرد	info	quotation	17	f	2026-05-05 17:44:23.898436+03	\N
680	97	مشروع جديد تلقائي 🎉	وافق العميل على العرض - تم إنشاء مشروع "مشروع محمدد جمال "	success	project	14	f	2026-05-05 17:45:21.015381+03	\N
679	87	مشروع جديد جاهز للتعيين	يرجى تعيين مدير لمشروع "مشروع محمدد جمال "	info	project	14	f	2026-05-05 17:45:21.015381+03	2026-05-06 14:35:43.196971+03
558	95	أمر شراء جاهز للإرسال	تمت الموافقة المالية على أمر الشراء رقم "PO-0029". يرجى إرساله للمورد: Mosa Elwayly	warning	purchase_order	35	f	2026-04-26 18:10:19.726714+03	2026-04-26 18:35:31.825811+03
560	120	موظف جديد	تم إضافة mosa magdy — engineer — EMP-0017	info	employee	38	f	2026-04-27 11:23:12.577163+03	2026-04-27 11:24:27.242369+03
564	120	موظف جديد	تم إضافة 11010 10101 — engineer — EMP-0018	info	employee	40	f	2026-04-27 11:59:34.921915+03	\N
562	120	موظف جديد	تم إضافة لالالالا لالا — engineer — EMP-0018	info	employee	39	f	2026-04-27 11:28:50.026085+03	2026-04-27 12:02:53.289989+03
566	120	موظف جديد	تم إضافة 000 000 — engineer — EMP-0020	info	employee	42	f	2026-04-27 12:58:49.297012+03	\N
568	120	موظف جديد	تم إضافة 0101 10 — engineer — EMP-0021	info	employee	43	f	2026-04-27 13:27:33.000444+03	\N
625	84	عرض سعر بانتظار المراجعة المالية	العميل محمد جمال  — يرجى مراجعة عرض السعر والموافقة	warning	quotation	16	f	2026-05-03 18:23:20.40261+03	2026-05-03 18:24:58.01349+03
570	120	موظف جديد	تم إضافة 10 10 — engineer — EMP-0022	info	employee	44	f	2026-04-27 13:53:52.320553+03	\N
648	154	✅ تمت الموافقة على أمر الشراء	تمت الموافقة المالية على أمر الشراء رقم "PO-0030" لمشروع "مشروع محمد جمال ". يمكن الآن إرساله للمورد.	success	purchase_order	36	f	2026-05-04 10:08:27.139056+03	\N
572	120	موظف جديد	تم إضافة 3 3 — engineer — EMP-0023	info	employee	45	f	2026-04-27 14:07:07.440628+03	\N
649	97	تمت الموافقة على أمر شراء	تمت الموافقة على أمر شراء رقم "PO-0030" لمشروع "مشروع محمد جمال " بمبلغ 575.00 ريال	info	purchase_order	36	f	2026-05-04 10:08:27.142438+03	\N
574	120	موظف جديد	تم إضافة 00.. ........ — engineer — EMP-0024	info	employee	46	f	2026-04-27 14:12:15.040572+03	\N
650	95	أمر شراء جاهز للإرسال	تمت الموافقة المالية على أمر الشراء رقم "PO-0030". يرجى إرساله للمورد: Mosa Elwayly	warning	purchase_order	36	f	2026-05-04 10:08:27.143426+03	\N
576	120	موظف جديد	تم إضافة 111 111 — engineer — EMP-0025	info	employee	47	f	2026-04-27 14:47:14.921936+03	\N
667	152	تم رفض طلب إجازتك ❌	رفض مدير الموارد البشرية  طلب إجازة سنوية بتاعك — السبب: gh	danger	leave_request	5	f	2026-05-04 20:13:35.295926+03	\N
578	120	موظف جديد	تم إضافة 30 30 — engineer — EMP-0026	info	employee	48	f	2026-04-27 19:46:17.672296+03	\N
580	120	موظف جديد	تم إضافة 300 300 — engineer — EMP-0027	info	employee	49	f	2026-04-27 20:41:13.741972+03	\N
690	152	تم تعيينك في مشروع	تم تعيينك في المشروع: مشروع محمدد جمال 	info	project	14	f	2026-05-06 15:00:40.328461+03	\N
582	120	موظف جديد	تم إضافة 5 5 — engineer — EMP-0028	info	employee	50	f	2026-04-27 21:10:59.60091+03	\N
691	97	تم تعيين فريق المشروع	تم تعيين 1 موظفين في مشروع "مشروع محمدد جمال "	info	project	14	f	2026-05-06 15:00:40.334341+03	\N
584	120	موظف جديد	تم إضافة 10 10 — engineer — EMP-0029	info	employee	51	f	2026-04-27 21:13:23.859483+03	\N
586	120	موظف جديد	تم إضافة 010101 010101 — engineer — EMP-0030	info	employee	52	f	2026-04-27 21:15:03.976834+03	\N
587	97	موظف جديد	تم إضافة موظف جديد: 010101 010101 — الدور: engineer	info	employee	52	f	2026-04-27 21:15:03.982964+03	2026-04-28 08:40:34.807336+03
585	97	موظف جديد	تم إضافة موظف جديد: 10 10 — الدور: engineer	info	employee	51	f	2026-04-27 21:13:23.865698+03	2026-04-28 08:40:38.324929+03
300	97	تمت الموافقة المالية على عرض السعر	عرض سعر العميل عبدو  تمت الموافقة عليه مالياً — بانتظار موافقتكم	warning	quotation	11	f	2026-04-12 17:46:41.320266+02	2026-04-28 08:40:41.093323+03
301	97	عميل جديد	عبدو2	info	lead	25	f	2026-04-12 17:53:37.866804+02	2026-04-28 08:40:41.093323+03
304	97	تم تعيين مندوب مبيعات	تم تعيين مندوب مبيعات للعميل: عبدو2	info	lead	25	f	2026-04-12 17:53:46.20835+02	2026-04-28 08:40:41.093323+03
306	97	تم تعيين مهندس معاينة	تم تعيين مهندس لمعاينة العميل: عبدو2	info	lead	25	f	2026-04-12 17:53:48.743847+02	2026-04-28 08:40:41.093323+03
311	97	تم إرسال عرض السعر للعميل	عرض السعر للعميل عبدو2 بانتظار الرد	info	quotation	12	f	2026-04-12 18:04:44.518284+02	2026-04-28 08:40:41.093323+03
312	97	عميل جديد	عبدو3	info	lead	26	f	2026-04-12 18:16:46.844469+02	2026-04-28 08:40:41.093323+03
315	97	تم تعيين مندوب مبيعات	تم تعيين مندوب مبيعات للعميل: عبدو3	info	lead	26	f	2026-04-12 18:16:56.165983+02	2026-04-28 08:40:41.093323+03
317	97	تم تعيين مهندس معاينة	تم تعيين مهندس لمعاينة العميل: عبدو3	info	lead	26	f	2026-04-12 18:16:58.567329+02	2026-04-28 08:40:41.093323+03
322	97	تم إرسال عرض السعر للعميل	عرض السعر للعميل عبدو3 بانتظار الرد	info	quotation	13	f	2026-04-12 18:19:48.249314+02	2026-04-28 08:40:41.093323+03
328	97	تم تعيين مهندس معاينة	تم تعيين مهندس لمعاينة العميل: موسي 1 	info	lead	27	f	2026-04-13 07:44:29.465493+02	2026-04-28 08:40:41.093323+03
330	97	تم قبول عرض السعر من العميل	العميل وافق على العرض - يمكن تحويله لمشروع	success	quotation	13	f	2026-04-13 07:56:51.59817+02	2026-04-28 08:40:41.093323+03
335	97	تم إرسال عرض السعر للعميل	عرض السعر للعميل موسي 1  بانتظار الرد	info	quotation	14	f	2026-04-13 08:02:44.137432+02	2026-04-28 08:40:41.093323+03
557	97	تمت الموافقة على أمر شراء	تمت الموافقة على أمر شراء رقم "PO-0029" لمشروع "مشروع موسي" بمبلغ 57.50 ريال	info	purchase_order	35	f	2026-04-26 18:10:19.724822+03	2026-04-28 08:40:41.093323+03
559	97	تم صرف مواد من المخزون	تم صرف 1 أصناف لمشروع "مشروع موسي"	info	project	12	f	2026-04-26 20:40:16.086581+03	2026-04-28 08:40:41.093323+03
561	97	موظف جديد	تم إضافة موظف جديد: mosa magdy — الدور: engineer	info	employee	38	f	2026-04-27 11:23:12.610809+03	2026-04-28 08:40:41.093323+03
563	97	موظف جديد	تم إضافة موظف جديد: لالالالا لالا — الدور: engineer	info	employee	39	f	2026-04-27 11:28:50.03218+03	2026-04-28 08:40:41.093323+03
565	97	موظف جديد	تم إضافة موظف جديد: 11010 10101 — الدور: engineer	info	employee	40	f	2026-04-27 11:59:34.928419+03	2026-04-28 08:40:41.093323+03
700	152	تم تعيينك كمدير مشروع	تم تعيينك كمدير لمشروع: مشروع محمدد جمال  - يرجى مراجعة المعاينة الهندسية وتشكيل الفريق	info	project	14	f	2026-05-06 15:42:24.080447+03	\N
719	97	عميل جديد	محمد جمال	info	lead	32	f	2026-05-07 12:12:48.641164+03	\N
721	97	عميل جديد	محمد جمال	info	lead	34	f	2026-05-07 12:26:29.660249+03	\N
728	82	تم تعيينك على عميل محتمل	تم تعيينك على العميل: fdff	info	lead	36	f	2026-05-07 13:17:26.898462+03	\N
393	97	مهمة جديدة في المشاريع	تم إنشاء مهمة "تركيب" في مشروع "مشروع موسي"	info	task	20	f	2026-04-14 08:12:18.762428+02	2026-04-28 08:40:41.093323+03
395	97	مهمة مكتملة	تم اكتمال المهمة: "تركيب" في مشروع "مشروع موسي"	success	task	20	f	2026-04-14 08:12:41.863229+02	2026-04-28 08:40:41.093323+03
398	97	مهمة جديدة في المشاريع	تم إنشاء مهمة "لرررر" في مشروع "مشروع موسي"	info	task	21	f	2026-04-14 08:13:20.055295+02	2026-04-28 08:40:41.093323+03
401	97	مهمة جديدة في المشاريع	تم إنشاء مهمة "وة" في مشروع "مشروع موسي"	info	task	22	f	2026-04-14 08:15:35.703385+02	2026-04-28 08:40:41.093323+03
403	97	مهمة مكتملة	تم اكتمال المهمة: "وة" في مشروع "مشروع موسي"	success	task	22	f	2026-04-14 08:15:51.180175+02	2026-04-28 08:40:41.093323+03
406	97	مهمة جديدة في المشاريع	تم إنشاء مهمة "ببب" في مشروع "مشروع موسي"	info	task	23	f	2026-04-14 08:16:45.168364+02	2026-04-28 08:40:41.093323+03
408	97	مهمة مكتملة	تم اكتمال المهمة: "ببب" في مشروع "مشروع موسي"	success	task	23	f	2026-04-14 08:18:10.096455+02	2026-04-28 08:40:41.093323+03
409	97	عميل جديد	لا	info	lead	29	f	2026-04-14 08:44:25.041447+02	2026-04-28 08:40:41.093323+03
410	97	تم صرف مواد من المخزون	تم صرف 1 أصناف لمشروع "مشروع موسي"	info	project	12	f	2026-04-14 08:57:21.157319+02	2026-04-28 08:40:41.093323+03
412	97	تم تعيين فريق المشروع	تم تعيين 0 موظفين في مشروع "مشروع موسي"	info	project	12	f	2026-04-14 13:08:28.220191+02	2026-04-28 08:40:41.093323+03
413	97	تم تعيين فريق المشروع	تم تعيين 0 موظفين في مشروع "مشروع موسي"	info	project	12	f	2026-04-14 13:08:42.438413+02	2026-04-28 08:40:41.093323+03
414	97	تم تعيين فريق المشروع	تم تعيين 0 موظفين في مشروع "مشروع موسي"	info	project	12	f	2026-04-14 13:25:19.707077+02	2026-04-28 08:40:41.093323+03
415	97	تم تعيين فريق المشروع	تم تعيين 0 موظفين في مشروع "مشروع موسي"	info	project	12	f	2026-04-14 13:25:53.832192+02	2026-04-28 08:40:41.093323+03
416	97	تم تعيين فريق المشروع	تم تعيين 0 موظفين في مشروع "مشروع موسي"	info	project	12	f	2026-04-14 13:29:20.35422+02	2026-04-28 08:40:41.093323+03
418	97	مهمة مكتملة	تم اكتمال المهمة: "تركيب " في مشروع "مشروع موسي"	success	task	19	f	2026-04-14 13:42:09.269316+02	2026-04-28 08:40:41.093323+03
420	97	مهمة مكتملة	تم اكتمال المهمة: "تركيب " في مشروع "مشروع موسي"	success	task	19	f	2026-04-14 13:45:47.48009+02	2026-04-28 08:40:41.093323+03
422	97	مهمة مكتملة	تم اكتمال المهمة: "لرررر" في مشروع "مشروع موسي"	success	task	21	f	2026-04-14 13:45:53.304306+02	2026-04-28 08:40:41.093323+03
424	97	تم تعيين فريق المشروع	تم تعيين 1 موظفين في مشروع "مشروع موسي"	info	project	12	f	2026-04-14 13:52:57.939641+02	2026-04-28 08:40:41.093323+03
427	97	مهمة جديدة في المشاريع	تم إنشاء مهمة "gggg" في مشروع "مشروع موسي"	info	task	24	f	2026-04-14 13:55:24.072677+02	2026-04-28 08:40:41.093323+03
428	97	تم صرف مواد من المخزون	تم صرف 1 أصناف لمشروع "مشروع موسي"	info	project	12	f	2026-04-14 13:55:37.820974+02	2026-04-28 08:40:41.093323+03
430	97	مهمة مكتملة	تم اكتمال المهمة: "gggg" في مشروع "مشروع موسي"	success	task	24	f	2026-04-14 13:56:04.579233+02	2026-04-28 08:40:41.093323+03
432	97	موظف جديد	تم إضافة موظف جديد: مدير العقود  موسي — الدور: contract_dept_head	info	employee	37	f	2026-04-14 18:01:25.034843+02	2026-04-28 08:40:41.093323+03
434	97	عقد جديد تم رفعه	تم رفع عقد "CTR-1776243856959" لمشروع "مشروع موسي"	info	contract	10	f	2026-04-15 11:04:17.005451+02	2026-04-28 08:40:41.093323+03
436	97	عقد جديد تم رفعه	تم رفع عقد "CTR-1776244879587" لمشروع "مشروع موسي"	info	contract	11	f	2026-04-15 11:21:19.603529+02	2026-04-28 08:40:41.093323+03
438	97	عقد جديد تم رفعه	تم رفع عقد "CTR-1776585767649" لمشروع "مشروع موسي"	info	contract	13	f	2026-04-19 10:02:47.75077+02	2026-04-28 08:40:41.093323+03
440	97	عقد جديد تم رفعه	تم رفع عقد "CTR-1776586601431" لمشروع "مشروع موسي"	info	contract	14	f	2026-04-19 10:16:41.505569+02	2026-04-28 08:40:41.093323+03
442	97	عقد جديد تم رفعه	تم رفع عقد "CTR-1776586880824" لمشروع "مشروع موسي"	info	contract	15	f	2026-04-19 10:21:20.841201+02	2026-04-28 08:40:41.093323+03
443	97	تم صرف مواد من المخزون	تم صرف 1 أصناف لمشروع "مشروع موسي"	info	project	12	f	2026-04-19 17:47:34.745748+02	2026-04-28 08:40:41.093323+03
444	97	تم صرف مواد من المخزون	تم صرف 1 أصناف لمشروع "مشروع موسي"	info	project	12	f	2026-04-19 18:09:47.702268+02	2026-04-28 08:40:41.093323+03
445	97	تم صرف مواد من المخزون	تم صرف 1 أصناف لمشروع "مشروع موسي"	info	project	12	f	2026-04-19 19:08:58.495439+02	2026-04-28 08:40:41.093323+03
449	97	تمت الموافقة على أمر شراء	تمت الموافقة على أمر شراء رقم "PO-0007" لمشروع "مشروع موسي" بمبلغ 1.15 ريال	info	purchase_order	13	f	2026-04-20 07:05:21.326434+02	2026-04-28 08:40:41.093323+03
452	97	تمت الموافقة على أمر شراء	تمت الموافقة على أمر شراء رقم "PO-0006" لمشروع "مشروع موسي" بمبلغ 11.50 ريال	info	purchase_order	12	f	2026-04-20 07:06:18.83471+02	2026-04-28 08:40:41.093323+03
460	97	تمت الموافقة على أمر شراء	تمت الموافقة على أمر شراء رقم "PO-0009" لمشروع "مشروع موسي" بمبلغ 458.62 ريال	info	purchase_order	15	f	2026-04-20 07:52:04.255275+02	2026-04-28 08:40:41.093323+03
464	97	تمت الموافقة على أمر شراء	تمت الموافقة على أمر شراء رقم "PO-0010" لمشروع "مشروع موسي" بمبلغ 230.00 ريال	info	purchase_order	16	f	2026-04-20 12:56:41.030712+02	2026-04-28 08:40:41.093323+03
468	97	تمت الموافقة على أمر شراء	تمت الموافقة على أمر شراء رقم "PO-0011" لمشروع "مشروع موسي" بمبلغ 97.29 ريال	info	purchase_order	17	f	2026-04-20 13:27:07.170952+02	2026-04-28 08:40:41.093323+03
472	97	تمت الموافقة على أمر شراء	تمت الموافقة على أمر شراء رقم "PO-0012" لمشروع "مشروع موسي" بمبلغ 115.00 ريال	info	purchase_order	18	f	2026-04-20 14:26:48.241035+02	2026-04-28 08:40:41.093323+03
475	97	تمت الموافقة على أمر شراء	تمت الموافقة على أمر شراء رقم "PO-0002" لمشروع "مشروع موسي" بمبلغ 977.50 ريال	info	purchase_order	4	f	2026-04-20 14:26:55.463687+02	2026-04-28 08:40:41.093323+03
480	97	تمت الموافقة على أمر شراء	تمت الموافقة على أمر شراء رقم "PO-0014" لمشروع "مشروع موسي" بمبلغ 115.00 ريال	info	purchase_order	20	f	2026-04-20 14:31:39.138792+02	2026-04-28 08:40:41.093323+03
495	97	تمت الموافقة على أمر شراء	تمت الموافقة على أمر شراء رقم "PO-0017" لمشروع "مشروع موسي" بمبلغ 23.00 ريال	info	purchase_order	23	f	2026-04-20 15:23:21.38394+02	2026-04-28 08:40:41.093323+03
499	97	تمت الموافقة على أمر شراء	تمت الموافقة على أمر شراء رقم "PO-0018" لمشروع "مشروع موسي" بمبلغ 57.50 ريال	info	purchase_order	24	f	2026-04-20 19:13:17.327891+02	2026-04-28 08:40:41.093323+03
668	97	عميل جديد	محمدد جمال 	info	lead	31	f	2026-05-05 17:22:18.714365+03	\N
503	97	تمت الموافقة على أمر شراء	تمت الموافقة على أمر شراء رقم "PO-0019" لمشروع "مشروع موسي" بمبلغ 34.50 ريال	info	purchase_order	25	f	2026-04-20 19:16:57.502139+02	2026-04-28 08:40:41.093323+03
506	97	تمت الموافقة على أمر شراء	تمت الموافقة على أمر شراء رقم "PO-0008" لمشروع "مشروع موسي" بمبلغ 46.00 ريال	info	purchase_order	14	f	2026-04-22 11:17:37.965681+02	2026-04-28 08:40:41.093323+03
509	97	تمت الموافقة على أمر شراء	تمت الموافقة على أمر شراء رقم "PO-0005" لمشروع "مشروع موسي" بمبلغ 977.50 ريال	info	purchase_order	7	f	2026-04-22 14:27:50.896445+02	2026-04-28 08:40:41.093323+03
512	97	تمت الموافقة على أمر شراء	تمت الموافقة على أمر شراء رقم "PO-0004" لمشروع "مشروع موسي" بمبلغ 19550.00 ريال	info	purchase_order	6	f	2026-04-22 14:51:39.493554+02	2026-04-28 08:40:41.093323+03
521	97	تمت الموافقة على أمر شراء	تمت الموافقة على أمر شراء رقم "PO-0020" لمشروع "مشروع موسي" بمبلغ 11.50 ريال	info	purchase_order	26	f	2026-04-26 12:39:18.868532+03	2026-04-28 08:40:41.093323+03
530	97	تمت الموافقة على أمر شراء	تمت الموافقة على أمر شراء رقم "PO-0022" لمشروع "مشروع موسي" بمبلغ 161.00 ريال	info	purchase_order	28	f	2026-04-26 13:35:13.862629+03	2026-04-28 08:40:41.093323+03
537	97	تمت الموافقة على أمر شراء	تمت الموافقة على أمر شراء رقم "PO-0025" لمشروع "مشروع موسي" بمبلغ 345.00 ريال	info	purchase_order	31	f	2026-04-26 14:21:03.524519+03	2026-04-28 08:40:41.093323+03
540	97	تمت الموافقة على أمر شراء	تمت الموافقة على أمر شراء رقم "PO-0027" لمشروع "مشروع موسي" بمبلغ 34.50 ريال	info	purchase_order	33	f	2026-04-26 14:28:07.746263+03	2026-04-28 08:40:41.093323+03
543	97	تمت الموافقة على أمر شراء	تمت الموافقة على أمر شراء رقم "PO-0026" لمشروع "مشروع موسي" بمبلغ 92.00 ريال	info	purchase_order	32	f	2026-04-26 14:33:26.152626+03	2026-04-28 08:40:41.093323+03
546	97	تمت الموافقة على أمر شراء	تمت الموافقة على أمر شراء رقم "PO-0024" لمشروع "مشروع موسي" بمبلغ 575.00 ريال	info	purchase_order	30	f	2026-04-26 14:35:22.572592+03	2026-04-28 08:40:41.093323+03
549	97	تمت الموافقة على أمر شراء	تمت الموافقة على أمر شراء رقم "PO-0021" لمشروع "مشروع موسي" بمبلغ 241.50 ريال	info	purchase_order	27	f	2026-04-26 15:09:15.955223+03	2026-04-28 08:40:41.093323+03
553	97	تمت الموافقة على أمر شراء	تمت الموافقة على أمر شراء رقم "PO-0028" لمشروع "مشروع موسي" بمبلغ 1150.00 ريال	info	purchase_order	34	f	2026-04-26 15:13:02.360893+03	2026-04-28 08:40:41.093323+03
567	97	موظف جديد	تم إضافة موظف جديد: 000 000 — الدور: engineer	info	employee	42	f	2026-04-27 12:58:49.31337+03	2026-04-28 08:40:41.093323+03
569	97	موظف جديد	تم إضافة موظف جديد: 0101 10 — الدور: engineer	info	employee	43	f	2026-04-27 13:27:33.005252+03	2026-04-28 08:40:41.093323+03
571	97	موظف جديد	تم إضافة موظف جديد: 10 10 — الدور: engineer	info	employee	44	f	2026-04-27 13:53:52.327185+03	2026-04-28 08:40:41.093323+03
573	97	موظف جديد	تم إضافة موظف جديد: 3 3 — الدور: engineer	info	employee	45	f	2026-04-27 14:07:07.447864+03	2026-04-28 08:40:41.093323+03
575	97	موظف جديد	تم إضافة موظف جديد: 00.. ........ — الدور: engineer	info	employee	46	f	2026-04-27 14:12:15.047084+03	2026-04-28 08:40:41.093323+03
577	97	موظف جديد	تم إضافة موظف جديد: 111 111 — الدور: engineer	info	employee	47	f	2026-04-27 14:47:14.928114+03	2026-04-28 08:40:41.093323+03
579	97	موظف جديد	تم إضافة موظف جديد: 30 30 — الدور: engineer	info	employee	48	f	2026-04-27 19:46:17.678297+03	2026-04-28 08:40:41.093323+03
581	97	موظف جديد	تم إضافة موظف جديد: 300 300 — الدور: engineer	info	employee	49	f	2026-04-27 20:41:13.750759+03	2026-04-28 08:40:41.093323+03
583	97	موظف جديد	تم إضافة موظف جديد: 5 5 — الدور: engineer	info	employee	50	f	2026-04-27 21:10:59.607062+03	2026-04-28 08:40:41.093323+03
627	97	تمت الموافقة المالية على عرض السعر	عرض سعر العميل محمد جمال  تمت الموافقة عليه مالياً — بانتظار موافقتكم	warning	quotation	16	f	2026-05-03 19:34:30.06495+03	2026-05-03 19:35:11.702346+03
652	154	تم إنشاء مهمة جديدة	تم إنشاء مهمة جديدة في مشروع "مشروع محمد جمال ": تركيب اسلاك	warning	task	26	f	2026-05-04 10:39:23.106175+03	\N
653	97	مهمة جديدة في المشاريع	تم إنشاء مهمة "تركيب اسلاك" في مشروع "مشروع محمد جمال "	info	task	26	f	2026-05-04 10:39:23.109416+03	\N
655	97	تم تعيين فريق المشروع	تم تعيين 1 موظفين في مشروع "مشروع محمد جمال "	info	project	13	f	2026-05-04 10:39:51.452213+03	\N
651	152	تم تعيينك في مهمة جديدة	تم تعيينك في المهمة: "تركيب اسلاك" ضمن مشروع "مشروع محمد جمال "	info	task	26	f	2026-05-04 10:39:23.103886+03	2026-05-04 10:40:16.551266+03
654	152	تم تعيينك في مشروع	تم تعيينك في المشروع: مشروع محمد جمال 	info	project	13	f	2026-05-04 10:39:51.44977+03	2026-05-04 18:10:38.740644+03
682	154	تم تعيينك كمدير مشروع	تم تعيينك كمدير لمشروع: مشروع محمدد جمال  - يرجى مراجعة المعاينة الهندسية وتشكيل الفريق	info	project	14	f	2026-05-06 14:54:09.886958+03	\N
683	97	تم تعيين مدير مشروع	تم تعيين جمي جمال مديرًا لمشروع "مشروع محمدد جمال "	info	project	14	f	2026-05-06 14:54:09.90226+03	\N
693	97	عقد جديد تم رفعه	تم رفع عقد "CTR-1778069016522" لمشروع "مشروع محمدد جمال "	info	contract	17	f	2026-05-06 15:03:36.544373+03	\N
692	154	تم رفع عقد المشروع	تم رفع عقد مشروع "مشروع محمدد جمال " بنجاح. يمكنك الآن تخصيص المواد من المخزون.	success	contract	17	f	2026-05-06 15:03:36.537847+03	2026-05-06 15:03:48.860321+03
701	97	تم تعيين مدير مشروع	تم تعيين hopa pop مديرًا لمشروع "مشروع محمدد جمال "	info	project	14	f	2026-05-06 15:42:24.094475+03	\N
703	97	تم تعيين مدير مشروع	تم تعيين جمي جمال مديرًا لمشروع "مشروع محمدد جمال "	info	project	14	f	2026-05-06 15:42:28.29547+03	\N
669	151	طلب معاينة فنية جديد	تم طلب معاينة للعميل: محمدد جمال 	info	lead	31	f	2026-05-05 17:33:01.448938+03	2026-05-06 19:24:47.991075+03
704	120	طلب إجازة جديد بانتظار مراجعتك	الموظف/ة: hopa pop — النوع: إجازة مرضية — المدة: 5 يوم (2026-06-01 → 2026-06-07)	warning	leave_request	6	f	2026-05-06 22:55:33.429755+03	2026-05-06 22:56:08.40825+03
711	97	تم صرف مواد من المخزون	تم صرف 1 أصناف لمشروع "مشروع محمدد جمال "	info	project	14	f	2026-05-07 00:22:57.100104+03	\N
716	97	تم تعيين فريق المشروع	تم تعيين 1 موظفين في مشروع "مشروع محمدد جمال "	info	project	14	f	2026-05-07 00:23:36.380452+03	\N
717	154	تم تعيينك في مشروع	تم تعيينك في المشروع: مشروع محمدد جمال 	info	project	14	f	2026-05-07 00:24:40.859699+03	\N
718	97	تم تعيين فريق المشروع	تم تعيين 1 موظفين في مشروع "مشروع محمدد جمال "	info	project	14	f	2026-05-07 00:24:40.863194+03	\N
702	154	تم تعيينك كمدير مشروع	تم تعيينك كمدير لمشروع: مشروع محمدد جمال  - يرجى مراجعة المعاينة الهندسية وتشكيل الفريق	info	project	14	f	2026-05-06 15:42:28.292744+03	2026-05-07 00:25:15.095891+03
723	82	تم تعيينك على عميل محتمل	تم تعيينك على العميل: محمد جمال	info	lead	34	f	2026-05-07 12:49:30.119089+03	\N
724	97	تم تعيين مندوب مبيعات	تم تعيين مندوب مبيعات للعميل: محمد جمال	info	lead	34	f	2026-05-07 12:49:30.121583+03	\N
725	152	مهمة معاينة جديدة	تم تعيينك لمعاينة العميل: محمد جمال	info	lead	34	f	2026-05-07 13:06:41.608338+03	\N
726	97	تم تعيين مهندس معاينة	تم تعيين مهندس لمعاينة العميل: محمد جمال	info	lead	34	f	2026-05-07 13:06:41.616493+03	\N
729	97	تم تعيين مندوب مبيعات	تم تعيين مندوب مبيعات للعميل: fdff	info	lead	36	f	2026-05-07 13:17:26.90258+03	\N
732	97	تم تعيين مهندس معاينة	تم تعيين مهندس لمعاينة العميل: موسي 	info	lead	37	f	2026-05-07 13:21:01.157648+03	\N
731	152	مهمة معاينة جديدة	تم تعيينك لمعاينة العميل: موسي 	info	lead	37	f	2026-05-07 13:21:01.154976+03	2026-05-07 16:33:43.464222+03
733	84	عرض سعر بانتظار المراجعة المالية	العميل محمد جمال — يرجى مراجعة عرض السعر والموافقة	warning	quotation	18	f	2026-05-07 13:23:06.459814+03	2026-05-07 13:23:35.220616+03
734	97	تمت الموافقة المالية على عرض السعر	عرض سعر العميل محمد جمال تمت الموافقة عليه مالياً — بانتظار موافقتكم	warning	quotation	18	f	2026-05-07 13:23:53.731612+03	2026-05-07 13:24:37.040036+03
736	113	تم اعتماد عرض السعر	تم اعتماد عرض السعر للعميل محمد جمال — يمكنكم إرساله للعميل	success	quotation	18	f	2026-05-07 13:24:43.13245+03	\N
738	113	تم إرسال عرض السعر للعميل	تم إرسال عرض السعر للعميل محمد جمال	success	quotation	18	f	2026-05-07 13:24:54.988216+03	\N
739	97	تم إرسال عرض السعر للعميل	عرض السعر للعميل محمد جمال بانتظار الرد	info	quotation	18	f	2026-05-07 13:24:54.989689+03	\N
737	156	عرض سعر جديد بانتظار مراجعتكم	تم إرسال عرض سعر جديد - يرجى مراجعة البوابة والموافقة	info	quotation	18	f	2026-05-07 13:24:54.98626+03	2026-05-07 13:25:20.989889+03
740	97	مشروع جديد تلقائي 🎉	وافق العميل على العرض - تم إنشاء مشروع "مشروع محمد جمال"	success	project	15	f	2026-05-07 13:25:52.114946+03	\N
741	156	تم بدء مشروعكم 🎉	تم تحويل عرض السعر لمشروع قيد التنفيذ - يمكنكم متابعة التقدم من البوابة	success	project	15	f	2026-05-07 13:25:52.114946+03	\N
743	97	تم تعيين مدير مشروع	تم تعيين hopa pop مديرًا لمشروع "مشروع محمد جمال"	info	project	15	f	2026-05-07 14:11:07.686884+03	\N
742	152	تم تعيينك كمدير مشروع	تم تعيينك كمدير لمشروع: مشروع محمد جمال - يرجى مراجعة المعاينة الهندسية وتشكيل الفريق	info	project	15	f	2026-05-07 14:11:07.681635+03	2026-05-07 14:11:35.181641+03
745	97	تم تعيين مدير مشروع	تم تعيين جمي جمال مديرًا لمشروع "مشروع محمد جمال"	info	project	15	f	2026-05-07 14:11:52.851328+03	\N
744	154	تم تعيينك كمدير مشروع	تم تعيينك كمدير لمشروع: مشروع محمد جمال - يرجى مراجعة المعاينة الهندسية وتشكيل الفريق	info	project	15	f	2026-05-07 14:11:52.84877+03	2026-05-07 14:12:22.059787+03
746	152	تم تعيينك في مشروع	تم تعيينك في المشروع: مشروع محمد جمال	info	project	15	f	2026-05-07 14:12:43.948251+03	\N
747	97	تم تعيين فريق المشروع	تم تعيين 1 موظفين في مشروع "مشروع محمد جمال"	info	project	15	f	2026-05-07 14:12:43.951042+03	\N
749	97	عقد جديد تم رفعه	تم رفع عقد "CTR-1778152499689" لمشروع "مشروع محمد جمال"	info	contract	18	f	2026-05-07 14:14:59.706632+03	\N
748	154	تم رفع عقد المشروع	تم رفع عقد مشروع "مشروع محمد جمال" بنجاح. يمكنك الآن تخصيص المواد من المخزون.	success	contract	18	f	2026-05-07 14:14:59.701762+03	2026-05-07 14:15:35.329623+03
750	97	تم صرف مواد من المخزون	تم صرف 1 أصناف لمشروع "مشروع محمد جمال"	info	project	15	f	2026-05-07 14:16:11.466733+03	\N
751	97	تم استلام الدفعة الأولى	تم استلام دفعة بقيمة 10 من العميل محمد جمال	success	quotation	18	f	2026-05-07 14:22:17.149589+03	\N
753	156	تم استلام الدفعة الأولى	شكراً لكم - سيتم بدء التنفيذ قريباً	success	quotation	18	f	2026-05-07 14:22:17.152596+03	\N
754	97	تم صرف مواد من المخزون	تم صرف 1 أصناف لمشروع "مشروع محمد جمال"	info	project	15	f	2026-05-07 14:25:42.95298+03	\N
752	84	تم تأكيد الدفعة الأولى	العميل محمد جمال - الدفعة: 10	success	quotation	18	f	2026-05-07 14:22:17.151842+03	2026-05-07 14:45:27.804658+03
735	84	تم اعتماد عرض السعر من المدير العام	يمكنكم متابعة الإجراءات المالية للعميل محمد جمال	success	quotation	18	f	2026-05-07 13:24:43.131036+03	2026-05-07 14:45:33.395872+03
755	95	طلب شراء جديد	تم إنشاء طلب شراء جديد PO-0031 من مدير المشروع - مشروع #15	info	purchase_order	37	f	2026-05-07 15:29:55.832238+03	2026-05-07 15:30:12.750692+03
756	97	تم صرف مواد من المخزون	تم صرف 1 أصناف لمشروع "مشروع محمد جمال"	info	project	15	f	2026-05-07 15:43:04.327272+03	\N
757	154	✅ تمت الموافقة على أمر الشراء	تمت الموافقة المالية على أمر الشراء رقم "PO-0031" لمشروع "مشروع محمد جمال". يمكن الآن إرساله للمورد.	success	purchase_order	37	f	2026-05-07 15:56:26.20386+03	\N
758	97	تمت الموافقة على أمر شراء	تمت الموافقة على أمر شراء رقم "PO-0031" لمشروع "مشروع محمد جمال" بمبلغ 115.00 ريال	info	purchase_order	37	f	2026-05-07 15:56:26.208862+03	\N
760	97	عميل جديد	ابراهيم	info	lead	38	f	2026-05-07 16:23:06.903008+03	\N
759	95	أمر شراء جاهز للإرسال	تمت الموافقة المالية على أمر الشراء رقم "PO-0031". يرجى إرساله للمورد: Mosa Elwayly	warning	purchase_order	37	f	2026-05-07 15:56:26.21096+03	\N
761	82	تم تعيينك على عميل محتمل	تم تعيينك على العميل: ابراهيم	info	lead	38	f	2026-05-07 16:25:34.119185+03	\N
762	97	تم تعيين مندوب مبيعات	تم تعيين مندوب مبيعات للعميل: ابراهيم	info	lead	38	f	2026-05-07 16:25:34.122624+03	\N
764	97	تم تعيين مهندس معاينة	تم تعيين مهندس لمعاينة العميل: ابراهيم	info	lead	38	f	2026-05-07 16:30:58.292375+03	\N
763	152	مهمة معاينة جديدة	تم تعيينك لمعاينة العميل: ابراهيم	info	lead	38	f	2026-05-07 16:30:58.285667+03	2026-05-07 16:31:50.964087+03
765	84	عرض سعر بانتظار المراجعة المالية	العميل ابراهيم — يرجى مراجعة عرض السعر والموافقة	warning	quotation	19	f	2026-05-07 16:41:18.50453+03	2026-05-07 16:42:52.026279+03
766	97	تمت الموافقة المالية على عرض السعر	عرض سعر العميل ابراهيم تمت الموافقة عليه مالياً — بانتظار موافقتكم	warning	quotation	19	f	2026-05-07 16:43:06.768294+03	\N
767	84	تم اعتماد عرض السعر من المدير العام	يمكنكم متابعة الإجراءات المالية للعميل ابراهيم	success	quotation	19	f	2026-05-07 16:43:55.182923+03	\N
768	113	تم اعتماد عرض السعر	تم اعتماد عرض السعر للعميل ابراهيم — يمكنكم إرساله للعميل	success	quotation	19	f	2026-05-07 16:43:55.18574+03	\N
770	113	تم إرسال عرض السعر للعميل	تم إرسال عرض السعر للعميل ابراهيم	success	quotation	19	f	2026-05-07 16:44:17.719617+03	\N
771	97	تم إرسال عرض السعر للعميل	عرض السعر للعميل ابراهيم بانتظار الرد	info	quotation	19	f	2026-05-07 16:44:17.721234+03	\N
769	157	عرض سعر جديد بانتظار مراجعتكم	تم إرسال عرض سعر جديد - يرجى مراجعة البوابة والموافقة	info	quotation	19	f	2026-05-07 16:44:17.717763+03	2026-05-07 16:48:28.137208+03
772	97	مشروع جديد تلقائي 🎉	وافق العميل على العرض - تم إنشاء مشروع "مشروع ابراهيم"	success	project	16	f	2026-05-07 16:49:18.434005+03	\N
773	157	تم بدء مشروعكم 🎉	تم تحويل عرض السعر لمشروع قيد التنفيذ - يمكنكم متابعة التقدم من البوابة	success	project	16	f	2026-05-07 16:49:18.434005+03	\N
775	97	تم تعيين مدير مشروع	تم تعيين جمي جمال مديرًا لمشروع "مشروع ابراهيم"	info	project	16	f	2026-05-07 16:52:04.821141+03	\N
774	154	تم تعيينك كمدير مشروع	تم تعيينك كمدير لمشروع: مشروع ابراهيم - يرجى مراجعة المعاينة الهندسية وتشكيل الفريق	info	project	16	f	2026-05-07 16:52:04.813831+03	2026-05-07 16:52:55.334731+03
776	152	تم تعيينك في مهمة جديدة	تم تعيينك في المهمة: "الال" ضمن مشروع "مشروع ابراهيم"	info	task	31	f	2026-05-07 16:53:36.532925+03	\N
777	154	تم إنشاء مهمة جديدة	تم إنشاء مهمة جديدة في مشروع "مشروع ابراهيم": الال	warning	task	31	f	2026-05-07 16:53:36.536515+03	\N
778	97	مهمة جديدة في المشاريع	تم إنشاء مهمة "الال" في مشروع "مشروع ابراهيم"	info	task	31	f	2026-05-07 16:53:36.54032+03	\N
779	152	تم تعيينك في مشروع	تم تعيينك في المشروع: مشروع ابراهيم	info	project	16	f	2026-05-07 16:53:56.28571+03	\N
780	97	تم تعيين فريق المشروع	تم تعيين 1 موظفين في مشروع "مشروع ابراهيم"	info	project	16	f	2026-05-07 16:53:56.288522+03	\N
781	154	تم رفع عقد المشروع	تم رفع عقد مشروع "مشروع ابراهيم" بنجاح. يمكنك الآن تخصيص المواد من المخزون.	success	contract	19	f	2026-05-07 16:56:47.843704+03	\N
782	97	عقد جديد تم رفعه	تم رفع عقد "CTR-1778162207834" لمشروع "مشروع ابراهيم"	info	contract	19	f	2026-05-07 16:56:47.848188+03	\N
784	120	طلب إجازة جديد بانتظار مراجعتك	الموظف/ة: hopa pop — النوع: إجازة سنوية — المدة: 8 يوم (2026-07-07 → 2026-07-16)	warning	leave_request	7	f	2026-05-07 17:25:46.078826+03	\N
786	152	تمت الموافقة على إجازتك ✅	تمت الموافقة على طلب إجازة سنوية بتاعك (8 يوم: Tue Jul 07 → Thu Jul 16) من قِبَل مدير الموارد البشرية 	success	leave_request	7	f	2026-05-07 17:26:12.25167+03	\N
787	154	تم اكتمال مهمة	تم اكتمال المهمة: "الال" في مشروع "مشروع ابراهيم"	success	task	31	f	2026-05-07 17:26:59.535252+03	\N
788	97	مهمة مكتملة	تم اكتمال المهمة: "الال" في مشروع "مشروع ابراهيم"	success	task	31	f	2026-05-07 17:26:59.539348+03	2026-05-10 17:54:08.75837+03
785	97	طلب إجازة جديد بانتظار مراجعتك	الموظف/ة: hopa pop — النوع: إجازة سنوية — المدة: 8 يوم (2026-07-07 → 2026-07-16)	warning	leave_request	7	f	2026-05-07 17:25:46.082996+03	2026-05-10 17:54:21.275046+03
783	97	تم صرف مواد من المخزون	تم صرف 1 أصناف لمشروع "مشروع ابراهيم"	info	project	16	f	2026-05-07 16:58:42.411697+03	2026-05-10 17:54:25.060351+03
\.


--
-- Data for Name: otp_codes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.otp_codes (id, user_id, code, expires_at, used, created_at) FROM stdin;
51	97	610244	2026-05-02 23:40:47.784+03	t	2026-05-02 23:30:47.785394+03
52	97	211705	2026-05-03 17:30:26.553+03	t	2026-05-03 17:20:26.554299+03
53	97	172351	2026-05-03 17:41:42.459+03	t	2026-05-03 17:31:42.46081+03
54	97	876191	2026-05-03 19:44:49.956+03	t	2026-05-03 19:34:49.958158+03
55	97	988584	2026-05-04 14:49:21.628+03	t	2026-05-04 14:39:21.629461+03
56	97	546755	2026-05-05 14:31:43.433+03	t	2026-05-05 14:21:43.434493+03
57	97	125439	2026-05-05 17:02:55.991+03	t	2026-05-05 16:52:55.992339+03
58	97	333835	2026-05-05 17:45:57.685+03	t	2026-05-05 17:35:57.685873+03
59	97	527152	2026-05-07 00:43:49.356+03	t	2026-05-07 00:33:49.356785+03
60	97	585741	2026-05-07 13:34:16.413+03	t	2026-05-07 13:24:16.414445+03
61	97	365892	2026-05-07 16:27:16.124+03	t	2026-05-07 16:17:16.125366+03
62	97	378572	2026-05-09 15:18:55.505+03	t	2026-05-09 15:08:55.507142+03
63	97	042987	2026-05-09 22:22:43.322+03	t	2026-05-09 22:12:43.322685+03
64	97	995740	2026-05-10 16:00:01.665+03	t	2026-05-10 15:50:01.665974+03
65	97	742212	2026-05-16 22:01:29.287+03	t	2026-05-16 21:51:29.287983+03
66	97	808407	2026-05-16 23:22:05.504+03	t	2026-05-16 23:12:05.504813+03
\.


--
-- Data for Name: payment_vouchers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payment_vouchers (id, voucher_number, invoice_id, supplier_id, project_id, payment_date, payment_method, payment_amount, currency, payment_account_type, bank_account_number, check_number, bank_name, status, journal_entry_id, notes, created_by, approved_by, created_at, updated_at) FROM stdin;
1	PV-2026-0001	19	5	12	2026-04-20	cash	20.00	SAR	cash	0102332222	\N	الرجحي	completed	39	لالا	84	84	2026-04-20 20:19:32.541689+02	2026-04-20 20:19:32.541689+02
2	PV-2026-0002	20	5	12	2026-04-20	cash	20.00	SAR	cash	\N	\N	\N	completed	40	تم دفع 20 من اصل 50 \n	84	84	2026-04-20 20:21:08.602819+02	2026-04-20 20:21:08.602819+02
3	PV-2026-0003	21	5	12	2026-04-21	cash	20.00	SAR	cash	\N	\N	\N	completed	41	\N	84	84	2026-04-21 07:04:16.863206+02	2026-04-21 07:04:16.863206+02
4	PV-2026-0004	20	5	12	2026-04-22	cash	10.00	SAR	cash	\N	\N	\N	completed	60	ت	84	84	2026-04-22 11:09:59.090473+02	2026-04-22 11:09:59.090473+02
5	PV-2026-0005	20	5	12	2026-04-23	cash	20.00	SAR	cash	\N	\N	\N	completed	77	\N	84	84	2026-04-23 10:06:09.483045+02	2026-04-23 10:06:09.483045+02
6	PV-2026-0006	26	5	12	2026-04-23	cash	1.00	SAR	cash	\N	\N	\N	completed	78	\N	84	84	2026-04-23 10:07:06.811651+02	2026-04-23 10:07:06.811651+02
7	PV-2026-0007	29	1	12	2026-04-23	bank_transfer	800.00	SAR	bank	01080631972	\N	الراجحي	completed	87	\N	84	84	2026-04-23 17:18:42.402152+02	2026-04-23 17:18:42.402152+02
8	PV-2026-0008	27	3	12	2026-04-23	bank_transfer	850.00	SAR	bank	01080631972	\N	الراجحي	completed	88	\N	84	84	2026-04-23 17:20:15.541037+02	2026-04-23 17:20:15.541037+02
\.


--
-- Data for Name: permissions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.permissions (id, name, description, created_at) FROM stdin;
1	system:manage	\N	2026-03-23 05:03:00.48994+02
2	departments:create	\N	2026-03-23 05:03:00.493031+02
3	departments:read	\N	2026-03-23 05:03:00.493906+02
4	departments:update	\N	2026-03-23 05:03:00.494974+02
5	departments:delete	\N	2026-03-23 05:03:00.496586+02
6	users:create	\N	2026-03-23 05:03:00.497616+02
7	users:read	\N	2026-03-23 05:03:00.499115+02
8	users:update	\N	2026-03-23 05:03:00.499736+02
9	users:delete	\N	2026-03-23 05:03:00.500193+02
10	leads:create	\N	2026-03-23 05:03:00.500701+02
11	leads:read	\N	2026-03-23 05:03:00.501102+02
12	leads:update	\N	2026-03-23 05:03:00.5015+02
13	leads:delete	\N	2026-03-23 05:03:00.501919+02
14	inspections:create	\N	2026-03-23 05:03:00.502315+02
15	inspections:read	\N	2026-03-23 05:03:00.502712+02
16	inspections:update	\N	2026-03-23 05:03:00.503116+02
17	quotations:create	\N	2026-03-23 05:03:00.503566+02
18	quotations:read	\N	2026-03-23 05:03:00.504054+02
19	quotations:update	\N	2026-03-23 05:03:00.50459+02
20	quotations:approve	\N	2026-03-23 05:03:00.504987+02
21	projects:create	\N	2026-03-23 05:03:00.505378+02
22	projects:read	\N	2026-03-23 05:03:00.505895+02
23	projects:manage	\N	2026-03-23 05:03:00.506378+02
24	finance:read	\N	2026-03-23 05:03:00.506903+02
25	finance:manage	\N	2026-03-23 05:03:00.507274+02
26	reports:read	\N	2026-03-23 05:03:00.507882+02
27	department:read	\N	2026-03-23 05:03:00.508237+02
28	department:manage	\N	2026-03-23 05:03:00.508676+02
89	inspections:assign	\N	2026-03-23 06:59:35.758975+02
90	inspections:report	\N	2026-03-23 06:59:35.758975+02
94	quotations:finance_approve	\N	2026-03-23 06:59:35.758975+02
95	quotations:gm_approve	\N	2026-03-23 06:59:35.758975+02
97	projects:assign	\N	2026-03-23 06:59:35.758975+02
99	notifications:read	\N	2026-03-23 06:59:35.758975+02
100	client:view_quotation	\N	2026-03-23 06:59:35.758975+02
101	client:approve_quotation	\N	2026-03-23 06:59:35.758975+02
102	employees:create	\N	2026-03-23 07:53:38.585622+02
103	employees:read	\N	2026-03-23 07:53:38.585622+02
104	employees:update	\N	2026-03-23 07:53:38.585622+02
105	employees:delete	\N	2026-03-23 07:53:38.585622+02
106	leaves:create	\N	2026-03-23 07:53:38.585622+02
107	leaves:read	\N	2026-03-23 07:53:38.585622+02
108	leaves:approve	\N	2026-03-23 07:53:38.585622+02
109	evaluations:create	\N	2026-03-23 07:54:02.060693+02
110	evaluations:read	\N	2026-03-23 07:54:02.060693+02
141	contracts:upload	\N	2026-04-14 17:57:07.099249+02
142	contracts:read	\N	2026-04-14 17:57:07.099249+02
143	contracts:verify	\N	2026-04-14 17:57:07.099249+02
\.


--
-- Data for Name: petty_cash_funds; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.petty_cash_funds (id, fund_name, engineer_id, project_id, initial_amount, current_balance, currency, status, approved_by, last_reconciliation_date, created_at, updated_at) FROM stdin;
8	ااا	112	12	1000.00	1000.00	SAR	active	84	\N	2026-04-22 16:47:05.92768+02	2026-04-22 16:47:05.92768+02
11	تت	84	5	30.00	30.00	SAR	active	84	\N	2026-04-22 17:07:31.169307+02	2026-04-22 17:07:31.169307+02
7	ااا	112	12	1000.00	950.00	SAR	active	84	\N	2026-04-22 16:46:55.700486+02	2026-04-23 10:09:49.984931+02
10	عبد الرحمن عهده مشروع موسي 	112	12	2000.00	2000.00	SAR	active	84	\N	2026-04-22 17:02:37.548912+02	2026-04-23 17:07:17.913537+02
\.


--
-- Data for Name: petty_cash_transactions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.petty_cash_transactions (id, petty_cash_fund_id, transaction_type, amount, balance_after, expense_id, description, receipt_url, performed_by, created_at) FROM stdin;
1	10	fund	3000.00	5000.00	\N	إضافة Funds إلى صندوق العهد	\N	84	2026-04-22 17:02:52.173285+02
2	10	expense	1000.00	4000.00	\N	ى	\N	84	2026-04-22 17:30:16.031989+02
3	10	expense	100.00	3900.00	\N	كك	\N	84	2026-04-22 17:31:10.586682+02
4	10	expense	1000.00	2900.00	\N	1000 بدل موسي	\N	84	2026-04-22 17:33:35.208481+02
5	7	expense	50.00	950.00	\N	للعمال	\N	84	2026-04-23 10:09:49.990386+02
6	10	expense	900.00	2000.00	\N	0	\N	84	2026-04-23 17:07:17.920726+02
\.


--
-- Data for Name: project_employees; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.project_employees (id, project_id, employee_id, role_in_project, status, assigned_at, released_at, notes) FROM stdin;
10	15	61	team_member	active	2026-05-07 14:12:43.94063	\N	\N
11	16	61	team_member	active	2026-05-07 16:53:56.277202	\N	\N
\.


--
-- Data for Name: project_ratings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.project_ratings (id, project_id, client_id, rating, comment, is_anonymous, response_from_company, responded_by, responded_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.projects (id, quotation_id, lead_id, name, description, budget, start_date, end_date, status, created_at, updated_at, delivered_at, assigned_sales_rep_id, assigned_engineer_id, department_id, project_manager_id, total_budget, technical_report_id, client_id, contract_status) FROM stdin;
5	9	\N	مشروع ئر	مشروع ناتج من عرض السعر - رئ	450000.00	2026-04-12	\N	planning	2026-04-12 17:32:18.360868+02	2026-04-12 17:32:18.360868+02	\N	\N	\N	\N	\N	\N	\N	\N	not_uploaded
12	15	28	مشروع موسي	مشروع تلقائي ناتج عن موافقة العميل - موسي	0.00	\N	\N	awaiting_pm_assignment	2026-04-13 09:05:18.298589+02	2026-04-21 16:51:37.301955+02	\N	82	112	30	118	10.00	\N	117	uploaded
16	19	38	مشروع ابراهيم	مشروع تلقائي ناتج عن موافقة العميل - ابراهيم	0.00	\N	\N	awaiting_pm_assignment	2026-05-07 16:49:18.434005+03	2026-05-07 17:02:15.093054+03	\N	82	152	49	154	1000.00	\N	157	uploaded
3	9	19	مشروع شركة  الموس والبوب للستراد والتصدير وا لدعايه ولاعان والبرمجه والتكنولوجيا والتعسيل  والتسقيع	مشروع تلقائي ناتج عن موافقة العميل على عرض السعر - شركة  الموس والبوب للستراد والتصدير وا لدعايه ولاعان والبرمجه والتكنولوجيا والتعسيل  والتسقيع	0.00	\N	\N	awaiting_pm_assignment	2026-03-30 05:26:15.459506+02	2026-05-06 23:51:40.606275+03	\N	\N	81	17	123	450000.00	\N	1	not_uploaded
15	18	34	مشروع محمد جمال	مشروع تلقائي ناتج عن موافقة العميل - محمد جمال	0.00	\N	\N	awaiting_pm_assignment	2026-05-07 13:25:52.114946+03	2026-05-07 14:17:50.834842+03	\N	82	152	49	154	40.00	\N	156	uploaded
\.


--
-- Data for Name: purchase_invoice_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.purchase_invoice_items (id, invoice_id, inventory_item_id, warehouse_id, quantity, unit_cost, notes, created_at) FROM stdin;
1	35	1	1	30.000	10.00	From PO PO-0025	2026-04-26 14:21:03.175603+03
2	36	1	1	3.000	10.00	From PO PO-0027	2026-04-26 14:28:07.407758+03
3	37	1	1	8.000	10.00	From PO PO-0026	2026-04-26 14:33:25.857988+03
4	38	1	1	50.000	10.00	From PO PO-0024	2026-04-26 14:35:22.337066+03
5	39	21	1	7.000	30.00	From PO PO-0021	2026-04-26 15:09:15.654729+03
6	40	1	1	100.000	10.00	From PO PO-0028	2026-04-26 15:13:02.070677+03
7	41	1	1	1.000	50.00	From PO PO-0029	2026-04-26 18:10:19.413999+03
10	44	2	1	50.000	10.00	From PO PO-0030	2026-05-04 10:08:26.857095+03
20	54	22	1	10.000	10.00	From PO PO-0031	2026-05-07 15:56:25.932359+03
\.


--
-- Data for Name: purchase_invoices; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.purchase_invoices (id, invoice_number, supplier_id, po_id, grn_id, project_id, invoice_date, due_date, subtotal, tax_rate, tax_amount, total_amount, paid_amount, status, journal_entry_id, notes, created_by, created_at, updated_at, pdf_path, pdf_generated_at, is_tax_applied, tax_percentage) FROM stdin;
19	PINV-2026-0001	5	23	\N	12	2026-04-20	\N	20.00	0.00	0.00	20.00	20.00	paid	34	Automatic invoice created from PO PO-0017 - Finance approved (No VAT)	84	2026-04-20 15:23:21.094493+02	2026-04-20 20:19:32.541689+02	..\\uploads\\invoices\\purchase-invoice-PINV-2026-0001.pdf	2026-04-20 15:23:21.094493	f	0.00
21	PINV-2026-0003	5	25	\N	12	2026-04-20	\N	30.00	15.00	4.50	34.50	20.00	partial	36	Automatic invoice created from PO PO-0019 - Finance approved (VAT 15% applied)	84	2026-04-20 19:16:57.178734+02	2026-04-21 07:04:16.863206+02	..\\uploads\\invoices\\purchase-invoice-PINV-2026-0003.pdf	2026-04-20 19:16:57.178734	t	15.00
39	PINV-2026-0015	5	27	\N	12	2026-04-26	\N	210.00	15.00	31.50	241.50	0.00	final	134	Automatic invoice created from PO PO-0021 - Finance approved (VAT 15% applied)	84	2026-04-26 15:09:15.654729+03	2026-04-26 15:10:31.447424+03	uploads\\invoices\\purchase-invoice-PINV-2026-0015.pdf	2026-04-26 15:10:31.447424	t	15.00
22	PINV-2026-0004	1	14	\N	12	2026-04-22	\N	40.00	15.00	6.00	46.00	0.00	draft	61	Automatic invoice created from PO PO-0008 - Finance approved (VAT 15% applied)	84	2026-04-22 11:17:37.659921+02	2026-04-22 11:17:37.659921+02	..\\uploads\\invoices\\purchase-invoice-PINV-2026-0004.pdf	2026-04-22 11:17:37.659921	t	15.00
23	PINV-0005	5	22	\N	12	2026-04-22	2026-05-07	9.99	0.00	0.00	9.99	0.00	draft	\N	0	84	2026-04-22 14:10:25.337502+02	2026-04-22 14:10:25.337502+02	D:\\Desktop\\system\\backend\\uploads\\invoices\\purchase-invoice-PINV-0005.pdf	2026-04-22 12:10:25.674	f	0.00
24	PINV-0006	1	14	\N	12	2026-04-22	2026-04-24	40.00	0.00	0.00	40.00	0.00	draft	\N		84	2026-04-22 14:15:11.661596+02	2026-04-22 14:15:11.661596+02	D:\\Desktop\\system\\backend\\uploads\\invoices\\purchase-invoice-PINV-0006.pdf	2026-04-22 12:15:11.866	f	0.00
25	PINV-0007	1	14	\N	12	2026-04-22	2026-05-09	40.00	0.00	0.00	40.00	0.00	draft	\N		84	2026-04-22 14:22:10.25909+02	2026-04-22 14:22:10.25909+02	D:\\Desktop\\system\\backend\\uploads\\invoices\\purchase-invoice-PINV-0007.pdf	2026-04-22 12:22:10.424	f	0.00
30	PINV-2026-0008	5	26	\N	12	2026-04-26	\N	10.00	0.00	0.00	10.00	0.00	draft	127	Automatic invoice created from PO PO-0020 - Finance approved (No VAT)	84	2026-04-26 12:39:18.597601+03	2026-04-26 12:39:18.597601+03	..\\uploads\\invoices\\purchase-invoice-PINV-2026-0008.pdf	2026-04-26 12:39:18.597601	f	0.00
38	PINV-2026-0014	5	30	\N	12	2026-04-26	\N	500.00	15.00	75.00	575.00	0.00	final	133	Automatic invoice created from PO PO-0024 - Finance approved (VAT 15% applied)	84	2026-04-26 14:35:22.337066+03	2026-04-26 15:10:31.605378+03	uploads\\invoices\\purchase-invoice-PINV-2026-0014.pdf	2026-04-26 15:10:31.605378	t	15.00
31	PINV-2026-0009	5	29	\N	12	2026-04-26	\N	70.00	0.00	0.00	70.00	0.00	draft	128	Automatic invoice created from PO PO-0023 - Finance approved (No VAT)	84	2026-04-26 13:02:20.543234+03	2026-04-26 13:02:20.543234+03	..\\uploads\\invoices\\purchase-invoice-PINV-2026-0009.pdf	2026-04-26 13:02:20.543234	f	0.00
28	PINV-2026-0006	3	6	\N	12	2026-04-22	\N	17000.00	15.00	2550.00	19550.00	0.00	draft	67	Automatic invoice created from PO PO-0004 - Finance approved (VAT 15% applied)	84	2026-04-22 14:51:39.197754+02	2026-04-22 14:51:39.197754+02	..\\uploads\\invoices\\purchase-invoice-PINV-2026-0006.pdf	2026-04-22 14:51:39.197754	t	15.00
20	PINV-2026-0002	5	24	\N	12	2026-04-20	\N	50.00	0.00	0.00	50.00	50.00	paid	35	Automatic invoice created from PO PO-0018 - Finance approved (No VAT)	84	2026-04-20 19:13:17.034035+02	2026-04-23 10:06:09.483045+02	..\\uploads\\invoices\\purchase-invoice-PINV-2026-0002.pdf	2026-04-20 19:13:17.034035	f	0.00
26	PINV-0008	5	13	\N	12	2026-04-22	2026-04-30	1.00	0.00	0.00	1.00	1.00	paid	\N		84	2026-04-22 14:24:15.312347+02	2026-04-23 10:07:06.811651+02	D:\\Desktop\\system\\backend\\uploads\\invoices\\purchase-invoice-PINV-0008.pdf	2026-04-22 12:24:15.505	f	0.00
29	PINV-2026-0007	1	5	\N	12	2026-04-22	\N	850.00	0.00	0.00	850.00	800.00	partial	68	Automatic invoice created from PO PO-0003 - Finance approved (No VAT)	84	2026-04-22 15:02:32.617815+02	2026-04-23 17:18:42.402152+02	..\\uploads\\invoices\\purchase-invoice-PINV-2026-0007.pdf	2026-04-22 15:02:32.617815	f	0.00
27	PINV-2026-0005	3	7	\N	12	2026-04-22	\N	850.00	0.00	0.00	850.00	850.00	paid	66	Automatic invoice created from PO PO-0005 - Finance approved (No VAT)	84	2026-04-22 14:27:50.688995+02	2026-04-23 17:20:15.541037+02	..\\uploads\\invoices\\purchase-invoice-PINV-2026-0005.pdf	2026-04-22 14:27:50.688995	f	0.00
32	PINV-2026-0010	5	28	\N	12	2026-04-26	\N	140.00	0.00	0.00	140.00	0.00	draft	129	Automatic invoice created from PO PO-0022 - Finance approved (No VAT)	84	2026-04-26 13:35:13.559777+03	2026-04-26 13:35:13.559777+03	..\\uploads\\invoices\\purchase-invoice-PINV-2026-0010.pdf	2026-04-26 13:35:13.559777	f	0.00
40	PINV-2026-0016	5	34	\N	12	2026-04-26	\N	1000.00	0.00	0.00	1000.00	0.00	final	135	Automatic invoice created from PO PO-0028 - Finance approved (No VAT)	84	2026-04-26 15:13:02.070677+03	2026-04-26 15:13:35.926722+03	..\\uploads\\invoices\\purchase-invoice-PINV-2026-0016.pdf	2026-04-26 15:13:02.070677	f	0.00
37	PINV-2026-0013	5	32	\N	12	2026-04-26	\N	80.00	15.00	12.00	92.00	0.00	final	132	Automatic invoice created from PO PO-0026 - Finance approved (VAT 15% applied)	84	2026-04-26 14:33:25.857988+03	2026-04-26 15:10:31.752674+03	uploads\\invoices\\purchase-invoice-PINV-2026-0013.pdf	2026-04-26 15:10:31.752674	t	15.00
36	PINV-2026-0012	5	33	\N	12	2026-04-26	\N	30.00	0.00	0.00	30.00	0.00	draft	131	Automatic invoice created from PO PO-0027 - Finance approved (No VAT)	84	2026-04-26 14:28:07.407758+03	2026-04-26 15:10:31.897982+03	uploads\\invoices\\purchase-invoice-PINV-2026-0012.pdf	2026-04-26 15:10:31.897982	f	0.00
35	PINV-2026-0011	5	31	\N	12	2026-04-26	\N	300.00	15.00	45.00	345.00	0.00	draft	130	Automatic invoice created from PO PO-0025 - Finance approved (VAT 15% applied)	84	2026-04-26 14:21:03.175603+03	2026-04-26 15:10:32.037331+03	uploads\\invoices\\purchase-invoice-PINV-2026-0011.pdf	2026-04-26 15:10:32.037331	t	15.00
44	PINV-2026-0018	5	36	\N	\N	2026-05-04	\N	500.00	0.00	0.00	500.00	0.00	final	\N	Automatic invoice created from PO PO-0030 - Finance approved (No VAT)	84	2026-05-04 10:08:26.857095+03	2026-05-05 17:20:58.661307+03	..\\uploads\\invoices\\purchase-invoice-PINV-2026-0018.pdf	2026-05-04 10:08:26.857095	f	0.00
41	PINV-2026-0017	5	35	\N	12	2026-04-26	\N	50.00	0.00	0.00	50.00	0.00	final	136	Automatic invoice created from PO PO-0029 - Finance approved (No VAT)	84	2026-04-26 18:10:19.413999+03	2026-04-26 18:10:47.659428+03	..\\uploads\\invoices\\purchase-invoice-PINV-2026-0017.pdf	2026-04-26 18:10:19.413999	f	0.00
54	PINV-2026-0019	5	37	\N	15	2026-05-07	\N	100.00	15.00	15.00	115.00	0.00	draft	229	Automatic invoice created from PO PO-0031 - Finance approved (VAT 15% applied)	84	2026-05-07 15:56:25.932359+03	2026-05-07 15:56:25.932359+03	..\\uploads\\invoices\\purchase-invoice-PINV-2026-0019.pdf	2026-05-07 15:56:25.932359	t	15.00
\.


--
-- Data for Name: purchase_order_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.purchase_order_items (id, po_id, item_id, quantity, unit_cost, quantity_received, created_at) FROM stdin;
1	1	1	20.000	850.00	20.000	2026-04-07 09:14:51.162203+02
8	13	1	5.000	0.20	0.000	2026-04-20 06:51:29.050289+02
9	12	1	1.000	10.00	0.000	2026-04-20 06:52:37.012641+02
13	15	1	20.000	19.94	0.000	2026-04-20 07:51:25.714952+02
15	16	1	20.000	10.00	0.000	2026-04-20 12:56:24.657104+02
16	4	1	1.000	850.00	0.000	2026-04-20 13:04:28.024841+02
18	17	1	90.000	0.94	0.000	2026-04-20 13:26:33.202447+02
20	18	1	10.000	10.00	0.000	2026-04-20 14:26:15.214644+02
22	19	1	10.000	9.98	0.000	2026-04-20 14:30:08.077569+02
24	20	1	10.000	10.00	0.000	2026-04-20 14:30:56.902097+02
26	21	1	1.000	10.00	0.000	2026-04-20 14:39:17.11839+02
28	22	1	1.000	9.99	0.000	2026-04-20 15:05:12.940226+02
30	23	1	1.000	20.00	0.000	2026-04-20 15:17:56.213841+02
32	24	1	5.000	10.00	0.000	2026-04-20 19:13:02.21484+02
34	25	1	3.000	10.00	0.000	2026-04-20 19:16:47.399426+02
35	7	1	1.000	850.00	0.000	2026-04-20 19:18:01.149433+02
36	6	1	20.000	850.00	0.000	2026-04-20 19:18:05.571973+02
37	5	1	1.000	850.00	0.000	2026-04-20 19:18:08.060583+02
38	14	1	5.000	8.00	0.000	2026-04-20 19:18:16.060583+02
40	26	21	1.000	10.00	0.000	2026-04-26 12:38:52.33907+03
44	29	1	7.000	10.00	0.000	2026-04-26 13:02:09.929169+03
45	28	2	7.000	20.00	0.000	2026-04-26 13:35:02.335906+03
46	27	21	7.000	30.00	0.000	2026-04-26 13:35:48.421161+03
48	30	1	50.000	10.00	0.000	2026-04-26 13:36:50.430465+03
50	31	1	30.000	10.00	0.000	2026-04-26 13:51:42.049905+03
52	32	1	8.000	10.00	0.000	2026-04-26 14:04:34.596226+03
54	33	1	3.000	10.00	0.000	2026-04-26 14:07:24.036075+03
56	34	1	100.000	10.00	0.000	2026-04-26 15:12:53.909884+03
58	35	1	1.000	50.00	0.000	2026-04-26 18:09:26.434399+03
60	36	2	50.000	10.00	0.000	2026-05-04 09:50:55.410354+03
62	37	22	10.000	10.00	0.000	2026-05-07 15:30:36.864733+03
\.


--
-- Data for Name: purchase_orders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.purchase_orders (id, po_number, supplier_id, project_id, order_date, expected_date, status, subtotal, tax_amount, total_amount, notes, created_by, created_at, updated_at, approved_by, procurement_rejected_by, finance_rejected_by, procurement_notes, finance_notes, procurement_approved_by, procurement_approved_at, procurement_rejection_reason, finance_approved_by, finance_approved_at, finance_rejection_reason) FROM stdin;
1	PO-0001	1	\N	2026-04-07	\N	draft	17000.00	2550.00	19550.00	\N	84	2026-04-07 09:14:51.162203+02	2026-04-07 09:15:56.556523+02	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
31	PO-0025	5	12	2026-04-26	\N	approved	300.00	45.00	345.00	طلب شراء تلقائي - مشروع: مشروع موسي	118	2026-04-26 13:51:22.773166+03	2026-04-26 14:21:03.158749+03	84	\N	\N	\N	موافقة مالية	\N	\N	\N	84	2026-04-26 14:21:03.158749+03	\N
33	PO-0027	5	12	2026-04-26	\N	approved	30.00	4.50	34.50	طلب شراء تلقائي - مشروع: مشروع موسي	118	2026-04-26 14:06:59.329275+03	2026-04-26 14:28:07.398624+03	84	\N	\N	\N	موافقة مالية	\N	\N	\N	84	2026-04-26 14:28:07.398624+03	\N
32	PO-0026	5	12	2026-04-26	\N	approved	80.00	12.00	92.00	طلب شراء تلقائي - مشروع: مشروع موسي	118	2026-04-26 14:04:18.536924+03	2026-04-26 14:33:25.85084+03	84	\N	\N	\N	موافقة مالية	\N	\N	\N	84	2026-04-26 14:33:25.85084+03	\N
30	PO-0024	5	12	2026-04-26	\N	approved	500.00	75.00	575.00	طلب شراء تلقائي - مشروع: مشروع موسي	118	2026-04-26 13:36:29.892351+03	2026-04-26 14:35:22.333345+03	84	\N	\N	\N	موافقة مالية	\N	\N	\N	84	2026-04-26 14:35:22.333345+03	\N
27	PO-0021	5	12	2026-04-26	\N	approved	210.00	31.50	241.50	طلب شراء تلقائي - مشروع: مشروع موسي	118	2026-04-26 13:01:15.005393+03	2026-04-26 15:09:15.646153+03	84	\N	\N	\N	موافقة مالية	\N	\N	\N	84	2026-04-26 15:09:15.646153+03	\N
34	PO-0028	5	12	2026-04-26	\N	approved	1000.00	150.00	1150.00	طلب شراء تلقائي - مشروع: مشروع موسي	118	2026-04-26 15:12:37.336941+03	2026-04-26 15:13:02.064047+03	84	\N	\N	\N	موافقة مالية	\N	\N	\N	84	2026-04-26 15:13:02.064047+03	\N
13	PO-0007	5	12	2026-04-20	\N	approved	1.00	0.15	1.15	طلب شراء تلقائي - مشروع: مشروع موسي	118	2026-04-20 06:08:02.991374+02	2026-04-20 07:05:21.310519+02	84	\N	\N	\N	موافقة مالية	\N	\N	\N	84	2026-04-20 07:05:21.310519+02	\N
12	PO-0006	1	12	2026-04-20	\N	approved	10.00	1.50	11.50	طلب شراء تلقائي - مشروع: مشروع موسي	118	2026-04-20 05:44:01.880967+02	2026-04-20 07:06:18.82086+02	84	\N	\N	\N	موافقة مالية	\N	\N	\N	84	2026-04-20 07:06:18.82086+02	\N
35	PO-0029	5	12	2026-04-26	\N	approved	50.00	7.50	57.50	طلب شراء تلقائي - مشروع: مشروع موسي	118	2026-04-26 18:08:48.604245+03	2026-04-26 18:10:19.405973+03	84	\N	\N	\N	موافقة مالية	\N	\N	\N	84	2026-04-26 18:10:19.405973+03	\N
15	PO-0009	1	12	2026-04-20	\N	approved	398.80	59.82	458.62	طلب شراء تلقائي - مشروع: مشروع موسي	118	2026-04-20 07:50:29.583107+02	2026-04-20 07:52:04.207053+02	84	\N	\N	\N	موافقة مالية	\N	\N	\N	84	2026-04-20 07:52:04.207053+02	\N
16	PO-0010	1	12	2026-04-20	\N	approved	200.00	30.00	230.00	طلب شراء تلقائي - مشروع: مشروع موسي	118	2026-04-20 12:55:45.852678+02	2026-04-20 12:56:40.97201+02	84	\N	\N	\N	موافقة مالية	\N	\N	\N	84	2026-04-20 12:56:40.97201+02	\N
17	PO-0011	1	12	2026-04-20	\N	approved	84.60	12.69	97.29	طلب شراء تلقائي - مشروع: مشروع موسي	118	2026-04-20 13:26:15.742536+02	2026-04-20 13:27:06.892627+02	84	\N	\N	\N	موافقة مالية	\N	\N	\N	84	2026-04-20 13:27:06.892627+02	\N
36	PO-0030	5	\N	2026-05-04	\N	approved	500.00	75.00	575.00	projects.details.purchaseRequest.notesPlaceholder	154	2026-05-04 09:50:15.63189+03	2026-05-05 17:20:58.661307+03	84	\N	\N	\N	موافقة مالية	\N	\N	\N	84	2026-05-04 10:08:26.849485+03	\N
18	PO-0012	1	12	2026-04-20	\N	approved	100.00	15.00	115.00	طلب شراء تلقائي - مشروع: مشروع موسي	118	2026-04-20 14:25:21.98838+02	2026-04-20 14:26:47.944975+02	84	\N	\N	\N	موافقة مالية	\N	\N	\N	84	2026-04-20 14:26:47.944975+02	\N
4	PO-0002	5	12	2026-04-19	\N	approved	850.00	127.50	977.50	طلب شراء تلقائي - مشروع: مشروع موسي	118	2026-04-19 19:37:56.763294+02	2026-04-20 14:26:55.25141+02	84	\N	\N	\N	موافقة مالية	\N	\N	\N	84	2026-04-20 14:26:55.25141+02	\N
20	PO-0014	5	12	2026-04-20	\N	approved	100.00	15.00	115.00	طلب شراء تلقائي - مشروع: مشروع موسي	118	2026-04-20 14:30:42.812204+02	2026-04-20 14:31:38.910273+02	84	\N	\N	\N	موافقة مالية	\N	\N	\N	84	2026-04-20 14:31:38.910273+02	\N
19	PO-0013	5	12	2026-04-20	\N	approved	99.80	14.97	114.77	طلب شراء تلقائي - مشروع: مشروع موسي	118	2026-04-20 14:29:53.034532+02	2026-04-20 14:37:35.167734+02	84	\N	\N	\N	موافقة مالية	\N	\N	\N	84	2026-04-20 14:37:35.167734+02	\N
22	PO-0016	5	12	2026-04-20	\N	approved	9.99	1.50	11.49	طلب شراء تلقائي - مشروع: مشروع موسي	118	2026-04-20 15:04:55.956608+02	2026-04-20 15:05:59.231619+02	84	\N	\N	\N	موافقة مالية	\N	\N	\N	84	2026-04-20 15:05:59.231619+02	\N
21	PO-0015	5	12	2026-04-20	\N	approved	10.00	1.50	11.50	طلب شراء تلقائي - مشروع: مشروع موسي	118	2026-04-20 14:38:53.193585+02	2026-04-20 15:08:49.582702+02	84	\N	\N	\N	موافقة مالية	\N	\N	\N	84	2026-04-20 15:08:49.582702+02	\N
23	PO-0017	5	12	2026-04-20	\N	approved	20.00	3.00	23.00	طلب شراء تلقائي - مشروع: مشروع موسي	118	2026-04-20 15:17:38.685682+02	2026-04-20 15:23:21.086928+02	84	\N	\N	\N	موافقة مالية	\N	\N	\N	84	2026-04-20 15:23:21.086928+02	\N
24	PO-0018	5	12	2026-04-20	\N	approved	50.00	7.50	57.50	طلب شراء تلقائي - مشروع: مشروع موسي	118	2026-04-20 19:12:34.148478+02	2026-04-20 19:13:17.025106+02	84	\N	\N	\N	موافقة مالية	\N	\N	\N	84	2026-04-20 19:13:17.025106+02	\N
25	PO-0019	5	12	2026-04-20	\N	approved	30.00	4.50	34.50	طلب شراء تلقائي - مشروع: مشروع موسي	118	2026-04-20 19:16:28.004516+02	2026-04-20 19:16:57.172329+02	84	\N	\N	\N	موافقة مالية	\N	\N	\N	84	2026-04-20 19:16:57.172329+02	\N
37	PO-0031	5	15	2026-05-07	\N	approved	100.00	15.00	115.00	طلب شراء للمشروع: مشروع محمد جمال	154	2026-05-07 15:29:55.785749+03	2026-05-07 15:56:25.924618+03	84	\N	\N	\N	موافقة مالية	\N	\N	\N	84	2026-05-07 15:56:25.924618+03	\N
14	PO-0008	1	12	2026-04-20	\N	approved	40.00	6.00	46.00	طلب شراء تلقائي - مشروع: مشروع موسي	118	2026-04-20 07:07:53.229372+02	2026-04-22 11:17:37.651145+02	84	\N	84	\N	موافقة مالية	\N	\N	\N	84	2026-04-22 11:17:37.651145+02	لالال
7	PO-0005	3	12	2026-04-19	\N	approved	850.00	127.50	977.50	طلب شراء تلقائي - مشروع: مشروع موسي	118	2026-04-19 19:42:11.81708+02	2026-04-22 14:27:50.681059+02	84	\N	\N	\N	موافقة مالية	\N	\N	\N	84	2026-04-22 14:27:50.681059+02	\N
6	PO-0004	3	12	2026-04-19	\N	approved	17000.00	2550.00	19550.00	طلب شراء تلقائي - مشروع: مشروع موسي	118	2026-04-19 19:41:17.119983+02	2026-04-22 14:51:39.189962+02	84	\N	\N	\N	موافقة مالية	\N	\N	\N	84	2026-04-22 14:51:39.189962+02	\N
5	PO-0003	1	12	2026-04-19	\N	approved	850.00	127.50	977.50	طلب شراء تلقائي - مشروع: مشروع موسي	118	2026-04-19 19:40:42.313255+02	2026-04-22 15:02:32.613351+02	84	\N	\N	\N	موافقة مالية	\N	\N	\N	84	2026-04-22 15:02:32.613351+02	\N
26	PO-0020	5	12	2026-04-26	\N	approved	10.00	1.50	11.50	طلب شراء تلقائي - مشروع: مشروع موسي	118	2026-04-26 12:38:16.138171+03	2026-04-26 12:39:18.592213+03	84	\N	\N	\N	موافقة مالية	\N	\N	\N	84	2026-04-26 12:39:18.592213+03	\N
29	PO-0023	5	12	2026-04-26	\N	approved	70.00	10.50	80.50	طلب شراء تلقائي - مشروع: مشروع موسي	118	2026-04-26 13:01:42.084125+03	2026-04-26 13:02:20.535467+03	84	\N	\N	\N	موافقة مالية	\N	\N	\N	84	2026-04-26 13:02:20.535467+03	\N
28	PO-0022	5	12	2026-04-26	\N	approved	140.00	21.00	161.00	طلب شراء تلقائي - مشروع: مشروع موسي	118	2026-04-26 13:01:31.397843+03	2026-04-26 13:35:13.553117+03	84	\N	\N	\N	موافقة مالية	\N	\N	\N	84	2026-04-26 13:35:13.553117+03	\N
\.


--
-- Data for Name: quotations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.quotations (id, inspection_report_id, created_by, created_at, updated_at, status, total_price, discount, tax, details, comments, approved_by, approved_at, rejection_comment, finance_approved_by, finance_approved_at, gm_approved_by, gm_approved_at, boq_data, client_response, rejection_reason, responded_at, client_response_date, lead_id, file_url, payment_status, downpayment_amount, downpayment_date, payment_confirmed_by, payment_confirmed_at, project_id, converted_to_project_at, converted_by) FROM stdin;
9	11	\N	2026-03-29 17:46:51.096439+02	2026-04-13 08:54:56.667948+02	client_rejected	450000.00	20000.00	67500.00	{}	Competitive pricing for large-scale installation	97	2026-04-12 17:32:15.452288+02	\N	84	2026-03-29 17:51:50.838403+02	\N	2026-03-29 17:52:35.574867+02	{"items": [{"item": "Solar Panels 400W", "total": 300000, "quantity": 1500, "unit_price": 200}, {"item": "String Inverters", "total": 50000, "quantity": 10, "unit_price": 5000}, {"item": "Mounting Structure", "total": 75000, "quantity": 5000, "unit_price": 15}, {"item": "Installation & Labor", "total": 25000, "quantity": 1, "unit_price": 25000}], "discount": 20000, "subtotal": 450000, "tax_rate": 0.15, "tax_amount": 67500, "grand_total": 497500}	client_rejected	\N	2026-04-13 08:54:56.629827	2026-03-30 05:26:15.459506	19	\N	pending	0.00	\N	\N	\N	5	2026-04-12 17:32:18.385542+02	97
15	18	113	2026-04-13 08:37:13.516515+02	2026-04-13 09:11:49.84981+02	client_approved	10.00	0.00	14.00	{}		97	2026-04-13 08:38:16.15759+02	\N	84	2026-04-13 08:37:32.29053+02	97	2026-04-13 08:38:09.826024+02	{"tax": 14, "items": [{"name": "gh", "total": 10, "quantity": 1, "unit_price": 10, "description": "gh"}], "discount": 0, "subtotal": 10, "final_price": 11.4}	client_approved	\N	2026-04-13 09:05:18.298589	\N	28	/uploads/reports/report-1776062233508-977257388-mosa magdy cv Mean & mern stack developer N.pdf	downpayment_received	10.00	2026-04-13 09:11:49.84981+02	97	2026-04-13 09:11:49.84981+02	12	\N	\N
18	21	113	2026-05-07 13:23:06.439451+03	2026-05-07 14:22:17.13774+03	client_approved	40.00	0.00	14.00	{}		97	2026-05-07 13:24:54.980568+03	\N	84	2026-05-07 13:23:53.72621+03	97	2026-05-07 13:24:43.120774+03	{"tax": 14, "items": [{"name": "الواح", "total": 40, "quantity": 2, "unit_price": 20, "description": "اي ي"}], "discount": 0, "subtotal": 40, "final_price": 45.6}	client_approved	\N	2026-05-07 13:25:52.114946	\N	34	/uploads/reports/report-1778149386423-157202428-q2 level4.pdf	downpayment_received	10.00	2026-05-07 14:22:17.13774+03	84	2026-05-07 14:22:17.13774+03	15	\N	\N
10	13	113	2026-04-12 13:46:58.022682+02	2026-04-13 07:41:50.621448+02	sent_to_client	32.00	0.00	14.00	{}	gfgf	97	2026-04-12 17:29:04.586541+02	\N	84	2026-04-12 16:40:42.77531+02	97	2026-04-12 16:43:23.314125+02	{"tax": 14, "items": [{"name": "hgpok;", "total": 32, "quantity": 1, "unit_price": 32, "description": "fdf"}], "discount": 0, "subtotal": 32, "final_price": 36.48}	pending	\N	\N	\N	23	/uploads/reports/report-1775994418006-752353869-finantial porposal.docx	pending	0.00	\N	\N	\N	\N	\N	\N
19	22	113	2026-05-07 16:41:18.483056+03	2026-05-07 16:49:18.434005+03	client_approved	1000.00	10.00	15.00	{}	تفاصيل 	97	2026-05-07 16:44:17.71148+03	\N	84	2026-05-07 16:43:06.759472+03	97	2026-05-07 16:43:55.167806+03	{"tax": 15, "items": [{"name": "الواح شمسيه", "total": 1000, "quantity": 10, "unit_price": 100, "description": ""}], "discount": 10, "subtotal": 1000, "final_price": 1035}	client_approved	\N	2026-05-07 16:49:18.434005	\N	38	/uploads/reports/report-1778161278294-907914163-Q31Level 5.pdf	pending	0.00	\N	\N	\N	16	\N	\N
\.


--
-- Data for Name: receipt_voucher_invoices; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.receipt_voucher_invoices (id, receipt_voucher_id, sales_invoice_id, amount_applied, created_at) FROM stdin;
1	1	4	57.00	2026-04-23 12:21:29.271789
2	1	2	115.00	2026-04-23 12:21:29.271789
3	1	14	115.00	2026-04-23 12:21:29.271789
4	1	6	22.00	2026-04-23 12:21:29.271789
5	2	4	57.00	2026-04-23 12:21:57.405917
6	2	2	115.00	2026-04-23 12:21:57.405917
7	2	14	115.00	2026-04-23 12:21:57.405917
8	2	6	22.00	2026-04-23 12:21:57.405917
9	3	12	11.50	2026-04-23 13:11:21.777701
10	4	12	11.50	2026-04-23 13:11:30.876015
11	5	10	23.00	2026-04-23 13:21:49.370449
12	6	8	11.00	2026-04-23 13:29:52.239112
13	7	9	11.00	2026-04-23 13:41:33.808768
14	8	15	10.00	2026-04-23 14:00:15.144546
15	9	17	500.00	2026-04-23 17:05:33.632006
16	10	13	50.00	2026-04-23 17:15:28.968952
17	11	26	100000.00	2026-04-26 18:56:56.012352
18	12	27	9000.00	2026-04-26 19:06:47.459284
20	14	30	1000.00	2026-05-07 14:57:13.419523
21	15	26	1000.00	2026-05-07 14:59:59.33968
\.


--
-- Data for Name: receipt_vouchers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.receipt_vouchers (id, voucher_no, client_id, receipt_date, amount, payment_method, payment_account_id, reference_no, description, status, created_by, posted_by, posted_at, created_at, updated_at) FROM stdin;
1	RV-2026-0001	117	2026-04-23	309.00	cash	79	SI-2026-0015	تحصيل فاتوره الاولي 	posted	84	\N	\N	2026-04-23 12:21:29.250821	2026-04-23 12:21:29.250821
2	RV-2026-0002	117	2026-04-23	309.00	cash	79	SI-2026-0015	تحصيل فاتوره الاولي 	posted	84	84	2026-04-23 12:25:15.900317	2026-04-23 12:21:57.403746	2026-04-23 12:25:15.900317
3	RV-2026-0003	117	2026-04-23	11.50	cash	79	SI-2026-0015	ة	posted	84	\N	\N	2026-04-23 13:11:21.763816	2026-04-23 13:11:21.763816
5	RV-2026-0005	117	2026-04-23	23.00	bank	110	SI-2026-0015	ى	posted	84	\N	\N	2026-04-23 13:21:49.364231	2026-04-23 13:21:49.364231
4	RV-2026-0004	117	2026-04-23	11.50	cash	79	SI-2026-0015	ة	cancelled	84	\N	\N	2026-04-23 13:11:30.873631	2026-04-23 13:25:40.744738
6	RV-2026-0006	117	2026-04-23	11.00	cash	79	00	0	posted	84	\N	\N	2026-04-23 13:29:52.226006	2026-04-23 13:29:52.226006
7	RV-2026-0007	117	2026-04-23	11.00	cash	79	1213131	ظ	posted	84	\N	\N	2026-04-23 13:41:33.800599	2026-04-23 13:41:33.800599
8	RV-2026-0008	117	2026-04-23	10.00	cash	79	101010	0	posted	84	84	2026-04-23 14:00:15.232367	2026-04-23 14:00:15.137961	2026-04-23 14:00:15.232367
9	RV-2026-0009	117	2026-04-23	500.00	bank	110	0223	12	posted	84	84	2026-04-23 17:05:33.694568	2026-04-23 17:05:33.61752	2026-04-23 17:05:33.694568
10	RV-2026-0010	117	2026-04-23	50.00	cash	79	0124	نقديه	cancelled	84	\N	\N	2026-04-23 17:15:28.962231	2026-04-23 17:16:11.416229
11	RV-2026-0011	117	2026-04-26	100000.00	bank	112	0141010101	\N	posted	84	84	2026-04-26 18:56:56.205632	2026-04-26 18:56:55.997319	2026-04-26 18:56:56.205632
12	RV-2026-0012	117	2026-04-26	9000.00	cash	79	10101010	\N	posted	84	84	2026-04-26 19:06:47.634315	2026-04-26 19:06:47.456606	2026-04-26 19:06:47.634315
14	RV-2026-0013	156	2026-05-07	1000.00	cash	79	2525225126	\N	posted	84	84	2026-05-07 14:57:13.491532	2026-05-07 14:57:13.412192	2026-05-07 14:57:13.491532
15	RV-2026-0014	117	2026-05-09	1000.00	cash	79	\N	\N	posted	84	84	2026-05-07 14:59:59.410164	2026-05-07 14:59:59.333998	2026-05-07 14:59:59.410164
\.


--
-- Data for Name: role_permissions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.role_permissions (role_id, permission_id) FROM stdin;
1	1
1	2
1	3
1	4
1	5
1	6
1	7
1	8
1	9
1	10
1	11
1	12
1	13
1	14
1	15
1	16
1	17
1	18
1	19
1	20
1	21
1	22
1	23
1	24
1	25
1	26
1	27
1	28
2	2
2	3
2	4
2	5
2	6
2	7
2	8
2	9
2	10
2	11
2	12
2	13
2	14
2	15
2	16
2	17
2	18
2	19
2	20
2	21
2	22
2	23
2	24
2	25
2	26
2	27
2	28
3	27
3	28
3	26
1	89
1	90
1	94
1	95
1	97
1	99
1	100
1	101
1	102
1	103
1	104
1	105
1	106
1	107
1	108
1	109
1	110
2	89
2	90
2	94
2	95
2	97
2	99
2	100
2	101
2	102
2	103
2	104
2	105
2	106
2	107
2	108
2	109
2	110
25	141
25	142
25	143
25	22
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.roles (id, name, description, created_at, updated_at) FROM stdin;
1	super_admin	مسؤول النظام — صلاحيات تقنية كاملة	2026-03-23 05:03:00.479442+02	2026-03-23 05:03:00.479442+02
2	general_manager	المدير العام — صلاحيات إدارية كاملة	2026-03-23 05:03:00.487333+02	2026-03-23 05:03:00.487333+02
3	dept_head	مدير الإدارة — صلاحيات خاصة بقسمه فقط	2026-03-23 05:03:00.488892+02	2026-03-23 05:03:00.488892+02
10	sales_rep	مندوب المبيعات — مسؤول عن المعاينات والعملاء	2026-03-23 06:59:35.758975+02	2026-03-23 06:59:35.758975+02
11	engineer	المهندس — يكتب تقارير المعاينة	2026-03-23 06:59:35.758975+02	2026-03-23 06:59:35.758975+02
12	quotation_specialist	أخصائي العروض — يجهز عروض الأسعار	2026-03-23 06:59:35.758975+02	2026-03-23 06:59:35.758975+02
13	finance_manager	مدير المالية — يراجع ويعتمد العروض	2026-03-23 06:59:35.758975+02	2026-03-23 06:59:35.758975+02
14	project_manager	مدير المشروع — يدير تنفيذ المشاريع	2026-03-23 06:59:35.758975+02	2026-03-23 06:59:35.758975+02
15	client	العميل — يشوف العروض ويوافق عليها	2026-03-23 06:59:35.758975+02	2026-03-23 06:59:35.758975+02
16	hr_manager	مدير الموارد البشرية — مسؤول عن شؤون الموظفين	2026-03-23 07:53:38.585622+02	2026-03-23 07:53:38.585622+02
20	employee	موظف	2026-03-23 19:21:31.492481+02	2026-03-23 19:21:31.492481+02
24	procurement_manager	مسؤول عن مراجعة طلبات الشراء وتوفير عروض الأسعار والموافقة عليها	2026-03-30 22:49:56.88985+02	2026-03-30 22:49:56.88985+02
25	contract_dept_head	مسؤول العقود - صلاحيات رفع العقود وإدارة المشاريع للقراءة فقط	2026-04-14 17:57:07.099249+02	2026-04-14 17:57:07.099249+02
35	warehouse_manager	Warehouse Manager - Inventory and warehouse operations	2026-04-27 11:20:15.203435+03	2026-04-27 11:20:15.203435+03
39	inventory_manager	مدير المخزون — مسؤول عن إدارة المخزون والمستودعات	2026-05-04 11:45:29.170525+03	2026-05-04 11:45:29.170525+03
40	sales_manager	مدير المبيعات — مسؤول عن إدارة فريق المبيعات	2026-05-04 11:45:29.170525+03	2026-05-04 11:45:29.170525+03
41	dep_pr_manager	مدير العلاقات العامة للإدارة — مسؤول عن العلاقات العامة	2026-05-04 11:45:29.170525+03	2026-05-04 11:45:29.170525+03
42	qs_manager	مدير المساحات — مسؤول عن أعمال الكميات والمساحات	2026-05-04 11:45:29.170525+03	2026-05-04 11:45:29.170525+03
43	mc_manager	مدير التحكم والمتابعة — مسؤول عن متابعة المشاريع	2026-05-04 11:45:29.170525+03	2026-05-04 11:45:29.170525+03
44	tech_head	رئيس القسم التقني — مسؤول عن الفريق التقني	2026-05-04 11:45:29.170525+03	2026-05-04 11:45:29.170525+03
45	Labor	عامل — يؤدي الأعمال الميدانية	2026-05-04 11:45:29.170525+03	2026-05-04 11:45:29.170525+03
46	Technicians	فني — يؤدي الأعمال الفنية والتقنية	2026-05-04 11:45:29.170525+03	2026-05-04 11:45:29.170525+03
\.


--
-- Data for Name: sales_invoice_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sales_invoice_items (id, invoice_id, inventory_item_id, warehouse_id, quantity, unit_price, total_amount, notes, created_at, updated_at) FROM stdin;
1	24	21	1	1.000	10.00	10.00	\N	2026-04-26 12:10:19.097132+03	2026-04-26 12:10:19.097132+03
2	25	1	1	100.000	10.00	1000.00	\N	2026-04-26 18:33:34.712782+03	2026-04-26 18:33:34.712782+03
3	26	2	1	100.000	1000.00	100000.00	\N	2026-04-26 18:51:40.720771+03	2026-04-26 18:51:40.720771+03
4	27	2	1	10.000	850.00	8500.00	\N	2026-04-26 19:05:08.569823+03	2026-04-26 19:05:08.569823+03
5	28	2	1	5.000	850.00	4250.00	\N	2026-04-26 19:07:50.581145+03	2026-04-26 19:07:50.581145+03
6	29	2	1	10.000	60.00	600.00	\N	2026-05-04 10:51:54.896415+03	2026-05-04 10:51:54.896415+03
7	30	1	1	10.000	100.00	1000.00	\N	2026-05-07 14:24:05.324661+03	2026-05-07 14:24:05.324661+03
8	31	1	1	1.000	100.00	100.00	\N	2026-05-07 14:56:12.163201+03	2026-05-07 14:56:12.163201+03
9	32	1	1	1.000	100.00	100.00	\N	2026-05-07 14:58:55.902355+03	2026-05-07 14:58:55.902355+03
10	33	1	1	16.000	100.00	1600.00	\N	2026-05-07 15:44:27.003486+03	2026-05-07 15:44:27.003486+03
11	34	1	1	50.000	100.00	5000.00	\N	2026-05-07 17:03:43.966463+03	2026-05-07 17:03:43.966463+03
\.


--
-- Data for Name: sales_invoices; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sales_invoices (id, invoice_number, project_id, client_id, lead_id, issue_date, due_date, subtotal, vat_rate, vat_amount, total_amount, receivable_account_id, revenue_account_id, vat_account_id, status, payment_status, amount_paid, journal_entry_id, description, notes, created_by, created_at, updated_at, pdf_path, paid_amount, is_tax_invoice, tax_invoice_id, discount_amount, discount_account_id) FROM stdin;
27	SI-2026-0027	12	117	28	2026-04-26	2026-04-27	8500.00	15.00	1275.00	9775.00	122	11	114	final	partial	0.00	140	Sales Invoice for موسي	\N	84	2026-04-26 19:05:08.569823	2026-04-26 19:06:47.462903	/uploads/invoices/sales_SI-2026-0027.pdf	9000.00	f	\N	0.00	\N
28	SI-2026-0028	12	117	28	2026-04-26	2026-05-03	4250.00	15.00	637.50	4887.50	122	11	114	final	unpaid	0.00	142	Sales Invoice for موسي	\N	84	2026-04-26 19:07:50.581145	2026-04-26 19:07:54.603322	/uploads/invoices/sales_SI-2026-0028.pdf	0.00	f	\N	0.00	\N
5	SI-2026-0005	12	117	28	2026-04-22	2026-05-09	50.00	15.00	7.50	57.50	122	19	114	draft	unpaid	0.00	50	10	\N	84	2026-04-22 09:48:54.607425	2026-04-22 09:48:54.843033	/uploads/invoices/sales_SI-2026-0005.pdf	0.00	f	\N	0.00	\N
7	SI-2026-0007	12	117	28	2026-04-22	2026-05-02	19.93	15.00	2.99	22.92	122	19	114	draft	unpaid	0.00	52	10	\N	84	2026-04-22 09:59:54.33339	2026-04-22 09:59:54.57816	/uploads/invoices/sales_SI-2026-0007.pdf	0.00	f	\N	0.00	\N
14	SI-2026-0014	12	117	28	2026-04-22	2026-05-08	100.00	15.00	15.00	115.00	122	25	114	final	paid	0.00	59	ز	\N	84	2026-04-22 10:26:35.99332	2026-04-23 16:58:20.415433	/uploads/invoices/sales_SI-2026-0014.pdf	230.00	t	20	0.00	\N
16	SI-2026-0016	12	117	28	2026-04-23	\N	10.00	0.00	0.00	10.00	122	11	\N	final	unpaid	0.00	83	0	\N	84	2026-04-23 14:21:49.47341	2026-04-23 16:58:32.689428	/uploads/invoices/sales_SI-2026-0016.pdf	0.00	t	21	0.00	\N
17	SI-2026-0017	12	117	28	2026-04-23	\N	500.00	0.00	0.00	500.00	122	19	\N	final	paid	0.00	84	0	\N	84	2026-04-23 15:12:49.67848	2026-04-23 17:05:33.634461	/uploads/invoices/sales_SI-2026-0017.pdf	500.00	t	19	0.00	\N
29	SI-2026-0029	\N	\N	\N	2026-05-04	2026-05-07	600.00	15.00	90.00	690.00	157	11	114	final	partial	0.00	217	Sales Invoice for محمد جمال 	\N	84	2026-05-04 10:51:54.896415	2026-05-05 17:21:16.981573	/uploads/invoices/sales_SI-2026-0029.pdf	600.00	t	\N	0.00	\N
21	SI-2026-0021	12	117	28	2026-04-25	2026-04-30	100.00	15.00	13.50	103.50	122	128	114	final	unpaid	0.00	122	تفاتوره تجريبيه بسيطه 	\N	84	2026-04-25 16:08:06.448404	2026-04-25 16:09:15.887711	/uploads/invoices/sales_SI-2026-0021.pdf	0.00	f	\N	10.00	130
26	SI-2026-0026	12	117	28	2026-04-26	\N	100000.00	15.00	15000.00	115000.00	122	11	114	final	partial	0.00	138	Sales Invoice for موسي	\N	84	2026-04-26 18:51:40.720771	2026-05-07 14:59:59.343615	/uploads/invoices/sales_SI-2026-0026.pdf	101000.00	f	\N	0.00	\N
2	SI-2026-0002	12	117	28	2026-04-22	2026-04-22	100.00	15.00	15.00	115.00	122	19	114	final	paid	0.00	47	g	\N	84	2026-04-22 09:38:54.737486	2026-04-23 17:14:26.830861	/uploads/invoices/sales_SI-2026-0002.pdf	230.00	f	\N	0.00	\N
4	SI-2026-0004	12	117	28	2026-04-22	2026-04-10	50.00	15.00	7.50	57.50	122	25	114	final	paid	0.00	49	/	\N	84	2026-04-22 09:47:07.175486	2026-04-23 17:14:29.927044	/uploads/invoices/sales_SI-2026-0004.pdf	114.00	f	\N	0.00	\N
12	SI-2026-0012	12	117	28	2026-04-22	2026-04-23	10.00	15.00	1.50	11.50	122	19	114	final	paid	0.00	57	ظ	\N	84	2026-04-22 10:17:59.181967	2026-04-23 17:14:32.511241	/uploads/invoices/sales_SI-2026-0012.pdf	23.00	f	\N	0.00	\N
10	SI-2026-0010	12	117	28	2026-04-22	2026-05-01	20.00	15.00	3.00	23.00	122	19	114	final	paid	0.00	55	ظ	\N	84	2026-04-22 10:12:48.941266	2026-04-23 17:14:35.183954	/uploads/invoices/sales_SI-2026-0010.pdf	23.00	f	\N	0.00	\N
18	SI-2026-0018	12	117	28	2026-04-24	2026-05-09	29.98	0.00	0.00	29.98	122	19	\N	final	unpaid	0.00	89	Sales Invoice for موسي	\N	84	2026-04-24 15:50:26.136082	2026-04-24 15:50:36.130346	/uploads/invoices/sales_SI-2026-0018.pdf	0.00	t	24	0.00	\N
19	SI-2026-0019	12	117	28	2026-04-24	2026-05-10	100.00	15.00	14.70	112.70	122	11	114	final	unpaid	0.00	114	Sales Invoice for موسي	\N	84	2026-04-24 18:12:16.885453	2026-04-24 18:12:26.801033	/uploads/invoices/sales_SI-2026-0019.pdf	0.00	t	25	2.00	130
8	SI-2026-0008	12	117	28	2026-04-22	2026-05-09	9.96	15.00	1.49	11.45	122	19	114	draft	partial	0.00	53	ى	\N	84	2026-04-22 10:04:19.455805	2026-04-23 13:29:52.242082	/uploads/invoices/sales_SI-2026-0008.pdf	11.00	f	\N	0.00	\N
9	SI-2026-0009	12	117	28	2026-04-22	2026-05-09	9.96	15.00	1.49	11.45	122	25	114	draft	partial	0.00	54	10	\N	84	2026-04-22 10:07:53.169584	2026-04-23 13:41:33.811928	/uploads/invoices/sales_SI-2026-0009.pdf	11.00	f	\N	0.00	\N
15	SI-2026-0015	12	117	28	2026-04-23	2026-05-01	10.00	0.00	0.00	10.00	122	19	\N	final	paid	0.00	79	m	\N	84	2026-04-23 10:08:12.916778	2026-04-24 15:15:26.288109	/uploads/invoices/sales_SI-2026-0015.pdf	10.00	t	22	0.00	\N
13	SI-2026-0013	12	117	28	2026-04-22	2026-05-02	50.00	0.00	0.00	50.00	122	11	\N	final	paid	0.00	58	ظ	\N	84	2026-04-22 10:24:31.056283	2026-04-24 15:26:54.119619	/uploads/invoices/sales_SI-2026-0013.pdf	50.00	t	23	0.00	\N
3	SI-2026-0003	12	117	28	2026-04-22	2026-05-08	30.00	15.00	4.50	34.50	122	25	114	final	unpaid	0.00	48	h	\N	84	2026-04-22 09:42:01.701892	2026-04-24 15:28:30.154951	/uploads/invoices/sales_SI-2026-0003.pdf	0.00	f	\N	0.00	\N
11	SI-2026-0011	12	117	28	2026-04-22	2026-05-07	15.00	15.00	2.25	17.25	122	11	114	final	unpaid	0.00	56	ظ	\N	84	2026-04-22 10:14:28.204933	2026-04-24 15:28:57.070211	/uploads/invoices/sales_SI-2026-0011.pdf	0.00	f	\N	0.00	\N
6	SI-2026-0006	12	117	28	2026-04-22	2026-05-10	19.96	15.00	2.99	22.95	122	19	114	final	paid	0.00	51	;	\N	84	2026-04-22 09:49:49.005697	2026-04-24 15:29:00.461853	/uploads/invoices/sales_SI-2026-0006.pdf	44.00	f	\N	0.00	\N
20	SI-2026-0020	12	117	28	2026-04-24	2026-05-01	15000.00	0.00	0.00	14985.00	122	11	\N	final	unpaid	0.00	116	Sales Invoice for موسي	\N	84	2026-04-24 19:20:54.060157	2026-04-25 09:37:22.31723	/uploads/invoices/sales_SI-2026-0020.pdf	0.00	t	26	15.00	130
1	SI-2026-0001	12	117	28	2026-04-21	2026-05-07	100.00	15.00	15.00	115.00	122	11	114	final	unpaid	0.00	46	gh	\N	84	2026-04-21 17:27:50.299397	2026-04-25 16:04:30.991789	/uploads/invoices/sales_SI-2026-0001.pdf	0.00	f	\N	0.00	\N
24	SI-2026-0024	12	117	28	2026-04-26	2026-05-03	10.00	0.00	0.00	10.00	122	11	\N	final	unpaid	0.00	126	Sales Invoice for موسي	\N	84	2026-04-26 12:10:19.097132	2026-04-26 12:11:02.716102	/uploads/invoices/sales_SI-2026-0024.pdf	0.00	t	28	0.00	\N
22	SI-2026-0022	12	117	28	2026-04-26	2026-05-02	10.00	15.00	1.20	9.20	122	11	114	final	unpaid	0.00	123	Sales Invoice for موسي	\N	84	2026-04-26 10:57:25.930419	2026-04-26 10:57:40.581119	/uploads/invoices/sales_SI-2026-0022.pdf	0.00	t	27	2.00	130
23	SI-2026-0023	12	117	28	2026-04-26	2026-04-27	10.00	0.00	0.00	10.00	122	11	\N	draft	unpaid	0.00	125	Sales Invoice for موسي	\N	84	2026-04-26 11:27:32.210455	2026-04-26 11:27:32.665887	/uploads/invoices/sales_SI-2026-0023.pdf	0.00	f	\N	0.00	\N
25	SI-2026-0025	12	117	28	2026-04-26	\N	1000.00	15.00	150.00	1150.00	122	11	114	final	unpaid	0.00	137	Sales Invoice for موسي	\N	84	2026-04-26 18:33:34.712782	2026-04-26 18:33:40.77713	/uploads/invoices/sales_SI-2026-0025.pdf	0.00	f	\N	0.00	\N
32	SI-2026-0032	12	117	28	2026-05-07	2026-05-09	100.00	15.00	15.00	115.00	122	11	114	final	unpaid	0.00	225	Sales Invoice for موسي	\N	84	2026-05-07 14:58:55.902355	2026-05-07 14:59:00.87906	/uploads/invoices/sales_SI-2026-0032.pdf	0.00	f	\N	0.00	\N
31	SI-2026-0031	15	156	34	2026-05-07	2026-05-09	100.00	15.00	15.00	115.00	157	11	114	final	unpaid	0.00	223	Sales Invoice for محمد جمال	\N	84	2026-05-07 14:56:12.163201	2026-05-07 14:56:21.131477	/uploads/invoices/sales_SI-2026-0031.pdf	0.00	t	31	0.00	\N
30	SI-2026-0030	15	156	34	2026-05-07	2026-05-07	1000.00	15.00	150.00	1150.00	157	25	114	final	partial	0.00	222	فاتورة الواح	\N	84	2026-05-07 14:24:05.324661	2026-05-07 14:57:13.424284	/uploads/invoices/sales_SI-2026-0030.pdf	1000.00	t	30	0.00	\N
33	SI-2026-0033	15	156	34	2026-05-07	2026-05-07	1600.00	15.00	240.00	1840.00	157	25	114	final	unpaid	0.00	227	Sales Invoice for محمد جمال	\N	84	2026-05-07 15:44:27.003486	2026-05-07 15:45:03.901251	/uploads/invoices/sales_SI-2026-0033.pdf	0.00	f	\N	0.00	\N
34	SI-2026-0034	16	157	38	2026-05-07	2026-05-10	5000.00	15.00	750.00	5750.00	159	25	114	final	unpaid	0.00	230	Sales Invoice for ابراهيم	\N	84	2026-05-07 17:03:43.966463	2026-05-07 17:05:59.946339	/uploads/invoices/sales_SI-2026-0034.pdf	0.00	t	32	0.00	\N
\.


--
-- Data for Name: suppliers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.suppliers (id, supplier_code, name, name_ar, supplier_type, vat_number, cr_number, contact_person, phone, email, address, payment_terms, coa_account_code, is_active, notes, created_by, created_at, updated_at) FROM stdin;
1	SUP-0001	Saudi Solar Solutions	\N	local	310122345600003	\N	\N	0501234567	\N	\N	\N	21301	t	\N	84	2026-04-07 08:59:02.736541+02	2026-05-04 10:08:06.712588+03
2	SUP-0002	Saudi Solar Solutions	\N	local	310122345600003	\N	\N	0501234567	\N	\N	\N	21301	t	\N	84	2026-04-07 09:07:08.345742+02	2026-05-04 10:08:06.712588+03
3	SUP-0003	Saudi Solar Solutions	\N	local	310122345600003	\N	\N	0501234567	\N	\N	\N	21301	t	\N	84	2026-04-07 09:10:41.496541+02	2026-05-04 10:08:06.712588+03
4	SUP-0004	Saudi Solar Solutions	\N	local	310122345600003	\N	\N	0501234567	\N	\N	\N	21301	t	\N	84	2026-04-07 09:11:59.549746+02	2026-05-04 10:08:06.712588+03
5	SUP-0005	Mosa Elwayly	Mosa Elwayly	local	0100134	20424243	Mosa Elwayly	01115982338	mosae1lwayly@gmail.com	ng	Net 30	21301	t	ng	95	2026-04-19 11:57:23.456104+02	2026-05-04 10:08:06.712588+03
\.


--
-- Data for Name: tasks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tasks (id, project_id, parent_task_id, title, description, assigned_to, start_date, due_date, completed_at, status, priority, metadata, created_at, updated_at) FROM stdin;
1	3	\N	مهمة جديدة	تفاصيل المهمة	\N	\N	\N	\N	pending	medium	\N	2026-03-30 07:28:05.435978+02	2026-03-30 07:28:05.435978+02
2	3	\N	إعداد تقرير شهري	تقرير الأداء لفريق المشروع	\N	2026-03-30	2026-04-05	\N	pending	high	\N	2026-03-30 07:30:31.467998+02	2026-03-30 07:30:31.467998+02
3	3	\N	إعداد تقرير شهري	تقرير الأداء لفريق المشروع	92	2026-03-30	2026-04-05	\N	pending	high	\N	2026-03-30 07:32:45.181442+02	2026-03-30 07:32:45.181442+02
4	3	\N	إعداد تقرير شهري	يبق روح مصمص ل البوج النهارده منتساش   	92	2026-03-30	2026-04-05	\N	pending	high	\N	2026-03-30 07:33:41.508516+02	2026-03-30 07:33:41.508516+02
5	3	3	إعداد تقرير شهري	يبق روح مصمص ل البوج بكرا منتساش   	92	2026-03-30	2026-04-05	\N	pending	high	\N	2026-03-30 07:35:37.770568+02	2026-03-30 07:35:37.770568+02
6	3	5	إعداد تقرير شهري	يبق روح مصمص ل البوج لا منتساش   	92	2026-03-30	2026-04-05	\N	pending	high	\N	2026-03-30 07:36:18.025368+02	2026-03-30 07:36:18.025368+02
7	5	\N	مهمة 1		\N	\N	\N	\N	pending	medium	{"total": 300000, "boq_item": true, "quantity": 1500, "unit_price": 200, "source_quotation_id": "9"}	2026-04-12 17:32:18.373423+02	2026-04-12 17:32:18.373423+02
8	5	\N	مهمة 2		\N	\N	\N	\N	pending	medium	{"total": 50000, "boq_item": true, "quantity": 10, "unit_price": 5000, "source_quotation_id": "9"}	2026-04-12 17:32:18.383466+02	2026-04-12 17:32:18.383466+02
9	5	\N	مهمة 3		\N	\N	\N	\N	pending	medium	{"total": 75000, "boq_item": true, "quantity": 5000, "unit_price": 15, "source_quotation_id": "9"}	2026-04-12 17:32:18.384207+02	2026-04-12 17:32:18.384207+02
10	5	\N	مهمة 4		\N	\N	\N	\N	pending	medium	{"total": 25000, "boq_item": true, "quantity": 1, "unit_price": 25000, "source_quotation_id": "9"}	2026-04-12 17:32:18.38485+02	2026-04-12 17:32:18.38485+02
18	12	\N	gh	gh	\N	\N	\N	2026-04-14 08:09:47.043813+02	completed	medium	\N	2026-04-13 09:05:18.298589+02	2026-04-14 08:09:47.043813+02
20	12	\N	تركيب	غغغغ	112	\N	2026-04-15	2026-04-14 08:12:41.860752+02	completed	high	\N	2026-04-14 08:12:18.753165+02	2026-04-14 08:12:41.860752+02
22	12	\N	وة	وة	112	\N	2026-04-14	2026-04-14 08:15:51.171923+02	completed	medium	\N	2026-04-14 08:15:35.695112+02	2026-04-14 08:15:51.171923+02
23	12	\N	ببب	بب	112	\N	2026-04-24	2026-04-14 08:18:10.089575+02	completed	medium	\N	2026-04-14 08:16:45.161185+02	2026-04-14 08:18:10.089575+02
19	12	\N	تركيب 	ر	112	\N	2026-04-14	2026-04-14 13:45:47.471763+02	completed	medium	\N	2026-04-13 19:00:58.825272+02	2026-04-14 13:45:47.471763+02
21	12	\N	لرررر	رر	112	\N	2026-05-02	2026-04-14 13:45:53.300942+02	completed	medium	\N	2026-04-14 08:13:20.04809+02	2026-04-14 13:45:53.300942+02
24	12	\N	gggg	gggg	112	\N	2026-04-16	2026-04-14 13:56:04.561258+02	completed	medium	\N	2026-04-14 13:55:24.060944+02	2026-04-14 13:56:04.561258+02
29	15	\N	الواح	اي ي	\N	\N	\N	\N	in_progress	medium	{"unit": "piece", "total": 40, "source": "quotation_boq", "boq_item": true, "quantity": 2, "unit_price": 20, "quotation_id": 18}	2026-05-07 13:25:52.114946+03	2026-05-07 14:12:48.7677+03
30	16	\N	الواح شمسيه	بند من عرض السعر: الواح شمسيه	\N	\N	\N	\N	pending	medium	{"unit": "piece", "total": 1000, "source": "quotation_boq", "boq_item": true, "quantity": 10, "unit_price": 100, "quotation_id": 19}	2026-05-07 16:49:18.434005+03	2026-05-07 16:49:18.434005+03
31	16	\N	الال	ؤيبي	152	\N	2026-05-11	2026-05-07 17:26:59.530435+03	completed	medium	\N	2026-05-07 16:53:36.52687+03	2026-05-07 17:26:59.530435+03
\.


--
-- Data for Name: tax_invoice_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tax_invoice_logs (id, invoice_id, action, zatca_response, performed_by, performed_at, notes) FROM stdin;
1	15	generated	{"zatca_uuid": "d2e5b69e-707c-4959-9079-7f00fa8e7b28", "tax_invoice_no": "TI-2026-00001"}	84	2026-04-23 14:25:39.905961+02	\N
2	15	generated	{"zatca_uuid": "7efe2d3b-2e8d-4f63-9fc6-1bf4b3578e1b", "tax_invoice_no": "TI-2026-00001"}	84	2026-04-23 14:26:39.171883+02	\N
3	14	generated	{"zatca_uuid": "af29d874-f05c-4a50-8324-811c131eaf91", "tax_invoice_no": "TI-2026-00001"}	84	2026-04-23 14:27:53.133942+02	\N
4	15	generated	{"zatca_uuid": "58bdbaed-0da2-4098-9670-bb98ab11fbe2", "tax_invoice_no": "TI-2026-00001"}	84	2026-04-23 14:29:54.287132+02	\N
5	14	generated	{"zatca_uuid": "f0656043-dd87-4cf6-ba7f-098586f04c56", "tax_invoice_no": "TI-2026-00001"}	84	2026-04-23 14:30:19.303642+02	\N
6	14	generated	{"zatca_uuid": "b9675c52-7629-4706-b56d-65c9ffe0148d", "tax_invoice_no": "TI-2026-00001"}	84	2026-04-23 14:31:57.196201+02	\N
7	14	generated	{"zatca_uuid": "39ce403c-9038-4297-a676-a6eb6ae67577", "tax_invoice_no": "TI-2026-00001"}	84	2026-04-23 14:32:00.377986+02	\N
8	15	generated	{"zatca_uuid": "77e51995-0646-420d-84e5-6eda4da95b16", "tax_invoice_no": "TI-2026-00001"}	84	2026-04-23 14:48:53.516482+02	\N
9	15	generated	{"zatca_uuid": "7bfc86c2-8350-4660-a54a-f77a3090a61c", "tax_invoice_no": "TI-2026-00001"}	84	2026-04-23 14:49:53.8763+02	\N
10	19	generated	{"zatca_uuid": "607c39c9-a016-451b-9a4e-e53a053f8200", "tax_invoice_no": "TI-2026-00001", "sales_invoice_id": 17}	84	2026-04-23 16:55:16.605393+02	\N
11	20	generated	{"zatca_uuid": "5ec7e61a-e532-428f-967a-b57311bfe91a", "tax_invoice_no": "TI-2026-00002", "sales_invoice_id": 14}	84	2026-04-23 16:58:20.415433+02	\N
12	21	generated	{"zatca_uuid": "922346bf-84f1-4119-a439-50ccf0993e35", "tax_invoice_no": "TI-2026-00003", "sales_invoice_id": 16}	84	2026-04-23 16:58:32.689428+02	\N
13	22	generated	{"zatca_uuid": "c0a8337d-3c04-4cf2-9524-cdb16e7be228", "tax_invoice_no": "TI-2026-00004", "sales_invoice_id": 15}	84	2026-04-24 15:15:26.288109+03	\N
14	23	generated	{"zatca_uuid": "03c73d15-11cc-4fdb-90b1-6fc412971492", "tax_invoice_no": "TI-2026-00005", "sales_invoice_id": 13}	84	2026-04-24 15:26:54.119619+03	\N
15	24	generated	{"zatca_uuid": "e4f1ffc2-7e39-4b1d-9310-587f4867ca44", "tax_invoice_no": "TI-2026-00006", "sales_invoice_id": 18}	84	2026-04-24 15:50:36.130346+03	\N
16	25	generated	{"zatca_uuid": "9f977e3d-b919-440b-8e3b-8ab92096f21b", "tax_invoice_no": "TI-2026-00007", "sales_invoice_id": 19}	84	2026-04-24 18:12:26.801033+03	\N
17	26	generated	{"zatca_uuid": "714b6e58-6e58-452c-8cca-571b6979199e", "tax_invoice_no": "TI-2026-00008", "sales_invoice_id": 20}	84	2026-04-25 09:37:22.31723+03	\N
18	27	generated	{"zatca_uuid": "90314dfe-93c0-4790-b944-ca22837eb8e9", "tax_invoice_no": "TI-2026-00009", "sales_invoice_id": 22}	84	2026-04-26 10:57:40.581119+03	\N
19	28	generated	{"zatca_uuid": "a5961ce0-18d7-4590-93da-6bf03273ba7a", "tax_invoice_no": "TI-2026-00010", "sales_invoice_id": 24}	84	2026-04-26 12:11:02.716102+03	\N
21	30	generated	{"zatca_uuid": "a75521ee-a631-42b6-a071-c1b20ea6cb8e", "tax_invoice_no": "TI-2026-00011", "sales_invoice_id": 30}	84	2026-05-07 14:54:14.408142+03	\N
22	31	generated	{"zatca_uuid": "531138a4-e73c-404a-8f3e-8f563cf5925a", "tax_invoice_no": "TI-2026-00012", "sales_invoice_id": 31}	84	2026-05-07 14:56:21.131477+03	\N
23	32	generated	{"zatca_uuid": "c1b304ec-0df2-4a73-ad0e-095caa7e0882", "tax_invoice_no": "TI-2026-00013", "sales_invoice_id": 34}	84	2026-05-07 17:05:59.946339+03	\N
\.


--
-- Data for Name: time_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.time_logs (id, employee_id, clock_in, clock_out, session_hours, clock_in_ip, clock_out_ip, clock_in_location, clock_out_location, device_type, status, created_at, updated_at) FROM stdin;
1	59	2026-05-02 16:10:42.061+03	2026-05-02 16:15:50.434+03	0.09	127.0.0.1	::1	Test Location	\N	web	closed	2026-05-02 16:10:42.063752+03	2026-05-02 16:15:50.435997+03
2	59	2026-05-02 16:16:44.725+03	2026-05-02 16:16:53.094+03	0.00	::1	::1	\N	\N	web	closed	2026-05-02 16:16:44.727073+03	2026-05-02 16:16:53.095933+03
3	56	2026-05-02 16:17:40.194+03	2026-05-02 16:18:01.76+03	0.01	::1	::1	\N	\N	web	closed	2026-05-02 16:17:40.19607+03	2026-05-02 16:18:01.763018+03
4	59	2026-05-02 16:22:00.573+03	2026-05-02 16:22:03.58+03	0.00	::1	::1	\N	\N	web	closed	2026-05-02 16:22:00.574611+03	2026-05-02 16:22:03.582892+03
5	59	2026-05-02 16:28:13.855+03	2026-05-02 16:28:13.869+03	0.00	127.0.0.1	127.0.0.1	Test Location	Test Location	web	closed	2026-05-02 16:28:13.857475+03	2026-05-02 16:28:13.871302+03
6	59	2026-05-02 16:28:30.062+03	2026-05-02 16:28:30.077+03	0.00	127.0.0.1	127.0.0.1	Test Location	Test Location	web	closed	2026-05-02 16:28:30.064412+03	2026-05-02 16:28:30.079195+03
7	59	2026-05-02 16:28:39.539+03	2026-05-02 16:28:39.552+03	0.00	127.0.0.1	127.0.0.1	Test Location	Test Location	web	closed	2026-05-02 16:28:39.54117+03	2026-05-02 16:28:39.55546+03
8	59	2026-05-02 16:28:50.788+03	2026-05-02 16:28:50.801+03	0.00	127.0.0.1	127.0.0.1	Test Location	Test Location	web	closed	2026-05-02 16:28:50.791049+03	2026-05-02 16:28:50.80484+03
9	59	2026-05-02 16:29:01.95+03	2026-05-02 16:29:01.96+03	0.00	127.0.0.1	127.0.0.1	Test Location	Test Location	web	closed	2026-05-02 16:29:01.953263+03	2026-05-02 16:29:01.962401+03
10	59	2026-05-02 16:29:36.228+03	2026-05-02 16:29:36.242+03	0.00	127.0.0.1	127.0.0.1	Test Location	Test Location	web	closed	2026-05-02 16:29:36.231119+03	2026-05-02 16:29:36.244503+03
11	59	2026-05-02 16:30:07.903+03	2026-05-02 16:30:07.917+03	0.00	127.0.0.1	127.0.0.1	Test Location	Test Location	web	closed	2026-05-02 16:30:07.905698+03	2026-05-02 16:30:07.919607+03
12	59	2026-05-02 16:30:29.706+03	2026-05-02 16:30:29.717+03	0.00	127.0.0.1	127.0.0.1	Test Location	Test Location	web	closed	2026-05-02 16:30:29.7094+03	2026-05-02 16:30:29.719958+03
13	59	2026-05-02 16:30:56.655+03	2026-05-02 13:30:56.666+03	0.00	127.0.0.1	127.0.0.1	Test Location	Test Location	web	closed	2026-05-02 16:30:56.657402+03	2026-05-02 16:30:56.668179+03
14	59	2026-05-02 16:31:27.114+03	2026-05-02 16:31:27.126+03	\N	127.0.0.1	\N	Test Location	\N	web	closed	2026-05-02 16:31:27.115741+03	2026-05-02 16:31:27.127693+03
15	59	2026-05-02 16:31:54.121+03	2026-05-02 16:31:54.135+03	\N	127.0.0.1	\N	Test Location	\N	web	closed	2026-05-02 16:31:54.123683+03	2026-05-02 16:31:54.138291+03
16	59	2026-05-02 16:32:10.277+03	2026-05-02 16:32:10.29+03	\N	127.0.0.1	\N	Test Location	\N	web	closed	2026-05-02 16:32:10.280332+03	2026-05-02 16:32:10.292433+03
17	59	2026-05-02 16:32:21.018+03	2026-05-02 16:32:21.032+03	\N	127.0.0.1	\N	Test Location	\N	web	closed	2026-05-02 16:32:21.020472+03	2026-05-02 16:32:21.034343+03
18	59	2026-05-02 16:32:41.782+03	2026-05-02 16:32:41.798+03	\N	127.0.0.1	\N	Test Location	\N	web	closed	2026-05-02 16:32:41.784447+03	2026-05-02 16:32:41.79991+03
19	59	2026-05-02 16:32:55.608+03	2026-05-02 16:32:55.621+03	\N	127.0.0.1	\N	Test Location	\N	web	closed	2026-05-02 16:32:55.610527+03	2026-05-02 16:32:55.623537+03
20	59	2026-05-02 16:33:05.932+03	2026-05-02 16:33:05.946+03	\N	127.0.0.1	\N	Test Location	\N	web	closed	2026-05-02 16:33:05.934465+03	2026-05-02 16:33:05.950537+03
21	59	2026-05-02 16:33:22.87+03	2026-05-02 16:33:22.882+03	\N	127.0.0.1	\N	Test Location	\N	web	closed	2026-05-02 16:33:22.8717+03	2026-05-02 16:33:22.884343+03
22	59	2026-05-02 16:33:38.581+03	2026-05-02 16:33:38.591+03	\N	127.0.0.1	\N	Test Location	\N	web	closed	2026-05-02 16:33:38.583507+03	2026-05-02 16:33:38.593555+03
23	59	2026-05-02 16:33:57.51+03	2026-05-02 16:33:57.525+03	\N	127.0.0.1	\N	Test Location	\N	web	closed	2026-05-02 16:33:57.511859+03	2026-05-02 16:33:57.526699+03
24	59	2026-05-02 16:34:06.097+03	2026-05-02 16:34:06.11+03	\N	127.0.0.1	\N	Test Location	\N	web	closed	2026-05-02 16:34:06.098982+03	2026-05-02 16:34:06.111883+03
25	59	2026-05-02 16:34:16.278+03	2026-05-02 16:34:16.293+03	\N	127.0.0.1	\N	Test Location	\N	web	closed	2026-05-02 16:34:16.279782+03	2026-05-02 16:34:16.295164+03
26	59	2026-05-02 16:34:26.174+03	2026-05-02 16:34:26.189+03	\N	127.0.0.1	\N	Test Location	\N	web	closed	2026-05-02 16:34:26.177061+03	2026-05-02 16:34:26.191169+03
27	59	2026-05-02 16:34:35.603+03	2026-05-02 16:34:35.616+03	\N	127.0.0.1	\N	Test Location	\N	web	closed	2026-05-02 16:34:35.60551+03	2026-05-02 16:34:35.618636+03
28	59	2026-05-02 16:34:44.88+03	2026-05-02 16:34:44.895+03	\N	127.0.0.1	\N	Test Location	\N	web	closed	2026-05-02 16:34:44.882783+03	2026-05-02 16:34:44.89843+03
29	59	2026-05-02 16:34:55.957+03	2026-05-02 16:34:55.968+03	\N	127.0.0.1	\N	Test Location	\N	web	closed	2026-05-02 16:34:55.959399+03	2026-05-02 16:34:55.971437+03
30	59	2026-05-02 16:35:07.856+03	2026-05-02 16:35:07.872+03	\N	127.0.0.1	\N	Test Location	\N	web	closed	2026-05-02 16:35:07.85922+03	2026-05-02 16:35:07.874923+03
31	56	2026-05-02 16:36:59.342+03	2026-05-02 16:37:00.328+03	\N	::1	\N	\N	\N	web	closed	2026-05-02 16:36:59.342941+03	2026-05-02 16:37:00.329483+03
32	59	2026-05-02 16:37:53.417+03	2026-05-02 16:37:53.432+03	\N	127.0.0.1	\N	Test Location	\N	web	closed	2026-05-02 16:37:53.419596+03	2026-05-02 16:37:53.433819+03
33	59	2026-05-02 16:38:57.38+03	2026-05-02 16:39:01.286+03	\N	::1	\N	\N	\N	web	closed	2026-05-02 16:38:57.382617+03	2026-05-02 16:39:01.288534+03
34	60	2026-05-02 19:38:28.043+03	2026-05-02 19:38:28.869+03	\N	::1	\N	\N	\N	web	closed	2026-05-02 19:38:28.044699+03	2026-05-02 19:38:28.870965+03
35	60	2026-05-02 20:02:47.386+03	2026-05-02 20:06:43.732+03	\N	::1	\N	\N	\N	web	closed	2026-05-02 20:02:47.387841+03	2026-05-02 20:06:43.737057+03
36	60	2026-05-02 21:59:07.876+03	2026-05-02 21:59:16.706+03	0.00	::1	\N	\N	\N	web	closed	2026-05-02 21:59:07.878041+03	2026-05-02 21:59:16.708576+03
37	60	2026-05-02 21:59:53.906+03	2026-05-02 21:59:57.39+03	0.00	::1	\N	\N	\N	web	closed	2026-05-02 21:59:53.907508+03	2026-05-02 21:59:57.391373+03
38	60	2026-05-02 22:04:58.033+03	2026-05-02 22:05:06.3+03	0.00	::1	\N	\N	\N	web	closed	2026-05-02 22:04:58.034196+03	2026-05-02 22:05:06.301436+03
39	60	2026-05-02 22:05:25.787+03	2026-05-02 22:05:27.929+03	0.00	::1	\N	\N	\N	web	closed	2026-05-02 22:05:22.050856+03	2026-05-02 22:05:24.194818+03
40	60	2026-05-02 22:12:10.443+03	2026-05-02 22:12:14.278+03	0.00	::1	\N	\N	\N	web	closed	2026-05-02 22:12:10.444636+03	2026-05-02 22:12:14.281074+03
41	60	2026-05-02 22:19:02.692+03	2026-05-02 22:19:08.385+03	0.00	::1	\N	\N	\N	web	closed	2026-05-02 22:19:02.693489+03	2026-05-02 22:19:08.387533+03
42	60	2026-05-02 22:27:17.889+03	2026-05-02 22:27:34.461+03	0.00	::1	\N	\N	\N	web	closed	2026-05-02 22:27:17.890007+03	2026-05-02 22:27:34.463389+03
43	60	2026-05-02 22:29:35.349+03	2026-05-02 22:29:49.713+03	0.00	::1	\N	\N	\N	web	closed	2026-05-02 22:29:35.35039+03	2026-05-02 22:29:49.715099+03
44	60	2026-05-02 22:30:44.995+03	2026-05-02 22:34:04.02+03	0.06	::1	\N	\N	\N	web	closed	2026-05-02 22:30:44.996472+03	2026-05-02 22:34:04.021322+03
45	60	2026-05-02 22:44:15.64+03	2026-05-02 22:49:58.363+03	0.10	::1	\N	\N	\N	web	closed	2026-05-02 22:44:15.641499+03	2026-05-02 22:49:58.368951+03
46	54	2026-05-02 23:01:35.872+03	\N	\N	::1	\N	\N	\N	web	open	2026-05-02 23:01:35.874469+03	2026-05-02 23:01:35.874469+03
47	61	2026-05-03 18:20:04.535+03	\N	\N	::1	\N	\N	\N	web	open	2026-05-03 18:20:04.536066+03	2026-05-03 18:20:04.536066+03
48	61	2026-05-04 10:43:48.833+03	2026-05-04 18:05:40.855+03	7.36	::1	\N	\N	\N	web	closed	2026-05-04 10:43:48.834685+03	2026-05-04 18:05:40.856894+03
49	54	2026-05-05 15:02:25.274+03	\N	\N	::1	\N	\N	\N	web	open	2026-05-05 15:02:25.275239+03	2026-05-05 15:02:25.275239+03
50	61	2026-05-05 17:37:52.572+03	\N	\N	::1	\N	\N	\N	web	open	2026-05-05 17:37:52.573318+03	2026-05-05 17:37:52.573318+03
51	61	2026-05-06 18:30:08.047+03	2026-05-06 19:58:04.835+03	1.47	::1	\N	\N	\N	web	closed	2026-05-06 18:30:08.048868+03	2026-05-06 19:58:04.837127+03
52	61	2026-05-06 22:50:47.992+03	2026-05-06 22:50:56.956+03	0.00	::1	\N	\N	\N	web	closed	2026-05-06 22:50:47.993589+03	2026-05-06 22:50:56.959494+03
53	61	2026-05-06 22:51:14.255+03	2026-05-06 22:51:29.026+03	0.00	::1	\N	\N	\N	web	closed	2026-05-06 22:51:14.256095+03	2026-05-06 22:51:29.027718+03
54	61	2026-05-06 23:20:31.833+03	2026-05-06 23:20:44.234+03	0.00	::1	\N	\N	\N	web	closed	2026-05-06 23:20:31.834665+03	2026-05-06 23:20:44.236451+03
55	61	2026-05-06 23:20:55.631+03	2026-05-06 23:21:03.776+03	0.00	::1	\N	\N	\N	web	closed	2026-05-06 23:20:55.632572+03	2026-05-06 23:21:03.778665+03
56	61	2026-05-07 17:21:34.449+03	2026-05-07 17:21:53.151+03	0.01	::1	\N	\N	\N	web	closed	2026-05-07 17:21:34.45012+03	2026-05-07 17:21:53.153111+03
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, role_id, first_name, last_name, email, username, password_hash, phone, status, created_at, updated_at, department_id, is_first_login) FROM stdin;
81	11	Ahmed	Mohammed	bdhm28191@gmail.com	emp_0002	$2b$12$/ea7ll/YZOr2x79pUX9ExuIPZYNkbpmqz5zWZ.yo.v.rlg5TED0Se	+966501234567	active	2026-03-28 05:05:24.19137+02	2026-03-28 05:05:24.19137+02	17	t
82	10	sales	Mohammed	bdhm19128@gmail.com	emp_0003	$2b$12$6EqgSeBMfMDlzp9bPeHfuOTxvv2kxBtmZjrfUuea75eC5a2nS55rK	+966501234562	active	2026-03-28 05:15:02.928714+02	2026-03-28 05:15:02.928714+02	16	t
84	13	finance_manager	Mohammed	mosaelwayly@gmail.com	emp_0005	$2b$12$9mMRodp8hfmCpM/5CNrGluvgwpkiA6xgs2MyN24i7VPoouUqBKkCW	+966501234561	active	2026-03-28 06:45:54.792001+02	2026-03-28 06:45:54.792001+02	12	t
95	24	head  	المشتريات	work74773@gmail.com	emp_0011	$2b$12$ejr02o.dnf1Vy9kYR61beOG3ixjWqvYyzaxaFyoJu.ESojD90oRnC	+967509234589	active	2026-03-30 23:05:45.537902+02	2026-03-30 23:05:45.537902+02	21	t
91	15	شركة	 الموس والبوب للستراد والتصدير وا لدعايه ولاعان والبرمجه والتكنولوجيا والتعسيل  والتسقيع	uninest26@gmail.com	\N	$2b$12$aM43iDDlpQRWHgBbGHEM9O8LwLcFcSDsqmRTZFQfmR6JsMmA.T0Da	+966501234567	active	2026-03-29 17:54:20.907326+02	2026-03-30 05:03:46.696603+02	\N	f
92	11	موظف 1	ةشاةعيث	webdesignbynti1@gmail.com	emp_0008	$2b$12$hH8cZxiFHXpCG9mjOtDN5uSbv1Id1TPUe7skYrRmsm.Door6VqpM2	+966501244589	active	2026-03-30 06:49:42.738705+02	2026-03-30 06:49:42.738705+02	17	t
93	11	موظف 2	ةشاةعيث	webdesignbynti2@gmail.com	emp_0009	$2b$12$4qxovrKczvap99u9WsmEceslnmYiwuaadOKxpxvKEjSd01Rb1eqjm	+966509244589	active	2026-03-30 06:50:03.613457+02	2026-03-30 06:50:03.613457+02	17	t
72	1	Super	Admin	super@gmail.com	superadmin	$2b$12$shqlWKjTNWMJWqI9PZ5xC.DsMQWNK41qMbo22M3qujNOEs1ebn.OS	+201000000000	active	2026-03-25 05:32:03.747655+02	2026-03-30 23:00:29.733934+02	\N	t
97	2	General	Manager	gm@gmail.com	gm_manager	$2b$12$8pomX3yOeu9J8OJvN3O54enJzR17hKJ.VF9Ak7Q3ZoUJRddi8p3Ke	0123456789	active	2026-04-08 09:59:07.637608+02	2026-04-08 09:59:07.637608+02	\N	t
103	11	head  	الجوده والسلامه	elshikhomar90@gmail.com	emp_0013	$2b$12$iv4gpg66oLZTyDq/BVcIbOEtATk0ZSHhwCxA2WaHcREGPY4GAj716	+9677609934589	active	2026-04-08 22:02:27.59727+02	2026-04-08 22:02:27.59727+02	26	t
118	14	عبدو مم	موسي	pepoabdalrhman@gmail.com	emp_0015	$2b$12$pby7HnZx9OrmZANCBNoe3uER.Y2Y88wYtmz3KSTivHlNOrcev3lSG	+9612659934583	active	2026-04-14 07:21:55.453852+02	2026-04-14 07:21:55.453852+02	30	t
112	11	مجدي	موسي	eslammahmoud0884@gmail.com	emp_0014	$2b$12$zTxoT2xfRZ9.H3zQRkcA..1TkGWvk80eLpVdXtFRse52UYR6V4bHO	+9677609934583	active	2026-04-11 11:56:12.530667+02	2026-04-11 11:56:12.530667+02	30	t
113	12	عبد الرحمن العروض	عبد الرحمن	moopop541@gmail.com	moopop541@gmail.com	$2b$12$NyL3R3mXI1zXdPSb5alKe.4uFIkU/U3PrSWxqegmW6LjTvEiIjmMy	0102544555	active	2026-04-12 07:26:26.415475+02	2026-04-12 07:26:26.415475+02	18	t
117	15	موسي		engmosa79@gmail.com	engmosa79@gmail.com	$2b$10$BPRkHFGWH1dZvXX5qTdNL.6aOgX4XckGpWeZfLoOWFoP17RbRpHQi	01042440440	active	2026-04-13 08:38:14.629172+02	2026-04-13 08:38:14.629172+02	\N	t
119	25	مدير العقود 	موسي	pepomoo123@gmail.com	emp_0016	$2b$12$l3XBhY5asVW2txY17Jsr/ekZRVXrcMoYedlw84JEIijajAhEZAviG	+9612359934583	active	2026-04-14 18:01:22.576391+02	2026-04-14 18:01:22.576391+02	20	t
120	16	hr	manager	mosaismail59@gmail.com	gm@gmail.com	$2b$12$TqmYxRF9KelAMyoGNr2pHuqz.2xOUMg.99hweiHI.RKEHg.L7bQhu	01080631972	active	2026-04-26 20:52:17.561059+03	2026-04-26 20:52:17.561059+03	7	t
121	11	mosa	magdy	moismaill735@gmail.com	emp_0017	$2b$12$Rh3qKd/vRaOKL1OQ83JEV.RePUvZxPRwzDEKIdtw.mhperErA2Eg.	01030555552	active	2026-04-27 11:23:10.240201+03	2026-04-27 11:23:10.240201+03	17	t
123	11	11010	10101	mosaelw000ayly@gmail.com	emp_0018	$2b$12$oMX4aie4cUPnOGMbL.TNAOoIkNEJ5ben416b9LE0EunVW9.WJ7Hx6	101010101	active	2026-04-27 11:59:32.71737+03	2026-04-27 11:59:32.71737+03	17	t
124	11	موسي 	مجدي	mosaelw22ayly@gmail.com	emp_0019	$2b$12$QS.ENM0QavogGzRm55fnAeGqzXlHHEU2sTTlhrNT1E/q0jUv/2szK	5362131644	active	2026-04-27 12:53:43.477704+03	2026-04-27 13:42:26.695314+03	\N	t
126	11	0101	10	mosaelw5ayly@gmail.com	emp_0021	$2b$12$n15PVqLD/HUG6tUbkB25Iuam.yiSceCk6jS1gxMJxGpD.rN7jcJp.	2.22.2.2.2	active	2026-04-27 13:27:31.164266+03	2026-04-27 13:42:26.695314+03	\N	t
125	11	000	000	mosael011wayly@gmail.com	emp_0020	$2b$12$eWVwx7eGoVHiFWgGslhlaeyYOFy6w/T.Fb3W7gxKqOR/Rr6H9/CIe	000000000000000000	active	2026-04-27 12:58:46.961776+03	2026-04-27 13:42:26.695314+03	\N	t
127	11	10	10	mosaelw001ayly@gmail.com	emp_0022	$2b$12$EtTcVM/dcCsdYXNfDacNH.N4vdkG1/0gH4Ow6.wqNEugPcGpUxxze	0101111111111	active	2026-04-27 13:53:50.051601+03	2026-04-27 13:53:50.051601+03	48	t
128	11	3	3	m2.osaelwayly@gmail.com	emp_0023	$2b$12$KfiRF4H/AgJ4RxF4xNH4e.s2gsj.h.mST9eJp9fAnspjU.fDqTsqa	3333333333333	active	2026-04-27 14:07:04.059628+03	2026-04-27 14:07:04.059628+03	49	t
129	11	00..	........	mosae010lwayly@gmail.com	emp_0024	$2b$12$V4rfUXHnaA3onEJl4gPhx.vc7gto8No1zy.pHs2E9HbTNVn6XBnha	11111000000000	active	2026-04-27 14:12:13.048681+03	2026-04-27 14:12:13.048681+03	45	t
130	11	111	111	mosa11elwayly@gmail.com	emp_0025	$2b$12$px2aJMe0lGkMS4Ej7iHl6OTfsIxLtCZAt9Tlf3s4zPcJV.QAMLepy	111	active	2026-04-27 14:47:12.501712+03	2026-04-27 14:47:12.501712+03	47	t
131	11	30	30	m0osaelwayly@gmail.com	emp_0026	$2b$12$ueEJ8J8IXtk6tH36uoLvFuUU1rARrOj8krOlmxG.lsvdMddopbwia	0000000000000	active	2026-04-27 19:46:15.358305+03	2026-04-27 19:46:15.358305+03	49	t
132	11	300	300	mosa0el0wayly@gmail.com	emp_0027	$2b$12$udF4S/HPUmtFKCmWnJN0puTuChJAzbqSHgqfmYVNSETXZhLb0urhy	2222000000	active	2026-04-27 20:41:10.989852+03	2026-04-27 20:41:10.989852+03	28	t
133	11	5	5	mosa5elwayly@gmail.com	emp_0028	$2b$12$WGroxbYq5MXndmOYrNARyO98bs7YsrQl4dhYhrasl1mOXlbpQjLq.	55555555555555555	active	2026-04-27 21:10:55.343764+03	2026-04-27 21:10:55.343764+03	28	t
104	44	احمد	محمد	am@gmail.com	ahmed mohamed	$2b$12$u5cGOVSTWS.jXYJiFxaIhORvgeZWuKfW/./awKrCYlTNljBZGMiBW	01080631972	active	2026-04-09 09:45:16.761777+02	2026-05-05 20:42:51.83814+03	23	t
111	44	احمد	محمد	mosaelwayly123@gmail.com	محمد	$2b$12$ZGlRnbIhxJXdmUEoXvWn1.EGFyprqmmsVyz7vz04oGqFQ0OW46L62	0101011010101	active	2026-04-11 10:24:13.193462+02	2026-05-05 20:42:51.842074+03	30	t
87	41	project_head_manager	Mohammed	gemy17022@gmail.com	emp_0006	$2b$12$ZkiQv8qnJQojVM.Oef487e/k9LQRMdwuEL52duhAyrKiZP8Ax9O02	+966501234512	active	2026-03-29 09:50:42.122112+02	2026-05-05 20:42:51.84383+03	19	t
96	41	head  	المخازن	mosaamagdey@gmail.com	emp_0012	$2b$12$JQEyHCH3SV7qHZbQvX/IDunMLszriN2agW9waqqIRpiBPCteumSVa	+967509934589	active	2026-03-30 23:08:49.624614+02	2026-05-05 22:04:57.430906+03	22	t
94	41	head  	العقود	moayman363@gmail.com	emp_0010	$2b$12$2eMv377ac78525HFQDuK4OXMLvIIFueY4SzkAt.MPNsrBk0EcdI7O	+967509244589	active	2026-03-30 22:57:06.695893+02	2026-05-05 22:04:57.436154+03	20	t
79	41	الشمسيه	الشمسيه	sun@gmail.com	 الشمسيه	$2b$12$SBhxR588I/8nBLju7Or/GudCkT.2Vi2aQ/p/5/shytgG.e5Inad5m	+201011111111	active	2026-03-28 03:44:21.930889+02	2026-05-05 22:04:57.43885+03	17	t
99	41	عمور	الشيخ	omarelsheikh122@gmail.com	الشيخ	$2b$12$8eIjFmPlTsyyZr2j7fyAJu0.SJZuNmdmQ0Zew0IK6wlEpsXHstCE6	01030254679	active	2026-04-08 20:41:08.042232+02	2026-05-05 22:04:57.441956+03	25	t
105	41	عبد الرحمن	مصطفي	ab@gmail.com	عبد الرحمن	$2b$12$14g3dOqbZ49qckPBA8KHf.ZwCBIzDA2h8pYti7WUQ8LQR/KhPLyZe	01180631972	active	2026-04-10 17:00:20.064348+02	2026-05-05 22:04:57.444251+03	\N	t
134	11	10	10	mosael01wayly@gmail.com	emp_0029	$2b$12$8fRGX1MFKfvn7UipMuT3g.c7MaEFkwaXTjJv9.yttAype4am1cez.	10000000000	active	2026-04-27 21:13:21.026062+03	2026-04-27 21:13:21.026062+03	45	t
135	11	010101	010101	mo1saelwayly@gmail.com	emp_0030	$2b$12$NVmVXR.i7FU7kcm9ZZJnqeZw4gslf9ANtqifCuwzn16H0iYRcXZ0y	010101	active	2026-04-27 21:14:59.433983+03	2026-04-27 21:14:59.433983+03	49	t
136	11	222	222	m2osaelwayly@gmail.com	emp_0031	$2b$12$vymvQTUKe9QfSvIo3fWfLOxqLliE3ThNfyLUwWGCDwvBfYEcOnUNS	2222222222222	active	2026-04-28 09:13:20.253177+03	2026-04-28 09:13:20.253177+03	47	t
137	11	55	555	mo5saelwayly@gmail.com	emp_0032	$2b$12$rVYerWQl2pX4LpBvFCfV4uvS6gr7.ePKkaZi.tggsmBLPj577iMRK	55555	active	2026-04-28 09:21:48.821218+03	2026-04-28 09:21:48.821218+03	46	t
138	11	888	888	mosae8lwayly@gmail.com	emp_0033	$2b$12$kDh4gsXDvWeIaHRxLxcdN./oC0P/vQlTrDyn7WH0k1Pip9DJI7uQK	88888888888888	active	2026-04-28 10:05:46.727716+03	2026-04-28 10:05:46.727716+03	48	t
141	11	موسي 	مجدي	hopapop74@gmail.com	emp_0036	$2b$12$TlTguGORPRXAHF.lOYPQZ.8HISNkhfQLbUzN5J2lDr0iaaoZt2Ptm	01060532144	active	2026-04-28 12:55:54.263915+03	2026-04-28 12:55:54.263915+03	49	t
142	11	موسي 	مجدي	hopapop7@gmail.com	emp_0037	$2b$12$FVAzy2bdgimCe32g8DYY.Oua0ypqrG//e40m5Z0nPn0EwTFKcLzyi	01060535144	active	2026-04-28 12:56:33.554277+03	2026-04-28 12:56:33.554277+03	49	t
143	11	ll	lll	mo2saelwayly@gmail.com	emp_0038	$2b$12$JZg0FFYvPHNwrfe2lfF8N.Bf4PAjIK6e2EwnHwchrFj5BH6ODQ8Mi	42222222224224	active	2026-04-28 12:59:37.331214+03	2026-04-28 12:59:37.331214+03	49	t
144	11	nn	nnnn	mosaelnwayly@gmail.com	emp_0039	$2b$12$2pGBOv2atvsTNWXQJDHQ0ujx7/zBkacEON9c201M5ejbDu8Zb16zu	1010101010101	active	2026-04-28 13:06:45.343912+03	2026-04-28 13:06:45.343912+03	45	t
145	11	n0	nnnn	mos1aelnwayly@gmail.com	emp_0040	$2b$12$JDDvjRJuVfMKl569Mlc/xOjYa4xOG59GwYBQwN8YN7fChj778HTHS	1001010110101	active	2026-04-28 13:12:32.460082+03	2026-04-28 20:17:27.184354+03	45	t
146	11	nn;;;lllllllllllllllllllllllllllllllllllllllllllllllllllll	nnnnkkkkkkkkkkkkkkkkkkkkkk	mos1ael0nwayly@gmail.com	emp_0041	$2b$12$BAEEV76HaR43s13rxM7Wj.LevkhYzetVRuYC5ImI7xAo5xgvcs24W	10010101100101	active	2026-04-28 13:18:30.266295+03	2026-04-28 20:38:59.21137+03	45	t
147	11	موسي 	مجدي	mosaelw01ayly@gmail.com	emp_0042	$2b$12$GKU64aJi2ez/1Tt8llTLoeEiFYbHM1asfWyGGAT9d0qzC1zQebqAq	010603025444	active	2026-04-28 20:42:31.345669+03	2026-04-28 20:42:31.345669+03	48	t
150	40	مدير 	المبيعات 	moomagdy321@gmail.com	مدير المبعات 	$2b$12$dU.bAfoqVh8Bt9bOvwuK3ejhm9GyP0JaXfHfIkMReBVRybr0ejfQu	010602354566	active	2026-05-03 17:25:59.665222+03	2026-05-05 22:18:34.382186+03	16	t
156	15	محمد جمال		abdalrhmanbnmostafa@gmail.com	abdalrhmanbnmostafa@gmail.com	$2b$10$kA7GloKDqJiKtccfoouFYO8tMHeDNciQcMn.xoJFQYgMHrW8hRkRe	01020365412	active	2026-05-07 13:24:53.385448+03	2026-05-07 13:24:53.385448+03	\N	t
157	15	ابراهيم		ammarjabry34@gmail.com	ammarjabry34@gmail.com	$2b$10$MmWrrBsXksiPEOsisVPeWO12QST1Pllk2k1JyvrehYaD4ieZ6FYIO	010203654789	active	2026-05-07 16:44:15.888664+03	2026-05-07 16:44:15.888664+03	\N	t
148	11	موهجه	مجدي	mo0saelw01ayly@gmail.com	emp_0043	$2b$12$n5vY9WVrgMFkwH.lU5PnWu5U7i2LOCA6MXaI0K81ckbr2XUVgbSS2	010603065444	active	2026-04-28 20:43:25.184521+03	2026-04-28 22:41:11.727474+03	48	t
149	11	عبدو 	فواد 	momagdy766@gmail.com	emp_0044	$2b$12$/k4L31bP8W/T8hSkjSfZSeHfAlDRYFs35EDC.WVSGCDg5zM5IgQ0e	014424232498	active	2026-05-02 19:30:33.280591+03	2026-05-02 19:30:33.280591+03	45	t
152	11	hopa	pop	hopapop774@gmail.com	emp_0045	$2b$12$MH07pxZQA7ruLJVe.ElptuydR3OiSWq.uasnEnOdTSfQdrvV2PNCS	01080125430	active	2026-05-03 18:15:17.721284+03	2026-05-03 18:15:17.721284+03	49	t
154	14	جمي	جمال	webdesignbynti@gmail.com	emp_0046	$2b$12$Nar3ypogO1qIMzjfynb.l.KKCEqby41TUWyll8dbnlUQHTTWJkQuC	010101010101011	active	2026-05-03 19:47:34.068628+03	2026-05-03 19:47:34.068628+03	49	t
151	44	محمد 	ايمن 	amoorelmohamdy@gmail.com	amoorelmohamdy	$2b$12$lKOMcNAn2QT.Vmg1Au3PyurGqnNJ64Ayj3D/BScQ7OIKg/E33Knbu	01030522221	active	2026-05-03 17:40:29.225911+03	2026-05-05 20:42:51.84514+03	49	t
\.


--
-- Data for Name: warehouse_stock; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.warehouse_stock (id, warehouse_id, item_id, quantity_on_hand, reserved_quantity, last_counted_at, last_counted_by, notes, created_at, updated_at) FROM stdin;
3	1	21	36.000	0.000	\N	\N	\N	2026-04-26 10:55:13.44583+03	2026-05-04 20:09:43.147362+03
10	1	22	0.000	0.000	\N	\N	\N	2026-05-05 18:24:52.420414+03	2026-05-05 18:24:52.420414+03
2	1	2	39.000	0.000	\N	\N	\N	2026-04-25 14:46:10.314454+03	2026-05-07 00:22:57.073003+03
1	1	1	250.000	0.000	\N	\N	\N	2026-04-25 14:46:10.303384+03	2026-05-07 17:04:55.555084+03
\.


--
-- Data for Name: warehouses; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.warehouses (id, warehouse_code, warehouse_name, warehouse_name_ar, location, location_ar, address, supervisor_id, capacity_cubic_m, is_active, notes, created_by, created_at, updated_at) FROM stdin;
1	WH-DEFAULT	Main Warehouse	المستودع الرئيسي	Default warehouse for existing inventory	\N	\N	\N	\N	t	\N	\N	2026-04-25 14:23:39.431285+03	2026-04-25 14:23:39.431285+03
2	WH-002	المستودع الفرعي الاول	المستودع الفرعي الاول	online	الرياض الخرج 	الرياض الخرج من مقر الشركه	\N	1000.00	f		84	2026-04-25 16:14:34.342561+03	2026-04-26 20:41:32.875523+03
\.


--
-- Name: approval_steps_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.approval_steps_id_seq', 1, false);


--
-- Name: assets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.assets_id_seq', 1, false);


--
-- Name: attendance_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.attendance_id_seq', 17, true);


--
-- Name: budgets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.budgets_id_seq', 1, false);


--
-- Name: chart_of_accounts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.chart_of_accounts_id_seq', 170, true);


--
-- Name: client_support_messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.client_support_messages_id_seq', 3, true);


--
-- Name: contract_amendments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.contract_amendments_id_seq', 1, false);


--
-- Name: contract_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.contract_items_id_seq', 1, false);


--
-- Name: contract_milestones_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.contract_milestones_id_seq', 1, false);


--
-- Name: contracts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.contracts_id_seq', 19, true);


--
-- Name: credit_note_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.credit_note_items_id_seq', 9, true);


--
-- Name: credit_notes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.credit_notes_id_seq', 15, true);


--
-- Name: departments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.departments_id_seq', 50, true);


--
-- Name: documents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.documents_id_seq', 1, false);


--
-- Name: employee_evaluations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.employee_evaluations_id_seq', 1, true);


--
-- Name: employee_leave_balances_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.employee_leave_balances_id_seq', 27, true);


--
-- Name: employees_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.employees_id_seq', 62, true);


--
-- Name: expense_vouchers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.expense_vouchers_id_seq', 7, true);


--
-- Name: expenses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.expenses_id_seq', 1, false);


--
-- Name: fixed_assets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.fixed_assets_id_seq', 5, true);


--
-- Name: goods_receipt_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.goods_receipt_items_id_seq', 1, true);


--
-- Name: goods_receipts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.goods_receipts_id_seq', 1, true);


--
-- Name: inspection_reports_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.inspection_reports_id_seq', 22, true);


--
-- Name: inspections_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.inspections_id_seq', 29, true);


--
-- Name: installed_assets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.installed_assets_id_seq', 1, false);


--
-- Name: inventory_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.inventory_items_id_seq', 22, true);


--
-- Name: inventory_movements_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.inventory_movements_id_seq', 48, true);


--
-- Name: invoices_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.invoices_id_seq', 32, true);


--
-- Name: journal_entries_entry_number_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.journal_entries_entry_number_seq', 91, true);


--
-- Name: journal_entries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.journal_entries_id_seq', 231, true);


--
-- Name: journal_entry_lines_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.journal_entry_lines_id_seq', 624, true);


--
-- Name: lead_interactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.lead_interactions_id_seq', 16, true);


--
-- Name: leads_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.leads_id_seq', 38, true);


--
-- Name: leave_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.leave_requests_id_seq', 7, true);


--
-- Name: maintenance_contracts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.maintenance_contracts_id_seq', 1, false);


--
-- Name: maintenance_records_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.maintenance_records_id_seq', 1, false);


--
-- Name: maintenance_visits_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.maintenance_visits_id_seq', 1, false);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.notifications_id_seq', 788, true);


--
-- Name: otp_codes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.otp_codes_id_seq', 66, true);


--
-- Name: payment_vouchers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.payment_vouchers_id_seq', 8, true);


--
-- Name: permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.permissions_id_seq', 144, true);


--
-- Name: petty_cash_funds_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.petty_cash_funds_id_seq', 12, true);


--
-- Name: petty_cash_transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.petty_cash_transactions_id_seq', 7, true);


--
-- Name: project_employees_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.project_employees_id_seq', 11, true);


--
-- Name: project_ratings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.project_ratings_id_seq', 1, false);


--
-- Name: projects_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.projects_id_seq', 16, true);


--
-- Name: purchase_invoice_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.purchase_invoice_items_id_seq', 20, true);


--
-- Name: purchase_invoices_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.purchase_invoices_id_seq', 54, true);


--
-- Name: purchase_order_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.purchase_order_items_id_seq', 62, true);


--
-- Name: purchase_orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.purchase_orders_id_seq', 37, true);


--
-- Name: quotations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.quotations_id_seq', 19, true);


--
-- Name: receipt_voucher_invoices_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.receipt_voucher_invoices_id_seq', 21, true);


--
-- Name: receipt_vouchers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.receipt_vouchers_id_seq', 15, true);


--
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.roles_id_seq', 59, true);


--
-- Name: sales_invoice_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.sales_invoice_items_id_seq', 11, true);


--
-- Name: sales_invoices_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.sales_invoices_id_seq', 34, true);


--
-- Name: suppliers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.suppliers_id_seq', 5, true);


--
-- Name: tasks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.tasks_id_seq', 31, true);


--
-- Name: tax_invoice_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.tax_invoice_logs_id_seq', 23, true);


--
-- Name: time_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.time_logs_id_seq', 56, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 157, true);


--
-- Name: warehouse_stock_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.warehouse_stock_id_seq', 10, true);


--
-- Name: warehouses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.warehouses_id_seq', 2, true);


--
-- Name: approval_steps approval_steps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_steps
    ADD CONSTRAINT approval_steps_pkey PRIMARY KEY (id);


--
-- Name: assets assets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_pkey PRIMARY KEY (id);


--
-- Name: assets assets_serial_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_serial_number_key UNIQUE (serial_number);


--
-- Name: attendance attendance_employee_id_attendance_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_employee_id_attendance_date_key UNIQUE (employee_id, attendance_date);


--
-- Name: attendance attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_pkey PRIMARY KEY (id);


--
-- Name: budgets budgets_budget_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budgets
    ADD CONSTRAINT budgets_budget_code_key UNIQUE (budget_code);


--
-- Name: budgets budgets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budgets
    ADD CONSTRAINT budgets_pkey PRIMARY KEY (id);


--
-- Name: chart_of_accounts chart_of_accounts_account_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chart_of_accounts
    ADD CONSTRAINT chart_of_accounts_account_code_key UNIQUE (account_code);


--
-- Name: chart_of_accounts chart_of_accounts_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chart_of_accounts
    ADD CONSTRAINT chart_of_accounts_code_key UNIQUE (code);


--
-- Name: chart_of_accounts chart_of_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chart_of_accounts
    ADD CONSTRAINT chart_of_accounts_pkey PRIMARY KEY (id);


--
-- Name: client_support_messages client_support_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_support_messages
    ADD CONSTRAINT client_support_messages_pkey PRIMARY KEY (id);


--
-- Name: contract_amendments contract_amendments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_amendments
    ADD CONSTRAINT contract_amendments_pkey PRIMARY KEY (id);


--
-- Name: contract_items contract_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_items
    ADD CONSTRAINT contract_items_pkey PRIMARY KEY (id);


--
-- Name: contract_milestones contract_milestones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_milestones
    ADD CONSTRAINT contract_milestones_pkey PRIMARY KEY (id);


--
-- Name: contracts contracts_contract_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_contract_number_key UNIQUE (contract_number);


--
-- Name: contracts contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_pkey PRIMARY KEY (id);


--
-- Name: credit_note_items credit_note_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_note_items
    ADD CONSTRAINT credit_note_items_pkey PRIMARY KEY (id);


--
-- Name: credit_notes credit_notes_credit_note_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_notes
    ADD CONSTRAINT credit_notes_credit_note_number_key UNIQUE (credit_note_number);


--
-- Name: credit_notes credit_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_notes
    ADD CONSTRAINT credit_notes_pkey PRIMARY KEY (id);


--
-- Name: departments departments_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_name_key UNIQUE (name);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: employee_evaluations employee_evaluations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_evaluations
    ADD CONSTRAINT employee_evaluations_pkey PRIMARY KEY (id);


--
-- Name: employee_leave_balances employee_leave_balances_employee_id_leave_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_leave_balances
    ADD CONSTRAINT employee_leave_balances_employee_id_leave_type_key UNIQUE (employee_id, leave_type);


--
-- Name: employee_leave_balances employee_leave_balances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_leave_balances
    ADD CONSTRAINT employee_leave_balances_pkey PRIMARY KEY (id);


--
-- Name: employees employees_employee_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_employee_number_key UNIQUE (employee_number);


--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);


--
-- Name: expense_vouchers expense_vouchers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_vouchers
    ADD CONSTRAINT expense_vouchers_pkey PRIMARY KEY (id);


--
-- Name: expense_vouchers expense_vouchers_voucher_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_vouchers
    ADD CONSTRAINT expense_vouchers_voucher_number_key UNIQUE (voucher_number);


--
-- Name: expenses expenses_expense_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_expense_number_key UNIQUE (expense_number);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: fixed_assets fixed_assets_asset_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fixed_assets
    ADD CONSTRAINT fixed_assets_asset_number_key UNIQUE (asset_number);


--
-- Name: fixed_assets fixed_assets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fixed_assets
    ADD CONSTRAINT fixed_assets_pkey PRIMARY KEY (id);


--
-- Name: goods_receipt_items goods_receipt_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_receipt_items
    ADD CONSTRAINT goods_receipt_items_pkey PRIMARY KEY (id);


--
-- Name: goods_receipts goods_receipts_grn_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_receipts
    ADD CONSTRAINT goods_receipts_grn_number_key UNIQUE (grn_number);


--
-- Name: goods_receipts goods_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_receipts
    ADD CONSTRAINT goods_receipts_pkey PRIMARY KEY (id);


--
-- Name: inspection_reports inspection_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inspection_reports
    ADD CONSTRAINT inspection_reports_pkey PRIMARY KEY (id);


--
-- Name: inspections inspections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inspections
    ADD CONSTRAINT inspections_pkey PRIMARY KEY (id);


--
-- Name: installed_assets installed_assets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.installed_assets
    ADD CONSTRAINT installed_assets_pkey PRIMARY KEY (id);


--
-- Name: installed_assets installed_assets_serial_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.installed_assets
    ADD CONSTRAINT installed_assets_serial_number_key UNIQUE (serial_number);


--
-- Name: inventory_items inventory_items_item_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_item_code_key UNIQUE (item_code);


--
-- Name: inventory_items inventory_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_pkey PRIMARY KEY (id);


--
-- Name: inventory_movements inventory_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_invoice_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_invoice_number_key UNIQUE (invoice_number);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_tax_invoice_no_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_tax_invoice_no_key UNIQUE (tax_invoice_no);


--
-- Name: journal_entries journal_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT journal_entries_pkey PRIMARY KEY (id);


--
-- Name: journal_entry_lines journal_entry_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entry_lines
    ADD CONSTRAINT journal_entry_lines_pkey PRIMARY KEY (id);


--
-- Name: lead_interactions lead_interactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_interactions
    ADD CONSTRAINT lead_interactions_pkey PRIMARY KEY (id);


--
-- Name: leads leads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_pkey PRIMARY KEY (id);


--
-- Name: leave_requests leave_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_pkey PRIMARY KEY (id);


--
-- Name: maintenance_contracts maintenance_contracts_contract_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_contracts
    ADD CONSTRAINT maintenance_contracts_contract_number_key UNIQUE (contract_number);


--
-- Name: maintenance_contracts maintenance_contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_contracts
    ADD CONSTRAINT maintenance_contracts_pkey PRIMARY KEY (id);


--
-- Name: maintenance_records maintenance_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_records
    ADD CONSTRAINT maintenance_records_pkey PRIMARY KEY (id);


--
-- Name: maintenance_visits maintenance_visits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_visits
    ADD CONSTRAINT maintenance_visits_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: otp_codes otp_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.otp_codes
    ADD CONSTRAINT otp_codes_pkey PRIMARY KEY (id);


--
-- Name: payment_vouchers payment_vouchers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_vouchers
    ADD CONSTRAINT payment_vouchers_pkey PRIMARY KEY (id);


--
-- Name: payment_vouchers payment_vouchers_voucher_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_vouchers
    ADD CONSTRAINT payment_vouchers_voucher_number_key UNIQUE (voucher_number);


--
-- Name: permissions permissions_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_name_key UNIQUE (name);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: petty_cash_funds petty_cash_funds_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.petty_cash_funds
    ADD CONSTRAINT petty_cash_funds_pkey PRIMARY KEY (id);


--
-- Name: petty_cash_transactions petty_cash_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.petty_cash_transactions
    ADD CONSTRAINT petty_cash_transactions_pkey PRIMARY KEY (id);


--
-- Name: project_employees project_employees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_employees
    ADD CONSTRAINT project_employees_pkey PRIMARY KEY (id);


--
-- Name: project_employees project_employees_project_id_employee_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_employees
    ADD CONSTRAINT project_employees_project_id_employee_id_key UNIQUE (project_id, employee_id);


--
-- Name: project_ratings project_ratings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_ratings
    ADD CONSTRAINT project_ratings_pkey PRIMARY KEY (id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: purchase_invoice_items purchase_invoice_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_invoice_items
    ADD CONSTRAINT purchase_invoice_items_pkey PRIMARY KEY (id);


--
-- Name: purchase_invoices purchase_invoices_invoice_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_invoices
    ADD CONSTRAINT purchase_invoices_invoice_number_key UNIQUE (invoice_number);


--
-- Name: purchase_invoices purchase_invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_invoices
    ADD CONSTRAINT purchase_invoices_pkey PRIMARY KEY (id);


--
-- Name: purchase_order_items purchase_order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_pkey PRIMARY KEY (id);


--
-- Name: purchase_orders purchase_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_pkey PRIMARY KEY (id);


--
-- Name: purchase_orders purchase_orders_po_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_po_number_key UNIQUE (po_number);


--
-- Name: quotations quotations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotations
    ADD CONSTRAINT quotations_pkey PRIMARY KEY (id);


--
-- Name: receipt_voucher_invoices receipt_voucher_invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipt_voucher_invoices
    ADD CONSTRAINT receipt_voucher_invoices_pkey PRIMARY KEY (id);


--
-- Name: receipt_voucher_invoices receipt_voucher_invoices_receipt_voucher_id_sales_invoice_i_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipt_voucher_invoices
    ADD CONSTRAINT receipt_voucher_invoices_receipt_voucher_id_sales_invoice_i_key UNIQUE (receipt_voucher_id, sales_invoice_id);


--
-- Name: receipt_vouchers receipt_vouchers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipt_vouchers
    ADD CONSTRAINT receipt_vouchers_pkey PRIMARY KEY (id);


--
-- Name: receipt_vouchers receipt_vouchers_voucher_no_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipt_vouchers
    ADD CONSTRAINT receipt_vouchers_voucher_no_key UNIQUE (voucher_no);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (role_id, permission_id);


--
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: sales_invoice_items sales_invoice_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_invoice_items
    ADD CONSTRAINT sales_invoice_items_pkey PRIMARY KEY (id);


--
-- Name: sales_invoices sales_invoices_invoice_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_invoices
    ADD CONSTRAINT sales_invoices_invoice_number_key UNIQUE (invoice_number);


--
-- Name: sales_invoices sales_invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_invoices
    ADD CONSTRAINT sales_invoices_pkey PRIMARY KEY (id);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- Name: suppliers suppliers_supplier_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_supplier_code_key UNIQUE (supplier_code);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: tax_invoice_logs tax_invoice_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tax_invoice_logs
    ADD CONSTRAINT tax_invoice_logs_pkey PRIMARY KEY (id);


--
-- Name: time_logs time_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_logs
    ADD CONSTRAINT time_logs_pkey PRIMARY KEY (id);


--
-- Name: warehouse_stock uq_warehouse_item; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouse_stock
    ADD CONSTRAINT uq_warehouse_item UNIQUE (warehouse_id, item_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: warehouse_stock warehouse_stock_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouse_stock
    ADD CONSTRAINT warehouse_stock_pkey PRIMARY KEY (id);


--
-- Name: warehouses warehouses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouses
    ADD CONSTRAINT warehouses_pkey PRIMARY KEY (id);


--
-- Name: warehouses warehouses_warehouse_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouses
    ADD CONSTRAINT warehouses_warehouse_code_key UNIQUE (warehouse_code);


--
-- Name: idx_approval_steps_quotation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_approval_steps_quotation ON public.approval_steps USING btree (quotation_id);


--
-- Name: idx_approval_steps_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_approval_steps_status ON public.approval_steps USING btree (status);


--
-- Name: idx_assets_assigned_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assets_assigned_to ON public.assets USING btree (assigned_to);


--
-- Name: idx_assets_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assets_project_id ON public.assets USING btree (project_id);


--
-- Name: idx_assets_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assets_status ON public.assets USING btree (status);


--
-- Name: idx_attendance_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attendance_date ON public.attendance USING btree (attendance_date DESC);


--
-- Name: idx_attendance_department; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attendance_department ON public.attendance USING btree (department_id);


--
-- Name: idx_attendance_employee_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attendance_employee_date ON public.attendance USING btree (employee_id, attendance_date DESC);


--
-- Name: idx_attendance_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attendance_employee_id ON public.attendance USING btree (employee_id);


--
-- Name: idx_budgets_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budgets_code ON public.budgets USING btree (budget_code);


--
-- Name: idx_budgets_cost_center; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budgets_cost_center ON public.budgets USING btree (cost_center);


--
-- Name: idx_budgets_dates; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budgets_dates ON public.budgets USING btree (start_date, end_date);


--
-- Name: idx_budgets_department; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budgets_department ON public.budgets USING btree (department);


--
-- Name: idx_budgets_fiscal_year; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budgets_fiscal_year ON public.budgets USING btree (fiscal_year);


--
-- Name: idx_budgets_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budgets_status ON public.budgets USING btree (status);


--
-- Name: idx_coa_cost_center; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_coa_cost_center ON public.chart_of_accounts USING btree (cost_center_type, linked_entity_id) WHERE (cost_center_type IS NOT NULL);


--
-- Name: idx_coa_financial_statement; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_coa_financial_statement ON public.chart_of_accounts USING btree (financial_statement);


--
-- Name: idx_coa_name_ar; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_coa_name_ar ON public.chart_of_accounts USING btree (account_name_ar);


--
-- Name: idx_coa_vat_applicable; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_coa_vat_applicable ON public.chart_of_accounts USING btree (is_vat_applicable) WHERE (is_vat_applicable = true);


--
-- Name: idx_contract_amendments_contract; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contract_amendments_contract ON public.contract_amendments USING btree (contract_id);


--
-- Name: idx_contract_items_contract_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contract_items_contract_id ON public.contract_items USING btree (contract_id);


--
-- Name: idx_contract_milestones_contract; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contract_milestones_contract ON public.contract_milestones USING btree (contract_id);


--
-- Name: idx_contract_milestones_invoice; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contract_milestones_invoice ON public.contract_milestones USING btree (invoice_id);


--
-- Name: idx_contract_milestones_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contract_milestones_status ON public.contract_milestones USING btree (status);


--
-- Name: idx_credit_note_items_credit_note; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_credit_note_items_credit_note ON public.credit_note_items USING btree (credit_note_id);


--
-- Name: idx_credit_notes_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_credit_notes_client ON public.credit_notes USING btree (client_id);


--
-- Name: idx_credit_notes_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_credit_notes_date ON public.credit_notes USING btree (return_date);


--
-- Name: idx_credit_notes_invoice; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_credit_notes_invoice ON public.credit_notes USING btree (invoice_id);


--
-- Name: idx_credit_notes_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_credit_notes_number ON public.credit_notes USING btree (credit_note_number);


--
-- Name: idx_credit_notes_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_credit_notes_status ON public.credit_notes USING btree (status);


--
-- Name: idx_departments_dept_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_departments_dept_type ON public.departments USING btree (dept_type);


--
-- Name: idx_documents_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documents_entity ON public.documents USING btree (entity_type, entity_id);


--
-- Name: idx_employees_contract_end; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employees_contract_end ON public.employees USING btree (contract_end_date);


--
-- Name: idx_employees_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employees_created_at ON public.employees USING btree (created_at DESC);


--
-- Name: idx_employees_department_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employees_department_id ON public.employees USING btree (department_id);


--
-- Name: idx_employees_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employees_number ON public.employees USING btree (employee_number);


--
-- Name: idx_employees_passport_exp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employees_passport_exp ON public.employees USING btree (passport_expiry);


--
-- Name: idx_employees_residence_exp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employees_residence_exp ON public.employees USING btree (residence_expiry);


--
-- Name: idx_employees_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employees_status ON public.employees USING btree (status);


--
-- Name: idx_employees_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employees_user_id ON public.employees USING btree (user_id);


--
-- Name: idx_evaluations_employee; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_evaluations_employee ON public.employee_evaluations USING btree (employee_id);


--
-- Name: idx_evaluations_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_evaluations_type ON public.employee_evaluations USING btree (evaluation_type);


--
-- Name: idx_expense_vouchers_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expense_vouchers_date ON public.expense_vouchers USING btree (expense_date);


--
-- Name: idx_expense_vouchers_expense_account; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expense_vouchers_expense_account ON public.expense_vouchers USING btree (expense_account_id);


--
-- Name: idx_expense_vouchers_journal_entry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expense_vouchers_journal_entry ON public.expense_vouchers USING btree (journal_entry_id);


--
-- Name: idx_expense_vouchers_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expense_vouchers_number ON public.expense_vouchers USING btree (voucher_number);


--
-- Name: idx_expense_vouchers_payment_account; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expense_vouchers_payment_account ON public.expense_vouchers USING btree (payment_account_id);


--
-- Name: idx_expense_vouchers_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expense_vouchers_status ON public.expense_vouchers USING btree (status);


--
-- Name: idx_fixed_assets_asset_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fixed_assets_asset_number ON public.fixed_assets USING btree (asset_number);


--
-- Name: idx_fixed_assets_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fixed_assets_category ON public.fixed_assets USING btree (category);


--
-- Name: idx_fixed_assets_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fixed_assets_project ON public.fixed_assets USING btree (project_id);


--
-- Name: idx_fixed_assets_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fixed_assets_status ON public.fixed_assets USING btree (status);


--
-- Name: idx_gr_items_grn; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gr_items_grn ON public.goods_receipt_items USING btree (grn_id);


--
-- Name: idx_gr_items_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gr_items_item ON public.goods_receipt_items USING btree (item_id);


--
-- Name: idx_gr_items_po_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gr_items_po_item ON public.goods_receipt_items USING btree (po_item_id);


--
-- Name: idx_grn_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_grn_number ON public.goods_receipts USING btree (grn_number);


--
-- Name: idx_grn_po; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_grn_po ON public.goods_receipts USING btree (po_id);


--
-- Name: idx_grn_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_grn_status ON public.goods_receipts USING btree (status);


--
-- Name: idx_inspection_reports_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inspection_reports_created_at ON public.inspection_reports USING btree (created_at DESC);


--
-- Name: idx_inspection_reports_lead_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inspection_reports_lead_id ON public.inspection_reports USING btree (lead_id);


--
-- Name: idx_inspections_engineer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inspections_engineer_id ON public.inspections USING btree (assigned_engineer_id);


--
-- Name: idx_inspections_lead_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inspections_lead_id ON public.inspections USING btree (lead_id);


--
-- Name: idx_inspections_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inspections_status ON public.inspections USING btree (status);


--
-- Name: idx_installed_assets_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_installed_assets_category ON public.installed_assets USING btree (category);


--
-- Name: idx_installed_assets_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_installed_assets_client ON public.installed_assets USING btree (client_id);


--
-- Name: idx_installed_assets_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_installed_assets_project ON public.installed_assets USING btree (project_id);


--
-- Name: idx_installed_assets_serial; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_installed_assets_serial ON public.installed_assets USING btree (serial_number);


--
-- Name: idx_installed_assets_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_installed_assets_status ON public.installed_assets USING btree (status);


--
-- Name: idx_installed_assets_warranty; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_installed_assets_warranty ON public.installed_assets USING btree (warranty_expiry);


--
-- Name: idx_inventory_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventory_active ON public.inventory_items USING btree (is_active);


--
-- Name: idx_inventory_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventory_category ON public.inventory_items USING btree (category);


--
-- Name: idx_inventory_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventory_code ON public.inventory_items USING btree (item_code);


--
-- Name: idx_inventory_default_warehouse; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventory_default_warehouse ON public.inventory_items USING btree (default_warehouse_id);


--
-- Name: idx_inventory_movements_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventory_movements_item_id ON public.inventory_movements USING btree (inventory_item_id);


--
-- Name: idx_inventory_movements_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventory_movements_project_id ON public.inventory_movements USING btree (project_id);


--
-- Name: idx_inventory_movements_warehouse; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventory_movements_warehouse ON public.inventory_movements USING btree (warehouse_id);


--
-- Name: idx_invoices_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_client_id ON public.invoices USING btree (client_id);


--
-- Name: idx_invoices_contract; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_contract ON public.invoices USING btree (contract_id);


--
-- Name: idx_invoices_journal_entry_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_journal_entry_id ON public.invoices USING btree (journal_entry_id);


--
-- Name: idx_invoices_payment_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_payment_status ON public.invoices USING btree (payment_status);


--
-- Name: idx_invoices_pdf_generated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_pdf_generated ON public.invoices USING btree (pdf_generated_at);


--
-- Name: idx_invoices_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_project_id ON public.invoices USING btree (project_id);


--
-- Name: idx_invoices_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_status ON public.invoices USING btree (status);


--
-- Name: idx_invoices_tax_invoice; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_tax_invoice ON public.invoices USING btree (is_tax_invoice);


--
-- Name: idx_invoices_tax_invoice_no; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_tax_invoice_no ON public.invoices USING btree (tax_invoice_no);


--
-- Name: idx_invoices_zatca_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_zatca_status ON public.invoices USING btree (zatca_status);


--
-- Name: idx_lead_interactions_follow_up; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lead_interactions_follow_up ON public.lead_interactions USING btree (next_follow_up_date);


--
-- Name: idx_lead_interactions_lead_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lead_interactions_lead_id ON public.lead_interactions USING btree (lead_id);


--
-- Name: idx_lead_interactions_performed_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lead_interactions_performed_by ON public.lead_interactions USING btree (performed_by);


--
-- Name: idx_lead_interactions_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lead_interactions_type ON public.lead_interactions USING btree (interaction_type);


--
-- Name: idx_leads_assigned_engineer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_assigned_engineer_id ON public.leads USING btree (assigned_engineer_id);


--
-- Name: idx_leads_client_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_client_user_id ON public.leads USING btree (client_user_id);


--
-- Name: idx_leads_owner_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_owner_id ON public.leads USING btree (owner_id);


--
-- Name: idx_leads_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_status ON public.leads USING btree (status);


--
-- Name: idx_leads_technical_dept_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_technical_dept_id ON public.leads USING btree (technical_dept_id);


--
-- Name: idx_leave_balances_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leave_balances_employee_id ON public.employee_leave_balances USING btree (employee_id);


--
-- Name: idx_leave_balances_leave_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leave_balances_leave_type ON public.employee_leave_balances USING btree (leave_type);


--
-- Name: idx_leave_requests_dates; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leave_requests_dates ON public.leave_requests USING btree (start_date, end_date);


--
-- Name: idx_leave_requests_employee; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leave_requests_employee ON public.leave_requests USING btree (employee_id);


--
-- Name: idx_leave_requests_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leave_requests_employee_id ON public.leave_requests USING btree (employee_id);


--
-- Name: idx_leave_requests_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leave_requests_status ON public.leave_requests USING btree (status);


--
-- Name: idx_maintenance_contracts_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_maintenance_contracts_client ON public.maintenance_contracts USING btree (client_id);


--
-- Name: idx_maintenance_contracts_end_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_maintenance_contracts_end_date ON public.maintenance_contracts USING btree (end_date);


--
-- Name: idx_maintenance_contracts_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_maintenance_contracts_project ON public.maintenance_contracts USING btree (project_id);


--
-- Name: idx_maintenance_contracts_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_maintenance_contracts_status ON public.maintenance_contracts USING btree (status);


--
-- Name: idx_maintenance_records_asset_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_maintenance_records_asset_id ON public.maintenance_records USING btree (asset_id);


--
-- Name: idx_maintenance_records_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_maintenance_records_status ON public.maintenance_records USING btree (status);


--
-- Name: idx_maintenance_visits_asset; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_maintenance_visits_asset ON public.maintenance_visits USING btree (asset_id);


--
-- Name: idx_maintenance_visits_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_maintenance_visits_date ON public.maintenance_visits USING btree (visit_date);


--
-- Name: idx_maintenance_visits_engineer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_maintenance_visits_engineer ON public.maintenance_visits USING btree (assigned_engineer_id);


--
-- Name: idx_maintenance_visits_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_maintenance_visits_status ON public.maintenance_visits USING btree (status);


--
-- Name: idx_notifications_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_entity ON public.notifications USING btree (entity_type, entity_id);


--
-- Name: idx_notifications_is_read; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_is_read ON public.notifications USING btree (is_read);


--
-- Name: idx_notifications_user_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_created ON public.notifications USING btree (user_id, created_at DESC);


--
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);


--
-- Name: idx_otp_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_otp_user_id ON public.otp_codes USING btree (user_id);


--
-- Name: idx_payment_vouchers_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_vouchers_created_by ON public.payment_vouchers USING btree (created_by);


--
-- Name: idx_payment_vouchers_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_vouchers_date ON public.payment_vouchers USING btree (payment_date);


--
-- Name: idx_payment_vouchers_invoice; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_vouchers_invoice ON public.payment_vouchers USING btree (invoice_id);


--
-- Name: idx_payment_vouchers_journal; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_vouchers_journal ON public.payment_vouchers USING btree (journal_entry_id);


--
-- Name: idx_payment_vouchers_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_vouchers_status ON public.payment_vouchers USING btree (status);


--
-- Name: idx_payment_vouchers_supplier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_vouchers_supplier ON public.payment_vouchers USING btree (supplier_id);


--
-- Name: idx_pi_grn; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pi_grn ON public.purchase_invoices USING btree (grn_id);


--
-- Name: idx_pi_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pi_number ON public.purchase_invoices USING btree (invoice_number);


--
-- Name: idx_pi_po; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pi_po ON public.purchase_invoices USING btree (po_id);


--
-- Name: idx_pi_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pi_project ON public.purchase_invoices USING btree (project_id);


--
-- Name: idx_pi_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pi_status ON public.purchase_invoices USING btree (status);


--
-- Name: idx_pi_supplier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pi_supplier ON public.purchase_invoices USING btree (supplier_id);


--
-- Name: idx_pii_invoice; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pii_invoice ON public.purchase_invoice_items USING btree (invoice_id);


--
-- Name: idx_pii_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pii_item ON public.purchase_invoice_items USING btree (inventory_item_id);


--
-- Name: idx_pii_warehouse; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pii_warehouse ON public.purchase_invoice_items USING btree (warehouse_id);


--
-- Name: idx_po_approved_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_po_approved_by ON public.purchase_orders USING btree (approved_by);


--
-- Name: idx_po_finance_approved_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_po_finance_approved_by ON public.purchase_orders USING btree (finance_approved_by);


--
-- Name: idx_po_items_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_po_items_item ON public.purchase_order_items USING btree (item_id);


--
-- Name: idx_po_items_po; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_po_items_po ON public.purchase_order_items USING btree (po_id);


--
-- Name: idx_po_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_po_number ON public.purchase_orders USING btree (po_number);


--
-- Name: idx_po_procurement_approved_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_po_procurement_approved_by ON public.purchase_orders USING btree (procurement_approved_by);


--
-- Name: idx_po_procurement_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_po_procurement_status ON public.purchase_orders USING btree (status) WHERE ((status)::text = ANY ((ARRAY['pending'::character varying, 'pending_procurement'::character varying, 'pending_finance'::character varying])::text[]));


--
-- Name: idx_po_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_po_project ON public.purchase_orders USING btree (project_id);


--
-- Name: idx_po_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_po_status ON public.purchase_orders USING btree (status);


--
-- Name: idx_po_supplier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_po_supplier ON public.purchase_orders USING btree (supplier_id);


--
-- Name: idx_project_ratings_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_ratings_client ON public.project_ratings USING btree (client_id);


--
-- Name: idx_project_ratings_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_ratings_created ON public.project_ratings USING btree (created_at DESC);


--
-- Name: idx_project_ratings_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_ratings_project ON public.project_ratings USING btree (project_id);


--
-- Name: idx_project_ratings_rating; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_ratings_rating ON public.project_ratings USING btree (rating);


--
-- Name: idx_projects_assigned_sales_rep; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_assigned_sales_rep ON public.projects USING btree (assigned_sales_rep_id);


--
-- Name: idx_projects_contract_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_contract_status ON public.projects USING btree (contract_status);


--
-- Name: idx_projects_delivered_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_delivered_at ON public.projects USING btree (delivered_at);


--
-- Name: idx_projects_quotation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_quotation_id ON public.projects USING btree (quotation_id);


--
-- Name: idx_projects_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_status ON public.projects USING btree (status);


--
-- Name: idx_quotations_client_response; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotations_client_response ON public.quotations USING btree (client_response);


--
-- Name: idx_quotations_file_url; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotations_file_url ON public.quotations USING btree (file_url) WHERE (file_url IS NOT NULL);


--
-- Name: idx_quotations_finance_approved_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotations_finance_approved_by ON public.quotations USING btree (finance_approved_by);


--
-- Name: idx_quotations_gm_approved_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotations_gm_approved_by ON public.quotations USING btree (gm_approved_by);


--
-- Name: idx_quotations_inspection_report_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotations_inspection_report_id ON public.quotations USING btree (inspection_report_id);


--
-- Name: idx_quotations_payment_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotations_payment_status ON public.quotations USING btree (payment_status);


--
-- Name: idx_quotations_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotations_project_id ON public.quotations USING btree (project_id);


--
-- Name: idx_quotations_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotations_status ON public.quotations USING btree (status);


--
-- Name: idx_sales_invoice_items_invoice; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_invoice_items_invoice ON public.sales_invoice_items USING btree (invoice_id);


--
-- Name: idx_sales_invoice_items_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_invoice_items_item ON public.sales_invoice_items USING btree (inventory_item_id);


--
-- Name: idx_sales_invoice_items_warehouse; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_invoice_items_warehouse ON public.sales_invoice_items USING btree (warehouse_id);


--
-- Name: idx_sales_invoices_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_invoices_client ON public.sales_invoices USING btree (client_id);


--
-- Name: idx_sales_invoices_discount; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_invoices_discount ON public.sales_invoices USING btree (discount_amount) WHERE (discount_amount > (0)::numeric);


--
-- Name: idx_sales_invoices_issue_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_invoices_issue_date ON public.sales_invoices USING btree (issue_date);


--
-- Name: idx_sales_invoices_journal; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_invoices_journal ON public.sales_invoices USING btree (journal_entry_id);


--
-- Name: idx_sales_invoices_lead; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_invoices_lead ON public.sales_invoices USING btree (lead_id);


--
-- Name: idx_sales_invoices_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_invoices_project ON public.sales_invoices USING btree (project_id);


--
-- Name: idx_sales_invoices_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_invoices_status ON public.sales_invoices USING btree (status);


--
-- Name: idx_sales_invoices_tax_invoice; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_invoices_tax_invoice ON public.sales_invoices USING btree (is_tax_invoice);


--
-- Name: idx_sales_invoices_tax_invoice_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_invoices_tax_invoice_id ON public.sales_invoices USING btree (tax_invoice_id);


--
-- Name: idx_suppliers_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_suppliers_active ON public.suppliers USING btree (is_active);


--
-- Name: idx_suppliers_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_suppliers_code ON public.suppliers USING btree (supplier_code);


--
-- Name: idx_suppliers_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_suppliers_type ON public.suppliers USING btree (supplier_type);


--
-- Name: idx_support_messages_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_messages_client ON public.client_support_messages USING btree (client_id);


--
-- Name: idx_support_messages_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_messages_created ON public.client_support_messages USING btree (created_at DESC);


--
-- Name: idx_support_messages_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_messages_project ON public.client_support_messages USING btree (project_id);


--
-- Name: idx_support_messages_sales_rep; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_messages_sales_rep ON public.client_support_messages USING btree (sales_rep_id);


--
-- Name: idx_support_messages_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_messages_unread ON public.client_support_messages USING btree (is_read) WHERE (is_read = false);


--
-- Name: idx_tasks_assigned_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_assigned_to ON public.tasks USING btree (assigned_to);


--
-- Name: idx_tasks_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_project_id ON public.tasks USING btree (project_id);


--
-- Name: idx_tasks_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_status ON public.tasks USING btree (status);


--
-- Name: idx_tax_logs_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tax_logs_action ON public.tax_invoice_logs USING btree (action);


--
-- Name: idx_tax_logs_invoice; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tax_logs_invoice ON public.tax_invoice_logs USING btree (invoice_id);


--
-- Name: idx_time_logs_clock_in; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_time_logs_clock_in ON public.time_logs USING btree (clock_in DESC);


--
-- Name: idx_time_logs_employee; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_time_logs_employee ON public.time_logs USING btree (employee_id);


--
-- Name: idx_unique_project_client_rating; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_unique_project_client_rating ON public.project_ratings USING btree (project_id, client_id);


--
-- Name: idx_users_department_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_department_id ON public.users USING btree (department_id);


--
-- Name: idx_users_email_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_users_email_unique ON public.users USING btree (email);


--
-- Name: idx_users_role_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_role_id ON public.users USING btree (role_id);


--
-- Name: idx_warehouse_stock_available; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_warehouse_stock_available ON public.warehouse_stock USING btree (available_quantity);


--
-- Name: idx_warehouse_stock_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_warehouse_stock_item ON public.warehouse_stock USING btree (item_id);


--
-- Name: idx_warehouse_stock_warehouse; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_warehouse_stock_warehouse ON public.warehouse_stock USING btree (warehouse_id);


--
-- Name: idx_warehouses_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_warehouses_active ON public.warehouses USING btree (is_active);


--
-- Name: idx_warehouses_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_warehouses_code ON public.warehouses USING btree (warehouse_code);


--
-- Name: idx_warehouses_supervisor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_warehouses_supervisor ON public.warehouses USING btree (supervisor_id);


--
-- Name: v_contract_financial_summary _RETURN; Type: RULE; Schema: public; Owner: -
--

CREATE OR REPLACE VIEW public.v_contract_financial_summary AS
 SELECT c.id,
    c.contract_number,
    c.total_value,
    round((c.total_value * (c.vat_rate / (100)::numeric)), 2) AS total_vat,
    round((c.total_value * ((1)::numeric + (c.vat_rate / (100)::numeric))), 2) AS grand_total,
    COALESCE(sum(cm.milestone_amount) FILTER (WHERE ((cm.status)::text = 'paid'::text)), (0)::numeric) AS collected_amount
   FROM (public.contracts c
     LEFT JOIN public.contract_milestones cm ON ((c.id = cm.contract_id)))
  GROUP BY c.id;


--
-- Name: departments set_timestamp_departments; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_timestamp_departments BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: approval_steps trg_approval_steps_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_approval_steps_updated_at BEFORE UPDATE ON public.approval_steps FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: assets trg_assets_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_assets_updated_at BEFORE UPDATE ON public.assets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: invoices trg_auto_generate_invoice_pdf; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_auto_generate_invoice_pdf BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.auto_generate_invoice_pdf();


--
-- Name: chart_of_accounts trg_chart_of_accounts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_chart_of_accounts_updated_at BEFORE UPDATE ON public.chart_of_accounts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: client_support_messages trg_client_support_messages_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_client_support_messages_updated_at BEFORE UPDATE ON public.client_support_messages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: departments trg_departments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_departments_updated_at BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: documents trg_documents_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: employee_evaluations trg_employee_evaluations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_employee_evaluations_updated_at BEFORE UPDATE ON public.employee_evaluations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: employees trg_employees_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_employees_updated_at BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: expenses trg_expenses_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: fixed_assets trg_fixed_assets_before_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_fixed_assets_before_insert BEFORE INSERT ON public.fixed_assets FOR EACH ROW EXECUTE FUNCTION public.fn_fixed_assets_before_insert();


--
-- Name: fixed_assets trg_fixed_assets_before_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_fixed_assets_before_update BEFORE UPDATE ON public.fixed_assets FOR EACH ROW EXECUTE FUNCTION public.fn_fixed_assets_before_update();


--
-- Name: credit_notes trg_generate_credit_note_number; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_generate_credit_note_number BEFORE INSERT ON public.credit_notes FOR EACH ROW WHEN ((new.credit_note_number IS NULL)) EXECUTE FUNCTION public.generate_credit_note_number();


--
-- Name: inspections trg_inspections_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_inspections_updated_at BEFORE UPDATE ON public.inspections FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: installed_assets trg_installed_assets_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_installed_assets_updated_at BEFORE UPDATE ON public.installed_assets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: inventory_movements trg_inventory_movements_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_inventory_movements_updated_at BEFORE UPDATE ON public.inventory_movements FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: invoices trg_invoices_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: journal_entries trg_journal_entries_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_journal_entries_updated_at BEFORE UPDATE ON public.journal_entries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: leads trg_leads_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: leave_requests trg_leave_requests_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_leave_requests_updated_at BEFORE UPDATE ON public.leave_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: maintenance_contracts trg_maintenance_contracts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_maintenance_contracts_updated_at BEFORE UPDATE ON public.maintenance_contracts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: maintenance_records trg_maintenance_records_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_maintenance_records_updated_at BEFORE UPDATE ON public.maintenance_records FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: maintenance_visits trg_maintenance_visits_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_maintenance_visits_updated_at BEFORE UPDATE ON public.maintenance_visits FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: petty_cash_funds trg_petty_cash_funds_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_petty_cash_funds_updated_at BEFORE UPDATE ON public.petty_cash_funds FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: project_ratings trg_project_ratings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_project_ratings_updated_at BEFORE UPDATE ON public.project_ratings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: projects trg_projects_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: quotations trg_quotations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_quotations_updated_at BEFORE UPDATE ON public.quotations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: roles trg_roles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_roles_updated_at BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: sales_invoice_items trg_sales_invoice_items_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sales_invoice_items_updated_at BEFORE UPDATE ON public.sales_invoice_items FOR EACH ROW EXECUTE FUNCTION public.update_sales_invoice_items_updated_at();


--
-- Name: tasks trg_tasks_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: contracts trg_update_milestone_amounts; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_update_milestone_amounts AFTER UPDATE OF total_value ON public.contracts FOR EACH ROW WHEN ((old.total_value <> new.total_value)) EXECUTE FUNCTION public.update_milestone_amounts();


--
-- Name: users trg_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: attendance update_attendance_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_attendance_timestamp BEFORE UPDATE ON public.attendance FOR EACH ROW EXECUTE FUNCTION public.update_attendance_updated_at();


--
-- Name: budgets update_budgets_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON public.budgets FOR EACH ROW EXECUTE FUNCTION public.update_budgets_updated_at();


--
-- Name: goods_receipts update_goods_receipts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_goods_receipts_updated_at BEFORE UPDATE ON public.goods_receipts FOR EACH ROW EXECUTE FUNCTION public.update_goods_receipts_updated_at();


--
-- Name: inventory_items update_inventory_items_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON public.inventory_items FOR EACH ROW EXECUTE FUNCTION public.update_inventory_items_updated_at();


--
-- Name: purchase_invoices update_purchase_invoices_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_purchase_invoices_updated_at BEFORE UPDATE ON public.purchase_invoices FOR EACH ROW EXECUTE FUNCTION public.update_purchase_invoices_updated_at();


--
-- Name: purchase_orders update_purchase_orders_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.update_purchase_orders_updated_at();


--
-- Name: sales_invoices update_sales_invoices_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_sales_invoices_updated_at BEFORE UPDATE ON public.sales_invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: suppliers update_suppliers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.update_suppliers_updated_at();


--
-- Name: time_logs update_time_logs_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_time_logs_timestamp BEFORE UPDATE ON public.time_logs FOR EACH ROW EXECUTE FUNCTION public.update_time_logs_updated_at();


--
-- Name: warehouse_stock update_warehouse_stock_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_warehouse_stock_updated_at BEFORE UPDATE ON public.warehouse_stock FOR EACH ROW EXECUTE FUNCTION public.update_warehouse_stock_updated_at();


--
-- Name: warehouses update_warehouses_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_warehouses_updated_at BEFORE UPDATE ON public.warehouses FOR EACH ROW EXECUTE FUNCTION public.update_warehouses_updated_at();


--
-- Name: approval_steps approval_steps_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_steps
    ADD CONSTRAINT approval_steps_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: approval_steps approval_steps_quotation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_steps
    ADD CONSTRAINT approval_steps_quotation_id_fkey FOREIGN KEY (quotation_id) REFERENCES public.quotations(id) ON DELETE CASCADE;


--
-- Name: assets assets_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: assets assets_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: attendance attendance_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: attendance attendance_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: budgets budgets_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budgets
    ADD CONSTRAINT budgets_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: chart_of_accounts chart_of_accounts_parent_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chart_of_accounts
    ADD CONSTRAINT chart_of_accounts_parent_account_id_fkey FOREIGN KEY (parent_account_id) REFERENCES public.chart_of_accounts(id);


--
-- Name: chart_of_accounts chart_of_accounts_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chart_of_accounts
    ADD CONSTRAINT chart_of_accounts_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.chart_of_accounts(id);


--
-- Name: client_support_messages client_support_messages_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_support_messages
    ADD CONSTRAINT client_support_messages_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: client_support_messages client_support_messages_parent_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_support_messages
    ADD CONSTRAINT client_support_messages_parent_message_id_fkey FOREIGN KEY (parent_message_id) REFERENCES public.client_support_messages(id) ON DELETE SET NULL;


--
-- Name: client_support_messages client_support_messages_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_support_messages
    ADD CONSTRAINT client_support_messages_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: client_support_messages client_support_messages_sales_rep_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_support_messages
    ADD CONSTRAINT client_support_messages_sales_rep_id_fkey FOREIGN KEY (sales_rep_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: contract_amendments contract_amendments_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_amendments
    ADD CONSTRAINT contract_amendments_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: contract_amendments contract_amendments_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_amendments
    ADD CONSTRAINT contract_amendments_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE CASCADE;


--
-- Name: contract_items contract_items_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_items
    ADD CONSTRAINT contract_items_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE CASCADE;


--
-- Name: contract_milestones contract_milestones_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_milestones
    ADD CONSTRAINT contract_milestones_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE CASCADE;


--
-- Name: contracts contracts_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: credit_note_items credit_note_items_credit_note_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_note_items
    ADD CONSTRAINT credit_note_items_credit_note_id_fkey FOREIGN KEY (credit_note_id) REFERENCES public.credit_notes(id) ON DELETE CASCADE;


--
-- Name: credit_notes credit_notes_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_notes
    ADD CONSTRAINT credit_notes_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: credit_notes credit_notes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_notes
    ADD CONSTRAINT credit_notes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: credit_notes credit_notes_discount_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_notes
    ADD CONSTRAINT credit_notes_discount_account_id_fkey FOREIGN KEY (discount_account_id) REFERENCES public.chart_of_accounts(id);


--
-- Name: credit_notes credit_notes_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_notes
    ADD CONSTRAINT credit_notes_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.sales_invoices(id) ON DELETE CASCADE;


--
-- Name: credit_notes credit_notes_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_notes
    ADD CONSTRAINT credit_notes_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE SET NULL;


--
-- Name: credit_notes credit_notes_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_notes
    ADD CONSTRAINT credit_notes_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;


--
-- Name: credit_notes credit_notes_receivable_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_notes
    ADD CONSTRAINT credit_notes_receivable_account_id_fkey FOREIGN KEY (receivable_account_id) REFERENCES public.chart_of_accounts(id);


--
-- Name: credit_notes credit_notes_revenue_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_notes
    ADD CONSTRAINT credit_notes_revenue_account_id_fkey FOREIGN KEY (revenue_account_id) REFERENCES public.chart_of_accounts(id);


--
-- Name: credit_notes credit_notes_tax_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_notes
    ADD CONSTRAINT credit_notes_tax_account_id_fkey FOREIGN KEY (tax_account_id) REFERENCES public.chart_of_accounts(id);


--
-- Name: departments departments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: documents documents_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: employee_evaluations employee_evaluations_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_evaluations
    ADD CONSTRAINT employee_evaluations_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: employee_evaluations employee_evaluations_evaluator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_evaluations
    ADD CONSTRAINT employee_evaluations_evaluator_id_fkey FOREIGN KEY (evaluator_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: employee_evaluations employee_evaluations_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_evaluations
    ADD CONSTRAINT employee_evaluations_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;


--
-- Name: employee_leave_balances employee_leave_balances_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_leave_balances
    ADD CONSTRAINT employee_leave_balances_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: employees employees_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: employees employees_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;


--
-- Name: employees employees_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: expense_vouchers expense_vouchers_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_vouchers
    ADD CONSTRAINT expense_vouchers_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: expense_vouchers expense_vouchers_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_vouchers
    ADD CONSTRAINT expense_vouchers_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: expense_vouchers expense_vouchers_expense_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_vouchers
    ADD CONSTRAINT expense_vouchers_expense_account_id_fkey FOREIGN KEY (expense_account_id) REFERENCES public.chart_of_accounts(id);


--
-- Name: expense_vouchers expense_vouchers_journal_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_vouchers
    ADD CONSTRAINT expense_vouchers_journal_entry_id_fkey FOREIGN KEY (journal_entry_id) REFERENCES public.journal_entries(id) ON DELETE SET NULL;


--
-- Name: expense_vouchers expense_vouchers_payment_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_vouchers
    ADD CONSTRAINT expense_vouchers_payment_account_id_fkey FOREIGN KEY (payment_account_id) REFERENCES public.chart_of_accounts(id);


--
-- Name: expenses expenses_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.chart_of_accounts(id);


--
-- Name: expenses expenses_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: expenses expenses_petty_cash_fund_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_petty_cash_fund_id_fkey FOREIGN KEY (petty_cash_fund_id) REFERENCES public.petty_cash_funds(id);


--
-- Name: expenses expenses_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: fixed_assets fixed_assets_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fixed_assets
    ADD CONSTRAINT fixed_assets_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: fixed_assets fixed_assets_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fixed_assets
    ADD CONSTRAINT fixed_assets_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;


--
-- Name: projects fk_proj_eng; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT fk_proj_eng FOREIGN KEY (assigned_engineer_id) REFERENCES public.users(id);


--
-- Name: projects fk_project_lead; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT fk_project_lead FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: projects fk_project_quotation; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT fk_project_quotation FOREIGN KEY (quotation_id) REFERENCES public.quotations(id) ON DELETE SET NULL;


--
-- Name: projects fk_project_sales_rep; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT fk_project_sales_rep FOREIGN KEY (assigned_sales_rep_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: quotations fk_quotation_lead; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotations
    ADD CONSTRAINT fk_quotation_lead FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: goods_receipt_items goods_receipt_items_grn_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_receipt_items
    ADD CONSTRAINT goods_receipt_items_grn_id_fkey FOREIGN KEY (grn_id) REFERENCES public.goods_receipts(id) ON DELETE CASCADE;


--
-- Name: goods_receipt_items goods_receipt_items_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_receipt_items
    ADD CONSTRAINT goods_receipt_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.inventory_items(id);


--
-- Name: goods_receipt_items goods_receipt_items_po_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_receipt_items
    ADD CONSTRAINT goods_receipt_items_po_item_id_fkey FOREIGN KEY (po_item_id) REFERENCES public.purchase_order_items(id);


--
-- Name: goods_receipts goods_receipts_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_receipts
    ADD CONSTRAINT goods_receipts_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: goods_receipts goods_receipts_po_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_receipts
    ADD CONSTRAINT goods_receipts_po_id_fkey FOREIGN KEY (po_id) REFERENCES public.purchase_orders(id);


--
-- Name: inspection_reports inspection_reports_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inspection_reports
    ADD CONSTRAINT inspection_reports_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: inspection_reports inspection_reports_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inspection_reports
    ADD CONSTRAINT inspection_reports_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: inspections inspections_assigned_engineer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inspections
    ADD CONSTRAINT inspections_assigned_engineer_id_fkey FOREIGN KEY (assigned_engineer_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: inspections inspections_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inspections
    ADD CONSTRAINT inspections_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: installed_assets installed_assets_assigned_engineer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.installed_assets
    ADD CONSTRAINT installed_assets_assigned_engineer_id_fkey FOREIGN KEY (assigned_engineer_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: installed_assets installed_assets_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.installed_assets
    ADD CONSTRAINT installed_assets_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: installed_assets installed_assets_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.installed_assets
    ADD CONSTRAINT installed_assets_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: installed_assets installed_assets_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.installed_assets
    ADD CONSTRAINT installed_assets_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: inventory_items inventory_items_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: inventory_items inventory_items_default_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_default_warehouse_id_fkey FOREIGN KEY (default_warehouse_id) REFERENCES public.warehouses(id) ON DELETE SET NULL;


--
-- Name: inventory_movements inventory_movements_performed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: inventory_movements inventory_movements_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: inventory_movements inventory_movements_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id) ON DELETE SET NULL;


--
-- Name: invoices invoices_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE SET NULL;


--
-- Name: invoices invoices_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: invoices invoices_journal_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_journal_entry_id_fkey FOREIGN KEY (journal_entry_id) REFERENCES public.journal_entries(id);


--
-- Name: invoices invoices_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: journal_entries journal_entries_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT journal_entries_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.chart_of_accounts(id);


--
-- Name: journal_entries journal_entries_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT journal_entries_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: journal_entries journal_entries_posted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT journal_entries_posted_by_fkey FOREIGN KEY (posted_by) REFERENCES public.users(id);


--
-- Name: journal_entries journal_entries_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT journal_entries_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: journal_entry_lines journal_entry_lines_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entry_lines
    ADD CONSTRAINT journal_entry_lines_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.chart_of_accounts(id);


--
-- Name: journal_entry_lines journal_entry_lines_journal_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entry_lines
    ADD CONSTRAINT journal_entry_lines_journal_entry_id_fkey FOREIGN KEY (journal_entry_id) REFERENCES public.journal_entries(id) ON DELETE CASCADE;


--
-- Name: lead_interactions lead_interactions_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_interactions
    ADD CONSTRAINT lead_interactions_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: lead_interactions lead_interactions_performed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_interactions
    ADD CONSTRAINT lead_interactions_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: leads leads_assigned_engineer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_assigned_engineer_id_fkey FOREIGN KEY (assigned_engineer_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: leads leads_assigned_sales_rep_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_assigned_sales_rep_id_fkey FOREIGN KEY (assigned_sales_rep_id) REFERENCES public.users(id);


--
-- Name: leads leads_client_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_client_user_id_fkey FOREIGN KEY (client_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: leads leads_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: leads leads_receivable_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_receivable_account_id_fkey FOREIGN KEY (receivable_account_id) REFERENCES public.chart_of_accounts(id);


--
-- Name: leads leads_technical_dept_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_technical_dept_id_fkey FOREIGN KEY (technical_dept_id) REFERENCES public.departments(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: leave_requests leave_requests_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: leave_requests leave_requests_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: maintenance_contracts maintenance_contracts_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_contracts
    ADD CONSTRAINT maintenance_contracts_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: maintenance_contracts maintenance_contracts_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_contracts
    ADD CONSTRAINT maintenance_contracts_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: maintenance_contracts maintenance_contracts_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_contracts
    ADD CONSTRAINT maintenance_contracts_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;


--
-- Name: maintenance_records maintenance_records_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_records
    ADD CONSTRAINT maintenance_records_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: maintenance_records maintenance_records_performed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_records
    ADD CONSTRAINT maintenance_records_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: maintenance_visits maintenance_visits_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_visits
    ADD CONSTRAINT maintenance_visits_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.installed_assets(id) ON DELETE CASCADE;


--
-- Name: maintenance_visits maintenance_visits_assigned_engineer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_visits
    ADD CONSTRAINT maintenance_visits_assigned_engineer_id_fkey FOREIGN KEY (assigned_engineer_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: maintenance_visits maintenance_visits_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_visits
    ADD CONSTRAINT maintenance_visits_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: maintenance_visits maintenance_visits_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_visits
    ADD CONSTRAINT maintenance_visits_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE SET NULL;


--
-- Name: maintenance_visits maintenance_visits_scheduled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_visits
    ADD CONSTRAINT maintenance_visits_scheduled_by_fkey FOREIGN KEY (scheduled_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: otp_codes otp_codes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.otp_codes
    ADD CONSTRAINT otp_codes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: payment_vouchers payment_vouchers_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_vouchers
    ADD CONSTRAINT payment_vouchers_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: payment_vouchers payment_vouchers_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_vouchers
    ADD CONSTRAINT payment_vouchers_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: payment_vouchers payment_vouchers_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_vouchers
    ADD CONSTRAINT payment_vouchers_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.purchase_invoices(id) ON DELETE RESTRICT;


--
-- Name: payment_vouchers payment_vouchers_journal_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_vouchers
    ADD CONSTRAINT payment_vouchers_journal_entry_id_fkey FOREIGN KEY (journal_entry_id) REFERENCES public.journal_entries(id) ON DELETE SET NULL;


--
-- Name: payment_vouchers payment_vouchers_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_vouchers
    ADD CONSTRAINT payment_vouchers_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;


--
-- Name: payment_vouchers payment_vouchers_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_vouchers
    ADD CONSTRAINT payment_vouchers_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE RESTRICT;


--
-- Name: petty_cash_funds petty_cash_funds_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.petty_cash_funds
    ADD CONSTRAINT petty_cash_funds_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: petty_cash_funds petty_cash_funds_engineer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.petty_cash_funds
    ADD CONSTRAINT petty_cash_funds_engineer_id_fkey FOREIGN KEY (engineer_id) REFERENCES public.users(id);


--
-- Name: petty_cash_funds petty_cash_funds_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.petty_cash_funds
    ADD CONSTRAINT petty_cash_funds_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: petty_cash_transactions petty_cash_transactions_performed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.petty_cash_transactions
    ADD CONSTRAINT petty_cash_transactions_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.users(id);


--
-- Name: petty_cash_transactions petty_cash_transactions_petty_cash_fund_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.petty_cash_transactions
    ADD CONSTRAINT petty_cash_transactions_petty_cash_fund_id_fkey FOREIGN KEY (petty_cash_fund_id) REFERENCES public.petty_cash_funds(id);


--
-- Name: project_employees project_employees_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_employees
    ADD CONSTRAINT project_employees_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: project_employees project_employees_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_employees
    ADD CONSTRAINT project_employees_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: project_ratings project_ratings_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_ratings
    ADD CONSTRAINT project_ratings_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: project_ratings project_ratings_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_ratings
    ADD CONSTRAINT project_ratings_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: project_ratings project_ratings_responded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_ratings
    ADD CONSTRAINT project_ratings_responded_by_fkey FOREIGN KEY (responded_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: projects projects_assigned_sales_rep_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_assigned_sales_rep_id_fkey FOREIGN KEY (assigned_sales_rep_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: projects projects_quotation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_quotation_id_fkey FOREIGN KEY (quotation_id) REFERENCES public.quotations(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: purchase_invoice_items purchase_invoice_items_inventory_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_invoice_items
    ADD CONSTRAINT purchase_invoice_items_inventory_item_id_fkey FOREIGN KEY (inventory_item_id) REFERENCES public.inventory_items(id);


--
-- Name: purchase_invoice_items purchase_invoice_items_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_invoice_items
    ADD CONSTRAINT purchase_invoice_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.purchase_invoices(id) ON DELETE CASCADE;


--
-- Name: purchase_invoice_items purchase_invoice_items_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_invoice_items
    ADD CONSTRAINT purchase_invoice_items_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id);


--
-- Name: purchase_invoices purchase_invoices_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_invoices
    ADD CONSTRAINT purchase_invoices_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: purchase_invoices purchase_invoices_grn_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_invoices
    ADD CONSTRAINT purchase_invoices_grn_id_fkey FOREIGN KEY (grn_id) REFERENCES public.goods_receipts(id);


--
-- Name: purchase_invoices purchase_invoices_journal_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_invoices
    ADD CONSTRAINT purchase_invoices_journal_entry_id_fkey FOREIGN KEY (journal_entry_id) REFERENCES public.journal_entries(id) ON DELETE SET NULL;


--
-- Name: purchase_invoices purchase_invoices_po_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_invoices
    ADD CONSTRAINT purchase_invoices_po_id_fkey FOREIGN KEY (po_id) REFERENCES public.purchase_orders(id);


--
-- Name: purchase_invoices purchase_invoices_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_invoices
    ADD CONSTRAINT purchase_invoices_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;


--
-- Name: purchase_invoices purchase_invoices_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_invoices
    ADD CONSTRAINT purchase_invoices_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id);


--
-- Name: purchase_order_items purchase_order_items_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.inventory_items(id);


--
-- Name: purchase_order_items purchase_order_items_po_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_po_id_fkey FOREIGN KEY (po_id) REFERENCES public.purchase_orders(id) ON DELETE CASCADE;


--
-- Name: purchase_orders purchase_orders_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: purchase_orders purchase_orders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: purchase_orders purchase_orders_finance_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_finance_approved_by_fkey FOREIGN KEY (finance_approved_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: purchase_orders purchase_orders_finance_rejected_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_finance_rejected_by_fkey FOREIGN KEY (finance_rejected_by) REFERENCES public.users(id);


--
-- Name: purchase_orders purchase_orders_procurement_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_procurement_approved_by_fkey FOREIGN KEY (procurement_approved_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: purchase_orders purchase_orders_procurement_rejected_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_procurement_rejected_by_fkey FOREIGN KEY (procurement_rejected_by) REFERENCES public.users(id);


--
-- Name: purchase_orders purchase_orders_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;


--
-- Name: purchase_orders purchase_orders_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id);


--
-- Name: quotations quotations_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotations
    ADD CONSTRAINT quotations_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: quotations quotations_converted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotations
    ADD CONSTRAINT quotations_converted_by_fkey FOREIGN KEY (converted_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: quotations quotations_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotations
    ADD CONSTRAINT quotations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: quotations quotations_finance_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotations
    ADD CONSTRAINT quotations_finance_approved_by_fkey FOREIGN KEY (finance_approved_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: quotations quotations_gm_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotations
    ADD CONSTRAINT quotations_gm_approved_by_fkey FOREIGN KEY (gm_approved_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: quotations quotations_payment_confirmed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotations
    ADD CONSTRAINT quotations_payment_confirmed_by_fkey FOREIGN KEY (payment_confirmed_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: quotations quotations_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotations
    ADD CONSTRAINT quotations_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;


--
-- Name: receipt_voucher_invoices receipt_voucher_invoices_receipt_voucher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipt_voucher_invoices
    ADD CONSTRAINT receipt_voucher_invoices_receipt_voucher_id_fkey FOREIGN KEY (receipt_voucher_id) REFERENCES public.receipt_vouchers(id) ON DELETE CASCADE;


--
-- Name: receipt_voucher_invoices receipt_voucher_invoices_sales_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipt_voucher_invoices
    ADD CONSTRAINT receipt_voucher_invoices_sales_invoice_id_fkey FOREIGN KEY (sales_invoice_id) REFERENCES public.sales_invoices(id);


--
-- Name: receipt_vouchers receipt_vouchers_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipt_vouchers
    ADD CONSTRAINT receipt_vouchers_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.users(id);


--
-- Name: receipt_vouchers receipt_vouchers_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipt_vouchers
    ADD CONSTRAINT receipt_vouchers_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: receipt_vouchers receipt_vouchers_payment_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipt_vouchers
    ADD CONSTRAINT receipt_vouchers_payment_account_id_fkey FOREIGN KEY (payment_account_id) REFERENCES public.chart_of_accounts(id);


--
-- Name: receipt_vouchers receipt_vouchers_posted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipt_vouchers
    ADD CONSTRAINT receipt_vouchers_posted_by_fkey FOREIGN KEY (posted_by) REFERENCES public.users(id);


--
-- Name: role_permissions role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: sales_invoice_items sales_invoice_items_inventory_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_invoice_items
    ADD CONSTRAINT sales_invoice_items_inventory_item_id_fkey FOREIGN KEY (inventory_item_id) REFERENCES public.inventory_items(id);


--
-- Name: sales_invoice_items sales_invoice_items_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_invoice_items
    ADD CONSTRAINT sales_invoice_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.sales_invoices(id) ON DELETE CASCADE;


--
-- Name: sales_invoice_items sales_invoice_items_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_invoice_items
    ADD CONSTRAINT sales_invoice_items_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id);


--
-- Name: sales_invoices sales_invoices_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_invoices
    ADD CONSTRAINT sales_invoices_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: sales_invoices sales_invoices_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_invoices
    ADD CONSTRAINT sales_invoices_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: sales_invoices sales_invoices_discount_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_invoices
    ADD CONSTRAINT sales_invoices_discount_account_id_fkey FOREIGN KEY (discount_account_id) REFERENCES public.chart_of_accounts(id);


--
-- Name: sales_invoices sales_invoices_journal_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_invoices
    ADD CONSTRAINT sales_invoices_journal_entry_id_fkey FOREIGN KEY (journal_entry_id) REFERENCES public.journal_entries(id) ON DELETE SET NULL;


--
-- Name: sales_invoices sales_invoices_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_invoices
    ADD CONSTRAINT sales_invoices_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE SET NULL;


--
-- Name: sales_invoices sales_invoices_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_invoices
    ADD CONSTRAINT sales_invoices_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;


--
-- Name: sales_invoices sales_invoices_receivable_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_invoices
    ADD CONSTRAINT sales_invoices_receivable_account_id_fkey FOREIGN KEY (receivable_account_id) REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL;


--
-- Name: sales_invoices sales_invoices_revenue_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_invoices
    ADD CONSTRAINT sales_invoices_revenue_account_id_fkey FOREIGN KEY (revenue_account_id) REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL;


--
-- Name: sales_invoices sales_invoices_tax_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_invoices
    ADD CONSTRAINT sales_invoices_tax_invoice_id_fkey FOREIGN KEY (tax_invoice_id) REFERENCES public.invoices(id) ON DELETE SET NULL;


--
-- Name: sales_invoices sales_invoices_vat_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_invoices
    ADD CONSTRAINT sales_invoices_vat_account_id_fkey FOREIGN KEY (vat_account_id) REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL;


--
-- Name: suppliers suppliers_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: tasks tasks_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: tasks tasks_parent_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_parent_task_id_fkey FOREIGN KEY (parent_task_id) REFERENCES public.tasks(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: tasks tasks_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: tax_invoice_logs tax_invoice_logs_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tax_invoice_logs
    ADD CONSTRAINT tax_invoice_logs_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;


--
-- Name: tax_invoice_logs tax_invoice_logs_performed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tax_invoice_logs
    ADD CONSTRAINT tax_invoice_logs_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.users(id);


--
-- Name: time_logs time_logs_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_logs
    ADD CONSTRAINT time_logs_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: users users_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;


--
-- Name: users users_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: warehouse_stock warehouse_stock_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouse_stock
    ADD CONSTRAINT warehouse_stock_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.inventory_items(id) ON DELETE CASCADE;


--
-- Name: warehouse_stock warehouse_stock_last_counted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouse_stock
    ADD CONSTRAINT warehouse_stock_last_counted_by_fkey FOREIGN KEY (last_counted_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: warehouse_stock warehouse_stock_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouse_stock
    ADD CONSTRAINT warehouse_stock_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id) ON DELETE CASCADE;


--
-- Name: warehouses warehouses_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouses
    ADD CONSTRAINT warehouses_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: warehouses warehouses_supervisor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouses
    ADD CONSTRAINT warehouses_supervisor_id_fkey FOREIGN KEY (supervisor_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict 6R3XMLusW84XCaQtQtvKuV39Sdiy6h02sjtwlgcREyUv0ivZ2xAArPaxA8nIXQU

