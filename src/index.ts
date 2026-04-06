import "dotenv/config";
import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { ContentModel, LinkModel, UserModel } from "./db.js";
import { JWT_SECRECT, MONGODB_URI, PORT } from "./config.js";
import { usermiddleware } from "./auth/usermiddleware.js";
import { signupZod } from "./validitation/signup.js";
import bcrypt from "bcrypt";
import { random } from "./utils.js";
import cors from "cors";

const app = express();

app.use(express.json({ strict: false }));
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5175",
      "http://localhost:5176",
      "http://localhost:3000",
      "https://second-brain-frontend-akwu.vercel.app",
      "https://second-brain-frontend-akwu.vercel.app/",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.post("/", (req, res) => {
  res.json({ msg: `Hey it's working` });
});

app.post("/api/v1/signup", async (req, res) => {
  try {
    console.log("📝 Signup request received:", req.body);

    const zodValid = signupZod.safeParse(req.body);

    if (!zodValid.success) {
      console.log("❌ Zod validation failed:", zodValid.error.issues);
      return res
        .status(400)
        .json({ msg: `Invalid input`, error: zodValid.error.issues });
    }
    const { email, username, password, confPass } = req.body;

    if (!email || !username || !password || !confPass) {
      return res.status(401).json({ msg: `Required details!` });
    }

    const hashPass = await bcrypt.hash(password, 5);
    await UserModel.create({
      email,
      username,
      password: hashPass,
      confPass: hashPass,
    });

    console.log("✅ User created successfully:", username);
    res.status(200).json({ msg: `SignUp successful` });
  } catch (error) {
    console.error("🔥 Signup error:", error);
    return res
      .status(500)
      .json({ msg: `Server Error`, error: (error as any).message });
  }
});

app.post("/api/v1/signin", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(403).json({ msg: `Username and password required!` });
  }
  try {
    const existingUser = await UserModel.findOne({ username });
    if (!existingUser || !existingUser.password) {
      return res.status(403).json({ msg: `Invalid credentials` });
    }
    const isMatch = await bcrypt.compare(password, existingUser.password);
    if (isMatch) {
      const token = jwt.sign({ id: existingUser._id.toString() }, JWT_SECRECT);
      res.status(200).json({ msg: `Signin successful`, token });
    } else {
      return res.status(403).json({ msg: `Invalid password ` });
    }
  } catch (error) {
    return res.status(500).json({ msg: `Internal server error!` });
  }
});

app.post("/api/v1/content", usermiddleware, async (req, res) => {
  const { title, link, type } = req.body;
  console.log("BODY:", req.body);

  if (!title || !link || !type) {
    return res.status(400).json({ msg: "All fields required" });
  }

  try {
    const content = await ContentModel.create({
      title,
      link,
      type,
      //@ts-ignore
      userId: (req as any).userId,
      tags: [],
    });
    console.log("Content = ", content);

    return res.status(200).json({ msg: `Content added` });
  } catch (error) {
    console.error("Real error", error);
    return res.status(500).json({ error });
  }
});

app.get("/api/v1/content", usermiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(403).json({ msg: "Invalid user" });
    }

    console.log("User ID:", userId);

    const content = await ContentModel.find({
      userId: userId,
    }).populate("userId", "username");

    console.log("Fetch content ", content);

    return res.status(200).json({ content });
  } catch (error) {
    console.error("Error fetching content:", error);
    return res.status(500).json({ msg: "Server error" });
  }
});

app.delete("/api/v1/content/:id", usermiddleware, async (req, res) => {
  try {
    const contentId = req.params.id;
    console.log("Content ID:", contentId);

    if (!contentId || !mongoose.Types.ObjectId.isValid(contentId)) {
      return res.status(400).json({ msg: "Invalid content ID" });
    }

    const result = await ContentModel.deleteOne({
      _id: new mongoose.Types.ObjectId(contentId),
      userId: (req as any).userId,
    });

    console.log("Delete result:", result);

    if (result.deletedCount === 0) {
      return res.status(404).json({ msg: "Content not found" });
    }

    return res.status(200).json({ msg: "Content deleted" });
  } catch (error) {
    console.error("🔥 DELETE ERROR:", error);
    return res.status(500).json({ msg: "Server Error" });
  }
});

app.post("/api/v1/second-brain/share", usermiddleware, async (req, res) => {
  try {
    const { share } = req.body;

    if (share === true) {
      const existingUser = await LinkModel.findOne({
        userId: (req as any).userId,
      });
      if (existingUser) {
        res.json({
          hash: existingUser.hash,
        });
        return;
      }
      const hash = random(10);

      await LinkModel.create({
        userId: (req as any).userId,
        hash,
      });
      return res.status(200).json({
        msg: hash,
      });
    } else if (share === false) {
      await LinkModel.deleteOne({
        userId: (req as any).userId,
      });

      return res.status(200).json({
        msg: "Removed link",
      });
    } else {
      console.log("❌ Invalid share value");

      return res.status(400).json({
        msg: "Share must be true or false",
      });
    }
  } catch (error) {
    return res.status(500).json({ msg: "Server Error" });
  }
});

app.get("/api/v1/second-brain/:shareLink", async (req, res) => {
  const hash = req.params.shareLink;

  try {
    const link = await LinkModel.findOne({
      hash,
    });
    if (!link) {
      return res.status(411).json({ msg: `Incorrect input` });
    }

    // Get ALL content for this user
    const content = await ContentModel.find({
      userId: link.userId,
    });

    const user = await UserModel.findOne({
      _id: link.userId,
    });

    if (!user) {
      return res.status(411).json({ msg: `User not found !` });
    }

    res.json({
      username: user.username,
      content: content,
    });
  } catch (error) {
    return res.status(500).json({
      msg: `Server error`,
      error,
    });
  }
});

const startServer = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Db connected ✅");
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT} 🚀`);
    });
  } catch (error) {
    console.log("Db not connected ❌", error);
    process.exit(1);
  }
};
startServer();
