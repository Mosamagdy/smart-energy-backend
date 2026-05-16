const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const bcrypt    = require('bcryptjs');
const { query } = require('../src/db/index');

async function seed() {
  console.log('🌱 Starting seed...');

  // ─── 1. Roles ──────────────────────────────────────────────────────────────
  const roles = [
    { name: 'super_admin',     description: 'مسؤول النظام — صلاحيات تقنية كاملة' },
    { name: 'general_manager', description: 'المدير العام — صلاحيات إدارية كاملة' },
    { name: 'dept_head',       description: 'مدير الإدارة — صلاحيات خاصة بقسمه فقط' },
  ];

  for (const role of roles) {
    await query(
      `INSERT INTO roles (name, description)
       VALUES ($1, $2)
       ON CONFLICT (name) DO NOTHING`,
      [role.name, role.description]
    );
  }
  console.log('✅ Roles seeded');

  // ─── 2. Permissions ────────────────────────────────────────────────────────
  const permissions = [
    'system:manage',
    'departments:create', 'departments:read', 'departments:update', 'departments:delete',
    'users:create', 'users:read', 'users:update', 'users:delete',
    'leads:create', 'leads:read', 'leads:update', 'leads:delete',
    'inspections:create', 'inspections:read', 'inspections:update',
    'quotations:create', 'quotations:read', 'quotations:update', 'quotations:approve',
    'projects:create', 'projects:read', 'projects:manage',
    'finance:read', 'finance:manage',
    'reports:read',
    'department:read', 'department:manage',
  ];

  for (const name of permissions) {
    await query(
      `INSERT INTO permissions (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
      [name]
    );
  }
  console.log('✅ Permissions seeded');

  // ─── 3. Role → Permissions ─────────────────────────────────────────────────
  const { rows: allPerms }           = await query(`SELECT id FROM permissions`);
  const { rows: [superAdminRole] }   = await query(`SELECT id FROM roles WHERE name = 'super_admin'`);
  const { rows: [gmRole] }           = await query(`SELECT id FROM roles WHERE name = 'general_manager'`);
  const { rows: [deptHeadRole] }     = await query(`SELECT id FROM roles WHERE name = 'dept_head'`);

  // super_admin → all permissions
  for (const perm of allPerms) {
    await query(
      `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [superAdminRole.id, perm.id]
    );
  }
  console.log('✅ super_admin permissions assigned');

  // general_manager → all except system:manage
  const { rows: gmPerms } = await query(
    `SELECT id FROM permissions WHERE name != 'system:manage'`
  );
  for (const perm of gmPerms) {
    await query(
      `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [gmRole.id, perm.id]
    );
  }
  console.log('✅ general_manager permissions assigned');

  // dept_head → department-specific only
  const deptHeadPermNames = ['department:read', 'department:manage', 'reports:read'];
  for (const permName of deptHeadPermNames) {
    const { rows: [perm] } = await query(
      `SELECT id FROM permissions WHERE name = $1`, [permName]
    );
    if (perm) {
      await query(
        `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [deptHeadRole.id, perm.id]
      );
    }
  }
  console.log('✅ dept_head permissions assigned');

  // ─── 4. Super Admin user ───────────────────────────────────────────────────
  const superAdminEmail    = process.env.SUPER_ADMIN_EMAIL ;
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD ;
  const superAdminHash     = await bcrypt.hash(superAdminPassword, 12);

  await query(
    `INSERT INTO users (first_name, last_name, email, username, password_hash, phone, role_id, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
     ON CONFLICT (email) DO NOTHING`,
    ['Super', 'Admin', superAdminEmail, 'superadmin', superAdminHash, '+201000000000', superAdminRole.id]
  );
  console.log('✅ Super Admin seeded');
  console.log('   Email    :', superAdminEmail);
  console.log('   Password :', superAdminPassword);

  console.log('\n🎉 Seed completed successfully!');
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
