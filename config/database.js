const mongoose = require("mongoose");

const connectdatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_CONNECT_URI);
    console.log("db connected");
  } catch (error) {
    console.log("db connection failed" + error.message);
  }
};
module.exports = connectdatabase;
