import mongoose, { model, Schema, Types } from "mongoose";
import { email } from "zod";

const UserSchema = new Schema({
  email: { type: String, require: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, unique: true },
  confPass: { type: String },
});

const ContentSchema = new Schema({
  link: { type: String, required: true },
  type: {
    type: String,
    required: true,
    enum: ["youtube", "twitter", "document"],
  },
  title: { type: String, required: true },
  tags: [{ type: mongoose.Schema.Types.ObjectId, ref: "Tag" }],
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
});

const LinkSchema = new Schema({
  hash: String,
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
});

export const UserModel = model("User", UserSchema);
export const ContentModel = model("Content", ContentSchema);
export const LinkModel = model("Link", LinkSchema);
