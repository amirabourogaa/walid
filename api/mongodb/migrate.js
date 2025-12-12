const { MongoClient } = require('mongodb');
const { createClient } = require('@supabase/supabase-js');
const connectDB = require('./connection');
const { 
  Client, 
  Profile, 
  Invoice, 
  Transaction, 
  Appointment, 
  Application, 
  Employee, 
  ClientActivityLog 
} = require('./models');

// Configuration - REMPLACEZ PAR VOS VRAIES VALEURS
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_SERVICE_KEY = 'YOUR_SUPABASE_SERVICE_KEY'; // Service role key for full access

class SupabaseToMongoMigration {
  constructor() {
    this.supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    this.migrationStats = {
      clients: 0,
      profiles: 0,
      invoices: 0,
      transactions: 0,
      appointments: 0,
      applications: 0,
      employees: 0,
      activityLogs: 0,
      errors: []
    };
  }

  async migrate() {
    try {
      console.log('🚀 Starting Supabase to MongoDB migration...');
      
      // Connect to MongoDB
      await connectDB();
      
      // Clear existing data (optional - remove if you want to keep existing data)
      console.log('🧹 Clearing existing MongoDB data...');
      await this.clearMongoDB();
      
      // Migrate data in order (respect foreign key relationships)
      await this.migrateProfiles();
      await this.migrateEmployees();
      await this.migrateClients();
      await this.migrateInvoices();
      await this.migrateTransactions();
      await this.migrateAppointments();
      await this.migrateApplications();
      await this.migrateActivityLogs();
      
      console.log('\n📊 Migration Statistics:');
      console.log(`✅ Clients: ${this.migrationStats.clients}`);
      console.log(`✅ Profiles: ${this.migrationStats.profiles}`);
      console.log(`✅ Invoices: ${this.migrationStats.invoices}`);
      console.log(`✅ Transactions: ${this.migrationStats.transactions}`);
      console.log(`✅ Appointments: ${this.migrationStats.appointments}`);
      console.log(`✅ Applications: ${this.migrationStats.applications}`);
      console.log(`✅ Employees: ${this.migrationStats.employees}`);
      console.log(`✅ Activity Logs: ${this.migrationStats.activityLogs}`);
      
      if (this.migrationStats.errors.length > 0) {
        console.log(`\n❌ Errors encountered: ${this.migrationStats.errors.length}`);
        this.migrationStats.errors.forEach(error => {
          console.log(`   - ${error}`);
        });
      }
      
      console.log('\n🎉 Migration completed successfully!');
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    } finally {
      process.exit(0);
    }
  }

  async clearMongoDB() {
    await Client.deleteMany({});
    await Profile.deleteMany({});
    await Invoice.deleteMany({});
    await Transaction.deleteMany({});
    await Appointment.deleteMany({});
    await Application.deleteMany({});
    await Employee.deleteMany({});
    await ClientActivityLog.deleteMany({});
    console.log('✅ MongoDB data cleared');
  }

  async migrateProfiles() {
    console.log('\n📥 Migrating profiles...');
    
    try {
      const { data: profiles, error } = await this.supabase
        .from('profiles')
        .select('*');
      
      if (error) throw error;
      
      if (profiles && profiles.length > 0) {
        // Convert UUID to ObjectId for _id
        const convertedProfiles = profiles.map(profile => ({
          _id: this.uuidToObjectId(profile.id),
          email: profile.email,
          first_name: profile.first_name,
          last_name: profile.last_name,
          role: profile.role,
          status: profile.status,
          phone: profile.phone,
          department: profile.department,
          createdAt: profile.created_at,
          updatedAt: profile.updated_at
        }));
        
        await Profile.insertMany(convertedProfiles);
        this.migrationStats.profiles = convertedProfiles.length;
        console.log(`✅ Migrated ${convertedProfiles.length} profiles`);
      }
    } catch (error) {
      this.migrationStats.errors.push(`Profiles migration: ${error.message}`);
      console.error('❌ Profiles migration failed:', error);
    }
  }

  async migrateEmployees() {
    console.log('\n📥 Migrating employees...');
    
    try {
      const { data: employees, error } = await this.supabase
        .from('employees')
        .select('*');
      
      if (error) throw error;
      
      if (employees && employees.length > 0) {
        const convertedEmployees = employees.map(employee => ({
          _id: this.uuidToObjectId(employee.id),
          name: employee.name,
          email: employee.email,
          workload: employee.workload || 0,
          user_id: employee.user_id ? this.uuidToObjectId(employee.user_id) : null,
          profile_synced: employee.profile_synced || false,
          createdAt: employee.created_at,
          updatedAt: employee.updated_at
        }));
        
        await Employee.insertMany(convertedEmployees);
        this.migrationStats.employees = convertedEmployees.length;
        console.log(`✅ Migrated ${convertedEmployees.length} employees`);
      }
    } catch (error) {
      this.migrationStats.errors.push(`Employees migration: ${error.message}`);
      console.error('❌ Employees migration failed:', error);
    }
  }

