/*
  RJMBook — ML-Powered Resort Booking | Naruwan Resort
*/
import { RoomType, Room } from "../models/index.js";
import { getRoomRecommendations } from "../services/ml/recommendationEngine.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

export async function listRoomTypes(req, res) {
  try {
    const guestId = req.query.guestId ? parseInt(req.query.guestId, 10) : null;
    const recommended = await getRoomRecommendations(guestId, 6);
    const all = await RoomType.findAll({
      where: { category: 'room' },
      include: [{ model: Room, attributes: ["id", "roomNumber", "floor", "viewType", "isAvailable"] }]
    });
    res.render("rooms/list", {
      title: "Rooms | Naruwan Bay Resort Hotel",
      roomTypes: all.map(r => r.toJSON()),
      recommended: recommended.map((r) => r.id),
      guestId
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

export async function listCottageTypes(req, res) {
  try {
    const guestId = req.query.guestId ? parseInt(req.query.guestId, 10) : null;
    const recommended = await getRoomRecommendations(guestId, 6);
    const all = await RoomType.findAll({
      where: { category: 'cottage' },
      include: [{ model: Room, attributes: ["id", "roomNumber", "floor", "viewType", "isAvailable"] }]
    });
    res.render("cottages/list", {
      title: "Cottages | Naruwan Bay Resort Hotel",
      roomTypes: all.map(r => r.toJSON()),
      recommended: recommended.map((r) => r.id),
      guestId
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

export async function adminRoomManagement(req, res) {
  try {
    const roomTypes = await RoomType.findAll({
      where: { category: 'room' },
      include: [{ model: Room, attributes: ["id", "roomNumber", "floor", "viewType", "isAvailable"] }]
    });

    // Fetch thumbnail image for each room type
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const roomTypesWithImages = roomTypes.map(roomType => {
      const roomData = roomType.toJSON();
      const roomFolderName = roomType.name.toLowerCase().replace(/\s+/g, '');
      const roomImageDir = path.join(process.cwd(), "imgs", "rooms", roomFolderName);
      
      if (fs.existsSync(roomImageDir)) {
        const files = fs.readdirSync(roomImageDir);
        const imageFiles = files.filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file));
        if (imageFiles.length > 0) {
          // Get first image alphabetically
          const firstImage = imageFiles.sort()[0];
          roomData.thumbnailUrl = `/rooms/${roomFolderName}/${encodeURIComponent(firstImage)}`;
        }
      }
      return roomData;
    });

    res.render("admin/rooms", {
      title: "Room Management | Naruwan Resort",
      roomTypes: roomTypesWithImages
    });
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
}

export async function adminCottageManagement(req, res) {
  try {
    const roomTypes = await RoomType.findAll({
      where: { category: 'cottage' },
      include: [{ model: Room, attributes: ["id", "roomNumber", "floor", "viewType", "isAvailable"] }]
    });

    // Fetch thumbnail image for each cottage type
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const roomTypesWithImages = roomTypes.map(roomType => {
      const roomData = roomType.toJSON();
      const roomFolderName = roomType.name.toLowerCase().replace(/\s+/g, '');
      const roomImageDir = path.join(process.cwd(), "imgs", "cottages", roomFolderName);
      
      if (fs.existsSync(roomImageDir)) {
        const files = fs.readdirSync(roomImageDir);
        const imageFiles = files.filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file));
        if (imageFiles.length > 0) {
          // Get first image alphabetically
          const firstImage = imageFiles.sort()[0];
          roomData.thumbnailUrl = `/cottages/${roomFolderName}/${encodeURIComponent(firstImage)}`;
        }
      }
      return roomData;
    });

    res.render("admin/cottages", {
      title: "Cottage Management | Naruwan Resort",
      roomTypes: roomTypesWithImages
    });
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
}

export async function apiRoomTypes(req, res) {
  try {
    const types = await RoomType.findAll({
      include: [{ model: Room, where: { isAvailable: true }, required: false }]
    });
    res.json(types);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function updateRoomType(req, res) {
  try {
    const { id } = req.params;
    // basePricePerNight is the price per day (24 hours)
    const { name, description, basePricePerNight, maxGuests } = req.body;

    const roomType = await RoomType.findByPk(id);
    if (!roomType) {
      return res.status(404).json({ error: "Room type not found" });
    }

    const updateData = {
      name: name || roomType.name,
      description: description || roomType.description,
      basePricePerNight: basePricePerNight !== undefined ? basePricePerNight : roomType.basePricePerNight,
      maxGuests: maxGuests !== undefined ? maxGuests : roomType.maxGuests
    };

    // Handle image upload if file is provided
    if (req.file) {
      updateData.imageUrl = '/' + req.file.filename;
    }

    await roomType.update(updateData);

    res.json({
      success: true,
      message: "Room type updated successfully",
      roomType: roomType
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

export async function toggleAvailability(req, res) {
  try {
    const { id } = req.params;
    const { isAvailable, unavailableReason } = req.body;

    const roomType = await RoomType.findByPk(id);
    if (!roomType) {
      return res.status(404).json({ error: "Room type not found" });
    }

    await roomType.update({
      isAvailable: isAvailable !== undefined ? isAvailable : !roomType.isAvailable,
      unavailableReason: isAvailable === false ? (unavailableReason || "Currently unavailable") : null
    });

    res.json({
      success: true,
      message: `Room type is now ${roomType.isAvailable ? 'available' : 'unavailable'}`,
      roomType: roomType
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Get all images for a specific room or cottage type
 * Images are stored in: imgs/rooms/{roomTypeName}/ or imgs/cottages/{roomTypeName}/
 */
export async function getRoomImages(req, res) {
  try {
    const { id } = req.params;
    const roomType = await RoomType.findByPk(id);
    
    if (!roomType) {
      return res.status(404).json({ error: "Room type not found" });
    }

    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const roomFolderName = roomType.name.toLowerCase().replace(/\s+/g, '');
    const category = roomType.category || 'room';
    // Convert singular to plural: 'room' -> 'rooms', 'cottage' -> 'cottages'
    const categoryPlural = category + 's';
    const roomImageDir = path.join(process.cwd(), "imgs", categoryPlural, roomFolderName);

    let images = [];
    
    if (fs.existsSync(roomImageDir)) {
      const files = fs.readdirSync(roomImageDir);
      images = files
        .filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file))
        .map(file => ({
          filename: file,
          url: `/${categoryPlural}/${roomFolderName}/${encodeURIComponent(file)}`,
          folder: roomFolderName
        }))
        .sort((a, b) => a.filename.localeCompare(b.filename));
    }

    res.json({
      success: true,
      roomTypeId: id,
      roomTypeName: roomType.name,
      folderName: roomFolderName,
      images: images
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Upload images to a specific room or cottage type folder
 */
export async function uploadRoomImages(req, res) {
  try {
    const { id } = req.params;
    const roomType = await RoomType.findByPk(id);
    
    if (!roomType) {
      return res.status(404).json({ error: "Room type not found" });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files provided" });
    }

    const roomFolderName = roomType.name.toLowerCase().replace(/\s+/g, '');
    const category = roomType.category || 'room';
    // Convert singular to plural: 'room' -> 'rooms', 'cottage' -> 'cottages'
    const categoryPlural = category + 's';
    const roomImageDir = path.join(process.cwd(), "imgs", categoryPlural, roomFolderName);

    // Create directory if it doesn't exist
    if (!fs.existsSync(roomImageDir)) {
      fs.mkdirSync(roomImageDir, { recursive: true });
    }

    const uploadedFiles = [];
    
    for (const file of req.files) {
      const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`;
      const filepath = path.join(roomImageDir, filename);
      
      fs.writeFileSync(filepath, file.buffer);
      uploadedFiles.push({
        filename: filename,
        url: `/${categoryPlural}/${roomFolderName}/${filename}`
      });
    }

    res.json({
      success: true,
      message: `${uploadedFiles.length} image(s) uploaded successfully`,
      uploadedFiles: uploadedFiles
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Delete a specific image from a room or cottage type folder
 */
export async function deleteRoomImage(req, res) {
  try {
    const { id, filename } = req.params;
    const roomType = await RoomType.findByPk(id);
    
    if (!roomType) {
      return res.status(404).json({ error: "Room type not found" });
    }

    const roomFolderName = roomType.name.toLowerCase().replace(/\s+/g, '');
    const category = roomType.category || 'room';
    // Convert singular to plural: 'room' -> 'rooms', 'cottage' -> 'cottages'
    const categoryPlural = category + 's';
    const roomImageDir = path.join(process.cwd(), "imgs", categoryPlural, roomFolderName);
    const filepath = path.join(roomImageDir, filename);

    // Security check: ensure the file is within the room folder
    const normalizedFilepath = path.normalize(filepath);
    const normalizedRoomDir = path.normalize(roomImageDir);
    
    if (!normalizedFilepath.startsWith(normalizedRoomDir)) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: "Image not found" });
    }

    fs.unlinkSync(filepath);

    res.json({
      success: true,
      message: "Image deleted successfully",
      deletedFile: filename
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Get all Room units for a specific RoomType
 */
export async function getRoomUnits(req, res) {
  try {
    const { id } = req.params;
    const roomType = await RoomType.findByPk(id);
    if (!roomType) {
      return res.status(404).json({ error: "Room type not found" });
    }

    const rooms = await Room.findAll({
      where: { roomTypeId: id },
      order: [["roomNumber", "ASC"]]
    });

    res.json({
      success: true,
      roomTypeId: id,
      roomTypeName: roomType.name,
      units: rooms.map(r => r.toJSON())
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Add a new Room unit to a RoomType
 */
export async function addRoomUnit(req, res) {
  try {
    const { id } = req.params;
    const { roomNumber, floor, viewType } = req.body;

    if (!roomNumber || !roomNumber.trim()) {
      return res.status(400).json({ error: "Room number is required" });
    }

    const roomType = await RoomType.findByPk(id);
    if (!roomType) {
      return res.status(404).json({ error: "Room type not found" });
    }

    // Check for duplicate room number
    const existing = await Room.findOne({ where: { roomNumber: roomNumber.trim() } });
    if (existing) {
      return res.status(409).json({ error: `Room number "${roomNumber.trim()}" already exists` });
    }

    const room = await Room.create({
      roomNumber: roomNumber.trim(),
      roomTypeId: parseInt(id, 10),
      floor: floor ? parseInt(floor, 10) : null,
      viewType: viewType ? viewType.trim() : null,
      isAvailable: true
    });

    res.status(201).json({
      success: true,
      message: "Room unit added successfully",
      unit: room.toJSON()
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Delete a Room unit (only if it has no active/upcoming bookings)
 */
export async function deleteRoomUnit(req, res) {
  try {
    const { id, roomId } = req.params;

    const room = await Room.findOne({ where: { id: roomId, roomTypeId: id } });
    if (!room) {
      return res.status(404).json({ error: "Room unit not found" });
    }

    // Safety check: block deletion if there are non-cancelled bookings tied to this unit
    const { Booking } = await import("../models/index.js");
    const activeBookings = await Booking.count({
      where: {
        roomId: roomId,
        status: ["pending", "confirmed", "checked_in"]
      }
    });

    if (activeBookings > 0) {
      return res.status(409).json({
        error: `Cannot delete — this unit has ${activeBookings} active or upcoming booking(s). Cancel or reassign them first.`
      });
    }

    await room.destroy();

    res.json({
      success: true,
      message: "Room unit deleted successfully"
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
