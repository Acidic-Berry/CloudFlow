const express = require("express");
const path = require("path");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
require("dotenv").config();

const {
    S3Client,
    GetObjectCommand
} = require("@aws-sdk/client-s3");

const fileStorage = require("./services/storage");

const app = express();



const PORT = process.env.PORT || 3000;

const uploadDirectory = path.join(__dirname, "uploads");

const bucketName =
    process.env.S3_BUCKET || "cloudflow-storage-2026";

const awsRegion =
    process.env.AWS_REGION || "us-east-1";

const s3 = new S3Client({
    region: awsRegion
});


if (!fs.existsSync(uploadDirectory)) {
    fs.mkdirSync(uploadDirectory, { recursive: true });
}




app.use(cors());

app.use(express.json());

app.use(express.urlencoded({ extended: true }));


// Serve frontend
app.use(express.static(path.join(__dirname, "public")));




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




app.get("/", (req, res) => {

    res.sendFile(
        path.join(__dirname, "public", "index.html")
    );

});



app.get("/about", (req, res) => {

    res.sendFile(
        path.join(__dirname, "public", "about.html")
    );

});




app.get("/dashboard", (req, res) => {

    res.sendFile(
        path.join(__dirname, "public", "dashboard.html")
    );

});




app.get("/uploads/:filename", async (req, res) => {

    try {

        const filename =
            path.basename(req.params.filename);

        const response = await s3.send(
            new GetObjectCommand({
                Bucket: bucketName,
                Key: filename
            })
        );

        if (response.ContentType) {
            res.setHeader(
                "Content-Type",
                response.ContentType
            );
        }

        if (response.ContentLength) {
            res.setHeader(
                "Content-Length",
                response.ContentLength
            );
        }

        response.Body.pipe(res);

    } catch (error) {

        console.error(
            "S3 file retrieval error:",
            error
        );

        res.status(404).json({
            success: false,
            message: "File not found."
        });

    }

});




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



app.listen(PORT, "0.0.0.0", () => {

    console.log(
        `CloudFlow server running on port ${PORT}`
    );

});