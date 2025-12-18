const MONGODB_URI =
  "mongodb+srv://20225403:20225403@webbaitap.h4gmyye.mongodb.net/it4409";

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

// Helper functions
const normalizeString = (str) => (str ? str.trim() : str);
const normalizeAge = (age) => (age ? Math.floor(Number(age)) : age);
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
// Middleware
app.use(cors());
app.use(express.json());

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB Error:", err));
const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Tên không được để trống"],
    minlength: [2, "Tên phải có ít nhất 2 ký tự"],
  },
  age: {
    type: Number,
    required: [true, "Tuổi không được để trống"],
    min: [0, "Tuổi phải >= 0"],
  },
  email: {
    type: String,
    required: [true, "Email không được để trống"],
    match: [/^\S+@\S+\.\S+$/, "Email không hợp lệ"],
  },
  address: {
    type: String,
  },
});

const User = mongoose.model("User", UserSchema);

app.listen(3001, () => {
  console.log("Server running on http://localhost:3001");
});

app.get("/api/users", async (req, res) => {
  try {
    // Giới hạn page và limit
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 5;

    page = page < 1 ? 1 : page;
    limit = limit < 1 ? 5 : Math.min(limit, 100); // Giới hạn max 100

    const search = req.query.search || "";

    // Tạo query filter cho search
    const filter = search
      ? {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
            { address: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const skip = (page - 1) * limit;

    // Sử dụng Promise.all cho truy vấn song song
    const [users, total] = await Promise.all([
      User.find(filter).skip(skip).limit(limit),
      User.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      page,
      limit,
      total,
      totalPages,
      data: users,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/users", async (req, res) => {
  try {
    let { name, age, email, address } = req.body;

    // Chuẩn hóa dữ liệu đầu vào
    name = normalizeString(name);
    age = normalizeAge(age);
    email = normalizeString(email)?.toLowerCase();
    address = normalizeString(address);

    // Kiểm tra email duy nhất
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email đã tồn tại" });
    }

    // Tạo user mới
    const newUser = await User.create({ name, age, email, address });
    res.status(201).json({
      message: "Tạo người dùng thành công",
      data: newUser,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put("/api/users/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Kiểm tra ID hợp lệ
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: "ID không hợp lệ" });
    }

    // Chỉ lấy các trường được truyền vào
    const updateData = {};
    if (req.body.name !== undefined)
      updateData.name = normalizeString(req.body.name);
    if (req.body.age !== undefined) updateData.age = normalizeAge(req.body.age);
    if (req.body.email !== undefined) {
      updateData.email = normalizeString(req.body.email)?.toLowerCase();
      // Kiểm tra email duy nhất
      const existingUser = await User.findOne({
        email: updateData.email,
        _id: { $ne: id },
      });
      if (existingUser) {
        return res.status(400).json({ error: "Email đã tồn tại" });
      }
    }
    if (req.body.address !== undefined)
      updateData.address = normalizeString(req.body.address);

    const updatedUser = await User.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedUser) {
      return res.status(404).json({ error: "Không tìm thấy người dùng" });
    }

    res.json({
      message: "Cập nhật người dùng thành công",
      data: updatedUser,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/users/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Kiểm tra ID hợp lệ
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: "ID không hợp lệ" });
    }

    const deletedUser = await User.findByIdAndDelete(id);
    if (!deletedUser) {
      return res.status(404).json({ error: "Không tìm thấy người dùng" });
    }
    res.json({ message: "Xóa người dùng thành công" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
