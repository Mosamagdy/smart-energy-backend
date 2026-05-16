# Smart Energy ERP - Postman Collection Guide

## Overview
This collection provides complete end-to-end testing for the Smart Energy ERP system, following the "Golden Path" workflow from Lead creation to final Quotation approval.

## Import Instructions

1. Open Postman
2. Click **Import**
3. Select the file: `smart-energy-erp-golden-path.postman_collection.json`
4. The collection will appear in your sidebar

## Pre-requisites

### 1. Database Seeding
Before running the collection, ensure your database is seeded with:
- All roles (super_admin, hr_manager, general_manager, dept_head, engineer, finance, etc.)
- Test users for each role
- Default permissions

Run the seed script:
```bash
cd backend
node db/seed.js
```

### 2. Update Login Credentials
Edit the login requests in the collection with your actual credentials:
- **Super Admin**: `admin` / `admin123` (or your seeded credentials)
- **HR Manager**: `hr_manager_1` / `password123`
- **General Manager**: `gm_1` / `password123`
- **Department Head**: `dept_head_1` / `password123`
- **Engineer**: `engineer_1` / `password123`
- **Finance**: `finance_1` / `password123`

## Collection Variables

The collection automatically manages these variables:

| Variable | Description | Set By |
|----------|-------------|--------|
| `baseUrl` | API base URL | Manual (default: http://localhost:3000/api) |
| `*_token` | JWT tokens for each role | Login requests |
| `department_id` | Created department ID | Create Department |
| `employee_user_id` | Created employee's user ID | Create Employee |
| `lead_id` | Created lead ID | Create Lead |
| `inspection_id` | Created inspection ID | Assign Engineer |
| `quotation_id` | Created quotation ID | Create Quotation |

## Workflow Sequence

### Phase 1: Setup (Authentication & HR)
1. **Login all roles** - Get JWT tokens for authorization
2. **Create Department** - Establish organizational structure
3. **Create Employee** - Add engineers/managers to the system

### Phase 2: Sales Pipeline
4. **Create Lead** - New customer opportunity
5. **Assign Engineer** - Link engineer to lead, create inspection
6. **Submit Inspection Report** - Technical assessment completed

### Phase 3: Quotation & Approval
7. **Create Quotation** - BOQ with pricing
8. **Finance Review** - Budget verification
9. **GM Approval** - Final deal closure

### Phase 4: Monitoring
10. **Check Notifications** - Verify workflow notifications

## Request Examples

### Example 1: Employee Partial Update (PATCH)
You can update individual fields or multiple fields:

**Update single field:**
```json
{
  "basic_salary": 9500
}
```

**Update multiple fields:**
```json
{
  "job_title": "Senior Engineer",
  "basic_salary": 10000,
  "transport_allowance": 500
}
```

**Update user-synced fields:**
```json
{
  "first_name": "Mohammed",
  "personal_email": "new.email@example.com"
}
```

### Example 2: Leave Request Workflow

**Step 1: Employee creates leave**
```bash
POST /api/hr/leaves
Authorization: Bearer {{engineer_token}}

{
  "leave_type": "annual",
  "start_date": "2026-04-01",
  "end_date": "2026-04-10",
  "reason": "Family vacation"
}
```

**Step 2: Dept Head approves (Level 1)**
```bash
PATCH /api/hr/leaves/:id/status
Authorization: Bearer {{dept_head_token}}

{
  "status": "approved"
}
```

**Step 3: HR Manager final approval (Level 2)**
```bash
PATCH /api/hr/leaves/:id/status
Authorization: Bearer {{hr_manager_token}}

{
  "status": "approved"
}
```

## Testing Employee Update Bug Fix

### Test Case 1: Single Field Update
```bash
PATCH /api/hr/employees/1
Authorization: Bearer {{hr_manager_token}}
Content-Type: application/json

{
  "basic_salary": 8500
}
```

**Expected Result:** 200 OK, returns updated employee data

### Test Case 2: Multiple Fields Update
```bash
PATCH /api/hr/employees/1
Authorization: Bearer {{hr_manager_token}}
Content-Type: application/json

{
  "job_title": "Senior Engineer",
  "basic_salary": 9000,
  "transport_allowance": 600
}
```

**Expected Result:** 200 OK, returns updated employee data

### Test Case 3: User-Synced Fields Update
```bash
PATCH /api/hr/employees/1
Authorization: Bearer {{hr_manager_token}}
Content-Type: application/json

{
  "first_name": "Khaled",
  "personal_phone": "+966509876543"
}
```

**Expected Result:** 
- 200 OK
- Both employees AND users table updated
- Employee record reflects new name/phone

### Test Case 4: Email Uniqueness Validation
```bash
PATCH /api/hr/employees/1
Authorization: Bearer {{hr_manager_token}}
Content-Type: application/json

{
  "personal_email": "existing.email@example.com"
}
```

**Expected Result:** 409 Conflict - "البريد الإلكتروني مستخدم بالفعل"

### Test Case 5: Invalid Fields Filtered
```bash
PATCH /api/hr/employees/1
Authorization: Bearer {{hr_manager_token}}
Content-Type: application/json

{
  "invalid_field": "test",
  "basic_salary": 8000
}
```

**Expected Result:** 200 OK - only valid fields updated, invalid ignored

### Test Case 6: No Valid Fields
```bash
PATCH /api/hr/employees/1
Authorization: Bearer {{hr_manager_token}}
Content-Type: application/json

{
  "unknown_field": "value"
}
```

**Expected Result:** 400 Bad Request - "لا توجد بيانات صالحة للتحديث"

## Error Handling

### Common Error Responses

| Status Code | Meaning | Example Response |
|-------------|---------|------------------|
| 200 | Success | `{ "status": "success", "data": {...} }` |
| 201 | Created | `{ "status": "success", "message": "تم الإنشاء بنجاح" }` |
| 400 | Bad Request | `{ "error": "البيانات غير مكتملة" }` |
| 403 | Forbidden | `{ "error": "ليس لديك صلاحية" }` |
| 404 | Not Found | `{ "error": "غير موجود" }` |
| 409 | Conflict | `{ "error": "البريد الإلكتروني مستخدم بالفعل" }` |
| 500 | Server Error | `{ "error": "فشل تحديث البيانات" }` |

### Authorization Errors

If you get 403 errors:
1. Check that your token is valid and not expired
2. Verify the user has the required role for the endpoint
3. Ensure the Authorization header format: `Bearer <token>`

### Partial Update Safety

The update endpoint now safely handles partial updates:
- ✅ Only sends fields are updated (dynamic SQL)
- ✅ Other fields remain unchanged
- ✅ `updated_at` timestamp automatically refreshed
- ✅ Users table synced when name/email/phone changes
- ✅ Uniqueness validated for email and phone
- ✅ Returns actual updated data via `RETURNING *`

## Running the Collection

### Option 1: Manual Execution
1. Expand the collection
2. Run requests in order (top to bottom)
3. Watch the Console for variable assignments

### Option 2: Automated Runner
1. Right-click the collection → **Run collection**
2. Configure iterations (1 is enough)
3. Click **Run**

### Expected Console Output
```
✓ Super Admin token saved
✓ HR Manager token saved
✓ General Manager token saved
✓ Department ID saved: 1
✓ Employee created - User ID: 5
✓ Employee updated successfully
✓ Lead created - ID: 3
✓ Engineer assigned - Inspection ID: 2
✓ Inspection report submitted
✓ Quotation created - ID: 1
✓ Finance approved quotation
✓ GM approved quotation - DEAL CLOSED!
✓ Total notifications: 15
```

## Troubleshooting

### Issue: 400 Bad Request on Employee Update
**Solution:** Ensure you're sending at least one valid field in the request body

### Issue: 401 Unauthorized
**Solution:** Re-run the login request for that role to get a fresh token

### Issue: 404 Not Found
**Solution:** Check that the resource ID exists (department_id, employee_id, etc.)

### Issue: Variables not being set
**Solution:** 
1. Check the Post-response scripts are enabled
2. Verify the previous request succeeded
3. Check console for errors

### Issue: Database constraint violations
**Solution:** 
1. Clean up test data between runs
2. Use unique emails/phones for each test
3. Reset sequences if needed

## Best Practices

1. **Run in Order**: Always execute requests sequentially
2. **Check Console**: Monitor variable assignments
3. **Save Responses**: Keep successful responses for reference
4. **Test Edge Cases**: Try invalid data to verify validation
5. **Monitor Logs**: Watch backend console for SQL errors

## Additional Testing Scenarios

### Scenario 1: Leave Rejection by Dept Head
```bash
PATCH /api/hr/leaves/:id/status
Authorization: Bearer {{dept_head_token}}

{
  "status": "rejected",
  "rejection_reason": "Project deadline approaching - cannot spare resources"
}
```
**Result:** Flow stops, employee notified, HR not involved

### Scenario 2: HR Final Rejection
```bash
PATCH /api/hr/leaves/:id/status
Authorization: Bearer {{hr_manager_token}}

{
  "status": "rejected",
  "rejection_reason": "Exceeds annual leave allowance"
}
```
**Result:** Leave rejected after dept head approval

### Scenario 3: Create Department with Head
```bash
POST /api/departments
Authorization: Bearer {{super_admin_token}}

{
  "name": "Sales Department",
  "description": "Sales and business development",
  "head_first_name": "Sarah",
  "head_last_name": "Ahmed",
  "head_email": "sarah@company.com",
  "head_username": "sarah_head",
  "head_password": "password123",
  "head_phone": "+966501111111"
}
```

## Support

For issues or questions:
1. Check backend logs for detailed error messages
2. Review the schema.sql for database structure
3. Consult the API documentation
4. Enable debug logging in the repository files

---

**Last Updated:** March 23, 2026  
**Collection Version:** 1.0  
**API Version:** 1.0
