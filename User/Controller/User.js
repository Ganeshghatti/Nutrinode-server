const userModel = require("../../Model/User");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const express = require("express");
const bcrypt = require("bcrypt");
const validator = require("validator");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const axios = require("axios");
const moment = require("moment");
const FormData = require("form-data");
const { sendErrorEmail } = require("../utils/Errormail");
const { v4: uuidv4 } = require("uuid");
const { createCanvas, loadImage } = require('canvas');

const app = express();
app.use(cors());
app.use(bodyParser.json());

exports.register = async (req, res, next) => {
  const userdata = req.body;

  try {
    if (!validator.isEmail(userdata.email)) {
      return res.status(400).json({ error: "Invalid email address" });
    }
    if (!validator.isStrongPassword(userdata.password)) {
      return res.status(400).json({
        error:
          "Weak password. Must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character.",
      });
    }

    const existingUser = await userModel.findOne({ email: userdata.email });

    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(userdata.password, salt);

    const user = new userModel({
      username: userdata.username,
      email: userdata.email,
      password: hash,
      createdAt: moment().format("MMMM Do YYYY, h:mm:ss a"),
    });

    const newUser = await user.save();

    const token = jwt.sign({ userId: newUser._id }, process.env.JWTSECRET);

    res.status(200).json({
      email: newUser.email,
      username: newUser.username,
      token: token,
    });
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).send({ error: "Failed to register user" });
  }
};

exports.login = async (req, res, next) => {
  const userdata = req.body;

  try {
    if (!validator.isEmail(userdata.email)) {
      return res.status(400).send("Enter a valid email");
    }
    const existingUser = await userModel.findOne({ email: userdata.email });
    if (!existingUser) {
      return res.status(400).json({ error: "Wrong email or password" });
    }
    const match = await bcrypt.compare(
      userdata.password,
      existingUser.password
    );
    if (!match) {
      return res.status(400).json({ error: "Wrong email or password" });
    }

    const jwttoken = jwt.sign(
      { userId: existingUser._id },
      process.env.JWTSECRET
    );

    res.status(200).json({
      email: existingUser.email,
      username: existingUser.username,
      token: jwttoken,
    });
  } catch (error) {
    console.log(error);
    sendErrorEmail(
      userdata.name,
      userdata.email,
      "User tried to login. Internal server error"
    );
    res.status(500).json({ error: "Oops! Please try again later" });
  }
};

exports.MyAccount = async (req, res, next) => {
  try {
    const user = await userModel.findOne({ email: req.user.email });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({ user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.EditAccount = async (req, res, next) => {
  const { email, phone, address, username } = req.body;
  try {
    const user = await userModel.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    user.phone = phone;
    user.address = address;
    user.username = username;
    const userupdated = await user.save();

    res.status(200).json({ user: userupdated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.ForgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await userModel.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const resetToken = uuidv4();
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000;
    await user.save();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "ghattiganesh8@gmail.com",
        pass: "gecy jkfr fzmy dcwf",
      },
    });
    const mailOptions = {
      from: "ghattiganesh8@gmail.com",
      to: user.email,
      subject: "Password Reset",
      html:
        `<p>You are receiving this email because you (or someone else) has requested the reset of the password for your account.</p>` +
        `<p>Please click on the following link, or paste this into your browser to complete the process:</p>` +
        `<a href="http://localhost:5173/reset/${resetToken}">Click Here</a>` +
        `<p>If you did not request this, please ignore this email and your password will remain unchanged.</p>`,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: "Password reset email sent" });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.ResetPassword = async (req, res, next) => {
  try {
    const { resetPasswordToken } = req.params;
    const { email, password } = req.body;

    if (!validator.isStrongPassword(password)) {
      return res.status(400).json({
        error:
          "Weak password. Must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character.",
      });
    }

    const user = await userModel.findOne({
      email: email,
      resetPasswordToken,
      resetPasswordExpires: { $gt: Date.now() },
    });
    if (!user) {
      return res.status(400).json({ error: "Invalid or expired " });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    user.password = hash;
    user.resetPasswordToken = "";
    user.resetPasswordExpires = "";

    await user.save();
    res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

exports.AddToDiet = async (req, res, next) => {
  const { email, item } = req.body;
  try {
    const user = await userModel.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    if (user.diet.date === moment().format("L")) {
      user.diet.items.push(item);
    } else {
      user.diet.date = moment().format("L");
      user.diet.items.push(item);
    }
    await user.save();
    res.status(200).json({ user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.GetDiet = async (req, res, next) => {
  try {
    console.log(req.user);
    const user = await userModel.findOne({ email: req.user.email });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(200).json({ diet: user.diet });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.Chat = async (req, res, next) => {
  const { email, msg } = req.body;
  console.log(process.env.API_KEY, msg);
  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4-turbo",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: msg,
              },
            ],
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    res.status(200).json({ msg: response.data.choices[0].message.content });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.DetectFood = async (req, res, next) => {
  try {
    const { email, link } = req.body;

    // Validate incoming request data
    if (!email || !link) {
      return res.status(400).json({ error: "Missing required data" });
    }
    const image = await loadImage(link);
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);

    // Convert the canvas to a data URL with JPEG format
    const dataUrl = canvas.toDataURL('image/jpeg');

    // Log the converted URL
    console.log(dataUrl);

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4-turbo",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Identify the object in this image.---If Given object is food then write 2-3 words for 1):name: and 2):description: of image. Then estimate the number of grams 3):protien: 4):fats: 5):carbs: 6):calories: in that food.protien,fats,carbs and calories should strictly in number. If given object isn't food item then return :name:=not a food item and end. All the responses should be strictly in JSON format and the variable names should exactly match with params inside :: quotes. Output should be strictly in parsable JSON Format ONLY without unwanted symbols and back ticks(your output should be in such a way that when applied JSON.parse() to your string output it should return JSON)",
              },
              {
                type: "image_url",
                image_url: {
                  url: dataUrl,
                },
              },
            ],
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log(response.data.choices[0].message.content)

    const items = JSON.parse(response.data.choices[0].message.content);
    console.log(items)




    const { description, name, calories, fat, protein, carbs } =
      response.data.choices[0].message.content;

    res.status(200).json({
      items: {
        description: items.description || "Object couldn't be detected accurately",
        name: items.name || "Unidentified object",
        calories: items.calories || "0",
        fat: items.fat || "0",
        protein: items.protein || "0",
        carbs: items.carbs || "0",
      },
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
