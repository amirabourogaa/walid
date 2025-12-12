const express = require('express');
const cors = require('cors');
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

const app = express();
const PORT = process.env.MONGODB_API_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
connectDB();

// ===== CLIENTS ROUTES =====

// Get all clients
app.get('/api/clients', async (req, res) => {
  try {
    const { 
      status, 
      visa_tracking_status, 
      assigned_employee_id,
      page = 1, 
      limit = 50,
      search 
    } = req.query;
    
    const query = {};
    if (status) query.status = status;
    if (visa_tracking_status) query.visa_tracking_status = visa_tracking_status;
    if (assigned_employee_id) query.assigned_employee_id = assigned_employee_id;
    if (search) {
      query.$or = [
        { full_name: { $regex: search, $options: 'i' } },
        { passport_number: { $regex: search, $options: 'i' } },
        { client_id_number: { $regex: search, $options: 'i' } }
      ];
    }
    
    const clients = await Client.find(query)
      .populate('assigned_employee_id')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Client.countDocuments(query);
    
    res.json({
      data: clients,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single client
app.get('/api/clients/:id', async (req, res) => {
  try {
    const client = await Client.findById(req.params.id)
      .populate('assigned_employee_id');
    
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    res.json(client);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create client
app.post('/api/clients', async (req, res) => {
  try {
    const client = new Client(req.body);
    await client.save();
    
    // Log activity
    await ClientActivityLog.create({
      client_id: client._id,
      user_id: req.body.created_by,
      action_type: 'create',
      action_description: 'Client created'
    });
    
    res.status(201).json(client);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update client
app.put('/api/clients/:id', async (req, res) => {
  try {
    const oldClient = await Client.findById(req.params.id);
    if (!oldClient) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    const client = await Client.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('assigned_employee_id');
    
    // Log activity for changed fields
    const changedFields = Object.keys(req.body).filter(key => 
      JSON.stringify(req.body[key]) !== JSON.stringify(oldClient[key])
    );
    
    if (changedFields.length > 0) {
      await ClientActivityLog.create({
        client_id: client._id,
        user_id: req.body.updated_by,
        action_type: 'update',
        action_description: 'Client updated',
        old_value: changedFields.reduce((acc, field) => {
          acc[field] = oldClient[field];
          return acc;
        }, {}),
        new_value: changedFields.reduce((acc, field) => {
          acc[field] = req.body[field];
          return acc;
        }, {}),
        field_changed: changedFields.join(', ')
      });
    }
    
    res.json(client);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete client
app.delete('/api/clients/:id', async (req, res) => {
  try {
    const client = await Client.findByIdAndDelete(req.params.id);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    // Log activity
    await ClientActivityLog.create({
      client_id: req.params.id,
      user_id: req.body.deleted_by,
      action_type: 'delete',
      action_description: 'Client deleted'
    });
    
    res.json({ message: 'Client deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== INVOICES ROUTES =====

app.get('/api/invoices', async (req, res) => {
  try {
    const { page = 1, limit = 50, status, client_id } = req.query;
    const query = {};
    if (status) query.status = status;
    if (client_id) query.client_id = client_id;
    
    const invoices = await Invoice.find(query)
      .populate('client_id')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Invoice.countDocuments(query);
    
    res.json({
      data: invoices,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/invoices', async (req, res) => {
  try {
    const invoice = new Invoice(req.body);
    await invoice.save();
    res.status(201).json(invoice);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ===== TRANSACTIONS ROUTES =====

app.get('/api/transactions', async (req, res) => {
  try {
    const { page = 1, limit = 50, type, category, start_date, end_date } = req.query;
    const query = {};
    if (type) query.type = type;
    if (category) query.category = category;
    if (start_date || end_date) {
      query.date_transaction = {};
      if (start_date) query.date_transaction.$gte = new Date(start_date);
      if (end_date) query.date_transaction.$lte = new Date(end_date);
    }
    
    const transactions = await Transaction.find(query)
      .populate('created_by')
      .sort({ date_transaction: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Transaction.countDocuments(query);
    
    res.json({
      data: transactions,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/transactions', async (req, res) => {
  try {
    const transaction = new Transaction(req.body);
    await transaction.save();
    res.status(201).json(transaction);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ===== APPOINTMENTS ROUTES =====

app.get('/api/appointments', async (req, res) => {
  try {
    const { page = 1, limit = 50, status, date } = req.query;
    const query = {};
    if (status) query.status = status;
    if (date) query.date = new Date(date);
    
    const appointments = await Appointment.find(query)
      .populate('client_id')
      .populate('created_by')
      .sort({ date: 1, time: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Appointment.countDocuments(query);
    
    res.json({
      data: appointments,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/appointments', async (req, res) => {
  try {
    const appointment = new Appointment(req.body);
    await appointment.save();
    res.status(201).json(appointment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ===== APPLICATIONS ROUTES =====

app.get('/api/applications', async (req, res) => {
  try {
    const { page = 1, limit = 50, status, visa_type } = req.query;
    const query = {};
    if (status) query.status = status;
    if (visa_type) query.visa_type = visa_type;
    
    const applications = await Application.find(query)
      .populate('client_id')
      .populate('created_by')
      .sort({ submitted_date: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Application.countDocuments(query);
    
    res.json({
      data: applications,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/applications', async (req, res) => {
  try {
    const application = new Application(req.body);
    await application.save();
    res.status(201).json(application);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ===== EMPLOYEES ROUTES =====

app.get('/api/employees', async (req, res) => {
  try {
    const employees = await Employee.find()
      .populate('user_id')
      .sort({ name: 1 });
    
    res.json(employees);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== ACTIVITY LOGS ROUTES =====

app.get('/api/client-activity-logs/:clientId', async (req, res) => {
  try {
    const logs = await ClientActivityLog.find({ client_id: req.params.clientId })
      .populate('user_id')
      .sort({ created_at: -1 })
      .limit(100);
    
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== STATISTICS ROUTES =====

app.get('/api/statistics', async (req, res) => {
  try {
    const [
      totalClients,
      activeClients,
      pendingApplications,
      totalInvoices,
      totalRevenue,
      recentTransactions
    ] = await Promise.all([
      Client.countDocuments(),
      Client.countDocuments({ status: 'قيد المعالجة' }),
      Application.countDocuments({ status: 'جديد' }),
      Invoice.countDocuments(),
      Invoice.aggregate([
        { $group: { _id: null, total: { $sum: '$total_amount' } } }
      ]),
      Transaction.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('created_by')
    ]);
    
    res.json({
      totalClients,
      activeClients,
      pendingApplications,
      totalInvoices,
      totalRevenue: totalRevenue[0]?.total || 0,
      recentTransactions
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== HEALTH CHECK =====

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', service: 'Legal Glide MongoDB API' });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error(error.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: error.message 
  });
});

app.listen(PORT, () => {
  console.log(`🚀 MongoDB API server running on port ${PORT}`);
  console.log(`📡 API endpoints available at http://localhost:${PORT}/api`);
});

module.exports = app;