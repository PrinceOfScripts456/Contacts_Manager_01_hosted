import multer from "multer";
import path from "path";

const allowedExtensions = [".json"];
const allowedMimeTypes = ["application/json"];

const upload = multer({

    storage: multer.memoryStorage(),

    limits: {
        fileSize: 1024 * 1024 * 5 // 5 MB
    },

    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();

        const validExtension = allowedExtensions.includes(ext);
        const validMimeType = allowedMimeTypes.includes(file.mimetype);

        if (!validExtension || !validMimeType) {
            return cb(new Error("Only .json files are supported."));
        }

        cb(null, true);
    }
});

export default upload;