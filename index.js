//Library Imports
const express = require('express');
const cors = require('cors');


// Local Imports


//Routes Imports
const doctorRoutes = require('./Routes/doctor/doctor.route');



app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Middleware to parse JSON bodies
app.use('/api/v1', doctorRoutes); // Use doctor routes under /api endpoint



app.listen(3434, () => {
    console.log("Server started...");
});