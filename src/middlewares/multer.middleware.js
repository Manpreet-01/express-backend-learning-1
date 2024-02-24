import multer from "multer";

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "./public/temp");
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);        // file can overide if user send multiple files with same name which we uploading
    }
});

export const upload = multer({
    storage,
});