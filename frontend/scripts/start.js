const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
process.env.PORT = process.env.FRONTEND_PORT || '3000';
require('../node_modules/react-scripts/scripts/start');