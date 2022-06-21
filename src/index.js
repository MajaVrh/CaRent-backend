import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import User from "../models/User";
import Car from "../models/Car";
import dotenv from "dotenv";
import * as EmailValidator from "email-validator";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
dotenv.config({ path: __dirname + "/../.env" });
import nodemailer from "nodemailer";

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
  })
  .then(() => console.log("Connected"))
  .catch((error) => console.log(error));

const app = express();
app.use(cors());
app.use(express.json({ extended: false }));
const port = 8000;

const verify = (req, res, next) => {
  try {
    let authorization = req.headers.authorization.split(" ");
    let token = authorization[0];
    console.log(" TU SMO ", token);

    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (e) {
    return res.status(400).json({ msg: "Unauthorised" });
  }
};

app.post("/user/register", async (req, res) => {
  const { name, surname, password, email, age } = req.body;

  if (!name || !surname || !password || !email || !age) {
    return res.status(400).json({ msg: "All fields are required" });
  }

  if (!EmailValidator.validate(email)) {
    return res.status(400).json({ msg: "Invalidate email" });
  }
  if (password.length < 7) {
    return res.status(400).json({ msg: "Password is too short" });
  }
  if (age < 18) {
    return res.status(400).json({ msg: "User is too young" });
  }

  try {
    let userFound = await User.findOne({ email });
    if (userFound) {
      return res.status(400).json({ msg: "Email exist" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    userFound = new User({
      name,
      surname,
      password: hashedPassword,
      email,
      age,
    });
    await userFound.save();

    userFound = userFound.toJSON();
    delete userFound.password;

    let token = jwt.sign(
      userFound,
      process.env.JWT_SECRET,
      { expiresIn: "1 day" },
      (error, token) => {
        if (error) throw error;
        console.log(token);
        res.json({ token });
      }
    );
    console.log(token);
  } catch (error) {
    res.status(500).json({ msg: "Server Error" });
  }
});

app.get("/auth", [verify], async (req, res) => {
  console.log("JEL HVATA USERA?? ", req.user);

  try {
    const user = await User.findById(req.user._id).select("-password");
    res.json(user);
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Server Error");
  }
});

app.post("/user/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    let user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ msg: "User doesn't exist" });
    }

    let passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(400).json({ msg: "Invalid credentials." });
    }
    user = user.toJSON();
    delete user.password;

    let token = jwt.sign(
      user,
      process.env.JWT_SECRET,
      { expiresIn: "1 day" },
      (error, token) => {
        if (error) throw error;
        console.log(token);
        res.json({ token });
      }
    );
  } catch (error) {
    console.log(error);
    res.status(500).json({ msg: "Server Error" });
  }
});

app.post("/user/update", [verify], async (req, res) => {
  console.log(req.user);
  const { newName, newSurname, newAdress, newPostalCode, newCity, newCountry } =
    req.body;

  try {
    let user = await User.findOne({ email: req.user.email });
    if (newName) user.name = newName;
    if (newSurname) user.surname = newSurname;
    if (newAdress) user.adress = newAdress;
    if (newPostalCode) user.postalCode = newPostalCode;
    if (newCity) user.city = newCity;
    if (newCountry) user.country = newCountry;
    await user.save();
    res.send(user);
  } catch (error) {
    console.log(error);
    res.status(500).json({ msg: "Server Error" });
  }
});

app.delete("/user/delete", [verify], async (req, res) => {
  await User.deleteOne({ email: req.user.email });
  res.status(200).send();
});

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "carent.help@gmail.com",
    pass: process.env.EMAIL_PASSWORD,
  },
});

app.post("/contact", (req, res) => {
  const { from, subject, text } = req.body;

  const combined_text = "<b> Email: </b>" + from + "<br>" + text;

  console.log(from);
  const mailOptions = {
    from: from,
    to: "carent.help@gmail.com",
    subject: subject,
    html: combined_text,
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
      res.status(500).json({ msg: "Server Error" });
    } else {
      console.log("Email sent: " + info.response);
      res.status(200).send();
    }
  });
});

app.post("/car/add", async (req, res) => {
  const {
    make,
    name,
    bodyType,
    places,
    power,
    doors,
    luggageCapacity,
    airConditioning,
    fuel,
    imageURL,
  } = req.body;
  if (
    !make ||
    !name ||
    !bodyType ||
    !places ||
    !power ||
    !doors ||
    !luggageCapacity ||
    !airConditioning ||
    !fuel ||
    !imageURL
  ) {
    return res.status(400).json({ msg: "All fields are required" });
  }

  try {
    let newCar = new Car({
      make,
      name,
      bodyType,
      places,
      power,
      doors,
      luggageCapacity,
      airConditioning,
      fuel,
      imageURL,
    });
    await newCar.save();
    console.log(newCar);
    if (newCar) {
      return res.status(200).json({ msg: "Car added", newCar });
    }
  } catch (error) {
    res.status(400).json({ msg: "Invalid data", data: req.body });
  }
});

app.get("/car", async (req, res) => {
  try {
    let cars = await Car.find({});
    res.send(cars);
    console.log(cars);
  } catch (error) {
    console.log(error);
  }
});

app.post("/car/update", [verify], async (req, res) => {
  try {
  } catch (error) {
    console.log(error);
  }
});

app.delete("/car/delete/:id", [verify], async (req, res) => {
  try {
    const id = req.params.id;
    await Car.deleteOne({ _id: id });
    res.status(200).send();
  } catch (error) {
    console.log(error);
  }
});

app.listen(port, () => console.log(`SLUŠA ${port}`));
