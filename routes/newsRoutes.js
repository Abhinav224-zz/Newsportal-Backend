const express = require("express");
const auth = require("../middleware/auth");
const News = require("../models/News");

const router = express.Router();

const makeSlug = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const ensureUniqueSlug = async (title, excludeId = null) => {
  let base = makeSlug(title);
  if (!base) base = `news-${Date.now()}`;
  let slug = base;
  let count = 1;

  while (true) {
    const query = excludeId ? { slug, _id: { $ne: excludeId } } : { slug };
    const exists = await News.findOne(query);
    if (!exists) return slug;
    slug = `${base}-${count}`;
    count += 1;
  }
};

const updateScheduledStatus = async (doc) => {
  if (doc.status === "Scheduled" && doc.scheduledAt && doc.scheduledAt <= new Date()) {
    doc.status = "Published";
    doc.publishedAt = new Date();
    await doc.save();
  }
};

router.get("/public", async (req, res) => {
  try {
    const { category } = req.query;

    const query = { status: "Published" };
    if (category) query.category = category;

    const items = await News.find(query)
      .sort({ publishedAt: -1, createdAt: -1 })
      .select("title slug category summary coverImage publishedAt author")
      .populate("author", "name");

    res.json(items);
  } catch (error) {
    res.status(500).json({ message: "Failed to load public feed", error: error.message });
  }
});

router.get("/public/:slug", async (req, res) => {
  try {
    const news = await News.findOne({ slug: req.params.slug, status: "Published" }).populate("author", "name");

    if (!news) return res.status(404).json({ message: "News not found" });

    res.json(news);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch story", error: error.message });
  }
});

router.get("/admin", auth, async (req, res) => {
  try {
    const items = await News.find({ author: req.user._id }).sort({ updatedAt: -1 });
    for (const item of items) {
      await updateScheduledStatus(item);
    }

    const refreshed = await News.find({ author: req.user._id }).sort({ updatedAt: -1 });
    res.json(refreshed);
  } catch (error) {
    res.status(500).json({ message: "Failed to load admin feeds", error: error.message });
  }
});

router.post("/admin", auth, async (req, res) => {
  try {
    const { title, category, summary, content, coverImage, status, scheduledAt } = req.body;

    if (!title || !category || !summary || !content) {
      return res.status(400).json({ message: "Title, category, summary and content are required" });
    }

    const nextStatus = ["Draft", "Scheduled", "In-review", "Published"].includes(status) ? status : "Draft";

    const doc = await News.create({
      title,
      slug: await ensureUniqueSlug(title),
      category,
      summary,
      content,
      coverImage,
      status: nextStatus,
      scheduledAt: nextStatus === "Scheduled" && scheduledAt ? new Date(scheduledAt) : null,
      publishedAt: nextStatus === "Published" ? new Date() : null,
      author: req.user._id,
    });

    res.status(201).json(doc);
  } catch (error) {
    res.status(500).json({ message: "Failed to create post", error: error.message });
  }
});

router.put("/admin/:id", auth, async (req, res) => {
  try {
    const story = await News.findOne({ _id: req.params.id, author: req.user._id });
    if (!story) return res.status(404).json({ message: "Post not found" });

    const { title, category, summary, content, coverImage, status, scheduledAt } = req.body;

    if (title && title !== story.title) {
      story.slug = await ensureUniqueSlug(title, story._id);
      story.title = title;
    }

    story.category = category ?? story.category;
    story.summary = summary ?? story.summary;
    story.content = content ?? story.content;
    story.coverImage = coverImage ?? story.coverImage;

    if (status) {
      story.status = status;
      if (status === "Published") {
        story.publishedAt = new Date();
        story.scheduledAt = null;
      }
      if (status === "Scheduled") {
        story.scheduledAt = scheduledAt ? new Date(scheduledAt) : story.scheduledAt;
        story.publishedAt = null;
      }
      if (status === "Draft" || status === "In-review") {
        story.scheduledAt = null;
        story.publishedAt = null;
      }
    }

    await story.save();
    res.json(story);
  } catch (error) {
    res.status(500).json({ message: "Failed to update post", error: error.message });
  }
});

router.delete("/admin/:id", auth, async (req, res) => {
  try {
    const deleted = await News.findOneAndDelete({ _id: req.params.id, author: req.user._id });
    if (!deleted) return res.status(404).json({ message: "Post not found" });

    res.json({ message: "Post deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete post", error: error.message });
  }
});

module.exports = router;
