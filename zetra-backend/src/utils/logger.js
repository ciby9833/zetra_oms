const Logger = {
  info: (message, data = {}) => {
    console.log(`[${new Date().toISOString()}] INFO:`, message, data);
  },
  error: (message, error) => {
    console.error(`[${new Date().toISOString()}] ERROR:`, message, error);
    if (error?.stack) {
      console.error(error.stack);
    }
  },
  warn: (message, data = {}) => {
    console.warn(`[${new Date().toISOString()}] WARN:`, message, data);
  }
};

module.exports = Logger; 