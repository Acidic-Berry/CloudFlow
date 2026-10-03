const fs = require("fs");
const path = require("path");

const uploadsDir = path.join(__dirname, "..", "uploads");

// Make sure local uploads directory exists
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

/**
 * Local storage service
 *
 * This keeps our application working locally while Azure
 * is unavailable. Later, we can replace the implementation
 * with Azure Blob Storage without changing the dashboard API.
 */

async function saveFile(file) {
    return {
        filename: file.filename,
        originalname: file.originalname,
        size: file.size,
        path: `/uploads/${file.filename}`,
        storage: "local"
    };
}

async function listFiles() {
    const files = fs.readdirSync(uploadsDir);

    return files
        .map((filename) => {
            const filePath = path.join(uploadsDir, filename);
            const stats = fs.statSync(filePath);

            return {
                filename,
                size: stats.size,
                path: `/uploads/${filename}`,
                createdAt: stats.birthtime
            };
        })
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function deleteFile(filename) {
    const filePath = path.join(uploadsDir, filename);

    if (!fs.existsSync(filePath)) {
        throw new Error("File not found");
    }

    fs.unlinkSync(filePath);

    return {
        success: true,
        filename
    };
}

module.exports = {
    saveFile,
    listFiles,
    deleteFile
};