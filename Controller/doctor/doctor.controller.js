const Doctor = require('../../Modals/doctor/doctor');



// Function to get all doctors
//TODO: Implement pagination and filtering, sorting, Searching
//Can Retrive y using locations also
const getAllDoctors = async (req, res) => {
    try {
        const doctors = await Doctor.find();
        res.status(200).json(doctors);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching doctors', error });
    }
};

// Function to add a new doctor
//TODO: Implement Login And Register using JWT Authentication
const addDoctor = async (req, res) => {
    const { name, specialty, yearsOfExperience } = req.body;
    try {
        const newDoctor = new Doctor({ name, specialty, yearsOfExperience });
        await newDoctor.save();
        res.status(201).json(newDoctor);
    } catch (error) {
        res.status(500).json({ message: 'Error adding doctor', error });
    }
};

// Function to update a doctor's information
//TODO: If there is a profile photo update then remove previous photo from the server
//And Then Add the new photo url to the schema key profile
const updateDoctor = async (req, res) => {
    const { id } = req.params;
    const { name, specialty, yearsOfExperience } = req.body;
    try {
        const updatedDoctor = await Doctor.findByIdAndUpdate(id, { name, specialty, yearsOfExperience }, { new: true });
        if (!updatedDoctor) {
            return res.status(404).json({ message: 'Doctor not found' });
        }
        res.status(200).json(updatedDoctor);
    } catch (error) {
        res.status(500).json({ message: 'Error updating doctor', error });
    }
};


// Function to delete a doctor
//TODO: If there is a profile photo then remove the photo from the server
//Sent a Delete request to the Admin to delete the doctor from the database
//If the Admin approves then delete the doctor from the database
const deleteDoctor = async (req, res) => {
    const { id } = req.params;
    try {
        const deletedDoctor = await Doctor.findByIdAndDelete(id);
        if (!deletedDoctor) {
            return res.status(404).json({ message: 'Doctor not found' });
        }
        res.status(200).json({ message: 'Doctor deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting doctor', error });
    }
};


//TODO: Implement file upload functionality
const uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        // Assuming the file is uploaded successfully
        res.status(200).json({ message: 'File uploaded successfully', file: req.file });
    } catch (error) {
        res.status(500).json({ message: 'Error uploading file', error });
    }
};