  async migrateClients() {
    console.log('\n📥 Migrating clients...');
    
    try {
      const { data: clients, error } = await this.supabase
        .from('clients')
        .select('*');
      
      if (error) throw error;
      
      if (clients && clients.length > 0) {
        const convertedClients = clients.map(client => ({
          _id: this.uuidToObjectId(client.id),
          full_name: client.full_name,
          whatsapp_number: client.whatsapp_number,
          passport_number: client.passport_number,
          nationality: client.nationality,
          passport_status: client.passport_status,
          visa_tracking_status: client.visa_tracking_status,
          assigned_employee: client.assigned_employee,
          assigned_employee_id: client.assigned_employee_id ? this.uuidToObjectId(client.assigned_employee_id) : null,
          service_type: client.service_type,
          destination_country: client.destination_country,
          china_visa_type: client.china_visa_type,
          visa_type: client.visa_type,
          profession: client.profession,
          tax_id: client.tax_id,
          personal_photo_url: client.personal_photo_url,
          passport_photo_url: client.passport_photo_url,
          documents_urls: client.documents_urls || [],
          amount: client.amount || 0,
          currency: client.currency || 'TND',
          entry_status: client.entry_status,
          submission_date: client.submission_date,
          embassy_receipt_date: client.embassy_receipt_date,
          submitted_by: client.submitted_by,
          summary: client.summary,
          notes: client.notes,
          qr_code_data: client.qr_code_data,
          progress: client.progress || {},
          status: client.status || 'جديد',
          invoice_status: client.invoice_status || 'غير مدفوعة',
          visa_start_date: client.visa_start_date,
          visa_end_date: client.visa_end_date,
          passport_expiry_date: client.passport_expiry_date,
          company_name: client.company_name,
          client_id_number: client.client_id_number,
          email: client.email,
          createdAt: client.created_at,
          updatedAt: client.updated_at
        }));
        
        await Client.insertMany(convertedClients);
        this.migrationStats.clients = convertedClients.length;
        console.log(`✅ Migrated ${convertedClients.length} clients`);
      }
    } catch (error) {
      this.migrationStats.errors.push(`Clients migration: ${error.message}`);
      console.error('❌ Clients migration failed:', error);
    }
  }

  async migrateInvoices() {
    console.log('\n📥 Migrating invoices...');
    
    try {
      const { data: invoices, error } = await this.supabase
        .from('invoices')
        .select('*');
      
      if (error) throw error;
      
      if (invoices && invoices.length > 0) {
        const convertedInvoices = invoices.map(invoice => ({
          _id: this.uuidToObjectId(invoice.id),
          invoice_number: invoice.invoice_number,
          client_id: invoice.client_id ? this.uuidToObjectId(invoice.client_id) : null,
          client_name: invoice.client_name,
          client_whatsapp: invoice.client_whatsapp,
          client_tax_id: invoice.client_tax_id,
          client_email: invoice.client_email,
          services: invoice.services || [],
          subtotal: invoice.subtotal || 0,
          currency: invoice.currency || 'TND',
          tva_rate: invoice.tva_rate,
          tva_amount: invoice.tva_amount,
          discount_amount: invoice.discount_amount || 0,
          timbre_fiscal: invoice.timbre_fiscal,
          retenue_source_rate: invoice.retenue_source_rate,
          retenue_source_amount: invoice.retenue_source_amount,
          total_amount: invoice.total_amount || 0,
          status: invoice.status || 'مسودة',
          issue_date: invoice.issue_date || new Date(),
          due_date: invoice.due_date,
          notes: invoice.notes,
          createdAt: invoice.created_at,
          updatedAt: invoice.updated_at
        }));
        
        await Invoice.insertMany(convertedInvoices);
        this.migrationStats.invoices = convertedInvoices.length;
        console.log(`✅ Migrated ${convertedInvoices.length} invoices`);
      }
    } catch (error) {
      this.migrationStats.errors.push(`Invoices migration: ${error.message}`);
      console.error('❌ Invoices migration failed:', error);
    }
  }

  async migrateTransactions() {
    console.log('\n📥 Migrating transactions...');
    
    try {
      const { data: transactions, error } = await this.supabase
        .from('transactions')
        .select('*');
      
      if (error) throw error;
      
      if (transactions && transactions.length > 0) {
        const convertedTransactions = transactions.map(transaction => ({
          _id: this.uuidToObjectId(transaction.id),
          type: transaction.type,
          category: transaction.category,
          description: transaction.description,
          montant: transaction.montant,
          devise: transaction.devise,
          mode_paiement: transaction.mode_paiement,
          source_type: transaction.source_type,
          source_id: transaction.source_id ? this.uuidToObjectId(transaction.source_id) : null,
          date_transaction: transaction.date_transaction || new Date(),
          created_by: transaction.created_by ? this.uuidToObjectId(transaction.created_by) : null,
          createdAt: transaction.created_at,
          updatedAt: transaction.updated_at
        }));
        
        await Transaction.insertMany(convertedTransactions);
        this.migrationStats.transactions = convertedTransactions.length;
        console.log(`✅ Migrated ${convertedTransactions.length} transactions`);
      }
    } catch (error) {
      this.migrationStats.errors.push(`Transactions migration: ${error.message}`);
      console.error('❌ Transactions migration failed:', error);
    }
  }

