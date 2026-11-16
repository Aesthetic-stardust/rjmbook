/*
  RJMBook — ML-Powered Resort Booking | Naruwan Resort
*/
import express from "express";
import multer from "multer";
import path from "path";
import { isAuthenticated, isAdmin } from "../middleware/auth.js";
import { 
  listRoomTypes, 
  listCottageTypes, 
  apiRoomTypes, 
  updateRoomType, 
  toggleAvailability,
  getRoomImages,
  uploadRoomImages,
  deleteRoomImage,
  getRoomUnits,
  addRoomUnit,
  deleteRoomUnit
} from "../controllers/roomController.js";

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(process.cwd(), "imgs"));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// Configure multer for room-specific image uploads (stores in memory)
const imageUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

const router = express.Router();
router.get("/", listRoomTypes);
router.get("/api", isAuthenticated, apiRoomTypes);
router.put("/api/:id", isAdmin, upload.single('image'), updateRoomType);
router.patch("/api/:id/availability", isAdmin, toggleAvailability);

// Image management endpoints
router.get("/api/:id/images", getRoomImages);
router.post("/api/:id/images", isAdmin, imageUpload.array('images', 10), uploadRoomImages);
router.delete("/api/:id/images/:filename", isAdmin, deleteRoomImage);

// Room unit management endpoints
router.get("/api/:id/units", isAdmin, getRoomUnits);
router.post("/api/:id/units", isAdmin, addRoomUnit);
router.delete("/api/:id/units/:roomId", isAdmin, deleteRoomUnit);

export default router;

export function cottagesRouter() {
  const cottagesRouter = express.Router();
  cottagesRouter.get("/", listCottageTypes);
  cottagesRouter.get("/api", isAuthenticated, apiRoomTypes);
  cottagesRouter.put("/api/:id", isAdmin, upload.single('image'), updateRoomType);
  cottagesRouter.patch("/api/:id/availability", isAdmin, toggleAvailability);
  
  // Image management endpoints for cottages
  cottagesRouter.get("/api/:id/images", getRoomImages);
  cottagesRouter.post("/api/:id/images", isAdmin, imageUpload.array('images', 10), uploadRoomImages);
  cottagesRouter.delete("/api/:id/images/:filename", isAdmin, deleteRoomImage);
  
  // Cottage unit management endpoints
  cottagesRouter.get("/api/:id/units", isAdmin, getRoomUnits);
  cottagesRouter.post("/api/:id/units", isAdmin, addRoomUnit);
  cottagesRouter.delete("/api/:id/units/:roomId", isAdmin, deleteRoomUnit);
  
  return cottagesRouter;
}
