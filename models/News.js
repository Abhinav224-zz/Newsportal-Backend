const mongoose = require("mongoose");

const newsSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    category: {
      type: String,
      required: true,
      enum: ["Politics", "Sports", "Technology", "Business", "Health", "World"],
    },
    summary: { type: String, required: true },
    content: { type: String, required: true },
    coverImage: { type: String, default: "https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=1200&q=80" },
    status: {
      type: String,
      enum: ["Draft", "Scheduled", "In-review", "Published"],
      default: "Draft",
    },
    scheduledAt: { type: Date, default: null },
    publishedAt: { type: Date, default: null },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("News", newsSchema);
