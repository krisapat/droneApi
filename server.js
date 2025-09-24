// server.js
const express = require('express');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Environment variables
const DRONE_CONFIG_URL = process.env.DRONE_CONFIG_URL;
const LOG_URL = process.env.LOG_URL;
const LOG_API_TOKEN = process.env.LOG_API_TOKEN;

// Helper function to get drone config from Server1
async function getDroneConfig(droneId) {
  try {
    console.log(`Fetching config for drone ID: ${droneId}`);
    console.log(`Using URL: ${DRONE_CONFIG_URL}`);
    
    const response = await fetch(DRONE_CONFIG_URL, {
      method: 'GET',
      headers: {
        'User-Agent': 'DroneAPI/1.0',
        'Accept': 'application/json'
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    // Get the raw text first
    const rawText = await response.text();
    console.log('Raw response (first 500 chars):', rawText.substring(0, 500));
    
    let data;
    try {
      // Try to parse as JSON
      data = JSON.parse(rawText);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      // If it fails, maybe it's already parsed or has different format
      throw new Error('Invalid JSON response from drone config server');
    }
    
    console.log('Parsed data type:', typeof data);
    console.log('Is array?', Array.isArray(data));
    
    let configs = data;
    
    // Handle different response formats
    if (typeof configs === 'object' && !Array.isArray(configs)) {
      // Check if it's wrapped in another object
      if (configs.data && Array.isArray(configs.data)) {
        configs = configs.data;
        console.log('Found data array in response object');
      } else if (configs.items && Array.isArray(configs.items)) {
        configs = configs.items;
        console.log('Found items array in response object');
      } else if (configs.results && Array.isArray(configs.results)) {
        configs = configs.results;
        console.log('Found results array in response object');
      } else {
        // If it's an object but not an array, maybe it's a single config?
        configs = [configs];
        console.log('Converted single object to array');
      }
    }
    
    // Ensure configs is an array
    if (!Array.isArray(configs)) {
      console.error('Expected array but got:', typeof configs);
      console.error('Data structure:', Object.keys(configs || {}));
      throw new Error('Invalid response format from drone config server');
    }
    
    console.log(`Total configs found: ${configs.length}`);
    
    // Log sample of first config to understand structure
    if (configs.length > 0) {
      console.log('First config structure:', Object.keys(configs[0]));
      console.log('First config sample:', configs[0]);
    }
    
    // Find config for specific drone ID
    const droneConfig = configs.find(config => {
      // Handle different possible field names
      const configId = parseInt(config.drone_id || config.droneId || config.id);
      const searchId = parseInt(droneId);
      console.log(`Comparing: ${configId} === ${searchId}`);
      return configId === searchId;
    });
    
    console.log('Found config:', droneConfig);
    return droneConfig;
  } catch (error) {
    console.error('Error fetching drone config:', error.message);
    console.error('Full error:', error);
    throw error;
  }
}

// Helper function to get drone logs from Server2
async function getDroneLogs(droneId, limit = 12) {
  try {
    const url = new URL(LOG_URL);
    url.searchParams.append('filter', `drone_id=${droneId}`);
    url.searchParams.append('sort', '-created');
    url.searchParams.append('perPage', limit);
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${LOG_API_TOKEN}`,
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('Error fetching drone logs:', error.message);
    throw error;
  }
}

// Helper function to create drone log in Server2
async function createDroneLog(logData) {
  try {
    const response = await fetch(LOG_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOG_API_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(logData)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating drone log:', error.message);
    throw error;
  }
}

// Routes

// GET /configs/{droneId}
app.get('/configs/:droneId', async (req, res) => {
  try {
    const droneId = req.params.droneId;
    console.log(`\n=== GET /configs/${droneId} ===`);
    
    // Validate droneId is a number
    if (!/^\d+$/.test(droneId)) {
      return res.status(400).json({ 
        error: 'Invalid drone ID',
        message: 'Drone ID must be a number'
      });
    }
    
    const config = await getDroneConfig(droneId);
    
    if (!config) {
      return res.status(404).json({ 
        error: 'Drone not found',
        message: `No configuration found for drone ID: ${droneId}` 
      });
    }
    
    // Return only specified fields
    const response = {
      drone_id: parseInt(config.drone_id),
      drone_name: config.drone_name,
      light: config.light,
      country: config.country,
      weight: config.weight || config.weigh // handle both "weight" and "weigh"
    };
    
    console.log('Sending response:', response);
    res.json(response);
  } catch (error) {
    console.error('Error in /configs/:droneId:', error);
    
    // More detailed error response
    let errorMessage = 'Failed to fetch drone configuration';
    let errorDetails = error.message;
    
    if (error.message.includes('fetch')) {
      errorMessage = 'Unable to connect to drone config server';
      errorDetails = 'Network connection failed';
    } else if (error.message.includes('timeout')) {
      errorMessage = 'Request timeout';
      errorDetails = 'Server took too long to respond';
    }
    
    res.status(500).json({ 
      error: 'Internal server error',
      message: errorMessage,
      details: errorDetails
    });
  }
});

// GET /status/{droneId}
app.get('/status/:droneId', async (req, res) => {
  try {
    const droneId = req.params.droneId;
    console.log(`\n=== GET /status/${droneId} ===`);
    
    // Validate droneId is a number
    if (!/^\d+$/.test(droneId)) {
      return res.status(400).json({ 
        error: 'Invalid drone ID',
        message: 'Drone ID must be a number'
      });
    }
    
    const config = await getDroneConfig(droneId);
    
    if (!config) {
      return res.status(404).json({ 
        error: 'Drone not found',
        message: `No configuration found for drone ID: ${droneId}` 
      });
    }
    
    // Return only condition field
    const response = {
      condition: config.condition || 'unknown' // provide default if missing
    };
    
    console.log('Sending response:', response);
    res.json(response);
  } catch (error) {
    console.error('Error in /status/:droneId:', error);
    
    let errorMessage = 'Failed to fetch drone status';
    let errorDetails = error.message;
    
    if (error.message.includes('fetch')) {
      errorMessage = 'Unable to connect to drone config server';
      errorDetails = 'Network connection failed';
    } else if (error.message.includes('timeout')) {
      errorMessage = 'Request timeout';
      errorDetails = 'Server took too long to respond';
    }
    
    res.status(500).json({ 
      error: 'Internal server error',
      message: errorMessage,
      details: errorDetails
    });
  }
});

// GET /logs/{droneId}
app.get('/logs/:droneId', async (req, res) => {
  try {
    const droneId = req.params.droneId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    
    // For pagination (bonus feature)
    const offset = (page - 1) * limit;
    
    const logs = await getDroneLogs(droneId, limit);
    
    // Filter and format the response
    const formattedLogs = logs.map(log => ({
      drone_id: log.drone_id,
      drone_name: log.drone_name,
      created: log.created,
      country: log.country,
      celsius: log.celsius
    }));
    
    // If pagination is requested, add pagination info
    if (req.query.page) {
      const totalUrl = new URL(LOG_URL);
      totalUrl.searchParams.append('filter', `drone_id=${droneId}`);
      totalUrl.searchParams.append('perPage', '1');
      
      const totalResponse = await fetch(totalUrl.toString(), {
        headers: {
          'Authorization': `Bearer ${LOG_API_TOKEN}`,
          'Accept': 'application/json'
        }
      });
      
      if (!totalResponse.ok) {
        throw new Error(`HTTP error! status: ${totalResponse.status}`);
      }
      
      const totalData = await totalResponse.json();
      const totalItems = totalData.totalItems || 0;
      const totalPages = Math.ceil(totalItems / limit);
      
      res.json({
        data: formattedLogs,
        pagination: {
          page: page,
          limit: limit,
          totalItems: totalItems,
          totalPages: totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      });
    } else {
      res.json(formattedLogs);
    }
  } catch (error) {
    console.error('Error in /logs/:droneId:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch drone logs'
    });
  }
});

// POST /logs
app.post('/logs', async (req, res) => {
  try {
    const { drone_id, drone_name, country, celsius } = req.body;
    
    // Validate required fields
    if (!drone_id || !drone_name || !country || celsius === undefined) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'drone_id, drone_name, country, and celsius are required'
      });
    }
    
    // Validate celsius is a number
    if (typeof celsius !== 'number' && isNaN(parseFloat(celsius))) {
      return res.status(400).json({
        error: 'Invalid celsius value',
        message: 'celsius must be a valid number'
      });
    }
    
    // Prepare log data
    const logData = {
      drone_id: parseInt(drone_id),
      drone_name: drone_name,
      country: country,
      celsius: parseFloat(celsius)
    };
    
    // Create log in Server2
    const createdLog = await createDroneLog(logData);
    
    res.status(201).json({
      success: true,
      message: 'Log created successfully',
      data: {
        drone_id: createdLog.drone_id,
        drone_name: createdLog.drone_name,
        country: createdLog.country,
        celsius: createdLog.celsius,
        created: createdLog.created
      }
    });
  } catch (error) {
    console.error('Error in POST /logs:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to create drone log'
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Debug endpoint to check external API connectivity
app.get('/debug/config-server', async (req, res) => {
  try {
    console.log('\n=== DEBUG: Testing Config Server ===');
    const response = await fetch(DRONE_CONFIG_URL, {
      method: 'GET',
      headers: {
        'User-Agent': 'DroneAPI/1.0',
        'Accept': 'application/json'
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    // Get raw response first
    const rawText = await response.text();
    
    let data;
    try {
      data = JSON.parse(rawText);
    } catch (parseError) {
      return res.json({
        success: false,
        error: 'JSON Parse Error',
        rawResponse: rawText.substring(0, 1000)
      });
    }
    
    // Try to extract drone IDs for debugging
    let droneIds = [];
    let configs = data;
    
    if (typeof configs === 'object' && !Array.isArray(configs)) {
      if (configs.data && Array.isArray(configs.data)) {
        configs = configs.data;
      } else if (configs.items && Array.isArray(configs.items)) {
        configs = configs.items;
      } else if (configs.results && Array.isArray(configs.results)) {
        configs = configs.results;
      }
    }
    
    if (Array.isArray(configs)) {
      droneIds = configs.map(config => ({
        drone_id: config.drone_id || config.droneId || config.id,
        drone_name: config.drone_name || config.droneName || config.name
      })).filter(item => item.drone_id);
    }
    
    res.json({
      success: true,
      status: response.status,
      statusText: response.statusText,
      rawResponseLength: rawText.length,
      dataType: typeof data,
      isArray: Array.isArray(data),
      dataLength: Array.isArray(configs) ? configs.length : 'N/A',
      availableDroneIds: droneIds,
      sampleData: JSON.stringify(data).substring(0, 500),
      firstItem: Array.isArray(configs) && configs.length > 0 ? configs[0] : null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      config: {
        url: DRONE_CONFIG_URL
      }
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'Something went wrong'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Drone API Server is running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  
  // Log environment variables (without sensitive data)
  console.log('📋 Configuration:');
  console.log(`   - DRONE_CONFIG_URL: ${DRONE_CONFIG_URL ? '✅ Set' : '❌ Not set'}`);
  console.log(`   - LOG_URL: ${LOG_URL ? '✅ Set' : '❌ Not set'}`);
  console.log(`   - LOG_API_TOKEN: ${LOG_API_TOKEN ? '✅ Set' : '❌ Not set'}`);
});