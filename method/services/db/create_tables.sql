CREATE DATABASE method;

\c method;

DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS payors;
DROP TABLE IF EXISTS employees;

CREATE TABLE Employees (
  employee_id TEXT PRIMARY KEY,
  branch_id TEXT,
  first_name TEXT,
  last_name TEXT,
  dob DATE,
  phone_number TEXT
);

CREATE TABLE Payors (
  payor_id TEXT PRIMARY KEY,
  aba_routing TEXT,
  account_number TEXT,
  name TEXT,
  dba TEXT,
  ein TEXT,
  address_line1 TEXT,
  city TEXT,
  state TEXT,
  zip TEXT
);

CREATE TABLE Payments (
  payment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id TEXT REFERENCES Employees(employee_id),
  payor_id TEXT REFERENCES Payors(payor_id),
  plaid_id TEXT,
  loan_account_number TEXT,
  amount NUMERIC,
  status TEXT DEFAULT 'pending',
  batch_id UUID
);
