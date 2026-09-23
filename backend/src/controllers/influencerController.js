const multer = require('multer');
const service = require('../services/influencer');
const { uploadBufferToCloudinary } = require('../config/cloudinary');

// ======================================================
// AVATAR UPLOAD MIDDLEWARE
// ======================================================
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// ======================================================
// CONTROLLERS
// ======================================================
async function list(req, res, next) {
  try {
    const result = await service.listInfluencers(req.user, req.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const influencer = await service.getInfluencer(req.user, req.params.idOrSlug);
    res.json({ influencer });
  } catch (err) {
    next(err);
  }
}

async function getMe(req, res, next) {
  try {
    const influencer = await service.getMyInfluencerProfile(req.user);
    res.json({ influencer });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const influencer = await service.createInfluencer(req.user, req.body);
    res.status(201).json({ message: 'Influencer created', influencer });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const influencer = await service.updateInfluencer(
      req.user,
      req.params.influencerId,
      req.body
    );
    res.json({ message: 'Influencer updated', influencer });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const result = await service.deleteInfluencer(req.user, req.params.influencerId);
    res.json({ message: 'Influencer archived', ...result });
  } catch (err) {
    next(err);
  }
}

async function save(req, res, next) {
  try {
    const result = await service.saveInfluencer(req.user, req.params.influencerId);
    res.json({ message: 'Saved', ...result });
  } catch (err) {
    next(err);
  }
}

async function unsave(req, res, next) {
  try {
    const result = await service.unsaveInfluencer(req.user, req.params.influencerId);
    res.json({ message: 'Removed', ...result });
  } catch (err) {
    next(err);
  }
}

async function uploadAvatar(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const result = await uploadBufferToCloudinary(req.file.buffer, {
      folder: `styleai/influencers/${req.user.id}`,
    });

    res.json({
      url: result.secure_url,
      publicId: result.public_id,
    });
  } catch (err) {
    next(err);
  }
}

// ======================================================
// EXPORTS
// ======================================================
module.exports = {
  list,
  getOne,
  getMe,
  create,
  update,
  remove,
  save,
  unsave,
  uploadAvatar,
  avatarUpload,
};



// // influencerController.js
// // 23-09 2:04

// const service = require('../services/influencer');

// async function list(req, res, next) {
//   try {
//     const result = await service.listInfluencers(req.user, req.query);
//     res.json(result);
//   } catch (err) {
//     next(err);
//   }
// }

// async function getOne(req, res, next) {
//   try {
//     const influencer = await service.getInfluencer(
//       req.user,
//       req.params.idOrSlug
//     );
//     res.json({ influencer });
//   } catch (err) {
//     next(err);
//   }
// }

// async function getMe(req, res, next) {
//   try {
//     const influencer = await service.getMyInfluencerProfile(req.user);
//     res.json({ influencer });
//   } catch (err) {
//     next(err);
//   }
// }

// async function create(req, res, next) {
//   try {
//     const influencer = await service.createInfluencer(req.user, req.body);
//     res.status(201).json({ message: 'Influencer created', influencer });
//   } catch (err) {
//     next(err);
//   }
// }

// async function update(req, res, next) {
//   try {
//     const influencer = await service.updateInfluencer(
//       req.user,
//       req.params.influencerId,
//       req.body
//     );
//     res.json({ message: 'Influencer updated', influencer });
//   } catch (err) {
//     next(err);
//   }
// }

// async function remove(req, res, next) {
//   try {
//     const result = await service.deleteInfluencer(
//       req.user,
//       req.params.influencerId
//     );
//     res.json({ message: 'Influencer archived', ...result });
//   } catch (err) {
//     next(err);
//   }
// }

// async function save(req, res, next) {
//   try {
//     const result = await service.saveInfluencer(
//       req.user,
//       req.params.influencerId
//     );
//     res.json({ message: 'Saved', ...result });
//   } catch (err) {
//     next(err);
//   }
// }

// async function unsave(req, res, next) {
//   try {
//     const result = await service.unsaveInfluencer(
//       req.user,
//       req.params.influencerId
//     );
//     res.json({ message: 'Removed', ...result });
//   } catch (err) {
//     next(err);
//   }
// }

// module.exports = { list, getOne, getMe, create, update, remove, save, unsave };