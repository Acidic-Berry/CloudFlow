const express = require("express");
const path = require("path");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
require("dotenv").config();

const fileStorage = require("./services/storage");

const app = express();

// =====================================================
// CONFIGURATION
// =====================================================

const PORT = process.env.PORT || 3000;

const uploadDirectory = path.join(__dirname, "uploads");

// Create uploads directory automatically
if (!fs.existsSync(uploadDirectory)) {
    fs.mkdirSync(uploadDirectory, { recursive: true });
}


// =====================================================
// MIDDLEWARE
// =====================================================

app.use(cors());

app.use(express.json());

app.use(express.urlencoded({ extended: true }));


// Serve frontend
app.use(express.static(path.join(__dirname, "public")));


// Serve uploaded files
app.use(
    "/uploads",
    express.static(uploadDirectory)
);


// =====================================================
// MULTER CONFIGURATION
// =====================================================

const multerStorage = multer.diskStorage({

    destination: function (req, file, cb) {
        cb(null, uploadDirectory);
    },

    filename: function (req, file, cb) {

        const uniqueName =
            Date.now() +
            "-" +
            Math.round(Math.random() * 1E9) +
            path.extname(file.originalname);

        cb(null, uniqueName);
    }

});

const upload = multer({

    storage: multerStorage,

    limits: {
        fileSize: 10 * 1024 * 1024
    }

});


// =====================================================
// HOME PAGE
// =====================================================

app.get("/", (req, res) => {

    res.sendFile(
        path.join(__dirname, "public", "index.html")
    );

});


// =====================================================
// ABOUT PAGE
// =====================================================

app.get("/about", (req, res) => {

    res.sendFile(
        path.join(__dirname, "public", "about.html")
    );

});


// =====================================================
// DASHBOARD PAGE
// =====================================================

app.get("/dashboard", (req, res) => {

    res.sendFile(
        path.join(__dirname, "public", "dashboard.html")
    );

});


// =====================================================
// UPLOAD API
// =====================================================

app.post(
    "/api/upload",
    upload.single("file"),
    async (req, res) => {

        try {

            if (!req.file) {

                return res.status(400).json({

                    success: false,

                    message: "No file was uploaded."

                });

            }

            const savedFile =
                await fileStorage.saveFile(req.file);

            res.status(201).json({

                success: true,

                message: "File uploaded successfully.",

                file: {

                    originalName:
                        req.file.originalname,

                    fileName:
                        req.file.filename,

                    size:
                        req.file.size,

                    url:
                        `/uploads/${req.file.filename}`,

                    storage:
                        savedFile.storage

                }

            });

        } catch (error) {

            console.error(
                "Upload error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Something went wrong while uploading the file."

            });

        }

    }
);


// =====================================================
// LIST FILES API
// =====================================================

app.get(
    "/api/files",
    async (req, res) => {

        try {

            const files =
                await fileStorage.listFiles();

            const fileData = files.map((file) => {

                return {

                    fileName:
                        file.filename,

                    size:
                        file.size,

                    uploadedAt:
                        file.createdAt,

                    url:
                        file.path

                };

            });

            res.json({

                success: true,

                files: fileData

            });

        } catch (error) {

            console.error(
                "File listing error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Unable to retrieve files."

            });

        }

    }
);


// =====================================================
// DELETE FILE API
// =====================================================

app.delete(
    "/api/files/:filename",
    async (req, res) => {

        try {

            const filename =
                path.basename(req.params.filename);

            await fileStorage.deleteFile(filename);

            res.json({

                success: true,

                message:
                    "File deleted successfully."

            });

        } catch (error) {

            console.error(
                "Delete error:",
                error
            );

            res.status(404).json({

                success: false,

                message:
                    "File not found."

            });

        }

    }
);


// =====================================================
// ERROR HANDLER
// =====================================================

app.use(
    (error, req, res, next) => {

        if (error instanceof multer.MulterError) {

            if (error.code === "LIMIT_FILE_SIZE") {

                return res.status(400).json({

                    success: false,

                    message:
                        "File is too large. Maximum size is 10MB."

                });

            }

        }

        console.error(error);

        res.status(500).json({

            success: false,

            message: "Server error."

        });

    }
);


// =====================================================
// START SERVER
// =====================================================

app.listen(PORT, () => {

    console.log(
        `Server running on port ${PORT}`
    );

});