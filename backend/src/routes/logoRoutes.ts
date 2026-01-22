import express from 'express';
import multer from 'multer';
import { uploadLogo, getLogos } from '../controllers/logoController';
import { authenticateToken } from '../middleware/authMiddleware'; // Assuming auth middleware exists

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ 
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only images are allowed'));
        }
    }
});

// Protect upload route with authMiddleware
router.post('/upload', authenticateToken, upload.single('logo'), uploadLogo);
router.get('/', getLogos);

export default router;
