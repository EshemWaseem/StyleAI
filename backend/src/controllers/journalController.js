const prisma = require('../config/prisma');

exports.listStories = async (req, res) => {
  try {
    const stories = await prisma.editorialStory.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ stories });
  } catch (error) {
    res.status(500).json({ message: "Failed to load stories" });
  }
};

exports.createStory = async (req, res) => {
  try {
    const story = await prisma.editorialStory.create({
      data: req.body
    });
    res.status(201).json({ story });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateStory = async (req, res) => {
  try {
    const { id } = req.params;
    const story = await prisma.editorialStory.update({
      where: { id },
      data: req.body
    });
    res.json({ story });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteStory = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.editorialStory.delete({ where: { id } });
    res.json({ message: "Story deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};