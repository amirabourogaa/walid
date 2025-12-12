import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_MONGODB_API_URL || 'http://localhost:3001/api';

class MongoDBService {
  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.api.interceptors.request.use(
      (config) => {
        // Add auth token if available
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Handle unauthorized access
          localStorage.removeItem('auth_token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // ===== CLIENTS =====

  async getClients(filters = {}) {
    try {
      const response = await this.api.get('/clients', { params: filters });
      return response.data;
    } catch (error) {
      console.error('Error fetching clients:', error);
      throw error;
    }
  }

  async getClient(id) {
    try {
      const response = await this.api.get(`/clients/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching client:', error);
      throw error;
    }
  }

  async createClient(clientData) {
    try {
      const response = await this.api.post('/clients', clientData);
      return response.data;
    } catch (error) {
      console.error('Error creating client:', error);
      throw error;
    }
  }

  async updateClient(id, clientData) {
    try {
      const response = await this.api.put(`/clients/${id}`, clientData);
      return response.data;
    } catch (error) {
      console.error('Error updating client:', error);
      throw error;
    }
  }

  async deleteClient(id) {
    try {
      const response = await this.api.delete(`/clients/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting client:', error);
      throw error;
    }
  }

  // ===== INVOICES =====

  async getInvoices(filters = {}) {
    try {
      const response = await this.api.get('/invoices', { params: filters });
      return response.data;
    } catch (error) {
      console.error('Error fetching invoices:', error);
      throw error;
    }
  }

  async createInvoice(invoiceData) {
    try {
      const response = await this.api.post('/invoices', invoiceData);
      return response.data;
    } catch (error) {
      console.error('Error creating invoice:', error);
      throw error;
    }
  }

  // ===== TRANSACTIONS =====

  async getTransactions(filters = {}) {
    try {
      const response = await this.api.get('/transactions', { params: filters });
      return response.data;
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw error;
    }
  }

  async createTransaction(transactionData) {
    try {
      const response = await this.api.post('/transactions', transactionData);
      return response.data;
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw error;
    }
  }

  // ===== APPOINTMENTS =====

  async getAppointments(filters = {}) {
    try {
      const response = await this.api.get('/appointments', { params: filters });
      return response.data;
    } catch (error) {
      console.error('Error fetching appointments:', error);
      throw error;
    }
  }

  async createAppointment(appointmentData) {
    try {
      const response = await this.api.post('/appointments', appointmentData);
      return response.data;
    } catch (error) {
      console.error('Error creating appointment:', error);
      throw error;
    }
  }

  // ===== APPLICATIONS =====

  async getApplications(filters = {}) {
    try {
      const response = await this.api.get('/applications', { params: filters });
      return response.data;
    } catch (error) {
      console.error('Error fetching applications:', error);
      throw error;
    }
  }

  async createApplication(applicationData) {
    try {
      const response = await this.api.post('/applications', applicationData);
      return response.data;
    } catch (error) {
      console.error('Error creating application:', error);
      throw error;
    }
  }

  // ===== EMPLOYEES =====

  async getEmployees() {
    try {
      const response = await this.api.get('/employees');
      return response.data;
    } catch (error) {
      console.error('Error fetching employees:', error);
      throw error;
    }
  }

  // ===== ACTIVITY LOGS =====

  async getClientActivityLogs(clientId) {
    try {
      const response = await this.api.get(`/client-activity-logs/${clientId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      throw error;
    }
  }

  // ===== STATISTICS =====

  async getStatistics() {
    try {
      const response = await this.api.get('/statistics');
      return response.data;
    } catch (error) {
      console.error('Error fetching statistics:', error);
      throw error;
    }
  }

  // ===== AUTHENTICATION (Simplified) =====

  async signIn(email, password) {
    // This is a simplified version - you'll need to implement proper auth
    try {
      // For now, we'll simulate auth by checking if user exists
      const users = await this.getEmployees();
      const user = users.find(u => u.email === email);
      
      if (user) {
        // Simulate token generation
        const token = btoa(JSON.stringify({ email, id: user._id, role: user.role }));
        localStorage.setItem('auth_token', token);
        return { user, token };
      } else {
        throw new Error('Invalid credentials');
      }
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  }

  async signOut() {
    localStorage.removeItem('auth_token');
  }

  async getCurrentUser() {
    const token = localStorage.getItem('auth_token');
    if (!token) return null;
    
    try {
      const payload = JSON.parse(atob(token));
      return payload;
    } catch (error) {
      console.error('Error parsing token:', error);
      return null;
    }
  }

  // ===== REAL-TIME SUBSCRIPTIONS (Simulated) =====

  subscribe(table, callback) {
    // This is a simplified version - for real-time you'd need WebSocket or SSE
    console.log(`Simulated subscription to ${table}`);
    
    // Return unsubscribe function
    return () => {
      console.log(`Unsubscribed from ${table}`);
    };
  }

  // ===== FILE UPLOAD (Simplified) =====

  async uploadFile(file, bucket, path) {
    // This is a placeholder - implement actual file upload logic
    // You might want to use multer, cloudinary, or local file storage
    console.log(`Simulated file upload to ${bucket}/${path}`);
    return { 
      data: { 
        path: `${bucket}/${path}/${file.name}`,
        url: `/uploads/${bucket}/${path}/${file.name}`
      } 
    };
  }
}

// Create and export singleton instance
const mongoDBService = new MongoDBService();

export default mongoDBService;

// Export for use in components
export const supabase = {
  from: (table) => ({
    select: () => ({
      eq: (field, value) => mongoDBService.selectWithFilter(table, field, value),
      order: (field, options) => mongoDBService.selectOrdered(table, field, options),
      limit: (count) => mongoDBService.selectLimited(table, count),
      single: () => mongoDBService.selectSingle(table)
    }),
    insert: (data) => mongoDBService.insert(table, data),
    update: (data) => mongoDBService.update(table, data),
    delete: () => mongoDBService.delete(table),
    upsert: (data) => mongoDBService.upsert(table, data)
  }),
  auth: {
    signIn: (credentials) => mongoDBService.signIn(credentials.email, credentials.password),
    signOut: () => mongoDBService.signOut(),
    getUser: () => mongoDBService.getCurrentUser()
  },
  storage: {
    from: (bucket) => ({
      upload: (path, file) => mongoDBService.uploadFile(file, bucket, path)
    })
  }
};