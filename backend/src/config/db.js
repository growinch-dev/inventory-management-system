const dns = require('dns');
const mongoose = require('mongoose');

// Node on Windows sometimes picks up 127.0.0.1 as its DNS server (e.g. with
// Cloudflare WARP), which refuses the SRV lookups that mongodb+srv:// needs.
// Override with DNS_SERVERS="ip1,ip2" in .env when that happens.
const connectDB = async () => {
  if (process.env.DNS_SERVERS) {
    dns.setServers(process.env.DNS_SERVERS.split(',').map((s) => s.trim()));
  }

  // Keep the HTTP server alive even if the DB is down: retry instead of exiting.
  // This avoids the server dying on a transient DB/DNS problem (which showed up
  // as "ECONNREFUSED 5001" in the frontend). API calls that need the DB will
  // fail until it connects, then recover automatically.
  const connectWithRetry = async () => {
    try {
      const conn = await mongoose.connect(process.env.MONGODB_URI);
      console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
      console.error(`❌ MongoDB connection error: ${error.message}`);
      console.error('   Server is still running on its port, but the database is NOT connected.');
      console.error('   Fix MONGODB_URI / DNS_SERVERS / start MongoDB. Retrying in 5s...');
      setTimeout(connectWithRetry, 5000);
    }
  };

  await connectWithRetry();
};

module.exports = connectDB;