  async migrateAppointments() {
    console.log('\n📥 Migrating appointments...');
    
    try {
      const { data: appointments, error } = await this.supabase
        .from('appointments')
        .select('*');
      
      if (error) throw error;
      
      if (appointments && appointments.length > 0) {
        const convertedAppointments = appointments.map(appointment => ({
          _id: this.uuidToObjectId(appointment.id),
          client_id: this.uuidToObjectId(appointment.client_id),
          client_name: appointment.client_name,
          appointment_type: appointment.appointment_type,
          date: appointment.date,
          time: appointment.time,
          status: appointment.status || 'مجدولة',
          location: appointment.location,
          notes: appointment.notes,
          created_by: appointment.created_by ? this.uuidToObjectId(appointment.created_by) : null,
          createdAt: appointment.created_at,
          updatedAt: appointment.updated_at
        }));
        
        await Appointment.insertMany(convertedAppointments);
        this.migrationStats.appointments = convertedAppointments.length;
        console.log(`✅ Migrated ${convertedAppointments.length} appointments`);
      }
    } catch (error) {
      this.migrationStats.errors.push(`Appointments migration: ${error.message}`);
      console.error('❌ Appointments migration failed:', error);
    }
  }

  async migrateApplications() {
    console.log('\n📥 Migrating applications...');
    
    try {
      const { data: applications, error } = await this.supabase
        .from('applications')
        .select('*');
      
      if (error) throw error;
      
      if (applications && applications.length > 0) {
        const convertedApplications = applications.map(application => ({
          _id: this.uuidToObjectId(application.id),
          client_id: this.uuidToObjectId(application.client_id),
          client_name: application.client_name,
          visa_type: application.visa_type,
          application_number: application.application_number,
          status: application.status || 'جديد',
          submitted_date: application.submitted_date,
          expected_date: application.expected_date,
          documents_required: application.documents_required || 0,
          documents_submitted: application.documents_submitted || 0,
          embassy: application.embassy,
          progress: application.progress || 0,
          assigned_employee: application.assigned_employee,
          deadline: application.deadline,
          timeline: application.timeline || [],
          created_by: application.created_by ? this.uuidToObjectId(application.created_by) : null,
          createdAt: application.created_at,
          updatedAt: application.updated_at
        }));
        
        await Application.insertMany(convertedApplications);
        this.migrationStats.applications = convertedApplications.length;
        console.log(`✅ Migrated ${convertedApplications.length} applications`);
      }
    } catch (error) {
      this.migrationStats.errors.push(`Applications migration: ${error.message}`);
      console.error('❌ Applications migration failed:', error);
    }
  }

  async migrateActivityLogs() {
    console.log('\n📥 Migrating client activity logs...');
    
    try {
      const { data: logs, error } = await this.supabase
        .from('client_activity_log')
        .select('*');
      
      if (error) throw error;
      
      if (logs && logs.length > 0) {
        const convertedLogs = logs.map(log => ({
          _id: this.uuidToObjectId(log.id),
          client_id: this.uuidToObjectId(log.client_id),
          user_id: log.user_id ? this.uuidToObjectId(log.user_id) : null,
          action_type: log.action_type,
          action_description: log.action_description,
          old_value: log.old_value,
          new_value: log.new_value,
          field_changed: log.field_changed,
          created_at: log.created_at
        }));
        
        await ClientActivityLog.insertMany(convertedLogs);
        this.migrationStats.activityLogs = convertedLogs.length;
        console.log(`✅ Migrated ${convertedLogs.length} activity logs`);
      }
    } catch (error) {
      this.migrationStats.errors.push(`Activity logs migration: ${error.message}`);
      console.error('❌ Activity logs migration failed:', error);
    }
  }

  // Helper function to convert UUID to ObjectId (simplified approach)
  uuidToObjectId(uuid) {
    if (!uuid) return null;
    
    // Create a consistent ObjectId from UUID
    // This is a simplified approach - in production you might want to store original UUID
    const crypto = require('crypto');
    const hash = crypto.createHash('md5').update(uuid).digest('hex');
    return new mongoose.Types.ObjectId(hash.substring(0, 24));
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  const migration = new SupabaseToMongoMigration();
  migration.migrate();
}

module.exports = SupabaseToMongoMigration;